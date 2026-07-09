"use client";

import React, { useState, useEffect } from "react";
import { X, User, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getProfilesByIds, type FirestoreUser } from "@/lib/firestore";
import { createPortal } from "react-dom";

interface ReactionViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    reactedBy: { [key: string]: string[] } | undefined;
}

// Emoji-based config for all reaction types (new + legacy)
const REACTION_CONFIG: Record<string, { emoji: string, label: string, color: string }> = {
    love: { emoji: "❤️", label: "Love", color: "text-red-500" },
    like: { emoji: "👍", label: "Like", color: "text-blue-500" },
    haha: { emoji: "😂", label: "Haha", color: "text-yellow-500" },
    sad: { emoji: "😢", label: "Sad", color: "text-amber-500" },
    angry: { emoji: "😡", label: "Angry", color: "text-orange-600" },
    wow: { emoji: "😮", label: "Wow", color: "text-yellow-500" },
    
    // Legacy backward-compat mappings
    inspired: { emoji: "❤️", label: "Love", color: "text-red-500" },
    fire: { emoji: "😡", label: "Angry", color: "text-orange-600" },
    powerful: { emoji: "😡", label: "Angry", color: "text-orange-600" },
    clap: { emoji: "👍", label: "Like", color: "text-blue-500" },
    insightful: { emoji: "👍", label: "Like", color: "text-blue-500" },
    respect: { emoji: "😂", label: "Haha", color: "text-yellow-500" }, // respect mapped to haha
    relatable: { emoji: "👍", label: "Like", color: "text-blue-500" }, // relatable mapped to like
    relate: { emoji: "👍", label: "Like", color: "text-blue-500" }, // relate mapped to like
    cry: { emoji: "😢", label: "Sad", color: "text-amber-500" },
};

export default function ReactionViewerModal({ isOpen, onClose, reactedBy }: ReactionViewerModalProps) {
    const [activeTab, setActiveTab] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<(FirestoreUser & { id: string })[]>([]);
    const [mounted, setMounted] = useState(false);

    // Group the database reactedBy keys into the 6 active types (perfectly aligned Option 1)
    const groupedReactedBy = React.useMemo(() => {
        const grouped: Record<string, string[]> = {
            love: [],
            like: [],
            haha: [],
            sad: [],
            angry: [],
            wow: []
        };

        if (!reactedBy) return grouped;

        const keyMapping: Record<string, string> = {
            love: "love",
            inspired: "love",
            
            like: "like",
            clap: "like",
            insightful: "like",
            relatable: "like",
            relate: "like",
            wow: "like", // legacy wow key mapped to like
            
            haha: "haha",
            respect: "haha",
            
            sad: "sad",
            cry: "sad",
            
            angry: "angry",
            fire: "angry",
            powerful: "angry"
            
            // Note: Since 'wow' is now the new fresh reaction type key itself,
            // any new wow reactions are implicitly handled under the 'wow' key
        };

        Object.entries(reactedBy).forEach(([key, uids]) => {
            const targetKey = keyMapping[key] || key;
            if (Array.isArray(uids)) {
                grouped[targetKey] = Array.from(new Set([...(grouped[targetKey] || []), ...uids]));
            }
        });

        return grouped;
    }, [reactedBy]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && reactedBy) {
            const allUids = Object.values(reactedBy).flat();
            if (allUids.length > 0) {
                setLoading(true);
                getProfilesByIds(allUids).then(data => {
                    setProfiles(data);
                    setLoading(false);
                });
            } else {
                setProfiles([]);
                setLoading(false);
            }
        }
    }, [isOpen, reactedBy]);

    // Get available reaction types from the grouped data
    const availableReactions = Object.keys(groupedReactedBy).filter(k => (groupedReactedBy[k]?.length || 0) > 0);
    
    // Total count of unique reactors
    const totalCount = React.useMemo(() => {
        const allUids = Object.values(groupedReactedBy).flat();
        return new Set(allUids).size;
    }, [groupedReactedBy]);

    // Filter profiles based on selected tab
    const filteredProfiles = activeTab === "all" 
        ? profiles 
        : profiles.filter(p => groupedReactedBy[activeTab]?.includes(p.id));

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                    {/* Backdrop */}
                    <div className="absolute inset-0" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, y: "30%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "30%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="bg-white dark:bg-[#121218] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col h-[70vh] sm:h-auto max-h-[85vh] sm:max-h-[80vh] relative z-10"
                    >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Reactions</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{totalCount} People reacted</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-900 flex gap-1 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${activeTab === "all" ? "bg-slate-900 dark:bg-primary text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}
                        `}
                    >
                        All
                    </button>
                    {availableReactions.map(key => {
                        const config = REACTION_CONFIG[key];
                        if (!config) return null;
                        const count = groupedReactedBy[key]?.length || 0;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap
                                    ${activeTab === key ? "bg-slate-900 dark:bg-primary text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}
                                `}
                            >
                                <span className="text-sm">{config.emoji}</span>
                                {count}
                            </button>
                        );
                    })}
                </div>

                {/* User List */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                                        <div className="h-2 bg-gray-100 dark:bg-gray-900 rounded w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredProfiles.length > 0 ? (
                        <div className="space-y-3">
                            {filteredProfiles.map(user => {
                                // Find which reaction this user gave (for the 'all' tab)
                                let userReaction = null;
                                if (activeTab === "all") {
                                    for (const key of ["love", "like", "haha", "sad", "angry", "wow"]) {
                                        if (groupedReactedBy[key]?.includes(user.id)) {
                                            userReaction = key;
                                            break;
                                        }
                                    }
                                } else {
                                    userReaction = activeTab;
                                }

                                const config = userReaction ? REACTION_CONFIG[userReaction] : null;

                                return (
                                    <Link 
                                        key={user.id} 
                                        href={`/profile/${user.id}`}
                                        className="flex items-center justify-between group p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                                        onClick={onClose}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-navy-100 dark:bg-navy-900 flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                                                        <User size={18} className="text-navy-400" />
                                                    </div>
                                                )}
                                                {config && (
                                                    <div className="absolute -right-1 -bottom-1 bg-white dark:bg-gray-800 p-0.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[10px] leading-none">{config.emoji}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors">{user.displayName}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role} • {user.college}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <span className="text-5xl block mx-auto mb-3">🫥</span>
                            <p className="text-sm font-bold text-gray-400">No reactors to show here</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
