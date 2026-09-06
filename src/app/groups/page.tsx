/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, Plus, Globe, Lock, EyeOff, Search, Sparkles, 
    ArrowRight, Loader2, Image as ImageIcon, CheckCircle, ShieldAlert, X,
    Compass, Rss, ChevronRight, TrendingUp, BarChart2, ShieldCheck,
    Pin, Settings, SlidersHorizontal, Check, ChevronLeft,
    LayoutList, LayoutGrid
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { 
    createGroup, joinGroup, leaveGroup, 
    subscribeDiscoverGroups, subscribeMyGroups, 
    subscribeMyGroupFeed, subscribeGroupRequest, type GroupDoc 
} from "@/lib/firestore";
import GroupCreationModal from "@/components/GroupCreationModal";
import GroupPostCard from "@/components/GroupPostCard";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

function GroupJoinAction({
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
            className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-lg transition-all shadow-xs shrink-0 disabled:opacity-50 active:scale-95 flex items-center gap-1"
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
            className="w-full mt-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
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

function GroupRowItem({
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
    const charCode = group.name?.charCodeAt(0) || 0;
    const gradients = [
        "from-blue-600 to-indigo-600",
        "from-emerald-600 to-teal-600",
        "from-purple-600 to-pink-600",
        "from-rose-600 to-orange-600",
        "from-cyan-600 to-blue-600"
    ];
    const gradient = gradients[charCode % gradients.length];

    return (
        <div
            onClick={onClick}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-2xl hover:border-[#1877F2]/40 hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99]"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar / Cover */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} relative overflow-hidden shrink-0 shadow-xs flex items-center justify-center font-black text-white text-base`}>
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
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                            {group.name}
                        </h4>
                        {isPinned && (
                            <Pin size={11} className="text-[#1877F2] fill-[#1877F2] shrink-0 rotate-45" />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {isOwner && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#1877F2]/10 text-[#1877F2] font-black text-[10px] uppercase">
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
                    className={`p-2 rounded-xl transition-all ${
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

function GroupsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const { isScrollingDown } = useScrollDirection();

    // Navigation sections: "my-feed" | "discover" | "my-groups"
    const [activeSection, setActiveSection] = useState<"my-feed" | "discover" | "my-groups">("my-feed");
    
    // Group states
    const [discoverGroups, setDiscoverGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [myGroups, setMyGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarSearch, setSidebarSearch] = useState("");

    // Feed state
    const [groupFeedPosts, setGroupFeedPosts] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);

    // Filter by single group in feed
    const [selectedFeedGroupId, setSelectedFeedGroupId] = useState<string | null>(null);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoining, setIsJoining] = useState<string | null>(null);
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
    const [selectedGroupForPost, setSelectedGroupForPost] = useState<(GroupDoc & { id: string }) | null>(null);

    // Mobile & In-page Groups Filter, Search, and View Mode
    const [myGroupsFilter, setMyGroupsFilter] = useState<"all" | "managed" | "joined" | "pinned">("all");
    const [myGroupsSearch, setMyGroupsSearch] = useState("");
    const [myGroupsViewMode, setMyGroupsViewMode] = useState<"list" | "card">("list");

    // Swipe right to return to NewsFeed College Clubs tab
    const swipeContainerRef = useSwipeGesture<HTMLDivElement>({
        onSwipeRight: () => {
            router.push("/news-feed?tab=club");
        },
        minDistance: 55,
        minVelocity: 0.25,
        disabled: isCreateModalOpen || isGroupSelectorOpen || !!selectedGroupForPost,
        enableHaptics: true
    });

    // Pinned groups in localStorage (Facebook style)
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

    // Clear notification badge
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("ttc_last_seen_group", Date.now().toString());
        }
    }, []);

    // Set tab section from query param on load
    useEffect(() => {
        const sec = searchParams.get("section");
        if (sec === "my-groups" || sec === "discover" || sec === "my-feed") {
            setActiveSection(sec as any);
        }
    }, [searchParams]);

    // Subscriptions
    useEffect(() => {
        setLoading(true);
        const isSiteAdmin = profile?.role === "admin";
        const unsubDiscover = subscribeDiscoverGroups(isSiteAdmin, (groups) => {
            setDiscoverGroups(groups);
            setLoading(false);
        });

        let unsubMy = () => {};
        if (user?.uid) {
            unsubMy = subscribeMyGroups(user.uid, (groups) => {
                setMyGroups(groups);
            });
        } else {
            setMyGroups([]);
        }

        return () => {
            unsubDiscover();
            unsubMy();
        };
    }, [user?.uid, profile?.role]);

    // Group Feed Subscription
    useEffect(() => {
        if (!user?.uid || activeSection !== "my-feed" || myGroups.length === 0) {
            setGroupFeedPosts([]);
            return;
        }
        setLoadingFeed(true);
        const groupIds = selectedFeedGroupId ? [selectedFeedGroupId] : myGroups.map(g => g.id);
        const unsubFeed = subscribeMyGroupFeed(groupIds, (posts) => {
            setGroupFeedPosts(posts);
            setLoadingFeed(false);
        });
        return () => unsubFeed();
    }, [user?.uid, activeSection, myGroups, selectedFeedGroupId]);

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

    // Sidebar filtered groups (when user searches in the left sidebar)
    const sidebarFilteredGroups = useMemo(() => {
        if (!sidebarSearch.trim()) return null;
        const q = sidebarSearch.toLowerCase();
        return myGroups.filter(g => 
            g.name.toLowerCase().includes(q) || 
            (g.description && g.description.toLowerCase().includes(q))
        );
    }, [myGroups, sidebarSearch]);

    // Filtered my groups based on filter chips and search
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

    // Filters for Discover tab
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

    // Suggested Groups
    const suggestedGroups = useMemo(() => {
        return discoverGroups
            .filter((g) => !myGroups.some((mg) => mg.id === g.id))
            .slice(0, 4);
    }, [discoverGroups, myGroups]);

    // Trending Groups
    const trendingGroups = useMemo(() => {
        return [...discoverGroups]
            .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
            .slice(0, 4);
    }, [discoverGroups]);

    const handleJoinGroup = async (group: GroupDoc & { id: string }) => {
        if (!user) {
            showToast("Please log in or register to join groups", "info");
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

    const gradients = [
        "from-blue-600 to-indigo-600",
        "from-emerald-600 to-teal-600",
        "from-purple-600 to-pink-600",
        "from-rose-600 to-orange-600",
        "from-cyan-600 to-blue-600"
    ];

    const getGroupGradient = (name: string) => {
        const charCode = name?.charCodeAt(0) || 0;
        return gradients[charCode % gradients.length];
    };

    return (
        <div 
            ref={swipeContainerRef} 
            className="min-h-screen bg-[#F0F2F5] dark:bg-[#0B0C10] text-gray-900 dark:text-gray-100 transition-colors touch-pan-y"
        >
            
            {/* ─── Mobile Sticky Top Navigation (Facebook Mobile App Header) ─── */}
            <div className={`lg:hidden sticky top-0 md:top-16 z-30 bg-white dark:bg-[#181920] border-b border-gray-200 dark:border-white/10 shadow-xs transition-transform duration-300 ease-in-out ${isScrollingDown ? "max-md:-translate-y-full" : "max-md:translate-y-0"}`}>
                <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <Link
                            href="/news-feed?tab=club"
                            className="p-1 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title="Back to Feed"
                        >
                            <ChevronLeft size={22} />
                        </Link>
                        <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                            Groups
                        </h1>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (requireVerification("create groups")) {
                                    setIsCreateModalOpen(true);
                                }
                            }}
                            className="p-2 bg-blue-50 dark:bg-white/10 text-[#1877F2] dark:text-[#3897F0] rounded-full hover:bg-blue-100 transition-colors"
                            title="Create group"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Mobile Segment Tabs (Your Feed, Your Groups, Discover) */}
                <div className="px-3 py-2 border-t border-gray-150/70 dark:border-white/5 bg-gray-50/50 dark:bg-[#121318]/50">
                    <div className="flex items-center bg-gray-200/70 dark:bg-white/5 p-1 rounded-2xl">
                        {[
                            { id: "my-feed" as const, label: "Your Feed", icon: Rss },
                            { id: "my-groups" as const, label: "Your Groups", icon: Users, count: myGroups.length },
                            { id: "discover" as const, label: "Discover", icon: Compass }
                        ].map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveSection(tab.id);
                                        setSelectedFeedGroupId(null);
                                    }}
                                    className={`relative flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-colors outline-none focus:outline-none focus-visible:outline-none select-none cursor-pointer ${
                                        isActive 
                                            ? "text-[#1877F2] dark:text-white" 
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="mobileActiveTabIndicator" 
                                            className="absolute inset-0 bg-white dark:bg-[#242526] rounded-xl shadow-xs"
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-1.5">
                                        <TabIcon size={14} className={isActive ? "text-[#1877F2]" : "text-gray-400"} />
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                                isActive 
                                                    ? "bg-[#1877F2]/10 text-[#1877F2] dark:bg-[#1877F2]/20 dark:text-blue-400" 
                                                    : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
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

            {/* ─── Facebook-Style Main Layout ─── */}
            <div className="max-w-[1440px] mx-auto px-0 sm:px-4 lg:px-6 py-0 sm:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-6 items-start">
                    
                    {/* ═══════════════════════════════════════════════════
                        LEFT SIDEBAR: Dedicated Facebook Groups Hub
                       ═══════════════════════════════════════════════════ */}
                    <aside className="hidden lg:block lg:col-span-3 bg-white dark:bg-[#181920] rounded-3xl border border-gray-200/80 dark:border-white/10 p-4 shadow-xs sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between px-2 pt-1">
                            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                                Groups
                            </h2>
                            <button
                                onClick={() => setActiveSection("my-groups")}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                                title="Group settings"
                            >
                                <Settings size={19} />
                            </button>
                        </div>

                        {/* Search Bar Input */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={15} />
                            <input 
                                type="text" 
                                placeholder="Search groups"
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[#1877F2]/40 rounded-full text-xs font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                            />
                            {sidebarSearch && (
                                <button 
                                    onClick={() => setSidebarSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Primary Navigation List */}
                        <div className="space-y-1">
                            {/* Your Feed */}
                            <button
                                onClick={() => {
                                    setActiveSection("my-feed");
                                    setSelectedFeedGroupId(null);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                                    activeSection === "my-feed" && !selectedFeedGroupId
                                        ? "bg-blue-50/80 dark:bg-[#1877F2]/15 text-[#1877F2] dark:text-[#3897F0]" 
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                    activeSection === "my-feed" && !selectedFeedGroupId
                                        ? "bg-[#1877F2] text-white shadow-sm"
                                        : "bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                                }`}>
                                    <Rss size={17} />
                                </div>
                                <span className="text-sm font-semibold">Your feed</span>
                            </button>

                            {/* Discover */}
                            <button
                                onClick={() => setActiveSection("discover")}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                                    activeSection === "discover"
                                        ? "bg-blue-50/80 dark:bg-[#1877F2]/15 text-[#1877F2] dark:text-[#3897F0]" 
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                    activeSection === "discover"
                                        ? "bg-[#1877F2] text-white shadow-sm"
                                        : "bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                                }`}>
                                    <Compass size={17} />
                                </div>
                                <span className="text-sm font-semibold">Discover</span>
                            </button>

                            {/* Your Groups */}
                            <button
                                onClick={() => setActiveSection("my-groups")}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                                    activeSection === "my-groups"
                                        ? "bg-blue-50/80 dark:bg-[#1877F2]/15 text-[#1877F2] dark:text-[#3897F0]" 
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                        activeSection === "my-groups"
                                            ? "bg-[#1877F2] text-white shadow-sm"
                                            : "bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                                    }`}>
                                        <Users size={17} />
                                    </div>
                                    <span className="text-sm font-semibold">Your groups</span>
                                </div>
                                {myGroups.length > 0 && (
                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                        {myGroups.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Prominent "+ Create New Group" Pill Button */}
                        <button
                            onClick={() => {
                                if (requireVerification("create groups")) {
                                    setIsCreateModalOpen(true);
                                }
                            }}
                            className="w-full py-2.5 px-4 bg-blue-50 dark:bg-[#1877F2]/15 hover:bg-blue-100 dark:hover:bg-[#1877F2]/25 text-[#1877F2] dark:text-[#3897F0] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98 shadow-2xs"
                        >
                            <Plus size={16} />
                            <span>Create New Group</span>
                        </button>

                        <div className="border-t border-gray-150 dark:border-white/5 pt-3" />

                        {/* Sidebar Search Results (if user is searching) */}
                        {sidebarFilteredGroups && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2">
                                    Matching Groups ({sidebarFilteredGroups.length})
                                </p>
                                {sidebarFilteredGroups.length === 0 ? (
                                    <p className="text-xs text-gray-400 px-2 py-2">No matching groups found.</p>
                                ) : (
                                    sidebarFilteredGroups.map((g) => (
                                        <div
                                            key={g.id}
                                            onClick={() => router.push(`/groups/${g.id}`)}
                                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                        >
                                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase`}>
                                                {g.coverUrl ? <img src={g.coverUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                                                    {g.name}
                                                </h4>
                                                <p className="text-[10px] text-gray-400">{g.memberCount || 0} members</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Normal Sidebar Sections: Groups you manage & Groups you've joined */}
                        {!sidebarFilteredGroups && (
                            <>
                                {/* SECTION: Groups you manage */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Groups you manage
                                        </h3>
                                        {managedGroups.length > 0 && (
                                            <span className="text-[11px] font-semibold text-gray-400">
                                                {managedGroups.length}
                                            </span>
                                        )}
                                    </div>

                                    {managedGroups.length === 0 ? (
                                        <div className="px-2 py-2 text-xs text-gray-400">
                                            <p>You haven&apos;t created any groups yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {managedGroups.map((g) => {
                                                const isPinned = pinnedGroupIds.includes(g.id);
                                                const isSelected = selectedFeedGroupId === g.id && activeSection === "my-feed";
                                                return (
                                                    <div
                                                        key={g.id}
                                                        onClick={() => {
                                                            setActiveSection("my-feed");
                                                            setSelectedFeedGroupId(isSelected ? null : g.id);
                                                        }}
                                                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${
                                                            isSelected 
                                                                ? "bg-blue-50 dark:bg-[#1877F2]/15 text-[#1877F2] dark:text-[#3897F0]" 
                                                                : "hover:bg-gray-100 dark:hover:bg-white/5"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase`}>
                                                                {g.coverUrl ? <img src={g.coverUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                                                                    {g.name}
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 font-medium truncate">
                                                                    Admin • {g.memberCount || 0} members
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => togglePinGroup(g.id, e)}
                                                                className={`p-1.5 rounded-lg transition-all ${
                                                                    isPinned 
                                                                        ? "text-[#1877F2] opacity-100" 
                                                                        : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 dark:hover:text-white"
                                                                }`}
                                                                title={isPinned ? "Unpin group" : "Pin group to top"}
                                                            >
                                                                <Pin size={13} className={isPinned ? "fill-current rotate-45" : ""} />
                                                            </button>

                                                            <Link
                                                                href={`/groups/${g.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 text-gray-400 hover:text-[#1877F2] opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                                                                title="Open group page"
                                                            >
                                                                <ChevronRight size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-150 dark:border-white/5 pt-2" />

                                {/* SECTION: Groups you've joined */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Groups you&apos;ve joined
                                        </h3>
                                        {joinedGroups.length > 0 && (
                                            <button
                                                onClick={() => setActiveSection("my-groups")}
                                                className="text-xs font-semibold text-[#1877F2] dark:text-[#3897F0] hover:underline"
                                            >
                                                See all
                                            </button>
                                        )}
                                    </div>

                                    {joinedGroups.length === 0 ? (
                                        <div className="px-2 py-2 text-xs text-gray-400">
                                            <p>No joined groups yet.</p>
                                            <button 
                                                onClick={() => setActiveSection("discover")}
                                                className="text-[#1877F2] font-bold hover:underline mt-1 inline-block"
                                            >
                                                Find groups to join &rarr;
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {joinedGroups.map((g) => {
                                                const isPinned = pinnedGroupIds.includes(g.id);
                                                const isSelected = selectedFeedGroupId === g.id && activeSection === "my-feed";
                                                return (
                                                    <div
                                                        key={g.id}
                                                        onClick={() => {
                                                            setActiveSection("my-feed");
                                                            setSelectedFeedGroupId(isSelected ? null : g.id);
                                                        }}
                                                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${
                                                            isSelected 
                                                                ? "bg-blue-50 dark:bg-[#1877F2]/15 text-[#1877F2] dark:text-[#3897F0]" 
                                                                : "hover:bg-gray-100 dark:hover:bg-white/5"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase`}>
                                                                {g.coverUrl ? <img src={g.coverUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                                                                    {g.name}
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 font-medium truncate">
                                                                    {g.memberCount || 0} members
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => togglePinGroup(g.id, e)}
                                                                className={`p-1.5 rounded-lg transition-all ${
                                                                    isPinned 
                                                                        ? "text-[#1877F2] opacity-100" 
                                                                        : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 dark:hover:text-white"
                                                                }`}
                                                                title={isPinned ? "Unpin group" : "Pin group to top"}
                                                            >
                                                                <Pin size={13} className={isPinned ? "fill-current rotate-45" : ""} />
                                                            </button>

                                                            <Link
                                                                href={`/groups/${g.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 text-gray-400 hover:text-[#1877F2] opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                                                                title="Open group page"
                                                            >
                                                                <ChevronRight size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </aside>

                    {/* ═══════════════════════════════════════════════════
                        CENTER COLUMN: Recent Activity / Feed / Discover
                       ═══════════════════════════════════════════════════ */}
                    <main className="col-span-12 lg:col-span-6 space-y-4">
                        
                        {/* ─── Center Header: "Recent activity" ─── */}
                        {activeSection === "my-feed" && (
                            <div className="flex items-center justify-between px-3 sm:px-1 pt-2 sm:pt-0">
                                <div>
                                    <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white">
                                        Recent activity
                                    </h2>
                                    {selectedFeedGroupId && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                            <span>Showing posts from</span>
                                            <span className="font-bold text-[#1877F2]">{myGroups.find(g => g.id === selectedFeedGroupId)?.name}</span>
                                            <button 
                                                onClick={() => setSelectedFeedGroupId(null)}
                                                className="text-gray-400 hover:text-red-500 ml-1 font-bold underline"
                                            >
                                                (Clear)
                                            </button>
                                        </p>
                                    )}
                                </div>

                                {selectedFeedGroupId && (
                                    <Link
                                        href={`/groups/${selectedFeedGroupId}`}
                                        className="text-xs font-bold text-[#1877F2] hover:underline flex items-center gap-1"
                                    >
                                        Visit Group &rarr;
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Interactive Composer Trigger (Feed View) */}
                        {activeSection === "my-feed" && user && myGroups.length > 0 && (
                            <div className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs space-y-3">
                                <div className="flex items-center gap-3">
                                    {profile?.photoURL || user.photoURL ? (
                                        <img 
                                            src={profile?.photoURL || user.photoURL || ""} 
                                            alt="" 
                                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1877F2]/20 shrink-0" 
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1877F2] to-blue-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                                            {profile?.displayName?.charAt(0) || "U"}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => setIsGroupSelectorOpen(true)}
                                        className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200/70 dark:hover:bg-white/[0.08] text-gray-500 dark:text-gray-400 rounded-full text-xs sm:text-sm font-medium transition-all"
                                    >
                                        {selectedFeedGroupId 
                                            ? `Write something in ${myGroups.find(g => g.id === selectedFeedGroupId)?.name || "group"}...`
                                            : "Write something in your campus groups..."
                                        }
                                    </button>
                                </div>

                                <div className="flex items-center justify-around pt-2 border-t border-gray-150 dark:border-white/5 text-xs">
                                    <button
                                        onClick={() => setIsGroupSelectorOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-bold"
                                    >
                                        <ImageIcon size={18} className="text-emerald-500" />
                                        <span>Photo / Video</span>
                                    </button>

                                    <button
                                        onClick={() => setIsGroupSelectorOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-bold"
                                    >
                                        <BarChart2 size={18} className="text-blue-500" />
                                        <span>Poll</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── TAB CONTENT SWITCHER ─── */}
                        <AnimatePresence mode="wait">
                            {/* MY FEED TAB */}
                            {activeSection === "my-feed" && (
                                <motion.div 
                                    key="my-feed"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="space-y-4"
                                >
                                    {!user ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xs">
                                            <Lock size={44} className="mx-auto text-gray-400 mb-3" />
                                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Sign In to View Group Posts</h3>
                                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Log in to view posts and discussions from the campus groups you join.</p>
                                            <Link 
                                                href="/login"
                                                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md"
                                            >
                                                Sign In to TTC Network
                                            </Link>
                                        </div>
                                    ) : myGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xs space-y-4">
                                            <Users size={48} className="mx-auto text-[#1877F2]" />
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Join your first group</h3>
                                                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Join study circles, tech clubs, debating societies, and cultural communities to populate your group feed.</p>
                                            </div>
                                            <button 
                                                onClick={() => setActiveSection("discover")}
                                                className="px-6 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#166FE5] transition-all"
                                            >
                                                Discover Groups
                                            </button>
                                        </div>
                                    ) : loadingFeed ? (
                                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                                            <Loader2 size={26} className="animate-spin text-[#1877F2]" />
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading your group feed...</p>
                                        </div>
                                    ) : groupFeedPosts.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xs space-y-3">
                                            <Users size={38} className="mx-auto text-gray-300 dark:text-gray-600" />
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Recent Activity</h3>
                                            <p className="text-xs text-gray-500 max-w-sm mx-auto">Be the first to share an update, start a discussion, or post a question in your groups.</p>
                                            <button
                                                onClick={() => setIsGroupSelectorOpen(true)}
                                                className="px-5 py-2 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#166FE5]"
                                            >
                                                Create First Post
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {groupFeedPosts.map((post) => {
                                                const g = myGroups.find(group => group.id === post.groupId);
                                                const userRole = g && g.creatorId === user?.uid ? "admin" : "member";
                                                return (
                                                    <GroupPostCard 
                                                        key={post.id} 
                                                        post={post} 
                                                        userRole={userRole} 
                                                        isGroupMember={true} 
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* YOUR GROUPS TAB */}
                            {activeSection === "my-groups" && (
                                <motion.div 
                                    key="my-groups"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="space-y-4"
                                >
                                    {/* Header & Controls Bar */}
                                    <div className="bg-white dark:bg-[#181920] p-3.5 sm:p-4 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-xs space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white">
                                                    Your Groups
                                                </h2>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#1877F2]/10 text-[#1877F2]">
                                                    {myGroups.length}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* View Mode Toggle: List vs Card */}
                                                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-0.5 rounded-xl">
                                                    <button
                                                        onClick={() => setMyGroupsViewMode("list")}
                                                        className={`p-1.5 rounded-lg transition-colors ${
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
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            myGroupsViewMode === "card" 
                                                                ? "bg-white dark:bg-[#242526] text-[#1877F2] shadow-xs" 
                                                                : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                                        }`}
                                                        title="Grid view"
                                                    >
                                                        <LayoutGrid size={15} />
                                                    </button>
                                                </div>

                                                {/* Desktop Create Group Button */}
                                                <button
                                                    onClick={() => {
                                                        if (requireVerification("create groups")) {
                                                            setIsCreateModalOpen(true);
                                                        }
                                                    }}
                                                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                                                >
                                                    <Plus size={14} /> Create Group
                                                </button>
                                            </div>
                                        </div>

                                        {/* In-List Search Input */}
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search your groups..."
                                                value={myGroupsSearch}
                                                onChange={(e) => setMyGroupsSearch(e.target.value)}
                                                className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 focus:border-[#1877F2]/40 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                                            />
                                            {myGroupsSearch && (
                                                <button
                                                    onClick={() => setMyGroupsSearch("")}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                                >
                                                    <X size={13} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Segmented Filter Chips */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                                            {[
                                                { id: "all" as const, label: "All", count: myGroups.length },
                                                { id: "managed" as const, label: "👑 Managed", count: managedGroups.length },
                                                { id: "joined" as const, label: "🤝 Joined", count: joinedGroups.length },
                                                { id: "pinned" as const, label: "📌 Pinned", count: pinnedGroupIds.filter(id => myGroups.some(g => g.id === id)).length },
                                            ].map((chip) => {
                                                const isActive = myGroupsFilter === chip.id;
                                                return (
                                                    <button
                                                        key={chip.id}
                                                        onClick={() => setMyGroupsFilter(chip.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
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

                                    {/* Content View */}
                                    {!user ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8">
                                            <Lock size={44} className="mx-auto text-gray-300 mb-3" />
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Sign In Required</h3>
                                            <p className="text-xs text-gray-400 mt-1">Log in to view and manage your campus groups.</p>
                                        </div>
                                    ) : myGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8 space-y-3">
                                            <Users size={44} className="mx-auto text-gray-300 mb-2" />
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Groups Joined Yet</h3>
                                            <p className="text-xs text-gray-400">Discover and join campus communities to collaborate with peers.</p>
                                            <button
                                                onClick={() => setActiveSection("discover")}
                                                className="px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-md"
                                            >
                                                Discover Groups
                                            </button>
                                        </div>
                                    ) : filteredMyGroups.length === 0 ? (
                                        <div className="text-center py-12 bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 space-y-2">
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {myGroupsSearch ? `No groups match "${myGroupsSearch}"` : "No groups in this filter"}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setMyGroupsSearch("");
                                                    setMyGroupsFilter("all");
                                                }}
                                                className="text-xs font-bold text-[#1877F2] hover:underline"
                                            >
                                                Reset filters
                                            </button>
                                        </div>
                                    ) : myGroupsViewMode === "list" ? (
                                        /* COMPACT SOCIAL LIST VIEW (DEFAULT FOR MOBILE) */
                                        <div className="space-y-4">
                                            {/* When showing "all" and no search, show categorized sections */}
                                            {myGroupsFilter === "all" && !myGroupsSearch.trim() ? (
                                                <>
                                                    {/* Section: Pinned Groups (if any) */}
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

                                                    {/* Section: Groups you manage */}
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

                                                    {/* Section: Groups you've joined */}
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
                                                /* Flat filtered list */
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
                                        /* REFINED GRID/CARD VIEW */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            {filteredMyGroups.map((g) => {
                                                const isOwner = g.creatorId === user?.uid || profile?.role === "admin";
                                                const isPinned = pinnedGroupIds.includes(g.id);
                                                return (
                                                    <div 
                                                        key={g.id}
                                                        onClick={() => router.push(`/groups/${g.id}`)}
                                                        className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col group relative active:scale-[0.99]"
                                                    >
                                                        {/* Cover Photo */}
                                                        <div className={`h-20 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
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
                                                                className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md transition-all ${
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
                                                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                                                            <div>
                                                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-[#1877F2] transition-colors line-clamp-1">
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

                            {/* DISCOVER TAB */}
                            {activeSection === "discover" && (
                                <motion.div 
                                    key="discover"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="space-y-4"
                                >
                                    {/* Discover Search Bar Input */}
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search groups by name, keyword, or campus..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-[#181920] border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#1877F2]/20 shadow-xs text-gray-900 dark:text-white"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Discover Header */}
                                    <div className="flex items-center justify-between px-1">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                            {searchQuery ? `Search Results (${filteredDiscoverGroups.length})` : "Suggested for You"}
                                        </h2>
                                    </div>

                                    {loading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-44 bg-white dark:bg-[#181920] rounded-2xl border border-gray-200 dark:border-white/10 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredDiscoverGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#181920] border border-gray-200 dark:border-white/10 rounded-3xl p-8 space-y-2">
                                            <Users size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No Groups Found</h3>
                                            <p className="text-xs text-gray-400">Try searching for another topic or create your own group.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {filteredDiscoverGroups.map((g) => (
                                                <div 
                                                    key={g.id}
                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                    className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group"
                                                >
                                                    {/* Cover Section */}
                                                    <div className={`h-24 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
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
                                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                                        <div>
                                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#1877F2] transition-colors line-clamp-1">
                                                                {g.name}
                                                            </h3>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                                {g.memberCount || 0} Members
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
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
                        </AnimatePresence>
                    </main>

                    {/* ═══════════════════════════════════════════════════
                        RIGHT SIDEBAR: Suggested & Trending Communities
                       ═══════════════════════════════════════════════════ */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-24">
                        
                        {/* Suggested Groups to Join */}
                        <div className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-[#1877F2]" /> Suggested for you
                                </h3>
                                <button
                                    onClick={() => setActiveSection("discover")}
                                    className="text-[11px] font-bold text-[#1877F2] hover:underline"
                                >
                                    See all
                                </button>
                            </div>

                            {suggestedGroups.length === 0 ? (
                                <p className="text-xs text-gray-400 py-3 text-center">No new suggestions right now.</p>
                            ) : (
                                <div className="space-y-2">
                                    {suggestedGroups.map((g) => (
                                        <div 
                                            key={g.id}
                                            onClick={() => router.push(`/groups/${g.id}`)}
                                            className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-black text-white uppercase`}>
                                                    {g.coverUrl ? <img src={g.coverUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                                                        {g.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400">
                                                        {g.memberCount || 0} members
                                                    </p>
                                                </div>
                                            </div>
                                            <GroupJoinAction 
                                                group={g}
                                                userId={user?.uid}
                                                isJoined={myGroups.some(mg => mg.id === g.id)}
                                                isJoining={isJoining === g.id}
                                                onJoin={() => handleJoinGroup(g)}
                                                layout="compact"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Trending Communities */}
                        <div className="bg-white dark:bg-[#181920] border border-gray-200/80 dark:border-white/10 rounded-3xl p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-[#1877F2]" /> Popular on Campus
                                </h3>
                            </div>

                            <div className="space-y-1.5">
                                {trendingGroups.map((g, idx) => (
                                    <div 
                                        key={g.id}
                                        onClick={() => router.push(`/groups/${g.id}`)}
                                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <span className="text-xs font-black text-gray-400 w-4 text-center">
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#1877F2] transition-colors">
                                                {g.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {g.memberCount || 0} active members
                                            </p>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Campus Guidelines Notice */}
                        <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-[#1877F2]/10 rounded-3xl p-4 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-[#1877F2] font-bold">
                                <ShieldCheck size={16} /> Campus Groups Policy
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                Groups are self-moderated by campus student leaders. Keep discussions respectful and aligned with college academic values.
                            </p>
                        </div>
                    </aside>

                </div>
            </div>

            {/* ─── Modals ─── */}
            <GroupCreationModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Joined Group Selector Modal (when tapping composer) */}
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
                            {/* Header */}
                            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Post to a Group</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Select which group to share your update with</p>
                                </div>
                                <button
                                    onClick={() => setIsGroupSelectorOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="p-4 overflow-y-auto space-y-2 flex-1">
                                {myGroups.map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            setSelectedGroupForPost(g);
                                            setIsGroupSelectorOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] hover:bg-blue-50 dark:hover:bg-white/10 hover:text-[#1877F2] border border-gray-200/50 dark:border-white/5 transition-all text-left group"
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

export default function GroupsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0C10]">
                <Loader2 className="animate-spin text-[#1877F2]" size={28} />
            </div>
        }>
            <GroupsPageInner />
        </Suspense>
    );
}
