"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Trash2, Reply, MoreHorizontal, CheckCircle2, X, Loader2 } from "lucide-react";
import { addComment, deleteComment, subscribeComments, subscribeCommentsWithLimit, getFollowingUserIds } from "@/lib/firestore";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { ReactionBtn } from "./ReactionSystem";
import { ExpandableText, TimeAgo } from "./SocialUtils";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import Link from "next/link";

/**
 * CommentItem Component
 */
export function CommentItem({
    comment,
    contentId,
    contentType,
    onReply
}: {
    comment: any;
    contentId: string;
    contentType: "post" | "story" | "study" | "groupPost";
    onReply: (userName: string, parentId: string) => void;
}) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading, close } = useConfirm();
    const { requireVerification } = useVerifiedAccess();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!requireVerification("delete comments")) return;
        const confirmed = await confirm({
            title: "Delete Comment?",
            message: "This action cannot be undone. Are you sure you want to remove your perspective from this conversation? It will be permanently deleted.",
            confirmText: "Delete Now",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsDeleting(true);
        setIsLoading(true);
        try {
            await deleteComment(comment.id, contentId, contentType);
            showToast("Comment deleted", "success");
        } catch (err) {
            showToast("Failed to delete comment", "error");
        } finally {
            close();
            setIsDeleting(false);
        }
    };

    const isAuthor = user?.uid === comment.userId;

    return (
        <motion.div
            id={`comment-${comment.id}`}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 scroll-mt-24 ${comment.parentId ? 'ml-4 sm:ml-10 mt-3 pt-3 border-l-2 border-gray-100 dark:border-gray-800 pl-4' : 'mt-6'}`}
        >
            <Link href={`/profile/${comment.userId}`} className="shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                            {comment.userName?.[0]}
                        </div>
                    )}
                </div>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 relative group/comment">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Link href={`/profile/${comment.userId}`} className="text-xs font-black hover:text-primary transition-colors truncate">
                                {comment.userName}
                            </Link>
                            {comment.userVerified && <CheckCircle2 size={12} className="text-blue-500 shrink-0" />}
                            <span className={`text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded ${
                                comment.userRole === 'manager' ? 'bg-red-100 text-red-600' : 
                                comment.userRole === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {comment.userRole}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0"><TimeAgo ts={comment.createdAt} /></span>
                    </div>
                    <ExpandableText text={comment.text} limit={150} />

                    {/* Comment Actions */}
                    <div className="flex items-center gap-4 mt-2">
                        <div className="scale-75 origin-left">
                            <ReactionBtn 
                                contentId={comment.id} 
                                contentType="comment" 
                                reactions={comment.reactions} 
                                reactedBy={comment.reactedBy}
                                currentUserId={user?.uid}
                            />
                        </div>
                        <button 
                            onClick={() => {
                                if (!user) {
                                    showToast("Please log in or register to reply.", "info");
                                } else if (requireVerification("reply to comments")) {
                                    onReply(comment.userName, comment.parentId || comment.id);
                                }
                            }}
                            className="text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <Reply size={12} /> Reply
                        </button>
                        {isAuthor && (
                            <button 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} /> {isDeleting ? "..." : "Delete"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * CommentSystem Component (Generic)
 */
export function CommentSystem({
    contentId,
    contentType,
    accentColor = "text-primary",
    placeholder = "Share your thoughts..."
}: {
    contentId: string;
    contentType: "post" | "story" | "study" | "groupPost";
    accentColor?: string;
    placeholder?: string;
}) {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [replyTo, setReplyTo] = useState<{ userName: string; parentId: string } | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const draftKey = `ttc_comment_draft_${contentType}_${contentId}`;

    // Load draft
    useEffect(() => {
        const saved = localStorage.getItem(draftKey);
        if (saved) setText(saved);
    }, [contentType, contentId]);

    // Save draft
    useEffect(() => {
        if (text) {
            localStorage.setItem(draftKey, text);
        } else {
            localStorage.removeItem(draftKey);
        }
    }, [text, draftKey]);

    // Subscribe to comments
    useEffect(() => {
        if (!contentId) return;
        return subscribeComments(contentId, (all) => {
            setComments(all);

            // Auto-scroll to specific comment if hash matches
            if (typeof window !== "undefined" && window.location.hash.startsWith("#comment-")) {
                const commentId = window.location.hash.substring(1);
                // We use a small timeout to ensure the DOM has rendered the new comment items
                setTimeout(() => {
                    const el = document.getElementById(commentId);
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        // Add a subtle highlight effect
                        el.classList.add("ring-2", "ring-primary", "ring-offset-2");
                        setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 3000);
                    }
                }, 500);
            }
        });
    }, [contentId]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!requireVerification("post comments")) return;
        if (!user) {
            showToast("Please sign in to comment", "info");
            return;
        }
        if (!text.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addComment(contentId, text.trim(), replyTo?.parentId, contentType);
            setText("");
            setReplyTo(null);
            localStorage.removeItem(draftKey);
            showToast("Comment posted", "success");
        } catch (err) {
            showToast("Failed to post comment", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const rootComments = comments.filter(c => !c.parentId);
    const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

    return (
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className={`w-5 h-5 ${accentColor}`} />
                <h3 className="text-sm font-black uppercase tracking-widest">Comments ({comments.length})</h3>
            </div>

            {/* Input Wrapper */}
            <div className={`mb-8 p-3.5 sm:p-4 bg-white dark:bg-gray-900 border-2 rounded-[1.8rem] shadow-sm transition-all duration-300 ${
                isFocused 
                    ? 'border-primary/40 shadow-lg shadow-primary/5 dark:border-primary/30' 
                    : 'border-slate-100 dark:border-gray-850'
            }`}>
                {user ? (
                    <form onSubmit={handleSubmit}>
                        <AnimatePresence>
                            {replyTo && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 mb-2"
                                >
                                    <div className="flex items-center gap-2 text-[10px] uppercase font-black text-gray-500">
                                        <Reply size={12} className="text-primary" /> 
                                        <span>Replying to <span className="text-primary">{replyTo.userName}</span></span>
                                    </div>
                                    <button type="button" onClick={() => setReplyTo(null)} className="text-[10px] font-black text-gray-400 hover:text-red-500">Cancel</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 pt-1">
                                 <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 overflow-hidden">
                                     {profile?.photoURL || user?.photoURL ? (
                                         <img src={profile?.photoURL || user?.photoURL || undefined} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 bg-slate-100 dark:bg-gray-850">
                                             {profile?.displayName?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || "?"}
                                         </div>
                                     )}
                                 </div>
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={placeholder}
                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-1.5 resize-none min-h-[40px] max-h-[200px] font-medium placeholder:text-gray-400 dark:text-gray-300"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            if (window.innerWidth > 640) {
                                                e.preventDefault();
                                                handleSubmit();
                                            }
                                        }
                                    }}
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] font-bold text-gray-400">Shift + Enter for new line</span>
                                    <button
                                        type="submit"
                                        disabled={!text.trim() || isSubmitting}
                                        className={`p-2 rounded-xl transition-all ${
                                            text.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                        } disabled:opacity-50`}
                                    >
                                        <Send size={16} className={isSubmitting ? 'animate-pulse' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-3">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            Want to share your thoughts? Log in or register to join the conversation.
                        </p>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link 
                                href="/login" 
                                className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-center"
                            >
                                Log In
                            </Link>
                            <Link 
                                href="/signup" 
                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center border border-gray-200/50 dark:border-gray-700/50"
                            >
                                Register
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {rootComments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/10 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                         <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 shadow-sm">
                             <MessageSquare className="w-6 h-6 text-gray-300" />
                         </div>
                         <p className="text-xs font-bold text-gray-400">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    rootComments.map(comment => (
                        <div key={comment.id}>
                            <CommentItem 
                                comment={comment}
                                contentId={contentId}
                                contentType={contentType}
                                onReply={(userName, parentId) => {
                                    setReplyTo({ userName, parentId });
                                    setText(prev => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                    setTimeout(() => {
                                        if (inputRef.current) {
                                            inputRef.current.focus();
                                            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
                                        }
                                    }, 10);
                                }}
                            />
                            {getReplies(comment.id).map(reply => (
                                <CommentItem 
                                    key={reply.id}
                                    comment={reply}
                                    contentId={contentId}
                                    contentType={contentType}
                                    onReply={(userName, parentId) => {
                                        setReplyTo({ userName, parentId });
                                        setText(prev => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                        setTimeout(() => {
                                            if (inputRef.current) {
                                                inputRef.current.focus();
                                                inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
                                            }
                                        }, 10);
                                    }}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Simple client-side cache for recently loaded comments
const commentsCache: Record<string, any[]> = {};

export function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    return mounted ? createPortal(children, document.body) : null;
}

export function CommentDrawer({
    isOpen,
    onClose,
    contentId,
    contentType,
    accentColor = "text-primary",
    placeholder = "Share your thoughts..."
}: {
    isOpen: boolean;
    onClose: () => void;
    contentId: string;
    contentType: "post" | "story" | "study" | "groupPost";
    accentColor?: string;
    placeholder?: string;
}) {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const [comments, setComments] = useState<any[]>(() => commentsCache[contentId] || []);
    const [optimisticComments, setOptimisticComments] = useState<any[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [replyTo, setReplyTo] = useState<{ userName: string; parentId: string } | null>(null);
    const [limitVal, setLimitVal] = useState(15);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const draftKey = `ttc_comment_draft_${contentType}_${contentId}`;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Load draft
    useEffect(() => {
        const saved = localStorage.getItem(draftKey);
        if (saved) setText(saved);
    }, [contentType, contentId]);

    // Save draft
    useEffect(() => {
        if (text) {
            localStorage.setItem(draftKey, text);
        } else {
            localStorage.removeItem(draftKey);
        }
    }, [text, draftKey]);

    // Fetch following user IDs
    useEffect(() => {
        if (user?.uid) {
            getFollowingUserIds(user.uid).then(ids => {
                setFollowingIds(new Set(ids));
            }).catch(err => console.error("Error loading following ids:", err));
        }
    }, [user]);

    // Subscribe to comments
    useEffect(() => {
        if (!contentId || !isOpen) return;
        setIsLoading(true);
        const unsub = subscribeCommentsWithLimit(contentId, limitVal, (all) => {
            commentsCache[contentId] = all;
            setComments(all);
            setHasMore(all.length >= limitVal);
            setIsLoading(false);
        });
        return unsub;
    }, [contentId, limitVal, isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!requireVerification("post comments")) return;
        if (!user) {
            showToast("Please sign in to comment", "info");
            return;
        }
        if (!text.trim() || isSubmitting) return;

        const commentText = text.trim();
        const parentId = replyTo?.parentId || null;
        
        // Optimistic Comment Object
        const tempId = `optimistic-${Date.now()}`;
        const optimisticComment = {
            id: tempId,
            postId: contentId,
            userId: user.uid,
            userName: profile?.displayName || user.displayName || "You",
            userAvatar: profile?.photoURL || user.photoURL || "",
            userRole: profile?.role || "student",
            userVerified: profile?.roleVerified || false,
            text: commentText,
            parentId: parentId,
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            reactions: { love: 0, relatable: 0, respect: 0, cry: 0, angry: 0 },
            reactedBy: { love: [], relatable: [], respect: [], cry: [], angry: [] },
            isOptimistic: true
        };

        setText("");
        setReplyTo(null);
        localStorage.removeItem(draftKey);
        setOptimisticComments(prev => [...prev, optimisticComment]);

        try {
            await addComment(contentId, commentText, parentId || undefined, contentType);
            showToast("Comment posted", "success");
        } catch (err) {
            setText(commentText);
            showToast("Failed to post comment", "error");
        } finally {
            setOptimisticComments(prev => prev.filter(c => c.id !== tempId));
        }
    };

    const combinedComments = [...optimisticComments, ...comments.filter(c => !optimisticComments.some(oc => oc.text === c.text && oc.userId === c.userId))];
    const rootComments = combinedComments.filter(c => !c.parentId);
    const getReplies = (parentId: string) => combinedComments.filter(c => c.parentId === parentId);

    const sortedRootComments = useMemo(() => {
        return [...rootComments].sort((a, b) => {
            const aFollowed = followingIds.has(a.userId) ? 1 : 0;
            const bFollowed = followingIds.has(b.userId) ? 1 : 0;
            if (aFollowed !== bFollowed) return bFollowed - aFollowed;

            const aReplies = combinedComments.filter(c => c.parentId === a.id).length;
            const bReplies = combinedComments.filter(c => c.parentId === b.id).length;
            const aLikes = a.likes || 0;
            const bLikes = b.likes || 0;
            const aReactionsCount = a.reactions ? Object.values(a.reactions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) : 0;
            const bReactionsCount = b.reactions ? Object.values(b.reactions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) : 0;
            
            const aScore = aLikes + aReplies * 2 + aReactionsCount;
            const bScore = bLikes + bReplies * 2 + bReactionsCount;
            if (aScore !== bScore) return bScore - aScore;

            const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
    }, [combinedComments, followingIds]);

    const handleScroll = () => {
        const el = listRef.current;
        if (!el) return;
        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 80) {
            if (hasMore && !isLoading) {
                setLimitVal(prev => prev + 15);
            }
        }
    };

    if (!isOpen) return null;

    const variants: any = isMobile 
        ? {
            initial: { y: "100%" },
            animate: { y: 0, transition: { type: "spring", damping: 30, stiffness: 300 } },
            exit: { y: "100%" }
          }
        : {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
            exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
          };

    const totalCommentsCount = comments.length;

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                    onClick={onClose} 
                />

                {/* Sheet / Modal Container */}
                <motion.div
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full bg-white dark:bg-[#16171f] rounded-t-[2.5rem] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] md:max-w-xl overflow-hidden relative z-10 border border-gray-100 dark:border-gray-800"
                >
                    {/* Header with Drag Handle */}
                    <div className="px-6 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex flex-col items-center">
                        {isMobile && (
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
                        )}
                        <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className={`w-5 h-5 ${accentColor}`} />
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                    Comments ({totalCommentsCount})
                                </h3>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Comments List */}
                    <div 
                        ref={listRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
                    >
                        {sortedRootComments.length === 0 && !isLoading && (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <MessageSquare className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Be the first to share your thoughts!</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {sortedRootComments.map(comment => (
                                <div key={comment.id}>
                                    <CommentItem 
                                        comment={comment}
                                        contentId={contentId}
                                        contentType={contentType}
                                        onReply={(userName, parentId) => {
                                            setReplyTo({ userName, parentId });
                                            setText(prev => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                            setTimeout(() => {
                                                if (inputRef.current) {
                                                    inputRef.current.focus();
                                                    inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
                                                }
                                            }, 10);
                                        }}
                                    />
                                    {getReplies(comment.id).map(reply => (
                                        <CommentItem 
                                            key={reply.id}
                                            comment={reply}
                                            contentId={contentId}
                                            contentType={contentType}
                                            onReply={(userName, parentId) => {
                                                setReplyTo({ userName, parentId });
                                                setText(prev => prev.startsWith(`@${userName}`) ? prev : `@${userName} ${prev}`);
                                                setTimeout(() => {
                                                    if (inputRef.current) {
                                                        inputRef.current.focus();
                                                        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
                                                    }
                                                }, 10);
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {isLoading && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-primary" size={20} />
                            </div>
                        )}
                    </div>

                    {/* Fixed Input Form at bottom */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#16171f] shrink-0 pb-safe">
                        <div className={`p-3.5 bg-gray-50 dark:bg-gray-900 border-2 rounded-[1.8rem] shadow-sm transition-all duration-300 ${
                            isFocused 
                                ? 'border-primary/45 shadow-lg shadow-primary/5 dark:border-primary/30' 
                                : 'border-slate-100/50 dark:border-gray-850'
                        }`}>
                            {user ? (
                                <form onSubmit={handleSubmit}>
                                    <AnimatePresence>
                                        {replyTo && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 mb-2"
                                            >
                                                <div className="flex items-center gap-2 text-[10px] uppercase font-black text-gray-500">
                                                    <Reply size={12} className="text-primary" /> 
                                                    <span>Replying to <span className="text-primary">{replyTo.userName}</span></span>
                                                </div>
                                                <button type="button" onClick={() => setReplyTo(null)} className="text-[10px] font-black text-gray-400 hover:text-red-500">Cancel</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 pt-1">
                                             <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 overflow-hidden">
                                                 {profile?.photoURL || user?.photoURL ? (
                                                     <img src={profile?.photoURL || user?.photoURL || undefined} alt="" className="w-full h-full object-cover" />
                                                 ) : (
                                                     <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 bg-slate-100 dark:bg-gray-850">
                                                         {profile?.displayName?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || "?"}
                                                     </div>
                                                 )}
                                             </div>
                                        </div>
                                        <div className="flex-1 relative">
                                            <textarea
                                                ref={inputRef}
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                placeholder={placeholder}
                                                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-1.5 resize-none min-h-[40px] max-h-[120px] font-medium placeholder:text-gray-400 dark:text-gray-300"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        if (window.innerWidth > 640) {
                                                            e.preventDefault();
                                                            handleSubmit();
                                                        }
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[9px] font-bold text-gray-400">Shift + Enter for new line</span>
                                                <button
                                                    type="submit"
                                                    disabled={!text.trim() || isSubmitting}
                                                    className={`p-2 rounded-xl transition-all ${
                                                        text.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                    } disabled:opacity-50`}
                                                >
                                                    <Send size={14} className={isSubmitting ? 'animate-pulse' : ''} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                                        Sign in to join the conversation.
                                    </p>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Link 
                                            href="/login" 
                                            className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-center"
                                        >
                                            Log In
                                        </Link>
                                        <Link 
                                            href="/signup" 
                                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center border border-gray-200/50 dark:border-gray-700/50"
                                        >
                                            Register
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </Portal>
    );
}

