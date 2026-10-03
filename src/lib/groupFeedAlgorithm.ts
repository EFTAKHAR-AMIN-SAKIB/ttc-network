import type { GroupPostDoc } from "./firestore";

export type GroupFeedSortMode = "activity" | "recent";

export interface GroupAlgorithmContext {
    currentUserId?: string;
    isMultiGroupFeed?: boolean;
}

export type ScoredGroupPost = (GroupPostDoc & { id: string }) & {
    _algoScore?: number;
};

/**
 * Safely extracts epoch milliseconds from Firestore Timestamp, Date, string, or number.
 */
function getTimestampMs(ts: unknown): number {
    if (!ts) return 0;
    const obj = ts as { toMillis?: () => number; toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof obj.toMillis === "function") return obj.toMillis();
    if (typeof obj.toDate === "function") return obj.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof obj.seconds === "number") return obj.seconds * 1000 + (obj.nanoseconds || 0) / 1000000;
    return 0;
}

/**
 * Computes Facebook Group EdgeRank + Activity Bumping score for a single group post.
 * Core Principle: Active conversations stay alive, new posts get discovery, and
 * older silent threads naturally decay until someone comments again.
 */
export function computeFacebookGroupPostScore(
    post: GroupPostDoc & { id: string },
    context: GroupAlgorithmContext = {}
): number {
    const { currentUserId } = context;

    // ─── 1. PINNED ANNOUNCEMENTS ───
    if (post.isPinned) {
        return 1000000;
    }

    // ─── 2. MEANINGFUL SOCIAL INTERACTIONS (MSI) BASE WEIGHT ───
    const reactions = post.reactions || {};
    const reactionScore =
        ((reactions.love || 0) * 3.5) +
        ((reactions.haha || 0) * 3.0) +
        ((reactions.wow || 0) * 2.5) +
        ((reactions.sad || 0) * 2.0) +
        ((reactions.angry || 0) * 2.0) +
        ((reactions.like || 0) * 1.5);

    // Comments are the primary engagement currency in groups (answers, discussions)
    const commentsCount = post.commentsCount || 0;
    const commentsScore = commentsCount * 7.0;

    // Interactive Poll votes
    let pollVotes = 0;
    if (post.poll && Array.isArray(post.poll.options)) {
        pollVotes = post.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
    }
    const pollScore = pollVotes * 4.0;

    // Base constant so every new post has momentum
    const baseWeight = 15.0 + reactionScore + commentsScore + pollScore;

    // ─── 3. COMMUNITY ROLE & TRUST BONUS ───
    let authorityBonus = 0;
    const creatorRole = post.creatorRole;
    if (creatorRole === "teacher") {
        authorityBonus += 18.0; // Faculty guidance & academic notices
    } else if (creatorRole === "admin" || creatorRole === "super_manager") {
        authorityBonus += 20.0; // Official platform/campus management
    } else if (creatorRole === "manager") {
        authorityBonus += 14.0; // Campus coordinator
    }

    // ─── 4. FORMAT MULTIPLIER ───
    let formatMultiplier = 1.0;
    if (post.imageUrl) formatMultiplier += 0.12; // Media attachment
    if (post.poll) formatMultiplier += 0.15; // Interactive community poll

    // ─── 5. ACTIVITY BUMPING & TIME DECAY (Facebook Group Dynamics) ───
    const now = Date.now();
    const createdMs = getTimestampMs(post.createdAt) || now;
    const activityMs = getTimestampMs(post.lastActivityAt) || createdMs;

    // Effective time = latest between creation and last comment/reaction
    const effectiveTime = Math.max(createdMs, activityMs);
    const hoursSinceActivity = Math.max(0, (now - effectiveTime) / (1000 * 60 * 60));
    const hoursSinceCreation = Math.max(0, (now - createdMs) / (1000 * 60 * 60));

    // Fresh Post Grace Period:
    // Posts created in the last 2.5 hours get a temporary discovery boost
    // so they are easily discovered and receive their first replies.
    const discoveryBoost = hoursSinceCreation < 2.5 
        ? Math.max(0, 24 * (1 - hoursSinceCreation / 2.5)) 
        : 0;

    // Smooth gravity decay based on inactivity
    // When someone comments, hoursSinceActivity drops to 0, bumping the post!
    const decay = 1 / Math.pow(1 + hoursSinceActivity * 0.055, 1.25);

    // ─── 6. VIEWER AFFINITY ───
    let affinity = 1.0;
    if (currentUserId && post.creatorId === currentUserId) {
        affinity += 0.10;
    }
    if (currentUserId && post.reactedBy) {
        const hasReacted = Object.values(post.reactedBy).some(
            uids => Array.isArray(uids) && uids.includes(currentUserId)
        );
        if (hasReacted) affinity += 0.15;
    }

    return ((baseWeight * affinity) + authorityBonus + discoveryBoost) * decay * formatMultiplier;
}

/**
 * Ranks group posts using the Facebook Group Algorithm.
 * - Mode 'activity' (default): Activity Bumping + Engagement Velocity + Anti-Flooding.
 * - Mode 'recent': Strict reverse-chronological order by creation timestamp.
 * - Pinned posts always stay at the top in both modes.
 */
export function rankGroupPosts(
    posts: (GroupPostDoc & { id: string })[],
    context: GroupAlgorithmContext = {},
    mode: GroupFeedSortMode = "activity"
): ScoredGroupPost[] {
    if (!posts || posts.length === 0) return [];

    // Separate pinned from regular posts
    const pinned = posts.filter(p => p.isPinned);
    const unpinned = posts.filter(p => !p.isPinned);

    // Pinned posts sort among themselves by latest activity/creation
    pinned.sort((a, b) => {
        const timeA = Math.max(getTimestampMs(a.lastActivityAt), getTimestampMs(a.createdAt));
        const timeB = Math.max(getTimestampMs(b.lastActivityAt), getTimestampMs(b.createdAt));
        return timeB - timeA;
    });

    if (mode === "recent") {
        // Pure chronological order
        unpinned.sort((a, b) => {
            const timeA = getTimestampMs(a.createdAt);
            const timeB = getTimestampMs(b.createdAt);
            return timeB - timeA;
        });
        return [...pinned, ...unpinned];
    }

    // ─── RECENT ACTIVITY MODE (Facebook Group Algorithm) ───
    const scoredList: ScoredGroupPost[] = unpinned.map(p => ({
        ...p,
        _algoScore: computeFacebookGroupPostScore(p, context)
    }));

    // Initial sort by raw algorithmic score
    scoredList.sort((a, b) => (b._algoScore || 0) - (a._algoScore || 0));

    // Anti-Flooding Pass:
    // 1. Author fatigue: progressive 40% penalty per repeated post by same author: (0.60)^seenAuthor
    // 2. Group fatigue (for multi-group feeds): progressive 30% penalty per repeated post from same group
    const authorCounts: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};

    const adjustedList = scoredList.map(item => {
        const authorId = item.creatorId || "unknown";
        const groupId = item.groupId || "unknown";

        const seenAuthor = authorCounts[authorId] || 0;
        authorCounts[authorId] = seenAuthor + 1;

        let multiplier = 1.0;
        if (seenAuthor > 0) {
            multiplier *= Math.pow(0.60, seenAuthor);
        }

        if (context.isMultiGroupFeed) {
            const seenGroup = groupCounts[groupId] || 0;
            groupCounts[groupId] = seenGroup + 1;
            if (seenGroup > 1) {
                multiplier *= Math.pow(0.70, seenGroup - 1);
            }
        }

        return {
            ...item,
            _algoScore: (item._algoScore || 0) * multiplier
        };
    });

    // Final sorting with anti-flooding adjustments applied
    adjustedList.sort((a, b) => (b._algoScore || 0) - (a._algoScore || 0));

    return [...pinned, ...adjustedList];
}
