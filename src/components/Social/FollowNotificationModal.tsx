"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Bell, BellRing, BellOff, Sliders, Check, 
    Calendar, BarChart2, BookOpen, Zap, FileText,
    Sparkles, ShieldCheck, Loader2
} from "lucide-react";
import { 
    type FollowNotificationSettings, 
    DEFAULT_FOLLOW_NOTIFICATION_SETTINGS,
    updateFollowNotificationSettings 
} from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";

interface FollowNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUserId: string;
    targetUsername: string;
    targetDisplayName: string;
    currentUserId: string;
    initialSettings?: FollowNotificationSettings;
    onSettingsUpdated?: (newSettings: FollowNotificationSettings) => void;
}

interface NotificationCategoryConfig {
    id: keyof Omit<FollowNotificationSettings, "mode">;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgLight: string;
    bgDark: string;
}

const CATEGORIES: NotificationCategoryConfig[] = [
    {
        id: "events",
        label: "Campus & Club Events",
        description: "Alerts when they organize or host campus activities",
        icon: <Calendar size={16} />,
        color: "text-amber-500",
        bgLight: "bg-amber-500/10",
        bgDark: "dark:bg-amber-500/20"
    },
    {
        id: "polls",
        label: "Campus Polls & Debates",
        description: "Alerts when they create a poll or campus survey",
        icon: <BarChart2 size={16} />,
        color: "text-violet-500",
        bgLight: "bg-violet-500/10",
        bgDark: "dark:bg-violet-500/20"
    },
    {
        id: "posts",
        label: "Feed Posts & Discussions",
        description: "Standard campus updates, photos, and shares",
        icon: <FileText size={16} />,
        color: "text-blue-500",
        bgLight: "bg-blue-500/10",
        bgDark: "dark:bg-blue-500/20"
    },
    {
        id: "studies",
        label: "Study Materials & Notes",
        description: "Academic notes, question banks, and study guides",
        icon: <BookOpen size={16} />,
        color: "text-emerald-500",
        bgLight: "bg-emerald-500/10",
        bgDark: "dark:bg-emerald-500/20"
    },
    {
        id: "stories",
        label: "Campus Stories",
        description: "24-hour stories and live moment updates",
        icon: <Zap size={16} />,
        color: "text-rose-500",
        bgLight: "bg-rose-500/10",
        bgDark: "dark:bg-rose-500/20"
    },
];

export default function FollowNotificationModal({
    isOpen,
    onClose,
    targetUserId,
    targetUsername,
    targetDisplayName,
    currentUserId,
    initialSettings,
    onSettingsUpdated
}: FollowNotificationModalProps) {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<FollowNotificationSettings>(
        initialSettings || DEFAULT_FOLLOW_NOTIFICATION_SETTINGS
    );
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        }
    }, [initialSettings]);

    // Handle preset mode change
    const handleModeSelect = async (mode: FollowNotificationSettings["mode"]) => {
        let updated: FollowNotificationSettings;
        if (mode === "all") {
            updated = {
                mode: "all",
                posts: true,
                events: true,
                polls: true,
                stories: true,
                studies: true,
            };
        } else if (mode === "none") {
            updated = {
                ...settings,
                mode: "none",
            };
        } else {
            // custom
            updated = {
                ...settings,
                mode: "custom",
            };
        }

        setSettings(updated);
        await saveSettings(updated);
    };

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Toggle specific category in custom mode
    const handleToggleCategory = async (catId: keyof Omit<FollowNotificationSettings, "mode">) => {
        let updated: FollowNotificationSettings;
        if (settings.mode === "all") {
            // Started in 'all', toggling this category OFF
            updated = {
                ...settings,
                mode: "custom",
                [catId]: false,
            };
        } else if (settings.mode === "none") {
            // Started in 'none', toggling this category ON
            updated = {
                mode: "custom",
                posts: false,
                events: false,
                polls: false,
                stories: false,
                studies: false,
                [catId]: true,
            };
        } else {
            // Already in 'custom'
            updated = {
                ...settings,
                mode: "custom",
                [catId]: !settings[catId],
            };
        }

        setSettings(updated);
        await saveSettings(updated);
    };

    // Persist to Firestore
    const saveSettings = async (newSettings: FollowNotificationSettings) => {
        if (!currentUserId || !targetUserId) return;
        setIsSaving(true);
        try {
            await updateFollowNotificationSettings(currentUserId, targetUserId, newSettings);
            onSettingsUpdated?.(newSettings);
        } catch (err) {
            console.error("Failed to save follow notification settings:", err);
            showToast("Failed to save notification settings", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.96 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full md:max-w-md bg-white dark:bg-[#14151f] border border-gray-100 dark:border-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <BellRing size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                                    Notification Settings
                                    {isSaving && <Loader2 size={12} className="animate-spin text-primary" />}
                                </h3>
                                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate max-w-[230px]">
                                    For @{targetUsername || targetDisplayName}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        {/* Preset Mode Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                                Notification Frequency
                            </label>

                            <div className="grid grid-cols-3 gap-2">
                                {/* All Notifications */}
                                <button
                                    type="button"
                                    onClick={() => handleModeSelect("all")}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24 ${
                                        settings.mode === "all"
                                            ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10"
                                            : "border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <BellRing size={18} className={settings.mode === "all" ? "text-primary" : "text-gray-400"} />
                                        {settings.mode === "all" && (
                                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">All</p>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">Every update</p>
                                    </div>
                                </button>

                                {/* Personalized / Custom */}
                                <button
                                    type="button"
                                    onClick={() => handleModeSelect("custom")}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24 ${
                                        settings.mode === "custom"
                                            ? "border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/10"
                                            : "border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <Sliders size={18} className={settings.mode === "custom" ? "text-amber-500" : "text-gray-400"} />
                                        {settings.mode === "custom" && (
                                            <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Custom</p>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">Pick types</p>
                                    </div>
                                </button>

                                {/* Mute All */}
                                <button
                                    type="button"
                                    onClick={() => handleModeSelect("none")}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24 ${
                                        settings.mode === "none"
                                            ? "border-slate-400 bg-slate-500/10 text-slate-700 dark:text-slate-300 shadow-sm"
                                            : "border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <BellOff size={18} className={settings.mode === "none" ? "text-slate-500" : "text-gray-400"} />
                                        {settings.mode === "none" && (
                                            <div className="w-4 h-4 rounded-full bg-slate-500 text-white flex items-center justify-center">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">None</p>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">Mute alerts</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Granular Categories List */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Notify Me For:
                                </label>
                                {settings.mode !== "custom" && (
                                    <span className="text-[10px] font-semibold text-gray-400">
                                        {settings.mode === "all" ? "All categories enabled" : "All muted"}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {CATEGORIES.map((cat) => {
                                    const isEnabled = settings.mode === "all" ? true : settings.mode === "none" ? false : settings[cat.id];
                                    const isCustom = settings.mode === "custom";

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => {
                                                if (settings.mode !== "custom") {
                                                    // Switching to custom automatically with this clicked
                                                    handleToggleCategory(cat.id);
                                                } else {
                                                    handleToggleCategory(cat.id);
                                                }
                                            }}
                                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                                isEnabled
                                                    ? "bg-white dark:bg-[#181924] border-gray-200/80 dark:border-gray-700/80 shadow-xs"
                                                    : "bg-gray-50/50 dark:bg-white/[0.01] border-gray-100 dark:border-gray-800/60 opacity-60 hover:opacity-100"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cat.bgLight} ${cat.bgDark} ${cat.color}`}>
                                                    {cat.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                        {cat.label}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {cat.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Modern Switch */}
                                            <div
                                                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
                                                    isEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                                                }`}
                                            >
                                                <motion.div
                                                    layout
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                                                        isEnabled ? "translate-x-5" : "translate-x-0"
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
                        <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span>Preferences save automatically</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                showToast(`Notification preferences saved for @${targetUsername || targetDisplayName}`, "success");
                                onClose();
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
