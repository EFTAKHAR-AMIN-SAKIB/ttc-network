"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Calendar, Clock, User, Link as LinkIcon, AlertCircle, Pencil, Globe, Lock, Trash2, MessageCircle, Bookmark, Share2 } from "lucide-react";
import Link from "next/link";
import { type FirestoreStudyPost } from "@/lib/firestore";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentSystem } from "@/components/Social/CommentSystem";
import { format, isAfter, isBefore, addHours, parseISO } from "date-fns";

interface StudyScheduleCardProps {
    post: FirestoreStudyPost & { id: string };
    currentUserId?: string;
    isAdmin?: boolean;
    onEdit?: (post: FirestoreStudyPost & { id: string }) => void;
    onDelete?: (id: string) => void;
    isSaved?: boolean;
    onSave?: (id: string) => void;
    onShare?: (post: any) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const safeDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    // Handle Firestore Timestamp
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val.toMillis === 'function') return new Date(val.toMillis());
    // Handle String
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

export default function StudyScheduleCard({ post, currentUserId, isAdmin, onEdit, onDelete, isSaved, onSave, onShare, canEdit, canDelete }: StudyScheduleCardProps) {
    const [status, setStatus] = useState<"upcoming" | "live" | "ended">("upcoming");
    const [timeLeft, setTimeLeft] = useState("");
    const [showComments, setShowComments] = useState(false);
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
            if (params.get("commentPostId") === post.id) {
                setShowComments(true);
            }
        }
    }, [post.id]);

    const startDate = safeDate(post.startTime);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden border-2 transition-all duration-500 shadow-xl shadow-navy-900/5 ${
                status === 'live' ? 'border-primary shadow-primary/20 scale-[1.02]' : 'border-gray-100 dark:border-gray-800'
            }`}
        >
            <div className="p-5 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                        status === 'live' ? 'bg-primary text-white animate-pulse' : 
                        status === 'upcoming' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}>
                        {status === 'live' ? <div className="w-2 h-2 rounded-full bg-white" /> : <Clock size={14} />}
                        {timeLeft}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            {(post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only') ? 
                                <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-600"><Lock size={12} strokeWidth={3} /></div> : 
                                <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600"><Globe size={12} strokeWidth={3} /></div>
                            }
                            {post.collegeName?.split(',')[0]} Community
                        </div>
                        
                        {(showEdit || showDelete) && (
                            <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                                {showEdit && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(post);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary/10 dark:bg-gray-800/50 text-gray-400 hover:text-primary transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800"
                                        title="Edit"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                )}
                                {showDelete && onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(post.id);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800"
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Info */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 md:mb-10">
                    <div className="flex-1">
                        <h3 className="text-xl md:text-3xl font-black text-navy-900 dark:text-white mb-4 md:mb-6 leading-tight tracking-tight">
                            {post.title}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="flex items-center gap-2.5 sm:gap-3 text-gray-500">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-primary">
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
                                    <p className="text-xs sm:text-sm font-bold">{format(startDate, "EEE, MMM do")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 sm:gap-3 text-gray-500">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-primary">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Time</p>
                                    <p className="text-xs sm:text-sm font-bold">{format(startDate, "hh:mm a")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Link
                        href={`/profile/${post.authorId}`}
                        className="shrink-0 flex flex-row md:flex-col items-center md:justify-center p-3.5 sm:p-5 bg-gray-50/50 dark:bg-gray-800/20 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 min-w-0 md:min-w-[140px] cursor-pointer hover:bg-primary/5 hover:border-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group/host gap-3 md:gap-0"
                    >
                        <div className="w-10 h-10 sm:w-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] bg-white dark:bg-gray-900 shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden mb-0 md:mb-3 shrink-0 group-hover/host:ring-2 group-hover/host:ring-primary/30 transition-all">
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg md:text-xl font-black text-gray-300">
                                    {post.authorName?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 text-left md:text-center flex-1">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5 md:mb-1">Host</p>
                            <p className="text-xs font-black truncate w-full group-hover/host:text-primary transition-colors">{post.authorName}</p>
                        </div>
                    </Link>
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        <div className="scale-100 sm:scale-110 origin-center sm:origin-left">
                            <ReactionBtn 
                                contentId={post.id} 
                                contentType="study" 
                                reactions={post.reactions} 
                                reactedBy={post.reactedBy} 
                                currentUserId={currentUserId}
                            />
                        </div>
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center gap-2 transition-colors ${showComments ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className={`p-2 rounded-xl transition-colors ${showComments ? 'bg-primary/10' : 'bg-gray-50 dark:bg-white/5'}`}>
                                <MessageCircle size={18} className={showComments ? 'fill-primary' : ''} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{post.commentsCount || 0}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                            {onSave && (
                                <button 
                                    onClick={() => onSave(post.id)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        isSaved 
                                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                                            : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent hover:border-primary/10"
                                    }`}
                                    title={isSaved ? "Remove Bookmark" : "Bookmark Session"}
                                >
                                    <Bookmark size={18} className={isSaved ? "fill-primary" : ""} />
                                </button>
                            )}
                            {onShare && (
                                <button 
                                    onClick={() => onShare(post)}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-primary/10 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary hover:scale-105 active:scale-95 transition-all duration-200"
                                    title="Share Session"
                                >
                                    <Share2 size={18} />
                                </button>
                            )}
                        </div>
                        
                        {status === 'ended' ? (
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs sm:text-sm">
                                <AlertCircle size={16} /> Ended
                            </div>
                        ) : post.link ? (
                            <a 
                                href={post.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 px-4 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-[0.15em] transition-all ${
                                    status === 'live' 
                                        ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-105 active:scale-95'
                                        : 'bg-navy-900 dark:bg-gray-700 text-white hover:bg-navy-800 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Video size={16} />
                                {status === 'live' ? 'Join' : 'Link'}
                            </a>
                        ) : (
                            <div className="flex items-center gap-2.5 px-4 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-[0.15em] bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700">
                                <Clock size={16} /> TBA
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                    {showComments && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800"
                        >
                            <CommentSystem 
                                contentId={post.id} 
                                contentType="study" 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
