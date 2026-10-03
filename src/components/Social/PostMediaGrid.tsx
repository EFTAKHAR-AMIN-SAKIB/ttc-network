"use client";

import React from "react";
import { Play, Maximize2 } from "lucide-react";
import type { PostMediaItem } from "@/lib/firestore";

interface PostMediaGridProps {
    media: PostMediaItem[];
    onMediaClick: (index: number) => void;
    className?: string;
    altText?: string;
}

export default function PostMediaGrid({
    media,
    onMediaClick,
    className = "",
    altText = "Post media"
}: PostMediaGridProps) {
    if (!media || media.length === 0) return null;

    const count = media.length;

    // ────────────────────────── 1 ITEM ──────────────────────────
    if (count === 1) {
        const item = media[0];
        const isVideo = item.type === "video";

        return (
            <div className={`mt-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 ${className}`}>
                <div
                    onClick={() => onMediaClick(0)}
                    className="relative max-h-[500px] flex items-center justify-center cursor-pointer group/media overflow-hidden"
                >
                    {isVideo ? (
                        <div className="relative w-full max-h-[500px] bg-black flex items-center justify-center aspect-video sm:aspect-auto">
                            <video
                                src={item.url}
                                preload="metadata"
                                className="w-full max-h-[500px] object-contain"
                            />
                            {/* Play button overlay */}
                            <div className="absolute inset-0 bg-black/20 group-hover/media:bg-black/30 transition-colors flex items-center justify-center">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl shadow-primary/40 group-hover/media:scale-110 transition-transform backdrop-blur-xs border border-white/20">
                                    <Play size={26} className="fill-white translate-x-0.5" />
                                </div>
                            </div>
                            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/10">
                                <Play size={10} className="fill-white" /> Video
                            </span>
                        </div>
                    ) : (
                        <div className="relative w-full flex items-center justify-center">
                            <img
                                src={item.url}
                                alt={item.name || altText}
                                className="w-full h-auto max-h-[500px] object-cover group-hover/media:scale-[1.01] transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/15 transition-colors pointer-events-none flex items-center justify-center">
                                <div className="opacity-0 group-hover/media:opacity-100 transition-all scale-95 group-hover/media:scale-100 bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full shadow-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
                                    <Maximize2 size={14} />
                                    <span>View Photo</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ────────────────────────── 2 ITEMS ──────────────────────────
    if (count === 2) {
        return (
            <div className={`mt-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-1 sm:gap-1.5 aspect-[16/10] sm:aspect-[16/9] ${className}`}>
                {media.slice(0, 2).map((item, idx) => (
                    <MediaGridCell
                        key={idx}
                        item={item}
                        onClick={() => onMediaClick(idx)}
                        altText={altText}
                    />
                ))}
            </div>
        );
    }

    // ────────────────────────── 3 ITEMS (1 Large Left + 2 Stacked Right) ──────────────────────────
    if (count === 3) {
        return (
            <div className={`mt-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 aspect-[4/3] sm:aspect-[16/10] ${className}`}>
                {/* 1st item: full height on left */}
                <div className="row-span-2 col-span-1 h-full w-full">
                    <MediaGridCell
                        item={media[0]}
                        onClick={() => onMediaClick(0)}
                        altText={altText}
                    />
                </div>
                {/* 2nd and 3rd items: stacked on right */}
                <div className="row-span-1 col-span-1 h-full w-full">
                    <MediaGridCell
                        item={media[1]}
                        onClick={() => onMediaClick(1)}
                        altText={altText}
                    />
                </div>
                <div className="row-span-1 col-span-1 h-full w-full">
                    <MediaGridCell
                        item={media[2]}
                        onClick={() => onMediaClick(2)}
                        altText={altText}
                    />
                </div>
            </div>
        );
    }

    // ────────────────────────── 4 ITEMS (2x2 Grid) ──────────────────────────
    if (count === 4) {
        return (
            <div className={`mt-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 aspect-square sm:aspect-[4/3] ${className}`}>
                {media.slice(0, 4).map((item, idx) => (
                    <MediaGridCell
                        key={idx}
                        item={item}
                        onClick={() => onMediaClick(idx)}
                        altText={altText}
                    />
                ))}
            </div>
        );
    }

    // ────────────────────────── 5+ ITEMS (4 Cells with +N Overlay on 4th) ──────────────────────────
    const remainingCount = count - 4;

    return (
        <div className={`mt-4 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 aspect-square sm:aspect-[4/3] ${className}`}>
            {media.slice(0, 3).map((item, idx) => (
                <MediaGridCell
                    key={idx}
                    item={item}
                    onClick={() => onMediaClick(idx)}
                    altText={altText}
                />
            ))}

            {/* 4th cell with +N overlay */}
            <div
                onClick={() => onMediaClick(3)}
                className="relative h-full w-full overflow-hidden bg-black/40 cursor-pointer group select-none"
            >
                {media[3].type === "video" ? (
                    <video
                        src={media[3].url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <img
                        src={media[3].url}
                        alt={altText}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                )}
                {/* Facebook +N dark glass overlay */}
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] group-hover:bg-black/55 transition-colors flex flex-col items-center justify-center text-white">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">+{remainingCount + 1}</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-200 mt-0.5">More</span>
                </div>
            </div>
        </div>
    );
}

function MediaGridCell({
    item,
    onClick,
    altText
}: {
    item: PostMediaItem;
    onClick: () => void;
    altText: string;
}) {
    const isVideo = item.type === "video";

    return (
        <div
            onClick={onClick}
            className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group select-none"
        >
            {isVideo ? (
                <>
                    <video
                        src={item.url}
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform backdrop-blur-xs border border-white/20">
                            <Play size={18} className="fill-white translate-x-0.5" />
                        </div>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/10">
                        <Play size={8} className="fill-white" /> Video
                    </span>
                </>
            ) : (
                <>
                    <img
                        src={item.url}
                        alt={item.name || altText}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors pointer-events-none" />
                </>
            )}
        </div>
    );
}
