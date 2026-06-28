"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserPlus, Clipboard, Check, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { 
    getFollowersList, 
    getFollowingList, 
    getAllUsers, 
    inviteUserToGroup, 
    type FirestoreUser, 
    type GroupMember 
} from "@/lib/firestore";
import Image from "next/image";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    groupMembers: GroupMember[];
    inviteToken: string;
}

export default function InviteModal({ isOpen, onClose, groupId, groupName, groupMembers, inviteToken }: InviteModalProps) {
    const { user, profile } = useAuth();
    const { showToast } = useToast();

    // Data lists
    const [followers, setFollowers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [following, setFollowing] = useState<(FirestoreUser & { id: string })[]>([]);
    const [allUsers, setAllUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Search and action states
    const [searchQuery, setSearchQuery] = useState("");
    const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
    const [isActioning, setIsActioning] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch lists on open
    useEffect(() => {
        if (!isOpen || !user?.uid) return;

        setLoadingData(true);
        Promise.all([
            getFollowersList(user.uid),
            getFollowingList(user.uid),
            getAllUsers()
        ]).then(([followersList, followingList, allUsersList]) => {
            setFollowers(followersList);
            setFollowing(followingList);
            setAllUsers(allUsersList);
        }).catch(err => {
            console.error("Failed to load users for invitation", err);
            showToast("Failed to load user lists.", "error");
        }).finally(() => {
            setLoadingData(false);
        });
    }, [isOpen, user?.uid, showToast]);

    // Build the "Followers & Following" list (deduplicated)
    const followersAndFollowing = useMemo(() => {
        const map = new Map<string, FirestoreUser & { id: string }>();
        followers.forEach(u => map.set(u.id, u));
        following.forEach(u => map.set(u.id, u));
        // Remove current user if present
        if (user?.uid) {
            map.delete(user.uid);
        }
        return Array.from(map.values());
    }, [followers, following, user?.uid]);

    // Search query matches
    const filteredSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase().trim();
        return allUsers.filter(u => {
            if (u.id === user?.uid) return false; // Exclude self
            const nameMatch = u.displayName?.toLowerCase().includes(query);
            const usernameMatch = u.username?.toLowerCase().includes(query);
            return nameMatch || usernameMatch;
        });
    }, [searchQuery, allUsers, user?.uid]);

    // Handle invite button action
    const handleInvite = async (targetUser: FirestoreUser & { id: string }) => {
        if (!user || isActioning) return;
        setIsActioning(targetUser.id);

        try {
            await inviteUserToGroup(
                groupId,
                groupName,
                targetUser.id,
                user.uid,
                profile?.displayName || user.displayName || "A campus peer",
                profile?.photoURL || user.photoURL || ""
            );
            
            setInvitedUserIds(prev => {
                const updated = new Set(prev);
                updated.add(targetUser.id);
                return updated;
            });
            showToast(`Invitation sent to ${targetUser.displayName}!`, "success");
        } catch (err) {
            console.error("Invite error", err);
            showToast("Failed to send invitation.", "error");
        } finally {
            setIsActioning(null);
        }
    };

    // Copy backup link
    const handleCopyLink = () => {
        let url = `${window.location.origin}/groups/${groupId}`;
        if (inviteToken) {
            url += `?invite=${inviteToken}`;
        }

        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            showToast("Invite link copied to clipboard!", "success");
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error("Failed to copy link", err);
            showToast("Failed to copy link.", "error");
        });
    };

    // Check member status
    const isMember = (userId: string) => {
        return groupMembers.some(m => m.userId === userId);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-md bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl p-6 overflow-hidden z-10 flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-50 dark:border-gray-800/40 shrink-0">
                            <div className="flex items-center gap-2">
                                <Users className="text-primary stroke-[2.5]" size={20} />
                                <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                    Invite Peers
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="mt-4 shrink-0 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search friends by name or username..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/10 outline-none transition-all placeholder:text-gray-405"
                            />
                        </div>

                        {/* Scrollable Users Area */}
                        <div className="flex-1 overflow-y-auto mt-4 py-1 pr-1 space-y-4 min-h-[220px] max-h-[40vh] no-scrollbar scrollbar-none">
                            {loadingData ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Loading connections...</span>
                                </div>
                            ) : searchQuery.trim() ? (
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                                        Search Results
                                    </h4>
                                    {filteredSearchResults.length === 0 ? (
                                        <p className="text-xs text-gray-400 font-semibold py-8 text-center">No users match your query.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredSearchResults.map(u => (
                                                <UserRow 
                                                    key={u.id} 
                                                    user={u} 
                                                    isGroupMember={isMember(u.id)}
                                                    isInvited={invitedUserIds.has(u.id)}
                                                    onInvite={() => handleInvite(u)}
                                                    loading={isActioning === u.id}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                                        Followers & Following
                                    </h4>
                                    {followersAndFollowing.length === 0 ? (
                                        <p className="text-xs text-gray-400 font-semibold py-8 text-center leading-relaxed">
                                            You are not following anyone yet.<br />Use the search bar above to invite any peer!
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {followersAndFollowing.map(u => (
                                                <UserRow 
                                                    key={u.id} 
                                                    user={u} 
                                                    isGroupMember={isMember(u.id)}
                                                    isInvited={invitedUserIds.has(u.id)}
                                                    onInvite={() => handleInvite(u)}
                                                    loading={isActioning === u.id}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Invite Code Option */}
                        <div className="border-t border-gray-50 dark:border-gray-800/40 pt-4 mt-4 shrink-0 bg-white dark:bg-[#1a1b23]">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                                Share Invite Link
                            </h4>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl p-2 pl-3">
                                <span className="text-[10px] font-semibold text-gray-400 truncate flex-1 select-all select-none">
                                    {window.location.origin}/groups/{groupId}{inviteToken ? `?invite=${inviteToken}` : ""}
                                </span>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-850 rounded-xl text-gray-600 dark:text-gray-300 hover:text-indigo-500 transition-colors flex items-center justify-center shrink-0"
                                    title="Copy Link"
                                >
                                    {copied ? <Check className="text-emerald-500" size={14} /> : <Clipboard size={14} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

interface UserRowProps {
    user: FirestoreUser & { id: string };
    isGroupMember: boolean;
    isInvited: boolean;
    onInvite: () => void;
    loading: boolean;
}

function UserRow({ user, isGroupMember, isInvited, onInvite, loading }: UserRowProps) {
    return (
        <div className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-black/10 rounded-2xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800/50">
            <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    {user.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt={user.displayName || "User"}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase text-gray-400 bg-gray-100 dark:bg-gray-800">
                            {user.displayName?.charAt(0) || "U"}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {user.displayName || "Unknown Peer"}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                        @{user.username || "peer"}
                    </p>
                </div>
            </div>

            <div className="shrink-0 ml-4">
                {isGroupMember ? (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-950/30">
                        Joined
                    </span>
                ) : isInvited ? (
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-950/30 flex items-center gap-1">
                        <Check size={10} /> Invited
                    </span>
                ) : (
                    <button
                        onClick={onInvite}
                        disabled={loading}
                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={10} />
                        ) : (
                            <UserPlus size={10} />
                        )}
                        Invite
                    </button>
                )}
            </div>
        </div>
    );
}
