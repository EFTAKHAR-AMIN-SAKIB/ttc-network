"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Globe, School, Sparkles, Users, BookOpen, Bookmark, 
    Settings, Shield, MapPin, ShieldCheck, Check, Plus, 
    Compass, Bell, ExternalLink, ChevronRight, ChevronDown, MessageSquare
} from "lucide-react";
import SafeAvatar from "@/components/SafeAvatar";
import { colleges } from "@/data/colleges";

interface NewsFeedLeftSidebarProps {
    profile: any;
    userCollege: any;
    activeTab: "event" | "club" | "group";
    onTabSwitch: (tab: "event" | "club" | "group") => void;
    showOnlySaved: boolean;
    onToggleSaved: (saved: boolean) => void;
    savedCount: number;
    selectedFilter: string;
    onSelectFilter: (collegeId: string) => void;
    myGroups: any[];
    onCreateGroup: () => void;
    onOpenModeration: () => void;
    pendingCount: number;
    unseenClubCount?: number;
    unseenGroupCount?: number;
    onSelectGroupSection?: (section: "my-feed" | "discover" | "my-groups") => void;
}

const roleStyles: Record<string, { label: string; badge: string }> = {
    student: {
        label: "Student",
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30"
    },
    teacher: {
        label: "Teacher",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
    },
    manager: {
        label: "Manager",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30"
    },
    super_manager: {
        label: "Super Manager",
        badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30"
    },
    admin: {
        label: "Admin",
        badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30"
    }
};

export default function NewsFeedLeftSidebar({
    profile,
    userCollege,
    activeTab,
    onTabSwitch,
    showOnlySaved,
    onToggleSaved,
    savedCount,
    selectedFilter,
    onSelectFilter,
    myGroups,
    onCreateGroup,
    onOpenModeration,
    pendingCount,
    unseenClubCount = 0,
    unseenGroupCount = 0,
    onSelectGroupSection
}: NewsFeedLeftSidebarProps) {
    const rawRole = (profile?.role || "student").toLowerCase();
    const currentRole = roleStyles[rawRole] || roleStyles.student;
    const canModerate = profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager");

    const isGlobalFeedActive = !showOnlySaved && activeTab === "event" && selectedFilter === "all";
    const isMyCampusActive = !showOnlySaved && !!profile?.collegeId && selectedFilter === profile.collegeId;
    const isClubsActive = !showOnlySaved && activeTab === "club";
    const isGroupsActive = !showOnlySaved && activeTab === "group";

    const [isCampusDropdownOpen, setIsCampusDropdownOpen] = useState(false);

    const selectedCollege = colleges.find(c => c.id === selectedFilter);
    const currentFilterLabel = selectedFilter === "all" 
        ? "All Colleges" 
        : (selectedFilter === profile?.collegeId 
            ? `My Campus (${userCollege?.shortName || userCollege?.city || selectedCollege?.shortName || selectedCollege?.city || "Campus"})` 
            : (selectedCollege?.shortName || `${selectedCollege?.city || "Campus"} TTC`));

    return (
        <div className="space-y-4">
            
            {/* ─── 1. USER PROFILE CARD (WITH BANNER) ─── */}
            <div className="bg-white dark:bg-[#161822] rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs overflow-hidden transition-all hover:shadow-md">
                {/* Banner Image / Fallback Ambient Gradient */}
                <div className="h-20 sm:h-24 w-full relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                    {profile?.bannerURL ? (
                        <img 
                            src={profile.bannerURL} 
                            alt="Profile Banner" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-indigo-600 to-sky-500">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
                            <div className="absolute right-3 top-2 text-white/15 text-2xl font-black uppercase tracking-tighter select-none pointer-events-none">
                                TTC NETWORK
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlapping Avatar & Role Badge */}
                <div className="px-5 -mt-9 relative z-10 flex items-end justify-between">
                    <Link 
                        href={profile?.uid ? `/profile/${profile.username || profile.uid}` : "/login"}
                        className="group/avatar block relative"
                        title={profile?.displayName || "Profile"}
                    >
                        <div className="w-16 h-16 rounded-2xl ring-4 ring-white dark:ring-[#161822] shadow-md overflow-hidden bg-white dark:bg-gray-800 group-hover/avatar:scale-105 transition-transform">
                            <SafeAvatar 
                                src={profile?.photoURL}
                                alt={profile?.displayName || "User"}
                                sizeClassName="w-full h-full"
                                textClassName="text-xl font-black text-primary"
                                roundedClassName="rounded-2xl"
                            />
                        </div>
                    </Link>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs ${currentRole.badge}`}>
                        {currentRole.label}
                    </span>
                </div>

                {/* Name, College, and Profile Link */}
                <div className="px-5 pt-2 pb-4 space-y-3">
                    <div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Link 
                                href={profile?.uid ? `/profile/${profile.username || profile.uid}` : "/login"}
                                className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm hover:text-primary transition-colors truncate block"
                            >
                                {profile?.displayName || "Welcome Guest"}
                            </Link>
                            {profile?.roleVerified && (
                                <span title="Verified Campus Member" className="shrink-0">
                                    <ShieldCheck size={14} className="text-blue-500 fill-blue-500/20" />
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                            <MapPin size={12} className="shrink-0 text-primary" />
                            <span className="truncate">
                                {userCollege?.name || profile?.collegeName || "Govt. TTC Network"}
                            </span>
                        </div>
                    </div>

                    {profile?.uid ? (
                        <Link
                            href={`/profile/${profile.username || profile.uid}`}
                            className="block w-full py-2.5 px-3 text-center rounded-xl bg-gray-50 hover:bg-primary hover:text-white dark:bg-gray-800/80 dark:hover:bg-primary text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-all duration-200 border border-gray-200/70 dark:border-gray-700/60 hover:border-transparent active:scale-[0.98] shadow-xs"
                        >
                            View Profile
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className="block w-full py-2.5 px-3 text-center rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
                        >
                            Log In to Connect
                        </Link>
                    )}
                </div>
            </div>

            {/* ─── 2. MAIN NAVIGATION MENU ─── */}
            <div className="bg-white dark:bg-[#161822] rounded-3xl p-2.5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-1">
                {/* Global Feed */}
                <button
                    onClick={() => {
                        onToggleSaved(false);
                        onTabSwitch("event");
                        onSelectFilter("all");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer ${
                        isGlobalFeedActive
                            ? "bg-primary text-white shadow-sm font-black"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                    }`}
                >
                    <span className="flex items-center gap-2.5">
                        <Globe size={16} className={isGlobalFeedActive ? "text-white" : "text-blue-500"} />
                        <span>Global Feed</span>
                    </span>
                    {isGlobalFeedActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                </button>

                {/* Select Campus Dropdown Menu */}
                <div className="space-y-1">
                    <button
                        type="button"
                        onClick={() => setIsCampusDropdownOpen(prev => !prev)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer ${
                            selectedFilter !== "all"
                                ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                        }`}
                    >
                        <span className="flex items-center gap-2.5 min-w-0 flex-1">
                            <School size={16} className="text-amber-500 shrink-0" />
                            <span className="truncate">Select Campus</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 truncate max-w-[96px]">
                                {currentFilterLabel}
                            </span>
                            <ChevronDown 
                                size={14} 
                                className={`text-gray-400 transition-transform duration-200 ${isCampusDropdownOpen ? "rotate-180 text-primary" : ""}`} 
                            />
                        </div>
                    </button>

                    {/* Expandable Dropdown List */}
                    <AnimatePresence>
                        {isCampusDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="py-1.5 px-1 space-y-1 bg-gray-50/80 dark:bg-[#121319] rounded-2xl border border-gray-200/70 dark:border-gray-800/80 max-h-56 overflow-y-auto no-scrollbar shadow-inner">
                                    {/* All Colleges Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onToggleSaved(false);
                                            onSelectFilter("all");
                                            setIsCampusDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                            selectedFilter === "all"
                                                ? "bg-primary text-white shadow-xs font-black"
                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Globe size={13} className={selectedFilter === "all" ? "text-white" : "text-gray-400"} />
                                            <span>All Colleges</span>
                                        </span>
                                        {selectedFilter === "all" && <Check size={14} className="shrink-0" />}
                                    </button>

                                    {/* My Campus (Pinned if available) */}
                                    {profile?.collegeId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onToggleSaved(false);
                                                onSelectFilter(profile.collegeId);
                                                setIsCampusDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                selectedFilter === profile.collegeId
                                                    ? "bg-amber-500 text-white shadow-xs font-black"
                                                    : "text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15"
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <School size={13} className={selectedFilter === profile.collegeId ? "text-white" : "text-amber-500"} />
                                                <span className="truncate">My Campus ({userCollege?.shortName || userCollege?.city || "Campus"})</span>
                                            </span>
                                            {selectedFilter === profile.collegeId && <Check size={14} className="shrink-0" />}
                                        </button>
                                    )}

                                    {/* Divider */}
                                    <div className="border-t border-gray-200/60 dark:border-gray-800 my-1 mx-2" />

                                    {/* All 15 TTC Colleges */}
                                    {colleges.map((col) => {
                                        const isSelected = selectedFilter === col.id;
                                        const isMyCollege = profile?.collegeId === col.id;
                                        return (
                                            <button
                                                key={col.id}
                                                type="button"
                                                onClick={() => {
                                                    onToggleSaved(false);
                                                    onSelectFilter(col.id);
                                                    setIsCampusDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                    isSelected
                                                        ? "bg-primary text-white shadow-xs font-black"
                                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                                                }`}
                                            >
                                                <span className="truncate flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-gray-400"}`} />
                                                    <span className="truncate">{col.shortName || `${col.city} TTC`}</span>
                                                    {col.gender === "women" && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                            isSelected ? "bg-white/25 text-white" : "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                                                        }`}>
                                                            Women
                                                        </span>
                                                    )}
                                                    {col.gender === "men" && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                            isSelected ? "bg-white/25 text-white" : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                        }`}>
                                                            Men
                                                        </span>
                                                    )}
                                                    {isMyCollege && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                            isSelected ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                        }`}>
                                                            My
                                                        </span>
                                                    )}
                                                </span>
                                                {isSelected && <Check size={14} className="shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* College Clubs */}
                <button
                    onClick={() => {
                        onToggleSaved(false);
                        onTabSwitch("club");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer ${
                        isClubsActive
                            ? "bg-primary text-white shadow-sm font-black"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                    }`}
                >
                    <span className="flex items-center gap-2.5">
                        <Sparkles size={16} className={isClubsActive ? "text-white" : "text-purple-500"} />
                        <span>College Clubs</span>
                    </span>
                    {unseenClubCount > 0 && !isClubsActive && (
                        <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-black bg-red-500 text-white flex items-center justify-center animate-pulse">
                            {unseenClubCount}
                        </span>
                    )}
                </button>

                {/* Campus Groups */}
                <button
                    onClick={() => {
                        onToggleSaved(false);
                        onTabSwitch("group");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer ${
                        isGroupsActive
                            ? "bg-primary text-white shadow-sm font-black"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                    }`}
                >
                    <span className="flex items-center gap-2.5">
                        <Users size={16} className={isGroupsActive ? "text-white" : "text-[#1877F2]"} />
                        <span>Campus Groups</span>
                    </span>
                    {myGroups.length > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            isGroupsActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}>
                            {myGroups.length}
                        </span>
                    )}
                </button>

                {/* Campus Stories */}
                <Link
                    href="/story"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70 transition-all group"
                >
                    <span className="flex items-center gap-2.5">
                        <BookOpen size={16} className="text-emerald-500" />
                        <span>Campus Stories</span>
                    </span>
                    <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Saved Posts */}
                {profile?.uid && (
                    <button
                        onClick={() => onToggleSaved(!showOnlySaved)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer ${
                            showOnlySaved
                                ? "bg-amber-500 text-white shadow-sm font-black"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <Bookmark size={16} className={showOnlySaved ? "fill-white text-white" : "text-amber-500"} />
                            <span>Saved Posts</span>
                        </span>
                        {savedCount > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                showOnlySaved ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                            }`}>
                                {savedCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Divider */}
                <div className="pt-1.5 pb-1 border-t border-gray-100 dark:border-gray-800/80 my-1" />

                {/* Account Settings */}
                <Link
                    href="/settings"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/70 transition-all group"
                >
                    <span className="flex items-center gap-2.5">
                        <Settings size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                        <span>Account Settings</span>
                    </span>
                    <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Admin Panel / Review Queue (if admin or manager) */}
                {canModerate && (
                    <div className="pt-1">
                        <div className="flex items-center gap-1.5">
                            <Link
                                href="/admin"
                                className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200/60 dark:border-indigo-500/30 transition-all group"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
                                    <span>Admin Panel</span>
                                </span>
                                {pendingCount > 0 && (
                                    <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-black bg-red-500 text-white flex items-center justify-center animate-pulse">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                onClick={onOpenModeration}
                                title="Open Moderation Review Desk"
                                className="p-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200/60 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                            >
                                <MessageSquare size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── 3. MY GROUPS SHORTCUTS ─── */}
            <div className="bg-white dark:bg-[#161822] rounded-3xl p-4 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            onToggleSaved(false);
                            onTabSwitch("group");
                            onSelectGroupSection?.("my-feed");
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                    >
                        <Users size={12} className="text-[#1877F2]" /> Groups Hub
                    </button>
                    <button
                        onClick={onCreateGroup}
                        className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        <Plus size={12} /> Create
                    </button>
                </div>

                {myGroups.length > 0 ? (
                    <div className="space-y-1.5">
                        {myGroups.slice(0, 4).map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#1877F2] font-black flex items-center justify-center shrink-0 overflow-hidden border border-blue-500/20">
                                    {group.coverUrl ? (
                                        <img src={group.coverUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (group.name?.charAt(0) || "G").toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                        {group.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 capitalize">
                                        {group.memberCount || 1} members
                                    </p>
                                </div>
                            </Link>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                onToggleSaved(false);
                                onTabSwitch("group");
                                onSelectGroupSection?.("my-groups");
                            }}
                            className="w-full block pt-1 text-center text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        >
                            Explore All Groups ({myGroups.length}) →
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-3 px-2 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Join campus groups to discuss projects and collaborate.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                onToggleSaved(false);
                                onTabSwitch("group");
                                onSelectGroupSection?.("discover");
                            }}
                            className="inline-block mt-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                            Discover Groups
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}
