"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, Plus, Globe, Lock, EyeOff, Search, Sparkles, 
    ArrowRight, Loader2, Image as ImageIcon, CheckCircle, ShieldAlert, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { 
    createGroup, joinGroup, leaveGroup, 
    subscribeDiscoverGroups, subscribeMyGroups, 
    subscribeMyGroupFeed, subscribeGroupRequest, type GroupDoc 
} from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import GroupCreationModal from "@/components/GroupCreationModal";
import GroupPostCard from "@/components/GroupPostCard";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";

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
            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg shrink-0 font-bold">
                Member
            </span>
        ) : (
            <div className="w-full mt-4 py-2.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl text-center font-bold">
                Joined Member
            </div>
        );
    }

    if (request && request.status === "pending") {
        return layout === "compact" ? (
            <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-lg shrink-0 animate-pulse font-bold">
                Requested
            </span>
        ) : (
            <div className="w-full mt-4 py-2.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-xl text-center animate-pulse font-bold">
                Pending Approval
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
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shrink-0 disabled:opacity-50 font-bold"
        >
            {isJoining ? (
                <Loader2 size={10} className="animate-spin" />
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
            className="w-full mt-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-primary hover:text-white dark:hover:bg-primary text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 font-bold shadow-sm"
        >
            {isJoining ? (
                <Loader2 size={12} className="animate-spin" />
            ) : (
                <>
                    {group.privacyType === "public" ? "Join Group" : "Request to Join"} <ArrowRight size={12} />
                </>
            )}
        </button>
    );
}

function GroupsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Main tabs: "my-feed" | "my-groups" | "discover"
    const [activeSection, setActiveSection] = useState<"my-feed" | "my-groups" | "discover">("my-feed");
    
    // Group states
    const [discoverGroups, setDiscoverGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [myGroups, setMyGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Feed state
    const [groupFeedPosts, setGroupFeedPosts] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoining, setIsJoining] = useState<string | null>(null);
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
    const [selectedGroupForPost, setSelectedGroupForPost] = useState<(GroupDoc & { id: string }) | null>(null);

    // Clear notification badge and load section
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
        const groupIds = myGroups.map(g => g.id);
        const unsubFeed = subscribeMyGroupFeed(groupIds, (posts) => {
            setGroupFeedPosts(posts);
            setLoadingFeed(false);
        });
        return () => unsubFeed();
    }, [user?.uid, activeSection, myGroups]);

    // Filters and search logic
    const filteredDiscoverGroups = useMemo(() => {
        return discoverGroups.filter((g) => {
            // Hide already joined groups from discover list
            const isJoined = myGroups.some((mg) => mg.id === g.id);
            if (isJoined) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    g.name.toLowerCase().includes(q) || 
                    g.description.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [discoverGroups, myGroups, searchQuery]);

    // Suggested Groups: groups with mutual matching (e.g. from the same college context or active)
    const suggestedGroups = useMemo(() => {
        return discoverGroups
            .filter((g) => !myGroups.some((mg) => mg.id === g.id))
            .slice(0, 3);
    }, [discoverGroups, myGroups]);

    // Trending Groups: groups with the highest memberCount
    const trendingGroups = useMemo(() => {
        return [...discoverGroups]
            .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
            .slice(0, 3);
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

    // Predefined gradient backgrounds for cards without covers
    const gradients = [
        "from-blue-600 to-indigo-600",
        "from-emerald-600 to-teal-600",
        "from-purple-600 to-pink-600",
        "from-rose-600 to-orange-600",
        "from-cyan-600 to-blue-600"
    ];

    const getGroupGradient = (name: string) => {
        const charCode = name.charCodeAt(0) || 0;
        return gradients[charCode % gradients.length];
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117]">
            {/* Header */}
            <header className="bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 pt-10 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 max-w-5xl mx-auto">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Collaborate & Connect</span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Campus Groups</h1>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => {
                                    if (requireVerification("create groups")) {
                                        setIsCreateModalOpen(true);
                                    }
                                }}
                                className="px-6 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Create New Group
                            </button>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed max-w-lg mb-8 opacity-70 max-w-5xl mx-auto">
                        Find your niche. Study groups, debating circles, photography clubs, and student forums — create a digital home for every activity on campus.
                    </p>
                </div>
            </header>

            {/* Navigation Switcher */}
            <div className="sticky top-16 z-40 bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner w-fit">
                        <button 
                            onClick={() => router.push("/news-feed?tab=event")}
                            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                        >
                            Global Feed
                        </button>
                        <button 
                            onClick={() => router.push("/news-feed?tab=club")}
                            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                        >
                            College Clubs
                        </button>
                        <button 
                            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xl transition-all"
                        >
                            Groups
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <main className={`mx-auto px-4 py-8 transition-all duration-300 ${
                activeSection === "discover" ? "max-w-5xl" : "max-w-2xl"
            }`}>
                <div className="space-y-6">
                        
                        {/* Section tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-800 pb-px gap-6">
                            {[
                                { id: "my-feed", label: "My Feed" },
                                { id: "my-groups", label: "My Groups" },
                                { id: "discover", label: "Discover Groups" }
                            ].map((sec) => (
                                <button
                                    key={sec.id}
                                    onClick={() => setActiveSection(sec.id as any)}
                                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative ${
                                        activeSection === sec.id 
                                            ? "border-primary text-primary" 
                                            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                                >
                                    {sec.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENTS */}
                        <AnimatePresence mode="wait">
                            {/* MY FEED TAB */}
                            {activeSection === "my-feed" && (
                                <motion.div 
                                    key="my-feed"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {user && myGroups.length > 0 && (
                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-4 shadow-sm flex items-center gap-3">
                                            <img 
                                                src={profile?.photoURL || user.photoURL || ""} 
                                                alt="" 
                                                className="w-10 h-10 rounded-full object-cover shrink-0" 
                                            />
                                            <button 
                                                onClick={() => setIsGroupSelectorOpen(true)}
                                                className="flex-1 text-left px-5 py-3 bg-gray-50 dark:bg-[#23242f]/40 hover:bg-gray-100 dark:hover:bg-[#23242f]/80 text-gray-400 dark:text-gray-500 rounded-2xl text-xs font-semibold transition-all border border-gray-100/50 dark:border-gray-850/50"
                                            >
                                                Write something to your groups...
                                            </button>
                                        </div>
                                    )}

                                    {!user ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                            <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Sign In Required</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Log in to view your personalized group feed.</p>
                                        </div>
                                    ) : myGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                            <Users size={48} className="mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Joined Groups</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Join some groups first to see updates in your feed!</p>
                                            <button 
                                                onClick={() => setActiveSection("discover")}
                                                className="mt-4 px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                            >
                                                Discover Groups
                                            </button>
                                        </div>
                                    ) : loadingFeed ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 size={24} className="animate-spin text-primary" />
                                        </div>
                                    ) : groupFeedPosts.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                            <Users size={48} className="mx-auto text-gray-400 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Posts Yet</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Nothing has been posted in your groups yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
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

                            {/* DISCOVER TAB */}
                            {activeSection === "discover" && (
                                <motion.div 
                                    key="discover"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    {/* Suggested & Trending Side-by-Side Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Suggested Groups */}
                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-primary animate-pulse" /> Suggested Groups
                                                </h3>
                                                {suggestedGroups.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic py-4">No recommendations available</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {suggestedGroups.map((g) => (
                                                            <div 
                                                                key={g.id}
                                                                onClick={() => router.push(`/groups/${g.id}`)}
                                                                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-black/10 hover:bg-gray-100/50 dark:hover:bg-black/20 border border-gray-100/50 dark:border-gray-800/50 transition-all cursor-pointer group"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} relative overflow-hidden shrink-0`}>
                                                                        {g.coverUrl && <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors truncate">{g.name}</h4>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{g.memberCount || 0} members</p>
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
                                        </div>

                                        {/* Trending Groups */}
                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                                                    <Users size={14} className="text-primary" /> Trending Groups
                                                </h3>
                                                {trendingGroups.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic py-4">No trending groups yet</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {trendingGroups.map((g) => {
                                                            const isJoined = myGroups.some((mg) => mg.id === g.id);
                                                            return (
                                                                <div 
                                                                    key={g.id}
                                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-black/10 hover:bg-gray-100/50 dark:hover:bg-black/20 border border-gray-100/50 dark:border-gray-800/50 transition-all cursor-pointer group"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} relative overflow-hidden shrink-0`}>
                                                                            {g.coverUrl && <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors truncate">{g.name}</h4>
                                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{g.memberCount || 0} members</p>
                                                                        </div>
                                                                    </div>
                                                                    <GroupJoinAction 
                                                                        group={g}
                                                                        userId={user?.uid}
                                                                        isJoined={isJoined}
                                                                        isJoining={isJoining === g.id}
                                                                        onJoin={() => handleJoinGroup(g)}
                                                                        layout="compact"
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Search Bar section */}
                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Discover More Groups</h3>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                            <input 
                                                type="text" 
                                                placeholder="Search groups by name or description..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary shadow-sm text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-48 bg-white dark:bg-[#1a1b23] rounded-3xl border border-gray-100 dark:border-gray-800 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredDiscoverGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8">
                                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Groups Found</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Try refining your search or create your own group!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {filteredDiscoverGroups.map((g) => (
                                                <div 
                                                    key={g.id}
                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group"
                                                >
                                                    {/* Cover Section */}
                                                    <div className={`h-24 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
                                                        {g.coverUrl && (
                                                            <img src={g.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/10" />
                                                        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[8px] uppercase font-black text-white border border-white/10 tracking-widest">
                                                            {g.privacyType === "public" ? <Globe size={10} /> : <Lock size={10} />}
                                                            {g.privacyType}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Details Section */}
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{g.name}</h3>
                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{g.memberCount || 0} Members</p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">{g.description || "No description provided."}</p>
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

                            {/* MY GROUPS TAB */}
                            {activeSection === "my-groups" && (
                                <motion.div 
                                    key="my-groups"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    {!user ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8">
                                            <Lock size={48} className="mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Sign In Required</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Log in to view your joined campus groups.</p>
                                        </div>
                                    ) : myGroups.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8">
                                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Groups Joined Yet</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">Explore Discover tab to find active groups!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            {myGroups.map((g) => (
                                                <div 
                                                    key={g.id}
                                                    onClick={() => router.push(`/groups/${g.id}`)}
                                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group"
                                                >
                                                    {/* Cover Section */}
                                                    <div className={`h-24 bg-gradient-to-r ${getGroupGradient(g.name)} relative flex items-center justify-center shrink-0`}>
                                                        {g.coverUrl && (
                                                            <img src={g.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/10" />
                                                        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[8px] uppercase font-black text-white border border-white/10 tracking-widest">
                                                            {g.privacyType === "public" ? <Globe size={10} /> : <Lock size={10} />}
                                                            {g.privacyType}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Details Section */}
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{g.name}</h3>
                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{g.memberCount || 0} Members</p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">{g.description || "No description provided."}</p>
                                                        </div>

                                                        {/* Go to Group Button */}
                                                        <div className="w-full mt-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1">
                                                            View Group <ArrowRight size={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}


                        </AnimatePresence>
                </div>
            </main>

            <GroupCreationModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Joined Group Selector Modal */}
            <AnimatePresence>
                {isGroupSelectorOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 w-full max-w-md rounded-[2rem] shadow-2xl relative overflow-hidden max-h-[80vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Post to a Group</h3>
                                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Select one of your joined groups</p>
                                </div>
                                <button
                                    onClick={() => setIsGroupSelectorOpen(false)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 dark:bg-[#1c1e27] hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/5 border border-gray-100/50 dark:border-gray-800/50 hover:border-primary/20 transition-all text-left group"
                                    >
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} relative overflow-hidden shrink-0`}>
                                            {g.coverUrl && <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors truncate uppercase tracking-tight">{g.name}</h4>
                                            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">{g.memberCount || 0} members</p>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-300 dark:text-gray-700 group-hover:translate-x-0.5 group-hover:text-primary transition-all shrink-0" />
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117]">
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        }>
            <GroupsPageInner />
        </Suspense>
    );
}
