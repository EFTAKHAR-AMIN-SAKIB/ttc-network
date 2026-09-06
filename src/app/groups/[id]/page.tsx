"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Globe, Lock, EyeOff, Users, Shield, Plus, Pin, Clock, 
    ArrowLeft, Clipboard, Loader2, Sparkles, AlertTriangle, ShieldCheck, 
    LogIn, UserPlus, Search, Image as ImageIcon, BarChart2, MoreHorizontal, 
    ChevronRight, ChevronDown, Check, X, Camera, Share2, Star, UserCheck, 
    MessageSquare, ExternalLink, Calendar, Info, Layers, Home, Settings,
    Activity, FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { 
    subscribeGroupDetails, subscribeGroupPosts, subscribeGroupMember,
    subscribeGroupRequest, subscribeGroupRequests, subscribeGroupMembers,
    subscribeGroupReports, joinGroup, joinSecretGroup, leaveGroup, updateGroupSettings,
    type GroupDoc, type GroupPostDoc, type GroupMember
} from "@/lib/firestore";
import Link from "next/link";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";
import GroupPostCard from "@/components/GroupPostCard";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";
import GroupModerationPanel from "@/components/GroupModerationPanel";
import InviteModal from "@/components/InviteModal";
import SafeAvatar from "@/components/SafeAvatar";
import { TimeAgo } from "@/components/Social/SocialUtils";

interface GroupPageProps {
    params: { id: string };
}

export default function GroupDetailPage({ params }: GroupPageProps) {
    const groupId = params.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading: authLoading } = useAuth();
    const currentUserPhoto = profile?.photoURL || user?.photoURL || "";
    const currentDisplayName = profile?.displayName || user?.displayName || "User";
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // Group metadata and memberships
    const [group, setGroup] = useState<(GroupDoc & { id: string }) | null>(null);
    const [posts, setPosts] = useState<(GroupPostDoc & { id: string })[]>([]);
    const [myMemberRecord, setMyMemberRecord] = useState<any>(null);
    const [myRequestRecord, setMyRequestRecord] = useState<any>(null);
    const [groupMembersList, setGroupMembersList] = useState<GroupMember[]>([]);
    const [userProfilesMap, setUserProfilesMap] = useState<Record<string, { photoURL?: string; displayName?: string; username?: string }>>({});
    
    // Page state
    const [loading, setLoading] = useState(true);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [groupMissing, setGroupMissing] = useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "members" | "media" | "about" | "manage">("posts");
    const [adminSection, setAdminSection] = useState<"home" | "insights" | "requests" | "reports" | "members" | "settings" | "activity">("home");
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [reportsCount, setReportsCount] = useState(0);
    const [isPinned, setIsPinned] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Filter & Search states inside the group
    const [searchQuery, setSearchQuery] = useState("");
    const [postFilter, setPostFilter] = useState<"all" | "pinned" | "photos" | "polls">("all");
    const [aboutExpanded, setAboutExpanded] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    
    // Dropdowns & Modals
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinedDropdownOpen, setJoinedDropdownOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const isMember = !!myMemberRecord;
    const userRole = myMemberRecord ? myMemberRecord.role : null;
    const isPending = !!myRequestRecord;
    const isGroupAdmin = userRole === "admin";
    const isGroupModerator = userRole === "moderator";
    const canModerate = isGroupAdmin || isGroupModerator;

    // Cover Gradient presets
    const gradients = [
        "from-blue-600 via-indigo-600 to-purple-700",
        "from-emerald-600 via-teal-600 to-cyan-700",
        "from-purple-600 via-pink-600 to-rose-700",
        "from-amber-600 via-orange-600 to-rose-700",
        "from-cyan-600 via-blue-600 to-indigo-700"
    ];

    const getGroupGradient = (name: string = "") => {
        const charCode = name.charCodeAt(0) || 0;
        return gradients[charCode % gradients.length];
    };

    // Synchronize pinned status with localStorage
    useEffect(() => {
        if (typeof window === "undefined" || !groupId) return;
        try {
            const raw = localStorage.getItem("ttc_pinned_groups");
            if (raw) {
                const ids: string[] = JSON.parse(raw);
                setIsPinned(ids.includes(groupId));
            }
        } catch (e) {
            console.error(e);
        }
    }, [groupId]);

    const togglePinGroup = () => {
        if (typeof window === "undefined" || !groupId) return;
        try {
            const raw = localStorage.getItem("ttc_pinned_groups");
            let ids: string[] = raw ? JSON.parse(raw) : [];
            let nextState = false;
            if (ids.includes(groupId)) {
                ids = ids.filter(id => id !== groupId);
                nextState = false;
                showToast("Unpinned from your shortcuts", "info");
            } else {
                ids = [groupId, ...ids];
                nextState = true;
                showToast("Pinned to your shortcuts ⭐", "success");
            }
            localStorage.setItem("ttc_pinned_groups", JSON.stringify(ids));
            setIsPinned(nextState);
            setJoinedDropdownOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    // Subscriptions
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            setShowLoginPrompt(true);
            return;
        }

        setLoading(true);
        setGroupMissing(false);
        setShowLoginPrompt(false);

        const unsubDetails = subscribeGroupDetails(groupId, (data) => {
            if (!data) {
                setGroupMissing(true);
                setLoading(false);
                return;
            }
            setGroup(data);
            setLoading(false);
        });

        const unsubPosts = subscribeGroupPosts(groupId, (data) => {
            setPosts(data as any);
        });

        const unsubMembers = subscribeGroupMembers(groupId, async (list) => {
            setGroupMembersList(list);

            // Fetch live photoURL from users/{uid} for members whose subcollection record lacks photoURL
            const missingPhotos = list.filter(m => !m.photoURL && m.userId);
            if (missingPhotos.length > 0) {
                try {
                    const db = getDb();
                    const updates: Record<string, string> = {};
                    await Promise.all(
                        missingPhotos.map(async (m) => {
                            try {
                                const snap = await getDoc(doc(db, "users", m.userId));
                                if (snap.exists()) {
                                    const uData = snap.data();
                                    if (uData?.photoURL) {
                                        updates[m.userId] = uData.photoURL;
                                    }
                                }
                            } catch {
                                // Silent fallback
                            }
                        })
                    );
                    if (Object.keys(updates).length > 0) {
                        setGroupMembersList(prev => 
                            prev.map(m => updates[m.userId] ? { ...m, photoURL: updates[m.userId] } : m)
                        );
                    }
                } catch (err) {
                    console.warn("Could not enrich members photos:", err);
                }
            }
        });

        return () => {
            unsubDetails();
            unsubPosts();
            unsubMembers();
        };
    }, [groupId, authLoading, user]);

    // Real-time live profile listeners for group members from users/{userId}
    useEffect(() => {
        if (groupMembersList.length === 0) return;
        const db = getDb();
        const unsubs: (() => void)[] = [];

        groupMembersList.forEach(m => {
            if (!m.userId) return;
            const unsub = onSnapshot(doc(db, "users", m.userId), (snap) => {
                if (snap.exists()) {
                    const uData = snap.data();
                    setUserProfilesMap(prev => {
                        const existing = prev[m.userId];
                        if (
                            existing?.photoURL === uData.photoURL &&
                            existing?.displayName === uData.displayName &&
                            existing?.username === uData.username
                        ) {
                            return prev;
                        }
                        return {
                            ...prev,
                            [m.userId]: {
                                photoURL: uData.photoURL || "",
                                displayName: uData.displayName || m.displayName,
                                username: uData.username || ""
                            }
                        };
                    });
                }
            }, () => {
                // Silently handle error
            });
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(u => u());
        };
    }, [groupMembersList]);

    // Subscriptions for current user context
    useEffect(() => {
        if (!user?.uid) {
            setMyMemberRecord(null);
            setMyRequestRecord(null);
            return;
        }

        const unsubMember = subscribeGroupMember(groupId, user.uid, (data) => {
            setMyMemberRecord(data);
        });

        const unsubRequest = subscribeGroupRequest(groupId, user.uid, (data) => {
            setMyRequestRecord(data);
        });

        return () => {
            unsubMember();
            unsubRequest();
        };
    }, [groupId, user?.uid]);

    // Pending requests & reports subscription for moderators
    useEffect(() => {
        if (!canModerate) {
            setPendingRequestsCount(0);
            setReportsCount(0);
            return;
        }
        
        const unsubRequests = subscribeGroupRequests(groupId, (requests) => {
            setPendingRequestsCount(requests.length);
        });

        const unsubReports = subscribeGroupReports(groupId, (reports) => {
            setReportsCount(reports.length);
        });
        
        return () => {
            unsubRequests();
            unsubReports();
        };
    }, [groupId, canModerate]);

    // Auto-join secret group from invite link
    useEffect(() => {
        if (!group || !user?.uid || isMember || isPending) return;

        const inviteToken = searchParams.get("invite");
        if (inviteToken && group.privacyType === "secret" && group.inviteToken === inviteToken) {
            setIsJoining(true);
            joinSecretGroup(groupId, inviteToken)
                .then(() => {
                    showToast(`Successfully joined secret group "${group.name}"!`, "success");
                    router.replace(`/groups/${groupId}`);
                })
                .catch((err) => {
                    console.error(err);
                    showToast("Failed to join group via invite link.", "error");
                })
                .finally(() => {
                    setIsJoining(false);
                });
        }
    }, [group, user?.uid, isMember, isPending, searchParams, groupId, router, showToast]);

    // Deep linking scroll to target post
    const hasScrolledRef = useRef<string | null>(null);
    const [targetPostId, setTargetPostId] = useState<string | null>(null);
    const [hashPostId, setHashPostId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleHashChange = () => {
                const hash = window.location.hash;
                if (hash.startsWith("#post-")) {
                    setHashPostId(hash.substring(6));
                }
            };
            handleHashChange();
            window.addEventListener("hashchange", handleHashChange);
            return () => window.removeEventListener("hashchange", handleHashChange);
        }
    }, []);

    useEffect(() => {
        const effectivePostId = searchParams.get('postId') || searchParams.get('post') || hashPostId;
        if (effectivePostId && posts.length > 0) {
            setTargetPostId(effectivePostId);
            const exists = posts.some(p => p.id === effectivePostId);
            if (exists && hasScrolledRef.current !== effectivePostId) {
                hasScrolledRef.current = effectivePostId;
                setTimeout(() => {
                    const el = document.getElementById(`post-${effectivePostId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        }
    }, [searchParams, posts, hashPostId]);

    // Handle join/leave actions
    const handleJoin = async () => {
        if (!user) {
            showToast("Log in or register to join campus groups", "info");
            return;
        }
        setIsJoining(true);
        try {
            const res = await joinGroup(groupId);
            if (res.status === "joined") {
                showToast(`Joined "${group?.name}"`, "success");
            } else {
                showToast(`Join request sent to group admins`, "info");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to join group", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        setJoinedDropdownOpen(false);
        const confirmed = await confirm({
            title: "Leave Group?",
            message: `Are you sure you want to leave ${group?.name}? You will lose access to member-only posts.`,
            confirmText: "Leave Group",
            variant: "danger"
        });

        if (!confirmed) return;
        setIsJoining(true);
        try {
            await leaveGroup(groupId);
            showToast(`Left "${group?.name}"`, "info");
            setActiveTab("posts");
            setAdminSection("home");
        } catch (err) {
            console.error(err);
            showToast("Failed to leave group", "error");
        } finally {
            setIsJoining(false);
        }
    };

    // Copy link utilities
    const copyInviteLink = () => {
        if (!group) return;
        let url = `${window.location.origin}/groups/${groupId}`;
        if (group.privacyType === "secret" && group.inviteToken) {
            url += `?invite=${group.inviteToken}`;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => showToast("Group invite link copied to clipboard!", "success"))
                .catch(() => fallbackCopy(url));
        } else {
            fallbackCopy(url);
        }
        setJoinedDropdownOpen(false);
        setMoreDropdownOpen(false);
    };

    const fallbackCopy = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast("Group invite link copied!", "success");
        } catch (err) {
            showToast("Failed to copy link. Please copy manually.", "error");
        }
        document.body.removeChild(textArea);
    };

    // Handle Cover Image Upload for Admins
    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !groupId) return;

        if (!file.type.startsWith("image/")) {
            showToast("Please upload a valid image file", "error");
            return;
        }

        setIsUploadingCover(true);
        try {
            const downloadUrl = await uploadFile(`covers/${groupId}_${Date.now()}`, file);
            if (downloadUrl) {
                await updateGroupSettings(groupId, { coverUrl: downloadUrl });
                showToast("Group cover updated successfully!", "success");
            }
        } catch (err) {
            console.error("Cover upload error:", err);
            showToast("Failed to update group cover image", "error");
        } finally {
            setIsUploadingCover(false);
            if (coverInputRef.current) coverInputRef.current.value = "";
        }
    };

    // Format created date
    const formattedCreatedDate = useMemo(() => {
        if (!group?.createdAt) return "Recently";
        try {
            const date = group.createdAt.toDate 
                ? group.createdAt.toDate() 
                : new Date(group.createdAt.seconds ? group.createdAt.seconds * 1000 : group.createdAt);
            return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } catch {
            return "Recently";
        }
    }, [group?.createdAt]);

    // Filter posts based on user search and category chips
    const filteredPosts = useMemo(() => {
        let result = posts;

        // Category filter
        if (postFilter === "pinned") {
            result = result.filter(p => p.isPinned);
        } else if (postFilter === "photos") {
            result = result.filter(p => !!p.imageUrl);
        } else if (postFilter === "polls") {
            result = result.filter(p => !!p.poll);
        }

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(p => {
                const matchContent = p.content?.toLowerCase().includes(q);
                const matchAuthor = p.creatorName?.toLowerCase().includes(q);
                const matchPoll = p.poll?.question?.toLowerCase().includes(q);
                return matchContent || matchAuthor || matchPoll;
            });
        }

        return result;
    }, [posts, postFilter, searchQuery]);

    const pinnedPosts = useMemo(() => filteredPosts.filter(p => p.isPinned), [filteredPosts]);
    const standardPosts = useMemo(() => filteredPosts.filter(p => !p.isPinned), [filteredPosts]);

    // All images shared in the group
    const groupMediaList = useMemo(() => {
        return posts
            .filter(p => !!p.imageUrl)
            .map(p => ({
                postId: p.id,
                imageUrl: p.imageUrl!,
                authorName: p.isAnonymous ? "Anonymous Member" : (p.creatorName || "Member"),
                createdAt: p.createdAt,
                content: p.content || ""
            }));
    }, [posts]);

    // Enriched members list (ensuring active user's photo is mapped immediately and live member profiles from users collection are reflected)
    const effectiveMembersList = useMemo(() => {
        return groupMembersList.map(m => {
            const liveProfile = userProfilesMap[m.userId];
            const livePhoto = (m.userId === user?.uid && currentUserPhoto) 
                ? currentUserPhoto 
                : (liveProfile?.photoURL !== undefined ? liveProfile.photoURL : (m.photoURL || ""));
            const liveName = (m.userId === user?.uid && currentDisplayName)
                ? currentDisplayName
                : (liveProfile?.displayName || m.displayName || "Member");
            return {
                ...m,
                photoURL: livePhoto,
                displayName: liveName
            };
        });
    }, [groupMembersList, userProfilesMap, user?.uid, currentUserPhoto, currentDisplayName]);

    // Filtered members list for Members tab
    const filteredMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return effectiveMembersList;
        const q = memberSearchQuery.toLowerCase().trim();
        return effectiveMembersList.filter(m => 
            m.displayName.toLowerCase().includes(q) || 
            (m.role && m.role.toLowerCase().includes(q))
        );
    }, [effectiveMembersList, memberSearchQuery]);

    // Admins & Moderators list
    const leadershipList = useMemo(() => {
        return effectiveMembersList.filter(m => m.role === "admin" || m.role === "moderator");
    }, [effectiveMembersList]);

    // Admin Tools Navigation items for Left Management Sidebar
    const adminNavItems = [
        { id: "requests", label: "Member requests", icon: UserCheck, count: pendingRequestsCount, danger: false },
        { id: "reports", label: "Reported content", icon: AlertTriangle, count: reportsCount, danger: reportsCount > 0 },
        { id: "members", label: "Manage members", icon: Users, count: groupMembersList.length, danger: false },
        { id: "settings", label: "Group settings & rules", icon: Settings, danger: false },
        { id: "activity", label: "Activity log", icon: Activity, danger: false }
    ];

    // Render loading state
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Group...</p>
            </div>
        );
    }

    // Render login required
    if (showLoginPrompt) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative z-50 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700/60 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-3xl flex items-center justify-center">
                        <Lock size={36} className="text-primary" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-2">
                        Login Required
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                        This is a campus group. Please log in or create an account to view discussions and participate.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push(`/login?redirect=/groups/${groupId}${searchParams.get('invite') ? `?invite=${searchParams.get('invite')}` : ''}`)}
                            className="w-full px-6 py-3.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <LogIn size={16} /> Log In
                        </button>
                        <button
                            onClick={() => router.push(`/signup?redirect=/groups/${groupId}${searchParams.get('invite') ? `?invite=${searchParams.get('invite')}` : ''}`)}
                            className="w-full px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus size={16} /> Create Account
                        </button>
                    </div>
                    <button
                        onClick={() => router.push('/groups')}
                        className="mt-6 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        <ArrowLeft size={12} /> Back to Groups
                    </button>
                </motion.div>
            </div>
        );
    }

    // Render group missing state
    if (groupMissing || !group) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50/50 dark:bg-[#0c0c10]">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <Users size={28} />
                </div>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">This content is no longer available</h1>
                <p className="text-gray-500 max-w-sm mb-6 leading-relaxed text-sm">The group you are trying to view does not exist, has been deleted, or is set to secret.</p>
                <button 
                    onClick={() => router.push('/groups')} 
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    Back to Groups
                </button>
            </div>
        );
    }

    // Privacy access checks
    const isSecret = group.privacyType === "secret";
    const isPrivate = group.privacyType === "private";
    const canViewContent = !isSecret && (!isPrivate || isMember);

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0f1117] pb-16">
            
            {/* Top Minimal Breadcrumb Nav (MANAGE button removed per user request) */}
            <div className="bg-white dark:bg-[#1a1b23] border-b border-gray-200 dark:border-gray-800/80 relative md:sticky md:top-16 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
                    <button 
                        onClick={() => router.push("/groups")}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        <ArrowLeft size={16} />
                        <span>Groups</span>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-[320px] font-bold">
                            {group.name}
                        </span>
                    </button>

                    <div className="flex items-center gap-2">
                        {isPinned && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                <Star size={12} className="fill-amber-500" /> Pinned
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Layout Container: 
                - If Admin/Moderator on desktop: Includes persistent Facebook-style Left Management Sidebar
                - Else: Centered standard community layout
            */}
            <div className={`max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 pt-3 sm:pt-6 ${canModerate ? "lg:flex lg:gap-6 lg:items-start" : ""}`}>
                
                {/* ═════════════════════════════════════════════════════════════ */}
                {/* PERSISTENT FACEBOOK-STYLE LEFT MANAGEMENT SIDEBAR (DESKTOP) */}
                {/* ═════════════════════════════════════════════════════════════ */}
                {canModerate && (
                    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-28 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar">
                        
                        {/* Group Mini Header Card */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-900 shrink-0 border border-gray-200 dark:border-gray-700 shadow-xs">
                                    {group.coverUrl ? (
                                        <img src={group.coverUrl} alt={group.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${getGroupGradient(group.name)} flex items-center justify-center font-black text-sm text-white`}>
                                            {group.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate" title={group.name}>
                                        {group.name}
                                    </h2>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                        {group.privacyType === "public" ? <Globe size={11} /> : <Lock size={11} />}
                                        <span>{group.privacyType} group · {group.memberCount || groupMembersList.length} members</span>
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                    Manage
                                </p>

                                {/* Community Home Button */}
                                <button
                                    onClick={() => {
                                        setAdminSection("home");
                                        setActiveTab("posts");
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                        adminSection === "home" 
                                            ? "bg-primary text-white font-black shadow-md shadow-primary/20" 
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                >
                                    <Home size={16} className={adminSection === "home" ? "text-white" : "text-gray-400"} />
                                    <span>Community home</span>
                                </button>

                                {/* Overview & Insights Button */}
                                <button
                                    onClick={() => setAdminSection("insights")}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all mt-1 ${
                                        adminSection === "insights" 
                                            ? "bg-primary text-white font-black shadow-md shadow-primary/20" 
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                >
                                    <BarChart2 size={16} className={adminSection === "insights" ? "text-white" : "text-gray-400"} />
                                    <span>Overview</span>
                                </button>
                            </div>
                        </div>

                        {/* Admin Tools Navigation List */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-3 shadow-sm space-y-1">
                            <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                Admin tools
                            </p>

                            {adminNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = adminSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setAdminSection(item.id as any)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                            isActive 
                                                ? "bg-primary text-white shadow-md shadow-primary/20 font-black" 
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {typeof item.count === "number" && item.count > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                                                isActive 
                                                    ? "bg-white/20 text-white" 
                                                    : item.danger ? "bg-red-500 text-white" : "bg-primary/10 text-primary"
                                            }`}>
                                                {item.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                    </aside>
                )}

                {/* ═════════════════════════════════════════════════════════════ */}
                {/* MAIN CONTENT AREA */}
                {/* ═════════════════════════════════════════════════════════════ */}
                <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
                    
                    {/* CASE A: ADMIN TOOL WORKSPACE VIEW (WHEN ADMIN TOOL SELECTED ON DESKTOP) */}
                    {canModerate && adminSection !== "home" && (
                        <div className="hidden lg:block">
                            <GroupModerationPanel 
                                groupId={groupId}
                                groupName={group.name}
                                currentUserRole={userRole}
                                embedded={true}
                                hideSidebar={true}
                                controlledTab={adminSection}
                                onTabChange={(t) => setAdminSection(t)}
                                onBackToHome={() => setAdminSection("home")}
                            />
                        </div>
                    )}

                    {/* CASE B: MOBILE MANAGE VIEW (WHEN MANAGE TAB ACTIVE ON MOBILE) */}
                    {canModerate && activeTab === "manage" && (
                        <div className="lg:hidden">
                            <GroupModerationPanel 
                                groupId={groupId}
                                groupName={group.name}
                                currentUserRole={userRole}
                                embedded={true}
                                hideSidebar={false}
                                onBackToHome={() => setActiveTab("posts")}
                            />
                        </div>
                    )}

                    {/* CASE C: COMMUNITY HOME VIEW (MAIN FEED, COVER BANNER & RIGHT ABOUT SIDEBAR) */}
                    {(adminSection === "home" || !canModerate) && (activeTab !== "manage" || !canModerate) && (
                        <div className="space-y-4 sm:space-y-6">
                            
                            {/* 1. HERO / FACEBOOK-STYLE GROUP HEADER */}
                            <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
                                
                                {/* Cover Banner */}
                                <div className="relative w-full h-52 sm:h-72 md:h-80 bg-gray-900 overflow-hidden">
                                    {group.coverUrl ? (
                                        <img 
                                            src={group.coverUrl} 
                                            alt={group.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-r ${getGroupGradient(group.name)} flex items-center justify-center relative`}>
                                            <Users size={64} className="text-white/20" />
                                        </div>
                                    )}
                                    
                                    {/* Subtle bottom gradient to enhance legibility */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                                    {/* Admin Cover Photo Upload Button */}
                                    {canModerate && (
                                        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10">
                                            <input 
                                                ref={coverInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleCoverUpload}
                                            />
                                            <button
                                                onClick={() => coverInputRef.current?.click()}
                                                disabled={isUploadingCover}
                                                className="px-3.5 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                                            >
                                                {isUploadingCover ? (
                                                    <Loader2 size={14} className="animate-spin text-white" />
                                                ) : (
                                                    <Camera size={14} />
                                                )}
                                                <span>{isUploadingCover ? "Uploading..." : "Edit Cover"}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Group Identity & Primary Actions Bar */}
                                <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                                        
                                        {/* Group Title, Privacy Badge & Member Facepile */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                                                    group.privacyType === "public" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : 
                                                    group.privacyType === "private" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : 
                                                    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                }`}>
                                                    {group.privacyType === "public" ? <Globe size={11} /> : group.privacyType === "private" ? <Lock size={11} /> : <EyeOff size={11} />}
                                                    {group.privacyType} Group
                                                </span>

                                                {userRole && (
                                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                                                        userRole === "admin" ? "bg-primary/10 text-primary border border-primary/20" :
                                                        userRole === "moderator" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                                                        "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                                                    }`}>
                                                        {userRole === "admin" ? "👑 Admin" : userRole === "moderator" ? "🛡️ Moderator" : "Member"}
                                                    </span>
                                                )}
                                            </div>

                                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                                                {group.name}
                                            </h1>

                                            {/* Facebook-Style Member Facepile (Avatars Stack) */}
                                            <div className="flex items-center gap-3 pt-1">
                                                {groupMembersList.length > 0 && (
                                                    <div 
                                                        onClick={() => setActiveTab("members")}
                                                        className="flex items-center -space-x-2 cursor-pointer hover:opacity-85 transition-opacity"
                                                        title="View members"
                                                    >
                                                        {effectiveMembersList.slice(0, 5).map((m, idx) => (
                                                            <Link 
                                                                key={m.userId || idx} 
                                                                href={`/profile/${m.userId}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                title={`View ${m.displayName}'s profile`}
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-white dark:ring-[#1a1b23] overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                                                            >
                                                                <SafeAvatar 
                                                                    src={m.photoURL} 
                                                                    alt={m.displayName} 
                                                                    sizeClassName="w-full h-full"
                                                                    textClassName="text-[10px] font-bold"
                                                                    fallbackBg="bg-primary/20"
                                                                    fallbackColor="text-gray-600 dark:text-gray-300"
                                                                />
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}

                                                <button 
                                                    onClick={() => setActiveTab("members")}
                                                    className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                                                >
                                                    <span className="font-black text-gray-900 dark:text-white">
                                                        {group.memberCount || groupMembersList.length || 0}
                                                    </span>
                                                    <span>members</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Buttons Toolbar */}
                                        <div className="flex items-center gap-2 flex-wrap self-start lg:self-end">
                                            
                                            {/* Invite Button */}
                                            {isMember && (
                                                <button 
                                                    onClick={() => setIsInviteModalOpen(true)}
                                                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-primary/20 active:scale-95"
                                                >
                                                    <Plus size={14} className="stroke-[2.5]" />
                                                    <span>Invite</span>
                                                </button>
                                            )}

                                            {/* Joined / Join Button with Dropdown */}
                                            {isMember ? (
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setJoinedDropdownOpen(!joinedDropdownOpen)}
                                                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                                                    >
                                                        <UserCheck size={14} className="text-emerald-500" />
                                                        <span>Joined</span>
                                                        <ChevronDown size={14} />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    <AnimatePresence>
                                                        {joinedDropdownOpen && (
                                                            <>
                                                                <div 
                                                                    className="fixed inset-0 z-40" 
                                                                    onClick={() => setJoinedDropdownOpen(false)} 
                                                                />
                                                                <motion.div 
                                                                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1b1c26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden space-y-1"
                                                                >
                                                                    <button 
                                                                        onClick={togglePinGroup}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                    >
                                                                        <Star size={14} className={isPinned ? "fill-amber-500 text-amber-500" : "text-gray-400"} />
                                                                        <span>{isPinned ? "Unpin from shortcuts" : "Pin to shortcuts"}</span>
                                                                    </button>

                                                                    <button 
                                                                        onClick={copyInviteLink}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                    >
                                                                        <Clipboard size={14} className="text-gray-400" />
                                                                        <span>Copy Invite Link</span>
                                                                    </button>

                                                                    {canModerate && (
                                                                        <button 
                                                                            onClick={() => {
                                                                                setJoinedDropdownOpen(false);
                                                                                setAdminSection("requests");
                                                                                setActiveTab("manage");
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all"
                                                                        >
                                                                            <Shield size={14} className="text-indigo-500" />
                                                                            <span>Admin Tools</span>
                                                                        </button>
                                                                    )}

                                                                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                                                                    <button 
                                                                        onClick={handleLeave}
                                                                        disabled={isJoining}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                                                    >
                                                                        <X size={14} />
                                                                        <span>Leave Group</span>
                                                                    </button>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ) : isPending ? (
                                                <button 
                                                    disabled
                                                    className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800/80 text-gray-400 text-xs font-black uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center gap-1.5"
                                                >
                                                    <Clock size={14} />
                                                    <span>Request Pending</span>
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleJoin}
                                                    disabled={isJoining}
                                                    className="px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    {isJoining ? <Loader2 size={14} className="animate-spin" /> : "Join Group"}
                                                </button>
                                            )}

                                            {/* More Options (...) */}
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                                    className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                                                    title="More options"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>

                                                <AnimatePresence>
                                                    {moreDropdownOpen && (
                                                        <>
                                                            <div 
                                                                className="fixed inset-0 z-40" 
                                                                onClick={() => setMoreDropdownOpen(false)} 
                                                            />
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1b1c26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden space-y-1"
                                                            >
                                                                <button 
                                                                    onClick={copyInviteLink}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                >
                                                                    <Share2 size={14} className="text-gray-400" />
                                                                    <span>Share Group</span>
                                                                </button>
                                                                
                                                                <button 
                                                                    onClick={() => {
                                                                        setMoreDropdownOpen(false);
                                                                        setActiveTab("about");
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                                                >
                                                                    <Info size={14} className="text-gray-400" />
                                                                    <span>Group Information</span>
                                                                </button>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Tabs (Facebook Style) */}
                                <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 overflow-x-auto no-scrollbar pt-1">
                                    {[
                                        { id: "posts", label: "Discussion", icon: MessageSquare },
                                        { id: "members", label: "Members", icon: Users, badge: groupMembersList.length },
                                        { id: "media", label: "Media", icon: ImageIcon, badge: groupMediaList.length },
                                        { id: "about", label: "About", icon: Info },
                                        ...(canModerate ? [{ id: "manage", label: "Manage", icon: Shield, badge: pendingRequestsCount + reportsCount, mobileOnly: true }] : [])
                                    ].map((tab: any) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`relative px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 outline-none focus:outline-none focus-visible:outline-none select-none ${
                                                    tab.mobileOnly ? "lg:hidden" : ""
                                                } ${
                                                    isActive 
                                                        ? "text-primary dark:text-primary font-black" 
                                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                }`}
                                            >
                                                <Icon size={15} className={isActive ? "text-primary" : "text-gray-400"} />
                                                <span>{tab.label}</span>
                                                {typeof tab.badge === "number" && tab.badge > 0 && (
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                        isActive 
                                                            ? "bg-primary/10 text-primary" 
                                                            : "bg-gray-100 dark:bg-white/10 text-gray-500"
                                                    }`}>
                                                        {tab.badge}
                                                    </span>
                                                )}

                                                {/* Bottom Active Indicator Bar */}
                                                {isActive && (
                                                    <motion.div 
                                                        layoutId="activeGroupTabIndicator"
                                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                            </div>

                            {/* 2. BODY CONTENT (RESPONSIVE 2-COLUMN SPLIT LAYOUT) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                
                                {/* LEFT / MAIN COLUMN (Feed, Members, Media, About) */}
                                <div className="lg:col-span-8 space-y-5">
                                    
                                    <AnimatePresence mode="wait">
                                        
                                        {/* TAB: DISCUSSION (POSTS & FEED) */}
                                        {activeTab === "posts" && (
                                            <motion.div 
                                                key="posts-tab"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="space-y-4"
                                            >
                                                {!canViewContent ? (
                                                    /* Private Locked State */
                                                    <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                                        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                                            <Lock size={32} />
                                                        </div>
                                                        <h3 className="text-base font-black uppercase text-gray-900 dark:text-white tracking-tight">Private Community</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                                                            Only members can see who's in this group and what they post. Join this group to participate in discussions.
                                                        </p>
                                                        {!isMember && !isPending && (
                                                            <button
                                                                onClick={handleJoin}
                                                                disabled={isJoining}
                                                                className="mt-6 px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                            >
                                                                {isJoining ? <Loader2 size={14} className="animate-spin" /> : "Join Group"}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Facebook-Style Feed Composer Trigger */}
                                                        {isMember && (
                                                            <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-sm space-y-3">
                                                                <div 
                                                                    onClick={() => setIsPostModalOpen(true)}
                                                                    className="flex items-center gap-3 cursor-pointer"
                                                                >
                                                                    {/* User Avatar */}
                                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                                                        <SafeAvatar 
                                                                            src={currentUserPhoto} 
                                                                            alt={currentDisplayName} 
                                                                            sizeClassName="w-full h-full"
                                                                            textClassName="text-xs font-black"
                                                                            fallbackBg="bg-primary/10"
                                                                            fallbackColor="text-primary"
                                                                        />
                                                                    </div>

                                                                    {/* Prompt Pill */}
                                                                    <div className="flex-1 bg-gray-100 hover:bg-gray-200/70 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors">
                                                                        Write something to {group.name}...
                                                                    </div>
                                                                </div>

                                                                <div className="border-t border-gray-100 dark:border-gray-800 pt-2.5 flex items-center justify-around sm:justify-start sm:gap-6">
                                                                    <button 
                                                                        onClick={() => setIsPostModalOpen(true)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                                                    >
                                                                        <ImageIcon size={18} className="text-emerald-500" />
                                                                        <span>Photo/Video</span>
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => setIsPostModalOpen(true)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                                                    >
                                                                        <BarChart2 size={18} className="text-primary" />
                                                                        <span>Poll</span>
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => setIsPostModalOpen(true)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                                                    >
                                                                        <Sparkles size={18} className="text-amber-500" />
                                                                        <span>Anonymous</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* In-Group Search & Filter Bar */}
                                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                            
                                                            {/* Search Input */}
                                                            <div className="relative flex-1">
                                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input 
                                                                    type="text"
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    placeholder="Search in this group..."
                                                                    className="w-full pl-9 pr-8 py-1.5 bg-gray-100 dark:bg-white/5 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-primary transition-all"
                                                                />
                                                                {searchQuery && (
                                                                    <button 
                                                                        onClick={() => setSearchQuery("")}
                                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Filter Chips */}
                                                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                                                {[
                                                                    { id: "all", label: "All Posts" },
                                                                    { id: "pinned", label: "📌 Pinned" },
                                                                    { id: "photos", label: "📷 Photos" },
                                                                    { id: "polls", label: "📊 Polls" }
                                                                ].map((chip) => (
                                                                    <button
                                                                        key={chip.id}
                                                                        onClick={() => setPostFilter(chip.id as any)}
                                                                        className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                                                            postFilter === chip.id 
                                                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" 
                                                                                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                                                                        }`}
                                                                    >
                                                                        {chip.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Pinned Posts Section */}
                                                        {pinnedPosts.length > 0 && postFilter !== "photos" && postFilter !== "polls" && (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                                    <Pin size={14} className="fill-amber-500/20" />
                                                                    <span>Pinned Announcements</span>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {pinnedPosts.map(post => (
                                                                        <GroupPostCard 
                                                                            key={post.id} 
                                                                            post={post} 
                                                                            userRole={userRole} 
                                                                            isGroupMember={isMember} 
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Standard Feed */}
                                                        {standardPosts.length > 0 && (
                                                            <div className="space-y-4">
                                                                {standardPosts.map(post => (
                                                                    <GroupPostCard 
                                                                        key={post.id} 
                                                                        post={post} 
                                                                        userRole={userRole} 
                                                                        isGroupMember={isMember} 
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Empty State */}
                                                        {filteredPosts.length === 0 && (
                                                            <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                                                <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                                                <h3 className="text-sm font-black uppercase text-gray-800 dark:text-gray-200">
                                                                    {searchQuery ? "No matching posts found" : "No posts yet"}
                                                                </h3>
                                                                <p className="text-xs text-gray-400 font-medium mt-1">
                                                                    {searchQuery ? `No posts matched "${searchQuery}". Try a different keyword.` : "Be the first to start a conversation in this group!"}
                                                                </p>
                                                                {searchQuery && (
                                                                    <button 
                                                                        onClick={() => setSearchQuery("")}
                                                                        className="mt-4 px-4 py-1.5 bg-gray-100 dark:bg-white/10 text-xs font-bold rounded-xl text-gray-700 dark:text-gray-200"
                                                                    >
                                                                        Clear Search
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </motion.div>
                                        )}

                                        {/* TAB: MEMBERS DIRECTORY */}
                                        {activeTab === "members" && (
                                            <motion.div 
                                                key="members-tab"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                                    <div>
                                                        <h2 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                                            Group Members ({groupMembersList.length})
                                                        </h2>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            People participating in this campus community
                                                        </p>
                                                    </div>

                                                    {/* Member Search */}
                                                    <div className="relative w-full sm:w-64">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input 
                                                            type="text"
                                                            value={memberSearchQuery}
                                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                            placeholder="Search members..."
                                                            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Leadership Section */}
                                                {leadershipList.length > 0 && !memberSearchQuery && (
                                                    <div className="space-y-3">
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                            <Shield size={14} /> Group Leadership & Admins ({leadershipList.length})
                                                        </h3>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {leadershipList.map((m) => (
                                                                <Link 
                                                                    key={m.userId}
                                                                    href={`/profile/${m.userId}`}
                                                                    title={`View ${m.displayName}'s profile`}
                                                                    className="flex items-center gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-sm transition-all group cursor-pointer"
                                                                >
                                                                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 group-hover:scale-105 transition-transform">
                                                                        <SafeAvatar 
                                                                            src={m.photoURL} 
                                                                            alt={m.displayName} 
                                                                            sizeClassName="w-full h-full"
                                                                            roundedClassName="rounded-xl"
                                                                            textClassName="text-sm font-bold"
                                                                            fallbackBg="bg-indigo-500/10"
                                                                            fallbackColor="text-indigo-600 dark:text-indigo-400"
                                                                        />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                                            {m.displayName}
                                                                        </p>
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
                                                                            {m.role === "admin" ? "👑 Group Admin" : "🛡️ Moderator"}
                                                                        </span>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* All Members Grid */}
                                                <div className="space-y-3">
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                        All Members ({filteredMembers.length})
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {filteredMembers.map((m) => (
                                                            <Link 
                                                                key={m.userId}
                                                                href={`/profile/${m.userId}`}
                                                                title={`View ${m.displayName}'s profile`}
                                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all group cursor-pointer"
                                                            >
                                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 group-hover:scale-105 transition-transform">
                                                                    <SafeAvatar 
                                                                        src={m.photoURL} 
                                                                        alt={m.displayName} 
                                                                        sizeClassName="w-full h-full"
                                                                        roundedClassName="rounded-xl"
                                                                        textClassName="text-xs font-bold"
                                                                        fallbackBg="bg-primary/10"
                                                                        fallbackColor="text-primary"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                                        {m.displayName}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                                                        {m.role === "admin" ? "Admin" : m.role === "moderator" ? "Moderator" : "Member"}
                                                                    </p>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* TAB: MEDIA / PHOTO GALLERY */}
                                        {activeTab === "media" && (
                                            <motion.div 
                                                key="media-tab"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4"
                                            >
                                                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                                                    <div>
                                                        <h2 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                                            Group Media & Photos ({groupMediaList.length})
                                                        </h2>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            Visual memories and photos shared by group members
                                                        </p>
                                                    </div>
                                                </div>

                                                {groupMediaList.length === 0 ? (
                                                    <div className="text-center py-16">
                                                        <ImageIcon size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                                        <h3 className="text-sm font-black uppercase text-gray-800 dark:text-gray-200">No photos shared yet</h3>
                                                        <p className="text-xs text-gray-400 mt-1">Photos shared in group posts will appear in this gallery.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {groupMediaList.map((item, idx) => (
                                                            <div 
                                                                key={idx}
                                                                onClick={() => {
                                                                    setActiveTab("posts");
                                                                    setTimeout(() => {
                                                                        const el = document.getElementById(`post-${item.postId}`);
                                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }, 300);
                                                                }}
                                                                className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 cursor-pointer shadow-xs"
                                                            >
                                                                <img 
                                                                    src={item.imageUrl} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                                                                    <p className="text-[11px] font-bold truncate">{item.authorName}</p>
                                                                    <p className="text-[9px] text-gray-300"><TimeAgo ts={item.createdAt} /></p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {/* TAB: ABOUT (FULL VIEW) */}
                                        {activeTab === "about" && (
                                            <motion.div 
                                                key="about-tab"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6"
                                            >
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">About This Group</h3>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                                                        {group.description || "No description provided."}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Privacy & Visibility</h4>
                                                        
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                                                {group.privacyType === "public" ? <Globe size={18} /> : <Lock size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-gray-900 dark:text-white">{group.privacyType} Group</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    {group.privacyType === "public" 
                                                                        ? "Anyone on TTC Network can see who's in the group and what they post."
                                                                        : "Only members can see who's in the group and what they post."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                                                <Users size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-gray-900 dark:text-white">Visible Community</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    {group.privacyType === "secret"
                                                                        ? "Only people with an invite link can find this group."
                                                                        : "Anyone can find and discover this group on TTC Network."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Community History</h4>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                                <Calendar size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-gray-900 dark:text-white">Created in {formattedCreatedDate}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Founded by {group.creatorName}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Community Rules */}
                                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                                        <AlertTriangle size={14} className="text-amber-500" /> Group Rules from Admins
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {[
                                                            { title: "Be Kind and Courteous", desc: "We're all in this together to create a welcoming campus environment. Let's treat everyone with respect." },
                                                            { title: "No Hate Speech or Bullying", desc: "Make sure everyone feels safe. Bullying of any kind isn't allowed, and degrading comments won't be tolerated." },
                                                            { title: "No Spam or Irrelevant Promotions", desc: "Give more to this group than you take. Self-promotion, spam, and irrelevant links aren't allowed." },
                                                            { title: "Respect Campus Privacy", desc: "Being part of this group requires mutual trust. Authentic, expressive discussions make groups great, but may also be sensitive." }
                                                        ].map((rule, idx) => (
                                                            <div key={idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                    {idx + 1}. {rule.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                                                    {rule.desc}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                    </AnimatePresence>

                                </div>

                                {/* RIGHT STICKY SIDEBAR (FACEBOOK-STYLE CONTEXT RAIL ON DESKTOP) */}
                                <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-28">
                                    
                                    {/* 1. About Card */}
                                    <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Info size={15} className="text-primary" /> About This Group
                                        </h3>

                                        {/* Description with Expand/Collapse */}
                                        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                            {group.description ? (
                                                <>
                                                    <p className={aboutExpanded ? "" : "line-clamp-3"}>
                                                        {group.description}
                                                    </p>
                                                    {group.description.length > 120 && (
                                                        <button 
                                                            onClick={() => setAboutExpanded(!aboutExpanded)}
                                                            className="text-primary font-bold hover:underline mt-1 block"
                                                        >
                                                            {aboutExpanded ? "See less" : "See more"}
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-gray-400 italic">No description added yet.</p>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                            
                                            {/* Privacy Status */}
                                            <div className="flex items-start gap-2.5">
                                                {group.privacyType === "public" ? (
                                                    <Globe size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                                ) : (
                                                    <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                                        {group.privacyType}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {group.privacyType === "public" 
                                                            ? "Anyone can see who's in the group and what they post."
                                                            : "Only members can see who's in the group and what they post."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Visibility Status */}
                                            <div className="flex items-start gap-2.5">
                                                <Users size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                                        {group.privacyType === "secret" ? "Hidden" : "Visible"}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {group.privacyType === "secret"
                                                            ? "Only invited members can find this group."
                                                            : "Anyone can find and discover this group."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* History / Created */}
                                            <div className="flex items-start gap-2.5">
                                                <Clock size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                                        History
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        Created in {formattedCreatedDate}
                                                    </p>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Learn More Button */}
                                        <button
                                            onClick={() => setActiveTab("about")}
                                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                        >
                                            Learn more about this group
                                        </button>
                                    </div>

                                    {/* 2. Group Admins Card */}
                                    {leadershipList.length > 0 && (
                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <Shield size={15} className="text-indigo-500" /> Admins & Moderators
                                                </h3>
                                                <button 
                                                    onClick={() => setActiveTab("members")}
                                                    className="text-[11px] font-bold text-primary hover:underline"
                                                >
                                                    See All
                                                </button>
                                            </div>

                                            <div className="space-y-2.5 pt-1">
                                                {leadershipList.slice(0, 3).map((m) => (
                                                    <Link 
                                                        key={m.userId} 
                                                        href={`/profile/${m.userId}`}
                                                        title={`View ${m.displayName}'s profile`}
                                                        className="flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 group-hover:scale-105 transition-transform">
                                                            <SafeAvatar 
                                                                src={m.photoURL} 
                                                                alt={m.displayName} 
                                                                sizeClassName="w-full h-full"
                                                                roundedClassName="rounded-lg"
                                                                textClassName="text-[10px] font-bold"
                                                                fallbackBg="bg-indigo-500/10"
                                                                fallbackColor="text-indigo-600 dark:text-indigo-400"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                                {m.displayName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                                                                {m.role === "admin" ? "👑 Admin" : "🛡️ Moderator"}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Recent Photos Preview Card */}
                                    {groupMediaList.length > 0 && (
                                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <ImageIcon size={15} className="text-emerald-500" /> Recent Photos
                                                </h3>
                                                <button 
                                                    onClick={() => setActiveTab("media")}
                                                    className="text-[11px] font-bold text-primary hover:underline"
                                                >
                                                    See All
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                {groupMediaList.slice(0, 6).map((item, idx) => (
                                                    <div 
                                                        key={idx}
                                                        onClick={() => {
                                                            setActiveTab("posts");
                                                            setTimeout(() => {
                                                                const el = document.getElementById(`post-${item.postId}`);
                                                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }, 300);
                                                        }}
                                                        className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-85 transition-opacity"
                                                    >
                                                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>

                            </div>

                        </div>
                    )}

                </main>

            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* MODALS */}
            {/* ═════════════════════════════════════════════════════════════ */}
            
            {/* Post Creation Modal */}
            <GroupPostCreationModal 
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                groupId={groupId}
                groupName={group.name}
            />

            {/* Invite Members Modal */}
            <InviteModal 
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                groupId={groupId}
                groupName={group.name}
                groupMembers={groupMembersList}
                inviteToken={group.inviteToken || ""}
            />

        </div>
    );
}
