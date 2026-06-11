"use client";

import { useState, useMemo } from "react";
import type { ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Camera, ImageIcon, AtSign, GraduationCap, BookText, Briefcase,
    Mail, Phone, Globe, Facebook, Target, Award, Quote, Shield,
    ChevronDown, Sparkles, Pencil, CheckCircle2
} from "lucide-react";
import type { UserProfile } from "@/contexts/AuthContext";

// ═══════════════════════════════════════════════════
//  COMPLETION ENGINE
// ═══════════════════════════════════════════════════

interface FieldDef {
    key: string;
    label: string;
    labelBn: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    category: "essential" | "academic" | "contact" | "enrichment";
    weight: number;
    check: (p: UserProfile) => boolean;
}

const PROFILE_FIELDS: FieldDef[] = [
    // Essential Identity — 8pts each (32 total)
    {
        key: "displayName", label: "Display Name", labelBn: "নাম", icon: User,
        category: "essential", weight: 8,
        check: (p) => !!(p.displayName && p.displayName.trim() && p.displayName !== "TTC User"),
    },
    {
        key: "username", label: "Username", labelBn: "ইউজারনেম", icon: AtSign,
        category: "essential", weight: 8,
        check: (p) => !!(p.username && p.username.trim().length >= 3),
    },
    {
        key: "photoURL", label: "Profile Photo", labelBn: "প্রোফাইল ছবি", icon: Camera,
        category: "essential", weight: 8,
        check: (p) => !!(p.photoURL && p.photoURL.trim()),
    },
    {
        key: "bannerURL", label: "Cover Banner", labelBn: "কভার ব্যানার", icon: ImageIcon,
        category: "essential", weight: 8,
        check: (p) => !!(p.bannerURL && p.bannerURL.trim()),
    },

    // Academic & Professional — 7pts each (28 total)
    {
        key: "collegeId", label: "College", labelBn: "কলেজ", icon: GraduationCap,
        category: "academic", weight: 7,
        check: (p) => !!(p.collegeId && p.collegeId.trim()),
    },
    {
        key: "academicYear", label: "Year & Semester", labelBn: "বর্ষ ও সেমিস্টার", icon: BookText,
        category: "academic", weight: 7,
        check: (p) => !!(p.year && p.year.trim() && p.semester && p.semester.trim()),
    },
    {
        key: "bio", label: "Bio / About", labelBn: "বায়ো", icon: User,
        category: "academic", weight: 7,
        check: (p) => !!(p.bio && p.bio.trim().length >= 10),
    },
    {
        key: "industry", label: "Specialization", labelBn: "বিশেষীকরণ", icon: Briefcase,
        category: "academic", weight: 7,
        check: (p) => !!(p.industry && p.industry.trim()),
    },

    // Contact & Social — 5pts each (20 total)
    {
        key: "publicEmail", label: "Public Email", labelBn: "ইমেইল", icon: Mail,
        category: "contact", weight: 5,
        check: (p) => !!(p.publicEmail && p.publicEmail.trim()),
    },
    {
        key: "phone", label: "Phone / WhatsApp", labelBn: "ফোন নম্বর", icon: Phone,
        category: "contact", weight: 5,
        check: (p) => !!((p.phone && p.phone.trim()) || (p.whatsapp && p.whatsapp.trim())),
    },
    {
        key: "facebook", label: "Facebook", labelBn: "ফেসবুক", icon: Facebook,
        category: "contact", weight: 5,
        check: (p) => !!(p.facebook && p.facebook.trim()),
    },
    {
        key: "website", label: "Website / Portfolio", labelBn: "ওয়েবসাইট", icon: Globe,
        category: "contact", weight: 5,
        check: (p) => !!(p.website && p.website.trim()),
    },

    // Enrichment — 5pts each (20 total)
    {
        key: "skills", label: "Skills / Competencies", labelBn: "দক্ষতা", icon: Award,
        category: "enrichment", weight: 5,
        check: (p) => !!(p.skills && p.skills.length > 0),
    },
    {
        key: "positions", label: "Positions & Roles", labelBn: "পদ ও ভূমিকা", icon: Shield,
        category: "enrichment", weight: 5,
        check: (p) => !!(p.positions && p.positions.length > 0),
    },
    {
        key: "goals", label: "Future Ambitions", labelBn: "ভবিষ্যৎ লক্ষ্য", icon: Target,
        category: "enrichment", weight: 5,
        check: (p) => !!(p.goals && p.goals.trim().length >= 5),
    },
    {
        key: "favoriteQuote", label: "Favorite Quote", labelBn: "প্রিয় উক্তি", icon: Quote,
        category: "enrichment", weight: 5,
        check: (p) => !!(p.favoriteQuote && p.favoriteQuote.trim()),
    },
];

interface CompletionResult {
    percentage: number;
    score: number;
    maxScore: number;
    level: string;
    label: string;
    emoji: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    strokeColor: string;
    bgClass: string;
    completedFields: FieldDef[];
    missingFields: FieldDef[];
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

    // Determine level
    let level: string, label: string, emoji: string, color: string;
    let gradientFrom: string, gradientTo: string, strokeColor: string, bgClass: string;

    if (percentage <= 25) {
        level = "newcomer";
        label = "Newcomer";
        emoji = "🌱";
        color = "text-rose-500";
        gradientFrom = "from-rose-500/10";
        gradientTo = "to-rose-600/5";
        strokeColor = "#f43f5e";
        bgClass = "bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/10 border-rose-200/60 dark:border-rose-800/40";
    } else if (percentage <= 50) {
        level = "growing";
        label = "Growing";
        emoji = "🌿";
        color = "text-amber-500";
        gradientFrom = "from-amber-500/10";
        gradientTo = "to-orange-500/5";
        strokeColor = "#f59e0b";
        bgClass = "bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-900/10 border-amber-200/60 dark:border-amber-800/40";
    } else if (percentage <= 75) {
        level = "established";
        label = "Established";
        emoji = "⭐";
        color = "text-primary";
        gradientFrom = "from-blue-500/10";
        gradientTo = "to-indigo-500/5";
        strokeColor = "#1A56DB";
        bgClass = "bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-900/10 border-blue-200/60 dark:border-blue-800/40";
    } else if (percentage < 100) {
        level = "almost";
        label = "Almost There!";
        emoji = "🔥";
        color = "text-emerald-500";
        gradientFrom = "from-emerald-500/10";
        gradientTo = "to-teal-500/5";
        strokeColor = "#10b981";
        bgClass = "bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-900/10 border-emerald-200/60 dark:border-emerald-800/40";
    } else {
        level = "complete";
        label = "Profile Complete";
        emoji = "✨";
        color = "text-green-500";
        gradientFrom = "from-green-500/10";
        gradientTo = "to-emerald-500/5";
        strokeColor = "#22c55e";
        bgClass = "bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-900/10 border-green-200/60 dark:border-green-800/40";
    }

    return {
        percentage, score, maxScore, level, label, emoji, color,
        gradientFrom, gradientTo, strokeColor, bgClass,
        completedFields, missingFields,
    };
}

// ═══════════════════════════════════════════════════
//  CIRCULAR PROGRESS RING (SVG)
// ═══════════════════════════════════════════════════

function CircularProgressRing({ 
    percentage, 
    strokeColor, 
    size = 120, 
    strokeWidth = 8 
}: { 
    percentage: number; 
    strokeColor: string; 
    size?: number; 
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200/50 dark:text-gray-700/50"
                />
                {/* Progress arc */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-2xl font-black text-navy-900 dark:text-white tabular-nums"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                >
                    {percentage}%
                </motion.span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
//  SPARKLE PARTICLES (100% celebration)
// ═══════════════════════════════════════════════════

function SparkleParticles() {
    const particles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        size: 3 + Math.random() * 4,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        y: [0, -20, -40],
                    }}
                    transition={{
                        duration: 2,
                        delay: p.delay,
                        repeat: Infinity,
                        repeatDelay: 3,
                    }}
                >
                    <Sparkles
                        size={p.size}
                        className="text-yellow-400 dark:text-yellow-300"
                    />
                </motion.div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════
//  MISSING FIELD ITEM
// ═══════════════════════════════════════════════════

function MissingFieldItem({ field, onEdit }: { field: FieldDef; onEdit: (fieldKey?: string) => void }) {
    const Icon = field.icon;
    const categoryColors: Record<string, string> = {
        essential: "bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400",
        academic: "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400",
        contact: "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400",
        enrichment: "bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400",
    };

    return (
        <motion.button
            onClick={() => onEdit(field.key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/50 transition-all group text-left"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[field.category] || ""}`}>
                <Icon size={13} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300 truncate">
                    {field.label}
                </div>
                <div className="text-[9px] font-medium text-gray-400 dark:text-gray-500 truncate">
                    {field.labelBn}
                </div>
            </div>
            <div className="p-1 rounded-lg text-gray-300 group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
                <Pencil size={10} />
            </div>
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════
//  DESKTOP CARD (Left Sidebar)
// ═══════════════════════════════════════════════════

export function ProfileCompletionCard({ 
    profile, 
    onEditProfile 
}: { 
    profile: UserProfile; 
    onEditProfile: (fieldKey?: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);

    const { percentage, label, emoji, color, bgClass, strokeColor, missingFields, level } = completion;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`relative border-2 rounded-[2.5rem] p-6 sm:p-8 shadow-sm overflow-hidden ${bgClass}`}
        >
            {/* Sparkle particles for 100% */}
            {level === "complete" && <SparkleParticles />}

            {/* Decorative background icon */}
            <div className="absolute -top-4 -right-4 opacity-[0.04] pointer-events-none">
                <Sparkles size={100} />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className={`p-1.5 rounded-xl ${color} bg-current/10`}>
                    <Sparkles size={14} className={color} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                    Profile Strength
                </h4>
            </div>

            {/* Circular Ring + Info */}
            <div className="flex flex-col items-center gap-4 relative z-10">
                <CircularProgressRing
                    percentage={percentage}
                    strokeColor={strokeColor}
                    size={110}
                    strokeWidth={7}
                />

                {/* Level label */}
                <div className="text-center">
                    <div className={`text-sm font-black ${color}`}>
                        {emoji} {label}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                        {completion.completedFields.length} / {PROFILE_FIELDS.length} fields completed
                    </div>
                </div>

                {/* Category breakdown dots */}
                <div className="flex items-center gap-3 mt-1">
                    {(["essential", "academic", "contact", "enrichment"] as const).map((cat) => {
                        const catFields = PROFILE_FIELDS.filter(f => f.category === cat);
                        const catCompleted = catFields.filter(f => f.check(profile)).length;
                        const catPercent = catFields.length > 0 ? (catCompleted / catFields.length) * 100 : 0;
                        const catColors: Record<string, string> = {
                            essential: "bg-rose-400",
                            academic: "bg-blue-400",
                            contact: "bg-emerald-400",
                            enrichment: "bg-amber-400",
                        };
                        return (
                            <div key={cat} className="flex flex-col items-center gap-1" title={`${cat}: ${catCompleted}/${catFields.length}`}>
                                <div className="w-8 h-1.5 rounded-full bg-gray-200/60 dark:bg-gray-700/40 overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${catColors[cat]}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${catPercent}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Missing fields section */}
            {missingFields.length > 0 && (
                <div className="mt-6 relative z-10">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between py-2 px-1 group"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                            {missingFields.length} missing {missingFields.length === 1 ? "field" : "fields"}
                        </span>
                        <motion.div
                            animate={{ rotate: expanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown size={14} className="text-gray-400" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-0.5 pt-2 max-h-[280px] overflow-y-auto no-scrollbar">
                                    {missingFields.map((field) => (
                                        <MissingFieldItem
                                            key={field.key}
                                            field={field}
                                            onEdit={onEditProfile}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Complete state CTA */}
            {missingFields.length === 0 && (
                <motion.div
                    className="mt-6 text-center relative z-10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                >
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-green-500/10 dark:bg-green-500/5 border border-green-200/40 dark:border-green-800/30">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                            Fully optimized profile
                        </span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════
//  MOBILE BAR (Compact horizontal strip)
// ═══════════════════════════════════════════════════

export function ProfileCompletionBar({ 
    profile, 
    onEditProfile 
}: { 
    profile: UserProfile; 
    onEditProfile: (fieldKey?: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);

    const { percentage, label, emoji, color, strokeColor, missingFields, level } = completion;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
        >
            {/* Main strip */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-4 p-4 text-left group"
            >
                {/* Mini circular indicator */}
                <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
                    <svg width={40} height={40} className="-rotate-90">
                        <circle
                            cx={20} cy={20} r={16}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={4}
                            className="text-gray-200/50 dark:text-gray-700/50"
                        />
                        <motion.circle
                            cx={20} cy={20} r={16}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={4}
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 16}
                            initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 16 - (percentage / 100) * 2 * Math.PI * 16 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black text-navy-900 dark:text-white tabular-nums">{percentage}%</span>
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${color}`}>
                            {emoji} {label}
                        </span>
                        {missingFields.length > 0 && (
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">
                                • {missingFields.length} left
                            </span>
                        )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: strokeColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                        />
                    </div>
                </div>

                {/* Expand arrow */}
                {missingFields.length > 0 && (
                    <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400 shrink-0"
                    >
                        <ChevronDown size={16} />
                    </motion.div>
                )}

                {/* Completion badge */}
                {level === "complete" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-200/40 dark:border-green-800/30 shrink-0">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-green-600 dark:text-green-400">Complete</span>
                    </div>
                )}
            </button>

            {/* Expanded missing fields */}
            <AnimatePresence>
                {expanded && missingFields.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-slate-50 dark:border-gray-800 pt-3">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 px-1">
                                Complete these to boost your profile
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {missingFields.map((field) => (
                                    <MissingFieldItem
                                        key={field.key}
                                        field={field}
                                        onEdit={onEditProfile}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
