"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserPlus, UserCheck, Loader2, AtSign, CheckCircle, Search, Shield, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getUserFollowers, getUserFollowing, toggleFollowUser, checkIsFollowing, type FirestoreUser } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    initialTab?: "followers" | "following";
    followersCount: number;
    followingCount: number;
    isLocked?: boolean;
}

export function FollowersModal({
    isOpen,
    onClose,
    userId,
    initialTab = "followers",
    followersCount,
    followingCount,
    isLocked = false
}: FollowersModalProps) {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
    const [followers, setFollowers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [following, setFollowing] = useState<(FirestoreUser & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
    const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setSearchQuery("");
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (!isOpen || !userId) return;

        if (isLocked) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const loadData = async () => {
            try {
                const [followersList, followingList] = await Promise.all([
                    getUserFollowers(userId),
                    getUserFollowing(userId)
                ]);

                if (!isMounted) return;
                setFollowers(followersList);
                setFollowing(followingList);

                // If current user is logged in, check follow status for all returned profiles
                if (currentUser?.uid) {
                    const allUsers = [...followersList, ...followingList];
                    const uniqueUids = Array.from(new Set(allUsers.map(u => u.id).filter(id => id !== currentUser.uid)));
                    
                    const followStatuses = await Promise.all(
                        uniqueUids.map(async (targetUid) => {
                            const isFollowed = await checkIsFollowing(currentUser.uid, targetUid);
                            return { [targetUid]: isFollowed };
                        })
                    );

                    const statusMap = followStatuses.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                    if (isMounted) setFollowingMap(statusMap);
                }
            } catch (err) {
                console.error("Failed to load followers/following:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, userId, currentUser?.uid]);

    const handleToggleFollow = async (targetUid: string) => {
        if (!currentUser?.uid) {
            showToast("Please log in to follow users.", "info");
            return;
        }

        setTogglingMap(prev => ({ ...prev, [targetUid]: true }));
        try {
            const nowFollowing = await toggleFollowUser(currentUser.uid, targetUid);
            setFollowingMap(prev => ({ ...prev, [targetUid]: nowFollowing }));
            showToast(nowFollowing ? "Followed successfully!" : "Unfollowed.", "success");
        } catch (err) {
            console.error("Error toggling follow:", err);
            showToast("Failed to update follow status.", "error");
        } finally {
            setTogglingMap(prev => ({ ...prev, [targetUid]: false }));
        }
    };

    const rawList = activeTab === "followers" ? followers : following;

    const listToRender = useMemo(() => {
        if (!searchQuery.trim()) return rawList;
        const q = searchQuery.toLowerCase().trim();
        return rawList.filter(person => 
            (person.displayName && person.displayName.toLowerCase().includes(q)) ||
            (person.username && person.username.toLowerCase().includes(q)) ||
            (person.role && person.role.toLowerCase().includes(q))
        );
    }, [rawList, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]"
            >
                {/* Header with Tabs */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setActiveTab("followers");
                                setSearchQuery("");
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === "followers"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-gray-500 hover:text-navy-900 dark:hover:text-white"
                            }`}
                        >
                            Followers ({followersCount})
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("following");
                                setSearchQuery("");
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === "following"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-gray-500 hover:text-navy-900 dark:hover:text-white"
                            }`}
                        >
                            Following ({followingCount})
                        </button>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Section */}
                {isLocked ? (
                    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
                            <Shield size={32} />
                        </div>
                        <h4 className="text-base font-black text-navy-900 dark:text-white">
                            Follower List is Protected
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xs leading-relaxed">
                            This user has enabled Profile Lock and restricted their followers and following lists.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Search Bar */}
                        <div className="px-5 pt-3 pb-1">
                            <div className="relative flex items-center">
                                <Search size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Search in ${activeTab}...`}
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/80 rounded-xl text-xs font-medium text-navy-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                            {loading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                                    <Loader2 size={28} className="animate-spin text-primary" />
                                    <span className="text-xs font-black uppercase tracking-widest">Loading profiles...</span>
                                </div>
                            ) : listToRender.length > 0 ? (
                                listToRender.map((person) => {
                                    const isMe = currentUser?.uid === person.id;
                                    const isFollowedByMe = followingMap[person.id];
                                    const isToggling = togglingMap[person.id];
                                    const profileLink = person.username ? `/profile/${person.username}` : `/profile/${person.id}`;
                                    const isFollowBack = activeTab === "followers" && currentUser?.uid === userId && !isFollowedByMe;

                                    return (
                                        <div
                                            key={person.id}
                                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/40 hover:bg-slate-100/80 dark:hover:bg-gray-800/80 transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-gray-700/60"
                                        >
                                            <Link 
                                                href={profileLink} 
                                                onClick={onClose}
                                                className="flex items-center gap-3 min-w-0 flex-1 group"
                                            >
                                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-primary/10 border-2 border-white dark:border-gray-800 shrink-0 relative shadow-sm">
                                                    <Image 
                                                        src={person.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.displayName || "User")}&background=1A56DB&color=fff&size=200`}
                                                        alt={person.displayName || "User"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="text-xs sm:text-sm font-black text-navy-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                                                            {person.displayName}
                                                        </h4>
                                                        {person.roleVerified && (
                                                            <CheckCircle size={12} className="text-primary fill-primary/20 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {person.username && (
                                                            <span className="text-[10px] text-gray-400 font-bold flex items-center">
                                                                <AtSign size={10} className="mr-0.5" />{person.username}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                            {person.role || "student"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>

                                            {!isMe && currentUser && (
                                                <button
                                                    onClick={() => handleToggleFollow(person.id)}
                                                    disabled={isToggling}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 ${
                                                        isFollowedByMe
                                                            ? "bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                                                            : isFollowBack
                                                                ? "bg-primary text-white shadow-sm hover:opacity-90"
                                                                : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                                    }`}
                                                >
                                                    {isToggling ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : isFollowedByMe ? (
                                                        <>
                                                            <UserCheck size={12} />
                                                            <span>Following</span>
                                                        </>
                                                    ) : isFollowBack ? (
                                                        <>
                                                            <UserPlus size={12} />
                                                            <span>Follow Back</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus size={12} />
                                                            <span>Follow</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-14 text-center space-y-2">
                                    <Users size={32} className="mx-auto text-gray-300 dark:text-gray-700" />
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                                        {searchQuery.trim() 
                                            ? `No users found matching "${searchQuery}"`
                                            : (activeTab === "followers" ? "No followers yet" : "Not following anyone yet")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
