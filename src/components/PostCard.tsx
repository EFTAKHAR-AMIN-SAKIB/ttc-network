"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, ExternalLink, School, MapPin, 
    MoreHorizontal, Edit2, Trash2, MessageCircle, 
    Share2, Bookmark, Lock, LogIn,
    Calendar, CalendarPlus, Video, Globe, Users,
    Check, Star, BarChart2, RotateCcw, Ticket, Maximize2
} from "lucide-react";
import Link from "next/link";
import { ReactionBtn, ReactionSummary } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import PostMediaLightbox from "@/components/Social/PostMediaLightbox";
import PostMediaGrid from "@/components/Social/PostMediaGrid";
import { subscribeComments, rsvpToEvent, voteOnPoll, type EventDetails, type PollDetails, type PostMediaItem } from "@/lib/firestore";
import { ExpandableText, RichText, TimeAgo } from "@/components/Social/SocialUtils";
import ShareModal from "@/components/ShareModal";
import { isContentRestrictedForUser } from "@/lib/permissions";
import { useToast } from "@/contexts/ToastContext";
import { formatExternalUrl } from "@/lib/url-utils";

interface PostCardProps {
    post: any;
    profile: any;
    onEdit?: (post: any) => void;
    onDelete?: (id: string) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    editingId?: string | null;
    isSaving?: boolean;
    autoFocus?: boolean;
    onTagClick?: (tag: string) => void;
    // Bookmark/Save feature
    isSaved?: boolean;
    onSave?: (id: string) => void;
    hideManageOptions?: boolean;
    [key: string]: any;
}

const roleColors: Record<string, string> = {
    student: "bg-blue-100 text-blue-700",
    teacher: "bg-emerald-100 text-emerald-700",
    admin: "bg-purple-100 text-purple-700",
};

const roleLabels: Record<string, string> = {
    student: "Student",
    teacher: "Teacher",
    admin: "Admin",
};

function getDomainIcon(domain: string) {
    if (domain.includes("youtube")) return "🎬";
    if (domain.includes("facebook")) return "📘";
    if (domain.includes("drive.google")) return "📁";
    return "🔗";
}

function LinkPreviewCard({ post }: { post: any }) {
    if (!post.linkPreview) return null;
    const hasImage = !!post.linkPreview.thumbnail;

    return (
        <a
            href={formatExternalUrl(post.shareLink) || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`block mt-4 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all group bg-white dark:bg-[#1a1b23] ${hasImage ? 'flex flex-col sm:flex-row' : 'flex flex-col'}`}
        >
            {hasImage ? (
                <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                    <img 
                        src={post.linkPreview.thumbnail} 
                        alt={post.linkPreview.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>
            ) : (
                <div className="h-28 bg-gradient-to-br from-primary/10 via-gray-50 to-accent/10 flex items-center justify-center dark:from-primary/20 dark:via-gray-900 dark:to-accent/20 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="text-center">
                        <span className="text-4xl">{getDomainIcon(post.linkPreview.domain)}</span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase tracking-widest">{post.linkPreview.domain}</p>
                    </div>
                </div>
            )}
            
            <div className={`p-4 flex flex-col justify-center min-w-0 flex-1 ${hasImage ? 'sm:p-5' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                    {!hasImage && <span className="text-sm">{getDomainIcon(post.linkPreview.domain)}</span>}
                    <span className="text-[10px] uppercase font-black text-gray-500 dark:text-gray-400 tracking-wider truncate">
                        {post.linkPreview.domain}
                    </span>
                    <ExternalLink size={12} className="text-gray-300 group-hover:text-primary ml-auto flex-shrink-0 transition-colors" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug break-words line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {post.linkPreview.title}
                </h4>
                {post.linkPreview.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 break-words">
                        {post.linkPreview.description}
                    </p>
                )}
            </div>
        </a>
    );
}

const EVENT_CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
    "Academic": { label: "Academic / Seminar", icon: "🎓" },
    "Tech": { label: "Tech & Workshop", icon: "💻" },
    "Sports": { label: "Sports & Tournament", icon: "🏆" },
    "Cultural": { label: "Cultural & Arts", icon: "🎭" },
    "Social": { label: "Social & Charity", icon: "🩸" },
    "Career": { label: "Career & Job Fair", icon: "💼" },
    "Meetup": { label: "Campus Meetup", icon: "🤝" },
    "Other": { label: "Announcement", icon: "📣" }
};

function parseDateValue(val: any): Date | null {
    if (!val) return null;
    if (typeof val.toDate === "function") return val.toDate();
    if (typeof val.toMillis === "function") return new Date(val.toMillis());
    if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function formatEventDateTime(startDateStr: any, endDateStr?: any) {
    const start = parseDateValue(startDateStr);
    if (!start) {
        return { display: "Date to be announced", month: "EVENT", day: "--", weekday: "", isPast: false };
    }

    const month = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = start.getDate();
    const weekday = start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

    const dateStr = start.toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
    });
    const timeStr = start.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit" 
    });

    let display = `${dateStr} at ${timeStr}`;

    const end = parseDateValue(endDateStr);
    if (end) {
        const endTimeStr = end.toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit" 
        });
        if (start.toDateString() === end.toDateString()) {
            display = `${dateStr} • ${timeStr} – ${endTimeStr}`;
        } else {
            const endDatePart = end.toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric" 
            });
            display = `${dateStr}, ${timeStr} – ${endDatePart}, ${endTimeStr}`;
        }
    }

    const isPast = (end || start).getTime() < Date.now();

    return { display, month, day, weekday, isPast };
}

function getGoogleCalendarUrl(event: {
    title: string;
    description?: string;
    location?: string;
    startDate: any;
    endDate?: any;
}): string {
    const start = parseDateValue(event.startDate);
    if (!start) return "#";
    const end = parseDateValue(event.endDate) || new Date(start.getTime() + 2 * 3600 * 1000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const toGCalString = (d: Date) => {
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const dates = `${toGCalString(start)}/${toGCalString(end)}`;
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: dates,
        details: event.description || "",
        location: event.location || ""
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getPollTimeRemaining(expiresAt?: any) {
    if (!expiresAt) return { label: "Ongoing", isClosed: false };
    const exp = parseDateValue(expiresAt);
    if (!exp) return { label: "Active", isClosed: false };

    const diffMs = exp.getTime() - Date.now();
    if (diffMs <= 0) return { label: "Final Results", isClosed: true };

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 1) return { label: `${diffDays} days left`, isClosed: false };
    if (diffDays === 1) return { label: "1 day left", isClosed: false };
    if (diffHours >= 1) return { label: `${diffHours}h left`, isClosed: false };
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return { label: `${Math.max(1, diffMins)}m left`, isClosed: false };
}

export default function PostCard({
    post, profile, onEdit, onDelete, onApprove, onReject,
    onTagClick, isSaved, onSave, hideManageOptions
}: PostCardProps) {
    const { showToast } = useToast();
    const [showComments, setShowComments] = useState(false);
    const [previewComments, setPreviewComments] = useState<any[]>([]);
    const searchParams = useSearchParams();

    // Event RSVP State
    const [eventDetails, setEventDetails] = useState<EventDetails | undefined>(post.eventDetails);
    const [isRsvping, setIsRsvping] = useState(false);

    useEffect(() => {
        setEventDetails(post.eventDetails);
    }, [post.eventDetails]);

    // Poll State
    const [poll, setPoll] = useState<PollDetails | undefined>(post.poll);
    const [selectedPollOptionIds, setSelectedPollOptionIds] = useState<string[]>([]);
    const [isVoting, setIsVoting] = useState(false);
    const [showVoteForm, setShowVoteForm] = useState(false);

    useEffect(() => {
        setPoll(post.poll);
    }, [post.poll]);

    // Post Type Detection
    const isEvent = post.postType === "event" || (!!post.eventDetails && !!post.eventDetails.startDate);
    const isPoll = post.postType === "poll" || (!!post.poll && Array.isArray(post.poll.options) && post.poll.options.length > 0);

    // Event Calculations
    const eventDateInfo = useMemo(() => {
        if (!isEvent || !eventDetails?.startDate) {
            return { display: "", month: "EVENT", day: "--", weekday: "", isPast: false };
        }
        return formatEventDateTime(eventDetails.startDate, eventDetails.endDate);
    }, [isEvent, eventDetails?.startDate, eventDetails?.endDate]);

    const categoryMeta = useMemo(() => {
        if (!eventDetails?.category) return null;
        return EVENT_CATEGORY_MAP[eventDetails.category] || { label: eventDetails.category, icon: "📌" };
    }, [eventDetails?.category]);

    const eventFormatMeta = useMemo(() => {
        if (eventDetails?.location === "Online" || (eventDetails?.isOnline && !eventDetails?.location)) {
            return { label: "Online", icon: "🌐" };
        }
        if (eventDetails?.isOnline && eventDetails?.location) {
            return { label: "Hybrid", icon: "🔄" };
        }
        return { label: "In-Person", icon: "📍" };
    }, [eventDetails?.location, eventDetails?.isOnline]);

    const gcalUrl = useMemo(() => {
        if (!isEvent || !eventDetails?.startDate) return "#";
        return getGoogleCalendarUrl({
            title: post.eventName || "Campus Event",
            description: post.description,
            location: eventDetails.location || post.collegeName || "Campus",
            startDate: eventDetails.startDate,
            endDate: eventDetails.endDate,
        });
    }, [isEvent, post.eventName, post.description, eventDetails, post.collegeName]);

    const userRsvp = useMemo(() => {
        if (!profile?.uid || !eventDetails) return null;
        if (Array.isArray(eventDetails.going) && eventDetails.going.includes(profile.uid)) return "going";
        if (Array.isArray(eventDetails.interested) && eventDetails.interested.includes(profile.uid)) return "interested";
        return null;
    }, [eventDetails, profile?.uid]);

    const handleRsvp = async (newStatus: "going" | "interested") => {
        if (!profile?.uid) {
            showToast("Please log in to RSVP to this event", "error");
            return;
        }
        const targetStatus = userRsvp === newStatus ? null : newStatus;

        // Optimistic UI update
        const prevDetails = eventDetails ? { ...eventDetails } : undefined;
        let going = Array.isArray(eventDetails?.going) ? [...eventDetails.going] : [];
        let interested = Array.isArray(eventDetails?.interested) ? [...eventDetails.interested] : [];

        going = going.filter(id => id !== profile.uid);
        interested = interested.filter(id => id !== profile.uid);

        if (targetStatus === "going") going.push(profile.uid);
        if (targetStatus === "interested") interested.push(profile.uid);

        setEventDetails({
            ...eventDetails!,
            going,
            interested
        });

        try {
            setIsRsvping(true);
            await rsvpToEvent(post.id, targetStatus, profile.uid);
            if (targetStatus === "going") {
                showToast("You're marked as Going! Added to your schedule.", "success");
            } else if (targetStatus === "interested") {
                showToast("Marked as Interested.", "info");
            } else {
                showToast("RSVP removed.", "info");
            }
        } catch (err: any) {
            setEventDetails(prevDetails);
            showToast(err.message || "Failed to update RSVP", "error");
        } finally {
            setIsRsvping(false);
        }
    };

    // Poll Calculations
    const userVotedIds = useMemo(() => {
        if (!poll?.options || !profile?.uid) return [];
        return poll.options
            .filter(opt => Array.isArray(opt.votes) && opt.votes.includes(profile.uid))
            .map(opt => opt.id);
    }, [poll?.options, profile?.uid]);

    const hasVoted = userVotedIds.length > 0;
    const pollStatus = useMemo(() => getPollTimeRemaining(poll?.expiresAt), [poll?.expiresAt]);
    const isPollClosed = pollStatus.isClosed;

    const totalVotes = useMemo(() => {
        if (!poll?.options) return 0;
        const unique = new Set<string>();
        poll.options.forEach(opt => {
            if (Array.isArray(opt.votes)) opt.votes.forEach(uid => unique.add(uid));
        });
        return unique.size;
    }, [poll?.options]);

    const maxVotesOnAnyOption = useMemo(() => {
        if (!poll?.options) return 0;
        return Math.max(...poll.options.map(opt => Array.isArray(opt.votes) ? opt.votes.length : 0), 0);
    }, [poll?.options]);

    const handleVote = async (optionIdsToVote: string[]) => {
        if (!profile?.uid) {
            showToast("Please log in to vote on this poll", "error");
            return;
        }
        if (optionIdsToVote.length === 0) {
            showToast("Please select at least one option", "error");
            return;
        }

        const prevPoll = poll ? { ...poll } : undefined;

        // Optimistic UI update
        const updatedOptions = (poll?.options || []).map(opt => {
            let votes = Array.isArray(opt.votes) ? opt.votes.filter(id => id !== profile.uid) : [];
            if (optionIdsToVote.includes(opt.id)) {
                votes.push(profile.uid);
            }
            return { ...opt, votes };
        });

        setPoll({
            ...poll!,
            options: updatedOptions
        });
        setShowVoteForm(false);
        setSelectedPollOptionIds([]);

        try {
            setIsVoting(true);
            await voteOnPoll(post.id, optionIdsToVote, profile.uid);
            showToast("Vote recorded!", "success");
        } catch (err: any) {
            setPoll(prevPoll);
            showToast(err.message || "Failed to submit vote", "error");
        } finally {
            setIsVoting(false);
        }
    };

    useEffect(() => {
        if (!post.id) return;
        return subscribeComments(post.id, (allComments) => {
            const rootComments = allComments.filter(c => !c.parentId);
            const sorted = [...rootComments].sort((a, b) => {
                const aLikes = a.likes || 0;
                const bLikes = b.likes || 0;
                const aReplies = allComments.filter(c => c.parentId === a.id).length;
                const bReplies = allComments.filter(c => c.parentId === b.id).length;
                const aScore = aLikes + aReplies * 2;
                const bScore = bLikes + bReplies * 2;
                if (aScore !== bScore) return bScore - aScore;
                const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            setPreviewComments(sorted.slice(0, 2));
        });
    }, [post.id]);

    const [showOptions, setShowOptions] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isMediaLightboxOpen, setIsMediaLightboxOpen] = useState(false);
    const [mediaLightboxIndex, setMediaLightboxIndex] = useState(0);

    const postMediaList: PostMediaItem[] = useMemo(() => {
        if (Array.isArray(post.media) && post.media.length > 0) {
            return post.media.map((m: any) => typeof m === "string" ? {
                url: m,
                type: /\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(m) ? "video" : "image"
            } : m);
        }
        if (post.thumbnailUrl) {
            const isVid = /\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(post.thumbnailUrl) || post.thumbnailUrl.includes("/video/upload/");
            return [{ url: post.thumbnailUrl, type: isVid ? "video" : "image" }];
        }
        return [];
    }, [post.media, post.thumbnailUrl]);
    
    const isOwner = profile?.uid === post.creatorId;
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";
    const canManage = !hideManageOptions && (isOwner || isAdmin || (profile?.role === "manager" && profile?.collegeId === post.collegeId));
    
    const isRestricted = isContentRestrictedForUser(post, profile, profile?.uid);
    
    // Auto-expand comments if the URL hash or query points to a comment on this post
    useEffect(() => {
        const expandId = searchParams.get("post") || searchParams.get("commentPostId");
        const hasCommentParam = searchParams.get("comment");
        const hasCommentHash = typeof window !== "undefined" && window.location.hash.startsWith("#comment-");
        if (expandId === post.id && (hasCommentParam || hasCommentHash || searchParams.get("commentPostId"))) {
            setShowComments(true);
        }
    }, [post.id, searchParams]);

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white dark:bg-[#1a1b23] rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-gray-800 hover:border-primary/20 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-colors" />
            
            {/* Top Bar: Author & Meta */}
            <div className="flex items-start justify-between mb-4 sm:mb-6 relative z-20">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Link href={`/profile/${post.creatorId}`} className="relative cursor-pointer group/author transition-transform active:scale-95 flex-shrink-0">
                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-lg sm:text-xl font-black text-gray-400 border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm shadow-black/5 group-hover/author:border-primary/50 transition-colors">
                            {post.createdBy?.avatar ? (
                                <img src={post.createdBy.avatar} className="w-full h-full object-cover" />
                            ) : (post.createdBy?.name?.charAt(0) || "?")}
                        </div>
                        {post.status === "pending" && (
                            <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-lg shadow-lg border-2 border-white dark:border-[#1a1c24] animate-pulse">
                                <Clock size={10} />
                            </div>
                        )}
                    </Link>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                            <Link href={`/profile/${post.creatorId}`} className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight hover:text-primary transition-colors truncate">
                                {post.createdBy?.name}
                            </Link>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${roleColors[post.createdBy?.role] || 'bg-gray-100 text-gray-500'}`}>
                                {roleLabels[post.createdBy?.role] || post.createdBy?.role}
                            </span>
                            {isEvent && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 inline-flex items-center gap-1">
                                    <Calendar size={9} /> Event
                                </span>
                            )}
                            {isPoll && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 inline-flex items-center gap-1">
                                    <BarChart2 size={9} /> Poll
                                </span>
                            )}
                            {post.clubName && post.clubId && (
                                <Link 
                                    href={`/college-info?college=${post.collegeId}&clubId=${post.clubId}`}
                                    className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                                >
                                    🏆 {post.clubName}
                                </Link>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1 min-w-0">
                                <MapPin size={9} className="shrink-0" /> 
                                <span className="truncate max-w-[160px] sm:max-w-none">{post.collegeName}</span>
                            </span>
                            <span>•</span>
                            <span><TimeAgo ts={post.timestamp} /></span>
                            {post.visibility === "campus" && (
                                <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1 text-primary font-black">
                                        <School size={9} className="shrink-0" /> Campus Only
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canManage && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowOptions(!showOptions)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <MoreHorizontal size={20} />
                            </button>
                            <AnimatePresence>
                                {showOptions && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setShowOptions(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[70] overflow-hidden p-1.5"
                                        >
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    setShowOptions(false); 
                                                    onEdit?.(post); 
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                                            >
                                                <Edit2 size={14} className="text-primary" /> Edit Post
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    if (onDelete) onDelete(post.id);
                                                    setTimeout(() => setShowOptions(false), 50); 
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Post Content */}
            <div className="space-y-4 relative z-10">
                {isRestricted ? (
                    <div className="mt-4 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 text-white border border-white/10 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center gap-3">
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                            <Lock size={24} />
                        </div>

                        <div>
                            <h4 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                                {post.visibility === "private" ? "Private Post" : "Campus Only Content"}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-300 max-w-md mt-1 font-medium leading-relaxed">
                                {post.visibility === "private" 
                                    ? "This post is marked as private by the creator."
                                    : `This post is exclusively available to verified students & faculty of ${post.collegeName || "this college"}. Please log in with your college account to view.`}
                            </p>
                        </div>

                        {!profile?.uid && (
                            <Link
                                href="/login"
                                className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
                            >
                                <LogIn size={14} /> Log In to View
                            </Link>
                        )}
                    </div>
                ) : isEvent ? (
                    /* ─── Facebook-Style Campus Event Card ─── */
                    <div className="space-y-4">
                        {/* Event Hero Banner */}
                        {post.thumbnailUrl && (
                            <div 
                                onClick={() => setIsMediaLightboxOpen(true)}
                                className="relative rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner group/img aspect-[16/9] w-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
                            >
                                <img 
                                    src={post.thumbnailUrl} 
                                    alt={post.eventName}
                                    className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors pointer-events-none flex items-center justify-center">
                                    <div className="opacity-0 group-hover/img:opacity-100 transition-all scale-95 group-hover/img:scale-100 bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full shadow-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
                                        <Maximize2 size={14} />
                                        <span>View Photo</span>
                                    </div>
                                </div>
                                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {categoryMeta && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md flex items-center gap-1.5">
                                                <span>{categoryMeta.icon}</span>
                                                <span>{categoryMeta.label}</span>
                                            </span>
                                        )}
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md flex items-center gap-1.5">
                                            {eventFormatMeta.icon} {eventFormatMeta.label}
                                        </span>
                                    </div>
                                    {eventDetails?.entryFee && (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-emerald-500/90 text-white border border-emerald-400/30 shadow-md">
                                            🎟️ {eventDetails.entryFee}
                                        </span>
                                    )}
                                </div>
                                {eventDateInfo.isPast && (
                                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-slate-900/80 text-gray-300 border border-white/10 shadow-md">
                                        🏁 Past Event
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Facebook-Style Date Header Block */}
                        <div className="flex items-start gap-3.5 sm:gap-4 pt-1">
                            {/* Calendar Badge */}
                            <div suppressHydrationWarning className="w-14 sm:w-16 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm shrink-0 text-center bg-white dark:bg-[#161822]">
                                <div className="bg-red-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider py-1 leading-none">
                                    {eventDateInfo.month}
                                </div>
                                <div className="py-1.5 sm:py-2 flex flex-col items-center justify-center">
                                    <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-none">
                                        {eventDateInfo.day}
                                    </span>
                                    <span className="text-[8px] sm:text-[9px] font-extrabold uppercase text-gray-400 tracking-wider mt-0.5 leading-none">
                                        {eventDateInfo.weekday}
                                    </span>
                                </div>
                            </div>

                            {/* Title & Metadata */}
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors duration-500">
                                    <RichText text={post.eventName} onTagClick={onTagClick || undefined} />
                                </h2>
                                <div className="mt-1.5 space-y-1">
                                    <p suppressHydrationWarning className="text-xs sm:text-sm font-bold text-red-500 dark:text-red-400 flex items-center gap-1.5">
                                        <Clock size={13} className="shrink-0" />
                                        <span>{eventDateInfo.display}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                        {eventDetails?.location && eventDetails.location !== "Online" && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventDetails.location + " " + (post.collegeName || ""))}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                            >
                                                <MapPin size={12} className="text-primary shrink-0" />
                                                <span className="truncate max-w-[200px] sm:max-w-xs">{eventDetails.location}</span>
                                            </a>
                                        )}
                                        {eventDetails?.isOnline && (
                                            <span className="inline-flex items-center gap-1 text-blue-500">
                                                <Video size={12} className="shrink-0" />
                                                {eventDetails.onlineLink ? (
                                                    <a 
                                                        href={formatExternalUrl(eventDetails.onlineLink)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="hover:underline flex items-center gap-1 font-bold"
                                                    >
                                                        Join Link Available <ExternalLink size={10} />
                                                    </a>
                                                ) : (
                                                    "Online Meeting"
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description / Agenda */}
                        {post.description && (
                            <ExpandableText text={post.description} onTagClick={onTagClick || undefined} />
                        )}

                        {/* Facebook-style RSVP Bar */}
                        <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/80 dark:bg-[#161822] border border-gray-100 dark:border-gray-800/80 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Going / Interested Counters */}
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    <Users size={14} className="text-primary" />
                                    <span>
                                        <strong className="text-gray-900 dark:text-white">{eventDetails?.going?.length || 0}</strong> going
                                    </span>
                                    <span>•</span>
                                    <span>
                                        <strong className="text-gray-900 dark:text-white">{eventDetails?.interested?.length || 0}</strong> interested
                                    </span>
                                </div>

                                {/* Calendar CTA */}
                                <div className="flex items-center gap-2">
                                    <a
                                        href={gcalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:text-primary hover:border-primary/40 transition-all shadow-xs"
                                        title="Add to Google Calendar"
                                    >
                                        <CalendarPlus size={13} className="text-primary" />
                                        <span>Add to Cal</span>
                                    </a>
                                    {eventDetails?.registrationLink && (
                                        <a
                                            href={formatExternalUrl(eventDetails.registrationLink)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 hover:scale-105 active:scale-95 duration-200"
                                            title="Open Registration Link"
                                        >
                                            <Ticket size={13} />
                                            <span>Register</span>
                                            <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* RSVP Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/50 dark:border-gray-800/50">
                                <button
                                    onClick={() => handleRsvp("interested")}
                                    disabled={isRsvping}
                                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                                        userRsvp === "interested"
                                            ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                                            : "bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300"
                                    }`}
                                >
                                    <Star size={14} className={userRsvp === "interested" ? "fill-white" : ""} />
                                    <span>Interested</span>
                                </button>

                                <button
                                    onClick={() => handleRsvp("going")}
                                    disabled={isRsvping}
                                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                                        userRsvp === "going"
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                                            : "bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                                    }`}
                                >
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Going</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : isPoll ? (
                    /* ─── Interactive Campus Poll Card ─── */
                    <div className="space-y-4">
                        {/* Poll Header */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 inline-flex items-center gap-1">
                                    <BarChart2 size={10} /> {post.clubName ? `${post.clubName} Poll` : post.type === "club" ? "Club Poll" : "Campus Poll"}
                                </span>
                                {poll?.allowsMultiple && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                        Multiple Choice
                                    </span>
                                )}
                                <span suppressHydrationWarning className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    isPollClosed
                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                }`}>
                                    {pollStatus.label}
                                </span>
                            </div>

                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors duration-500">
                                <RichText text={poll?.question || post.eventName} onTagClick={onTagClick || undefined} />
                            </h2>
                        </div>

                        {post.description && (
                            <ExpandableText text={post.description} onTagClick={onTagClick || undefined} />
                        )}

                        {/* Poll Options List */}
                        <div className="space-y-2.5 pt-1">
                            {(!hasVoted || showVoteForm) && !isPollClosed ? (
                                /* Voting UI */
                                <div className="space-y-2">
                                    {(poll?.options || []).map((opt) => {
                                        const isSelected = selectedPollOptionIds.includes(opt.id);
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    if (poll?.allowsMultiple) {
                                                        setSelectedPollOptionIds(prev => 
                                                            prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                                                        );
                                                    } else {
                                                        handleVote([opt.id]);
                                                    }
                                                }}
                                                disabled={isVoting}
                                                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group active:scale-[0.99] ${
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                        : "border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-primary/5 hover:border-primary/40 text-gray-800 dark:text-gray-200"
                                                }`}
                                            >
                                                <span className="text-xs sm:text-sm font-bold group-hover:text-primary transition-colors">
                                                    {opt.text}
                                                </span>
                                                <div className={`w-5 h-5 rounded-${poll?.allowsMultiple ? 'lg' : 'full'} border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected
                                                        ? "bg-primary border-primary text-white"
                                                        : "border-gray-300 dark:border-gray-600 group-hover:border-primary"
                                                }`}>
                                                    {poll?.allowsMultiple ? (
                                                        isSelected && <Check size={12} strokeWidth={3} />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {poll?.allowsMultiple && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                onClick={() => handleVote(selectedPollOptionIds)}
                                                disabled={selectedPollOptionIds.length === 0 || isVoting}
                                                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95"
                                            >
                                                {isVoting ? "Voting..." : "Submit Vote"}
                                            </button>
                                            {hasVoted && (
                                                <button
                                                    onClick={() => setShowVoteForm(false)}
                                                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Results UI */
                                <div className="space-y-2">
                                    {(poll?.options || []).map((opt) => {
                                        const voteCount = Array.isArray(opt.votes) ? opt.votes.length : 0;
                                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                        const isMyVote = userVotedIds.includes(opt.id);
                                        const isLeading = totalVotes > 0 && voteCount === maxVotesOnAnyOption;

                                        return (
                                            <div
                                                key={opt.id}
                                                className={`relative overflow-hidden rounded-2xl border transition-all ${
                                                    isMyVote
                                                        ? "border-primary/50 bg-primary/[0.04] dark:bg-primary/[0.08]"
                                                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
                                                }`}
                                            >
                                                {/* Animated percentage progress bar */}
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                                    className={`absolute top-0 bottom-0 left-0 rounded-2xl ${
                                                        isLeading
                                                            ? "bg-gradient-to-r from-primary/25 to-accent/25 dark:from-primary/35 dark:to-accent/35"
                                                            : "bg-gray-200/60 dark:bg-gray-700/50"
                                                    }`}
                                                />

                                                {/* Content overlay */}
                                                <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`text-xs sm:text-sm ${
                                                            isMyVote || isLeading ? "font-black text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"
                                                        } truncate`}>
                                                            {opt.text}
                                                        </span>
                                                        {isMyVote && (
                                                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                                                                <Check size={9} strokeWidth={3} /> You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                        <span className="text-[11px] text-gray-400 font-bold">
                                                            {voteCount}
                                                        </span>
                                                        <span className={`text-xs sm:text-sm font-black min-w-[2.5rem] text-right ${
                                                            isLeading ? "text-primary" : "text-gray-700 dark:text-gray-300"
                                                        }`}>
                                                            {percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Poll Metadata & Actions */}
                                    <div className="flex items-center justify-between pt-1 text-xs text-gray-400 font-bold px-1">
                                        <div className="flex items-center gap-2">
                                            <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
                                            <span>•</span>
                                            <span suppressHydrationWarning className={isPollClosed ? "text-gray-500 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                                                {pollStatus.label}
                                            </span>
                                        </div>
                                        {hasVoted && !isPollClosed && (
                                            <button
                                                onClick={() => setShowVoteForm(true)}
                                                className="text-primary hover:underline font-bold text-xs inline-flex items-center gap-1 transition-colors"
                                            >
                                                <RotateCcw size={12} /> Change vote
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ─── Regular Post (100% Backward Compatible) ─── */
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors duration-500">
                                <RichText text={post.eventName} onTagClick={onTagClick || undefined} />
                            </h2>
                        </div>

                        <ExpandableText text={post.description || ""} onTagClick={onTagClick || undefined} />
                        
                        {postMediaList.length === 0 && !post.shareLink && <LinkPreviewCard post={post} />}
                        {postMediaList.length > 0 && (
                            <div className="relative group/media-link">
                                <PostMediaGrid
                                    media={postMediaList}
                                    onMediaClick={(idx) => {
                                        setMediaLightboxIndex(idx);
                                        setIsMediaLightboxOpen(true);
                                    }}
                                    altText={post.eventName}
                                />
                                {post.shareLink && (
                                    <a 
                                        href={formatExternalUrl(post.shareLink)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 z-10"
                                    >
                                        <ExternalLink size={13} />
                                        <span>Visit Link</span>
                                    </a>
                                )}
                            </div>
                        )}
                        {postMediaList.length === 0 && post.shareLink && <LinkPreviewCard post={post} />}
                    </>
                )}
            </div>

            {/* Interactions Bar (Facebook Layout) */}
            {!isRestricted && (
                <div className="mt-6 pt-2 relative z-10">
                    {/* Top Engagement Stats Row ("React Seeing" & Comments count) */}
                    <ReactionSummary 
                        reactions={post.reactions}
                        reactedBy={post.reactedBy}
                        commentsCount={post.commentsCount || 0}
                        onOpenComments={() => setShowComments(!showComments)}
                    />

                    {/* Subtle Facebook Divider Line */}
                    <div className="border-t border-gray-100 dark:border-gray-800/80 my-1" />

                    {/* Action Buttons Row: Serial Sequence: React -> Comment -> Share -> Bookmark */}
                    <div className="flex items-center justify-between gap-1 py-0.5">
                        {/* 1. React Button */}
                        <div className="flex-1 flex items-center justify-center min-w-0">
                            <ReactionBtn 
                                contentId={post.id} 
                                contentType="post" 
                                reactions={post.reactions} 
                                reactedBy={post.reactedBy}
                                currentUserId={profile?.uid}
                                showSummary={false}
                                variant="facebook"
                            />
                        </div>

                        {/* 2. Comment Button */}
                        <button 
                            type="button"
                            onClick={() => setShowComments(!showComments)}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                                showComments 
                                    ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                            }`}
                            title="Comment on post"
                        >
                            <MessageCircle size={18} className={`shrink-0 transition-transform hover:scale-110 ${showComments ? "fill-primary/20" : ""}`} />
                            <span className="text-xs sm:text-sm whitespace-nowrap">Comment</span>
                        </button>

                        {/* 3. Share Button */}
                        <button 
                            type="button"
                            onClick={() => setIsShareOpen(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0"
                            title="Share post"
                        >
                            <Share2 size={18} className="shrink-0 transition-transform hover:scale-110" />
                            <span className="text-xs sm:text-sm whitespace-nowrap">Share</span>
                        </button>

                        {/* 4. Bookmark (Save) Button */}
                        <button 
                            type="button"
                            onClick={() => onSave?.(post.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                                isSaved 
                                    ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                            }`}
                            title={isSaved ? "Remove Bookmark" : "Save Post"}
                        >
                            <Bookmark size={18} className={`shrink-0 transition-transform hover:scale-110 ${isSaved ? "fill-primary" : ""}`} />
                            <span className="text-xs sm:text-sm whitespace-nowrap">{isSaved ? "Saved" : "Save"}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Preview of 1-2 top comments */}
            {!showComments && previewComments.length > 0 && (
                <div 
                    onClick={() => setShowComments(true)}
                    className="mt-6 p-4 bg-gray-50/50 dark:bg-gray-800/10 hover:bg-gray-50 dark:hover:bg-gray-800/20 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl cursor-pointer transition-all space-y-2 relative z-10 animate-fade-in"
                >
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                        <MessageCircle size={12} className="text-primary animate-pulse" /> Top Comments
                    </p>
                    <div className="space-y-1.5">
                        {previewComments.map(c => (
                            <div key={c.id} className="flex gap-2 text-[11px] leading-relaxed">
                                <span className="font-black text-gray-900 dark:text-white shrink-0 uppercase tracking-tight">{c.userName}:</span>
                                <span className="text-gray-600 dark:text-gray-300 line-clamp-1 break-all font-medium">{c.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Comment Drawer Overlay */}
            <AnimatePresence>
                {showComments && (
                    <CommentDrawer 
                        isOpen={showComments} 
                        onClose={() => setShowComments(false)}
                        contentId={post.id}
                        contentType="post"
                    />
                )}
            </AnimatePresence>

            {/* Premium Share Modal */}
            <AnimatePresence>
                {isShareOpen && (
                    <ShareModal 
                        isOpen={isShareOpen} 
                        onClose={() => setIsShareOpen(false)} 
                        post={post} 
                    />
                )}
            </AnimatePresence>

            {/* Facebook-style Media Lightbox */}
            {postMediaList.length > 0 && (
                <PostMediaLightbox 
                    isOpen={isMediaLightboxOpen}
                    onClose={() => setIsMediaLightboxOpen(false)}
                    media={postMediaList}
                    initialIndex={mediaLightboxIndex}
                    src={postMediaList[mediaLightboxIndex]?.url}
                    alt={post.eventName || "Post media"}
                    post={post}
                    contentType="post"
                    author={{
                        name: post.createdBy?.name || "Member",
                        avatar: post.createdBy?.avatar,
                        role: post.createdBy?.role,
                        uid: post.creatorId,
                        collegeName: post.collegeName,
                        clubName: post.clubName,
                        visibility: post.visibility
                    }}
                    isSaved={isSaved}
                    onSave={() => onSave?.(post.id)}
                    onTagClick={onTagClick}
                />
            )}
        </motion.div>
    );
}
