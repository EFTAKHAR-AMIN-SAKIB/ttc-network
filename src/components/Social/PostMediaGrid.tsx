/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2, Sparkles } from "lucide-react";
import type { PostMediaItem } from "@/lib/firestore";

interface PostMediaGridProps {
    media: PostMediaItem[];
    onMediaClick: (index: number) => void;
    className?: string;
    altText?: string;
}

function formatVideoTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Global feed audio preference across session (default to unmuted as requested by user)
let globalFeedAudioUnmuted = true;

/**
 * FeedVideoPlayer: Facebook/Instagram style autoplaying social video player.
 * - Autoplays unmuted by default (falls back gracefully to muted if browser blocks cold audio)
 * - Remembers user's mute/unmute choice globally across all feed videos
 * - Adapts dynamically to 9:16 vertical Reels vs 16:9 Landscape videos
 * - Preloads buffer when 350px near viewport for instant 0-lag playback
 * - Supports instant poster image and ambient blurred backdrop
 * - Pauses automatically when scrolled out of view
 * - Respects explicit user pause while post is in view
 * - 1-click mute/unmute with floating "Tap for Sound" chip
 * - Interactive scrubber & progress bar
 * - Center play/pause toggle with smooth transitions
 * - Expand button to open full lightbox
 */
export function FeedVideoPlayer({
    item,
    onExpand,
    compact = false,
    altText = "Video",
}: {
    item: PostMediaItem;
    onExpand?: () => void;
    compact?: boolean;
    altText?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(!globalFeedAudioUnmuted);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isNearViewport, setIsNearViewport] = useState(false);

    // Dynamic Aspect Ratio & Portrait Reel detection
    const initialRatio = item.aspectRatio || (item.width && item.height ? item.width / item.height : null);
    const [videoRatio, setVideoRatio] = useState<number | null>(initialRatio);
    const isPortrait = item.isPortrait || (videoRatio !== null && videoRatio < 0.95);

    // Track if user explicitly clicked pause
    const userPausedRef = useRef(false);
    const playerIdRef = useRef(`vid-${Math.random().toString(36).slice(2, 9)}`);

    // Clean poster image (ignore if pointing to raw .mp4)
    const posterImage = (item.thumbnail && !item.thumbnail.endsWith(".mp4")) ? item.thumbnail : undefined;
    // Clean video source (DO NOT append #t=0.001 to prevent media fragment seek lock!)
    const videoSource = item.url;

    // Listen for other videos playing in feed to pause this one
    useEffect(() => {
        const handleOtherPlay = (e: Event) => {
            const customEv = e as CustomEvent<{ id: string }>;
            if (customEv.detail?.id !== playerIdRef.current) {
                if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                }
            }
        };

        const handleAudioPref = (e: Event) => {
            const customEv = e as CustomEvent<{ unmuted: boolean }>;
            if (customEv.detail) {
                const unmuted = customEv.detail.unmuted;
                setIsMuted(!unmuted);
                if (videoRef.current) {
                    videoRef.current.muted = !unmuted;
                }
            }
        };

        window.addEventListener("ttc-feed-video-playing", handleOtherPlay as EventListener);
        window.addEventListener("ttc-feed-audio-preference", handleAudioPref as EventListener);
        return () => {
            window.removeEventListener("ttc-feed-video-playing", handleOtherPlay as EventListener);
            window.removeEventListener("ttc-feed-audio-preference", handleAudioPref as EventListener);
        };
    }, []);

    // Proximity observer: buffer ahead of time when 350px near viewport
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const proximityObserver = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    setIsNearViewport(true);
                }
            },
            { rootMargin: "350px 0px" }
        );

        proximityObserver.observe(container);
        return () => proximityObserver.disconnect();
    }, []);

    // Intersection Observer for scroll-based autoplay
    useEffect(() => {
        const container = containerRef.current;
        const video = videoRef.current;
        if (!container || !video) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;

                if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
                    // Autoplay when at least ~45-50% in viewport, unless user paused
                    if (!userPausedRef.current && video.paused) {
                        // Attempt to play unmuted by default according to global feed setting
                        const shouldBeMuted = !globalFeedAudioUnmuted;
                        video.muted = shouldBeMuted;
                        setIsMuted(shouldBeMuted);

                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise
                                .then(() => {
                                    setIsPlaying(true);
                                    window.dispatchEvent(
                                        new CustomEvent("ttc-feed-video-playing", {
                                            detail: { id: playerIdRef.current },
                                        })
                                    );
                                })
                                .catch(() => {
                                    // Browser policy blocked unmuted audio on cold scroll
                                    // Fallback to muted so video plays smoothly without freezing
                                    video.muted = true;
                                    setIsMuted(true);
                                    video
                                        .play()
                                        .then(() => setIsPlaying(true))
                                        .catch(() => {});
                                });
                        }
                    }
                } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
                    // Scrolled out of view: pause
                    if (!video.paused) {
                        video.pause();
                        setIsPlaying(false);
                    }
                    // Reset user pause intent so next time they scroll here, it plays again
                    userPausedRef.current = false;
                }
            },
            { threshold: [0, 0.2, 0.45, 0.7, 1.0] }
        );

        observer.observe(container);
        return () => {
            observer.disconnect();
        };
    }, []);

    // Handle user play/pause toggle by clicking the video
    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            userPausedRef.current = false;
            video.muted = isMuted;
            video
                .play()
                .then(() => {
                    setIsPlaying(true);
                    window.dispatchEvent(
                        new CustomEvent("ttc-feed-video-playing", {
                            detail: { id: playerIdRef.current },
                        })
                    );
                })
                .catch(() => {
                    video.muted = true;
                    setIsMuted(true);
                    video.play().then(() => setIsPlaying(true)).catch(() => {});
                });
        } else {
            userPausedRef.current = true;
            video.pause();
            setIsPlaying(false);
        }
    };

    // Toggle mute/unmute and broadcast globally across feed
    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        const nextMuted = !isMuted;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
        globalFeedAudioUnmuted = !nextMuted;
        window.dispatchEvent(
            new CustomEvent("ttc-feed-audio-preference", {
                detail: { unmuted: !nextMuted },
            })
        );
    };

    // Auto-hide controls during active playback
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (isPlaying) {
            controlsTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, 2600);
        }
    };

    const handleMouseLeave = () => {
        if (isPlaying) {
            setShowControls(false);
        }
    };

    // Seek / scrub logic
    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const video = videoRef.current;
        const bar = progressRef.current;
        if (!video || !bar || !duration) return;

        const rect = bar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newPct = clickX / rect.width;
        const targetTime = newPct * duration;
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
    };

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Compact mode for multi-item grid cells
    if (compact) {
        return (
            <div
                ref={containerRef}
                onClick={onExpand}
                className="relative w-full h-full overflow-hidden bg-black cursor-pointer group select-none flex items-center justify-center"
            >
                <video
                    ref={videoRef}
                    src={videoSource}
                    poster={posterImage}
                    aria-label={altText}
                    preload={isNearViewport ? "auto" : "metadata"}
                    playsInline
                    muted={isMuted}
                    loop
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                />

                {/* Ambient dark gradient overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors pointer-events-none" />

                {/* Video badge */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/10 z-10">
                    <Play size={8} className="fill-white" /> Video
                </span>

                {/* Compact sound toggle */}
                <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg border border-white/20 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer"
                >
                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
            </div>
        );
    }

    // Full social media player (Single video post - Facebook/Instagram style)
    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-full max-h-[520px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center select-none group/video"
        >

            <video
                ref={videoRef}
                src={videoSource}
                poster={posterImage}
                aria-label={altText}
                preload={isNearViewport ? "auto" : "metadata"}
                playsInline
                muted={isMuted}
                loop
                onClick={togglePlayPause}
                onTimeUpdate={() => {
                    if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                    }
                }}
                onLoadedMetadata={() => {
                    if (videoRef.current) {
                        setDuration(videoRef.current.duration);
                        const w = videoRef.current.videoWidth;
                        const h = videoRef.current.videoHeight;
                        if (w && h) {
                            setVideoRatio(w / h);
                        }
                    }
                }}
                onCanPlay={() => setIsBuffering(false)}
                onWaiting={() => {
                    if (isPlaying) setIsBuffering(true);
                }}
                onPlaying={() => {
                    setIsBuffering(false);
                    setIsPlaying(true);
                }}
                onPause={() => {
                    setIsBuffering(false);
                    setIsPlaying(false);
                }}
                onError={() => {
                    setIsBuffering(false);
                }}
                className="w-full max-h-[520px] object-contain cursor-pointer"
            />

            {/* Buffering Spinner: ONLY shown when actively playing and buffering */}
            {isBuffering && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center border border-white/10 text-white shadow-xl">
                        <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                </div>
            )}

            {/* Quick Unmute Floating Badge when browser forced muted autoplay */}
            {isMuted && isPlaying && !showControls && (
                <button
                    type="button"
                    onClick={toggleMute}
                    className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 text-[11px] font-bold flex items-center gap-1.5 shadow-2xl transition-all hover:scale-105 active:scale-95 z-30 cursor-pointer"
                >
                    <VolumeX size={13} className="text-amber-400" />
                    <span>Tap for sound</span>
                </button>
            )}

            {/* Center Play Button Overlay (visible when paused or during control hover) */}
            {(!isPlaying || showControls) && (
                <div
                    onClick={togglePlayPause}
                    className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-300 z-20 ${
                        !isPlaying ? "bg-black/25 opacity-100" : showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                >
                    {!isPlaying && (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/70 hover:bg-primary text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/25 hover:scale-110 active:scale-95 transition-all duration-300">
                            <Play size={30} className="fill-white translate-x-1" />
                        </div>
                    )}
                </div>
            )}

            {/* Top Info & Expand Bar */}
            <div
                className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/75 via-black/30 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/15">
                    <Play size={10} className="fill-white" /> Video
                </span>

                {onExpand && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand();
                        }}
                        title="Expand / Fullscreen Lightbox"
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white flex items-center justify-center border border-white/15 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    >
                        <Maximize2 size={14} />
                    </button>
                )}
            </div>

            {/* Bottom Scrubber & Controls Bar */}
            <div
                className={`absolute bottom-0 left-0 right-0 pt-6 pb-2.5 px-3 sm:px-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent z-20 transition-opacity duration-300 ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            >
                {/* Interactive Progress Bar */}
                <div
                    ref={progressRef}
                    onClick={handleScrub}
                    className="relative w-full h-1.5 hover:h-2.5 bg-white/25 hover:bg-white/35 rounded-full cursor-pointer mb-2.5 transition-all duration-200 group/bar flex items-center"
                >
                    <div
                        className="h-full bg-primary rounded-full relative transition-all duration-75"
                        style={{ width: `${progressPct}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity scale-100" />
                    </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={togglePlayPause}
                            title={isPlaying ? "Pause" : "Play"}
                            className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                        >
                            {isPlaying ? <Pause size={17} /> : <Play size={17} className="fill-white" />}
                        </button>

                        <span className="text-[11px] font-semibold text-gray-200 tracking-tight select-none">
                            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Audio / Mute Button */}
                        <button
                            type="button"
                            onClick={toggleMute}
                            title={isMuted ? "Click to unmute" : "Click to mute"}
                            className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        >
                            {isMuted ? (
                                <>
                                    <VolumeX size={14} className="text-red-400" />
                                    <span className="text-[10px] uppercase tracking-wider">Unmute</span>
                                </>
                            ) : (
                                <>
                                    <Volume2 size={14} className="text-emerald-400" />
                                    <span className="text-[10px] uppercase tracking-wider">Sound</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
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
                {isVideo ? (
                    <FeedVideoPlayer
                        item={item}
                        onExpand={() => onMediaClick(0)}
                        altText={altText}
                    />
                ) : (
                    <div
                        onClick={() => onMediaClick(0)}
                        className="relative max-h-[500px] flex items-center justify-center cursor-pointer group/media overflow-hidden"
                    >
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
                    <FeedVideoPlayer
                        item={media[3]}
                        onExpand={() => onMediaClick(3)}
                        compact={true}
                        altText={altText}
                    />
                ) : (
                    <img
                        src={media[3].url}
                        alt={altText}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                )}
                {/* Facebook +N dark glass overlay */}
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] group-hover:bg-black/55 transition-colors flex flex-col items-center justify-center text-white pointer-events-none">
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

    if (isVideo) {
        return (
            <FeedVideoPlayer
                item={item}
                onExpand={onClick}
                compact={true}
                altText={altText}
            />
        );
    }

    return (
        <div
            onClick={onClick}
            className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group select-none"
        >
            <img
                src={item.url}
                alt={item.name || altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors pointer-events-none" />
        </div>
    );
}
