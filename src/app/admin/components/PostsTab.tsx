"use client";

import { useState, useEffect } from "react";
import { 
    Trash2, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Check, 
    X,
    GraduationCap,
    Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPendingPosts, getApprovedPosts, approvePost, rejectPost, deletePost, type FirestorePost } from "@/lib/firestore";
import { useConfirm } from "@/contexts/ConfirmContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function PostsTab({ profile }: { profile: UserProfile }) {
    const [posts, setPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const loadPosts = async () => {
        setLoading(true);
        try {
            const userProfile = profile;
            const isAdminOrSuper = userProfile.role === "admin" || userProfile.role === "super_manager";

            const [pending, approved] = await Promise.all([
                getPendingPosts(),
                getApprovedPosts(),
            ]);
            
            const allFetched = [...pending, ...approved];
            if (isAdminOrSuper) {
                setPosts(allFetched);
            } else {
                setPosts(allFetched.filter(p => p.collegeId === userProfile.collegeId));
            }
        } catch (err) {
            console.error("Failed to load posts:", err);
        }
        setLoading(false);
    };

    useEffect(() => { loadPosts(); }, []);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        try {
            if (action === "approve") {
                await approvePost(id);
            } else {
                await rejectPost(id);
            }
            setMessage(action === "approve" ? "✅ Post approved" : "✅ Post rejected");
            setTimeout(() => setMessage(""), 3000);
            loadPosts();
        } catch (err) {
            setMessage("❌ Action failed");
        }
    };

    const handleDelete = async (postId: string) => {
        const confirmed = await confirm({
            title: "Delete Post",
            message: "Are you sure you want to permanently delete this post? This action cannot be undone.",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await deletePost(postId);
            setMessage("✅ Post deleted successfully");
            setTimeout(() => setMessage(""), 3000);
            loadPosts();
        } catch (err) {
            setMessage("❌ Delete failed");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const filteredPosts = posts.filter(p => {
        if (filter === "all") return true;
        return p.status === filter;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-bold tracking-widest uppercase">Syncing Posts...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {message && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${
                            message.includes("❌") 
                                ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/10 dark:border-red-900/20" 
                                : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                        }`}
                    >
                        {message.includes("❌") ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <GraduationCap className="text-primary" />
                        Community Posts
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Review and moderate user-generated feed content.</p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
                    {(["pending", "approved", "all"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === f 
                                    ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredPosts.map((post) => (
                    <motion.div 
                        key={post.id}
                        layout
                        className="bg-white dark:bg-gray-800/50 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-6"
                    >
                        {post.thumbnailUrl && (
                            <div className="w-full sm:w-32 h-32 rounded-3xl overflow-hidden flex-shrink-0 border border-gray-50 dark:border-gray-700">
                                <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    post.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                }`}>
                                    {post.status}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">· {post.collegeName}</span>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{post.eventName}</h4>
                                <p className="text-sm text-gray-500 line-clamp-2">{post.description}</p>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                        {post.createdBy.name[0]}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{post.createdBy.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 justify-end sm:justify-start">
                            {post.status === "pending" && (
                                <>
                                    <button 
                                        onClick={() => handleAction(post.id, "approve")}
                                        className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                                        title="Approve post"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleAction(post.id, "reject")}
                                        className="p-3 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all"
                                        title="Reject post"
                                    >
                                        <X size={18} />
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handleDelete(post.id)}
                                className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                title="Delete post"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </motion.div>
                ))}
                {filteredPosts.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No posts to review</p>
                    </div>
                )}
            </div>
        </div>
    );
}
