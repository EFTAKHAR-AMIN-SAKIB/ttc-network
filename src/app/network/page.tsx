"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, ShieldCheck, ShieldAlert, Check, X, Trash2,
    UserPlus, UserCheck, ChevronDown, ChevronUp, Loader2,
    Globe, Mail, BookOpen, ExternalLink, Shield, Compass, Heart, ArrowRight
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { 
    updateUserRole, 
    dismissUserVerification,
    getFriendRecommendations, 
    toggleFollowUser, 
    subscribeUsersByCollege,
    checkIsFollowing,
    getFollowersList,
    getFollowingList,
    type FirestoreUser 
} from "@/lib/firestore";
import { colleges } from "@/data/colleges";

export default function NetworkPage() {
    const { profile, user, loading: loadingAuth } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();
    const router = useRouter();

    const isManager = profile?.role === "manager" || profile?.role === "super_manager" || profile?.role === "admin";
    
    // Tab States: "auth" | "discover" | "my-network"
    const [activeTab, setActiveTab] = useState<"auth" | "discover" | "my-network">("discover");
    
    // Sub-tab under "My Network": "followers" | "following"
    const [networkTab, setNetworkTab] = useState<"followers" | "following">("following");

    // Data States
    const [collegeUsers, setCollegeUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [recommendations, setRecommendations] = useState<(FirestoreUser & { id: string })[]>([]);
    const [followers, setFollowers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [following, setFollowing] = useState<(FirestoreUser & { id: string })[]>([]);

    // Loading & Operation States
    const [loadingData, setLoadingData] = useState(true);
    const [processingVerify, setProcessingVerify] = useState<Record<string, boolean>>({});
    const [processingFollow, setProcessingFollow] = useState<Record<string, boolean>>({});
    const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    // Initial Tab Setup
    useEffect(() => {
        if (!loadingAuth && profile) {
            setActiveTab(isManager ? "auth" : "discover");
        }
    }, [loadingAuth, isManager, profile]);

    // 1. Subscribe to College Users (Manager verification)
    useEffect(() => {
        if (!profile?.collegeId || !isManager) return;

        const unsub = subscribeUsersByCollege(profile.collegeId, (users) => {
            // Exclude self and users who have been dismissed/deleted from the moderation list by this manager
            const filtered = users.filter(u => u.id !== profile.uid && !(u.dismissedBy || []).includes(profile.uid));
            setCollegeUsers(filtered);
        });

        return () => unsub();
    }, [profile?.collegeId, profile?.uid, isManager]);

    // 2. Fetch Social Network & Discover Recommendations
    const fetchSocialData = async () => {
        if (!profile?.uid) return;
        setLoadingData(true);
        try {
            // A. Get recommendations
            const recs = await getFriendRecommendations(profile.uid, profile.collegeId, 9);
            setRecommendations(recs);

            // B. Get Followers & Following
            const followerList = await getFollowersList(profile.uid);
            const followingList = await getFollowingList(profile.uid);
            
            setFollowers(followerList);
            setFollowing(followingList);

            // C. Build follow states for recommendations & followers
            const states: Record<string, boolean> = {};
            followingList.forEach(u => {
                states[u.id] = true;
            });
            
            // For recommendations, check in parallel
            await Promise.all(
                recs.map(async (u) => {
                    states[u.id] = await checkIsFollowing(profile.uid, u.id);
                })
            );
            
            setFollowingStates(states);
        } catch (err) {
            console.error("Failed to load social directories:", err);
            showToast("Failed to load connections data.", "error");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (profile?.uid) {
            fetchSocialData();
        }
    }, [profile?.uid, profile?.collegeId]);

    // Action: Approve user registration
    const handleApprove = async (userId: string, targetUser: FirestoreUser) => {
        if (processingVerify[userId]) return;
        setProcessingVerify(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, targetUser.role, true);
            showToast(`${targetUser.displayName}'s role verified successfully!`, "success");
        } catch (err: any) {
            showToast(err.message || "Failed to verify user.", "error");
        } finally {
            setProcessingVerify(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Action: Revoke user verification
    const handleRevoke = async (userId: string, targetUser: FirestoreUser) => {
        if (processingVerify[userId]) return;
        setProcessingVerify(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, targetUser.role, false);
            showToast(`Verification revoked for ${targetUser.displayName}.`, "info");
        } catch (err: any) {
            showToast(err.message || "Failed to revoke verification.", "error");
        } finally {
            setProcessingVerify(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Action: Dismiss/Delete user from authentication list
    const handleDismiss = async (userId: string, displayName: string) => {
        const confirmed = await confirm({
            title: "Hide User?",
            message: `Hide ${displayName} from your verification queue? (This will not delete their account entirely).`,
            confirmText: "Hide User",
            variant: "warning"
        });
        if (!confirmed) return;

        setProcessingVerify(prev => ({ ...prev, [userId]: true }));
        setConfirmLoading(true);
        try {
            await dismissUserVerification(userId);
            showToast(`Removed ${displayName} from your verification queue.`, "success");
        } catch (err: any) {
            showToast(err.message || "Failed to ignore user.", "error");
        } finally {
            setProcessingVerify(prev => ({ ...prev, [userId]: false }));
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    // Action: Toggle Follow / Unfollow
    const handleFollowToggle = async (targetUserId: string, displayName: string) => {
        if (processingFollow[targetUserId] || !profile?.uid) return;

        const currentlyFollowing = !!followingStates[targetUserId];
        
        // Optimistic UI updates
        setFollowingStates(prev => ({ ...prev, [targetUserId]: !currentlyFollowing }));
        setProcessingFollow(prev => ({ ...prev, [targetUserId]: true }));

        try {
            const newState = await toggleFollowUser(profile.uid, targetUserId);
            setFollowingStates(prev => ({ ...prev, [targetUserId]: newState }));
            showToast(
                newState 
                    ? `You started following ${displayName}.`
                    : `You unfollowed ${displayName}.`,
                "success"
            );
            // Refresh following list
            const followingList = await getFollowingList(profile.uid);
            setFollowing(followingList);
        } catch (err: any) {
            // Revert on failure
            setFollowingStates(prev => ({ ...prev, [targetUserId]: currentlyFollowing }));
            showToast(err.message || "Failed to follow user.", "error");
        } finally {
            setProcessingFollow(prev => ({ ...prev, [targetUserId]: false }));
        }
    };

    const getCollegeCity = (id: string) => {
        return colleges.find(c => c.id === id)?.city || id;
    };

    const getCollegeFullName = (id: string) => {
        return colleges.find(c => c.id === id)?.name || id;
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    if (loadingAuth || (loadingData && collegeUsers.length === 0 && recommendations.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Network Hub...</span>
            </div>
        );
    }

    if (!user || !profile) {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] transition-colors duration-300">
            {/* Page Header */}
            <header className="bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 pt-10 pb-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="text-primary w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Social Connections</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                        TTC Network Hub
                    </h1>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2 opacity-70">
                        {isManager 
                            ? `Verify campus registrations and grow your professional teaching network.` 
                            : `Discover teacher trainees, connect with college cohorts, and build your community.`}
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Panel: Profile Quick Summary Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-[#1a1b23] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                            {/* Glassmorphic decorative card header */}
                            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-primary to-accent opacity-10" />
                            
                            <div className="relative flex flex-col items-center text-center mt-6">
                                {/* Avatar */}
                                {profile.photoURL ? (
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white dark:border-[#1a1b23] shadow-lg bg-gray-100 mb-4">
                                        <Image 
                                            src={profile.photoURL} 
                                            alt={profile.displayName} 
                                            width={80} 
                                            height={80} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-black shadow-lg mb-4">
                                        {getInitials(profile.displayName)}
                                    </div>
                                )}

                                <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                    {profile.displayName}
                                </h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wider">
                                    TTC {getCollegeCity(profile.collegeId)}
                                </p>
                                <span className="mt-3 px-3 py-1 bg-primary/10 text-primary text-[9px] font-black rounded-full uppercase tracking-widest">
                                    {profile.role}
                                </span>

                                <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/60">
                                    <button 
                                        onClick={() => { setActiveTab("my-network"); setNetworkTab("followers"); }}
                                        className="text-center group/stat"
                                    >
                                        <span className="block text-xl font-black text-gray-900 dark:text-white group-hover/stat:text-primary transition-colors">
                                            {followers.length}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Followers</span>
                                    </button>
                                    <button 
                                        onClick={() => { setActiveTab("my-network"); setNetworkTab("following"); }}
                                        className="text-center group/stat"
                                    >
                                        <span className="block text-xl font-black text-gray-900 dark:text-white group-hover/stat:text-primary transition-colors">
                                            {following.length}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Following</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Menu in Sidebar */}
                        <div className="bg-white dark:bg-[#1a1b23] rounded-3xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
                            {isManager && (
                                <button
                                    onClick={() => setActiveTab("auth")}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                        activeTab === "auth"
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900"
                                    }`}
                                >
                                    <Shield size={16} />
                                    <span>Verification Center</span>
                                    {collegeUsers.filter(u => !u.roleVerified).length > 0 && (
                                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] ${
                                            activeTab === "auth" ? "bg-white text-primary" : "bg-primary text-white"
                                        }`}>
                                            {collegeUsers.filter(u => !u.roleVerified).length}
                                        </span>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab("discover")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === "discover"
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900"
                                }`}
                            >
                                <Compass size={16} />
                                <span>Discover People</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("my-network")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === "my-network"
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900"
                                }`}
                            >
                                <Users size={16} />
                                <span>My Network Directory</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Content Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-[#1a1b23] rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[500px]">
                            
                            {/* TAB 1: USER AUTHENTICATION (Managers Only) */}
                            {isManager && activeTab === "auth" && (
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-6 mb-6 gap-4">
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                User Authentication list
                                            </h2>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                Review and verify registrations for {getCollegeFullName(profile.collegeId)}.
                                            </p>
                                        </div>
                                        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20 shadow-sm self-start">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            {collegeUsers.length} Active Accounts
                                        </div>
                                    </div>

                                    {collegeUsers.length === 0 ? (
                                        <div className="py-20 text-center select-none">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                <ShieldAlert size={36} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                Your verification list is empty
                                            </h3>
                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                                                No members from your college are currently awaiting verification, or all entries have been cleared.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {collegeUsers.map((item) => {
                                                const isExpanded = expandedUser === item.id;
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        className={`p-5 rounded-2xl border transition-all duration-300 bg-white dark:bg-[#161620] hover:shadow-md ${
                                                            isExpanded 
                                                                ? "border-primary/30 shadow-sm bg-gradient-to-r from-primary/[0.01] to-transparent" 
                                                                : "border-gray-100 dark:border-gray-800/80"
                                                        }`}
                                                    >
                                                        {/* Info Row */}
                                                        <div 
                                                            className="flex items-center gap-4 cursor-pointer"
                                                            onClick={() => setExpandedUser(isExpanded ? null : item.id)}
                                                        >
                                                            {/* Photo */}
                                                            {item.photoURL ? (
                                                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100">
                                                                    <Image 
                                                                        src={item.photoURL} 
                                                                        alt={item.displayName} 
                                                                        width={48} 
                                                                        height={48} 
                                                                        className="w-full h-full object-cover animate-in fade-in duration-300"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-black shadow-inner">
                                                                    {getInitials(item.displayName)}
                                                                </div>
                                                            )}

                                                            {/* Summary details */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white truncate">
                                                                        {item.displayName}
                                                                    </h3>
                                                                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                                                </div>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2 mt-0.5">
                                                                    <span className="capitalize text-primary dark:text-[#1D9BF0]">{item.role}</span>
                                                                    {item.programme && (
                                                                        <>
                                                                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                            <span>{item.programme}</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Trust Badge */}
                                                            <div>
                                                                {item.roleVerified ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                                                        <ShieldCheck size={12} className="stroke-[2.5]" /> Verified
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-50 text-gray-500 dark:bg-[#1a1c28] dark:text-gray-400 border border-gray-150 dark:border-gray-800">
                                                                        <ShieldAlert size={12} /> Unverified
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Expandable Details Drawer */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="mt-4 p-4 bg-gray-50/70 dark:bg-black/25 border-l-[3px] border-primary/45 rounded-r-2xl space-y-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                                        <div className="grid grid-cols-2 gap-4 text-gray-500 dark:text-gray-400">
                                                                            <div>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block">Email Address</span>
                                                                                {item.email}
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block">Academic Year / Semester</span>
                                                                                {item.yearSemester || ((item as any).year && (item as any).semester ? `Year ${(item as any).year}, Semester ${(item as any).semester}` : "N/A")}
                                                                            </div>
                                                                            {item.clubPosition && (
                                                                                <div className="col-span-2">
                                                                                    <span className="font-bold text-gray-800 dark:text-gray-200 block">Club Affiliation</span>
                                                                                    {item.clubPosition}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {item.bio && (
                                                                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800/40">
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block mb-1">Biography</span>
                                                                                <p className="italic leading-relaxed break-words">{item.bio}</p>
                                                                            </div>
                                                                        )}

                                                                        <div className="pt-2 flex justify-end">
                                                                            <Link
                                                                                href={`/profile/${item.id}`}
                                                                                className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                                                                            >
                                                                                Full Profile Details <ExternalLink size={12} />
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Verification Actions Operations & Delete/Dismiss */}
                                                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-850 flex justify-between items-center gap-3">
                                                            {/* Dismiss/Delete Button - Clears user from verification list only */}
                                                            <button
                                                                onClick={() => handleDismiss(item.id, item.displayName)}
                                                                disabled={processingVerify[item.id]}
                                                                className="px-4 py-2 border border-dashed border-red-500/30 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/15 text-red-500 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                                                                title="Clear from authentication list without deleting account"
                                                            >
                                                                <Trash2 size={12} />
                                                                Clear List
                                                            </button>

                                                            <div className="flex gap-2.5">
                                                                {!item.roleVerified ? (
                                                                    <button
                                                                        onClick={() => handleApprove(item.id, item)}
                                                                        disabled={processingVerify[item.id]}
                                                                        className="px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/10 flex items-center gap-1.5"
                                                                    >
                                                                        {processingVerify[item.id] ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} className="stroke-[3]" />}
                                                                        Approve
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleRevoke(item.id, item)}
                                                                        disabled={processingVerify[item.id]}
                                                                        className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 hover:border-red-500 hover:text-red-500 text-gray-600 dark:text-gray-400 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                                                                    >
                                                                        {processingVerify[item.id] ? <Loader2 className="animate-spin" size={12} /> : <X size={12} />}
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: DISCOVER PEOPLE */}
                            {activeTab === "discover" && (
                                <div className="p-6 sm:p-8">
                                    <div className="border-b border-gray-100 dark:border-gray-850 pb-6 mb-6">
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            Discover People
                                        </h2>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                            Suggested peers and teachers you may know across TTC network campuses.
                                        </p>
                                    </div>

                                    {recommendations.length === 0 ? (
                                        <div className="py-20 text-center select-none">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                <Compass size={36} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                No new recommendations
                                            </h3>
                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">
                                                You are currently connected to all suggested members from your college. Check back soon!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {recommendations.map((item) => {
                                                const isFollowing = !!followingStates[item.id];
                                                const isWorking = !!processingFollow[item.id];
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        className="flex items-center gap-4 p-4 bg-white dark:bg-[#161620] rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:shadow-md transition-all duration-300"
                                                    >
                                                        {/* Avatar */}
                                                        <Link href={`/profile/${item.id}`} className="shrink-0 relative group">
                                                            {item.photoURL ? (
                                                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100">
                                                                    <Image 
                                                                        src={item.photoURL} 
                                                                        alt={item.displayName} 
                                                                        width={48} 
                                                                        height={48} 
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-black shadow-inner group-hover:scale-105 transition-transform duration-350">
                                                                    {getInitials(item.displayName)}
                                                                </div>
                                                            )}
                                                            {item.roleVerified && (
                                                                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#161620] rounded-full flex items-center justify-center" title="Verified Member">
                                                                    <Check className="text-white w-3 h-3 stroke-[3]" />
                                                                </span>
                                                            )}
                                                        </Link>

                                                        {/* Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <Link 
                                                                href={`/profile/${item.id}`}
                                                                className="text-base font-extrabold text-gray-900 dark:text-white truncate block hover:text-primary transition-colors"
                                                            >
                                                                {item.displayName}
                                                            </Link>
                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                                <span>TTC {getCollegeCity(item.collegeId)}</span>
                                                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                <span className="capitalize">{item.role}</span>
                                                            </p>
                                                        </div>

                                                        {/* Follow action button */}
                                                        <div className="shrink-0">
                                                            {isFollowing ? (
                                                                <button
                                                                    onClick={() => handleFollowToggle(item.id, item.displayName)}
                                                                    disabled={isWorking}
                                                                    className="px-4 py-2 border border-gray-250 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                                >
                                                                    Following
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleFollowToggle(item.id, item.displayName)}
                                                                    disabled={isWorking}
                                                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1"
                                                                >
                                                                    <UserPlus size={12} className="stroke-[2.5]" /> Follow
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: MY NETWORK DIRECTORY (Followers / Following) */}
                            {activeTab === "my-network" && (
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-4 mb-6 gap-4">
                                        <div>
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                My Network Directory
                                            </h2>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                Browse all people you are following or who follow you.
                                            </p>
                                        </div>
                                        
                                        {/* Sub Tabs Selector */}
                                        <div className="flex p-1 bg-gray-150/60 dark:bg-gray-800/40 rounded-xl border border-gray-200/20 shadow-inner self-start">
                                            <button
                                                onClick={() => setNetworkTab("following")}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    networkTab === "following"
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                }`}
                                            >
                                                Following ({following.length})
                                            </button>
                                            <button
                                                onClick={() => setNetworkTab("followers")}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    networkTab === "followers"
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                }`}
                                            >
                                                Followers ({followers.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub-tab 1: Following */}
                                    {networkTab === "following" && (
                                        following.length === 0 ? (
                                            <div className="py-20 text-center select-none">
                                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                    <Users size={36} />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    You are not following anyone
                                                </h3>
                                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                                                    Start discovering people in the Discover People tab to build your custom connections list!
                                                </p>
                                                <button
                                                    onClick={() => setActiveTab("discover")}
                                                    className="mt-6 px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all flex items-center gap-1.5 mx-auto"
                                                >
                                                    Discover Connections <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                {following.map((item) => {
                                                    const isFollowing = !!followingStates[item.id];
                                                    const isWorking = !!processingFollow[item.id];
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            className="flex items-center gap-4 p-4 bg-white dark:bg-[#161620] rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:shadow-md transition-all"
                                                        >
                                                            <Link href={`/profile/${item.id}`} className="shrink-0 relative group">
                                                                {item.photoURL ? (
                                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 animate-in fade-in duration-300">
                                                                        <Image 
                                                                            src={item.photoURL} 
                                                                            alt={item.displayName} 
                                                                            width={48} 
                                                                            height={48} 
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-black shadow-inner group-hover:scale-105 transition-transform duration-350">
                                                                        {getInitials(item.displayName)}
                                                                    </div>
                                                                )}
                                                                {item.roleVerified && (
                                                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#161620] rounded-full flex items-center justify-center">
                                                                        <Check className="text-white w-3 h-3 stroke-[3]" />
                                                                    </span>
                                                                )}
                                                            </Link>
                                                            <div className="flex-1 min-w-0">
                                                                <Link 
                                                                    href={`/profile/${item.id}`}
                                                                    className="text-base font-extrabold text-gray-900 dark:text-white truncate block hover:text-primary transition-colors"
                                                                >
                                                                    {item.displayName}
                                                                </Link>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                                    <span>TTC {getCollegeCity(item.collegeId)}</span>
                                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                    <span className="capitalize">{item.role}</span>
                                                                </p>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <button
                                                                    onClick={() => handleFollowToggle(item.id, item.displayName)}
                                                                    disabled={isWorking}
                                                                    className="px-4 py-2 border border-gray-250 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                                >
                                                                    {isFollowing ? "Following" : "Unfollowed"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}

                                    {/* Sub-tab 2: Followers */}
                                    {networkTab === "followers" && (
                                        followers.length === 0 ? (
                                            <div className="py-20 text-center select-none">
                                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                    <Users size={36} />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    No followers yet
                                                </h3>
                                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                                                    When other teachers and peers follow your updates, they will appear in this directory!
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                {followers.map((item) => {
                                                    const isFollowing = !!followingStates[item.id];
                                                    const isWorking = !!processingFollow[item.id];
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            className="flex items-center gap-4 p-4 bg-white dark:bg-[#161620] rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:shadow-md transition-all animate-in fade-in duration-200"
                                                        >
                                                            <Link href={`/profile/${item.id}`} className="shrink-0 relative group">
                                                                {item.photoURL ? (
                                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100">
                                                                        <Image 
                                                                            src={item.photoURL} 
                                                                            alt={item.displayName} 
                                                                            width={48} 
                                                                            height={48} 
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-black shadow-inner group-hover:scale-105 transition-transform duration-350">
                                                                        {getInitials(item.displayName)}
                                                                    </div>
                                                                )}
                                                                {item.roleVerified && (
                                                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#161620] rounded-full flex items-center justify-center">
                                                                        <Check className="text-white w-3 h-3 stroke-[3]" />
                                                                    </span>
                                                                )}
                                                            </Link>
                                                            <div className="flex-1 min-w-0">
                                                                <Link 
                                                                    href={`/profile/${item.id}`}
                                                                    className="text-base font-extrabold text-gray-900 dark:text-white truncate block hover:text-primary transition-colors"
                                                                >
                                                                    {item.displayName}
                                                                </Link>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                                                    <span>TTC {getCollegeCity(item.collegeId)}</span>
                                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                    <span className="capitalize">{item.role}</span>
                                                                </p>
                                                            </div>
                                                            <div className="shrink-0">
                                                                {isFollowing ? (
                                                                    <button
                                                                        onClick={() => handleFollowToggle(item.id, item.displayName)}
                                                                        disabled={isWorking}
                                                                        className="px-4 py-2 border border-gray-250 dark:border-gray-700 text-gray-500 dark:text-gray-450 hover:text-red-500 hover:border-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                                    >
                                                                        Following
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleFollowToggle(item.id, item.displayName)}
                                                                        disabled={isWorking}
                                                                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1"
                                                                    >
                                                                        <UserPlus size={12} className="stroke-[2.5]" /> Back
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
