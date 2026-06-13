"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Shield,
    ShieldCheck,
    ShieldX,
    ShieldAlert,
    EyeOff,
    Ban,
    Lock,
    Settings2,
    X,
    Award,
    Plus,
    Loader2,
    Trash2,
    AlertTriangle
} from "lucide-react";
import {
    getAllUsers,
    updateUserRole,
    updateUserModeration,
    grantBadge,
    revokeBadge,
    type FirestoreUser,
} from "@/lib/firestore";
import { UserProfile } from "@/contexts/AuthContext";

export default function UsersTab({ profile }: { profile: UserProfile }) {
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [moderatingUser, setModeratingUser] = useState<(FirestoreUser & { id: string }) | null>(null);
    const [updating, setUpdating] = useState(false);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [deletingUser, setDeletingUser] = useState<(FirestoreUser & { id: string }) | null>(null);
    const [deleteDataOption, setDeleteDataOption] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

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
            setMessage(`✅ ${deletingUser.displayName} has been successfully deleted.`);
            setDeletingUser(null);
            loadUsers();
            setTimeout(() => setMessage(""), 4000);
        } catch (err) {
            setMessage(`❌ ${err instanceof Error ? err.message : "Error deleting user"}`);
            setTimeout(() => setMessage(""), 4000);
        } finally {
            setIsDeleting(false);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try { setUsers(await getAllUsers()); } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { loadUsers(); }, []);



    const handleVerifyToggle = async (userId: string, user: FirestoreUser) => {
        try {
            await updateUserRole(userId, user.role, !user.roleVerified);
            setMessage(user.roleVerified ? "Verification removed." : "✅ Role verified!");
            setTimeout(() => setMessage(""), 3000);
            loadUsers();
        } catch (err) {
            setMessage(`❌ ${err instanceof Error ? err.message : "Error"}`);
        }
    };

    const handleModerationUpdate = async (userId: string, updates: Partial<FirestoreUser>) => {
        setUpdating(true);
        try {
            await updateUserModeration(userId, updates);
            setMessage("✅ Moderation settings updated.");
            setModeratingUser(null);
            loadUsers();
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(`❌ ${err instanceof Error ? err.message : "Error"}`);
        }
        setUpdating(false);
    };

    const handleGrantBadge = async (badgeData: { name: string; description: string; imageURL: string }) => {
        if (!moderatingUser) return;
        setUpdating(true);
        try {
            await grantBadge(moderatingUser.id, badgeData);
            setMessage("✅ Badge granted successfully!");
            
            // Update local state immediately so user sees it
            const newBadge = {
                ...badgeData,
                id: 'temp-' + Math.random().toString(36).substring(2), // Temp ID until refresh
                dateEarned: new Date().toISOString()
            };
            setModeratingUser({
                ...moderatingUser,
                badges: [...(moderatingUser.badges || []), newBadge]
            });
            
            setTimeout(() => setMessage(""), 3000);
            loadUsers(); // Background refresh
        } catch (err) {
            setMessage(`❌ ${err instanceof Error ? err.message : "Error granting badge"}`);
        }
        setUpdating(false);
    };

    const handleRevokeBadge = async (badgeId: string) => {
        if (!moderatingUser) return;
        // Using a more reliable confirmation or just proceed for now to debug
        // if (!confirm("Are you sure you want to revoke this badge?")) return;
        
        setUpdating(true);
        try {
            console.log("Attempting to revoke badge:", badgeId, "for user:", moderatingUser.id);
            await revokeBadge(moderatingUser.id, badgeId);
            setMessage("✅ Badge revoked.");
            
            // Update local state to reflect change immediately
            const updatedBadges = (moderatingUser.badges || []).filter((b: any) => b.id !== badgeId);
            setModeratingUser({ ...moderatingUser, badges: updatedBadges });
            
            loadUsers();
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            console.error("Revoke error:", err);
            setMessage(`❌ ${err instanceof Error ? err.message : "Error revoking badge"}`);
        }
        setUpdating(false);
    };

    const filtered = users.filter((u) => {
        const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
        if (!matchesRole) return false;
        if (!searchQuery.trim()) return true;
        
        const q = searchQuery.toLowerCase().trim();
        return (
            (u.displayName || "").toLowerCase().includes(q) ||
            (u.username || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                    >{message}</motion.div>
                )}
            </AnimatePresence>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex gap-2 flex-wrap">
                    {["all", "student", "teacher", "manager", "admin"].map((r) => (
                        <button key={r} onClick={() => setRoleFilter(r)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${roleFilter === r ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                            {r} ({r === "all" ? users.length : users.filter((u) => u.role === r).length})
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, @username, email..."
                        className="w-full sm:w-64 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                    <Users size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Users Found</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">Users will appear after they sign up.</p>
                </div>
            ) : (
                filtered.map((user) => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">{user.displayName?.[0] || "?"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{user.displayName}</p>
                                    {user.username && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-500/20">
                                            @{user.username}
                                        </span>
                                    )}
                                    {user.roleVerified ? (
                                        <ShieldCheck size={14} className="text-emerald-500" />
                                    ) : (
                                        <Shield size={14} className="text-gray-300" />
                                    )}
                                    {user.isBanned && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-tighter">
                                            <Ban size={10} /> Banned
                                        </span>
                                    )}
                                    {user.isShadowBanned && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-tighter">
                                            <EyeOff size={10} /> Shadow Ban
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-400 mt-1 flex-wrap">
                                    <span>{user.email}</span>
                                    <span>·</span>
                                    <span>{user.college || "No college"}</span>
                                    <span>·</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.id);
                                            setMessage("✅ User ID copied to clipboard!");
                                            setTimeout(() => setMessage(""), 3000);
                                        }}
                                        className="font-mono bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 px-1.5 py-0.5 rounded text-[10px] transition-colors flex items-center gap-1 active:scale-95"
                                        title="Click to copy User ID"
                                    >
                                        ID: {user.id}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                    user.role === "admin" ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800" :
                                    user.role === "super_manager" ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800" :
                                    user.role === "manager" ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" :
                                    user.role === "teacher" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                                    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                }`}>
                                    {(user.role || 'student').replace('_', ' ')}
                                </span>
                                <button onClick={() => setModeratingUser(user)}
                                    className="p-2 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-500 transition-colors"
                                    title="Manage Moderation"
                                >
                                    <ShieldAlert size={14} />
                                </button>
                                <button onClick={() => handleVerifyToggle(user.id, user)}
                                className={`p-2 rounded-lg text-xs transition-colors ${user.roleVerified ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 dark:bg-[#161620] text-gray-700 dark:bg-gray-700 hover:bg-emerald-50 hover:text-emerald-500"}`}
                                    title={user.roleVerified ? "Remove verification" : "Verify role"}
                                >{user.roleVerified ? <ShieldCheck size={14} /> : <ShieldX size={14} />}</button>
                                {profile.role === "admin" && (
                                    <button onClick={() => setDeletingUser(user)}
                                        className="p-2 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}

            {/* Moderation Modal */}
            <AnimatePresence>
                {moderatingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="text-amber-500" size={20} />
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Moderation Card</h3>
                                </div>
                                <button onClick={() => setModeratingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Profile Summary */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                                        {moderatingUser.displayName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{moderatingUser.displayName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">@{moderatingUser.username || "no-username"}</p>
                                    </div>
                                </div>

                                {/* Status Controls */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Account Status</h4>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        <button 
                                            onClick={() => handleModerationUpdate(moderatingUser.id, { isBanned: !moderatingUser.isBanned })}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${moderatingUser.isBanned ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 hover:border-red-400"}`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${moderatingUser.isBanned ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                                    <Ban size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Hard Ban</p>
                                                    <p className="text-[10px] text-gray-500">Blocks all writes and platform access</p>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${moderatingUser.isBanned ? "bg-red-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${moderatingUser.isBanned ? "right-1" : "left-1"}`} />
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => handleModerationUpdate(moderatingUser.id, { isShadowBanned: !moderatingUser.isShadowBanned })}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${moderatingUser.isShadowBanned ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 hover:border-amber-400"}`}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${moderatingUser.isShadowBanned ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                                    <EyeOff size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Shadow Ban</p>
                                                    <p className="text-[10px] text-gray-500">User posts are invisible to others</p>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${moderatingUser.isShadowBanned ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${moderatingUser.isShadowBanned ? "right-1" : "left-1"}`} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Activity Restrictions */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Enable Restrictions</h4>
                                        <Lock size={12} className="text-gray-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['posts', 'stories', 'notices', 'gifts'].map(type => {
                                            const isRestricted = moderatingUser.restrictions?.includes(type);
                                            return (
                                                <button 
                                                    key={type}
                                                    onClick={() => {
                                                        const current = moderatingUser.restrictions || [];
                                                        const next = isRestricted ? current.filter(t => t !== type) : [...current, type];
                                                        handleModerationUpdate(moderatingUser.id, { restrictions: next });
                                                    }}
                                                    className={`px-3 py-2 rounded-xl border text-[10px] font-bold capitalize transition-all ${isRestricted ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}
                                                >
                                                    No {type}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Current Badges */}
                                {moderatingUser.badges && moderatingUser.badges.length > 0 && (
                                    <div className="space-y-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Current Badges</h4>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{moderatingUser.badges.length}</span>
                                        </div>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                            {moderatingUser.badges.map((badge: any) => (
                                                <div key={badge.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-primary/20 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center p-1.5 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                                                            {badge.imageURL ? (
                                                                <img src={badge.imageURL} alt={badge.name} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <Award className="text-primary" size={16} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-navy-900 dark:text-white">{badge.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium line-clamp-1">{badge.description}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRevokeBadge(badge.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                        title="Revoke Badge"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Award Badge */}
                                <div className="space-y-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Recognition</h4>
                                    <button 
                                        onClick={() => setShowBadgeModal(true)}
                                        className="w-full py-4 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Award size={16} /> Award New Badge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deletingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-red-500 animate-pulse" size={20} />
                                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Confirm Deletion</h3>
                                </div>
                                <button onClick={() => setDeletingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        You are about to delete <strong>{deletingUser.displayName}</strong> (@{deletingUser.username || "no-username"}) from the entire server.
                                    </p>
                                    <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">
                                        This will delete their account from Firebase Authentication and they will be immediately logged out. This action is permanent.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Associated Data Options</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => setDeleteDataOption(true)}
                                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                                deleteDataOption
                                                    ? "bg-red-50/30 dark:bg-red-950/10 border-red-500 shadow-sm"
                                                    : "bg-white dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                deleteDataOption ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                                            }`}>
                                                {deleteDataOption && <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-950 dark:text-white">Delete all user data (Recommended)</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    Completely deletes all their posts, comments, stories, notices, study documents, gifts, notifications, and uploaded files.
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setDeleteDataOption(false)}
                                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                                                !deleteDataOption
                                                    ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-sm"
                                                    : "bg-white dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                !deleteDataOption ? "border-primary" : "border-gray-300 dark:border-gray-600"
                                            }`}>
                                                {!deleteDataOption && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-950 dark:text-white">Keep data on the server</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    Preserves the user's published posts, comments, stories, and study documents, but deletes their account credentials and user profile.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-gray-50 dark:border-gray-700">
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => setDeletingUser(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={handleDeleteUser}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            "Confirm Delete"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <BadgeGrantModal 
                isOpen={showBadgeModal}
                onClose={() => setShowBadgeModal(false)}
                onGrant={handleGrantBadge}
                isUpdating={updating}
            />
        </div>
    );
}

function BadgeGrantModal({ isOpen, onClose, onGrant, isUpdating }: { isOpen: boolean; onClose: () => void; onGrant: (data: any) => Promise<void>; isUpdating: boolean }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageURL, setImageURL] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onGrant({ name, description, imageURL });
        setName(""); setDescription(""); setImageURL("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >
                <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-navy-900 dark:text-white">Award Badge</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Badge Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Early Supporter" className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Joined during the pioneer phase" className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white h-20 resize-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Icon URL (Cloudinary/Direct)</label>
                        <input type="text" value={imageURL} onChange={(e) => setImageURL(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                    </div>
                    <button type="submit" disabled={isUpdating} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {isUpdating ? <Loader2 size={18} className="animate-spin" /> : "Grant Badge"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
