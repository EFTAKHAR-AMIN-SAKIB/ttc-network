"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Calendar, Clock, User, Link as LinkIcon, AlertCircle, Pencil, Globe, Lock, Trash2, MessageCircle } from "lucide-react";
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

export default function StudyScheduleCard({ post, currentUserId, isAdmin, onEdit, onDelete }: StudyScheduleCardProps) {
    const [status, setStatus] = useState<"upcoming" | "live" | "ended">("upcoming");
    const [timeLeft, setTimeLeft] = useState("");
    const [showComments, setShowComments] = useState(false);

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
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-[3rem] overflow-hidden border-2 transition-all duration-500 shadow-xl shadow-navy-900/5 ${
                status === 'live' ? 'border-primary shadow-primary/20 scale-[1.02]' : 'border-gray-100 dark:border-gray-800'
            }`}
        >
            <div className="p-10">
                {/* Status Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                        status === 'live' ? 'bg-primary text-white animate-pulse' : 
                        status === 'upcoming' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}>
                        {status === 'live' ? <div className="w-2 h-2 rounded-full bg-white" /> : <Clock size={14} />}
                        {timeLeft}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        {(post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only') ? 
                            <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-600"><Lock size={12} strokeWidth={3} /></div> : 
                            <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600"><Globe size={12} strokeWidth={3} /></div>
                        }
                        {post.collegeName?.split(',')[0]} Community
                    </div>
                </div>

                {/* Main Info */}
                <div className="flex flex-col md:flex-row gap-8 mb-10">
                    <div className="flex-1">
                        <h3 className="text-2xl md:text-3xl font-black text-navy-900 dark:text-white mb-6 leading-tight tracking-tight">
                            {post.title}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-3 text-gray-500">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-primary">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
                                    <p className="text-sm font-bold">{format(startDate, "EEE, MMM do")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-primary">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Time</p>
                                    <p className="text-sm font-bold">{format(startDate, "hh:mm a")}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Link
                        href={`/profile/${post.authorId}`}
                        className="shrink-0 flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] border border-gray-100 dark:border-gray-800 min-w-[140px] cursor-pointer hover:bg-primary/5 hover:border-primary/20 hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group/host"
                    >
                        <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-gray-900 shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden mb-3 group-hover/host:ring-2 group-hover/host:ring-primary/30 transition-all">
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-300">
                                    {post.authorName?.[0]}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Host</p>
                        <p className="text-xs font-black text-center truncate w-full group-hover/host:text-primary transition-colors">{post.authorName}</p>
                    </Link>
                </div>

                {/* Footer bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-6">
                        <div className="scale-110 origin-left">
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

                    <div className="flex items-center gap-3">
                        {status === 'ended' ? (
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                <AlertCircle size={16} /> Session Completed
                            </div>
                        ) : post.link ? (
                            <a 
                                href={post.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] transition-all ${
                                    status === 'live' 
                                        ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:scale-105 active:scale-95'
                                        : 'bg-navy-900 dark:bg-gray-700 text-white hover:bg-navy-800 dark:hover:bg-gray-600'
                                }`}
                            >
                                <Video size={18} />
                                {status === 'live' ? 'Join Now' : 'View Link'}
                            </a>
                        ) : (
                            <div className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700">
                                <Clock size={18} /> Link TBA
                            </div>
                        )}

                        {(currentUserId === post.authorId || isAdmin) && onEdit && (
                            <button
                                onClick={() => onEdit(post)}
                                className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all shadow-sm"
                                title="Edit"
                            >
                                <Pencil size={18} />
                            </button>
                        )}

                        {(currentUserId === post.authorId || isAdmin) && onDelete && (
                            <button
                                onClick={() => onDelete(post.id)}
                                className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
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
