"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Link2, Share2, Sparkles, ChevronDown, ChevronUp, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type?: "post" | "story" | "notice" | "study";
    post: {
        id: string;
        eventName?: string;
        title?: string;
        description?: string;
        body?: string;
        content?: string;
        fullStory?: string;
        collegeName?: string;
        college?: string;
        collegeLogo?: string;
        thumbnailUrl?: string;
        shareLink?: string;
        authorName?: string;
        name?: string;
        linkPreview?: {
            title?: string;
            description?: string;
            thumbnail?: string;
            domain?: string;
        };
    };
}

export default function ShareModal({ isOpen, onClose, type = "post", post }: ShareModalProps) {
    const { showToast } = useToast();
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);
    const [postUrl, setPostUrl] = useState("");
    const [isNativeShareSupported, setIsNativeShareSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsNativeShareSupported(!!navigator?.share);

            let path = "/news-feed";
            if (type === "story") {
                path = `/story/${post.id}`;
            } else if (type === "notice") {
                path = `/notice?notice=${post.id}`;
            } else if (type === "study") {
                path = `/study?study=${post.id}`;
            } else {
                path = `/news-feed?post=${post.id}`;
            }
            setPostUrl(`${window.location.origin}${path}`);
        }
    }, [post?.id, type]);

    if (!isOpen || !post) return null;

    // Retrieve clean text content
    const rawDescription = post.description || post.body || post.content || post.fullStory || "";
    const cleanDescription = rawDescription
        ? rawDescription.replace(/[#*`_~[\]()]/g, "").trim()
        : "";
    const descriptionSnippet = cleanDescription.length > 140
        ? `${cleanDescription.slice(0, 140)}...`
        : cleanDescription;

    const itemTitle = post.title || post.eventName || "TTC Update";
    const itemCollege = post.collegeName || post.college || "Global Community";

    // Structured share text
    let shareText = "";
    if (type === "story") {
        shareText = `📚 Inspiring TTC Journey: "${itemTitle}"\n\n"${descriptionSnippet}"\n\n✍️ Author: ${post.authorName || post.name || "Educator"}\n🏫 College: ${itemCollege}\n\nRead more on TTC Network: 🇧🇩\n${postUrl}`;
    } else if (type === "notice") {
        shareText = `📢 Official Notice: "${itemTitle}"\n\n"${descriptionSnippet}"\n\n🏫 College: ${itemCollege}\n\nView details on TTC Network: 🇧🇩\n${postUrl}`;
    } else if (type === "study") {
        shareText = `📖 Study Material: "${itemTitle}"\n\n"${descriptionSnippet}"\n\n🏫 College: ${itemCollege}\n\nAccess handouts and notes on TTC Network: 🇧🇩\n${postUrl}`;
    } else {
        shareText = `🎓 TTC Network Update: "${itemTitle}"\n\n"${descriptionSnippet}"\n\n🏫 Campus: ${itemCollege}\n\nJoin the discussion on TTC Network: 🇧🇩\n${postUrl}`;
    }

    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    // Social Platforms Configuration with official SVG icons
    const platforms = [
        {
            name: "WhatsApp",
            label: "WhatsApp",
            bg: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/30",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.858-4.42 9.863-9.864.002-2.637-1.023-5.115-2.887-6.98-1.866-1.865-4.343-2.888-6.977-2.888-5.439 0-9.862 4.42-9.867 9.864-.001 1.757.465 3.472 1.348 4.984L1.93 18.753l4.717-1.245zM17.07 14.88c-.274-.137-1.62-.799-1.87-.891-.252-.093-.437-.137-.62.137-.182.274-.707.891-.867 1.073-.16.182-.32.206-.593.069-.274-.137-1.155-.426-2.2-1.359-.812-.724-1.36-1.618-1.52-1.892-.16-.274-.017-.422.12-.558.124-.122.274-.32.411-.48.137-.16.183-.274.274-.457.091-.183.046-.343-.023-.48-.069-.137-.62-1.492-.85-2.04-.223-.538-.448-.464-.62-.473-.16-.008-.343-.01-.525-.01-.183 0-.48.069-.73.343-.25.274-.958.937-.958 2.285 0 1.348.98 2.648 1.118 2.83.137.183 1.928 2.945 4.67 4.129.652.282 1.162.451 1.56.577.656.208 1.252.179 1.724.109.525-.078 1.62-.663 1.85-1.302.23-.639.23-1.187.16-1.302-.07-.11-.253-.183-.526-.32z"/>
                </svg>
            ),
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
        },
        {
            name: "Facebook",
            label: "Facebook",
            bg: "bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-[#1877F2]/30",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        },
        {
            name: "Telegram",
            label: "Telegram",
            bg: "bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9] hover:text-white border-[#229ED9]/30",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
            ),
            url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        },
        {
            name: "X (Twitter)",
            label: "X",
            bg: "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-gray-300 dark:border-gray-700",
            icon: (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
            url: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        },
        {
            name: "LinkedIn",
            label: "LinkedIn",
            bg: "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-[#0A66C2]/30",
            icon: (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
            ),
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        }
    ];

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(postUrl);
            setCopiedLink(true);
            if (typeof window !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(15);
            }
            showToast("Link copied to clipboard!", "success");
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            showToast("Failed to copy link", "error");
        }
    };

    const copyCaption = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopiedCaption(true);
            if (typeof window !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(15);
            }
            showToast("Post text & hashtags copied!", "success");
            setTimeout(() => setCopiedCaption(false), 2000);
        } catch {
            showToast("Failed to copy caption", "error");
        }
    };

    const handleNativeShare = async () => {
        if (!navigator?.share) return;
        try {
            await navigator.share({
                title: itemTitle,
                text: shareText,
                url: postUrl,
            });
            showToast("Shared successfully!", "success");
            onClose();
        } catch (err: any) {
            if (err?.name !== "AbortError") {
                console.warn("Native share:", err);
            }
        }
    };

    const handleSocialClick = async (platformName: string, shareUrl: string) => {
        try {
            await navigator.clipboard.writeText(shareText);
            if (platformName === "Facebook" || platformName === "LinkedIn") {
                showToast(`Caption copied! Paste into ${platformName} to share.`, "info");
            }
        } catch {}
        window.open(shareUrl, "_blank", "noopener,noreferrer");
    };

    const modalTitle = type === "story" ? "Share Story" : 
                       type === "notice" ? "Share Notice" : 
                       type === "study" ? "Share Resource" : "Share Update";

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Dark Backdrop with Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Sheet Container */}
            <motion.div
                initial={{ y: "100%", opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))" }}
                className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#12141c] rounded-t-[28px] sm:rounded-3xl border-t sm:border border-gray-200/80 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Mobile Drag Indicator Handle */}
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

                <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                {modalTitle}
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                Share with your college community or social apps
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors active:scale-95"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Compact Item Preview Card */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        {post.thumbnailUrl || post.linkPreview?.thumbnail ? (
                            <img
                                src={post.thumbnailUrl || post.linkPreview?.thumbnail}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/5"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xl font-bold">
                                {type === "story" ? "📚" : type === "notice" ? "📢" : type === "study" ? "📖" : "🎓"}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-primary dark:text-blue-400 bg-primary/10 dark:bg-blue-400/10 px-2 py-0.5 rounded-full inline-block mb-1 truncate max-w-full">
                                {itemCollege}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
                                {itemTitle}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {cleanDescription || "TTC Network resource"}
                            </p>
                        </div>
                    </div>

                    {/* 1-Tap Native Android/iOS Share (when supported) */}
                    {isNativeShareSupported && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-primary/20 transition-all cursor-pointer"
                        >
                            <Share2 size={16} />
                            <span>Share via Device Apps</span>
                        </button>
                    )}

                    {/* Social Platform Quick Icons Row */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-2.5">
                            Quick Share
                        </span>
                        <div className="grid grid-cols-5 gap-2">
                            {platforms.map((p) => (
                                <button
                                    key={p.name}
                                    onClick={() => handleSocialClick(p.name, p.url)}
                                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-2xl border transition-all duration-200 active:scale-95 group ${p.bg}`}
                                    title={`Share on ${p.name}`}
                                >
                                    <div className="transition-transform group-hover:scale-110">
                                        {p.icon}
                                    </div>
                                    <span className="text-[9px] font-bold tracking-tight truncate max-w-full">
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clean Copy Link Bar */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                            Direct Link
                        </span>
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl">
                            <div className="pl-2.5 text-gray-400 shrink-0">
                                <Link2 size={15} />
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={postUrl}
                                className="w-full bg-transparent border-none text-xs font-mono text-gray-600 dark:text-gray-300 outline-none truncate py-1.5"
                            />
                            <button
                                onClick={copyLink}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                                    copiedLink
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "bg-primary text-white hover:bg-blue-700 shadow-sm shadow-primary/25"
                                }`}
                            >
                                {copiedLink ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                                <span>{copiedLink ? "Copied" : "Copy"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Optional Formatted Caption Accordion */}
                    <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-white/[0.02]">
                        <button
                            onClick={() => setShowFullCaption(!showFullCaption)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Sparkles size={13} className="text-amber-500" />
                                Formatted Caption & Hashtags
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <span>{showFullCaption ? "Hide" : "Preview"}</span>
                                {showFullCaption ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                        </button>

                        <AnimatePresence>
                            {showFullCaption && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-3.5 pb-3 border-t border-gray-100 dark:border-white/5 pt-2 space-y-2"
                                >
                                    <pre className="text-[11px] font-sans text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto no-scrollbar">
                                        {shareText}
                                    </pre>
                                    <button
                                        onClick={copyCaption}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-gray-700 dark:text-gray-200 transition-all active:scale-95"
                                    >
                                        {copiedCaption ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        <span>{copiedCaption ? "Caption Copied!" : "Copy Full Caption"}</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
