"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Download, ExternalLink, FileText, BookOpen, Video,
    Loader2, Eye, AlertCircle, Maximize2, Minimize2
} from "lucide-react";
import { type FirestoreStudyPost, incrementStudyPostDownloadCount } from "@/lib/firestore";

interface StudyPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: FirestoreStudyPost & { id: string };
}

// Helper: determine if the file can be previewed inline
function getPreviewType(post: FirestoreStudyPost): "pdf" | "gdocs" | "image" | "video" | "link" | "unsupported" {
    const fileUrl = post.fileUrl || "";
    const link = post.link || "";
    const fileType = post.fileType || "";
    const fileName = post.fileName || "";

    // Check if it's a PDF
    if (
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf") ||
        fileUrl.toLowerCase().includes(".pdf")
    ) {
        return "pdf";
    }

    // Check if it's an image (thumbnail only, no file)
    if (
        fileType.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName) ||
        /\.(jpg|jpeg|png|gif|webp|svg)/i.test(fileUrl)
    ) {
        return "image";
    }

    // Check if it's a video link (YouTube, etc.)
    if (
        post.materialType === "video" ||
        /youtube\.com|youtu\.be|vimeo\.com/i.test(link)
    ) {
        return "video";
    }

    // If it has a fileUrl that's a doc/pptx/xlsx - use Google Docs Viewer
    if (fileUrl && /\.(docx?|pptx?|xlsx?)$/i.test(fileName)) {
        return "gdocs";
    }

    // External link
    if (link) {
        return "link";
    }

    // Has a file but not previewable inline - try Google Docs Viewer
    if (fileUrl) {
        return "gdocs";
    }

    return "unsupported";
}

// Helper: get YouTube embed URL
function getYouTubeEmbedUrl(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
}

// Helper: format file size
function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get file extension badge label
function getFileExtLabel(post: FirestoreStudyPost): string {
    const fileName = post.fileName || "";
    const ext = fileName.split(".").pop()?.toUpperCase();
    if (ext && ["PDF", "DOCX", "DOC", "PPTX", "PPT", "XLSX", "XLS", "TXT"].includes(ext)) return ext;
    if (post.materialType === "video") return "VIDEO";
    if (post.materialType === "doc") return "DOC";
    return "LINK";
}

export default function StudyPreviewModal({ isOpen, onClose, post }: StudyPreviewModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const previewType = getPreviewType(post);
    const fileUrl = post.fileUrl || "";
    const link = post.link || "";
    const resourceUrl = fileUrl || link;

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setHasError(false);
            setIsDownloading(false);
        }
    }, [isOpen, post.id]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = ""; };
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Download handler: fetch blob + trigger download
    const handleDownload = useCallback(async () => {
        if (!resourceUrl) return;
        setIsDownloading(true);

        // Increment download count
        incrementStudyPostDownloadCount(post.id);

        if (fileUrl) {
            const downloadUrl = `/api/study/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(post.fileName || post.title)}`;
            window.location.href = downloadUrl;
            setTimeout(() => {
                setIsDownloading(false);
            }, 1500);
        } else {
            window.open(link, "_blank", "noopener,noreferrer");
            setIsDownloading(false);
        }
    }, [fileUrl, link, resourceUrl, post.id, post.fileName, post.title]);

    // Build the preview content
    const renderPreview = () => {
        switch (previewType) {
            case "pdf":
                return (
                    <div className="w-full h-full relative">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0c0c10] z-10">
                                <Loader2 size={32} className="text-primary animate-spin mb-3" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading PDF...</span>
                            </div>
                        )}
                        <iframe
                            src={`${fileUrl}#toolbar=1&navpanes=0`}
                            className="w-full h-full border-0"
                            title={post.title}
                            onLoad={() => setIsLoading(false)}
                            onError={() => { setIsLoading(false); setHasError(true); }}
                        />
                    </div>
                );

            case "gdocs":
                return (
                    <div className="w-full h-full relative">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0c0c10] z-10">
                                <Loader2 size={32} className="text-primary animate-spin mb-3" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Preview...</span>
                            </div>
                        )}
                        <iframe
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                            className="w-full h-full border-0"
                            title={post.title}
                            onLoad={() => setIsLoading(false)}
                            onError={() => { setIsLoading(false); setHasError(true); }}
                        />
                    </div>
                );

            case "image":
                return (
                    <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0c0c10]">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Loader2 size={32} className="text-primary animate-spin" />
                            </div>
                        )}
                        <img
                            src={post.thumbnailUrl || fileUrl}
                            alt={post.title}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                            onLoad={() => setIsLoading(false)}
                            onError={() => { setIsLoading(false); setHasError(true); }}
                        />
                    </div>
                );

            case "video": {
                const youtubeEmbed = getYouTubeEmbedUrl(link);
                if (youtubeEmbed) {
                    return (
                        <div className="w-full h-full flex items-center justify-center bg-black">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 size={32} className="text-white animate-spin" />
                                </div>
                            )}
                            <iframe
                                src={youtubeEmbed}
                                className="w-full h-full border-0"
                                title={post.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                onLoad={() => setIsLoading(false)}
                            />
                        </div>
                    );
                }
                // Non-YouTube video: show thumbnail + open link
                return renderFallbackPreview();
            }

            case "link":
                return renderFallbackPreview();

            default:
                return renderFallbackPreview();
        }
    };

    // Fallback: show the thumbnail large + metadata
    const renderFallbackPreview = () => {
        setIsLoading(false);
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 bg-gray-50 dark:bg-[#0c0c10]">
                {post.thumbnailUrl ? (
                    <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className="max-w-full max-h-[60%] object-contain rounded-2xl shadow-xl mb-6"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                        <FileText size={48} className="text-primary" />
                    </div>
                )}
                <h3 className="text-lg font-black text-gray-900 dark:text-white text-center mb-2">{post.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6 line-clamp-3">{post.content}</p>
                <a
                    href={resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <ExternalLink size={16} />
                    Open in New Tab
                </a>
            </div>
        );
    };

    // Error state
    const renderError = () => (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#0c0c10]">
            <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Preview Unavailable</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                This file can&apos;t be previewed in the browser. You can download it directly instead.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                >
                    <Download size={16} />
                    Download
                </button>
                {resourceUrl && (
                    <a
                        href={resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                    >
                        <ExternalLink size={16} />
                        Open Link
                    </a>
                )}
            </div>
        </div>
    );

    const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
        doc: { icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", label: "Document" },
        video: { icon: Video, color: "text-red-500 bg-red-50 dark:bg-red-900/20", label: "Video" },
        link: { icon: ExternalLink, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", label: "Link" }
    };
    const mtKey = (post.materialType || "link") as string;
    const { icon: TypeIcon, color: typeColor, label: typeLabel } = typeConfig[mtKey] || typeConfig.link;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative bg-white dark:bg-[#161620] overflow-hidden flex flex-col shadow-2xl ${
                            isFullscreen
                                ? "w-full h-full rounded-none"
                                : "w-[95vw] h-[92vh] sm:w-[90vw] sm:h-[88vh] max-w-5xl rounded-2xl sm:rounded-3xl"
                        }`}
                    >
                        {/* Header Bar */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* File type badge */}
                                <div className={`shrink-0 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${typeColor}`}>
                                    <TypeIcon size={12} />
                                    {typeLabel}
                                </div>
                                {/* File extension badge */}
                                <div className="shrink-0 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                    {getFileExtLabel(post)}
                                </div>
                                {/* Title */}
                                <h2 className="text-sm font-black text-gray-900 dark:text-white truncate min-w-0">
                                    {post.title}
                                </h2>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-3">
                                {/* File size */}
                                {post.fileSize && (
                                    <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {formatFileSize(post.fileSize)}
                                    </span>
                                )}
                                {/* Fullscreen toggle */}
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-all"
                                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                {/* Download button */}
                                <button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 disabled:opacity-60"
                                >
                                    {isDownloading ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span className="hidden sm:inline">Download</span>
                                </button>
                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all"
                                    title="Close preview"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {hasError ? renderError() : renderPreview()}
                        </div>

                        {/* Footer info bar */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gray-50 dark:bg-[#0f0f18] border-t border-gray-100 dark:border-gray-800 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                {post.authorPhoto ? (
                                    <img src={post.authorPhoto} alt="" className="w-5 h-5 rounded-md object-cover" />
                                ) : (
                                    <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-700" />
                                )}
                                <span className="text-[10px] font-bold text-gray-500 truncate">{post.authorName}</span>
                                {post.collegeName && (
                                    <span className="text-[9px] font-bold text-gray-400 truncate hidden sm:block">· {post.collegeName.split(',')[0]}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye size={12} className="text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview Mode</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
