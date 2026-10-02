"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Calendar, Clock, AlertCircle, Pencil, Globe, Lock, Trash2, MessageCircle, Bookmark, Share2 } from "lucide-react";
import Link from "next/link";
import { type FirestoreStudyPost } from "@/lib/firestore";
import { ReactionBtn, ReactionSummary } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import { ExpandableText } from "@/components/Social/SocialUtils";
import { format, isBefore, addHours } from "date-fns";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

interface StudyScheduleCardProps {
    post: FirestoreStudyPost & { id: string };
    currentUserId?: string;
    isAdmin?: boolean;
    onEdit?: (post: FirestoreStudyPost & { id: string }) => void;
    onDelete?: (id: string) => void;
    isSaved?: boolean;
    onSave?: (id: string) => void;
    onShare?: (post: FirestoreStudyPost & { id: string }) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const safeDate = (val: unknown): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    // Handle Firestore Timestamp
    if (typeof (val as { toDate?: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate();
    if (typeof (val as { toMillis?: () => number }).toMillis === 'function') return new Date((val as { toMillis: () => number }).toMillis());
    // Handle String
    const d = new Date(val as string | number);
    return isNaN(d.getTime()) ? new Date() : d;
};

export default function StudyScheduleCard({ post, currentUserId, isAdmin, onEdit, onDelete, isSaved, onSave, onShare, canEdit, canDelete }: StudyScheduleCardProps) {
    const [status, setStatus] = useState<"upcoming" | "live" | "ended">("upcoming");
    const [timeLeft, setTimeLeft] = useState("");
    const [showComments, setShowComments] = useState(false);
    const { isVerified, requireVerification } = useVerifiedAccess();
    const showEdit = canEdit !== undefined ? canEdit : (currentUserId === post.authorId || isAdmin);
    const showDelete = canDelete !== undefined ? canDelete : (currentUserId === post.authorId || isAdmin);

    useEffect(() => {
        if (!post.startTime) return;

        const checkStatus = () => {
            const start = safeDate(post.startTime);
            const now = new Date();
            const end = addHours(start, 2);

            if (isBefore(now, start)) {
                setStatus("upcoming");
                // Calc time left
                const diffMs = start.getTime() - now.getTime();
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                if (diffHrs > 24) setTimeLeft(`${Math.floor(diffHrs / 24)}d left`);
                else if (diffHrs > 0) setTimeLeft(`${diffHrs}h ${diffMins}m left`);
                else setTimeLeft(`${diffMins}m left`);
            } else if (isBefore(now, end)) {
                setStatus("live");
                setTimeLeft("LIVE NOW");
            } else {
                setStatus("ended");
                setTimeLeft("Ended");
            }
        };

        checkStatus();
        const timer = setInterval(checkStatus, 60000);
        return () => clearInterval(timer);
    }, [post.startTime]);

    // Auto-expand comments if the URL points to this post
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get("study") || params.get("post") || params.get("commentPostId");
            const hasCommentParam = params.get("comment");
            const hasCommentHash = window.location.hash.startsWith("#comment-");
            if (targetId === post.id && (hasCommentParam || hasCommentHash || params.get("commentPostId"))) {
                setShowComments(true);
            }
        }
    }, [post.id]);

    const startDate = safeDate(post.startTime);

    const isCampusOnly = post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only';

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2rem] overflow-hidden border transition-all duration-300 shadow-sm shadow-navy-900/5 h-full flex flex-col ${
                status === 'live' ? 'border-red-500/50 dark:border-red-500/40 ring-2 ring-red-500/20' : 'border-gray-100 dark:border-gray-800'
            }`}
        >
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0">
                {/* Status Bar */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                        status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                        status === 'upcoming' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}>
                        {status === 'live' ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>LIVE NOW</span>
                            </>
                        ) : (
                            <>
                                <Clock size={12} />
                                <span>{timeLeft}</span>
                            </>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            {isCampusOnly ? (
                                <div className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-1">
                                    <Lock size={9} /> Campus Only
                                </div>
                            ) : (
                                <div className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200/50 dark:border-blue-800/30 flex items-center gap-1">
                                    <Globe size={9} /> Open to All
                                </div>
                            )}
                        </div>
                        
                        {(showEdit || showDelete) && (
                            <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-1.5 sm:pl-2">
                                {showEdit && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(post);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary/10 dark:bg-gray-800/50 text-gray-400 hover:text-primary transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95"
                                        title="Edit"
                                    >
                                        <Pencil size={11} />
                                    </button>
                                )}
                                {showDelete && onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(post.id);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95"
                                        title="Delete"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Info */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-5">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-xl font-black text-navy-900 dark:text-white mb-2 leading-snug tracking-tight min-h-[2.5rem] sm:min-h-[2.85rem] flex items-start">
                            {post.title}
                        </h3>

                        {/* Session Agenda / Description */}
                        {post.content && (
                            <div className="mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium [&_button]:text-xs line-clamp-2 sm:line-clamp-3">
                                <ExpandableText text={post.content} limit={110} />
                            </div>
                        )}
                        
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Calendar size={14} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">Date</p>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{format(startDate, "EEE, MMM do")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                    <Clock size={14} />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">Time</p>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{format(startDate, "hh:mm a")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Host Profile Card */}
                    <Link
                        href={`/profile/${post.authorId}`}
                        className="shrink-0 flex sm:flex-col items-center justify-center p-3 sm:p-4 bg-gray-50/60 dark:bg-black/20 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 sm:w-28 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 group/host gap-2.5 sm:gap-0"
                    >
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-gray-800 shadow-2xs border border-gray-100 dark:border-gray-700 overflow-hidden sm:mb-2 shrink-0 group-hover/host:ring-2 group-hover/host:ring-primary/30 transition-all">
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-gray-400">
                                    {post.authorName?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 text-left sm:text-center flex-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Host</p>
                            <p className="text-xs font-bold truncate group-hover/host:text-primary transition-colors">{post.authorName}</p>
                        </div>
                    </Link>
                </div>

                {/* Join Session CTA Banner */}
                <div className="mt-2 mb-4">
                    {status === 'ended' ? (
                        <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                            <AlertCircle size={14} /> Session Ended
                        </div>
                    ) : post.link ? (
                        <a 
                            href={post.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                if (!requireVerification("join live prep session")) {
                                    e.preventDefault();
                                }
                            }}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                                status === 'live' 
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/30 hover:scale-[1.01] active:scale-95'
                                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:scale-[1.01] active:scale-95'
                            }`}
                        >
                            {!isVerified ? <Lock size={14} /> : <Video size={14} />}
                            <span>{status === 'live' ? 'Join Live Prep Session' : 'Meeting Link'}</span>
                        </a>
                    ) : (
                        <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 text-gray-400 border border-gray-200/50 dark:border-gray-700/50">
                            <Clock size={13} /> Meeting Link TBA
                        </div>
                    )}
                </div>

                {/* Interactions Bar (Facebook Layout) */}
                <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-gray-800/80 relative z-10">
                    {/* 1. Engagement Summary Row */}
                    <ReactionSummary 
                        reactions={post.reactions}
                        reactedBy={post.reactedBy}
                        commentsCount={post.commentsCount || 0}
                        onOpenComments={() => setShowComments(!showComments)}
                    />

                    {/* Subtle Facebook Divider Line */}
                    <div className="border-t border-gray-100/80 dark:border-gray-800/60 my-1" />

                    {/* 2. Action Buttons Row: Serial Sequence: React -> Comment -> Share -> Bookmark */}
                    <div className="flex items-center justify-between gap-1 py-0.5">
                        {/* 1. React Button */}
                        <div className="flex-1 flex items-center justify-center min-w-0" onClick={(e) => e.stopPropagation()}>
                            <ReactionBtn 
                                contentId={post.id} 
                                contentType="study" 
                                reactions={post.reactions} 
                                reactedBy={post.reactedBy} 
                                currentUserId={currentUserId}
                                showSummary={false}
                                variant="facebook"
                                compact={true}
                            />
                        </div>

                        {/* 2. Comment Button */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowComments(!showComments);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                                showComments 
                                    ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                            }`}
                            title="Comment on session"
                        >
                            <MessageCircle size={16} className={`shrink-0 transition-transform hover:scale-110 ${showComments ? "fill-primary/20" : ""}`} />
                            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Comment</span>
                        </button>

                        {/* 3. Share Button */}
                        {onShare && (
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShare(post);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0"
                                title="Share session"
                            >
                                <Share2 size={16} className="shrink-0 transition-transform hover:scale-110" />
                                <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Share</span>
                            </button>
                        )}

                        {/* 4. Bookmark (Save) Button */}
                        {onSave && (
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSave(post.id);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                                    isSaved 
                                        ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                                }`}
                                title={isSaved ? "Remove Bookmark" : "Save Session"}
                            >
                                <Bookmark size={16} className={`shrink-0 transition-transform hover:scale-110 ${isSaved ? "fill-primary" : ""}`} />
                                <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{isSaved ? "Saved" : "Save"}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Comment Drawer Overlay */}
                <AnimatePresence>
                    {showComments && (
                        <CommentDrawer 
                            isOpen={showComments} 
                            onClose={() => setShowComments(false)}
                            contentId={post.id}
                            contentType="study"
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
