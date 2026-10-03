"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Download, 
    Share2, Bookmark, MessageCircle, ExternalLink,
    PanelRightClose, PanelRightOpen, MapPin, Users,
    ChevronUp, ChevronLeft, ChevronRight,
    Send, Reply, Play
} from "lucide-react";
import Link from "next/link";
import { ReactionBtn, ReactionSummary } from "@/components/Social/ReactionSystem";
import { CommentItem } from "@/components/Social/CommentSystem";
import { MentionDropdown, useMentionAutosuggest } from "@/components/Social/MentionDropdown";
import { RichText, TimeAgo } from "@/components/Social/SocialUtils";
import SafeAvatar from "@/components/SafeAvatar";
import ShareModal from "@/components/ShareModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { getDb } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { subscribeComments, addComment, toggleSavePost, type PostMediaItem, type FirestoreComment } from "@/lib/firestore";
import { formatExternalUrl } from "@/lib/url-utils";

interface PostMediaLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    src?: string | null;
    media?: PostMediaItem[];
    initialIndex?: number;
    alt?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: any;
    contentType?: "post" | "groupPost";
    author: {
        name: string;
        avatar?: string | null;
        role?: string;
        uid?: string;
        collegeName?: string;
        groupName?: string;
        groupId?: string;
        clubName?: string;
        visibility?: string;
        isAnonymous?: boolean;
    };
    isSaved?: boolean;
    onSave?: () => void;
    onTagClick?: (tag: string) => void;
}

const roleColors: Record<string, string> = {
    student: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    teacher: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    manager: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
};

export default function PostMediaLightbox({
    isOpen,
    onClose,
    src,
    media,
    initialIndex = 0,
    alt,
    post,
    contentType = "post",
    author,
    isSaved: initialIsSaved,
    onSave,
    onTagClick,
}: PostMediaLightboxProps) {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Portal mounting check
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Resolve unified list of media items
    const mediaItems: PostMediaItem[] = useMemo(() => {
        if (media && media.length > 0) return media;
        if (Array.isArray(post?.media) && post.media.length > 0) {
            return post.media.map((m: PostMediaItem | string) => {
                if (typeof m === "string") {
                    const isVid = /\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(m) || m.includes("/video/upload/");
                    return { url: m, type: isVid ? "video" : "image" };
                }
                return {
                    url: m.url,
                    type: m.type || (/\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(m.url) ? "video" : "image"),
                    name: m.name,
                    thumbnail: m.thumbnail,
                };
            });
        }
        const single = src || post?.thumbnailUrl || post?.imageUrl;
        if (single) {
            const isVid = /\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(single) || single.includes("/video/upload/");
            return [{ url: single, type: isVid ? "video" : "image" }];
        }
        return [];
    }, [media, post?.media, src, post?.thumbnailUrl, post?.imageUrl]);

    // Active media index
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

    // Sync initialIndex when opening
    useEffect(() => {
        if (isOpen && initialIndex !== undefined && initialIndex >= 0 && initialIndex < mediaItems.length) {
            setCurrentIndex(initialIndex);
        } else if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen, initialIndex, mediaItems.length]);

    const currentMedia = mediaItems[currentIndex] || mediaItems[0];
    const isVideo = currentMedia?.type === "video";

    // Zoom & Pan state (for images)
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // UI state
    const [showSidebar, setShowSidebar] = useState(true);
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isSavedLocally, setIsSavedLocally] = useState(initialIsSaved || false);
    const [isSaving, setIsSaving] = useState(false);

    // Live post synchronization
    const [livePost, setLivePost] = useState(post);

    // Comments state
    const [comments, setComments] = useState<(FirestoreComment & { id: string })[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [replyTo, setReplyTo] = useState<{ userName: string; parentId: string } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const commentsContainerRef = useRef<HTMLDivElement>(null);

    // Mention suggestions for comment input
    const mention = useMentionAutosuggest({
        value: commentText,
        setValue: setCommentText,
        inputRef: commentInputRef,
        groupId: author.groupId || post?.groupId,
    });

    // Reset zoom and view state on open or media change
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setOffset({ x: 0, y: 0 });
            setMobileSheetOpen(false);
            setShowSidebar(true);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    useEffect(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [currentIndex]);

    // Keep initial saved state in sync
    useEffect(() => {
        if (initialIsSaved !== undefined) {
            setIsSavedLocally(initialIsSaved);
        }
    }, [initialIsSaved]);

    // Live post snapshot listener
    useEffect(() => {
        if (!isOpen || !post?.id) return;
        setLivePost(post);
        try {
            const db = getDb();
            const collectionName = contentType === "groupPost" ? "groupPosts" : "posts";
            const unsub = onSnapshot(doc(db, collectionName, post.id), (snap) => {
                if (snap.exists()) {
                    setLivePost((prev: Record<string, unknown>) => ({ ...prev, ...snap.data(), id: snap.id }));
                }
            }, (err) => console.warn("Live post snapshot warning:", err));
            return () => unsub();
        } catch (err) {
            console.warn("Failed to listen to live post:", err);
        }
    }, [isOpen, post?.id, contentType]);

    // Live comments listener
    useEffect(() => {
        if (!isOpen || !post?.id) return;
        return subscribeComments(post.id, (allComments) => {
            setComments(allComments);
        });
    }, [isOpen, post?.id]);

    // Navigation callbacks
    const handlePrev = useCallback(() => {
        if (mediaItems.length <= 1) return;
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [mediaItems.length]);

    const handleNext = useCallback(() => {
        if (mediaItems.length <= 1) return;
        setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [mediaItems.length]);

    // Keyboard shortcuts (Escape, +, -, 0, ArrowLeft, ArrowRight)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") {
                if (mobileSheetOpen) {
                    setMobileSheetOpen(false);
                } else {
                    onClose();
                }
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "ArrowRight") {
                handleNext();
            } else if (e.key === "+" || e.key === "=") {
                if (!isVideo) handleZoomIn();
            } else if (e.key === "-" || e.key === "_") {
                if (!isVideo) handleZoomOut();
            } else if (e.key === "0") {
                if (!isVideo) handleReset();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, mobileSheetOpen, onClose, handlePrev, handleNext, isVideo]);

    // Zoom handlers
    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 5));
    const handleZoomOut = () => {
        setScale((prev) => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    };
    const handleReset = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // Mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (isVideo) return;
        e.preventDefault();
        const zoomFactor = 0.15;
        const direction = e.deltaY < 0 ? 1 : -1;
        setScale((prev) => {
            const next = Math.max(1, Math.min(prev + direction * zoomFactor, 5));
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    };

    // Pointer-down: drag panning when zoomed
    const handlePointerDown = (e: React.PointerEvent) => {
        if (isVideo || scale <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        if (containerRef.current) {
            containerRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isVideo || !isDragging || scale <= 1) return;
        e.preventDefault();
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        const baseWidth = imgRect.width / scale;
        const baseHeight = imgRect.height / scale;
        const scaledWidth = baseWidth * scale;
        const scaledHeight = baseHeight * scale;

        const maxOffsetX = scaledWidth > containerRect.width ? (scaledWidth - containerRect.width) / 2 : 0;
        const maxOffsetY = scaledHeight > containerRect.height ? (scaledHeight - containerRect.height) / 2 : 0;

        const targetX = e.clientX - dragStart.x;
        const targetY = e.clientY - dragStart.y;

        setOffset({
            x: Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX)),
            y: Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY)),
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            if (containerRef.current) {
                containerRef.current.releasePointerCapture(e.pointerId);
            }
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (isVideo) return;
        e.preventDefault();
        if (scale > 1) {
            handleReset();
        } else {
            setScale(2.5);
            setOffset({ x: 0, y: 0 });
        }
    };

    // Media download helper
    const handleDownload = async () => {
        if (!currentMedia?.url) return;
        try {
            const res = await fetch(currentMedia.url, { mode: "cors" });
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            const ext = isVideo ? ".mp4" : currentMedia.url.includes(".png") ? ".png" : ".jpg";
            a.download = `ttc-media-${post?.id || "media"}-${currentIndex + 1}${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            showToast(isVideo ? "Video downloaded" : "Image downloaded", "success");
        } catch {
            window.open(currentMedia.url, "_blank");
        }
    };

    // Save/Bookmark handler
    const handleToggleSave = async () => {
        if (!user) {
            showToast("Please sign in to save posts", "info");
            return;
        }
        if (onSave) {
            onSave();
            setIsSavedLocally(!isSavedLocally);
            return;
        }
        if (isSaving || !post?.id) return;
        setIsSaving(true);
        try {
            const saved = await toggleSavePost(user.uid, post.id);
            setIsSavedLocally(saved);
            showToast(saved ? "Post saved to your bookmarks" : "Post removed from bookmarks", "success");
        } catch (err) {
            console.error("Failed to save post:", err);
            showToast("Failed to update bookmark", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Submit new comment
    const handleCommentSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!requireVerification("post comments")) return;
        if (!user) {
            showToast("Please sign in to comment", "info");
            return;
        }
        if (!commentText.trim() || isSubmittingComment || !post?.id) return;

        setIsSubmittingComment(true);
        try {
            await addComment(post.id, commentText.trim(), replyTo?.parentId, contentType);
            setCommentText("");
            setReplyTo(null);
            showToast("Comment posted", "success");
            setTimeout(() => {
                if (commentsContainerRef.current) {
                    commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
                }
            }, 250);
        } catch (err) {
            console.error("Failed to post comment:", err);
            showToast("Failed to post comment", "error");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const rootComments = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
    const getReplies = useCallback((parentId: string) => comments.filter((c) => c.parentId === parentId), [comments]);

    const postContent = livePost?.description || livePost?.content || "";
    const postTitle = livePost?.eventName || "";
    const hasExternalLink = Boolean(livePost?.shareLink);

    if (!isOpen || !mounted || mediaItems.length === 0) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[150] flex flex-col lg:flex-row bg-[#0b0c10]/95 backdrop-blur-xl select-none overflow-hidden"
            >
                {/* ───────────────── LEFT / MAIN STAGE: MEDIA CANVAS ───────────────── */}
                <div className="relative flex-1 flex flex-col items-center justify-center min-w-0 min-h-0 h-full overflow-hidden bg-black/95">
                    {/* Top Floating Bar over Image/Video */}
                    <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
                        {/* Left: Close Button & Item Counter */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="pointer-events-auto p-2.5 sm:p-3 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-all border border-white/15 backdrop-blur-md shadow-2xl hover:scale-105"
                                title="Close (Esc)"
                            >
                                <X size={20} />
                            </button>

                            {mediaItems.length > 1 && (
                                <span className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-black/60 border border-white/15 text-white text-xs font-black tracking-wider backdrop-blur-md shadow-lg">
                                    {currentIndex + 1} / {mediaItems.length}
                                </span>
                            )}
                        </div>

                        {/* Top-Right Quick Actions */}
                        <div className="pointer-events-auto flex items-center gap-2">
                            {/* Toggle Sidebar (Desktop only) */}
                            <button
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="hidden lg:flex p-2.5 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-all border border-white/15 backdrop-blur-md shadow-2xl hover:scale-105"
                                title={showSidebar ? "Hide post details" : "Show post details"}
                            >
                                {showSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                            </button>

                            {/* Open Original */}
                            <button
                                onClick={() => window.open(currentMedia.url, "_blank")}
                                className="p-2.5 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-all border border-white/15 backdrop-blur-md shadow-2xl hover:scale-105"
                                title="Open in new tab"
                            >
                                <Maximize2 size={18} />
                            </button>

                            {/* Download */}
                            <button
                                onClick={handleDownload}
                                className="p-2.5 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-all border border-white/15 backdrop-blur-md shadow-2xl hover:scale-105"
                                title="Download media"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Previous Button (if multiple media) */}
                    {mediaItems.length > 1 && (
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 active:scale-90 text-white border border-white/15 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
                            title="Previous media (Left Arrow)"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Next Button (if multiple media) */}
                    {mediaItems.length > 1 && (
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 active:scale-90 text-white border border-white/15 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
                            title="Next media (Right Arrow)"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    {/* Interactive Zoomable Image or Video Player Container */}
                    <div
                        ref={containerRef}
                        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-default select-none p-4 pb-20 sm:pb-24 lg:p-8"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheel}
                        onDoubleClick={handleDoubleClick}
                    >
                        {isVideo ? (
                            <div className="relative max-w-full max-h-[80vh] sm:max-h-[85vh] flex items-center justify-center">
                                <video
                                    key={currentMedia.url}
                                    src={currentMedia.url}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="max-w-full max-h-[75vh] sm:max-h-[82vh] lg:max-h-[86vh] rounded-xl sm:rounded-2xl shadow-2xl bg-black border border-white/10"
                                />
                            </div>
                        ) : (
                            <motion.div
                                style={{
                                    x: offset.x,
                                    y: offset.y,
                                    scale: scale,
                                    cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                                }}
                                transition={
                                    isDragging
                                        ? { type: "tween", duration: 0 }
                                        : { type: "spring", damping: 25, stiffness: 220 }
                                }
                                className="relative max-w-full max-h-full flex items-center justify-center transition-transform"
                            >
                                <img
                                    ref={imgRef}
                                    src={currentMedia.url}
                                    alt={alt || "Post media"}
                                    className="max-w-full max-h-[75vh] sm:max-h-[82vh] lg:max-h-[88vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl pointer-events-none select-none transition-shadow"
                                    onLoad={() => {
                                        setScale(1);
                                        setOffset({ x: 0, y: 0 });
                                    }}
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Bottom Floating Controls: Zoom (for images) or Filmstrip (for multiple) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
                        {/* Filmstrip Thumbnails if multiple media */}
                        {mediaItems.length > 1 && (
                            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md shadow-2xl max-w-[85vw] overflow-x-auto no-scrollbar">
                                {mediaItems.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                                            currentIndex === idx
                                                ? "border-primary ring-2 ring-primary/40 scale-105"
                                                : "border-transparent opacity-60 hover:opacity-100"
                                        }`}
                                    >
                                        {item.type === "video" ? (
                                            <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white relative">
                                                <video src={item.url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <Play size={14} className="fill-white text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Zoom toolbar (images only) */}
                        {!isVideo && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 20, opacity: 0 }}
                                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-slate-950/80 border border-white/15 shadow-2xl flex items-center gap-3 sm:gap-4 text-white backdrop-blur-xl"
                            >
                                <button
                                    onClick={handleZoomOut}
                                    disabled={scale <= 1}
                                    className="p-1 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Zoom Out (-)"
                                >
                                    <ZoomOut size={16} />
                                </button>

                                <span className="text-[11px] sm:text-xs font-black min-w-[42px] text-center select-none text-gray-300">
                                    {Math.round(scale * 100)}%
                                </span>

                                <button
                                    onClick={handleZoomIn}
                                    disabled={scale >= 5}
                                    className="p-1 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Zoom In (+)"
                                >
                                    <ZoomIn size={16} />
                                </button>

                                <div className="w-[1px] h-3.5 bg-white/20" />

                                <button
                                    onClick={handleReset}
                                    className="p-1 hover:bg-white/15 rounded-lg transition-colors"
                                    title="Reset Zoom (0)"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Mobile Floating Bottom Bar */}
                    <div className="lg:hidden absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div
                            onClick={() => setMobileSheetOpen(true)}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl cursor-pointer active:scale-[0.99] transition-all"
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-gray-800">
                                    <SafeAvatar
                                        src={author.avatar || undefined}
                                        alt={author.name}
                                        sizeClassName="w-full h-full"
                                        textClassName="text-[10px] font-black"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-black text-white truncate">{author.name}</p>
                                        <span className="text-[9px] text-gray-300 font-bold shrink-0">• <TimeAgo ts={livePost?.timestamp || livePost?.createdAt} /></span>
                                    </div>
                                    <p className="text-[11px] text-gray-300 line-clamp-1 truncate font-medium">
                                        {postTitle ? `${postTitle} — ` : ""}{postContent || "View discussion & comments"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold">
                                    <MessageCircle size={13} />
                                    <span>{comments.length}</span>
                                </div>
                                <ChevronUp size={16} className="text-gray-300 animate-bounce" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ───────────────── RIGHT SIDEBAR: FACEBOOK POST DETAILS & COMMENTS (DESKTOP) ───────────────── */}
                <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ x: 420, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 420, opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 280 }}
                            className="hidden lg:flex flex-col w-[420px] xl:w-[460px] h-full bg-white dark:bg-[#18191a] border-l border-gray-200 dark:border-gray-800/80 shadow-2xl relative z-40 shrink-0 select-text"
                        >
                            {/* Sidebar Header: Author & Context */}
                            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#18191a]/80 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-3 min-w-0">
                                    {author.uid ? (
                                        <Link href={`/profile/${author.uid}`} className="shrink-0 group">
                                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:scale-105 transition-transform">
                                                <SafeAvatar
                                                    src={author.avatar || undefined}
                                                    alt={author.name}
                                                    sizeClassName="w-full h-full"
                                                    textClassName="text-sm font-black"
                                                />
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                                            <SafeAvatar
                                                src={author.avatar || undefined}
                                                alt={author.name}
                                                sizeClassName="w-full h-full"
                                                textClassName="text-sm font-black"
                                            />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {author.uid ? (
                                                <Link
                                                    href={`/profile/${author.uid}`}
                                                    className="text-sm font-black text-gray-900 dark:text-white hover:text-primary transition-colors truncate"
                                                >
                                                    {author.name}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-black text-gray-900 dark:text-white truncate">
                                                    {author.name}
                                                </span>
                                            )}

                                            {author.role && (
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${roleColors[author.role] || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                                                    {author.role}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            {author.groupName && (
                                                <span className="flex items-center gap-1 truncate text-primary">
                                                    <Users size={10} />
                                                    <span className="truncate max-w-[130px]">{author.groupName}</span>
                                                </span>
                                            )}
                                            {author.collegeName && !author.groupName && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <MapPin size={10} />
                                                    <span className="truncate max-w-[130px]">{author.collegeName}</span>
                                                </span>
                                            )}
                                            <span>•</span>
                                            <span><TimeAgo ts={livePost?.timestamp || livePost?.createdAt} /></span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Center: Post Text + Engagement + Comments List */}
                            <div
                                ref={commentsContainerRef}
                                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left custom-scrollbar"
                            >
                                {/* Post Title (if any) */}
                                {postTitle && (
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-snug">
                                        <RichText text={postTitle} onTagClick={onTagClick} />
                                    </h3>
                                )}

                                {/* Post Text / Content */}
                                {postContent && (
                                    <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-medium">
                                        <RichText text={postContent} onTagClick={onTagClick} />
                                    </div>
                                )}

                                {/* External Link Card if attached */}
                                {hasExternalLink && livePost.shareLink && (
                                    <a
                                        href={formatExternalUrl(livePost.shareLink)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-850 hover:bg-primary/5 dark:hover:bg-primary/10 border border-gray-200 dark:border-gray-800 transition-all group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Attached Resource</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                                                {livePost.shareLink}
                                            </p>
                                        </div>
                                        <ExternalLink size={16} className="text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                                    </a>
                                )}

                                {/* ─── Facebook Reaction Stats Row ─── */}
                                <div className="pt-2">
                                    <ReactionSummary
                                        reactions={livePost?.reactions}
                                        reactedBy={livePost?.reactedBy}
                                        commentsCount={comments.length}
                                        onOpenComments={() => commentInputRef.current?.focus()}
                                    />

                                    {/* Facebook Divider */}
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                                    {/* Facebook 4-Action Bar: React | Comment | Share | Bookmark */}
                                    <div className="flex items-center justify-between gap-1 py-1">
                                        {/* React */}
                                        <div className="flex-1 flex items-center justify-center min-w-0">
                                            <ReactionBtn
                                                contentId={post.id}
                                                contentType={contentType}
                                                reactions={livePost?.reactions}
                                                reactedBy={livePost?.reactedBy}
                                                currentUserId={user?.uid}
                                                variant="facebook"
                                            />
                                        </div>

                                        {/* Comment */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                commentInputRef.current?.focus();
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold transition-all duration-150 active:scale-95 cursor-pointer min-w-0"
                                        >
                                            <MessageCircle size={18} className="shrink-0" />
                                            <span className="text-xs whitespace-nowrap">Comment</span>
                                        </button>

                                        {/* Share */}
                                        <button
                                            type="button"
                                            onClick={() => setIsShareOpen(true)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold transition-all duration-150 active:scale-95 cursor-pointer min-w-0"
                                        >
                                            <Share2 size={18} className="shrink-0" />
                                            <span className="text-xs whitespace-nowrap">Share</span>
                                        </button>

                                        {/* Save/Bookmark */}
                                        <button
                                            type="button"
                                            onClick={handleToggleSave}
                                            disabled={isSaving}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer min-w-0 ${
                                                isSavedLocally
                                                    ? "text-primary font-bold bg-primary/10"
                                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                                            }`}
                                        >
                                            <Bookmark size={18} className={`shrink-0 ${isSavedLocally ? "fill-primary" : ""}`} />
                                            <span className="text-xs whitespace-nowrap">{isSavedLocally ? "Saved" : "Save"}</span>
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                </div>

                                {/* ─── Comments Stream ─── */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        <span>Comments ({comments.length})</span>
                                        {comments.length > 0 && <span>Threaded</span>}
                                    </div>

                                    {rootComments.length === 0 ? (
                                        <div className="text-center py-8 px-4 bg-gray-50/50 dark:bg-gray-800/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                            <MessageCircle size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs font-bold text-gray-400">No comments yet.</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Start the conversation below!</p>
                                        </div>
                                    ) : (
                                        rootComments.map((c) => (
                                            <div key={c.id}>
                                                <CommentItem
                                                    comment={c}
                                                    contentId={post.id}
                                                    contentType={contentType}
                                                    onReply={(userName, parentId) => {
                                                        setReplyTo({ userName, parentId });
                                                        setCommentText((prev) => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                                        setTimeout(() => commentInputRef.current?.focus(), 50);
                                                    }}
                                                />
                                                {getReplies(c.id).map((reply) => (
                                                    <CommentItem
                                                        key={reply.id}
                                                        comment={reply}
                                                        contentId={post.id}
                                                        contentType={contentType}
                                                        onReply={(userName, parentId) => {
                                                            setReplyTo({ userName, parentId });
                                                            setCommentText((prev) => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                                            setTimeout(() => commentInputRef.current?.focus(), 50);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ─── Sticky Comment Input Box (Desktop) ─── */}
                            <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18191a] sticky bottom-0 z-20">
                                {user ? (
                                    <div className="relative">
                                        <MentionDropdown
                                            isOpen={mention.isOpen}
                                            query={mention.query}
                                            suggestions={mention.suggestions}
                                            selectedIndex={mention.selectedIndex}
                                            setSelectedIndex={mention.setSelectedIndex}
                                            onSelect={mention.insertMention}
                                            onClose={() => mention.setIsOpen(false)}
                                            position="top"
                                            isGroup={Boolean(author.groupId || contentType === "groupPost")}
                                        />

                                        <AnimatePresence>
                                            {replyTo && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 mb-2"
                                                >
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                                                        <Reply size={12} />
                                                        <span>Replying to <span className="font-black">{replyTo.userName}</span></span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplyTo(null)}
                                                        className="text-[10px] font-bold text-gray-400 hover:text-red-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <form onSubmit={handleCommentSubmit} className="flex items-end gap-2.5">
                                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 mb-1">
                                                <SafeAvatar
                                                    src={profile?.photoURL || user?.photoURL || undefined}
                                                    alt={profile?.displayName || user?.displayName || "?"}
                                                    sizeClassName="w-full h-full"
                                                    textClassName="text-xs font-black"
                                                />
                                            </div>

                                            <div className="flex-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl px-3.5 py-2 border border-transparent focus-within:border-primary/40 focus-within:bg-white dark:focus-within:bg-[#1a1b23] transition-all">
                                                <textarea
                                                    ref={commentInputRef}
                                                    value={commentText}
                                                    onChange={(e) => {
                                                        setCommentText(e.target.value);
                                                        mention.checkMention();
                                                    }}
                                                    onKeyUp={(e) => {
                                                        if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Tab") {
                                                            mention.checkMention();
                                                        }
                                                    }}
                                                    onClick={() => mention.checkMention()}
                                                    onFocus={() => mention.checkMention()}
                                                    onBlur={() => setTimeout(() => mention.setIsOpen(false), 200)}
                                                    placeholder="Write a comment... (Enter to submit)"
                                                    rows={1}
                                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs sm:text-sm resize-none max-h-24 font-medium placeholder:text-gray-400 dark:text-gray-100"
                                                    onKeyDown={(e) => {
                                                        if (mention.handleKeyDown(e)) return;
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleCommentSubmit();
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!commentText.trim() || isSubmittingComment}
                                                className={`p-2.5 rounded-xl transition-all shrink-0 mb-0.5 ${
                                                    commentText.trim()
                                                        ? "bg-primary text-white shadow-md shadow-primary/20 scale-105 active:scale-95"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                } disabled:opacity-40`}
                                                title="Send comment"
                                            >
                                                <Send size={15} className={isSubmittingComment ? "animate-pulse" : ""} />
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 py-2 px-1">
                                        <p className="text-xs text-gray-500 font-medium">Log in to like & comment</p>
                                        <Link
                                            href="/login"
                                            className="px-3 py-1.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-90"
                                        >
                                            Log In
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ───────────────── MOBILE BOTTOM SHEET (COMMENTS & DETAILS) ───────────────── */}
                <AnimatePresence>
                    {mobileSheetOpen && (
                        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
                            <div className="flex-1" onClick={() => setMobileSheetOpen(false)} />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                                className="bg-white dark:bg-[#18191a] rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-gray-200 dark:border-gray-800"
                            >
                                {/* Sheet Drag Handle & Close */}
                                <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto -mr-6" />
                                    <button
                                        onClick={() => setMobileSheetOpen(false)}
                                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Author Header */}
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <SafeAvatar
                                            src={author.avatar || undefined}
                                            alt={author.name}
                                            sizeClassName="w-full h-full"
                                            textClassName="text-xs font-black"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-gray-900 dark:text-white truncate">{author.name}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            {author.groupName || author.collegeName || "Community Member"} • <TimeAgo ts={livePost?.timestamp || livePost?.createdAt} />
                                        </p>
                                    </div>
                                </div>

                                {/* Scrollable Post Details & Comments */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {postTitle && (
                                        <h3 className="text-base font-black text-gray-900 dark:text-white">
                                            <RichText text={postTitle} onTagClick={onTagClick} />
                                        </h3>
                                    )}
                                    {postContent && (
                                        <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-medium">
                                            <RichText text={postContent} onTagClick={onTagClick} />
                                        </div>
                                    )}

                                    {/* Reaction Stats & Actions */}
                                    <div className="pt-2">
                                        <ReactionSummary
                                            reactions={livePost?.reactions}
                                            reactedBy={livePost?.reactedBy}
                                            commentsCount={comments.length}
                                        />
                                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                        <div className="flex items-center justify-between gap-1 py-1">
                                            <div className="flex-1 flex items-center justify-center">
                                                <ReactionBtn
                                                    contentId={post.id}
                                                    contentType={contentType}
                                                    reactions={livePost?.reactions}
                                                    reactedBy={livePost?.reactedBy}
                                                    currentUserId={user?.uid}
                                                    variant="facebook"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => commentInputRef.current?.focus()}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-gray-600 dark:text-gray-400 font-semibold text-xs"
                                            >
                                                <MessageCircle size={17} />
                                                <span>Comment</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsShareOpen(true)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-gray-600 dark:text-gray-400 font-semibold text-xs"
                                            >
                                                <Share2 size={17} />
                                                <span>Share</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleToggleSave}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl font-semibold text-xs ${isSavedLocally ? "text-primary" : "text-gray-600 dark:text-gray-400"}`}
                                            >
                                                <Bookmark size={17} className={isSavedLocally ? "fill-primary" : ""} />
                                                <span>{isSavedLocally ? "Saved" : "Save"}</span>
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                    </div>

                                    {/* Comments list */}
                                    <div className="space-y-4 pt-1">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-400">Comments ({comments.length})</p>
                                        {rootComments.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-gray-400">
                                                No comments yet. Be the first to comment!
                                            </div>
                                        ) : (
                                            rootComments.map((c) => (
                                                <div key={c.id}>
                                                    <CommentItem
                                                        comment={c}
                                                        contentId={post.id}
                                                        contentType={contentType}
                                                        onReply={(userName, parentId) => {
                                                            setReplyTo({ userName, parentId });
                                                            setCommentText((prev) => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                                        }}
                                                    />
                                                    {getReplies(c.id).map((reply) => (
                                                        <CommentItem
                                                            key={reply.id}
                                                            comment={reply}
                                                            contentId={post.id}
                                                            contentType={contentType}
                                                            onReply={(userName, parentId) => {
                                                                setReplyTo({ userName, parentId });
                                                                setCommentText((prev) => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Sticky Bottom Input (Mobile) */}
                                <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18191a]">
                                    {user ? (
                                        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder={replyTo ? `Replying to @${replyTo.userName}...` : "Write a comment..."}
                                                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!commentText.trim() || isSubmittingComment}
                                                className="p-2.5 rounded-full bg-primary text-white disabled:opacity-40 shrink-0"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="text-center py-2">
                                            <Link href="/login" className="text-xs font-bold text-primary">Log in to comment</Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* TTC Share Modal */}
                <ShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    type="post"
                    post={{
                        id: post.id,
                        eventName: postTitle,
                        description: postContent,
                        thumbnailUrl: currentMedia?.url || undefined,
                        authorName: author.name,
                        collegeName: author.collegeName || author.groupName
                    }}
                />
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
