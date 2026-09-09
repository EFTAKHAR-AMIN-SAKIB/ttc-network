"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, ShieldCheck, ShieldAlert, Check, X, Trash2,
    UserPlus, UserCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2,
    Globe, Mail, BookOpen, ExternalLink, Shield, Compass, Heart, ArrowRight,
    Search, School, Filter, Sparkles, GraduationCap, LayoutGrid, Layers, UserX
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { 
    updateUserRole, 
    dismissUserVerification,
    getFriendRecommendations, 
    getCategorizedFriendRecommendations,
    type CategorizedRecommendations,
    toggleFollowUser, 
    subscribeUsersByCollege,
    subscribeAllUsers,
    checkIsFollowing,
    getFollowersList,
    getFollowingList,
    getAllUsers,
    type FirestoreUser 
} from "@/lib/firestore";
import { colleges } from "@/data/colleges";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

export default function NetworkPage() {
    const { profile, user, loading: loadingAuth } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();
    const router = useRouter();
    const { requireVerification } = useVerifiedAccess();

    const isManager = profile?.role === "manager" || profile?.role === "super_manager" || profile?.role === "admin";
    const canViewAllColleges = profile?.role === "admin" || profile?.role === "super_manager";
    
    // Tab States: "auth" | "discover" | "my-network"
    const [activeTab, setActiveTab] = useState<"auth" | "discover" | "my-network">("discover");
    
    // Scope for admin & super_manager: "my_college" | "all_colleges"
    const [authScope, setAuthScope] = useState<"my_college" | "all_colleges">("my_college");
    const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>("all");
    const [authSearchQuery, setAuthSearchQuery] = useState("");
    const [allUnverifiedUsers, setAllUnverifiedUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    
    // Sub-tab under "My Network": "followers" | "following"
    const [networkTab, setNetworkTab] = useState<"followers" | "following">("following");

    // Data States
    const [collegeUsers, setCollegeUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [recommendations, setRecommendations] = useState<(FirestoreUser & { id: string })[]>([]);
    const [myCollegeRecs, setMyCollegeRecs] = useState<(FirestoreUser & { id: string })[]>([]);
    const [otherCollegesRecs, setOtherCollegesRecs] = useState<(FirestoreUser & { id: string })[]>([]);
    const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());
    const [discoverViewMode, setDiscoverViewMode] = useState<"reel" | "grid">("reel");
    const [otherCollegeFilter, setOtherCollegeFilter] = useState<string>("all");
    const [followers, setFollowers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [following, setFollowing] = useState<(FirestoreUser & { id: string })[]>([]);

    // Scroll refs for reels
    const myCollegeScrollRef = useRef<HTMLDivElement>(null);
    const otherCollegesScrollRef = useRef<HTMLDivElement>(null);

    const scrollReel = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
        if (ref.current) {
            const scrollAmount = direction === "left" ? -480 : 480;
            ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    const handleDismissSuggestion = (userId: string) => {
        setDismissedSuggestionIds(prev => {
            const next = new Set(prev);
            next.add(userId);
            return next;
        });
        showToast("Suggestion removed", "info");
    };

    const getSuggestionReason = (targetUser: FirestoreUser) => {
        const isSameCollege = targetUser.collegeId === profile?.collegeId;
        
        // Clean string for comparisons
        const clean = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const myYearSem = clean(profile?.yearSemester || `${profile?.year || ""} ${profile?.semester || ""}`);
        const targetYearSem = clean(targetUser.yearSemester);

        // Exact year & semester match (batchmates!)
        if (myYearSem && targetYearSem && myYearSem === targetYearSem) {
            return {
                label: isSameCollege ? `Same Batch (${targetUser.yearSemester})` : `Same Semester (${targetUser.yearSemester})`,
                type: "batch" as const,
                color: "text-blue-700 dark:text-sky-300 bg-blue-500/10 border-blue-500/20"
            };
        }

        if (targetUser.role === "teacher") {
            return {
                label: isSameCollege ? "Campus Faculty / Teacher" : "Educator in TTC Network",
                type: "teacher" as const,
                color: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/20"
            };
        }

        if (profile?.programme && targetUser.programme && profile.programme === targetUser.programme) {
            const progName = targetUser.programme === "BEdHonours" ? "B.Ed Honours" : targetUser.programme;
            return {
                label: isSameCollege ? `Also in ${progName}` : `Fellow ${progName} Student`,
                type: "programme" as const,
                color: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
            };
        }

        if (isSameCollege) {
            return {
                label: "From your campus",
                type: "college" as const,
                color: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20"
            };
        }

        return {
            label: `TTC ${getCollegeCity(targetUser.collegeId || "")}`,
            type: "peer" as const,
            color: "text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20"
        };
    };

    // Loading & Operation States
    const [loadingData, setLoadingData] = useState(true);
    const [processingVerify, setProcessingVerify] = useState<Record<string, boolean>>({});
    const [processingFollow, setProcessingFollow] = useState<Record<string, boolean>>({});
    const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    // Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<(FirestoreUser & { id: string })[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchingLoader, setSearchingLoader] = useState(false);

    // Initial Tab Setup
    useEffect(() => {
        if (!loadingAuth && profile) {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab");
            if (tabParam === "discover" || tabParam === "my-network" || tabParam === "auth") {
                setActiveTab(tabParam as any);
            } else {
                setActiveTab(isManager ? "auth" : "discover");
            }
        }
    }, [loadingAuth, isManager, profile]);

    // 1. Subscribe to Users for Verification Center
    useEffect(() => {
        if (!profile?.uid || !isManager) return;

        if (canViewAllColleges) {
            // Admin & Super Manager can see all users across all 14 colleges
            const unsub = subscribeAllUsers((users) => {
                const filtered = users.filter(u => 
                    u.id !== profile.uid && 
                    !u.roleVerified && 
                    !(u.dismissedBy || []).includes(profile.uid)
                );
                setAllUnverifiedUsers(filtered);

                // Also populate collegeUsers with the admin's own college
                const myCollegeFiltered = filtered.filter(u => u.collegeId === profile.collegeId);
                setCollegeUsers(myCollegeFiltered);
            });
            return () => unsub();
        } else {
            // Standard manager only subscribes to their own college
            if (!profile.collegeId) return;
            const unsub = subscribeUsersByCollege(profile.collegeId, (users) => {
                const filtered = users.filter(u => 
                    u.id !== profile.uid && 
                    !u.roleVerified && 
                    !(u.dismissedBy || []).includes(profile.uid)
                );
                setCollegeUsers(filtered);
            });
            return () => unsub();
        }
    }, [profile?.collegeId, profile?.uid, isManager, canViewAllColleges]);

    // Compute displayed pending users based on scope, campus filter, and search query
    const displayedAuthUsers = useMemo(() => {
        let list = (canViewAllColleges && authScope === "all_colleges") 
            ? allUnverifiedUsers 
            : collegeUsers;

        // If filtering by specific college
        if (canViewAllColleges && authScope === "all_colleges" && selectedCollegeFilter !== "all") {
            list = list.filter(u => u.collegeId === selectedCollegeFilter);
        }

        // If searching
        if (authSearchQuery.trim()) {
            const q = authSearchQuery.trim().toLowerCase();
            list = list.filter(u => 
                (u.displayName || "").toLowerCase().includes(q) ||
                (u.email || "").toLowerCase().includes(q) ||
                (u.username || "").toLowerCase().includes(q) ||
                (u.programme || "").toLowerCase().includes(q) ||
                getCollegeFullName(u.collegeId || "").toLowerCase().includes(q) ||
                getCollegeCity(u.collegeId || "").toLowerCase().includes(q)
            );
        }

        return list;
    }, [canViewAllColleges, authScope, allUnverifiedUsers, collegeUsers, selectedCollegeFilter, authSearchQuery]);

    const myCollegePendingCount = collegeUsers.length;
    const allCollegesPendingCount = allUnverifiedUsers.length;
    const authBadgeCount = canViewAllColleges && authScope === "all_colleges"
        ? allCollegesPendingCount
        : myCollegePendingCount;

    // Filtered & categorized discover lists
    const visibleMyCollege = useMemo(() => {
        return myCollegeRecs.filter(u => !dismissedSuggestionIds.has(u.id));
    }, [myCollegeRecs, dismissedSuggestionIds]);

    const filteredOtherColleges = useMemo(() => {
        let list = otherCollegesRecs.filter(u => !dismissedSuggestionIds.has(u.id));
        if (otherCollegeFilter !== "all") {
            list = list.filter(u => u.collegeId === otherCollegeFilter);
        }
        return list;
    }, [otherCollegesRecs, dismissedSuggestionIds, otherCollegeFilter]);

    // Unique colleges present in recommendations from other campuses
    const availableOtherColleges = useMemo(() => {
        const ids = Array.from(new Set(otherCollegesRecs.map(u => u.collegeId).filter(Boolean)));
        return colleges.filter(c => ids.includes(c.id) && c.id !== profile?.collegeId);
    }, [otherCollegesRecs, profile?.collegeId]);

    // 2. Fetch Social Network & Discover Recommendations
    const fetchSocialData = async () => {
        if (!profile?.uid) return;
        setLoadingData(true);
        try {
            // A. Get categorized recommendations (my college & other colleges)
            const categorized = await getCategorizedFriendRecommendations(profile.uid, profile.collegeId, profile, 30);
            setMyCollegeRecs(categorized.myCollege);
            setOtherCollegesRecs(categorized.otherColleges);
            
            const combinedRecs = [...categorized.myCollege, ...categorized.otherColleges];
            setRecommendations(combinedRecs);

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
                combinedRecs.map(async (u) => {
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
            const collegeName = getCollegeCity(targetUser.collegeId || "") + " TTC";
            showToast(`✅ ${targetUser.displayName} (${collegeName}) verified successfully!`, "success");
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
        if (!requireVerification("follow users")) return;
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

    // Action: Search Users
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const queryStr = searchQuery.trim().toLowerCase();
        if (!queryStr) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }
        setSearchingLoader(true);
        setIsSearching(true);
        try {
            const allUsers = await getAllUsers();
            // Filter out current user and match displayName or username
            const filtered = allUsers.filter(u => 
                u.id !== profile?.uid &&
                (u.displayName?.toLowerCase().includes(queryStr) || 
                 u.username?.toLowerCase().includes(queryStr))
            );
            
            // Build follow states for search results in followingStates
            const states = { ...followingStates };
            await Promise.all(
                filtered.map(async (u) => {
                    if (states[u.id] === undefined && profile?.uid) {
                        states[u.id] = await checkIsFollowing(profile.uid, u.id);
                    }
                })
            );
            setFollowingStates(states);
            setSearchResults(filtered);
        } catch (err) {
            console.error("Search failed:", err);
            showToast("Failed to search users.", "error");
        } finally {
            setSearchingLoader(false);
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

    const renderUserCard = (item: FirestoreUser & { id: string }, isFromMyCollege: boolean) => {
        const isFollowing = !!followingStates[item.id];
        const isWorking = !!processingFollow[item.id];
        const reason = getSuggestionReason(item);

        return (
            <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className={`group bg-white dark:bg-[#161620] rounded-2xl border border-gray-150 dark:border-gray-800 hover:border-primary/40 dark:hover:border-primary/50 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                    discoverViewMode === "reel" 
                        ? "w-[215px] sm:w-[235px] shrink-0 snap-start" 
                        : "w-full"
                }`}
            >
                {/* Top Cover Banner */}
                <div className="relative h-20 w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-primary">
                    {item.coverUrl ? (
                        <Image
                            src={item.coverUrl}
                            alt=""
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-primary/90">
                            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                        </div>
                    )}

                    {/* Dismiss Button (Facebook-style Remove X) */}
                    <button
                        type="button"
                        onClick={() => handleDismissSuggestion(item.id)}
                        title="Remove suggestion"
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white transition-all backdrop-blur-xs z-10 opacity-80 group-hover:opacity-100 cursor-pointer"
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* Avatar Row */}
                <div className="relative -mt-10 px-4 flex justify-center z-10">
                    <Link href={`/profile/${item.id}`} className="relative block group/avatar">
                        {item.photoURL ? (
                            <div className="w-18 h-18 rounded-2xl overflow-hidden border-3 border-white dark:border-[#161620] shadow-md bg-gray-100 dark:bg-gray-800">
                                <Image
                                    src={item.photoURL}
                                    alt={item.displayName}
                                    width={72}
                                    height={72}
                                    className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                                />
                            </div>
                        ) : (
                            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-black shadow-md border-3 border-white dark:border-[#161620]">
                                {getInitials(item.displayName)}
                            </div>
                        )}
                        {item.roleVerified && (
                            <span 
                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#161620] rounded-full flex items-center justify-center shadow-xs" 
                                title="Verified TTC Member"
                            >
                                <Check className="text-white w-3 h-3 stroke-[3]" />
                            </span>
                        )}
                    </Link>
                </div>

                {/* Profile Info */}
                <div className="p-3.5 pt-2 text-center flex flex-col items-center flex-grow">
                    <Link
                        href={`/profile/${item.id}`}
                        className="text-sm font-extrabold text-gray-900 dark:text-white hover:text-primary transition-colors truncate max-w-[190px] block leading-tight"
                        title={item.displayName}
                    >
                        {item.displayName}
                    </Link>

                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1 truncate max-w-[190px]">
                        <span className="truncate">TTC {getCollegeCity(item.collegeId || "")}</span>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full shrink-0" />
                        <span className="capitalize shrink-0">{item.role}</span>
                    </p>

                    {/* Facebook-style Suggestion Reason Pill */}
                    <div className="mt-2.5 w-full">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border max-w-full truncate ${reason.color}`}>
                            {reason.type === "batch" && <Sparkles size={11} className="shrink-0" />}
                            {reason.type === "teacher" && <School size={11} className="shrink-0" />}
                            {reason.type === "programme" && <BookOpen size={11} className="shrink-0" />}
                            {reason.type === "college" && <School size={11} className="shrink-0" />}
                            {reason.type === "peer" && <Globe size={11} className="shrink-0" />}
                            <span className="truncate">{reason.label}</span>
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 pt-0 flex flex-col gap-1.5 w-full mt-auto">
                    {isFollowing ? (
                        <button
                            type="button"
                            onClick={() => handleFollowToggle(item.id, item.displayName)}
                            disabled={isWorking}
                            className="w-full py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-500 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Check size={13} className="text-emerald-500" />
                            <span>Following</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleFollowToggle(item.id, item.displayName)}
                            disabled={isWorking}
                            className="w-full py-2 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <UserPlus size={13} className="stroke-[2.5]" />
                            <span>Follow</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => handleDismissSuggestion(item.id)}
                        className="w-full py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                        Remove
                    </button>
                </div>
            </motion.div>
        );
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
                                    {authBadgeCount > 0 && (
                                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${
                                            activeTab === "auth" ? "bg-white text-primary" : "bg-primary text-white"
                                        }`}>
                                            {authBadgeCount}
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
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-6 mb-6 gap-4">
                                        <div>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    User Authentication list
                                                </h2>
                                                {canViewAllColleges && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                                        <Globe size={11} /> Master Access
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                {canViewAllColleges && authScope === "all_colleges"
                                                    ? "Review and verify registrations across all 14 TTC Campuses."
                                                    : `Review and verify registrations for ${getCollegeFullName(profile?.collegeId || "")}.`}
                                            </p>
                                        </div>
                                        <div className="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-amber-500/20 shadow-sm self-start">
                                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                            {displayedAuthUsers.length} Pending {canViewAllColleges && authScope === "all_colleges" ? "(Network-Wide)" : "Verifications"}
                                        </div>
                                    </div>

                                    {/* Admin / Super Manager Network-Wide Controls Bar */}
                                    {canViewAllColleges && (
                                        <div className="mb-6 p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800/80 space-y-3.5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        Authentication Scope:
                                                    </span>
                                                </div>

                                                {/* Scope Toggle: My College vs All Colleges */}
                                                <div className="inline-flex p-1 bg-white dark:bg-[#12131a] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAuthScope("my_college");
                                                            setSelectedCollegeFilter("all");
                                                        }}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                            authScope === "my_college"
                                                                ? "bg-primary text-white shadow-sm"
                                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                        }`}
                                                    >
                                                        <School size={13} />
                                                        <span>My College</span>
                                                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${
                                                            authScope === "my_college" ? "bg-white/20 text-white" : "bg-gray-150 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                                        }`}>
                                                            {myCollegePendingCount}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthScope("all_colleges")}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                            authScope === "all_colleges"
                                                                ? "bg-primary text-white shadow-sm"
                                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                        }`}
                                                    >
                                                        <Globe size={13} />
                                                        <span>Whole Network (14 Campuses)</span>
                                                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${
                                                            authScope === "all_colleges" ? "bg-white/20 text-white" : "bg-gray-150 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                                        }`}>
                                                            {allCollegesPendingCount}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Extra Filters when in All Colleges Scope */}
                                            {authScope === "all_colleges" && (
                                                <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {/* College Filter Dropdown */}
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <Filter size={14} />
                                                        </div>
                                                        <select
                                                            value={selectedCollegeFilter}
                                                            onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                                                            aria-label="Filter by College Campus"
                                                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#15161f] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                                        >
                                                            <option value="all">All 14 Campuses ({allCollegesPendingCount} pending)</option>
                                                            {colleges.map((col) => {
                                                                const count = allUnverifiedUsers.filter(u => u.collegeId === col.id).length;
                                                                return (
                                                                    <option key={col.id} value={col.id}>
                                                                        {col.city} TTC ({col.name}) — {count} pending
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                                            <ChevronDown size={14} />
                                                        </div>
                                                    </div>

                                                    {/* Quick Search */}
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                            <Search size={14} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={authSearchQuery}
                                                            onChange={(e) => setAuthSearchQuery(e.target.value)}
                                                            placeholder="Search by student name, email, roll..."
                                                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#15161f] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        />
                                                        {authSearchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAuthSearchQuery("")}
                                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Verification List or Empty State */}
                                    {displayedAuthUsers.length === 0 ? (
                                        <div className="py-20 text-center select-none">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                <ShieldAlert size={36} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                {authSearchQuery || selectedCollegeFilter !== "all" 
                                                    ? "No matching users found" 
                                                    : "Your verification list is empty"}
                                            </h3>
                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                                                {authSearchQuery || selectedCollegeFilter !== "all"
                                                    ? "Try clearing your search query or college campus filter to see more users."
                                                    : (canViewAllColleges && authScope === "all_colleges"
                                                        ? "No members across all 14 TTC campuses are currently awaiting verification."
                                                        : "No members from your college are currently awaiting verification, or all entries have been cleared.")}
                                            </p>
                                            {(authSearchQuery || selectedCollegeFilter !== "all") && (
                                                <button
                                                    onClick={() => {
                                                        setAuthSearchQuery("");
                                                        setSelectedCollegeFilter("all");
                                                    }}
                                                    className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {displayedAuthUsers.map((item) => {
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
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    <span className="capitalize text-primary dark:text-[#1D9BF0]">{item.role}</span>
                                                                    {item.programme && (
                                                                        <>
                                                                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                            <span>{item.programme}</span>
                                                                        </>
                                                                    )}
                                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/40">
                                                                        <School size={10} />
                                                                        {getCollegeCity(item.collegeId || "")} TTC
                                                                    </span>
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
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-500 dark:text-gray-400">
                                                                            <div>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block">Email Address</span>
                                                                                {item.email}
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block">College Campus</span>
                                                                                <span className="text-primary font-bold">{getCollegeFullName(item.collegeId || "")}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-bold text-gray-800 dark:text-gray-200 block">Academic Year / Semester</span>
                                                                                {item.yearSemester || ((item as any).year && (item as any).semester ? `Year ${(item as any).year}, Semester ${(item as any).semester}` : "N/A")}
                                                                            </div>
                                                                            {item.clubPosition && (
                                                                                <div>
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
                                    {/* Header with Title & View Mode Toggle */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-6 mb-6 gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles className="text-amber-500 w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">People You May Know</span>
                                            </div>
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                Discover Network Peers
                                            </h2>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                Smart suggestions based on your campus, year, semester, and teacher training programmes.
                                            </p>
                                        </div>

                                        {/* View Mode Toggle: Reel View vs Grid View */}
                                        <div className="flex items-center bg-gray-100 dark:bg-[#161620] p-1 rounded-2xl border border-gray-200/50 dark:border-gray-800 self-start sm:self-center shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setDiscoverViewMode("reel")}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    discoverViewMode === "reel"
                                                        ? "bg-white dark:bg-gray-800 text-primary shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                }`}
                                                title="Reel View (Horizontal Carousel)"
                                            >
                                                <Layers size={14} />
                                                <span>Reel View</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDiscoverViewMode("grid")}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    discoverViewMode === "grid"
                                                        ? "bg-white dark:bg-gray-800 text-primary shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                }`}
                                                title="Grid View (Expanded Grid)"
                                            >
                                                <LayoutGrid size={14} />
                                                <span>Grid View</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="mb-8">
                                        <form onSubmit={handleSearch} className="flex gap-3">
                                            <div className="relative flex-grow">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                                    <Search size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search people by name or username across TTC network..."
                                                    className="w-full pl-11 pr-10 py-3.5 bg-gray-50 dark:bg-[#161620] border-2 border-gray-100 dark:border-gray-800 focus:border-primary dark:focus:border-primary rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-0 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSearchQuery("");
                                                            setIsSearching(false);
                                                            setSearchResults([]);
                                                        }}
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={searchingLoader}
                                                className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-primary/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer"
                                            >
                                                {searchingLoader ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : (
                                                    <Search size={14} className="stroke-[3]" />
                                                )}
                                                Search
                                            </button>
                                        </form>
                                    </div>

                                    {/* SEARCH RESULTS VIEW */}
                                    {isSearching ? (
                                        searchingLoader ? (
                                            <div className="py-20 text-center select-none">
                                                <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                                                <span className="text-sm font-black uppercase tracking-widest text-gray-400">Searching Network...</span>
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="py-20 text-center select-none">
                                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                    <Search size={36} />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    No results found
                                                </h3>
                                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">
                                                    We couldn't find anyone matching "{searchQuery}". Try another query or campus.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        setIsSearching(false);
                                                        setSearchResults([]);
                                                    }}
                                                    className="mt-6 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                                                >
                                                    Back to Suggestions
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                                                        Found {searchResults.length} matching {searchResults.length === 1 ? "person" : "people"}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery("");
                                                            setIsSearching(false);
                                                            setSearchResults([]);
                                                        }}
                                                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                                    >
                                                        Clear Search
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    <AnimatePresence mode="popLayout">
                                                        {searchResults.map((item) => renderUserCard(item, item.collegeId === profile?.collegeId))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        )
                                    ) : visibleMyCollege.length === 0 && otherCollegesRecs.filter(u => !dismissedSuggestionIds.has(u.id)).length === 0 ? (
                                        <div className="py-20 text-center select-none">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[35%] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                                                <Compass size={36} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                No new recommendations
                                            </h3>
                                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">
                                                You are currently connected to all suggested members across TTC colleges. Check back soon!
                                            </p>
                                            {dismissedSuggestionIds.size > 0 && (
                                                <button
                                                    onClick={() => setDismissedSuggestionIds(new Set())}
                                                    className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                >
                                                    Reset dismissed suggestions ({dismissedSuggestionIds.size})
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            {/* CATEGORY 1: Peers at Your College */}
                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                <School size={17} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                        Peers at Your College
                                                                    </h3>
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                                                                        {visibleMyCollege.length}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                                    TTC {getCollegeCity(profile?.collegeId || "")} • Classmates, batchmates & teachers you may know
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reel Controls (Left / Right scroll buttons) */}
                                                    {discoverViewMode === "reel" && visibleMyCollege.length > 0 && (
                                                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollReel(myCollegeScrollRef, "left")}
                                                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#1f202b] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                title="Scroll left"
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollReel(myCollegeScrollRef, "right")}
                                                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#1f202b] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                title="Scroll right"
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {visibleMyCollege.length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50/60 dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                                        <GraduationCap className="mx-auto text-gray-400 mb-2" size={28} />
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            You are connected with all suggested classmates from TTC {getCollegeCity(profile?.collegeId || "")}!
                                                        </p>
                                                    </div>
                                                ) : discoverViewMode === "reel" ? (
                                                    <div
                                                        ref={myCollegeScrollRef}
                                                        className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar -mx-1 px-1"
                                                    >
                                                        <AnimatePresence mode="popLayout">
                                                            {visibleMyCollege.map((item) => renderUserCard(item, true))}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                        <AnimatePresence mode="popLayout">
                                                            {visibleMyCollege.map((item) => renderUserCard(item, true))}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>

                                            {/* CATEGORY 2: Explore Other Campuses */}
                                            <div className="pt-8 border-t border-gray-100 dark:border-gray-850 space-y-5">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                                <Globe size={17} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                        Explore Other TTC Campuses
                                                                    </h3>
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                                                                        {filteredOtherColleges.length}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                                    Expand your reach across teacher training colleges nationwide
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reel Controls (Left / Right scroll buttons) */}
                                                    {discoverViewMode === "reel" && filteredOtherColleges.length > 0 && (
                                                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollReel(otherCollegesScrollRef, "left")}
                                                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#1f202b] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                title="Scroll left"
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollReel(otherCollegesScrollRef, "right")}
                                                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#1f202b] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                title="Scroll right"
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Campus Filter Pills */}
                                                {otherCollegesRecs.length > 0 && (
                                                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOtherCollegeFilter("all")}
                                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                                                                otherCollegeFilter === "all"
                                                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                                                    : "bg-gray-100 dark:bg-[#161620] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                                                            }`}
                                                        >
                                                            All Campuses ({otherCollegesRecs.filter(u => !dismissedSuggestionIds.has(u.id)).length})
                                                        </button>
                                                        {availableOtherColleges.map((col) => {
                                                            const count = otherCollegesRecs.filter(u => u.collegeId === col.id && !dismissedSuggestionIds.has(u.id)).length;
                                                            if (count === 0) return null;
                                                            const isSelected = otherCollegeFilter === col.id;
                                                            return (
                                                                <button
                                                                    key={col.id}
                                                                    type="button"
                                                                    onClick={() => setOtherCollegeFilter(col.id)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                                                        isSelected
                                                                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                                                            : "bg-gray-100 dark:bg-[#161620] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent"
                                                                    }`}
                                                                >
                                                                    <span>TTC {col.city}</span>
                                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                                        isSelected ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                                                                    }`}>
                                                                        {count}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Category 2 Content */}
                                                {filteredOtherColleges.length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50/60 dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                                        <Globe className="mx-auto text-gray-400 mb-2" size={28} />
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {otherCollegeFilter !== "all" 
                                                                ? `No suggestions found for TTC ${getCollegeCity(otherCollegeFilter)}. Try selecting 'All Campuses'.`
                                                                : "No recommendations across other campuses right now."}
                                                        </p>
                                                        {otherCollegeFilter !== "all" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOtherCollegeFilter("all")}
                                                                className="mt-3 px-4 py-1.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-primary-dark transition-all cursor-pointer"
                                                            >
                                                                Show All Campuses
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : discoverViewMode === "reel" ? (
                                                    <div
                                                        ref={otherCollegesScrollRef}
                                                        className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar -mx-1 px-1"
                                                    >
                                                        <AnimatePresence mode="popLayout">
                                                            {filteredOtherColleges.map((item) => renderUserCard(item, false))}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                        <AnimatePresence mode="popLayout">
                                                            {filteredOtherColleges.map((item) => renderUserCard(item, false))}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
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
