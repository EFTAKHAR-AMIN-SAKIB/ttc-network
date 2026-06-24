"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Globe, Lock, EyeOff, Users, Shield, Plus, Pin, Clock, 
    ArrowLeft, Clipboard, Loader2, Sparkles, AlertTriangle, ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { 
    subscribeGroupDetails, subscribeGroupPosts, subscribeGroupMember,
    subscribeGroupRequest, joinGroup, joinSecretGroup, leaveGroup 
} from "@/lib/firestore";
import GroupPostCard from "@/components/GroupPostCard";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";
import GroupModerationPanel from "@/components/GroupModerationPanel";
import { TimeAgo } from "@/components/Social/SocialUtils";

interface GroupPageProps {
    params: { id: string };
}

export default function GroupDetailPage({ params }: GroupPageProps) {
    const groupId = params.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading, close } = useConfirm();

    // Group metadata and memberships
    const [group, setGroup] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [myMemberRecord, setMyMemberRecord] = useState<any>(null);
    const [myRequestRecord, setMyRequestRecord] = useState<any>(null);
    
    // Page state
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"posts" | "members" | "about">("posts");
    const [groupMembersList, setGroupMembersList] = useState<any[]>([]);
    
    // Modals
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isModPanelOpen, setIsModPanelOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [leaveDropdownOpen, setLeaveDropdownOpen] = useState(false);

    const isMember = !!myMemberRecord;
    const userRole = myMemberRecord ? myMemberRecord.role : null;
    const isPending = !!myRequestRecord;
    const isGroupAdmin = userRole === "admin";
    const isGroupModerator = userRole === "moderator";
    const canModerate = isGroupAdmin || isGroupModerator;

    // Cover Gradient presets
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

    // Subscriptions
    useEffect(() => {
        setLoading(true);
        const unsubDetails = subscribeGroupDetails(groupId, (data) => {
            if (!data) {
                showToast("Group not found", "error");
                router.push("/groups");
                return;
            }
            setGroup(data);
            setLoading(false);
        });

        const unsubPosts = subscribeGroupPosts(groupId, (data) => {
            setPosts(data);
        });

        // Members list subscription (only active if group is public OR user is a member)
        let unsubMembers = () => {};
        import("@/lib/firestore").then(({ subscribeGroupMembers }) => {
            unsubMembers = subscribeGroupMembers(groupId, (list) => {
                setGroupMembersList(list);
            });
        });

        return () => {
            unsubDetails();
            unsubPosts();
            unsubMembers();
        };
    }, [groupId]);

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

    // Invite code handling (auto-join secret group)
    useEffect(() => {
        if (!group || !user?.uid || isMember || isPending) return;

        const inviteToken = searchParams.get("invite");
        if (inviteToken && group.privacyType === "secret" && group.inviteToken === inviteToken) {
            setIsJoining(true);
            joinSecretGroup(groupId, inviteToken)
                .then(() => {
                    showToast(`Successfully joined secret group "${group.name}"!`, "success");
                    // Clear the query param
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
    }, [group, user?.uid, isMember, isPending, searchParams]);

    const handleJoin = async () => {
        if (!user) {
            showToast("Log in or register to join campus groups", "info");
            return;
        }
        setIsJoining(true);
        try {
            const res = await joinGroup(groupId);
            if (res.status === "joined") {
                showToast(`Joined "${group.name}"`, "success");
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
        setLeaveDropdownOpen(false);
        const confirmed = await confirm({
            title: "Leave Group?",
            message: `Are you sure you want to leave ${group.name}? You will lose access to member-only posts.`,
            confirmText: "Leave Group",
            variant: "danger"
        });

        if (!confirmed) return;
        setIsJoining(true);
        try {
            await leaveGroup(groupId);
            showToast(`Left "${group.name}"`, "info");
            setActiveTab("posts");
        } catch (err) {
            console.error(err);
            showToast("Failed to leave group", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const copyInviteLink = () => {
        if (!group) return;
        let url = `${window.location.origin}/groups/${groupId}`;
        if (group.privacyType === "secret") {
            url += `?invite=${group.inviteToken}`;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => showToast("Invite link copied to clipboard!", "success"))
                .catch(() => fallbackCopy(url));
        } else {
            fallbackCopy(url);
        }
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
            showToast("Invite link copied to clipboard!", "success");
        } catch (err) {
            showToast("Failed to copy link. Please copy it manually.", "error");
        }
        document.body.removeChild(textArea);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        );
    }

    if (!group) return null;

    // Check if user is allowed to view posts
    const isSecret = group.privacyType === "secret";
    const isPrivate = group.privacyType === "private";
    const canViewContent = !isSecret && (!isPrivate || isMember);

    // Filter pinned vs standard posts
    const pinnedPosts = posts.filter(p => p.isPinned);
    const standardPosts = posts.filter(p => !p.isPinned);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] pb-12">
            
            {/* Top Header Navigation */}
            <div className="bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 sticky top-16 z-30">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button 
                        onClick={() => router.push("/groups")}
                        className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Groups
                    </button>

                    {canModerate && (
                        <button
                            onClick={() => setIsModPanelOpen(true)}
                            className="px-4 py-2 border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5"
                        >
                            <Shield size={14} className="stroke-[2.5]" /> Review Panel
                        </button>
                    )}
                </div>
            </div>

            {/* Main Group Panel */}
            <div className="max-w-4xl mx-auto px-4 mt-6">
                
                {/* Group Details Card */}
                <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm mb-6">
                    {/* Cover Photo */}
                    <div className={`h-48 sm:h-64 bg-gradient-to-r ${getGroupGradient(group.name)} relative flex items-center justify-center`}>
                        {group.coverUrl && (
                            <img src={group.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/10" />
                    </div>

                    {/* Metadata Header */}
                    <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                    group.privacyType === "public" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                    group.privacyType === "private" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                    "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                }`}>
                                    {group.privacyType === "public" ? <Globe size={11} /> : group.privacyType === "private" ? <Lock size={11} /> : <EyeOff size={11} />}
                                    {group.privacyType} Group
                                </span>
                                
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <Users size={12} /> {group.memberCount || 0} Members
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{group.name}</h2>
                        </div>

                        {/* Join / Leave Actions */}
                        <div className="relative self-start sm:self-center shrink-0">
                            {isMember ? (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setLeaveDropdownOpen(!leaveDropdownOpen)}
                                        className="px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-1"
                                    >
                                        Joined Group
                                    </button>
                                    
                                    <AnimatePresence>
                                        {leaveDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setLeaveDropdownOpen(false)} />
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1b1c26] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-1 z-50 overflow-hidden"
                                                >
                                                    <button 
                                                        onClick={handleLeave}
                                                        disabled={isJoining}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                                    >
                                                        Leave Group
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : isPending ? (
                                <button 
                                    disabled
                                    className="px-5 py-3 bg-gray-100 dark:bg-gray-800/80 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-2xl cursor-not-allowed"
                                >
                                    Request Pending
                                </button>
                            ) : (
                                <button 
                                    onClick={handleJoin}
                                    disabled={isJoining}
                                    className="px-6 py-3.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                >
                                    {isJoining ? <Loader2 size={12} className="animate-spin" /> : "Join Group"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Grid Tabs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Main Feed Tab Area */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Tab Switcher */}
                        <div className="flex border-b border-gray-200 dark:border-gray-800 pb-px gap-6 bg-white dark:bg-[#1a1b23] px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm">
                            {[
                                { id: "posts", label: "Posts" },
                                { id: "members", label: "Members" },
                                { id: "about", label: "About" }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`pb-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative ${
                                        activeTab === tab.id 
                                            ? "border-primary text-primary" 
                                            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB BODY CONTENTS */}
                        <AnimatePresence mode="wait">
                            {activeTab === "posts" && (
                                <motion.div 
                                    key="posts"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-5"
                                >
                                    {!canViewContent ? (
                                        <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                            <Lock size={48} className="mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Private Community</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase mt-1">This group is private. Join to view posts and participate.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Write Post Prompt Card */}
                                            {isMember && (
                                                <div 
                                                    onClick={() => setIsPostModalOpen(true)}
                                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 cursor-pointer flex items-center gap-4 group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                                        <Plus size={20} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Write something in this group...</span>
                                                </div>
                                            )}

                                            {/* Pinned Posts */}
                                            {pinnedPosts.length > 0 && (
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
                                            )}

                                            {/* Standard Feed */}
                                            {standardPosts.length === 0 && pinnedPosts.length === 0 ? (
                                                <div className="text-center py-16 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                                    <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Posts Yet</h3>
                                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Be the first to share an update in this group!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
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
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "members" && (
                                <motion.div 
                                    key="members"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm"
                                >
                                    {!canViewContent ? (
                                        <div className="text-center py-8">
                                            <Lock size={32} className="mx-auto text-gray-300 mb-3" />
                                            <h3 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">Private Members List</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Join the group to view members.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                                                Group Members ({groupMembersList.length})
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {groupMembersList.map((m) => (
                                                    <div key={m.userId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800/80 rounded-2xl">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 dark:border-gray-800 shrink-0">
                                                            {m.photoURL ? (
                                                                <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                                    {m.displayName[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{m.displayName}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                                                {m.role === "admin" ? (
                                                                    <span className="text-amber-500 flex items-center gap-0.5"><Shield size={10} className="fill-amber-500/20" /> Admin</span>
                                                                ) : m.role === "moderator" ? (
                                                                    <span className="text-indigo-500 flex items-center gap-0.5"><ShieldCheck size={10} /> Moderator</span>
                                                                ) : (
                                                                    "Member"
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "about" && (
                                <motion.div 
                                    key="about"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6"
                                >
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Group Description</h3>
                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{group.description || "No description provided."}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50 dark:border-gray-800/40">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Privacy Details</h3>
                                            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                                                {group.privacyType === "public" ? <Globe size={16} className="shrink-0 mt-0.5 text-emerald-500" /> : group.privacyType === "private" ? <Lock size={16} className="shrink-0 mt-0.5 text-amber-500" /> : <EyeOff size={16} className="shrink-0 mt-0.5 text-indigo-500" />}
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight">{group.privacyType} community</p>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                        {group.privacyType === "public" ? "Anyone can join, post, and read updates." : 
                                                         group.privacyType === "private" ? "Admins approve members. Only members read updates." : 
                                                         "Only invitees can access. Hidden from search results."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Registration Info</h3>
                                            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 font-bold">
                                                <p className="flex items-center gap-1.5"><Clock size={14} /> Created <Clock size={12} className="hidden" /> <TimeAgo ts={group.createdAt} /></p>
                                                <p className="flex items-center gap-1.5"><Shield size={14} /> Creator: {group.creatorName}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Invite Link Builder */}
                                    {isMember && (
                                        <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Invite Code link</h4>
                                                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Copy and share to invite fellow campus peers.</p>
                                            </div>
                                            <button 
                                                onClick={copyInviteLink}
                                                className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                                            >
                                                <Clipboard size={14} /> Copy Invite Link
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Group Admin Info Box */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm text-center">
                            <Shield size={36} className="mx-auto text-primary mb-3 stroke-[2.5]" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Group Administrators</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Moderating this community</p>
                            
                            <div className="mt-4 space-y-3 text-left border-t border-gray-50 dark:border-gray-800/40 pt-4">
                                {groupMembersList.filter(m => m.role === "admin" || m.role === "moderator").map(m => (
                                    <div key={m.userId} className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                            {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{m.displayName[0]}</div>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black uppercase tracking-tight text-gray-800 dark:text-gray-200 truncate">{m.displayName}</p>
                                            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{m.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rules Summary Box */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                                <AlertTriangle size={14} className="text-amber-500" /> Community Rules
                            </h3>
                            <ul className="space-y-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider list-decimal pl-4">
                                <li>Be respectful and collaborative.</li>
                                <li>No spam or academic dishonesty.</li>
                                <li>Keep campus discussions constructive.</li>
                                <li>Respect privacy and anonymous flags.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>

            {/* Create Post Modal */}
            <GroupPostCreationModal 
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                groupId={groupId}
                groupName={group.name}
            />

            {/* Moderation Panel */}
            <GroupModerationPanel 
                isOpen={isModPanelOpen}
                onClose={() => setIsModPanelOpen(false)}
                groupId={groupId}
                groupName={group.name}
                currentUserRole={userRole}
            />

        </div>
    );
}
