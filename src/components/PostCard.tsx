"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, ExternalLink, School, MapPin, 
    MoreHorizontal, Edit2, Trash2, MessageCircle, 
    Share2, Bookmark, Lock, LogIn
} from "lucide-react";
import Link from "next/link";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import { subscribeComments } from "@/lib/firestore";
import { ExpandableText, TimeAgo } from "@/components/Social/SocialUtils";
import ShareModal from "@/components/ShareModal";
import { isContentRestrictedForUser } from "@/lib/permissions";

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
            href={post.shareLink}
            target="_blank"
            rel="noopener noreferrer"
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

export default function PostCard({
    post, profile, onEdit, onDelete, onApprove, onReject,
    onTagClick, isSaved, onSave, hideManageOptions
}: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [previewComments, setPreviewComments] = useState<any[]>([]);
    const searchParams = useSearchParams();

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
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors duration-500">
                        {post.eventName}
                    </h2>
                </div>

                {isRestricted ? (
                    <div className="mt-4 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 text-white border border-white/10 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center gap-3">
                        {/* Ambient glow */}
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
                ) : (
                    <>
                        <ExpandableText text={post.description || ""} onTagClick={onTagClick || undefined} />
                        
                        {!post.thumbnailUrl && <LinkPreviewCard post={post} />}
                        {post.thumbnailUrl && (
                            <div className="relative group/media-link">
                                 {post.shareLink ? (
                                    <a 
                                        href={post.shareLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="block rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner mt-4 group/img relative"
                                    >
                                        <img 
                                            src={post.thumbnailUrl} 
                                            alt={post.eventName}
                                            className="w-full h-auto object-cover group-hover/img:scale-[1.02] transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 text-white transform translate-y-4 group-hover/img:translate-y-0 transition-transform duration-500">
                                                <ExternalLink size={24} />
                                            </div>
                                            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover/img:opacity-100 translate-y-4 group-hover/img:translate-y-0 transition-all duration-500 delay-75">Visit Link</span>
                                        </div>
                                    </a>
                                 ) : (
                                    <div className="rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner mt-4 group/img">
                                        <img 
                                            src={post.thumbnailUrl} 
                                            alt={post.eventName}
                                            className="w-full h-auto object-cover group-hover/img:scale-[1.02] transition-transform duration-700"
                                        />
                                    </div>
                                 )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Interactions Bar */}
            {!isRestricted && (
                <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <ReactionBtn 
                            contentId={post.id} 
                            contentType="post" 
                            reactions={post.reactions} 
                            reactedBy={post.reactedBy}
                            currentUserId={profile?.uid}
                        />
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center gap-2 group/btn transition-colors ${showComments ? 'text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <div className={`p-2 rounded-xl transition-colors ${showComments ? 'bg-primary/10' : 'bg-gray-50 dark:bg-white/5 group-hover/btn:bg-primary/10'}`}>
                                <MessageCircle size={18} className={showComments ? 'fill-primary' : 'group-hover/btn:fill-primary/20'} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{post.commentsCount || 0}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => onSave?.(post.id)}
                            className={`p-2 rounded-xl transition-all border hover:scale-105 active:scale-95 duration-200 ${
                                isSaved 
                                    ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                                    : "bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/10"
                            }`}
                            title={isSaved ? "Remove Bookmark" : "Bookmark Post"}
                        >
                            <Bookmark size={18} className={isSaved ? "fill-primary" : ""} />
                        </button>
                        <button 
                            onClick={() => setIsShareOpen(true)}
                            className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/10 hover:scale-105 active:scale-95 duration-200"
                            title="Share Post"
                        >
                            <Share2 size={18} />
                        </button>
                        {post.shareLink && (
                            <a 
                                href={post.shareLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 duration-200"
                                title="Visit External Link"
                            >
                                <ExternalLink size={18} />
                            </a>
                        )}
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
        </motion.div>
    );
}
