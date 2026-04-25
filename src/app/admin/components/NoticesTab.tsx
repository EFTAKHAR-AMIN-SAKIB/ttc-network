"use client";

import { useState, useEffect } from "react";
import { 
    Trash2, 
    Loader2, 
    AlertTriangle, 
    CheckCircle2, 
    Database,
    Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getNotices, deleteNotice, updateNotice, type FirestoreNotice } from "@/lib/firestore";
import { seedDatabaseAction } from "@/lib/actions";
import { useConfirm } from "@/contexts/ConfirmContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function NoticesTab({ profile }: { profile: UserProfile }) {
    const [notices, setNotices] = useState<(FirestoreNotice & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [seeding, setSeeding] = useState(false);
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const loadNotices = async () => {
        setLoading(true);
        try {
            const userProfile = profile;
            const isAdminOrSuper = userProfile.role === "admin" || userProfile.role === "super_manager";

            const allNotices = await getNotices();
            if (isAdminOrSuper) {
                setNotices(allNotices);
            } else {
                setNotices(allNotices.filter(n => n.collegeId === userProfile.collegeId));
            }
        } catch (err) {
            console.error("Failed to load notices:", err);
        }
        setLoading(false);
    };

    useEffect(() => { loadNotices(); }, []);

    const handleDelete = async (id: string, title: string) => {
        const confirmed = await confirm({
            title: "Delete Notice",
            message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await deleteNotice(id);
            setMessage("✅ Notice deleted successfully");
            setTimeout(() => setMessage(""), 3000);
            loadNotices();
        } catch (err) {
            setMessage("❌ Failed to delete notice");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await seedDatabaseAction("notices");
            setMessage("✅ Database seeded with notices");
            loadNotices();
        } catch (err) {
            setMessage("❌ Seeding failed");
        }
        setSeeding(false);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-bold tracking-widest uppercase">Loading Notices...</p>
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

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <Megaphone className="text-primary" />
                        Notice Management
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Create, edit, and moderate platform-wide notices.</p>
                </div>
                {profile.role === "admin" && (
                    <button 
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        <Database size={14} />
                        {seeding ? "Seeding..." : "Seed Samples"}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {notices.map((notice) => (
                    <motion.div 
                        key={notice.id}
                        layout
                        className="bg-white dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group"
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    notice.isUrgent ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                }`}>
                                    {notice.isUrgent ? "Urgent" : "Notice"}
                                </span>
                                {notice.isPinned && (
                                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                                        Pinned
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{notice.title}</h3>
                            <p className="text-xs text-gray-500 font-medium">{notice.college}</p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleDelete(notice.id, notice.title)}
                                className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </motion.div>
                ))}
                {notices.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No notices found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
