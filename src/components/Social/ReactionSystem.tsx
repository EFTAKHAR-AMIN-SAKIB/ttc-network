"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { reactToContent } from "@/lib/firestore";
import ReactionViewerModal from "./ReactionViewerModal";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

/* ─── Reaction Types (Unified) ─── */
export const REACTION_TYPES = [
    { type: "love", icon: "❤️", label: "Love", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
    { type: "relatable", icon: "🤝", label: "Relatable", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { type: "respect", icon: "🫡", label: "Respect", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { type: "cry", icon: "😢", label: "Cry", color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
    { type: "angry", icon: "😡", label: "Angry", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
] as const;

export type ReactionType = typeof REACTION_TYPES[number]["type"];

/**
 * ReactionPicker Component
 */
export function ReactionPicker({ onSelect, currentReaction }: { onSelect: (type: ReactionType) => void, currentReaction?: string }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-0 mb-2 p-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl flex items-center gap-1 z-50 pointer-events-auto reaction-picker-shadow"
        >
            {REACTION_TYPES.map((reaction) => (
                <button
                    key={reaction.type}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(reaction.type);
                    }}
                    className={`p-2.5 hover:scale-125 active:scale-110 transition-transform duration-200 rounded-xl ${currentReaction === reaction.type ? reaction.bg : 'hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700'}`}
                    title={reaction.label}
                >
                    <span className="text-xl leading-none">{reaction.icon}</span>
                </button>
            ))}
        </motion.div>
    );
}

/**
 * ReactionBtn Component (Generic)
 * Desktop: hover to see picker, click to toggle default reaction
 * Mobile: tap to toggle default, long-press (400ms) to open picker
 */
export function ReactionBtn({
    contentId,
    contentType,
    reactions = {},
    reactedBy = {},
    currentUserId,
    onReacted
}: {
    contentId: string;
    contentType: "post" | "story" | "study" | "groupPost" | "comment";
    reactions?: any;
    reactedBy?: any;
    currentUserId?: string;
    onReacted?: () => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const [isReacting, setIsReacting] = useState(false);
    const [showViewer, setShowViewer] = useState(false);
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Long-press support for mobile
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    const handleTouchStart = useCallback(() => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setShowPicker(true);
        }, 400);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // Filter used to check current user's reaction
    const userReaction = useMemo(() => {
        if (!currentUserId) return null;
        
        // Check standard keys
        for (const reaction of REACTION_TYPES) {
            if (reactedBy?.[reaction.type]?.includes(currentUserId)) return reaction.type;
        }

        // Backward compatibility for old reaction keys
        const legacyMap: Record<string, string> = {
            inspired: "love",
            fire: "angry",
            clap: "respect",
            wow: "relatable",
            powerful: "angry",
            insightful: "respect"
        };
        
        for (const [legacy, fresh] of Object.entries(legacyMap)) {
            if (reactedBy?.[legacy]?.includes(currentUserId)) return fresh as ReactionType;
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
        // If it was a long-press, don't trigger the default reaction (picker was shown)
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        handleToggleReaction(userReaction || "love");
    };

    const totalReactions = Object.values(reactions || {}).reduce((a: any, b: any) => a + (typeof b === 'number' ? b : 0), 0);

    return (
        <div className="relative flex items-center gap-1 group/reaction">
            {/* Reaction Summaries - Clickable to see who reacted */}
            <div 
                className={`flex items-center group/v cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-1.5 py-1 transition-colors ${Number(totalReactions) === 0 ? 'pointer-events-none opacity-0' : ''}`}
                onClick={() => setShowViewer(true)}
            >
                <div className="flex -space-x-1 items-center mr-1">
                    {REACTION_TYPES.map(r => {
                        const count = reactions?.[r.type] || 0;
                        // Also count legacy keys that map to this new type
                        const legacyKeys: string[] = r.type === "love" ? ["inspired"] : 
                                        r.type === "angry" ? ["fire", "powerful"] : 
                                        r.type === "respect" ? ["clap", "insightful"] : 
                                        r.type === "relatable" ? ["wow"] : [];
                        const legacyTotal = legacyKeys.reduce((sum, k) => sum + (reactions?.[k] || 0), 0);
                        const totalForThisEmoji = count + legacyTotal;
                        
                        return totalForThisEmoji > 0 ? (
                            <span key={r.type} className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 ${r.bg} flex items-center justify-center text-[10px] z-[1]`} title={r.label}>
                                {r.icon}
                            </span>
                        ) : null;
                    })}
                </div>
                
                <span className="text-xs font-bold text-gray-500 mr-2 group-hover/v:text-primary transition-colors">
                    {Number(totalReactions) > 0 ? String(totalReactions) : ""}
                </span>
            </div>

            <div className="relative">
                <button
                    onMouseEnter={() => setShowPicker(true)}
                    onMouseLeave={() => setTimeout(() => setShowPicker(false), 500)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onClick={handleButtonClick}
                    disabled={isReacting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border select-none ${
                        activeReaction
                            ? `${activeReaction.bg} ${activeReaction.color} border-transparent shadow-sm scale-105`
                            : "text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    } ${isReacting ? 'opacity-60' : ''}`}
                >
                    {activeReaction ? (
                        <span className="text-sm">{activeReaction.icon}</span>
                    ) : (
                        <Heart size={16} />
                    )}
                    <span>{activeReaction ? activeReaction.label : "React"}</span>
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
                                onMouseEnter={() => setShowPicker(true)}
                                onMouseLeave={() => setShowPicker(false)}
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

            {/* Reactor Viewer Modal */}
            <ReactionViewerModal 
                isOpen={showViewer} 
                onClose={() => setShowViewer(false)} 
                reactedBy={reactedBy} 
            />
        </div>
    );
}
