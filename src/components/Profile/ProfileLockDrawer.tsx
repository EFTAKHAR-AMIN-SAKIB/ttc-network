"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    X,
    Shield,
    Lock,
    Unlock,
    Camera,
    Phone,
    BookOpen,
    Users,
    Building2,
    Check,
    Loader2,
    Info,
    Award
} from "lucide-react";
import type { ProfileLockSettings, UserProfile } from "@/contexts/AuthContext";
import { DEFAULT_LOCK_SETTINGS, LOCK_PRESETS, updateProfileLockSettings } from "@/lib/profilePrivacy";
import { useToast } from "@/contexts/ToastContext";

interface ProfileLockDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile | null;
    onSaved?: (newSettings: ProfileLockSettings) => void;
}

export function ProfileLockDrawer({
    isOpen,
    onClose,
    profile,
    onSaved
}: ProfileLockDrawerProps) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);

    // Initialize local state from profile lockSettings or defaults
    const [settings, setSettings] = useState<ProfileLockSettings>(() => ({
        ...DEFAULT_LOCK_SETTINGS,
        ...(profile?.lockSettings || {}),
    }));

    // Detect preset whenever settings change
    const [activePreset, setActivePreset] = useState<"facebookStrict" | "academicResume" | "custom">("custom");

    useEffect(() => {
        if (profile?.lockSettings) {
            setSettings({
                ...DEFAULT_LOCK_SETTINGS,
                ...profile.lockSettings,
            });
        }
    }, [profile?.lockSettings]);

    // Re-sync when drawer opens or profile changes
    useEffect(() => {
        if (isOpen) {
            const current = {
                ...DEFAULT_LOCK_SETTINGS,
                ...(profile?.lockSettings || {}),
            };
            setSettings(current);

            const isCredsLocked = current.hideCredentials !== undefined 
                ? current.hideCredentials 
                : Boolean(current.hideAcademicDetails);

            // Determine if matches a preset (lockForEveryone must be false for presets)
            const isLockForEveryoneOff = !current.lockForEveryone;
            if (current.isLocked && current.avatarGuard && current.hideContactInfo && current.hideActivityFeed && isCredsLocked && current.hideFollowersList && !current.allowCollegePeers && isLockForEveryoneOff) {
                setActivePreset("facebookStrict");
            } else if (current.isLocked && current.avatarGuard && current.hideContactInfo && current.hideActivityFeed && !isCredsLocked && current.hideFollowersList && current.allowCollegePeers && isLockForEveryoneOff) {
                setActivePreset("academicResume");
            } else {
                setActivePreset("custom");
            }
        }
    }, [isOpen, profile?.lockSettings]);

    const handleApplyPreset = (presetKey: "facebookStrict" | "academicResume") => {
        const preset = LOCK_PRESETS[presetKey];
        if (preset) {
            setSettings(prev => ({
                ...prev,
                ...preset.settings
            }));
            setActivePreset(presetKey);
            showToast(`Applied ${preset.name}`, "info");
        }
    };

    const handleToggleSetting = (key: keyof ProfileLockSettings) => {
        setSettings(prev => {
            const next = {
                ...prev,
                [key]: !prev[key]
            };
            setActivePreset("custom");
            return next;
        });
    };

    const handleSave = async () => {
        if (!profile?.uid) return;
        setSaving(true);
        try {
            await updateProfileLockSettings(profile.uid, settings);
            showToast(
                settings.isLocked 
                    ? "Profile Lock enabled with your custom privacy rules!" 
                    : "Profile Lock disabled. Profile is now public.", 
                "success"
            );
            if (onSaved) onSaved(settings);
            onClose();
        } catch (err) {
            console.error("Failed to update profile lock settings:", err);
            showToast("Failed to save lock settings. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !profile) return null;

    return (
        <div className="fixed inset-0 z-[120] overflow-hidden">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Slide-over Drawer / Mobile Sheet (Full width on mobile, max-w-lg on desktop) */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full sm:w-auto">
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="w-full sm:w-screen sm:max-w-lg bg-white dark:bg-[#0f1015] border-l-0 sm:border-l border-slate-200 dark:border-gray-800 shadow-2xl flex flex-col justify-between overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-900/40">
                        {/* Mobile grab handle */}
                        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mb-2.5 sm:hidden" />
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm shrink-0">
                                    <Shield className="w-5 h-5 stroke-[2.3]" />
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-base font-bold text-navy-950 dark:text-white tracking-tight">
                                        Profile Lock & Privacy
                                    </h2>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                        Control what other users and strangers can see
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain pb-16 sm:pb-8">
                        
                        {/* 1. HERO MASTER SWITCH */}
                        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all ${
                            settings.isLocked
                                ? "bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-blue-50/20 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent border-blue-500/40 shadow-xs"
                                : "bg-slate-50 dark:bg-gray-900/50 border-slate-200 dark:border-gray-800"
                        }`}>
                            <div className="flex items-center justify-between gap-3 sm:gap-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className={`p-2.5 rounded-2xl shrink-0 transition-colors ${
                                        settings.isLocked 
                                            ? "bg-blue-600 text-white shadow-sm" 
                                            : "bg-slate-200 dark:bg-gray-800 text-slate-500"
                                    }`}>
                                        {settings.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm sm:text-base font-bold text-navy-950 dark:text-white">
                                                Lock Your Profile
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                settings.isLocked
                                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                                    : "bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-slate-400"
                                            }`}>
                                                {settings.isLocked ? "Active" : "Public"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            {settings.isLocked 
                                                ? "Your profile is locked. People who don't follow you cannot see your full photos, posts, or personal details."
                                                : "Your profile is public. Anyone on TTC Network can view your full photos, posts, and activities."}
                                        </p>
                                    </div>
                                </div>

                                {/* Main Toggle Switch */}
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.isLocked}
                                    onClick={() => handleToggleSetting("isLocked")}
                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        settings.isLocked ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            settings.isLocked ? "translate-x-5" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* 1.5. LOCK FOR EVERYONE SUB-TOGGLE (only when master lock is ON) */}
                        {settings.isLocked && (
                            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                                settings.lockForEveryone
                                    ? "bg-blue-50/80 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800/60 shadow-xs"
                                    : "bg-slate-50/70 dark:bg-gray-900/40 border-slate-200 dark:border-gray-800"
                            }`}>
                                <div className="flex items-center justify-between gap-3 sm:gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                                            settings.lockForEveryone
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "bg-slate-200 dark:bg-gray-800 text-slate-500"
                                        }`}>
                                            <Shield size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs sm:text-sm font-bold text-navy-950 dark:text-white">
                                                    Lock for Everyone
                                                </span>
                                                {settings.lockForEveryone && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                                        Private to All
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                {settings.lockForEveryone
                                                    ? "Your locked photos, posts, and details are hidden from everyone — even people who follow you."
                                                    : "Keep your locked details hidden from everyone, including followers and college peers."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(settings.lockForEveryone)}
                                        onClick={() => handleToggleSetting("lockForEveryone")}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            settings.lockForEveryone ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                settings.lockForEveryone ? "translate-x-5" : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Friendly explanation when active */}
                                {settings.lockForEveryone && (
                                    <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40">
                                        <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                                            Following your profile will not unlock hidden details. Only you can see your protected content.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. PRESET SHORTCUTS (Only when locked) */}
                        {settings.isLocked && (
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                                    Quick Presets
                                </label>
                                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset("facebookStrict")}
                                        className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                                            activePreset === "facebookStrict"
                                                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs"
                                                : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                                        }`}
                                    >
                                        <div className="text-xs font-bold flex items-center justify-between">
                                            <span>Facebook Strict</span>
                                            {activePreset === "facebookStrict" && <Check size={14} className="text-blue-600 shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Total lockdown to followers only
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset("academicResume")}
                                        className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                                            activePreset === "academicResume"
                                                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs"
                                                : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                                        }`}
                                    >
                                        <div className="text-xs font-bold flex items-center justify-between">
                                            <span>Academic Resume</span>
                                            {activePreset === "academicResume" && <Check size={14} className="text-blue-600 shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Public credentials, private feed
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. GRANULAR CUSTOMIZATION ACCORDION */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Customize Protection Rules
                                </label>
                                {!settings.isLocked && (
                                    <span className="text-[10px] text-amber-500 font-bold">
                                        Enable Lock to activate
                                    </span>
                                )}
                            </div>

                            <div className={`space-y-2.5 transition-opacity ${settings.isLocked ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                                
                                {/* Option 1: Avatar & Cover Guard */}
                                <div 
                                    onClick={() => settings.isLocked && handleToggleSetting("avatarGuard")}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] transition-all select-none"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0">
                                            <Camera size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white">
                                                Profile Picture & Cover Guard
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                Prevents downloading or full-size photo viewing, and shows the shield badge.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        settings.avatarGuard ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            settings.avatarGuard ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                                {/* Option 2: Contact Info */}
                                <div 
                                    onClick={() => settings.isLocked && handleToggleSetting("hideContactInfo")}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] transition-all select-none"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white">
                                                Contact & Communication Lock
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                Hides your direct phone number, WhatsApp, and email from non-followers.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        settings.hideContactInfo ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            settings.hideContactInfo ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                                {/* Option 3: Activities & Feed */}
                                <div 
                                    onClick={() => settings.isLocked && handleToggleSetting("hideActivityFeed")}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] transition-all select-none"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white">
                                                Posts, Stories & Timeline Feed
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                Hides your timeline posts, stories, and activity stream from non-followers.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        settings.hideActivityFeed ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            settings.hideActivityFeed ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                                {/* Option 4: Credentials & Certificates */}
                                <div 
                                    onClick={() => settings.isLocked && handleToggleSetting("hideCredentials")}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] transition-all select-none"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                                            <Award size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white">
                                                Credentials, Certificates & Badges
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                Hides your verified badges, certificates, and achievements from strangers.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        (settings.hideCredentials !== undefined ? settings.hideCredentials : Boolean(settings.hideAcademicDetails)) ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            (settings.hideCredentials !== undefined ? settings.hideCredentials : Boolean(settings.hideAcademicDetails)) ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                                {/* Option 5: Followers List */}
                                <div 
                                    onClick={() => settings.isLocked && handleToggleSetting("hideFollowersList")}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 active:scale-[0.99] transition-all select-none"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                                            <Users size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white">
                                                Followers & Following List
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                Blocks non-followers from browsing your followers and following lists.
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        settings.hideFollowersList ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            settings.hideFollowersList ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                                {/* Special TTC Option: College Peer Access */}
                                <div 
                                    onClick={() => settings.isLocked && !settings.lockForEveryone && handleToggleSetting("allowCollegePeers")}
                                    className={`p-3.5 sm:p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-3 sm:gap-4 transition-all select-none ${
                                        settings.lockForEveryone 
                                            ? "opacity-50 cursor-not-allowed" 
                                            : "cursor-pointer hover:border-blue-300 active:scale-[0.99]"
                                    }`}
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                                            <Building2 size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-navy-950 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                <span>College Peer Access</span>
                                                {settings.lockForEveryone ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Disabled</span>
                                                ) : (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">TTC Exclusive</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                                {settings.lockForEveryone
                                                    ? "Disabled because Lock for Everyone is active. College peers cannot view your locked content."
                                                    : "Allow verified classmates and teachers from your college to view your profile without following."
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        settings.lockForEveryone 
                                            ? "bg-slate-200 dark:bg-gray-800 opacity-60"
                                            : settings.allowCollegePeers ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-700"
                                    }`}>
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                            !settings.lockForEveryone && settings.allowCollegePeers ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* Footer Actions (Optimized for Mobile with Safe Area Inset) */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-gray-800 bg-white/95 dark:bg-[#0f1015]/95 backdrop-blur-md flex items-center justify-between gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSave}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Shield size={16} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
