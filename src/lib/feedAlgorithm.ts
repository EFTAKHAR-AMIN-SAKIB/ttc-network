import { type FirestorePost, type FirestoreUser } from "./firestore";

export type FeedSortMode = "top" | "recent";

export interface FeedSocialBadge {
    type: "discussion" | "bumped" | "trending" | "following" | "faculty" | "poll" | "campus";
    icon: string;
    text: string;
    colorClass: string;
}

export interface AlgorithmContext {
    currentUserId?: string;
    userCollegeId?: string;
    followingUserIds?: string[];
    userClubIds?: string[];
    savedPostIds?: string[];
}

export type ScoredPost = (FirestorePost & { id: string }) & {
    _algoScore?: number;
    _socialBadge?: FeedSocialBadge | null;
};

/**
 * Safely converts Firestore Timestamp, Date, string, or number to epoch milliseconds.
 */
function getTimestampMs(ts: any): number {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (ts.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
    return 0;
}

/**
 * Computes an EdgeRank + Meaningful Social Interactions (MSI) score for a single post.
 * Modeled after Facebook's newsfeed ranking architecture:
 * Score = (Base Engagement Weight * Affinity Multiplier + Authority Bonus) * Time Decay * Format Bonus
 */
export function computeFacebookPostScore(
    post: FirestorePost & { id: string },
    context: AlgorithmContext
): { score: number; badge: FeedSocialBadge | null } {
    const {
        currentUserId,
        userCollegeId,
        followingUserIds = [],
        userClubIds = [],
        savedPostIds = []
    } = context;

    // ─── 1. MEANINGFUL SOCIAL INTERACTIONS (MSI) BASE WEIGHT ───
    const reactions = post.reactions || { love: 0, like: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
    
    // Facebook weights deep emotional reactions higher than standard likes
    const reactionScore = 
        ((reactions.love || 0) * 4.0) +
        ((reactions.haha || 0) * 3.5) +
        ((reactions.wow || 0) * 3.0) +
        ((reactions.sad || 0) * 2.0) +
        ((reactions.angry || 0) * 2.0) +
        ((reactions.like || 0) * 1.5);

    const totalReactionsCount = 
        (reactions.love || 0) + 
        (reactions.haha || 0) + 
        (reactions.wow || 0) + 
        (reactions.sad || 0) + 
        (reactions.angry || 0) + 
        (reactions.like || 0);

    // Comments are the #1 signal in Facebook's algorithm (active conversation between people)
    const commentsCount = post.commentsCount || 0;
    const commentsScore = commentsCount * 8.0;

    // Interactive polls: direct user investment
    const pollVotes = post.poll?.totalVotes || 0;
    const pollScore = pollVotes * 5.0;

    // Campus events: real-world participation
    const eventGoing = post.eventDetails?.going?.length || 0;
    const eventInterested = post.eventDetails?.interested?.length || 0;
    const eventScore = (eventGoing * 8.0) + (eventInterested * 4.0);

    // Shares: virality and endorsement
    const sharesCount = post.sharesCount || 0;
    const sharesScore = sharesCount * 6.0;

    // Post saves: strong personal intent signal
    const isSavedByViewer = savedPostIds.includes(post.id);
    const saveBonus = isSavedByViewer ? 14.0 : 0;

    const baseWeight = 15.0 + reactionScore + commentsScore + pollScore + eventScore + sharesScore + saveBonus;

    // ─── 2. SOCIAL AFFINITY MULTIPLIER (U) ───
    let affinity = 1.0;

    // Relationship: Viewer explicitly follows the creator
    const isFollowingAuthor = post.creatorId && followingUserIds.includes(post.creatorId);
    if (isFollowingAuthor) {
        affinity += 0.50;
    }

    // Proximity: Same college community
    const isSameCollege = !!(userCollegeId && post.collegeId && userCollegeId === post.collegeId);
    if (isSameCollege) {
        affinity += 0.40;
    }

    // Shared Group / Club
    const isSameClub = !!(post.clubId && userClubIds.includes(post.clubId));
    if (isSameClub) {
        affinity += 0.35;
    }

    // Viewer previously reacted to this post
    const hasViewerReacted = currentUserId && post.reactedBy 
        ? Object.values(post.reactedBy).some(uids => Array.isArray(uids) && uids.includes(currentUserId))
        : false;
    if (hasViewerReacted) {
        affinity += 0.15;
    }

    // Viewer is author
    if (currentUserId && post.creatorId === currentUserId) {
        affinity += 0.15;
    }

    // ─── 3. AUTHORITY & TRUST BONUS ───
    let authorityBonus = 0;
    const authorRole = post.createdBy?.role;
    if (authorRole === "teacher") {
        authorityBonus += 18.0; // Academic authority & faculty announcement
    } else if (authorRole === "admin" || authorRole === "super_manager") {
        authorityBonus += 22.0; // Official platform/campus notice
    } else if (authorRole === "manager") {
        authorityBonus += 12.0; // Campus coordinator
    }

    // ─── 4. FORMAT MULTIPLIER ───
    let formatMultiplier = 1.0;
    if (post.thumbnailUrl) formatMultiplier += 0.12; // Visual media
    if (post.linkPreview?.title) formatMultiplier += 0.08; // Rich link preview
    if (post.poll) formatMultiplier += 0.15; // Interactive poll
    if (post.eventDetails) formatMultiplier += 0.15; // Campus event

    // ─── 5. TIME DECAY & DYNAMIC DISCUSSION BUMPING ───
    // Key Facebook Feature: If an older post gets a fresh comment or reaction,
    // its lastActivityAt bumps the post back into relevance!
    const createdMs = getTimestampMs(post.timestamp) || Date.now();
    const activityMs = getTimestampMs(post.lastActivityAt) || createdMs;
    
    // Use the latest activity timestamp for recency calculation
    const effectiveTime = Math.max(createdMs, activityMs);
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - effectiveTime) / (1000 * 60 * 60));

    // Smooth gravity decay formula (half-life of ~18-24 hours)
    const decay = 1 / Math.pow(1 + hoursElapsed * 0.055, 1.35);

    // Final Composite Score
    const finalScore = ((baseWeight * affinity) + authorityBonus) * decay * formatMultiplier;

    // ─── 6. CONTEXTUAL SOCIAL PROOF BADGE ───
    // Computes Facebook-style contextual highlights explaining why the post is featured
    let badge: FeedSocialBadge | null = null;
    const isRecentlyBumped = (now - activityMs < 4 * 3600 * 1000) && (activityMs - createdMs > 15 * 60 * 1000);

    if (commentsCount >= 4) {
        badge = {
            type: "discussion",
            icon: "💬",
            text: `Hot Discussion • ${commentsCount} comments`,
            colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/50"
        };
    } else if (isRecentlyBumped) {
        badge = {
            type: "bumped",
            icon: "⚡",
            text: "Recent Activity Bump",
            colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/50"
        };
    } else if (totalReactionsCount >= 6) {
        badge = {
            type: "trending",
            icon: "🔥",
            text: `Trending in ${post.collegeName || "Campus Network"}`,
            colorClass: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/50"
        };
    } else if (isFollowingAuthor) {
        badge = {
            type: "following",
            icon: "⭐",
            text: `From ${post.createdBy?.name || "someone"} you follow`,
            colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900/50"
        };
    } else if (authorRole === "teacher") {
        badge = {
            type: "faculty",
            icon: "🎓",
            text: "Faculty Announcement",
            colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/50"
        };
    } else if (post.poll && pollVotes > 0) {
        badge = {
            type: "poll",
            icon: "🗳️",
            text: `Active Campus Poll • ${pollVotes} vote${pollVotes === 1 ? "" : "s"}`,
            colorClass: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-900/50"
        };
    } else if (isSameCollege && userCollegeId) {
        badge = {
            type: "campus",
            icon: "🏛️",
            text: "From your campus",
            colorClass: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-900/50"
        };
    }

    return {
        score: finalScore,
        badge
    };
}

/**
 * Ranks and diversifies a feed array.
 * If mode === "recent", returns reverse-chronological order.
 * If mode === "top", scores each post and applies Facebook's Author Fatigue rule
 * to prevent consecutive posts from the same author from dominating the top.
 */
export function rankAndDiversifyFeed(
    posts: (FirestorePost & { id: string })[],
    context: AlgorithmContext,
    mode: FeedSortMode = "top"
): ScoredPost[] {
    if (!posts || posts.length === 0) return [];

    if (mode === "recent") {
        return [...posts]
            .sort((a, b) => {
                const timeA = getTimestampMs(a.timestamp);
                const timeB = getTimestampMs(b.timestamp);
                return timeB - timeA;
            })
            .map(p => {
                const { badge } = computeFacebookPostScore(p, context);
                return {
                    ...p,
                    _algoScore: 0,
                    _socialBadge: badge
                };
            });
    }

    // ─── TOP STORIES MODE: Score and Anti-Fatigue Pass ───
    const scoredList = posts.map(p => {
        const { score, badge } = computeFacebookPostScore(p, context);
        return {
            ...p,
            _algoScore: score,
            _socialBadge: badge
        };
    });

    // Initial sort by raw score
    scoredList.sort((a, b) => (b._algoScore || 0) - (a._algoScore || 0));

    // Apply Author Fatigue Pass:
    // When an author already has high-ranking posts, subsequent posts from them
    // suffer a progressive 45% discount so the feed stays varied.
    const authorCounts: Record<string, number> = {};
    const adjustedList = scoredList.map(item => {
        const authorId = item.creatorId || "unknown";
        const seenCount = authorCounts[authorId] || 0;
        authorCounts[authorId] = seenCount + 1;

        if (seenCount > 0) {
            // Apply fatigue penalty
            const penalty = Math.pow(0.55, seenCount);
            return {
                ...item,
                _algoScore: (item._algoScore || 0) * penalty
            };
        }
        return item;
    });

    // Final sorting with diversity adjustments applied
    adjustedList.sort((a, b) => (b._algoScore || 0) - (a._algoScore || 0));

    return adjustedList;
}
