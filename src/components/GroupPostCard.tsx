"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, MoreHorizontal, Pin, Trash2, MessageCircle, 
    AlertTriangle, Check, ShieldAlert, Loader2, Sparkles, Pencil,
    Globe, Lock
} from "lucide-react";
import Link from "next/link";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";
import { TimeAgo, ExpandableText } from "@/components/Social/SocialUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { 
    deleteGroupPost, pinGroupPost, voteInPoll, reportGroupPost, 
    updateGroupPost, subscribeComments, type GroupPostDoc,
    subscribeGroupDetails
} from "@/lib/firestore";
import GroupPostCreationModal from "./GroupPostCreationModal";

const gradients = [
    "from-blue-600 to-indigo-600",
    "from-emerald-600 to-teal-600",
    "from-purple-600 to-pink-600",
    "from-rose-600 to-orange-600",
    "from-cyan-600 to-blue-600"
];

const getGroupGradient = (name: string) => {
    const charCode = name?.charCodeAt(0) || 0;
    return gradients[charCode % gradients.length];
};

interface GroupPostCardProps {
    post: GroupPostDoc & { id: string };
    userRole: "admin" | "moderator" | "member" | null;
    isGroupMember: boolean;
}

export default function GroupPostCard({ post, userRole, isGroupMember }: GroupPostCardProps) {
    const { user } = useAuth();
    const { confirm, setIsLoading, close } = useConfirm();
    const { showToast } = useToast();
    const [showComments, setShowComments] = useState(false);
    const [previewComments, setPreviewComments] = useState<any[]>([]);

    useEffect(() => {
        if (!post.id) return;
        return subscribeComments(post.id, (allComments) => {
            const rootComments = allComments.filter(c => !c.parentId);
            const sorted = [...rootComments].sort((a, b) => {
                const aLikes = a.likes || 0;
                const bLikes = b.likes || 0;
                const aReplies = allComments.filter(c => c.parentId === a.id).length;
                const bReplies = allComments.filter(c => c.parentId === b.id).length;
                const aScore = aLikes + aReplies * 2;
                const bScore = bLikes + bReplies * 2;
                if (aScore !== bScore) return bScore - aScore;
                const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            setPreviewComments(sorted.slice(0, 2));
        });
    }, [post.id]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportReportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [isVoting, setIsVoting] = useState<string | null>(null);

    const [groupDetails, setGroupDetails] = useState<any>(null);

    useEffect(() => {
        if (!post.groupId) return;
        return subscribeGroupDetails(post.groupId, (data) => {
            setGroupDetails(data);
        });
    }, [post.groupId]);

    const [isEditing, setIsEditing] = useState(false);

    const isCreator = user?.uid === post.creatorId;
    const canManage = isCreator || userRole === "admin" || userRole === "moderator";

    // Check if current user voted in poll
    const hasVoted = useMemo(() => {
        if (!post.poll || !user?.uid) return false;
        return post.poll.options.some(opt => opt.votes?.includes(user.uid));
    }, [post.poll, user?.uid]);

    // Total votes in poll
    const totalVotes = useMemo(() => {
        if (!post.poll) return 0;
        return post.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
    }, [post.poll]);

    const handleVote = async (optionId: string) => {
        if (!user) {
            showToast("Please log in to vote", "info");
            return;
        }
        if (!isGroupMember) {
            showToast("Join the group to vote in polls", "info");
            return;
        }
        if (isVoting) return;
        setIsVoting(optionId);
        try {
            await voteInPoll(post.id, optionId);
            showToast("Vote registered!", "success");
        } catch (err) {
            console.error("Error voting:", err);
            showToast("Failed to register vote.", "error");
        } finally {
            setIsVoting(null);
        }
    };

    const handleDelete = async () => {
        setMenuOpen(false);
        const confirmed = await confirm({
            title: "Delete Group Post?",
            message: "Are you sure you want to delete this post? This action is permanent and cannot be undone.",
            confirmText: "Delete Post",
            variant: "danger"
        });

        if (!confirmed) return;
        setIsLoading(true);
        try {
            await deleteGroupPost(post.id, post.groupId);
            showToast("Post deleted successfully", "success");
        } catch (err) {
            console.error("Failed to delete post:", err);
            showToast("Failed to delete post.", "error");
        } finally {
            close();
        }
    };

    const handleTogglePin = async () => {
        setMenuOpen(false);
        try {
            await pinGroupPost(post.id, !post.isPinned);
            showToast(post.isPinned ? "Post unpinned" : "Post pinned to top", "success");
        } catch (err) {
            console.error("Error toggling pin:", err);
            showToast("Failed to toggle pin status.", "error");
        }
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportReason.trim()) return;
        setIsReporting(true);
        try {
            await reportGroupPost(
                post.groupId, 
                post.id, 
                post.content, 
                post.creatorId, 
                reportReason.trim()
            );
            showToast("Post reported successfully. Admins will review it.", "success");
            setReportModalOpen(false);
            setReportReason("");
        } catch (err) {
            console.error("Failed to report post:", err);
            showToast("Failed to submit report.", "error");
        } finally {
            setIsReporting(false);
        }
    };

    // Anonymous display logic
    const authorName = post.isAnonymous ? "Anonymous Member" : post.creatorName;
    const authorPhoto = post.isAnonymous ? "" : post.creatorPhotoURL;
    const authorRole = post.isAnonymous ? "" : post.creatorRole;

    return (
        <>
        <motion.div 
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-md relative overflow-visible ${
                post.isPinned ? "border-amber-500/30 dark:border-amber-500/20 bg-amber-50/10 dark:bg-amber-950/5" : ""
            }`}
        >
            {/* Pinned Badge */}
            {post.isPinned && (
                <div className="absolute top-4 right-16 flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Pin size={10} className="fill-amber-500" /> Pinned Post
                </div>
            )}

            {/* Post Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Overlapping Avatars (Facebook style) */}
                    <div className="relative w-12 h-12 shrink-0">
                        {/* Group Cover Avatar */}
                        <Link href={`/groups/${post.groupId}`}>
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:scale-[1.03] transition-transform duration-300">
                                {groupDetails?.coverUrl ? (
                                    <img src={groupDetails.coverUrl} alt={groupDetails?.name || post.groupName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${getGroupGradient(groupDetails?.name || post.groupName)} flex items-center justify-center text-xs font-black text-white uppercase`}>
                                        {(groupDetails?.name || post.groupName).slice(0, 2)}
                                    </div>
                                )}
                            </div>
                        </Link>

                        {/* Overlapping User Avatar */}
                        {post.isAnonymous ? (
                            <div 
                                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-850 border-2 border-white dark:border-[#1a1b23] flex items-center justify-center text-[10px] shadow-sm"
                                title="Anonymous Post"
                            >
                                🎭
                            </div>
                        ) : (
                            <Link href={`/profile/${post.creatorId}`}>
                                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-[#1a1b23] hover:scale-105 transition-transform duration-300 shadow-sm">
                                    {authorPhoto ? (
                                        <img src={authorPhoto} alt={authorName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-gray-500 bg-primary/10 text-primary">
                                            {authorName[0]}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link 
                                href={`/groups/${post.groupId}`} 
                                className="text-sm font-black text-gray-900 dark:text-white hover:text-primary transition-colors uppercase tracking-tight truncate max-w-[200px] sm:max-w-[320px]"
                            >
                                {groupDetails?.name || post.groupName}
                            </Link>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 flex-wrap">
                            {post.isAnonymous ? (
                                <span className="font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    Anonymous Member <span className="text-[9px] font-normal italic text-gray-400 dark:text-gray-500 leading-none">(Identity Masked)</span>
                                </span>
                            ) : (
                                <Link 
                                    href={`/profile/${post.creatorId}`} 
                                    className="font-bold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[180px]"
                                >
                                    {authorName}
                                </Link>
                            )}

                            {authorRole && (
                                <span className={`text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                    authorRole === 'admin' || authorRole === 'super_manager' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400' : 
                                    authorRole === 'teacher' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 
                                    'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                                }`}>
                                    {authorRole}
                                </span>
                            )}

                            <span className="text-gray-300 dark:text-gray-700 font-normal leading-none">•</span>
                            
                            <div className="flex items-center gap-1 text-[10px]">
                                <Clock size={11} className="stroke-[2.5]" />
                                <TimeAgo ts={post.createdAt} />
                            </div>

                            <span className="text-gray-300 dark:text-gray-700 font-normal leading-none">•</span>
                            
                            {/* Privacy Icon */}
                            {groupDetails?.privacyType === "public" ? (
                                <span title="Public Group"><Globe size={11} className="text-gray-400 dark:text-gray-500" /></span>
                            ) : (
                                <span title="Private Group"><Lock size={11} className="text-gray-400 dark:text-gray-500" /></span>
                            )}
                        </div>
                    </div>
                </div>

                {/* More Menu */}
                {user && (
                    <div className="relative">
                        <button 
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        
                        <AnimatePresence>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden"
                                    >
                                        {(userRole === "admin" || userRole === "moderator") && (
                                            <button 
                                                onClick={handleTogglePin}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                                            >
                                                <Pin size={14} className={post.isPinned ? "fill-amber-500 stroke-amber-500" : ""} />
                                                {post.isPinned ? "Unpin Post" : "Pin to Top"}
                                            </button>
                                        )}
                                        {isCreator && (
                                            <button 
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    setIsEditing(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-gray-755 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                                            >
                                                <Pencil size={14} />
                                                Edit Post
                                            </button>
                                        )}
                                        {canManage && (
                                            <button 
                                                onClick={handleDelete}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                            >
                                                <Trash2 size={14} />
                                                Delete Post
                                            </button>
                                        )}
                                        {!isCreator && (
                                            <button 
                                                onClick={() => { setMenuOpen(false); setReportModalOpen(true); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all"
                                            >
                                                <AlertTriangle size={14} />
                                                Report Post
                                            </button>
                                        )}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Post Content */}
            <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">
                <ExpandableText text={post.content} limit={280} />
            </div>

            {/* Image (if any) */}
            {post.imageUrl && (
                <div className="relative rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 mb-4 max-h-[380px] flex items-center justify-center">
                    <img src={post.imageUrl} alt="" className="object-contain max-h-[380px] w-full" />
                </div>
            )}

            {/* Poll (if any) */}
            {post.poll && (
                <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 mb-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-primary" /> Campus Poll
                    </h3>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-100 mb-4">{post.poll.question}</p>
                    
                    <div className="space-y-3">
                        {post.poll.options.map((opt) => {
                            const optionVotes = opt.votes?.length || 0;
                            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            const isMyVote = opt.votes?.includes(user?.uid || "");

                            return (
                                <div key={opt.id} className="relative">
                                    {hasVoted ? (
                                        // Voted View (Percentage bars)
                                        <div 
                                            className={`w-full overflow-hidden rounded-2xl border text-left p-3.5 flex items-center justify-between text-xs font-bold transition-all relative ${
                                                isMyVote 
                                                    ? "bg-primary/5 border-primary/20 text-primary" 
                                                    : "bg-white dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            {/* Vote Fill */}
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                className={`absolute inset-y-0 left-0 z-0 ${
                                                    isMyVote ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800/80"
                                                }`}
                                                transition={{ type: "spring", stiffness: 60, damping: 15 }}
                                            />
                                            <span className="z-10 flex items-center gap-2 select-none truncate">
                                                {opt.text}
                                                {isMyVote && <Check size={14} className="stroke-[3] text-primary shrink-0" />}
                                            </span>
                                            <span className="z-10 font-black ml-2">{percentage}% ({optionVotes})</span>
                                        </div>
                                    ) : (
                                        // Interactive Vote Option Buttons
                                        <button
                                            onClick={() => handleVote(opt.id)}
                                            disabled={isVoting !== null}
                                            className="w-full bg-white dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-left p-3.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all flex items-center justify-between group"
                                        >
                                            <span className="group-hover:translate-x-1 transition-transform duration-200">{opt.text}</span>
                                            {isVoting === opt.id && <Loader2 size={14} className="animate-spin text-primary" />}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {totalVotes > 0 && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-3.5 text-right">
                            {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                        </div>
                    )}
                </div>
            )}

            {/* Reactions & Actions Row */}
            <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50 pt-4 mt-2">
                <ReactionBtn 
                    contentId={post.id}
                    contentType="groupPost"
                    reactions={post.reactions}
                    reactedBy={post.reactedBy}
                    currentUserId={user?.uid}
                />

                <button 
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                        showComments 
                            ? "bg-primary/5 text-primary" 
                            : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    }`}
                >
                    <MessageCircle size={16} /> Comments ({post.commentsCount || 0})
                </button>
            </div>

            {/* Preview of 1-2 top comments */}
            {!showComments && previewComments.length > 0 && (
                <div 
                    onClick={() => setShowComments(true)}
                    className="mt-4 p-4 bg-gray-50/50 dark:bg-gray-800/10 hover:bg-gray-50 dark:hover:bg-gray-800/20 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl cursor-pointer transition-all space-y-2 relative z-10 animate-fade-in"
                >
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                        <MessageCircle size={12} className="text-primary animate-pulse" /> Top Comments
                    </p>
                    <div className="space-y-1.5">
                        {previewComments.map(c => (
                            <div key={c.id} className="flex gap-2 text-[11px] leading-relaxed">
                                <span className="font-black text-gray-900 dark:text-white shrink-0 uppercase tracking-tight">{c.userName}:</span>
                                <span className="text-gray-600 dark:text-gray-300 line-clamp-1 break-all font-medium">{c.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Threaded Comments Drawer */}
            <AnimatePresence>
                {showComments && (
                    <CommentDrawer 
                        isOpen={showComments} 
                        onClose={() => setShowComments(false)}
                        contentId={post.id}
                        contentType="groupPost"
                        placeholder={isGroupMember ? "Share your perspective inside this group..." : "Join group to comment..."}
                    />
                )}
            </AnimatePresence>

            {/* Report Reason Dialog */}
            <AnimatePresence>
                {reportReportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
                        >
                            <div className="flex items-center gap-3 text-amber-500 mb-4">
                                <ShieldAlert size={28} />
                                <h3 className="text-lg font-black uppercase tracking-tight">Report Post</h3>
                            </div>
                            
                            <form onSubmit={handleReportSubmit}>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Why are you reporting this post?
                                </label>
                                <textarea
                                    required
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Please describe how this content violates community guidelines (e.g. spam, harassment, hate speech, false information)..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-xs focus:ring-1 focus:ring-amber-500 outline-none h-28 resize-none mb-6 text-gray-800 dark:text-gray-200"
                                />

                                <div className="flex items-center justify-end gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => { setReportModalOpen(false); setReportReason(""); }}
                                        className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isReporting || !reportReason.trim()}
                                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                    >
                                        {isReporting ? <Loader2 className="animate-spin" size={14} /> : "Submit Report"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>

        <GroupPostCreationModal 
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            groupId={post.groupId}
            groupName={groupDetails?.name || post.groupName}
            editPost={post}
        />
        </>
    );
}
