/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, Plus, Globe, Lock, Search, Sparkles, 
    ArrowRight, Loader2, Image as ImageIcon, X,
    Compass, Rss, ChevronRight, BarChart2,
    Pin, LayoutList, LayoutGrid
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { 
    joinGroup, subscribeGroupRequest, 
    type GroupDoc 
} from "@/lib/firestore";
import GroupCreationModal from "@/components/GroupCreationModal";
import GroupPostCard from "@/components/GroupPostCard";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";

const gradients = [
    "from-blue-600 to-indigo-600",
    "from-emerald-600 to-teal-600",
    "from-purple-600 to-pink-600",
    "from-rose-600 to-orange-600",
    "from-cyan-600 to-blue-600"
];

export const getGroupGradient = (name: string) => {
    const charCode = name?.charCodeAt(0) || 0;
    return gradients[charCode % gradients.length];
};

export function GroupJoinAction({
    group,
    userId,
    isJoined,
    isJoining,
    onJoin,
    layout = "compact"
}: {
    group: any;
    userId?: string;
    isJoined: boolean;
    isJoining: boolean;
    onJoin: () => void;
    layout?: "compact" | "full";
}) {
    const [request, setRequest] = useState<any>(null);

    useEffect(() => {
        if (!userId || !group.id || group.privacyType === "public" || isJoined) {
            setRequest(null);
            return;
        }
        return subscribeGroupRequest(group.id, userId, (req) => {
            setRequest(req);
        });
    }, [group.id, userId, group.privacyType, isJoined]);

    if (isJoined) {
        return layout === "compact" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0 border border-emerald-200 dark:border-emerald-500/20">
                Member
            </span>
        ) : (
            <div className="w-full mt-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl text-center border border-emerald-200 dark:border-emerald-500/20">
                Joined Member
            </div>
        );
    }

    if (request && request.status === "pending") {
        return layout === "compact" ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg shrink-0 animate-pulse border border-amber-200 dark:border-amber-500/20">
                Pending
            </span>
        ) : (
            <div className="w-full mt-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider rounded-xl text-center animate-pulse border border-amber-200 dark:border-amber-500/20">
                Request Pending
            </div>
        );
    }

    return layout === "compact" ? (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onJoin();
            }}
            disabled={isJoining}
            className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-lg transition-all shadow-xs shrink-0 disabled:opacity-50 active:scale-95 flex items-center gap-1 cursor-pointer"
        >
            {isJoining ? (
                <Loader2 size={12} className="animate-spin" />
            ) : (
                group.privacyType === "public" ? "Join" : "Request"
            )}
        </button>
    ) : (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onJoin();
            }}
            disabled={isJoining}
            className="w-full mt-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98 cursor-pointer"
        >
            {isJoining ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <>
                    {group.privacyType === "public" ? "Join Group" : "Request to Join"} <ArrowRight size={13} />
                </>
            )}
        </button>
    );
}

export function GroupRowItem({
    group,
    isOwner,
    isPinned,
    onTogglePin,
    onClick,
}: {
    group: any;
    isOwner: boolean;
    isPinned: boolean;
    onTogglePin: (e: React.MouseEvent) => void;
    onClick: () => void;
}) {
    const gradient = getGroupGradient(group.name);

    return (
        <div
            onClick={onClick}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl hover:border-[#1877F2]/40 hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99]"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar / Cover */}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr ${gradient} relative overflow-hidden shrink-0 shadow-xs flex items-center justify-center font-black text-white text-base`}>
                    {group.coverUrl ? (
                        <img src={group.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        (group.name || "G").charAt(0).toUpperCase()
                    )}
                    {/* Mini privacy badge overlay */}
                    <div className="absolute bottom-0.5 right-0.5 bg-black/60 backdrop-blur-xs p-0.5 rounded text-white">
                        {group.privacyType === "public" ? <Globe size={8} /> : <Lock size={8} />}
                    </div>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                            {group.name}
                        </h4>
                        {isPinned && (
                            <Pin size={11} className="text-[#1877F2] fill-[#1877F2] shrink-0 rotate-45" />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {isOwner && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#1877F2]/10 text-[#1877F2] font-black text-[9px] sm:text-[10px] uppercase">
                                Admin
                            </span>
                        )}
                        <span>{group.memberCount || 1} {group.memberCount === 1 ? "member" : "members"}</span>
                        <span>•</span>
                        <span className="capitalize">{group.privacyType || "Public"}</span>
                    </div>
                </div>
            </div>

            {/* Actions: Pin button and Chevron */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                    type="button"
                    onClick={onTogglePin}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isPinned 
                            ? "text-[#1877F2] bg-blue-50 dark:bg-[#1877F2]/15" 
                            : "text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                    title={isPinned ? "Unpin group" : "Pin group to top"}
                >
                    <Pin size={14} className={isPinned ? "fill-current rotate-45" : ""} />
                </button>

                <div className="p-1 text-gray-400 group-hover:text-[#1877F2] group-hover:translate-x-0.5 transition-transform">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    );
}

interface NewsFeedGroupsHubProps {
    myGroups: (GroupDoc & { id: string })[];
    discoverGroups: (GroupDoc & { id: string })[];
    groupFeedPosts: any[];
    loadingFeed?: boolean;
    loadingDiscover?: boolean;
    activeSection?: "my-feed" | "discover" | "my-groups";
    onSectionChange?: (section: "my-feed" | "discover" | "my-groups") => void;
    onGroupCreated?: (groupId: string) => void;
}

export default function NewsFeedGroupsHub({
    myGroups,
    discoverGroups,
    groupFeedPosts,
    loadingFeed = false,
    loadingDiscover = false,
    activeSection: controlledSection,
    onSectionChange,
    onGroupCreated
}: NewsFeedGroupsHubProps) {
    const router = useRouter();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Internal active section fallback
    const [localSection, setLocalSection] = useState<"my-feed" | "discover" | "my-groups">("my-feed");
    const activeSection = controlledSection ?? localSection;
    const handleSectionSelect = (sec: "my-feed" | "discover" | "my-groups") => {
        if (onSectionChange) {
            onSectionChange(sec);
        } else {
            setLocalSection(sec);
        }
    };

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
    const [selectedGroupForPost, setSelectedGroupForPost] = useState<(GroupDoc & { id: string }) | null>(null);
    const [isJoining, setIsJoining] = useState<string | null>(null);

    // Discover search
    const [searchQuery, setSearchQuery] = useState("");

    // Your groups search, filter & view mode
    const [myGroupsSearch, setMyGroupsSearch] = useState("");
    const [myGroupsFilter, setMyGroupsFilter] = useState<"all" | "managed" | "joined" | "pinned">("all");
    const [myGroupsViewMode, setMyGroupsViewMode] = useState<"list" | "card">("list");

    // Pinned groups
    const [pinnedGroupIds, setPinnedGroupIds] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("ttc_pinned_groups");
                return saved ? JSON.parse(saved) : [];
            } catch {
                return [];
            }
        }
        return [];
    });

    const togglePinGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPinnedGroupIds(prev => {
            const next = prev.includes(groupId) 
                ? prev.filter(id => id !== groupId) 
                : [...prev, groupId];
            if (typeof window !== "undefined") {
                localStorage.setItem("ttc_pinned_groups", JSON.stringify(next));
            }
            showToast(next.includes(groupId) ? "Pinned group to top" : "Unpinned group", "info");
            return next;
        });
    };

    // Partition groups into Managed vs Joined
    const managedGroups = useMemo(() => {
        const list = myGroups.filter(g => g.creatorId === user?.uid || profile?.role === "admin");
        return list.sort((a, b) => {
            const aPin = pinnedGroupIds.includes(a.id);
            const bPin = pinnedGroupIds.includes(b.id);
            if (aPin && !bPin) return -1;
            if (!aPin && bPin) return 1;
            return (b.memberCount || 0) - (a.memberCount || 0);
        });
    }, [myGroups, user?.uid, profile?.role, pinnedGroupIds]);

    const joinedGroups = useMemo(() => {
        const list = myGroups.filter(g => g.creatorId !== user?.uid && profile?.role !== "admin");
        return list.sort((a, b) => {
            const aPin = pinnedGroupIds.includes(a.id);
            const bPin = pinnedGroupIds.includes(b.id);
            if (aPin && !bPin) return -1;
            if (!aPin && bPin) return 1;
            return (b.memberCount || 0) - (a.memberCount || 0);
        });
    }, [myGroups, user?.uid, profile?.role, pinnedGroupIds]);

    // Filtered my groups
    const filteredMyGroups = useMemo(() => {
        let list = myGroups;
        if (myGroupsFilter === "managed") {
            list = managedGroups;
        } else if (myGroupsFilter === "joined") {
            list = joinedGroups;
        } else if (myGroupsFilter === "pinned") {
            list = myGroups.filter(g => pinnedGroupIds.includes(g.id));
        }

        if (myGroupsSearch.trim()) {
            const q = myGroupsSearch.toLowerCase();
            list = list.filter(g => 
                g.name.toLowerCase().includes(q) || 
                (g.description && g.description.toLowerCase().includes(q))
            );
        }

        return list;
    }, [myGroups, managedGroups, joinedGroups, pinnedGroupIds, myGroupsFilter, myGroupsSearch]);

    // Filtered discover groups
    const filteredDiscoverGroups = useMemo(() => {
        return discoverGroups.filter((g) => {
            const isJoined = myGroups.some((mg) => mg.id === g.id);
            if (isJoined && !searchQuery.trim()) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    g.name.toLowerCase().includes(q) || 
                    (g.description && g.description.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [discoverGroups, myGroups, searchQuery]);

    // Count of new unjoined groups available to discover
    const unjoinedDiscoverCount = useMemo(() => {
        return discoverGroups.filter((g) => !myGroups.some((mg) => mg.id === g.id)).length;
    }, [discoverGroups, myGroups]);

    // Check if user is already a member of all available campus groups
    const hasJoinedAllGroups = useMemo(() => {
        return discoverGroups.length > 0 && discoverGroups.every((g) => myGroups.some((mg) => mg.id === g.id));
    }, [discoverGroups, myGroups]);

    const handleJoinGroup = async (group: GroupDoc & { id: string }) => {
        if (!user) {
            showToast("Please log in to join groups", "info");
            return;
        }
        if (!requireVerification("join groups")) return;
        setIsJoining(group.id);

        try {
            const res = await joinGroup(group.id);
            if (res.status === "joined") {
                showToast(`Successfully joined "${group.name}"`, "success");
            } else {
                showToast(`Request sent to join "${group.name}"`, "info");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to join group", "error");
        } finally {
            setIsJoining(null);
        }
    };

    const handleOpenComposer = () => {
        if (!requireVerification("post in groups")) return;
        if (myGroups.length === 0) {
            showToast("Join a group first to post in campus groups.", "info");
            handleSectionSelect("discover");
            return;
        }

        if (myGroups.length === 1) {
            setSelectedGroupForPost(myGroups[0]);
        } else {
            setIsGroupSelectorOpen(true);
        }
    };

    const userName = profile?.displayName || user?.displayName || "";
    const rawFirstName = userName ? userName.split(" ")[0] : "";
    const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : "";

    return (
        <div className="space-y-4">
            
            {/* ─── GROUPS HUB HEADER CONTROL BAR ─── */}
            <div className="bg-white dark:bg-[#161822] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] flex items-center justify-center font-black shrink-0 shadow-inner">
                            <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white truncate">
                                    Campus Groups
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1877F2]/10 text-[#1877F2] shrink-0">
                                    {myGroups.length}
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate hidden sm:block">
                                Circles, student batches, and peer communities
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => {
                                if (requireVerification("create groups")) {
                                    setIsCreateModalOpen(true);
                                }
                            }}
                            className="px-3 sm:px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5] active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <Plus size={14} className="sm:w-[15px] sm:h-[15px]" /> 
                            <span className="hidden sm:inline">Create Group</span>
                            <span className="sm:hidden">Create</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs: Your Feed | Discover | Your Groups */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/70">
                    <div className="flex items-center bg-gray-100/90 dark:bg-[#111218] p-1 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 gap-1 overflow-x-auto no-scrollbar">
                        {[
                            { id: "my-feed" as const, mobileLabel: "Feed", desktopLabel: "Your Feed", icon: Rss },
                            { id: "discover" as const, mobileLabel: "Discover", desktopLabel: "Discover", icon: Compass, count: unjoinedDiscoverCount > 0 ? unjoinedDiscoverCount : undefined },
                            { id: "my-groups" as const, mobileLabel: "Your Groups", desktopLabel: "Your Groups", icon: Users, count: myGroups.length },
                        ].map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleSectionSelect(tab.id)}
                                    className={`relative flex-auto py-2 sm:py-2.5 px-2 sm:px-3.5 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wide rounded-xl transition-all cursor-pointer select-none whitespace-nowrap min-w-0 ${
                                        isActive 
                                            ? "text-[#1877F2] dark:text-white" 
                                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="groupsHubSubTabIndicator" 
                                            className="absolute inset-0 bg-white dark:bg-[#252836] rounded-xl shadow-xs border border-gray-200/60 dark:border-white/10"
                                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center justify-center gap-1.5 shrink-0">
                                        <TabIcon size={14} className={`shrink-0 ${isActive ? "text-[#1877F2] dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
                                        <span className="hidden sm:inline shrink-0">{tab.desktopLabel}</span>
                                        <span className="sm:hidden shrink-0">{tab.mobileLabel}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 min-w-[18px] text-center rounded-full font-black shrink-0 leading-none ${
                                                isActive 
                                                    ? "bg-[#1877F2]/15 text-[#1877F2] dark:bg-[#1877F2]/30 dark:text-blue-300" 
                                                    : "bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── SECTION CONTENT ─── */}
            <AnimatePresence mode="wait">
                
                {/* 1. YOUR FEED SECTION */}
                {activeSection === "my-feed" && (
                    <motion.div
                        key="feed-section"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-4 pb-24 sm:pb-16"
                    >
                        {/* Group Post Composer Trigger */}
                        {user && myGroups.length > 0 && (
                            <div className="bg-white dark:bg-[#161822] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-black text-[#1877F2] text-sm sm:text-base overflow-hidden shadow-inner shrink-0">
                                        {profile?.photoURL ? (
                                            <img src={profile.photoURL} alt={userName} className="w-full h-full object-cover" />
                                        ) : (
                                            (userName || "U").charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    <button
                                        onClick={handleOpenComposer}
                                        className="flex-1 text-left px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-gray-700/60 text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-semibold transition-all group/btn cursor-pointer min-w-0"
                                    >
                                        <span className="group-hover/btn:text-gray-700 dark:group-hover/btn:text-gray-200 transition-colors truncate block">
                                            {firstName ? `Write something in your campus groups, ${firstName}?` : "Share a note, question, or update in your groups..."}
                                        </span>
                                    </button>
                                </div>

                                <div className="pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800/70 flex items-center justify-between gap-2">
                                    <button
                                        onClick={handleOpenComposer}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <ImageIcon size={15} className="text-emerald-500 shrink-0" />
                                        <span>Photo / Media</span>
                                    </button>
                                    <button
                                        onClick={handleOpenComposer}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <BarChart2 size={15} className="text-blue-500 shrink-0" />
                                        <span>Group Poll</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Group Feed Stream */}
                        <div className="space-y-4 sm:space-y-5">
                            {loadingFeed ? (
                                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                                    <Loader2 size={26} className="animate-spin text-[#1877F2]" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading campus group posts...</p>
                                </div>
                            ) : groupFeedPosts.length > 0 ? (
                                groupFeedPosts.map((gp) => (
                                    <GroupPostCard
                                        key={gp.id}
                                        post={gp}
                                        userRole={profile?.role === "admin" ? "admin" : "member"}
                                        isGroupMember={myGroups.some(g => g.id === gp.groupId)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-14 sm:py-16 px-5 sm:px-6 bg-white dark:bg-[#161822] rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col items-center">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-[#1877F2] flex items-center justify-center mb-4 ring-8 ring-blue-500/5">
                                        <Users size={28} className="sm:w-8 sm:h-8" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {myGroups.length === 0 
                                            ? "Join Campus Groups to See Posts" 
                                            : "No group activity yet"
                                        }
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                        {myGroups.length === 0 
                                            ? "Discover study circles, tech clubs, departmental batches, and cultural societies across all TTC colleges."
                                            : "Your groups are quiet right now. Share the first discussion, question, or announcement!"}
                                    </p>
                                    <div className="mt-5 sm:mt-6 flex flex-wrap gap-3 justify-center">
                                        {myGroups.length === 0 ? (
                                            <button
                                                onClick={() => handleSectionSelect("discover")}
                                                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                Discover Groups <ArrowRight size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleOpenComposer}
                                                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Plus size={14} /> Write First Post
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 2. DISCOVER GROUPS SECTION */}
                {activeSection === "discover" && (
                    <motion.div
                        key="discover-section"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-4 pb-24 sm:pb-16"
                    >
                        {/* Search Bar Input */}
                        <div className="relative">
                            <Search className="absolute left-3.5 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search groups by name, keyword, or campus..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#1877F2]/20 shadow-xs text-gray-900 dark:text-white placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Discover Header */}
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {searchQuery ? `Search Results (${filteredDiscoverGroups.length})` : `Explore Campus Groups (${filteredDiscoverGroups.length})`}
                            </h3>
                        </div>

                        {loadingDiscover ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-48 bg-white dark:bg-[#161822] rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse" />
                                ))}
                            </div>
                        ) : filteredDiscoverGroups.length === 0 ? (
                            searchQuery.trim() ? (
                                <div className="text-center py-14 sm:py-16 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3">
                                    <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-1" />
                                    <h3 className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300">
                                        No groups match "{searchQuery}"
                                    </h3>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        Try searching for another topic or create your own community group.
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (requireVerification("create groups")) {
                                                setIsCreateModalOpen(true);
                                            }
                                        }}
                                        className="mt-2 px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#166FE5] transition-all cursor-pointer"
                                    >
                                        Create a Group
                                    </button>
                                </div>
                            ) : hasJoinedAllGroups ? (
                                <div className="space-y-4">
                                    <div className="text-center py-8 sm:py-10 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                            <Sparkles size={24} />
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">
                                            You're All Caught Up!
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                                            You are already a member of all campus groups. Explore them below or manage your memberships in Your Groups.
                                        </p>
                                        <div className="flex flex-wrap gap-2.5 justify-center pt-1">
                                            <button
                                                onClick={() => handleSectionSelect("my-groups")}
                                                className="px-4 py-2 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#166FE5] transition-all cursor-pointer"
                                            >
                                                Manage Your Groups
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (requireVerification("create groups")) {
                                                        setIsCreateModalOpen(true);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                            >
                                                Create New Group
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 px-1">
                                            All Campus Groups ({discoverGroups.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            {discoverGroups.map((g) => (
                                                <div 
                                                    key={g.id}
                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                    className="bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group active:scale-[0.99]"
                                                >
                                                    {/* Cover Section */}
                                                    <div className={`h-24 sm:h-28 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
                                                        {g.coverUrl && (
                                                            <img src={g.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/20" />
                                                        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white border border-white/10">
                                                            {g.privacyType === "public" ? <Globe size={11} /> : <Lock size={11} />}
                                                            <span className="capitalize">{g.privacyType}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Details Section */}
                                                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                                                        <div>
                                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#1877F2] transition-colors line-clamp-1">
                                                                {g.name}
                                                            </h3>
                                                            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                                                                {g.memberCount || 1} {g.memberCount === 1 ? "Member" : "Members"}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed min-h-[32px]">
                                                                {g.description || "Campus group for students and educators."}
                                                            </p>
                                                        </div>

                                                        <GroupJoinAction 
                                                            group={g}
                                                            userId={user?.uid}
                                                            isJoined={true}
                                                            isJoining={isJoining === g.id}
                                                            onJoin={() => handleJoinGroup(g)}
                                                            layout="full"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-14 sm:py-16 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3">
                                    <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-1" />
                                    <h3 className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300">
                                        No Discoverable Groups
                                    </h3>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        Be the first student leader to create a campus group!
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (requireVerification("create groups")) {
                                                setIsCreateModalOpen(true);
                                            }
                                        }}
                                        className="mt-2 px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#166FE5] transition-all cursor-pointer"
                                    >
                                        Create a Group
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {filteredDiscoverGroups.map((g) => (
                                    <div 
                                        key={g.id}
                                        onClick={() => router.push(`/groups/${g.id}`)}
                                        className="bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group active:scale-[0.99]"
                                    >
                                        {/* Cover Section */}
                                        <div className={`h-24 sm:h-28 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
                                            {g.coverUrl && (
                                                <img src={g.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                            )}
                                            <div className="absolute inset-0 bg-black/20" />
                                            <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white border border-white/10">
                                                {g.privacyType === "public" ? <Globe size={11} /> : <Lock size={11} />}
                                                <span className="capitalize">{g.privacyType}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Details Section */}
                                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#1877F2] transition-colors line-clamp-1">
                                                    {g.name}
                                                </h3>
                                                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                                                    {g.memberCount || 1} {g.memberCount === 1 ? "Member" : "Members"}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed min-h-[32px]">
                                                    {g.description || "Campus group for students and educators."}
                                                </p>
                                            </div>

                                            <GroupJoinAction 
                                                group={g}
                                                userId={user?.uid}
                                                isJoined={myGroups.some(mg => mg.id === g.id)}
                                                isJoining={isJoining === g.id}
                                                onJoin={() => handleJoinGroup(g)}
                                                layout="full"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* 3. YOUR GROUPS MANAGEMENT SECTION */}
                {activeSection === "my-groups" && (
                    <motion.div
                        key="my-groups-section"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-4 pb-24 sm:pb-16"
                    >
                        {/* Header & Controls Bar */}
                        <div className="bg-white dark:bg-[#161822] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-black tracking-tight text-gray-900 dark:text-white">
                                        Manage Your Groups
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#1877F2]/10 text-[#1877F2]">
                                        {myGroups.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* View Mode Toggle: List vs Card */}
                                    <div className="flex items-center bg-gray-100 dark:bg-white/5 p-0.5 rounded-xl">
                                        <button
                                            onClick={() => setMyGroupsViewMode("list")}
                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                myGroupsViewMode === "list" 
                                                    ? "bg-white dark:bg-[#242526] text-[#1877F2] shadow-xs" 
                                                    : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                            }`}
                                            title="List view"
                                        >
                                            <LayoutList size={15} />
                                        </button>
                                        <button
                                            onClick={() => setMyGroupsViewMode("card")}
                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                myGroupsViewMode === "card" 
                                                    ? "bg-white dark:bg-[#242526] text-[#1877F2] shadow-xs" 
                                                    : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                            }`}
                                            title="Grid view"
                                        >
                                            <LayoutGrid size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* In-List Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search your groups..."
                                    value={myGroupsSearch}
                                    onChange={(e) => setMyGroupsSearch(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-8 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 focus:border-[#1877F2]/40 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                                />
                                {myGroupsSearch && (
                                    <button
                                        onClick={() => setMyGroupsSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Segmented Filter Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                                {[
                                    { id: "all" as const, label: "All", count: myGroups.length },
                                    { id: "managed" as const, label: "Managed", count: managedGroups.length },
                                    { id: "joined" as const, label: "Joined", count: joinedGroups.length },
                                    { id: "pinned" as const, label: "Pinned", count: pinnedGroupIds.filter(id => myGroups.some(g => g.id === id)).length },
                                ].map((chip) => {
                                    const isActive = myGroupsFilter === chip.id;
                                    return (
                                        <button
                                            key={chip.id}
                                            onClick={() => setMyGroupsFilter(chip.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                                isActive 
                                                    ? "bg-[#1877F2] text-white shadow-xs" 
                                                    : "bg-gray-100 hover:bg-gray-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300"
                                            }`}
                                        >
                                            <span>{chip.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                                isActive ? "bg-white/20 text-white" : "bg-gray-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                                            }`}>
                                                {chip.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* List vs Grid View */}
                        {myGroups.length === 0 ? (
                            <div className="text-center py-14 sm:py-16 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3">
                                <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">No Groups Joined Yet</h3>
                                <p className="text-xs text-gray-400 max-w-sm mx-auto">Discover and join campus communities to collaborate with peers.</p>
                                <button
                                    onClick={() => handleSectionSelect("discover")}
                                    className="px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                                >
                                    Discover Groups
                                </button>
                            </div>
                        ) : filteredMyGroups.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl sm:rounded-3xl p-6 space-y-2">
                                <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {myGroupsSearch ? `No groups match "${myGroupsSearch}"` : "No groups in this filter"}
                                </p>
                                <button
                                    onClick={() => {
                                        setMyGroupsSearch("");
                                        setMyGroupsFilter("all");
                                    }}
                                    className="text-xs font-bold text-[#1877F2] hover:underline cursor-pointer"
                                >
                                    Reset filters
                                </button>
                            </div>
                        ) : myGroupsViewMode === "list" ? (
                            /* COMPACT LIST VIEW */
                            <div className="space-y-4">
                                {myGroupsFilter === "all" && !myGroupsSearch.trim() ? (
                                    <>
                                        {/* Pinned Groups */}
                                        {myGroups.filter(g => pinnedGroupIds.includes(g.id)).length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-1.5 px-1 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                    <Pin size={12} className="rotate-45 text-[#1877F2]" />
                                                    <span>Pinned Groups</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {myGroups.filter(g => pinnedGroupIds.includes(g.id)).map((g) => {
                                                        const isOwner = g.creatorId === user?.uid || profile?.role === "admin";
                                                        return (
                                                            <GroupRowItem
                                                                key={g.id}
                                                                group={g}
                                                                isOwner={isOwner}
                                                                isPinned={true}
                                                                onTogglePin={(e) => togglePinGroup(g.id, e)}
                                                                onClick={() => router.push(`/groups/${g.id}`)}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Managed Groups */}
                                        {managedGroups.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                        Groups you manage ({managedGroups.length})
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {managedGroups.map((g) => {
                                                        const isPinned = pinnedGroupIds.includes(g.id);
                                                        return (
                                                            <GroupRowItem
                                                                key={g.id}
                                                                group={g}
                                                                isOwner={true}
                                                                isPinned={isPinned}
                                                                onTogglePin={(e) => togglePinGroup(g.id, e)}
                                                                onClick={() => router.push(`/groups/${g.id}`)}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Joined Groups */}
                                        {joinedGroups.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                        Groups you&apos;ve joined ({joinedGroups.length})
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {joinedGroups.map((g) => {
                                                        const isPinned = pinnedGroupIds.includes(g.id);
                                                        return (
                                                            <GroupRowItem
                                                                key={g.id}
                                                                group={g}
                                                                isOwner={false}
                                                                isPinned={isPinned}
                                                                onTogglePin={(e) => togglePinGroup(g.id, e)}
                                                                onClick={() => router.push(`/groups/${g.id}`)}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Flat Filtered List */
                                    <div className="space-y-2">
                                        {filteredMyGroups.map((g) => {
                                            const isOwner = g.creatorId === user?.uid || profile?.role === "admin";
                                            const isPinned = pinnedGroupIds.includes(g.id);
                                            return (
                                                <GroupRowItem
                                                    key={g.id}
                                                    group={g}
                                                    isOwner={isOwner}
                                                    isPinned={isPinned}
                                                    onTogglePin={(e) => togglePinGroup(g.id, e)}
                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* GRID/CARD VIEW */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                {filteredMyGroups.map((g) => {
                                    const isOwner = g.creatorId === user?.uid || profile?.role === "admin";
                                    const isPinned = pinnedGroupIds.includes(g.id);
                                    return (
                                        <div 
                                            key={g.id}
                                            onClick={() => router.push(`/groups/${g.id}`)}
                                            className="bg-white dark:bg-[#161822] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col group relative active:scale-[0.99]"
                                        >
                                            {/* Cover Photo */}
                                            <div className={`h-20 sm:h-24 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
                                                {g.coverUrl && (
                                                    <img src={g.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                )}
                                                <div className="absolute inset-0 bg-black/20" />
                                                
                                                <div className="absolute bottom-2 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white border border-white/10">
                                                    {g.privacyType === "public" ? <Globe size={10} /> : <Lock size={10} />}
                                                    <span className="capitalize">{g.privacyType}</span>
                                                </div>

                                                {isOwner && (
                                                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#1877F2] text-white text-[10px] font-bold rounded-md shadow-sm">
                                                        Admin
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={(e) => togglePinGroup(g.id, e)}
                                                    className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
                                                        isPinned 
                                                            ? "bg-[#1877F2] text-white" 
                                                            : "bg-black/40 text-white/80 hover:text-white"
                                                    }`}
                                                    title={isPinned ? "Unpin group" : "Pin group"}
                                                >
                                                    <Pin size={12} className={isPinned ? "fill-current rotate-45" : ""} />
                                                </button>
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-[#1877F2] transition-colors line-clamp-1">
                                                        {g.name}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {g.memberCount || 1} {g.memberCount === 1 ? "Member" : "Members"}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-1 leading-relaxed">
                                                        {g.description || "Campus group for students."}
                                                    </p>
                                                </div>

                                                <div className="w-full py-1.5 bg-gray-50 dark:bg-white/5 group-hover:bg-[#1877F2] group-hover:text-white text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1">
                                                    <span>View Group</span> <ArrowRight size={11} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── MODALS ─── */}
            <GroupCreationModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(groupId) => {
                    setIsCreateModalOpen(false);
                    onGroupCreated?.(groupId);
                }}
            />

            {/* Joined Group Selector Modal */}
            <AnimatePresence>
                {isGroupSelectorOpen && (
                    <div 
                        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setIsGroupSelectorOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#181920] border border-gray-150 dark:border-white/10 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 dark:text-white">Post to a Group</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Select which campus group to share with</p>
                                </div>
                                <button
                                    onClick={() => setIsGroupSelectorOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
                                {myGroups.map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            setSelectedGroupForPost(g);
                                            setIsGroupSelectorOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] hover:bg-blue-50 dark:hover:bg-white/10 hover:text-[#1877F2] border border-gray-200/50 dark:border-white/5 transition-all text-left group cursor-pointer"
                                    >
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase`}>
                                            {g.coverUrl ? <img src={g.coverUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#1877F2] transition-colors truncate">
                                                {g.name}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                {g.memberCount || 0} members
                                            </p>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 group-hover:text-[#1877F2] transition-all shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Group Post Creation Modal */}
            {selectedGroupForPost && (
                <GroupPostCreationModal
                    isOpen={!!selectedGroupForPost}
                    onClose={() => setSelectedGroupForPost(null)}
                    groupId={selectedGroupForPost.id}
                    groupName={selectedGroupForPost.name}
                />
            )}

        </div>
    );
}
