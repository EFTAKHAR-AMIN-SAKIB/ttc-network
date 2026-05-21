"use client";

import { useState, useEffect } from "react";
import { BookOpen, Video, ExternalLink, GraduationCap, Globe, Clock, Lock, MessageSquare, Pencil, Trash2, Download } from "lucide-react";
import { type FirestoreStudyPost } from "@/lib/firestore";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentSystem } from "@/components/Social/CommentSystem";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface StudyNoteCardProps {
    post: FirestoreStudyPost & { id: string };
    currentUserId?: string;
    isAdmin?: boolean;
    onEdit?: (post: FirestoreStudyPost & { id: string }) => void;
    onDelete?: (id: string) => void;
}

export default function StudyNoteCard({ post, currentUserId, isAdmin, onEdit, onDelete }: StudyNoteCardProps) {
    const [showComments, setShowComments] = useState(false);
    const typeIcons = {
        doc: { icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", label: "Document" },
        video: { icon: Video, color: "text-red-500 bg-red-50 dark:bg-red-900/20", label: "Video" },
        link: { icon: ExternalLink, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", label: "Link" }
    };

    const type = post.materialType || "link";
    const { icon: Icon, color, label } = typeIcons[type as keyof typeof typeIcons];

    const currentReactionList = (post.reactedBy?.inspired || []) as string[];
    const isAlreadyFresh = currentUserId ? currentReactionList.includes(currentUserId) : false;

    // Auto-expand comments if the URL points to this post
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("commentPostId") === post.id) {
                setShowComments(true);
            }
        }
    }, [post.id]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl shadow-navy-900/5 hover:shadow-2xl transition-all duration-500 ${showComments ? 'ring-2 ring-primary/20 scale-[1.01]' : 'hover:-translate-y-2'}`}
        >
            <div className="p-8">
                {/* Header Info */}
                <div className="flex items-center justify-between mb-6">
                    <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
                        <Icon size={14} /> {label}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <Clock size={14} className="text-primary" /> 
                        {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "recently"}
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-navy-900 dark:text-white mb-3 line-clamp-2 leading-tight tracking-tight group-hover:text-primary transition-colors">
                    {post.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed font-medium">
                    {post.content}
                </p>

                {/* Thumbnail Display */}
                {post.thumbnailUrl && (
                    <a 
                        href={post.fileUrl || post.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block mb-6 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all group/thumb"
                    >
                        <div className="relative aspect-video">
                            <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover/thumb:scale-[1.03] transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                                {post.fileUrl ? (
                                    <Download className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" size={24} />
                                ) : (
                                    <ExternalLink className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" size={24} />
                                )}
                            </div>
                        </div>
                    </a>
                )}

                {/* Author */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center overflow-hidden rotate-3 group-hover:rotate-0 transition-transform">
                        {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                            <GraduationCap className="w-6 h-6 text-gray-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-navy-900 dark:text-gray-100 truncate">{post.authorName}</p>
                        <p className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-1">
                            {(post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only') ? <Lock size={10} className="text-amber-500" /> : <Globe size={10} className="text-blue-500" />}
                            {post.collegeName?.split(',')[0]}
                        </p>
                    </div>
                </div>

                {/* Main Actions Layer */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                        <div onClick={(e) => e.stopPropagation()}>
                            <ReactionBtn 
                                contentId={post.id} 
                                contentType="study" 
                                reactions={post.reactions} 
                                reactedBy={post.reactedBy} 
                                currentUserId={currentUserId}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowComments(!showComments)}
                                className={`p-2.5 rounded-xl transition-all ${showComments ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-100'}`}
                                title="Comments"
                            >
                                <MessageSquare size={18} />
                            </button>
                            <a 
                                href={post.fileUrl || post.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:shadow-lg transition-all"
                                title={post.fileUrl ? `Download: ${post.fileName || 'file'}` : "Open link"}
                            >
                                {post.fileUrl ? <Download size={18} /> : <ExternalLink size={18} />}
                            </a>
                            {(currentUserId === post.authorId || isAdmin) && onEdit && (
                                <button
                                    onClick={() => onEdit(post)}
                                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:shadow-lg transition-all"
                                    title="Edit Post"
                                >
                                    <Pencil size={18} />
                                </button>
                            )}
                            {(currentUserId === post.authorId || isAdmin) && onDelete && (
                                <button
                                    onClick={() => onDelete(post.id)}
                                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white hover:shadow-lg transition-all"
                                    title="Delete Post"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gray-50/50 dark:bg-black/20 rounded-2xl"
                            >
                                <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <CommentSystem 
                                        contentId={post.id} 
                                        contentType="study" 
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Context Badge */}
            {(post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only') && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Campus Only
                </div>
            )}
        </motion.div>
    );
}
