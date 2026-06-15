"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Trash2, Reply, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { addComment, deleteComment, subscribeComments } from "@/lib/firestore";
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
    contentType: "post" | "story" | "study";
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
            className={`flex gap-3 scroll-mt-24 ${comment.parentId ? 'ml-10 mt-3 pt-3 border-l-2 border-gray-100 dark:border-gray-800 pl-4' : 'mt-6'}`}
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
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl px-4 py-2.5 relative group/comment">
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
    contentType: "post" | "story" | "study";
    accentColor?: string;
    placeholder?: string;
}) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const [comments, setComments] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-gray-100 dark:border-gray-800">
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
                                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse overflow-hidden">
                                    {user?.photoURL && <img src={user.photoURL} alt="" className="w-full h-full object-cover" />}
                                 </div>
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm py-1.5 resize-none min-h-[40px] max-h-[200px] font-medium placeholder:text-gray-400 dark:text-gray-200"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
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
                                href="/register" 
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
