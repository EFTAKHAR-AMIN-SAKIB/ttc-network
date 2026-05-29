"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        id: string;
        eventName: string;
        description?: string;
        collegeName: string;
        collegeLogo?: string;
        thumbnailUrl?: string;
        shareLink?: string;
        linkPreview?: {
            title?: string;
            description?: string;
            thumbnail?: string;
            domain?: string;
        };
    };
}

export default function ShareModal({ isOpen, onClose, post }: ShareModalProps) {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [copiedText, setCopiedText] = useState(false);
    const [postUrl, setPostUrl] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPostUrl(`${window.location.origin}/news-feed?post=${post.id}`);
        }
    }, [post.id]);

    if (!isOpen) return null;

    // Auto-generated post text for sharing
    const cleanDescription = post.description
        ? post.description.replace(/[#*`_~[\]()]/g, "") // Clean markdown syntax
        : "";
    const descriptionSnippet = cleanDescription.length > 185
        ? `${cleanDescription.slice(0, 185)}...`
        : cleanDescription;

    // Rich structured post templates tailored strictly to post type and details
    const shareText = `🎓 TTC Network Update 🎓\n\n📢 Event: ${post.eventName}\n\n"${descriptionSnippet}"\n\n🏫 Campus: ${post.collegeName}\n\nJoin the discussion and connect with teachers & students across Bangladesh! 🇧🇩\n\n#TTCNetwork #TeachersTrainingCollege #Bangladesh #TTC`;

    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    // Social Media Platforms config
    const platforms = [
        {
            name: "Facebook",
            color: "bg-[#1877F2] hover:bg-[#1877F2]/90 shadow-lg shadow-[#1877F2]/10",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        },
        {
            name: "X (Twitter)",
            color: "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-lg shadow-black/10 dark:shadow-white/5",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
            url: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        },
        {
            name: "LinkedIn",
            color: "bg-[#0A66C2] hover:bg-[#0A66C2]/90 shadow-lg shadow-[#0A66C2]/10",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
            ),
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        },
        {
            name: "WhatsApp",
            color: "bg-[#25D366] hover:bg-[#25D366]/90 shadow-lg shadow-[#25D366]/10",
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.858-4.42 9.863-9.864.002-2.637-1.023-5.115-2.887-6.98-1.866-1.865-4.343-2.888-6.977-2.888-5.439 0-9.862 4.42-9.867 9.864-.001 1.757.465 3.472 1.348 4.984L1.93 18.753l4.717-1.245zM17.07 14.88c-.274-.137-1.62-.799-1.87-.891-.252-.093-.437-.137-.62.137-.182.274-.707.891-.867 1.073-.16.182-.32.206-.593.069-.274-.137-1.155-.426-2.2-1.359-.812-.724-1.36-1.618-1.52-1.892-.16-.274-.017-.422.12-.558.124-.122.274-.32.411-.48.137-.16.183-.274.274-.457.091-.183.046-.343-.023-.48-.069-.137-.62-1.492-.85-2.04-.223-.538-.448-.464-.62-.473-.16-.008-.343-.01-.525-.01-.183 0-.48.069-.73.343-.25.274-.958.937-.958 2.285 0 1.348.98 2.648 1.118 2.83.137.183 1.928 2.945 4.67 4.129.652.282 1.162.451 1.56.577.656.208 1.252.179 1.724.109.525-.078 1.62-.663 1.85-1.302.23-.639.23-1.187.16-1.302-.07-.11-.253-.183-.526-.32z"/>
                </svg>
            ),
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n\n" + postUrl)}`
        }
    ];

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(postUrl);
            setCopied(true);
            showToast("Share link copied!", "success");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showToast("Failed to copy link", "error");
        }
    };

    const copyTextToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopiedText(true);
            showToast("Post text copied to clipboard!", "success");
            setTimeout(() => setCopiedText(false), 2000);
        } catch (err) {
            showToast("Failed to copy text", "error");
        }
    };

    const handleShareClick = async (platformName: string, shareUrl: string) => {
        try {
            await navigator.clipboard.writeText(shareText);
            if (platformName === "Facebook" || platformName === "LinkedIn") {
                showToast(`Text copied! Press Ctrl+V in the ${platformName} window to paste.`, "success");
            } else {
                showToast(`Sharing on ${platformName}!`, "success");
            }
        } catch (err) {
            // Fallback if clipboard copy fails
        }
        window.open(shareUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white dark:bg-[#12131a] w-full max-w-lg rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl relative overflow-hidden z-10 flex flex-col p-6 sm:p-8"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                            Share Post
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Spread the word about your college update</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Post Preview Snippet */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-gray-800/50 mb-6 flex gap-4 items-center">
                    {post.thumbnailUrl || (post.linkPreview && post.linkPreview.thumbnail) ? (
                        <img
                            src={post.thumbnailUrl || post.linkPreview?.thumbnail}
                            alt="Snippet"
                            className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xl font-bold">
                            🎓
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-1 truncate max-w-full">
                            {post.collegeName}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-snug">
                            {post.eventName}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate leading-relaxed">
                            {cleanDescription || "TTC Network campus event update"}
                        </p>
                    </div>
                </div>

                {/* Copy Link Section */}
                <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Copy Link</label>
                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-black/30 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        <div className="flex items-center gap-2 px-3 text-gray-400 shrink-0">
                            <Globe size={16} />
                        </div>
                        <input
                            type="text"
                            readOnly
                            value={postUrl}
                            className="w-full bg-transparent border-none text-xs font-mono outline-none text-gray-600 dark:text-gray-300 focus:ring-0 truncate py-2"
                        />
                        <button
                            onClick={copyToClipboard}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                copied
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                            }`}
                        >
                            {copied ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                            <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                    </div>
                </div>

                {/* Auto-Generated Post Text Section */}
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            Auto-Generated Post Text
                        </label>
                        <button
                            onClick={copyTextToClipboard}
                            className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all duration-300 ${
                                copiedText
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-gray-105 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            {copiedText ? <Check size={10} className="stroke-[3]" /> : <Copy size={10} />}
                            {copiedText ? "Copied Text!" : "Copy Text"}
                        </button>
                    </div>
                    <div className="relative p-3.5 bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        <pre className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 font-sans whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto pr-2 no-scrollbar">
                            {shareText}
                        </pre>
                        <div className="absolute bottom-2 right-2 pointer-events-none text-[8px] font-black text-gray-400/50 uppercase tracking-widest bg-white dark:bg-[#12131a] px-1.5 py-0.5 rounded border border-gray-50 dark:border-gray-850">
                            Auto-Styled
                        </div>
                    </div>
                </div>

                {/* Social Share Section */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Share to Social Platforms</label>
                    <div className="grid grid-cols-2 gap-3">
                        {platforms.map((platform) => (
                            <button
                                key={platform.name}
                                onClick={() => handleShareClick(platform.name, platform.url)}
                                className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 duration-200 ${platform.color}`}
                            >
                                {platform.icon}
                                <span>{platform.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Info Text */}
                <div className="mt-6 text-center bg-gray-50 dark:bg-black/10 p-2.5 rounded-xl border border-gray-100/50 dark:border-gray-800/30">
                    <p className="text-[9px] font-black text-gray-450 dark:text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1.5 leading-relaxed">
                        💡 X & WhatsApp prefill automatically. For Facebook & LinkedIn, simply press Ctrl+V to paste the auto-copied text!
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

