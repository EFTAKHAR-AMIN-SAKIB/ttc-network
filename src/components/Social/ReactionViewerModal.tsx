"use client";

import React, { useState, useEffect } from "react";
import { X, User, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getProfilesByIds, type FirestoreUser } from "@/lib/firestore";

interface ReactionViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    reactedBy: { [key: string]: string[] } | undefined;
}

// Emoji-based config for all reaction types (new + legacy)
const REACTION_CONFIG: Record<string, { emoji: string, label: string, color: string }> = {
    love: { emoji: "❤️", label: "Love", color: "text-red-500" },
    relatable: { emoji: "🤝", label: "Relatable", color: "text-purple-500" },
    respect: { emoji: "🫡", label: "Respect", color: "text-blue-500" },
    cry: { emoji: "😢", label: "Cry", color: "text-cyan-500" },
    angry: { emoji: "😡", label: "Angry", color: "text-orange-500" },
    // Legacy backward-compat
    inspired: { emoji: "❤️", label: "Love", color: "text-red-500" },
    fire: { emoji: "😡", label: "Angry", color: "text-orange-500" },
    powerful: { emoji: "😡", label: "Angry", color: "text-orange-500" },
    insightful: { emoji: "🫡", label: "Respect", color: "text-blue-500" },
    clap: { emoji: "🫡", label: "Respect", color: "text-blue-500" },
    wow: { emoji: "🤝", label: "Relatable", color: "text-purple-500" },
};

export default function ReactionViewerModal({ isOpen, onClose, reactedBy }: ReactionViewerModalProps) {
    const [activeTab, setActiveTab] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<(FirestoreUser & { id: string })[]>([]);

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

    if (!isOpen) return null;

    // Get available reaction types from the data
    const availableReactions = Object.keys(reactedBy || {}).filter(k => (reactedBy?.[k]?.length || 0) > 0);
    
    // Total count
    const totalCount = Object.values(reactedBy || {}).flat().length;

    // Filter profiles based on selected tab
    const filteredProfiles = activeTab === "all" 
        ? profiles 
        : profiles.filter(p => reactedBy?.[activeTab]?.includes(p.id));

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#121218] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[80vh]"
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
                        const count = reactedBy?.[key]?.length || 0;
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
                                    for (const key of availableReactions) {
                                        if (reactedBy?.[key]?.includes(user.id)) {
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
    );
}
