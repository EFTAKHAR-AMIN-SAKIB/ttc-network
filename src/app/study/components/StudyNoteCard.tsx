"use client";

import { useState, useEffect } from "react";
import { BookOpen, Video, ExternalLink, GraduationCap, Globe, Clock, Lock, MessageSquare, Pencil, Trash2, Download, Bookmark, Share2 } from "lucide-react";
import { type FirestoreStudyPost } from "@/lib/firestore";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import Link from "next/link";

interface StudyNoteCardProps {
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

export default function StudyNoteCard({ post, currentUserId, isAdmin, onEdit, onDelete, isSaved, onSave, onShare, canEdit, canDelete }: StudyNoteCardProps) {
    const [showComments, setShowComments] = useState(false);
    const { isVerified, requireVerification } = useVerifiedAccess();
    const showEdit = canEdit !== undefined ? canEdit : (currentUserId === post.authorId || isAdmin);
    const showDelete = canDelete !== undefined ? canDelete : (currentUserId === post.authorId || isAdmin);
    const typeIcons = {
        doc: { icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", label: "Document" },
        video: { icon: Video, color: "text-red-500 bg-red-50 dark:bg-red-900/20", label: "Video" },
        link: { icon: ExternalLink, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", label: "Link" }
    };

    const type = post.materialType || "link";
    const { icon: Icon, color, label } = typeIcons[type as keyof typeof typeIcons];

    const currentReactionList = (post.reactedBy?.inspired || []) as string[];
    const isAlreadyFresh = currentUserId ? currentReactionList.includes(currentUserId) : false;
    const isNoThumbnail = !post.thumbnailUrl;

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
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl shadow-navy-900/5 hover:shadow-2xl transition-all duration-500 ${showComments ? 'ring-2 ring-primary/20 scale-[1.01]' : 'hover:-translate-y-2'}`}
        >
            <div className="p-5 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
                            <Icon size={14} /> {label}
                        </div>
                        {post.category && (
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                post.category === 'notes' ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30' :
                                post.category === 'suggestion' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' :
                                post.category === 'books' ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' :
                                post.category === 'question' ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30' :
                                'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                            }`}>
                                {post.category === 'notes' && '📝 Notes'}
                                {post.category === 'suggestion' && '💡 Suggestion'}
                                {post.category === 'books' && '📚 Books'}
                                {post.category === 'question' && '❓ Questions'}
                                {post.category === 'other' && '📁 Other'}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <Clock size={14} className="text-primary" /> 
                            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "recently"}
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
                                        title="Edit Post"
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
                                        title="Delete Post"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
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
                        onClick={(e) => {
                            if (!requireVerification("open study resources")) {
                                e.preventDefault();
                            }
                        }}
                        className="block mb-6 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all group/thumb"
                    >
                        <div className="relative aspect-video">
                            <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover/thumb:scale-[1.03] transition-transform duration-500" />
                            {!isVerified ? (
                                <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-[3px] flex flex-col items-center justify-center text-white p-4 transition-all duration-300">
                                    <Lock className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Verify to Access</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                                    {post.fileUrl ? (
                                        <Download className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" size={24} />
                                    ) : (
                                        <ExternalLink className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" size={24} />
                                    )}
                                </div>
                            )}
                        </div>
                    </a>
                )}

                {/* Author */}
                <Link 
                    href={`/profile/${post.authorId}`}
                    className="inline-flex items-center gap-3 mb-8 group/author cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-sm flex items-center justify-center overflow-hidden rotate-3 group-hover:rotate-0 group-hover/author:ring-2 group-hover/author:ring-primary/30 transition-all duration-300">
                        {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                            <GraduationCap className="w-6 h-6 text-gray-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-navy-900 dark:text-gray-100 truncate group-hover/author:text-primary transition-colors">{post.authorName}</p>
                        <p className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-1">
                            {(post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only') ? <Lock size={10} className="text-amber-500" /> : <Globe size={10} className="text-blue-500" />}
                            {post.collegeName?.split(',')[0]}
                        </p>
                    </div>
                </Link>

                {/* Main Actions Layer */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-5 border-t border-gray-50 dark:border-gray-800">
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <ReactionBtn 
                                contentId={post.id} 
                                contentType="study" 
                                reactions={post.reactions} 
                                reactedBy={post.reactedBy} 
                                currentUserId={currentUserId}
                            />
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {onSave && (
                                <button 
                                    onClick={() => onSave(post.id)}
                                    className={`p-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        isSaved 
                                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                                            : "text-gray-400 hover:bg-gray-100 border-transparent hover:border-primary/10"
                                    }`}
                                    title={isSaved ? "Remove Bookmark" : "Bookmark Material"}
                                >
                                    <Bookmark size={18} className={isSaved ? "fill-primary" : ""} />
                                </button>
                            )}
                            {onShare && (
                                <button 
                                    onClick={() => onShare(post)}
                                    className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-primary border border-transparent hover:border-primary/10 hover:scale-105 active:scale-95 transition-all duration-200"
                                    title="Share Material"
                                >
                                    <Share2 size={18} />
                                </button>
                            )}
                            <button 
                                onClick={() => setShowComments(!showComments)}
                                className={`flex items-center gap-2 group/btn transition-colors ${showComments ? 'text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                title="Comments"
                            >
                                <div className={`p-2 rounded-xl transition-colors ${showComments ? 'bg-primary/10' : 'bg-gray-50 dark:bg-white/5 group-hover/btn:bg-primary/10'}`}>
                                    <MessageSquare size={18} className={showComments ? 'fill-primary' : 'group-hover/btn:fill-primary/20'} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{post.commentsCount || 0}</span>
                            </button>
                            <motion.a 
                                href={post.fileUrl || post.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    if (!requireVerification("open study resources")) {
                                        e.preventDefault();
                                    }
                                }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    isNoThumbnail 
                                        ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/95" 
                                        : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:bg-primary hover:text-white hover:shadow-lg"
                                }`}
                                title={post.fileUrl ? `Download: ${post.fileName || 'file'}` : "Open link"}
                                animate={isNoThumbnail && isVerified ? {
                                    scale: [1, 1.08, 1],
                                    boxShadow: [
                                        "0 4px 6px -1px rgba(26, 86, 219, 0.2), 0 2px 4px -2px rgba(26, 86, 219, 0.2)",
                                        "0 0 0 6px rgba(26, 86, 219, 0.4)",
                                        "0 4px 6px -1px rgba(26, 86, 219, 0.2), 0 2px 4px -2px rgba(26, 86, 219, 0.2)"
                                    ]
                                } : {}}
                                transition={isNoThumbnail ? {
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                } : {}}
                            >
                                {!isVerified ? (
                                    <Lock size={18} className="text-amber-500" />
                                ) : post.fileUrl ? (
                                    <Download size={18} />
                                ) : (
                                    <ExternalLink size={18} />
                                )}
                            </motion.a>

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
