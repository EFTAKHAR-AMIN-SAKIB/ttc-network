"use client";

import { useState, useEffect } from "react";
import { BookOpen, Video, ExternalLink, GraduationCap, Globe, Clock, Lock, MessageCircle, Pencil, Trash2, Download, Bookmark, Share2, Loader2, Eye, FileText } from "lucide-react";
import { type FirestoreStudyPost, incrementStudyPostViewCount, incrementStudyPostDownloadCount } from "@/lib/firestore";
import { ReactionBtn, ReactionSummary } from "@/components/Social/ReactionSystem";
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
    onShare?: (post: FirestoreStudyPost & { id: string }) => void;
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
            className={`group relative bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm shadow-navy-900/5 hover:shadow-xl transition-all duration-300 h-full flex flex-col ${showComments ? 'ring-2 ring-primary/20 scale-[1.005]' : 'hover:-translate-y-1'}`}
        >
            <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0">
                {/* Header Metadata Row */}
                <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${color}`}>
                            <Icon size={12} /> {label}
                        </div>
                        {post.category && (
                            <div className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${
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
                            <div className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-1">
                                <Lock size={10} /> Campus
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <Clock size={11} className="text-primary/70 shrink-0" /> 
                            <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "recently"}</span>
                        </div>
                        {(post.viewCount !== undefined && post.viewCount > 0) && (
                            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400" title={`${post.viewCount} views`}>
                                <Eye size={11} className="text-emerald-500 shrink-0" />
                                <span>{post.viewCount >= 1000 ? `${(post.viewCount / 1000).toFixed(1)}k` : post.viewCount}</span>
                            </div>
                        )}
                        
                        {(showEdit || showDelete) && (
                            <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-1.5 sm:pl-2">
                                {showEdit && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(post);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-primary/10 dark:bg-gray-800/50 text-gray-400 hover:text-primary transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95"
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
                                        className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800/50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95"
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
                <h3 className="text-base sm:text-lg font-black text-navy-900 dark:text-white mb-2 line-clamp-2 leading-snug tracking-tight group-hover:text-primary transition-colors min-h-[2.5rem] sm:min-h-[2.85rem] flex items-start">
                    {post.title}
                </h3>
                {post.content && (
                    <div className="mb-3.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium [&_button]:text-xs line-clamp-2 sm:line-clamp-3">
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
                        className="w-full text-left block mb-3.5 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group/thumb focus:outline-none"
                    >
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800/50">
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
                        className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-gray-50/80 dark:bg-black/20 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3 group/doc cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
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

                {/* External Link Card (If has link and no fileUrl and no thumbnail) */}
                {post.link && !post.fileUrl && !post.thumbnailUrl && (
                    <a 
                        href={post.link} 
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            if (!requireVerification("open study resources")) {
                                e.preventDefault();
                            } else {
                                incrementStudyPostViewCount(post.id);
                            }
                        }}
                        className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-gray-50/80 dark:bg-black/20 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3 group/link cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-50/10 transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover/link:scale-105 transition-transform">
                                <ExternalLink size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover/link:text-emerald-500 transition-colors">
                                    {post.title || post.link}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-gray-400">
                                    <span className="uppercase font-black text-emerald-500">
                                        LINK
                                    </span>
                                    <span className="truncate max-w-[150px]">{post.link.replace(/^https?:\/\//, '')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 group-hover/link:bg-emerald-500 group-hover/link:text-white transition-all flex items-center gap-1">
                                <ExternalLink size={11} /> Open
                            </span>
                        </div>
                    </a>
                )}

                {/* Author Info & Resource Access Action */}
                <div className="flex items-center justify-between gap-3 mb-3.5 pt-1">
                    <Link 
                        href={`/profile/${post.authorId}`}
                        className="inline-flex items-center gap-2.5 group/author cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all min-w-0"
                    >
                        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center justify-center overflow-hidden group-hover/author:ring-2 group-hover/author:ring-primary/30 transition-all shrink-0">
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                            ) : (
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-navy-900 dark:text-gray-100 truncate group-hover/author:text-primary transition-colors">{post.authorName}</p>
                            <p className="text-[9px] font-semibold text-gray-400 truncate flex items-center gap-1">
                                {isCampusOnly ? <Lock size={9} className="text-amber-500 shrink-0" /> : <Globe size={9} className="text-blue-500 shrink-0" />}
                                <span className="truncate">{post.collegeName?.split(',')[0]}</span>
                            </p>
                        </div>
                    </Link>

                    {/* Quick Download / Open Resource CTA */}
                    {(post.fileUrl || post.link) && (
                        <button 
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="h-8 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all bg-primary/10 hover:bg-primary text-primary hover:text-white dark:bg-primary/20 dark:hover:bg-primary dark:text-primary-light font-black uppercase text-[10px] tracking-wider active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 border border-primary/20 hover:border-transparent shadow-xs"
                            title={post.fileUrl ? `Download: ${post.fileName || 'file'}` : "Open link"}
                        >
                            {!isVerified ? (
                                <Lock size={13} className="text-amber-500" />
                            ) : isDownloading ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : post.fileUrl ? (
                                <>
                                    <Download size={13} />
                                    <span>Get</span>
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={13} />
                                    <span>Open</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Main Actions Layer (Docked Facebook Layout) */}
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
                            title="Comment on material"
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
                                title="Share material"
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
                                title={isSaved ? "Remove Bookmark" : "Save Material"}
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

                {/* Study Preview Modal */}
                <StudyPreviewModal 
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    post={post}
                />
            </div>
        </motion.div>
    );
}
