"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ThumbsUp } from "lucide-react";
import { reactToContent } from "@/lib/firestore";
import ReactionViewerModal from "./ReactionViewerModal";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

/* ─── Reaction Types (Palette & Sequence) ─── */
export const REACTION_TYPES = [
    { type: "love", icon: "❤️", label: "Love", color: "text-[#F02849]", bg: "bg-red-50 dark:bg-red-950/30" },
    { type: "like", icon: "👍", label: "Like", color: "text-[#1877F2]", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { type: "haha", icon: "😂", label: "Haha", color: "text-[#F7B125]", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    { type: "wow", icon: "😮", label: "Wow", color: "text-[#F7B125]", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    { type: "sad", icon: "😢", label: "Sad", color: "text-[#F7B125]", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { type: "angry", icon: "😡", label: "Angry", color: "text-[#E04B2A]", bg: "bg-orange-50 dark:bg-orange-950/30" },
] as const;

export type ReactionType = typeof REACTION_TYPES[number]["type"];

/**
 * ReactionPicker Component (Facebook floating dock with hover bouncy animation & labels)
 */
export function ReactionPicker({ 
    onSelect, 
    currentReaction 
}: { 
    onSelect: (type: ReactionType) => void; 
    currentReaction?: string; 
}) {
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 380 }}
            className="absolute bottom-full left-0 mb-2 px-2 py-1.5 bg-white/95 dark:bg-[#1e2029]/95 backdrop-blur-md border border-gray-200/90 dark:border-gray-700/80 rounded-full shadow-2xl flex items-center gap-1 z-50 pointer-events-auto select-none"
        >
            {REACTION_TYPES.map((reaction) => {
                const isHovered = hoveredReaction === reaction.type;
                const isSelected = currentReaction === reaction.type;

                return (
                    <div key={reaction.type} className="relative flex flex-col items-center">
                        {/* Facebook Floating Tooltip Label */}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.85 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 2, scale: 0.85 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute -top-7 px-2 py-0.5 rounded-full bg-black/85 dark:bg-black/95 text-white text-[10px] font-bold tracking-wide pointer-events-none whitespace-nowrap shadow-md z-50"
                                >
                                    {reaction.label}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            type="button"
                            onMouseEnter={() => setHoveredReaction(reaction.type)}
                            onMouseLeave={() => setHoveredReaction(null)}
                            whileHover={{ scale: 1.35, y: -4 }}
                            whileTap={{ scale: 1.15 }}
                            transition={{ type: "spring", stiffness: 450, damping: 18 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(reaction.type);
                            }}
                            className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                                isSelected ? reaction.bg : 'hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-100 dark:active:bg-white/10'
                            }`}
                            aria-label={reaction.label}
                        >
                            <span className="text-xl sm:text-2xl leading-none select-none block filter drop-shadow-xs">
                                {reaction.icon}
                            </span>
                        </motion.button>
                    </div>
                );
            })}
        </motion.div>
    );
}

/**
 * ReactionSummary Component (Facebook Engagement Summary Row)
 * Displays overlapping emoji badges and reaction counter on left (clickable to view reactors modal),
 * and comment / share counts on right (clickable to toggle comments).
 */
export function ReactionSummary({
    reactions = {},
    reactedBy = {},
    commentsCount = 0,
    sharesCount = 0,
    onOpenReactions,
    onOpenComments,
    className = ""
}: {
    reactions?: any;
    reactedBy?: any;
    commentsCount?: number;
    sharesCount?: number;
    onOpenReactions?: () => void;
    onOpenComments?: () => void;
    className?: string;
}) {
    const [showViewer, setShowViewer] = useState(false);

    // Aligned legacy mapping for summary counts
    const legacyMappingGroup: Record<ReactionType, string[]> = useMemo(() => ({
        like: ["clap", "insightful", "relatable", "relate", "wow"],
        love: ["inspired"],
        haha: ["respect"],
        sad: ["cry"],
        angry: ["fire", "powerful"],
        wow: []
    }), []);

    // Calculate aggregated counts including legacy keys
    const aggregatedCounts = useMemo(() => {
        const counts: Record<ReactionType, number> = {
            like: 0,
            love: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0
        };

        REACTION_TYPES.forEach(r => {
            const freshCount = Number(reactions?.[r.type]) || 0;
            const legacyKeys = legacyMappingGroup[r.type] || [];
            const legacyCount = legacyKeys.reduce((sum, key) => sum + (Number(reactions?.[key]) || 0), 0);
            counts[r.type] = freshCount + legacyCount;
        });

        return counts;
    }, [reactions, legacyMappingGroup]);

    const totalReactions = useMemo(() => {
        return Object.entries(reactions || {}).reduce((sum, [key, val]) => {
            return sum + (typeof val === 'number' ? val : 0);
        }, 0);
    }, [reactions]);

    // Top up to 3 reactions to display in the summaries bar (Facebook standard)
    const topReactions = useMemo(() => {
        return REACTION_TYPES
            .map(r => ({ ...r, count: aggregatedCounts[r.type] || 0 }))
            .filter(r => r.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [aggregatedCounts]);

    const hasReactions = totalReactions > 0;
    const hasComments = (commentsCount || 0) > 0;
    const hasShares = (sharesCount || 0) > 0;

    // Do not render empty spacer if no engagement metrics exist
    if (!hasReactions && !hasComments && !hasShares) {
        return null;
    }

    const handleOpenModal = () => {
        if (onOpenReactions) {
            onOpenReactions();
        } else {
            setShowViewer(true);
        }
    };

    return (
        <>
            <div className={`flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 py-1.5 sm:py-2 px-1 select-none min-h-[26px] ${className}`}>
                {/* Left side: Overlapping reactions + total count */}
                {hasReactions ? (
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        className="flex items-center gap-1.5 group/reactors hover:underline focus:outline-hidden transition-all text-left cursor-pointer shrink-0"
                        title="See who reacted"
                    >
                        <div className="flex items-center -space-x-1.5 mr-0.5">
                            {topReactions.map((r, idx) => (
                                <span
                                    key={r.type}
                                    className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full ring-2 ring-white dark:ring-[#1a1b23] flex items-center justify-center text-[10px] sm:text-[11px] bg-gray-100 dark:bg-gray-800 shadow-xs leading-none"
                                    style={{ zIndex: 3 - idx }}
                                    title={r.label}
                                >
                                    {r.icon}
                                </span>
                            ))}
                        </div>
                        <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover/reactors:text-primary transition-colors text-[11px] sm:text-xs">
                            {totalReactions.toLocaleString()}
                        </span>
                    </button>
                ) : (
                    <div />
                )}

                {/* Right side: Comments & Shares count */}
                <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] sm:text-xs shrink-0">
                    {hasComments && (
                        <button
                            type="button"
                            onClick={onOpenComments}
                            className="hover:underline text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
                        </button>
                    )}
                    {hasShares && (
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {sharesCount} {sharesCount === 1 ? "share" : "shares"}
                        </span>
                    )}
                </div>
            </div>

            {/* If managing viewer modal internally */}
            {!onOpenReactions && (
                <ReactionViewerModal 
                    isOpen={showViewer} 
                    onClose={() => setShowViewer(false)} 
                    reactedBy={reactedBy} 
                />
            )}
        </>
    );
}

/**
 * ReactionBtn Component
 * Supports both standalone pill variant (with inline summary for comments/stories)
 * and full Facebook action-bar button variant.
 */
export function ReactionBtn({
    contentId,
    contentType,
    reactions = {},
    reactedBy = {},
    currentUserId,
    onReacted,
    showSummary,
    variant = "pill",
    compact = false,
    className = ""
}: {
    contentId: string;
    contentType: "post" | "story" | "study" | "groupPost" | "comment";
    reactions?: any;
    reactedBy?: any;
    currentUserId?: string;
    onReacted?: () => void;
    showSummary?: boolean;
    variant?: "pill" | "facebook";
    compact?: boolean;
    className?: string;
}) {
    const isFacebook = variant === "facebook";
    const shouldShowSummary = showSummary !== undefined ? showSummary : !isFacebook;

    const [showPicker, setShowPicker] = useState(false);
    const [isReacting, setIsReacting] = useState(false);
    const [showViewer, setShowViewer] = useState(false);
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Debouncing timers for hover
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setShowPicker(true);
    };

    const handleMouseLeave = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = setTimeout(() => {
            setShowPicker(false);
        }, 350);
    };

    // Long-press support for mobile
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    const handleTouchStart = useCallback(() => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setShowPicker(true);
        }, 350);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // Filter used to check current user's reaction (fully aligned legacy mapping)
    const userReaction = useMemo(() => {
        if (!currentUserId) return null;
        
        // Check standard keys
        for (const reaction of REACTION_TYPES) {
            if (reactedBy?.[reaction.type]?.includes(currentUserId)) return reaction.type;
        }

        // Backward compatibility for old reaction keys
        const legacyMap: Record<string, ReactionType> = {
            inspired: "love",
            fire: "angry",
            powerful: "angry",
            clap: "like",
            insightful: "like",
            respect: "haha",
            wow: "like",
            relatable: "like",
            relate: "like",
            cry: "sad"
        };
        
        for (const [legacy, fresh] of Object.entries(legacyMap)) {
            if (reactedBy?.[legacy]?.includes(currentUserId)) return fresh;
        }

        return null;
    }, [reactedBy, currentUserId]);

    const activeReaction = REACTION_TYPES.find(r => r.type === userReaction);

    const handleToggleReaction = async (type: string) => {
        if (!requireVerification("react to content")) return;
        if (!currentUserId) {
            showToast("Please log in or register to react.", "info");
            return;
        }
        if (isReacting) return;
        setIsReacting(true);
        setShowPicker(false);
        try {
            await reactToContent(contentId, type, contentType);
            onReacted?.();
        } catch (err) {
            console.error("Reaction failed:", err);
        } finally {
            setIsReacting(false);
        }
    };

    const handleButtonClick = () => {
        // If it was a long-press, don't trigger the default reaction (picker was opened)
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        // If reacted, clicking un-reacts (toggle off). If unreacted, reacts with "love" by default!
        handleToggleReaction(userReaction || "love");
    };

    // Aligned legacy mapping for summary counts
    const legacyMappingGroup: Record<ReactionType, string[]> = useMemo(() => ({
        like: ["clap", "insightful", "relatable", "relate", "wow"],
        love: ["inspired"],
        haha: ["respect"],
        sad: ["cry"],
        angry: ["fire", "powerful"],
        wow: []
    }), []);

    // Calculate aggregated counts including legacy keys
    const aggregatedCounts = useMemo(() => {
        const counts: Record<ReactionType, number> = {
            like: 0,
            love: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0
        };

        REACTION_TYPES.forEach(r => {
            const freshCount = Number(reactions?.[r.type]) || 0;
            const legacyKeys = legacyMappingGroup[r.type] || [];
            const legacyCount = legacyKeys.reduce((sum, key) => sum + (Number(reactions?.[key]) || 0), 0);
            counts[r.type] = freshCount + legacyCount;
        });

        return counts;
    }, [reactions, legacyMappingGroup]);

    const totalReactions = useMemo(() => {
        return Object.entries(reactions || {}).reduce((sum, [key, val]) => {
            return sum + (typeof val === 'number' ? val : 0);
        }, 0);
    }, [reactions]);

    // Top 2 reactions to display in the standalone summary badge
    const topReactions = useMemo(() => {
        return REACTION_TYPES
            .map(r => ({ ...r, count: aggregatedCounts[r.type] || 0 }))
            .filter(r => r.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 2);
    }, [aggregatedCounts]);

    return (
        <div 
            className={`relative flex items-center group/reaction ${
                isFacebook ? "w-full justify-center" : "gap-1"
            } ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Optional Inline Reaction Summaries (for legacy pill callers) */}
            {shouldShowSummary && (
                <div 
                    className={`flex items-center group/v cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-1.5 py-1 transition-colors ${Number(totalReactions) === 0 ? 'pointer-events-none opacity-0' : ''}`}
                    onClick={() => setShowViewer(true)}
                >
                    <div className="flex -space-x-1 items-center mr-1">
                        {topReactions.map(r => (
                            <span key={r.type} className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 ${r.bg} flex items-center justify-center text-[10px] z-[1]`} title={r.label}>
                                {r.icon}
                            </span>
                        ))}
                    </div>
                    
                    <span className="text-xs font-bold text-gray-500 mr-2 group-hover/v:text-primary transition-colors">
                        {Number(totalReactions) > 0 ? String(totalReactions) : ""}
                    </span>
                </div>
            )}

            <div className={isFacebook ? "w-full relative" : "relative"}>
                <button
                    type="button"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onClick={handleButtonClick}
                    disabled={isReacting}
                    className={
                        isFacebook
                            ? `w-full flex items-center justify-center ${compact ? 'gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1' : 'gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-2'} rounded-xl transition-all duration-150 select-none cursor-pointer active:scale-95 ${
                                activeReaction 
                                    ? `${activeReaction.bg} ${activeReaction.color} font-bold` 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                            } ${isReacting ? 'opacity-60' : ''}`
                            : `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border select-none ${
                                activeReaction
                                    ? `${activeReaction.bg} ${activeReaction.color} border-transparent shadow-xs scale-105`
                                    : "text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            } ${isReacting ? 'opacity-60' : ''}`
                    }
                    title={activeReaction ? `Reacted: ${activeReaction.label}` : "React"}
                >
                    {activeReaction ? (
                        <span className={`${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} leading-none transform transition-transform group-hover/reaction:scale-110`}>
                            {activeReaction.icon}
                        </span>
                    ) : (
                        <Heart size={compact ? 16 : 18} className="shrink-0 transition-transform group-hover/reaction:scale-110" />
                    )}
                    <span className={`${compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-semibold whitespace-nowrap`}>
                        {activeReaction ? activeReaction.label : "React"}
                    </span>
                </button>

                <AnimatePresence>
                    {showPicker && (
                        <>
                            {/* Mobile backdrop to dismiss picker */}
                            <div 
                                className="fixed inset-0 z-40 sm:hidden"
                                onClick={() => setShowPicker(false)}
                                onTouchStart={() => setShowPicker(false)}
                            />
                            <div 
                                className="absolute bottom-full left-0 z-50 px-2 sm:px-0"
                            >
                                <ReactionPicker 
                                    currentReaction={userReaction || undefined}
                                    onSelect={(type) => handleToggleReaction(type)} 
                                />
                            </div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Reactor Viewer Modal (for standalone pill variant) */}
            {shouldShowSummary && (
                <ReactionViewerModal 
                    isOpen={showViewer} 
                    onClose={() => setShowViewer(false)} 
                    reactedBy={reactedBy} 
                />
            )}
        </div>
    );
}

