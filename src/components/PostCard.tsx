"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, ExternalLink, Globe, Lock, School, MapPin, 
    MoreHorizontal, Edit2, Trash2, Heart, MessageCircle, 
    Share2, Bookmark, CheckCircle2, XCircle, Loader2,
    ImageIcon
} from "lucide-react";
import Link from "next/link";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentSystem } from "@/components/Social/CommentSystem";
import { RichText, ExpandableText, timeAgo } from "@/components/Social/SocialUtils";

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
    // ... other edit states
    editEventName?: string;
    setEditEventName?: (v: string) => void;
    editDescription?: string;
    setEditDescription?: (v: string) => void;
    editShareLink?: string;
    setEditShareLink?: (v: string) => void;
    editType?: string;
    setEditType?: (v: string) => void;
    editVisibility?: string;
    setEditVisibility?: (v: string) => void;
    editThumbnailUrl?: string | null;
    setEditThumbnailUrl?: (v: string | null) => void;
    editThumbnailFile?: File | null;
    setEditThumbnailFile?: (v: File | null) => void;
    editThumbnailPreview?: string | null;
    setEditThumbnailPreview?: (v: string | null) => void;
    onSaveEdit?: () => void;
    onCancelEdit?: () => void;
    hideManageOptions?: boolean;
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
    editingId, isSaving, autoFocus, onTagClick,
    editEventName, setEditEventName,
    editDescription, setEditDescription,
    editShareLink, setEditShareLink,
    editType, setEditType,
    editVisibility, setEditVisibility,
    editThumbnailUrl, setEditThumbnailUrl,
    editThumbnailFile, setEditThumbnailFile,
    editThumbnailPreview, setEditThumbnailPreview,
    onSaveEdit, onCancelEdit, hideManageOptions
}: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const isOwner = profile?.uid === post.creatorId;
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";
    const canManage = !hideManageOptions && (isOwner || isAdmin || (profile?.role === "manager" && profile?.collegeId === post.collegeId));
    
    const isEditing = editingId === post.id;

    if (isEditing) {
        return (
            <motion.div layout className="bg-white dark:bg-[#1a1b23] rounded-[2.5rem] p-8 border-2 border-primary/20 shadow-2xl shadow-primary/5 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Edit Post</h3>
                    <div className="flex gap-2">
                         <button onClick={onCancelEdit} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><XCircle size={20} className="text-gray-400" /></button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Name</label>
                        <input 
                            autoFocus={autoFocus}
                            value={editEventName}
                            onChange={(e) => setEditEventName?.(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                        <textarea 
                            value={editDescription}
                            onChange={(e) => setEditDescription?.(e.target.value)}
                            rows={4}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1.5">
                            <ExternalLink size={10} className="text-primary" /> Share Link (Optional)
                        </label>
                        <input 
                            type="url"
                            value={editShareLink}
                            onChange={(e) => setEditShareLink?.(e.target.value)}
                            placeholder="https://facebook.com/groups/..."
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Type</label>
                            <select 
                                value={editType}
                                onChange={(e) => setEditType?.(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                            >
                                <option value="event">Global Event</option>
                                <option value="club">Club Thread</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Visibility</label>
                            <select 
                                value={editVisibility}
                                onChange={(e) => setEditVisibility?.(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                            >
                                <option value="public">🌍 Public (Global)</option>
                                <option value="campus">🏫 Campus (Local)</option>
                                <option value="private">🔒 Private (Me)</option>
                            </select>
                        </div>
                    </div>

                    {/* Media Edit */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Update Media / Image</label>
                        <div className="relative group/media min-h-[160px] rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-all flex items-center justify-center overflow-hidden bg-gray-50/50 dark:bg-white/5">
                            {editThumbnailPreview ? (
                                <div className="relative w-full h-full group">
                                    <img src={editThumbnailPreview} className="w-full h-auto max-h-[300px] object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                        >
                                            Replace
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditThumbnailFile?.(null);
                                                setEditThumbnailPreview?.(null);
                                            }}
                                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors"
                                >
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                        <ImageIcon size={24} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Click to Upload Media</span>
                                </button>
                            )}
                            <input 
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setEditThumbnailFile?.(file);
                                        setEditThumbnailPreview?.(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onCancelEdit} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button 
                        onClick={onSaveEdit}
                        disabled={isSaving}
                        className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                        Save Changes
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white dark:bg-[#1a1b23] rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 hover:border-primary/20 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-colors" />
            
            {/* Top Bar: Author & Meta */}
            <div className="flex items-start justify-between mb-6 relative z-50">
                <div className="flex items-center gap-4">
                    <Link href={`/profile/${post.creatorId}`} className="relative cursor-pointer group/author transition-transform active:scale-95">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-xl font-black text-gray-400 border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm shadow-black/5 group-hover/author:border-primary/50 transition-colors">
                            {post.createdBy?.avatar ? (
                                <img src={post.createdBy.avatar} className="w-full h-full object-cover" />
                            ) : (post.createdBy?.name?.charAt(0) || "?")}
                        </div>
                        {post.status === "pending" && (
                            <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-lg shadow-lg border-2 border-white dark:border-[#1a1b23] animate-pulse">
                                <Clock size={10} />
                            </div>
                        )}
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href={`/profile/${post.creatorId}`} className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight hover:text-primary transition-colors">
                                {post.createdBy?.name}
                            </Link>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${roleColors[post.createdBy?.role] || 'bg-gray-100 text-gray-500'}`}>
                                {roleLabels[post.createdBy?.role] || post.createdBy?.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><MapPin size={8} /> {post.collegeName}</span>
                            <span>•</span>
                            <span>{timeAgo(post.timestamp)}</span>
                            {post.visibility === "campus" && (
                                <span className="flex items-center gap-1 text-primary"><School size={8} /> Campus Only</span>
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
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors duration-500">
                        {post.eventName}
                    </h2>
                </div>

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
            </div>

            {/* Interactions Bar */}
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
                    <button className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/10">
                        <Bookmark size={18} />
                    </button>
                    <button className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/10">
                        <Share2 size={18} />
                    </button>
                    <a 
                        href={post.shareLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                            <CommentSystem 
                                contentId={post.id} 
                                contentType="post" 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
