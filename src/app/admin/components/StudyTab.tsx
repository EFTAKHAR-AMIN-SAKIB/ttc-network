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
    Search,
    Building2,
    Shield,
    BookOpen,
    Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    getPendingStudyPosts, 
    getApprovedStudyPosts, 
    getStudyHeroSettings, 
    updateStudyHeroSettings, 
    approveStudyPost, 
    rejectStudyPost, 
    deleteStudyPost,
    type FirestoreStudyPost,
    type StudyHeroSettings
} from "@/lib/firestore";
import { useConfirm } from "@/contexts/ConfirmContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function StudyTab({ profile, onCountRefresh }: { profile: UserProfile; onCountRefresh?: () => void }) {
    const [posts, setPosts] = useState<(FirestoreStudyPost & { id: string })[]>([]);
    const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    // Hero Stats State
    const [heroSettings, setHeroSettings] = useState<StudyHeroSettings | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const isAdminOrSuper = profile.role === "admin" || profile.role === "super_manager";

            const [pending, approved, settings] = await Promise.all([
                getPendingStudyPosts(),
                getApprovedStudyPosts(),
                getStudyHeroSettings()
            ]);

            setHeroSettings(settings);

            const allFetched = [...pending, ...approved];
            if (isAdminOrSuper) {
                setPosts(allFetched);
            } else {
                setPosts(allFetched.filter(p => p.collegeId === profile.collegeId));
            }
        } catch (err) {
            console.error("Failed to load study data:", err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleSaveHeroSettings = async () => {
        if (!heroSettings) return;
        setIsSavingSettings(true);
        try {
            await updateStudyHeroSettings(heroSettings);
            setMessage("✅ Study Hero settings updated!");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`);
        }
        setIsSavingSettings(false);
    };

    const handleApprove = async (postId: string) => {
        try {
            await approveStudyPost(postId);
            setMessage("✅ Study resource approved!");
            setTimeout(() => setMessage(""), 3000);
            loadData();
            onCountRefresh?.();
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`);
        }
    };

    const handleReject = async (postId: string) => {
        try {
            await rejectStudyPost(postId);
            setMessage("Study resource rejected.");
            setTimeout(() => setMessage(""), 3000);
            loadData();
            onCountRefresh?.();
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Permanent Removal",
            message: "This resource will be removed from the shared library globally. This action cannot be undone.",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await deleteStudyPost(id);
            setMessage("Study resource permanently deleted.");
            setTimeout(() => setMessage(""), 3000);
            loadData();
            onCountRefresh?.();
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : "Unknown"}`);
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
            <p className="text-sm font-bold tracking-widest uppercase">Indexing Library...</p>
        </div>
    );

    return (
        <div className="space-y-8">
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

            {/* Hero Stats Section */}
            {profile.role === "admin" && (
                <div className="bg-white dark:bg-gray-800/40 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm border-t-4 border-t-amber-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Study Portal Oversight</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Resource Statistics</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveHeroSettings}
                            disabled={isSavingSettings}
                            className="flex items-center gap-2 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                        >
                            {isSavingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSavingSettings ? "Saving..." : "Update Stats"}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Materials", key: "materialsCount", icon: BookOpen },
                            { label: "Schedules", key: "schedulesCount", icon: Clock },
                            { label: "Members", key: "membersCount", icon: GraduationCap },
                        ].map((item) => (
                            <div key={item.key} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-gray-100 dark:border-gray-800">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block flex items-center gap-1">
                                    <item.icon size={10} /> {item.label}
                                </label>
                                <input 
                                    type="number" 
                                    value={heroSettings?.[item.key as keyof StudyHeroSettings] as number}
                                    onChange={(e) => setHeroSettings(prev => prev ? { ...prev, [item.key]: parseInt(e.target.value) || 0 } : null)}
                                    className="w-full bg-transparent border-none text-2xl font-black focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                                />
                            </div>
                        ))}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Automation</label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setHeroSettings(prev => prev ? { ...prev, autoCount: !prev.autoCount } : null)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        heroSettings?.autoCount 
                                            ? "bg-purple-500 text-white" 
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                    }`}
                                >
                                    {heroSettings?.autoCount ? "Active" : "Disabled"}
                                </button>
                                <span className="text-[9px] text-gray-400 font-bold leading-tight">Sync counts with db real-time</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <BookOpen className="text-primary" />
                        Library Management
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Verify and approve shared study resources.</p>
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
                        className="bg-white dark:bg-gray-800/50 rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-6 relative overflow-hidden group"
                    >
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    post.type === "material" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                                }`}>
                                    {post.type}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                    <Building2 size={12} />
                                    {post.collegeName}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{post.title}</h4>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.content}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {post.authorName?.[0] || "?"}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-0.5">{post.authorName}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">{post.authorRole}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 justify-end sm:justify-center flex-shrink-0">
                            {post.status === "pending" && (
                                <>
                                    <button 
                                        onClick={() => handleApprove(post.id)}
                                        className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all transform hover:scale-110"
                                        title="Approve resource"
                                    >
                                        <Check size={20} />
                                    </button>
                                    <button 
                                        onClick={() => handleReject(post.id)}
                                        className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all transform hover:scale-110"
                                        title="Reject resource"
                                    >
                                        <X size={20} />
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handleDelete(post.id)}
                                className="p-3.5 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                                title="Delete permanently"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {filteredPosts.length === 0 && (
                    <div className="text-center py-24 bg-gray-50 dark:bg-gray-800/20 rounded-[4rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-gray-400">Library Empty</h4>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 font-medium">There are no study resources currently filtered for review.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
