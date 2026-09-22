"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Camera, ImageIcon, AtSign, GraduationCap, BookText, Briefcase,
    Mail, Phone, Globe, Facebook, Target, Award, Quote, Shield,
    ChevronDown, Sparkles, Pencil, CheckCircle2, X, ChevronRight
} from "lucide-react";
import type { UserProfile } from "@/contexts/AuthContext";

// ═══════════════════════════════════════════════════
//  FIELD DEFINITIONS & COMPLETION ENGINE
// ═══════════════════════════════════════════════════

interface FieldDef {
    key: string;
    label: string;
    labelBn: string;
    icon: any;
    category: "essential" | "academic" | "contact" | "enrichment";
    weight: number;
    check: (p: UserProfile) => boolean;
}

const PROFILE_FIELDS: FieldDef[] = [
    { key: "displayName", label: "Display Name", labelBn: "নাম", icon: User, category: "essential", weight: 8, check: (p) => !!(p.displayName && p.displayName.trim() && p.displayName !== "TTC User") },
    { key: "username", label: "Username", labelBn: "ইউজারনেম", icon: AtSign, category: "essential", weight: 8, check: (p) => !!(p.username && p.username.trim().length >= 3) },
    { key: "photoURL", label: "Profile Photo", labelBn: "প্রোফাইল ছবি", icon: Camera, category: "essential", weight: 8, check: (p) => !!(p.photoURL && p.photoURL.trim()) },
    { key: "bannerURL", label: "Cover Banner", labelBn: "কভার ব্যানার", icon: ImageIcon, category: "essential", weight: 8, check: (p) => !!(p.bannerURL && p.bannerURL.trim()) },
    { key: "collegeId", label: "College", labelBn: "কলেজ", icon: GraduationCap, category: "academic", weight: 7, check: (p) => !!(p.collegeId && p.collegeId.trim()) },
    { key: "academicYear", label: "Year & Semester", labelBn: "বর্ষ ও সেমিস্টার", icon: BookText, category: "academic", weight: 7, check: (p) => !!(p.year && p.year.trim() && p.semester && p.semester.trim()) },
    { key: "bio", label: "Bio / About", labelBn: "বায়ো", icon: User, category: "academic", weight: 7, check: (p) => !!(p.bio && p.bio.trim().length >= 10) },
    { key: "industry", label: "Specialization", labelBn: "বিশেষীকরণ", icon: Briefcase, category: "academic", weight: 7, check: (p) => !!(p.industry && p.industry.trim()) },
    { key: "publicEmail", label: "Public Email", labelBn: "ইমেইল", icon: Mail, category: "contact", weight: 5, check: (p) => !!(p.publicEmail && p.publicEmail.trim()) },
    { key: "phone", label: "Phone / WhatsApp", labelBn: "ফোন নম্বর", icon: Phone, category: "contact", weight: 5, check: (p) => !!((p.phone && p.phone.trim()) || (p.whatsapp && p.whatsapp.trim())) },
    { key: "facebook", label: "Facebook", labelBn: "ফেসবুক", icon: Facebook, category: "contact", weight: 5, check: (p) => !!(p.facebook && p.facebook.trim()) },
    { key: "website", label: "Website / Portfolio", labelBn: "ওয়েবসাইট", icon: Globe, category: "contact", weight: 5, check: (p) => !!(p.website && p.website.trim()) },
    { key: "skills", label: "Skills", labelBn: "দক্ষতা", icon: Award, category: "enrichment", weight: 5, check: (p) => !!(p.skills && p.skills.length > 0) },
    { key: "positions", label: "Positions & Roles", labelBn: "পদ ও ভূমিকা", icon: Shield, category: "enrichment", weight: 5, check: (p) => !!(p.positions && p.positions.length > 0) },
    { key: "goals", label: "Future Ambitions", labelBn: "ভবিষ্যৎ লক্ষ্য", icon: Target, category: "enrichment", weight: 5, check: (p) => !!(p.goals && p.goals.trim().length >= 5) },
    { key: "favoriteQuote", label: "Favorite Quote", labelBn: "প্রিয় উক্তি", icon: Quote, category: "enrichment", weight: 5, check: (p) => !!(p.favoriteQuote && p.favoriteQuote.trim()) },
];

interface CompletionResult {
    percentage: number;
    completedFields: FieldDef[];
    missingFields: FieldDef[];
    strokeColor: string;
    barGradient: string;
    level: string;
}

function calculateProfileCompletion(profile: UserProfile): CompletionResult {
    let score = 0;
    const maxScore = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0);
    const completedFields: FieldDef[] = [];
    const missingFields: FieldDef[] = [];

    for (const field of PROFILE_FIELDS) {
        if (field.check(profile)) {
            score += field.weight;
            completedFields.push(field);
        } else {
            missingFields.push(field);
        }
    }

    const percentage = Math.round((score / maxScore) * 100);

    let strokeColor: string, barGradient: string, level: string;
    if (percentage < 25) {
        strokeColor = "#f43f5e"; barGradient = "from-rose-500 to-pink-400"; level = "newcomer";
    } else if (percentage < 50) {
        strokeColor = "#f59e0b"; barGradient = "from-amber-500 to-orange-400"; level = "growing";
    } else if (percentage < 75) {
        strokeColor = "#3b82f6"; barGradient = "from-blue-500 to-indigo-400"; level = "established";
    } else if (percentage < 100) {
        strokeColor = "#10b981"; barGradient = "from-emerald-500 to-teal-400"; level = "almost";
    } else {
        strokeColor = "#22c55e"; barGradient = "from-green-500 to-emerald-400"; level = "complete";
    }

    return { percentage, completedFields, missingFields, strokeColor, barGradient, level };
}


// ═══════════════════════════════════════════════════
//  MOBILE BAR — Slim single-line nudge
//  Design: quiet, ambient, doesn't bother the user
// ═══════════════════════════════════════════════════

export function ProfileCompletionBar({
    profile,
    onEditProfile,
    onDismiss,
}: {
    profile: UserProfile;
    onEditProfile: (fieldKey?: string) => void;
    onDismiss?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);
    const { percentage, missingFields, completedFields, strokeColor, barGradient, level } = completion;

    // If profile is complete, show a tiny celebration then auto-dismiss
    if (level === "complete") {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Profile complete</span>
                {onDismiss && (
                    <button onClick={onDismiss} className="ml-auto p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={12} />
                    </button>
                )}
            </motion.div>
        );
    }

    // Highest-value missing field for the inline nudge
    const topMissing = [...missingFields].sort((a, b) => b.weight - a.weight)[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm overflow-hidden"
        >
            {/* Slim main strip — everything in one compact row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left group"
            >
                {/* Micro ring */}
                <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
                    <svg width={28} height={28} className="-rotate-90">
                        <circle cx={14} cy={14} r={11} fill="none" stroke="currentColor" strokeWidth={3} className="text-gray-200/60 dark:text-gray-700/50" />
                        <motion.circle
                            cx={14} cy={14} r={11} fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 11}
                            initial={{ strokeDashoffset: 2 * Math.PI * 11 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 11 - (percentage / 100) * 2 * Math.PI * 11 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-black text-navy-900 dark:text-white tabular-nums">{percentage}</span>
                    </div>
                </div>

                {/* Inline text — contextual nudge */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 truncate">
                            {missingFields.length} left
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                            · Add {topMissing?.label}
                        </span>
                    </div>
                    {/* Thin progress bar */}
                    <div className="mt-1 h-[3px] w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0">
                    <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-gray-400"
                    >
                        <ChevronDown size={14} />
                    </motion.div>
                    {onDismiss && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                            role="button"
                        >
                            <X size={12} />
                        </div>
                    )}
                </div>
            </button>

            {/* Expandable missing fields */}
            <AnimatePresence>
                {expanded && missingFields.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-2.5 pt-1 border-t border-slate-100 dark:border-gray-800">
                            <div className="grid grid-cols-2 gap-1">
                                {missingFields.map((field) => {
                                    const Icon = field.icon;
                                    return (
                                        <button
                                            key={field.key}
                                            onClick={() => onEditProfile(field.key)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors text-left group/item"
                                        >
                                            <div className="w-5 h-5 rounded bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400 dark:text-gray-500 group-hover/item:text-primary transition-colors">
                                                <Icon size={11} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate">
                                                {field.label}
                                            </span>
                                            <ChevronRight size={10} className="ml-auto text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════
//  DESKTOP CARD — Compact sidebar widget
// ═══════════════════════════════════════════════════

export function ProfileCompletionCard({
    profile,
    onEditProfile,
    onDismiss,
}: {
    profile: UserProfile;
    onEditProfile: (fieldKey?: string) => void;
    onDismiss?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);
    const { percentage, missingFields, completedFields, strokeColor, barGradient, level } = completion;

    if (level === "complete") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Profile complete</span>
                    {onDismiss && (
                        <button onClick={onDismiss} className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    const topMissing = [...missingFields].sort((a, b) => b.weight - a.weight)[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-2xl sm:rounded-[2rem] p-5 shadow-sm overflow-hidden"
        >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-gray-300 dark:text-gray-600" />
                    Profile Strength
                </h4>
                {onDismiss && (
                    <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10">
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Circular ring + stats */}
            <div className="flex items-center gap-4">
                {/* Ring */}
                <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
                    <svg width={56} height={56} className="-rotate-90">
                        <circle cx={28} cy={28} r={23} fill="none" stroke="currentColor" strokeWidth={5} className="text-gray-200/50 dark:text-gray-700/50" />
                        <motion.circle
                            cx={28} cy={28} r={23} fill="none" stroke={strokeColor} strokeWidth={5} strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 23}
                            initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 23 - (percentage / 100) * 2 * Math.PI * 23 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black text-navy-900 dark:text-white tabular-nums">{percentage}%</span>
                    </div>
                </div>

                {/* Text info */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-navy-900 dark:text-gray-100">
                        {completedFields.length} of {PROFILE_FIELDS.length} complete
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {missingFields.length} {missingFields.length === 1 ? "field" : "fields"} remaining
                    </div>
                    {/* Mini bar */}
                    <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            {/* Inline suggestion */}
            {topMissing && (
                <button
                    onClick={() => onEditProfile(topMissing.key)}
                    className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-800/50 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200/60 dark:border-gray-700/60 transition-colors text-left group"
                >
                    <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <topMissing.icon size={11} />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate flex-1">
                        Add {topMissing.label}
                    </span>
                    <span className="text-[9px] font-bold text-primary shrink-0">+{topMissing.weight}%</span>
                </button>
            )}

            {/* Expandable missing list */}
            {missingFields.length > 1 && (
                <div className="mt-2">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between py-1 group"
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                            {expanded ? "Hide" : "Show"} all missing ({missingFields.length})
                        </span>
                        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
                            <ChevronDown size={12} className="text-gray-400" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-0.5 pt-1 max-h-[200px] overflow-y-auto no-scrollbar">
                                    {missingFields.map((field) => {
                                        const Icon = field.icon;
                                        return (
                                            <button
                                                key={field.key}
                                                onClick={() => onEditProfile(field.key)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors text-left group/item"
                                            >
                                                <div className="w-5 h-5 rounded bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-400 group-hover/item:text-primary transition-colors">
                                                    <Icon size={11} />
                                                </div>
                                                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate flex-1">
                                                    {field.label}
                                                </span>
                                                <Pencil size={9} className="text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}
