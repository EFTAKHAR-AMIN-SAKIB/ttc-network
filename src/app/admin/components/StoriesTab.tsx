"use client";

import { useState, useEffect } from "react";
import { 
    Trash2, 
    Loader2, 
    Check, 
    X,
    ShieldCheck,
    Eye,
    Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    getPendingStories, 
    getPublishedStories, 
    approveStory, 
    rejectStory, 
    deleteStory,
    type FirestoreStory
} from "@/lib/firestore";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function StoriesTab({ profile, onCountRefresh }: { profile: UserProfile; onCountRefresh?: () => void }) {
    const [stories, setStories] = useState<(FirestoreStory & { id: string })[]>([]);
    const [filter, setFilter] = useState<"pending" | "published" | "all">("pending");
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const loadStories = async () => {
        setLoading(true);
        try {
            const userProfile = profile;
            const isAdminOrSuper = userProfile.role === "admin" || userProfile.role === "super_manager";

            const [pending, published] = await Promise.all([
                getPendingStories(),
                getPublishedStories(),
            ]);
            
            const allFetched = [...pending, ...published];
            if (isAdminOrSuper) {
                setStories(allFetched);
            } else {
                setStories(allFetched.filter(s => s.collegeId === userProfile.collegeId));
            }
        } catch (err) {
            console.error("Failed to load stories:", err);
        }
        setLoading(false);
    };

    useEffect(() => { 
        loadStories(); 
    }, []);

    const handleApprove = async (storyId: string) => {
        try {
            await approveStory(storyId);
            showToast("✅ Story published!", "success");
            loadStories();
            onCountRefresh?.();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`, "error");
        }
    };

    const handleReject = async () => {
        if (!rejectId || !rejectReason.trim()) return;
        try {
            await rejectStory(rejectId, rejectReason);
            showToast("Story rejected. Author notified.", "info");
            setRejectId(null);
            setRejectReason("");
            loadStories();
            onCountRefresh?.();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`, "error");
        }
    };

    const handleDelete = async (postId: string) => {
        const confirmed = await confirm({
            title: "Delete Story",
            message: "Are you sure you want to permanently delete this story? It will be removed from all feeds.",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await deleteStory(postId);
            showToast("✅ Story deleted!", "success");
            loadStories();
            onCountRefresh?.();
        } catch {
            showToast("❌ Failed to delete story.", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const filteredStories = stories.filter(s => {
        if (filter === "all") return true;
        return s.status === filter;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-xs font-black tracking-[0.2em] uppercase">Curating Stories...</p>
        </div>
    );

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-primary w-8 h-8" />
                        Story Moderation
                    </h2>
                    <p className="text-sm text-gray-500 font-medium max-w-md">Review deep-stories and professional journeys from across our network.</p>
                </div>

                <div className="w-full sm:w-fit grid grid-cols-3 sm:flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl">
                    {(["pending", "published", "all"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`py-2.5 sm:py-2.5 px-3 sm:px-6 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center ${
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStories.map((story) => (
                    <motion.div 
                        key={story.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800/40 rounded-[2rem] sm:rounded-[3rem] border border-gray-100 dark:border-gray-700 flex flex-col group overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                    >
                        <div className="p-6 sm:p-8 pb-4 flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className={`px-3 sm:px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                                    story.status === "published" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                }`}>
                                    {story.status}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Star className="text-amber-400 fill-amber-400" size={14} />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{story.college}</span>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-primary transition-colors">{story.title}</h4>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-4">By {story.name} · {story.role}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed italic">&ldquo;{story.preview}&rdquo;</p>
                            </div>
                        </div>

                        <div className="p-5 sm:p-8 pt-4 bg-gray-50/50 dark:bg-black/20 mt-auto border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewId(story.id)}
                                    className="px-3.5 sm:px-4 py-2.5 sm:py-2 bg-white dark:bg-gray-800 text-xs font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                                >
                                    <Eye size={14} /> Preview
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {story.status === "pending" && (
                                    <>
                                        <button 
                                            onClick={() => handleApprove(story.id)}
                                            className="p-2.5 sm:p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 active:bg-emerald-600 active:text-white hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95"
                                            title="Publish story"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setRejectId(story.id)}
                                            className="p-2.5 sm:p-3.5 rounded-2xl bg-amber-50 text-amber-600 active:bg-amber-600 active:text-white hover:bg-amber-600 hover:text-white transition-all transform active:scale-95"
                                            title="Reject & Notify Author"
                                        >
                                            <X size={18} />
                                        </button>
                                    </>
                                )}
                                <button 
                                    onClick={() => handleDelete(story.id)}
                                    className="p-2.5 sm:p-3.5 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all transform active:scale-95"
                                    title="Delete story"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewId && (
                    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-12 border border-white/10"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto sm:hidden mb-4" />

                            <div className="flex justify-between items-start mb-6 sm:mb-10">
                                <div className="space-y-2">
                                    <span className="bg-primary/10 text-primary px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Global Story Preview</span>
                                    <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic">&ldquo;{stories.find(s => s.id === previewId)?.title}&rdquo;</h2>
                                </div>
                                <button onClick={() => setPreviewId(null)} className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl sm:rounded-[2rem] hover:bg-red-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="prose prose-indigo dark:prose-invert max-w-none">
                                <p className="text-base sm:text-lg leading-relaxed sm:leading-loose text-gray-600 dark:text-gray-300 font-medium">{stories.find(s => s.id === previewId)?.fullStory}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reject Reason Modal */}
            <AnimatePresence>
                {rejectId && (
                    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-6 sm:p-10 shadow-2xl"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto sm:hidden mb-4" />

                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3 sm:mb-6 uppercase tracking-tight">Rejection Feedback</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">The author will be notified with this message.</p>
                            <textarea 
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 transition-all font-medium min-h-[130px]"
                                placeholder="Tell the author why this story was rejected..."
                            />
                            <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                                <button 
                                    onClick={() => { setRejectId(null); setRejectReason(""); }}
                                    className="flex-1 py-3.5 sm:py-4 bg-gray-100 dark:bg-gray-800 text-xs font-black uppercase tracking-widest rounded-2xl sm:rounded-3xl"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleReject}
                                    className="flex-1 py-3.5 sm:py-4 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl sm:rounded-3xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
