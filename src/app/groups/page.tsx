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
    type GroupDoc 
} from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";

function GroupsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Main tabs: "discover" | "my-groups" | "create"
    const [activeSection, setActiveSection] = useState<"discover" | "my-groups" | "create">("discover");
    
    // Group states
    const [discoverGroups, setDiscoverGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [myGroups, setMyGroups] = useState<(GroupDoc & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Create Group Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [privacyType, setPrivacyType] = useState<"public" | "private" | "secret">("public");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState<string | null>(null);

    // Set tab section from query param on load
    useEffect(() => {
        const sec = searchParams.get("section");
        if (sec === "my-groups" || sec === "create" || sec === "discover") {
            setActiveSection(sec);
        }
    }, [searchParams]);

    // Subscriptions
    useEffect(() => {
        setLoading(true);
        const unsubDiscover = subscribeDiscoverGroups((groups) => {
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
    }, [user?.uid]);

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

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("Cover image must be under 5MB", "error");
            return;
        }
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!requireVerification("create groups")) return;

        setIsCreating(true);
        try {
            let coverUrl = "";
            if (coverFile) {
                coverUrl = await uploadFile("group-covers", coverFile);
            }

            const groupId = await createGroup({
                name: name.trim(),
                description: description.trim(),
                coverUrl,
                privacyType
            });

            showToast("Group created successfully!", "success");
            setName("");
            setDescription("");
            setCoverFile(null);
            setCoverPreview(null);
            router.push(`/groups/${groupId}`);
        } catch (err) {
            console.error("Create group failed:", err);
            showToast("Failed to create group.", "error");
        } finally {
            setIsCreating(false);
        }
    };

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
                                        setActiveSection("create");
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
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left/Main Column */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Section tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-800 pb-px gap-6">
                            {[
                                { id: "discover", label: "Discover Groups" },
                                { id: "my-groups", label: "My Groups" },
                                { id: "create", label: "Create Group" }
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
                            {/* DISCOVER TAB */}
                            {activeSection === "discover" && (
                                <motion.div 
                                    key="discover"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {/* Search Bar */}
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

                                                        {/* Join Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleJoinGroup(g);
                                                            }}
                                                            disabled={isJoining === g.id}
                                                            className="w-full mt-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-primary hover:text-white dark:hover:bg-primary text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-1"
                                                        >
                                                            {isJoining === g.id ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <>
                                                                    Join Group <ArrowRight size={12} />
                                                                </>
                                                            )}
                                                        </button>
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

                            {/* CREATE GROUP TAB */}
                            {activeSection === "create" && (
                                <motion.div 
                                    key="create"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm"
                                >
                                    <form onSubmit={handleCreateGroup} className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                                Group Name
                                            </label>
                                            <input 
                                                type="text" 
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. Dhaka TTC Study Circle, Debate Society..."
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-1 focus:ring-primary text-gray-800 dark:text-gray-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                                Group Description
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="What is this group about? Share guidelines or goals..."
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-xs outline-none focus:ring-1 focus:ring-primary h-32 resize-none text-gray-800 dark:text-gray-200 font-semibold"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Privacy Selector */}
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
                                                    Privacy Setting
                                                </label>
                                                <div className="space-y-2">
                                                    {[
                                                        { id: "public", label: "Public Group", desc: "Anyone can join, post, and view content.", icon: Globe },
                                                        { id: "private", label: "Private Group", desc: "Anyone can request, approval required.", icon: Lock },
                                                        { id: "secret", label: "Secret Group", desc: "Hidden, join only via invite token link.", icon: EyeOff },
                                                    ].map((item) => {
                                                        const Icon = item.icon;
                                                        const isSelected = privacyType === item.id;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={item.id}
                                                                onClick={() => setPrivacyType(item.id as any)}
                                                                className={`w-full text-left p-3 rounded-2xl border flex items-start gap-3 transition-all ${
                                                                    isSelected 
                                                                        ? "border-primary bg-primary/5 text-primary" 
                                                                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                                                }`}
                                                            >
                                                                <Icon size={16} className="shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-tight">{item.label}</p>
                                                                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 normal-case">{item.desc}</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Cover Image Uploader */}
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
                                                    Cover Photo (Optional)
                                                </label>
                                                <div className="relative rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/10 h-[155px] flex flex-col items-center justify-center p-4 overflow-hidden group">
                                                    {coverPreview ? (
                                                        <>
                                                            <img src={coverPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                            <ImageIcon size={28} className="text-gray-400 dark:text-gray-500 mb-2 group-hover:scale-110 transition-transform" />
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Upload Cover Image</span>
                                                            <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 mt-1 uppercase tracking-widest">Supports JPG, PNG</span>
                                                            <input 
                                                                type="file" 
                                                                accept="image/*"
                                                                onChange={handleCoverChange}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isCreating || !name.trim()}
                                            className="w-full py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                        >
                                            {isCreating ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} /> Creating Group...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} /> Complete Registration
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column / Sidebars */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* SUGGESTED GROUPS */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-primary" /> Suggested Groups
                            </h3>
                            {suggestedGroups.length === 0 ? (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">No recommendations available</p>
                            ) : (
                                <div className="space-y-4">
                                    {suggestedGroups.map((g) => (
                                        <div 
                                            key={g.id}
                                            onClick={() => router.push(`/groups/${g.id}`)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} relative overflow-hidden shrink-0`}>
                                                {g.coverUrl && <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors truncate">{g.name}</h4>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{g.memberCount || 0} members</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* TRENDING GROUPS */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                                <Users size={14} className="text-primary" /> Trending Groups
                            </h3>
                            {trendingGroups.length === 0 ? (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">No trending groups yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {trendingGroups.map((g) => (
                                        <div 
                                            key={g.id}
                                            onClick={() => router.push(`/groups/${g.id}`)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGroupGradient(g.name)} relative overflow-hidden shrink-0`}>
                                                {g.coverUrl && <img src={g.coverUrl} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors truncate">{g.name}</h4>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{g.memberCount || 0} members</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
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
