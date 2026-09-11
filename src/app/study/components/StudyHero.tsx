"use client";

import { motion } from "framer-motion";
import { Search, Plus, BookText, Video, Users, Sparkles } from "lucide-react";

interface StudyHeroProps {
    stats: {
        materials: number;
        liveSessions: number;
        members: number;
    };
    isVisible?: boolean;
    searchValue?: string;
    onSearchChange: (val: string) => void;
    onShareClick: () => void;
}

export default function StudyHero({ stats, isVisible, searchValue = "", onSearchChange, onShareClick }: StudyHeroProps) {
    return (
        <div className="relative pt-4 pb-6 sm:pt-10 sm:pb-16 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-3 sm:mb-5 border border-primary/20">
                        <Sparkles size={13} className="text-primary" /> Shared Knowledge Library
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-navy-900 dark:text-white leading-[1.15] sm:leading-[1.08] mb-3 sm:mb-4 tracking-tight">
                        Power Up Your <span className="text-primary italic">Learning</span> Journey.
                    </h1>
                    <p className="max-w-xl mx-auto text-xs sm:text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium mb-6 sm:mb-8 leading-relaxed">
                        Access shared notes, download academic materials, and join live prep classes with TTC students across Bangladesh.
                    </p>
                </motion.div>

                {/* Stats Grid - 3 columns on all screens for clean horizontal compact layout */}
                {isVisible !== false && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-5 max-w-3xl mx-auto mb-6 sm:mb-10">
                        {[
                            { icon: BookText, label: "Materials", value: stats.materials, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
                            { icon: Video, label: "Live Classes", value: stats.liveSessions, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
                            { icon: Users, label: "Active TTCs", value: stats.members, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" }
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 * (i + 1) }}
                                className="bg-white dark:bg-[#1a1b23] p-2.5 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm shadow-navy-900/5 flex flex-col items-center group hover:scale-[1.03] transition-transform"
                            >
                                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2.5 ${stat.color} group-hover:rotate-6 transition-transform shadow-xs`}>
                                    <stat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-base sm:text-2xl font-black text-navy-900 dark:text-white mb-0.5">{stat.value}+</div>
                                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 truncate max-w-full">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Action Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 max-w-2xl mx-auto"
                >
                    <div className="relative w-full sm:flex-1 group">
                        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            type="text"
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Find materials, subjects or classes..."
                            className="w-full bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 rounded-2xl pl-11 sm:pl-13 pr-9 sm:pr-10 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold outline-none transition-all shadow-sm placeholder:text-gray-400 text-gray-900 dark:text-white"
                        />
                        {searchValue && (
                            <button
                                type="button"
                                onClick={() => onSearchChange("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center text-xs transition-colors"
                                title="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={() => onShareClick()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-primary text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:shadow-lg hover:brightness-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                        <Plus size={18} /> Share Resource
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
