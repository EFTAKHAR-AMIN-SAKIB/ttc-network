"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, Shield, UserPlus, UserCheck } from "lucide-react";

interface LockedFeedStateProps {
    displayName?: string;
    isFollowing?: boolean;
    onFollowClick?: () => void;
    isFollowLoading?: boolean;
    isLockedForEveryone?: boolean;
}

export function LockedFeedState({
    displayName = "This user",
    isFollowing = false,
    onFollowClick,
    isFollowLoading = false,
    isLockedForEveryone = false,
}: LockedFeedStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full py-14 sm:py-16 px-6 rounded-3xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 flex flex-col items-center justify-center text-center shadow-xs"
        >
            {/* Lock Badge */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 border border-blue-100 dark:border-blue-900/50">
                <Lock className="w-7 h-7 stroke-[2]" />
            </div>

            {/* Typography */}
            <h3 className="text-base sm:text-lg font-bold text-navy-950 dark:text-white tracking-tight">
                {isLockedForEveryone ? "Posts & Activities are Private" : "Posts & Activities are Protected"}
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
                {isLockedForEveryone
                    ? "This profile is completely private. Posts, stories, and activities are hidden from everyone."
                    : `Only followers can see posts, stories, and activities from ${displayName}.`
                }
            </p>

            {/* Follow Action (Only when not locked for everyone) */}
            {onFollowClick && !isLockedForEveryone && (
                <div className="mt-6">
                    <button
                        onClick={onFollowClick}
                        disabled={isFollowLoading}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all ${
                            isFollowing
                                ? "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        }`}
                    >
                        {isFollowing ? (
                            <>
                                <UserCheck size={14} />
                                <span>Following</span>
                            </>
                        ) : (
                            <>
                                <UserPlus size={14} />
                                <span>Follow {displayName}</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Private indicator when locked for everyone */}
            {isLockedForEveryone && (
                <div className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    <Shield size={13} />
                    <span>Private to All</span>
                </div>
            )}
        </motion.div>
    );
}
