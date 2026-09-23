"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Lock, UserPlus, UserCheck, Settings, ChevronRight } from "lucide-react";

interface ProfileLockBannerProps {
    displayName: string;
    isOwner?: boolean;
    isFollowing?: boolean;
    onFollowClick?: () => void;
    onManageClick?: () => void;
    isFollowLoading?: boolean;
    isPeerAllowed?: boolean;
    collegeName?: string;
    isLockedForEveryone?: boolean;
    gender?: string;
}

export function ProfileLockBanner({
    displayName,
    isOwner = false,
    isFollowing = false,
    onFollowClick,
    onManageClick,
    isFollowLoading = false,
    isPeerAllowed = false,
    collegeName,
    isLockedForEveryone = false,
    gender,
}: ProfileLockBannerProps) {
    // Determine singular possessive pronoun ("his" / "her")
    const isFemale = gender === "female" || gender === "women" || gender === "woman";
    const pronoun = isFemale ? "her" : "his";

    // Generate clean, grammatically correct title and description
    const title = isOwner
        ? (isLockedForEveryone ? "Your profile is locked for everyone" : "You locked your profile")
        : `${displayName} locked ${pronoun} profile`;

    const description = isOwner
        ? (isLockedForEveryone
            ? "Your photos, posts, and credentials are completely private and hidden from everyone, including followers."
            : "Only your followers can see your full photos, posts, and personal details.")
        : isLockedForEveryone
            ? "This profile is completely private. Photos, posts, and personal details are hidden from everyone."
            : isPeerAllowed
                ? `You have access as a member of ${collegeName || "the same college"}. Personal contact details remain private.`
                : `Only ${pronoun} followers can see full photos, posts, and contact information.`;

    const badgeLabel = isLockedForEveryone
        ? "Private"
        : isPeerAllowed
            ? "College Peer View"
            : "Followers Only";

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full mb-6 relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 p-4 sm:p-5 shadow-xs"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Shield Icon + Text */}
                <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                    <div className="relative shrink-0 mt-0.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm">
                            <Shield className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-800 text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-xs">
                            <Lock className="w-2.5 h-2.5" />
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-navy-950 dark:text-white tracking-tight">
                                {title}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                {badgeLabel}
                            </span>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0 w-full sm:w-auto flex items-center justify-end">
                    {isOwner ? (
                        <button
                            onClick={onManageClick}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:border-blue-400 text-navy-900 dark:text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                        >
                            <Settings size={14} className="text-blue-600 dark:text-blue-400" />
                            <span>Manage Lock</span>
                            <ChevronRight size={13} className="text-gray-400" />
                        </button>
                    ) : !isLockedForEveryone && (
                        <button
                            onClick={onFollowClick}
                            disabled={isFollowLoading}
                            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all ${
                                isFollowing
                                    ? "bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200"
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
                                    <span>Follow to Unlock</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
