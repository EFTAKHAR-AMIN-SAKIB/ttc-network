/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import {
    Users,
    GraduationCap,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Search,
    X,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Award,
    Ban,
    EyeOff,
    Lock,
    Trash2,
    ExternalLink,
    Copy,
    Check,
    Loader2,
    Building2,
    Calendar,
    Sparkles,
    AlertTriangle,
    RefreshCw,
    UserCheck,
    SlidersHorizontal
} from "lucide-react";
import {
    getAllUsers,
    updateUserRole,
    updateUserRoleAndCollege,
    updateUserModeration,
    grantBadge,
    revokeBadge,
    getColleges,
    type FirestoreUser,
    type FirestoreCollege,
} from "@/lib/firestore";
import { UserProfile } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface UserBadge {
    id: string;
    name: string;
    description?: string;
    imageURL?: string;
    dateEarned?: string;
}

interface TimestampLike {
    toDate?: () => Date;
    toMillis?: () => number;
}

// ── Badge Presets ──────────────────────────────────────────
const BADGE_PRESETS = [
    {
        name: "Campus Ambassador",
        description: "Official representative and community leader for their campus.",
        icon: "🛡️",
        imageURL: "https://api.iconify.design/lucide:shield-check.svg?color=%234f46e5"
    },
    {
        name: "Top Contributor",
        description: "Active member contributing high-quality study materials and stories.",
        icon: "🏆",
        imageURL: "https://api.iconify.design/lucide:trophy.svg?color=%23f59e0b"
    },
    {
        name: "Early Pioneer",
        description: "Founding generation member of the TTC Network platform.",
        icon: "🌟",
        imageURL: "https://api.iconify.design/lucide:sparkles.svg?color=%2310b981"
    },
    {
        name: "Outstanding Educator",
        description: "Distinguished teacher providing active mentorship and curriculum help.",
        icon: "🎓",
        imageURL: "https://api.iconify.design/lucide:graduation-cap.svg?color=%233b82f6"
    },
    {
        name: "Community Mentor",
        description: "Trusted peer mentor helping fellow students succeed.",
        icon: "🎖️",
        imageURL: "https://api.iconify.design/lucide:award.svg?color=%23ec4899"
    }
];

// ── Helper: Avatar with Fallback ───────────────────────────
function UserAvatar({ user, size = "md" }: { user: { photoURL?: string; displayName?: string }; size?: "sm" | "md" | "lg" }) {
    const [imgError, setImgError] = useState(false);
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";

    if (user.photoURL && !imgError) {
        return (
            <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                onError={() => setImgError(true)}
                className={`${sizeClasses} rounded-2xl object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm flex-shrink-0`}
            />
        );
    }
    return (
        <div className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-purple-600 text-white font-black flex items-center justify-center shadow-sm flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-800`}>
            {user.displayName?.[0]?.toUpperCase() || "?"}
        </div>
    );
}

// ── Helper: Format Joined Date ─────────────────────────────
function formatJoinedDate(createdAt: TimestampLike | Date | string | number | null | undefined): string {
    if (!createdAt) return "Joined recently";
    try {
        const date = typeof (createdAt as TimestampLike).toDate === "function"
            ? (createdAt as TimestampLike).toDate!()
            : new Date(createdAt as string | number | Date);
        if (isNaN(date.getTime())) return "Joined recently";
        return format(date, "MMM d, yyyy");
    } catch {
        return "Joined recently";
    }
}

// ── Role Visual Config ─────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
    admin: {
        label: "Admin",
        badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/60",
        dot: "bg-purple-500",
    },
    super_manager: {
        label: "Super Manager",
        badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
        dot: "bg-indigo-500",
    },
    manager: {
        label: "Manager",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        dot: "bg-amber-500",
    },
    teacher: {
        label: "Teacher",
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
        dot: "bg-blue-500",
    },
    student: {
        label: "Student",
        badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
        dot: "bg-gray-400",
    },
};

export default function UsersTab({ profile }: { profile: UserProfile }) {
    const { showToast } = useToast();
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [colleges, setColleges] = useState<(FirestoreCollege & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [collegeFilter, setCollegeFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "role">("newest");
    const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Actions & Modal States
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [moderatingUser, setModeratingUser] = useState<(FirestoreUser & { id: string }) | null>(null);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [badgeSubmitting, setBadgeSubmitting] = useState(false);
    const [deletingUser, setDeletingUser] = useState<(FirestoreUser & { id: string }) | null>(null);
    const [deleteDataOption, setDeleteDataOption] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Load initial data
    const loadData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [usersData, collegesData] = await Promise.all([
                getAllUsers(),
                getColleges()
            ]);
            setUsers(usersData);
            setColleges(collegesData);
        } catch (err) {
            console.error("Failed to load users/colleges:", err);
            showToast("❌ Failed to load user directory.", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter, collegeFilter, sortBy]);

    // Metrics Overview
    const metrics = useMemo(() => {
        const total = users.length;
        const students = users.filter(u => u.role === "student").length;
        const staff = users.filter(u => ["teacher", "manager", "super_manager", "admin"].includes(u.role)).length;
        const verified = users.filter(u => u.roleVerified).length;
        const moderated = users.filter(u => u.isBanned || u.isShadowBanned).length;

        return { total, students, staff, verified, moderated };
    }, [users]);

    // Filtered & Sorted Users
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            // Role filter
            if (roleFilter !== "all" && u.role !== roleFilter) return false;

            // Status filter
            if (statusFilter === "verified" && !u.roleVerified) return false;
            if (statusFilter === "unverified" && u.roleVerified) return false;
            if (statusFilter === "banned" && !u.isBanned) return false;
            if (statusFilter === "shadowBanned" && !u.isShadowBanned) return false;

            // College filter
            if (collegeFilter === "none") {
                if (u.collegeId || (u.college && u.college !== "No college")) return false;
            } else if (collegeFilter !== "all") {
                if (u.collegeId !== collegeFilter) return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = (u.displayName || "").toLowerCase().includes(q);
                const matchesUsername = (u.username || "").toLowerCase().includes(q);
                const matchesEmail = (u.email || "").toLowerCase().includes(q);
                const matchesCollege = (u.college || "").toLowerCase().includes(q);
                const matchesId = (u.id || "").toLowerCase().includes(q);
                if (!matchesName && !matchesUsername && !matchesEmail && !matchesCollege && !matchesId) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === "name") {
                return (a.displayName || "").localeCompare(b.displayName || "");
            }
            if (sortBy === "role") {
                const roleWeights: Record<string, number> = {
                    admin: 5,
                    super_manager: 4,
                    manager: 3,
                    teacher: 2,
                    student: 1,
                };
                return (roleWeights[b.role] || 0) - (roleWeights[a.role] || 0);
            }
            if (sortBy === "oldest") {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return aTime - bTime;
            }
            // Default: newest
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
    }, [users, roleFilter, statusFilter, collegeFilter, searchQuery, sortBy]);

    // Paginated Slice
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, currentPage, pageSize]);

    // ── Handlers ───────────────────────────────────────────────

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        showToast("✅ User ID copied to clipboard!", "info");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleVerifyToggle = async (user: FirestoreUser & { id: string }) => {
        setUpdatingUserId(user.id);
        const nextVerified = !user.roleVerified;
        try {
            await updateUserRole(user.id, user.role, nextVerified);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roleVerified: nextVerified } : u));
            showToast(nextVerified ? `✅ Verified ${user.displayName}'s role!` : `Verification removed for ${user.displayName}.`, "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to update verification"}`, "error");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleRoleChange = async (user: FirestoreUser & { id: string }, newRole: FirestoreUser["role"]) => {
        if (user.role === newRole) return;
        setUpdatingUserId(user.id);
        try {
            await updateUserRole(user.id, newRole, user.roleVerified);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            showToast(`✅ ${user.displayName}'s role updated to ${newRole.replace('_', ' ')}!`, "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to change role"}`, "error");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleCollegeChange = async (user: FirestoreUser & { id: string }, newCollegeId: string) => {
        setUpdatingUserId(user.id);
        try {
            const selectedCollege = colleges.find(c => c.id === newCollegeId);
            const collegeName = selectedCollege ? (selectedCollege.shortName || selectedCollege.name) : "No college";
            const collegeId = selectedCollege ? selectedCollege.id || "" : "";

            await updateUserRoleAndCollege(user.id, user.role, user.roleVerified, collegeId, collegeName);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, collegeId, college: collegeName } : u));
            showToast(`✅ Updated college for ${user.displayName}!`, "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to change college"}`, "error");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleModerationUpdate = async (userId: string, updates: Partial<FirestoreUser>) => {
        setUpdatingUserId(userId);
        try {
            await updateUserModeration(userId, updates);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
            if (moderatingUser && moderatingUser.id === userId) {
                setModeratingUser(prev => prev ? { ...prev, ...updates } : null);
            }
            showToast("✅ Moderation settings updated.", "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to update moderation"}`, "error");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleGrantBadge = async (badgeData: { name: string; description: string; imageURL: string }) => {
        if (!moderatingUser) return;
        setBadgeSubmitting(true);
        try {
            await grantBadge(moderatingUser.id, badgeData);
            const newBadge = {
                ...badgeData,
                id: "temp-" + Math.random().toString(36).substring(2),
                dateEarned: new Date().toISOString(),
            };
            const updatedBadges = [...(moderatingUser.badges || []), newBadge];

            setModeratingUser(prev => prev ? { ...prev, badges: updatedBadges } : null);
            setUsers(prev => prev.map(u => u.id === moderatingUser.id ? { ...u, badges: updatedBadges } : u));

            showToast(`✅ Granted "${badgeData.name}" badge!`, "success");
            setShowBadgeModal(false);
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to grant badge"}`, "error");
        } finally {
            setBadgeSubmitting(false);
        }
    };

    const handleRevokeBadge = async (badgeId: string) => {
        if (!moderatingUser) return;
        try {
            await revokeBadge(moderatingUser.id, badgeId);
            const updatedBadges = (moderatingUser.badges || []).filter((b: UserBadge) => b.id !== badgeId);
            setModeratingUser(prev => prev ? { ...prev, badges: updatedBadges } : null);
            setUsers(prev => prev.map(u => u.id === moderatingUser.id ? { ...u, badges: updatedBadges } : u));
            showToast("✅ Badge revoked.", "info");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Failed to revoke badge"}`, "error");
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: deletingUser.id,
                    deleteData: deleteDataOption,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to delete user");
            }
            showToast(`✅ ${deletingUser.displayName} was successfully deleted.`, "success");
            setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
            setDeletingUser(null);
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error deleting user"}`, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    // Permitted roles for dropdown selection based on admin level
    const assignableRoles: FirestoreUser["role"][] = profile.role === "admin"
        ? ["student", "teacher", "manager", "super_manager", "admin"]
        : ["student", "teacher"];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse h-28" />
                    ))}
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800/60 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Metric Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800/70 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Total Members</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{metrics.total}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold mt-1">Across all colleges</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 flex items-center justify-center shadow-inner">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/70 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Students</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{metrics.students}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{metrics.verified} verified roles</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                        <GraduationCap size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/70 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Staff & Faculty</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{metrics.staff}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold mt-1">Teachers & Managers</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                        <ShieldCheck size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/70 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Moderated</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{metrics.moderated}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Banned or restricted</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                        <ShieldAlert size={24} />
                    </div>
                </div>
            </div>

            {/* ── Filter & Search Toolbar ── */}
            <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                {/* Search Bar, Filter Toggle & Refresh */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name, @username, email, or ID..."
                            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Mobile Filters Toggle Button */}
                    <button
                        onClick={() => setMobileFiltersExpanded(prev => !prev)}
                        className={`sm:hidden px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 border ${
                            mobileFiltersExpanded || (statusFilter !== "all" || collegeFilter !== "all" || sortBy !== "newest")
                                ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                                : "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-200"
                        }`}
                        title="Toggle Filters"
                        aria-label="Toggle Filters"
                    >
                        <SlidersHorizontal size={15} />
                        {(statusFilter !== "all" || collegeFilter !== "all" || sortBy !== "newest") && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                    </button>

                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="px-3.5 sm:px-4 py-3 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-shrink-0"
                        title="Refresh Directory"
                    >
                        <RefreshCw size={15} className={refreshing ? "animate-spin text-primary" : ""} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Role Tabs - Touch scrollable */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1">
                    {[
                        { id: "all", label: "All Users", count: users.length },
                        { id: "student", label: "Students", count: users.filter(u => u.role === "student").length },
                        { id: "teacher", label: "Teachers", count: users.filter(u => u.role === "teacher").length },
                        { id: "manager", label: "Managers", count: users.filter(u => u.role === "manager").length },
                        { id: "super_manager", label: "Super Managers", count: users.filter(u => u.role === "super_manager").length },
                        { id: "admin", label: "Admins", count: users.filter(u => u.role === "admin").length },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setRoleFilter(tab.id)}
                            className={`snap-start px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                                roleFilter === tab.id
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                roleFilter === tab.id ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Sub-Filters: Status, College, Sort - Collapsible on Mobile, Grid on Tablet/Desktop */}
                <div className={`${mobileFiltersExpanded ? "grid" : "hidden"} sm:grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs`}>
                    {/* Status Filter */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 px-3.5 py-2.5 sm:py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <UserCheck size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent border-none text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-0 p-0 w-full cursor-pointer text-base sm:text-xs"
                        >
                            <option value="all">All Status</option>
                            <option value="verified">Verified Role Only</option>
                            <option value="unverified">Unverified Only</option>
                            <option value="banned">Hard Banned</option>
                            <option value="shadowBanned">Shadow Banned</option>
                        </select>
                    </div>

                    {/* College Filter */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 px-3.5 py-2.5 sm:py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <Building2 size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">College:</span>
                        <select
                            value={collegeFilter}
                            onChange={(e) => setCollegeFilter(e.target.value)}
                            className="bg-transparent border-none text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-0 p-0 w-full truncate cursor-pointer text-base sm:text-xs"
                        >
                            <option value="all">All Colleges</option>
                            <option value="none">No College Assigned</option>
                            {colleges.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.shortName || c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 px-3.5 py-2.5 sm:py-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <SlidersHorizontal size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name" | "role")}
                            className="bg-transparent border-none text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-0 p-0 w-full cursor-pointer text-base sm:text-xs"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="role">Role Hierarchy</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Header Info */}
            <div className="flex items-center justify-between px-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <p>
                    Showing <span className="text-gray-900 dark:text-white">{filteredUsers.length}</span> {filteredUsers.length === 1 ? "user" : "users"}
                    {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-[11px]">Per page:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>

            {/* ── User Cards List ── */}
            {filteredUsers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-12 border border-gray-100 dark:border-gray-800 text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mx-auto text-gray-400">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">No Users Found</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        No members match your current filter and search criteria. Try clearing search or adjusting your filters.
                    </p>
                    {(searchQuery || roleFilter !== "all" || statusFilter !== "all" || collegeFilter !== "all") && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setRoleFilter("all");
                                setStatusFilter("all");
                                setCollegeFilter("all");
                            }}
                            className="mt-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-2xl shadow-sm hover:opacity-90 transition-all"
                        >
                            Reset All Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {paginatedUsers.map((user) => {
                        const roleMeta = ROLE_CONFIG[user.role] || ROLE_CONFIG.student;
                        const isUpdating = updatingUserId === user.id;

                        return (
                            <motion.div
                                key={user.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="bg-white dark:bg-gray-800/90 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Left: Avatar & Identity */}
                                    <div className="flex items-start gap-4 min-w-0">
                                        <UserAvatar user={user} size="md" />

                                        <div className="min-w-0 flex-1 space-y-1">
                                            {/* Name, Username, Badges */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {user.username ? (
                                                    <Link
                                                        href={`/profile/${user.username}`}
                                                        target="_blank"
                                                        className="font-black text-gray-900 dark:text-white text-base hover:text-primary transition-colors flex items-center gap-1.5 group/link"
                                                    >
                                                        <span>{user.displayName || "Anonymous User"}</span>
                                                        <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 text-primary transition-opacity" />
                                                    </Link>
                                                ) : (
                                                    <span className="font-black text-gray-900 dark:text-white text-base">
                                                        {user.displayName || "Anonymous User"}
                                                    </span>
                                                )}

                                                {user.username && (
                                                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                                                        @{user.username}
                                                    </span>
                                                )}

                                                {user.roleVerified && (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800" title="Role Verified Member">
                                                        <ShieldCheck size={12} /> Verified
                                                    </span>
                                                )}

                                                {user.isBanned && (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
                                                        <Ban size={12} /> Banned
                                                    </span>
                                                )}

                                                {user.isShadowBanned && (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                                        <EyeOff size={12} /> Shadow Ban
                                                    </span>
                                                )}

                                                {user.restrictions && user.restrictions.length > 0 && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-lg">
                                                        <Lock size={10} /> {user.restrictions.length} restrictions
                                                    </span>
                                                )}
                                            </div>

                                            {/* Email, College, Date, UID */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{user.email}</span>
                                                <span>•</span>

                                                {/* College Dropdown/Badge */}
                                                <div className="relative inline-flex items-center">
                                                    <Building2 size={12} className="mr-1 text-gray-400" />
                                                    <select
                                                        value={user.collegeId || ""}
                                                        onChange={(e) => handleCollegeChange(user, e.target.value)}
                                                        className="appearance-none bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-[11px] font-bold rounded-lg py-0.5 pl-2 pr-5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                                        title="Click to assign institution"
                                                    >
                                                        <option value="">No college assigned</option>
                                                        {colleges.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.shortName || c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={10} className="absolute right-1.5 pointer-events-none text-gray-400" />
                                                </div>

                                                {user.programme && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="px-2 py-0.5 bg-primary/5 text-primary dark:text-indigo-300 rounded text-[10px] font-black uppercase">
                                                            {user.programme}
                                                        </span>
                                                    </>
                                                )}

                                                <span>•</span>
                                                <span className="flex items-center gap-1 text-gray-400">
                                                    <Calendar size={11} /> {formatJoinedDate(user.createdAt)}
                                                </span>

                                                <span>•</span>
                                                {/* Quick Copy User ID */}
                                                <button
                                                    onClick={() => handleCopyId(user.id)}
                                                    className="font-mono bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/60 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-1"
                                                    title="Click to copy full UID"
                                                >
                                                    {copiedId === user.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                                    <span>UID</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile-Optimized Action Bar (< sm) */}
                                    <div className="sm:hidden pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                                        {/* Mobile Role Selector */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex-shrink-0">Role:</span>
                                            <div className="relative flex-1">
                                                <select
                                                    disabled={isUpdating}
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user, e.target.value as FirestoreUser["role"])}
                                                    className={`appearance-none w-full text-xs font-black uppercase tracking-wider py-2.5 pl-3 pr-8 rounded-2xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${roleMeta.badge}`}
                                                >
                                                    {assignableRoles.map((role) => (
                                                        <option key={role} value={role} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white normal-case font-semibold">
                                                            {role.replace('_', ' ').toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                            </div>
                                        </div>

                                        {/* Mobile Button Row */}
                                        <div className="flex items-center gap-2">
                                            {/* Role Verification Toggle */}
                                            <button
                                                disabled={isUpdating}
                                                onClick={() => handleVerifyToggle(user)}
                                                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                    user.roleVerified
                                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 active:bg-emerald-100"
                                                        : "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 active:bg-emerald-50 active:text-emerald-600 border border-transparent"
                                                }`}
                                            >
                                                {user.roleVerified ? (
                                                    <>
                                                        <ShieldCheck size={15} className="text-emerald-500" />
                                                        <span>Verified</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield size={15} className="text-gray-400" />
                                                        <span>Verify</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Moderation Modal Trigger */}
                                            <button
                                                disabled={isUpdating}
                                                onClick={() => setModeratingUser(user)}
                                                className="flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 active:bg-amber-100 dark:active:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <ShieldAlert size={15} className="text-amber-500" />
                                                <span>Moderate</span>
                                            </button>

                                            {/* Delete User (Admin only) */}
                                            {profile.role === "admin" && (
                                                <button
                                                    disabled={isUpdating}
                                                    onClick={() => setDeletingUser(user)}
                                                    className="p-2.5 rounded-2xl text-xs text-gray-400 active:text-red-600 active:bg-red-50 dark:active:bg-red-950/40 border border-gray-200 dark:border-gray-700 transition-colors flex-shrink-0"
                                                    title="Permanently delete user"
                                                    aria-label="Delete user"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop / Tablet Action Toolbar (>= sm) */}
                                    <div className="hidden sm:flex items-center gap-2 justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800 flex-shrink-0">
                                        {/* Inline Role Selector */}
                                        <div className="relative inline-block">
                                            <select
                                                disabled={isUpdating}
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user, e.target.value as FirestoreUser["role"])}
                                                className={`appearance-none text-[11px] font-black uppercase tracking-wider py-2 pl-3 pr-8 rounded-2xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${roleMeta.badge}`}
                                            >
                                                {assignableRoles.map((role) => (
                                                    <option key={role} value={role} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white normal-case font-semibold">
                                                        {role.replace('_', ' ').toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                        </div>

                                        {/* Role Verification Toggle */}
                                        <button
                                            disabled={isUpdating}
                                            onClick={() => handleVerifyToggle(user)}
                                            className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                user.roleVerified
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100"
                                                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent"
                                            }`}
                                            title={user.roleVerified ? "Click to remove verified badge" : "Click to verify role"}
                                        >
                                            {user.roleVerified ? (
                                                <>
                                                    <ShieldCheck size={14} className="text-emerald-500" />
                                                    <span>Verified</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={14} className="text-gray-400" />
                                                    <span>Verify</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Moderation Drawer / Card */}
                                        <button
                                            disabled={isUpdating}
                                            onClick={() => setModeratingUser(user)}
                                            className="px-3 py-2 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 transition-all flex items-center gap-1.5"
                                            title="Open moderation tools and badges"
                                        >
                                            <ShieldAlert size={14} className="text-amber-500" />
                                            <span>Moderate</span>
                                        </button>

                                        {/* Delete User (Admin only) */}
                                        {profile.role === "admin" && (
                                            <button
                                                disabled={isUpdating}
                                                onClick={() => setDeletingUser(user)}
                                                className="p-2.5 rounded-2xl text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                                title="Permanently delete user"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800/80 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm text-xs">
                    <p className="text-gray-500 font-semibold">
                        Page <span className="text-gray-900 dark:text-white font-bold">{currentPage}</span> of <span className="text-gray-900 dark:text-white font-bold">{totalPages}</span>
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                            .map((page, index, arr) => {
                                const prev = arr[index - 1];
                                const hasGap = prev && page - prev > 1;

                                return (
                                    <div key={page} className="flex items-center">
                                        {hasGap && <span className="px-1 text-gray-400">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-xl font-bold transition-all ${
                                                currentPage === page
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    </div>
                                );
                            })}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Moderation & Badges Modal ── */}
            <AnimatePresence>
                {moderatingUser && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 max-h-[92vh] flex flex-col"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto sm:hidden mt-3 mb-1 flex-shrink-0" />

                            {/* Header */}
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">User Moderation</h3>
                                        <p className="text-xs text-gray-500 font-medium">Manage access, status, and recognition</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModeratingUser(null)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                                {/* Profile Summary */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <UserAvatar user={moderatingUser} size="lg" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-gray-900 dark:text-white text-base truncate">{moderatingUser.displayName}</p>
                                            {moderatingUser.username && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                    @{moderatingUser.username}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{moderatingUser.email}</p>
                                        <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 mt-1">
                                            {moderatingUser.college || "No College"} • {moderatingUser.role.toUpperCase()}
                                        </p>
                                    </div>
                                </div>

                                {/* Account Status Toggles */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                        Account Access & Visibility
                                    </h4>

                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Hard Ban */}
                                        <button
                                            onClick={() => handleModerationUpdate(moderatingUser.id, { isBanned: !moderatingUser.isBanned })}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                                                moderatingUser.isBanned
                                                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 shadow-sm"
                                                    : "bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-red-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    moderatingUser.isBanned ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                                                }`}>
                                                    <Ban size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">Hard Ban</p>
                                                    <p className="text-[11px] text-gray-500">Disables login and revokes write permissions completely</p>
                                                </div>
                                            </div>
                                            <div className={`w-11 h-6 rounded-full relative transition-colors ${moderatingUser.isBanned ? "bg-red-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${moderatingUser.isBanned ? "right-1" : "left-1"}`} />
                                            </div>
                                        </button>

                                        {/* Shadow Ban */}
                                        <button
                                            onClick={() => handleModerationUpdate(moderatingUser.id, { isShadowBanned: !moderatingUser.isShadowBanned })}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                                                moderatingUser.isShadowBanned
                                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 shadow-sm"
                                                    : "bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    moderatingUser.isShadowBanned ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                                                }`}>
                                                    <EyeOff size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">Shadow Ban</p>
                                                    <p className="text-[11px] text-gray-500">User posts and stories remain hidden from others silently</p>
                                                </div>
                                            </div>
                                            <div className={`w-11 h-6 rounded-full relative transition-colors ${moderatingUser.isShadowBanned ? "bg-amber-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${moderatingUser.isShadowBanned ? "right-1" : "left-1"}`} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Activity Restrictions */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                            Feature Restrictions
                                        </h4>
                                        <Lock size={12} className="text-gray-400" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {["posts", "stories", "notices", "gifts"].map((type) => {
                                            const isRestricted = moderatingUser.restrictions?.includes(type);
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        const current = moderatingUser.restrictions || [];
                                                        const next = isRestricted ? current.filter(t => t !== type) : [...current, type];
                                                        handleModerationUpdate(moderatingUser.id, { restrictions: next });
                                                    }}
                                                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold capitalize transition-all text-center ${
                                                        isRestricted
                                                            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300 dark:border-red-900 font-black"
                                                            : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-gray-300"
                                                    }`}
                                                >
                                                    {isRestricted ? `No ${type}` : `Allow ${type}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Badges & Recognition */}
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Award size={16} className="text-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                Awarded Badges
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            {moderatingUser.badges?.length || 0}
                                        </span>
                                    </div>

                                    {moderatingUser.badges && moderatingUser.badges.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {moderatingUser.badges.map((badge: UserBadge) => (
                                                <div
                                                    key={badge.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/60 group hover:border-primary/20 transition-all"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center p-1 shadow-sm border border-gray-100 dark:border-gray-700 flex-shrink-0">
                                                            {badge.imageURL ? (
                                                                <img src={badge.imageURL} alt="" className="w-full h-full object-contain" />
                                                            ) : (
                                                                <Award size={14} className="text-primary" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">{badge.name}</p>
                                                            <p className="text-[10px] text-gray-500 truncate">{badge.description}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRevokeBadge(badge.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                                                        title="Revoke Badge"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic py-2">No badges have been granted to this user yet.</p>
                                    )}

                                    <button
                                        onClick={() => setShowBadgeModal(true)}
                                        className="w-full py-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={15} /> Award New Badge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Award Badge Modal with Presets ── */}
            <BadgeGrantModal
                isOpen={showBadgeModal}
                onClose={() => setShowBadgeModal(false)}
                onGrant={handleGrantBadge}
                isUpdating={badgeSubmitting}
            />

            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {deletingUser && (
                    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto sm:hidden mt-3 mb-1" />

                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-red-600 dark:text-red-400">Delete User</h3>
                                        <p className="text-xs text-gray-500">Irreversible administrative action</p>
                                    </div>
                                </div>
                                <button onClick={() => setDeletingUser(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        You are about to delete <strong>{deletingUser.displayName}</strong> (@{deletingUser.username || "no-username"}).
                                    </p>
                                    <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">
                                        This removes their account from Firebase Auth and invalidates their session immediately.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                        Associated Data Handling
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        <button
                                            onClick={() => setDeleteDataOption(true)}
                                            className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                                deleteDataOption
                                                    ? "bg-red-50/40 dark:bg-red-950/20 border-red-500 shadow-sm"
                                                    : "bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                deleteDataOption ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                                            }`}>
                                                {deleteDataOption && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">Delete all user data (Recommended)</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    Wipes all posts, comments, stories, notices, and uploaded files.
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setDeleteDataOption(false)}
                                            className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                                !deleteDataOption
                                                    ? "bg-primary/10 border-primary shadow-sm"
                                                    : "bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                !deleteDataOption ? "border-primary" : "border-gray-300 dark:border-gray-600"
                                            }`}>
                                                {!deleteDataOption && <div className="w-2 h-2 bg-primary rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-900 dark:text-white">Preserve community content</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    Keeps published study materials and stories, but removes the login credentials.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => setDeletingUser(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={handleDeleteUser}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            "Confirm Deletion"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Badge Grant Modal with 1-Click Presets ─────────────────
function BadgeGrantModal({
    isOpen,
    onClose,
    onGrant,
    isUpdating,
}: {
    isOpen: boolean;
    onClose: () => void;
    onGrant: (data: { name: string; description: string; imageURL: string }) => Promise<void>;
    isUpdating: boolean;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageURL, setImageURL] = useState("");

    const applyPreset = (preset: typeof BADGE_PRESETS[0]) => {
        setName(preset.name);
        setDescription(preset.description);
        setImageURL(preset.imageURL);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onGrant({ name, description, imageURL });
        setName("");
        setDescription("");
        setImageURL("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 max-h-[92vh] flex flex-col"
            >
                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto sm:hidden mt-3 mb-1" />

                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Award size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 dark:text-white">Award Recognition Badge</h3>
                            <p className="text-[11px] text-gray-500">Choose a preset or create a custom badge</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    {/* Presets Grid */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                            Quick Presets (Click to Select)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {BADGE_PRESETS.map((p) => (
                                <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => applyPreset(p)}
                                    className="p-2.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/60 hover:border-primary text-left transition-all group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-base group-hover:scale-110 transition-transform">{p.icon}</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Badge Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g. Campus Ambassador"
                                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Short description of the accomplishment..."
                                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 h-16 resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Icon URL
                            </label>
                            <input
                                type="text"
                                value={imageURL}
                                onChange={(e) => setImageURL(e.target.value)}
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating || !name.trim()}
                                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : "Grant Badge"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
