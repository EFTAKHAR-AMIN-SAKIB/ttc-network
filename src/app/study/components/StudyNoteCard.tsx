"use client";

import { useState, useEffect } from "react";
import { BookOpen, Video, ExternalLink, GraduationCap, Globe, Clock, Lock, MessageSquare, Pencil, Trash2, Download, Bookmark, Share2, Loader2, Eye, FileText } from "lucide-react";
import { type FirestoreStudyPost, incrementStudyPostViewCount, incrementStudyPostDownloadCount } from "@/lib/firestore";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import { ExpandableText } from "@/components/Social/SocialUtils";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import Link from "next/link";
import StudyPreviewModal from "./StudyPreviewModal";

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
    const [showPreview, setShowPreview] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { isVerified, requireVerification } = useVerifiedAccess();
    const showEdit = canEdit !== undefined ? canEdit : (currentUserId === post.authorId || isAdmin);
    const showDelete = canDelete !== undefined ? canDelete : (currentUserId === post.authorId || isAdmin);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!requireVerification("open study resources")) return;

        const resourceUrl = post.fileUrl || post.link;
        if (!resourceUrl) return;

        // Count as both a view and a download (dedup is handled inside each function)
        incrementStudyPostViewCount(post.id);
        incrementStudyPostDownloadCount(post.id);

        if (post.fileUrl) {
            setIsDownloading(true);
            const downloadUrl = `/api/study/download?url=${encodeURIComponent(post.fileUrl)}&filename=${encodeURIComponent(post.fileName || post.title)}`;
            window.location.href = downloadUrl;
            setTimeout(() => {
                setIsDownloading(false);
            }, 1500);
        } else if (post.link) {
            window.open(post.link, "_blank", "noopener,noreferrer");
        }
    };
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
            const targetId = params.get("study") || params.get("post") || params.get("commentPostId");
            const hasCommentParam = params.get("comment");
            const hasCommentHash = window.location.hash.startsWith("#comment-");
            if (targetId === post.id && (hasCommentParam || hasCommentHash || params.get("commentPostId"))) {
                setShowComments(true);
            }
        }
    }, [post.id]);

    const isCampusOnly = post.privacy === 'campus' || post.privacy === 'college_only' || post.visibility === 'campus' || post.visibility === 'college_only';

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm shadow-navy-900/5 hover:shadow-xl transition-all duration-300 ${showComments ? 'ring-2 ring-primary/20 scale-[1.005]' : 'hover:-translate-y-1'}`}
        >
            <div className="p-4 sm:p-7">
                {/* Header Metadata Row */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${color}`}>
                            <Icon size={12} /> {label}
                        </div>
                        {post.category && (
                            <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
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
                                {!['notes', 'suggestion', 'books', 'question', 'other'].includes(post.category) && `🏷️ ${post.category}`}
                            </div>
                        )}
                        {isCampusOnly && (
                            <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-1">
                                <Lock size={10} /> Campus
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-gray-400">
                            <Clock size={12} className="text-primary" /> 
                            <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "recently"}</span>
                        </div>
                        {(post.viewCount !== undefined && post.viewCount > 0) && (
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-gray-400" title={`${post.viewCount} views`}>
                                <Eye size={12} className="text-emerald-500" />
                                <span>{post.viewCount >= 1000 ? `${(post.viewCount / 1000).toFixed(1)}k` : post.viewCount}</span>
                            </div>
                        )}
                        
                        {(showEdit || showDelete) && (
                            <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-2">
                                {showEdit && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(post);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary/10 dark:bg-gray-800/50 text-gray-400 hover:text-primary transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800"
                                        title="Edit Post"
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
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800"
                                        title="Delete Post"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-black text-navy-900 dark:text-white mb-2 line-clamp-2 leading-snug tracking-tight group-hover:text-primary transition-colors">
                    {post.title}
                </h3>
                {post.content && (
                    <div className="mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium [&_button]:text-xs">
                        <ExpandableText text={post.content} limit={110} />
                    </div>
                )}

                {/* Thumbnail Display (If has an image) */}
                {post.thumbnailUrl && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (requireVerification("open study resources")) {
                                setShowPreview(true);
                                incrementStudyPostViewCount(post.id);
                            }
                        }}
                        className="w-full text-left block mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group/thumb focus:outline-none"
                    >
                        <div className="relative aspect-video">
                            <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover group-hover/thumb:scale-[1.02] transition-transform duration-500" />
                            {!isVerified ? (
                                <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-[3px] flex flex-col items-center justify-center text-white p-4 transition-all duration-300">
                                    <Lock className="w-6 h-6 text-amber-400 mb-1.5 animate-bounce" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Verify to Access</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/25 transition-colors flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/90 text-primary flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all shadow-md transform scale-90 group-hover/thumb:scale-100">
                                        {post.fileUrl ? <Eye size={18} /> : <ExternalLink size={18} />}
                                    </div>
                                </div>
                            )}
                        </div>
                    </button>
                )}

                {/* Document Preview Card (If has fileUrl and no thumbnail) */}
                {post.fileUrl && !post.thumbnailUrl && (
                    <div 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (requireVerification("open study resources")) {
                                setShowPreview(true);
                                incrementStudyPostViewCount(post.id);
                            }
                        }}
                        className="mb-4 p-3 sm:p-3.5 rounded-xl bg-gray-50/80 dark:bg-black/20 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3 group/doc cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover/doc:scale-105 transition-transform">
                                <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover/doc:text-primary transition-colors">
                                    {post.fileName || post.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-gray-400">
                                    <span className="uppercase font-black text-primary">
                                        {post.fileName?.split('.').pop()?.toUpperCase() || "DOC"}
                                    </span>
                                    {post.fileSize ? <span>• {(post.fileSize / (1024 * 1024)).toFixed(2)} MB</span> : null}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-primary px-2.5 py-1 rounded-lg bg-primary/10 group-hover/doc:bg-primary group-hover/doc:text-white transition-all flex items-center gap-1">
                                <Eye size={11} /> Read
                            </span>
                        </div>
                    </div>
                )}

                {/* Author Info */}
                <Link 
                    href={`/profile/${post.authorId}`}
                    className="inline-flex items-center gap-2.5 mb-5 group/author cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                >
                    <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center justify-center overflow-hidden group-hover/author:ring-2 group-hover/author:ring-primary/30 transition-all">
                        {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                            <GraduationCap className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-navy-900 dark:text-gray-100 truncate group-hover/author:text-primary transition-colors">{post.authorName}</p>
                        <p className="text-[9px] font-semibold text-gray-400 truncate flex items-center gap-1">
                            {isCampusOnly ? <Lock size={9} className="text-amber-500" /> : <Globe size={9} className="text-blue-500" />}
                            {post.collegeName?.split(',')[0]}
                        </p>
                    </div>
                </Link>

                {/* Main Actions Layer */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-3.5 border-t border-gray-100 dark:border-gray-800">
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
                                    className={`p-2 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        isSaved 
                                            ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                                            : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent"
                                    }`}
                                    title={isSaved ? "Remove Bookmark" : "Bookmark Material"}
                                >
                                    <Bookmark size={16} className={isSaved ? "fill-primary" : ""} />
                                </button>
                            )}
                            {onShare && (
                                <button 
                                    onClick={() => onShare(post)}
                                    className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary border border-transparent hover:scale-105 active:scale-95 transition-all duration-200"
                                    title="Share Material"
                                >
                                    <Share2 size={16} />
                                </button>
                            )}
                            <button 
                                onClick={() => setShowComments(!showComments)}
                                className={`flex items-center gap-1.5 group/btn transition-colors ${showComments ? 'text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                title="Comments"
                            >
                                <div className={`p-2 rounded-xl transition-colors ${showComments ? 'bg-primary/10' : 'bg-gray-50 dark:bg-white/5 group-hover/btn:bg-primary/10'}`}>
                                    <MessageSquare size={16} className={showComments ? 'fill-primary' : 'group-hover/btn:fill-primary/20'} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider">{post.commentsCount || 0}</span>
                            </button>

                            {/* Download / Open Action Button */}
                            <button 
                                type="button"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="h-9 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all bg-primary text-white shadow-sm shadow-primary/25 hover:brightness-105 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                title={post.fileUrl ? `Download: ${post.fileName || 'file'}` : "Open link"}
                            >
                                {!isVerified ? (
                                    <Lock size={14} className="text-amber-300" />
                                ) : isDownloading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : post.fileUrl ? (
                                    <>
                                        <Download size={14} />
                                        <span className="hidden xs:inline">Get</span>
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink size={14} />
                                        <span className="hidden xs:inline">Open</span>
                                    </>
                                )}
                            </button>
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

                    {/* Study Preview Modal */}
                    <StudyPreviewModal 
                        isOpen={showPreview}
                        onClose={() => setShowPreview(false)}
                        post={post}
                    />
                </div>
            </div>
        </motion.div>
    );
}
