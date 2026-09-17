"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Shield,
    Hammer,
    Megaphone,
    Wallet,
    Palette,
    Globe,
    Layers,
    Heart,
    Users,
    Star,
    Download,
    Search,
    ArrowUpDown,
    ChevronDown,
    Send,
    Server,
    Smartphone,
    CheckCircle2,
    Check,
    Plus,
    Copy,
    Edit,
    Save,
    BookOpen,
    Video,
    Calendar,
    Clock,
    Loader2,
    Sparkles,
    AlertTriangle,
    FileText,
    Pencil,
    ExternalLink,
    Banknote,
    Building2,
    GraduationCap,
    Linkedin,
    Github,
    type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { colleges } from "@/data/colleges";
import { getApprovedGifts, getSupportSettings, getSupportPhases, getBuilderSettings, submitGift, updateSupportSettings, type FirestoreGift, type SupportSettings, type SupportPhase, type FirestoreBuilderSettings } from "@/lib/firestore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import BuilderPopupModal from "@/components/BuilderPopupModal";

const CONFIG = {
    bkashNumber: "01805107667",
    bkashType: "Personal" as "Personal" | "Merchant",
    nagadNumber: "01805107667",
    nagadType: "Personal" as "Personal" | "Merchant",
    raised: 12500,
    supporters: "48",
    goal: 50000,
    currencySymbol: "৳"
};

/* ═══════════════════════════════════════════════════
   PREMIUM UI COMPONENTS
   ═══════════════════════════════════════════════════ */

function MeshGradient() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Ambient Radial Spotlight matching TTC Network brand */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-blue-600/[0.08] via-indigo-600/[0.04] to-transparent blur-[120px] rounded-full" />
            <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] bg-sky-400/[0.05] dark:bg-blue-500/[0.04] blur-[100px] rounded-full" />
            <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-indigo-600/[0.05] dark:bg-sky-500/[0.03] blur-[130px] rounded-full" />
            {/* Subtle micro grid dot texture */}
            <div 
                className="absolute inset-0 opacity-[0.22] dark:opacity-[0.12]" 
                style={{ 
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", 
                    backgroundSize: "28px 28px" 
                }} 
            />
        </div>
    );
}

function StatPill({ label, value, icon: Icon, delay = 0 }: { label: string, value: string | number, icon: LucideIcon, delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.6, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            className="flex items-center gap-3.5 px-5 py-3.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 rounded-2xl shadow-lg shadow-black/[0.03] hover:border-primary/40 dark:hover:border-blue-400/40 transition-all duration-300"
        >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center text-primary dark:text-blue-400 shrink-0">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
                <p className="text-lg font-black text-gray-900 dark:text-white leading-none mt-1">
                    {value}
                </p>
            </div>
        </motion.div>
    );
}

function ShimmerProgressBar({ raised, goal }: { raised: number, goal: number }) {
    const percentage = Math.min(100, Math.max(0, (raised / (goal || 1)) * 100));
    
    return (
        <div className="w-full space-y-3 p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Platform Growth Phase</p>
                </div>
                <span className="text-lg font-black text-primary dark:text-blue-400">{Math.round(percentage)}%</span>
            </div>
            <div className="h-3.5 w-full bg-gray-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-gray-200/50 dark:border-white/5 relative">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#1A56DB] via-blue-600 to-[#1D9BF0] relative rounded-full"
                >
                    <motion.div 
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
                    />
                </motion.div>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <span>Raised: <strong className="text-gray-900 dark:text-white font-black">{CONFIG.currencySymbol}{raised.toLocaleString()}</strong></span>
                <span>Target: <strong className="text-gray-900 dark:text-white font-black">{CONFIG.currencySymbol}{goal.toLocaleString()}</strong></span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONFETTI COMPONENT — Canvas-based particle system
   ═══════════════════════════════════════════════════ */
function Confetti({ active }: { active: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = [
            "#FFD700",
            "#FFA500",
            "#FF6347",
            "#E63946",
            "#1a5276",
            "#0e6655",
            "#ff69b4",
            "#00CED1",
        ];

        interface Particle {
            x: number;
            y: number;
            w: number;
            h: number;
            color: string;
            vx: number;
            vy: number;
            rotation: number;
            rotSpeed: number;
            opacity: number;
        }

        const particles: Particle[] = [];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 4,
                h: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 8,
                opacity: 1,
            });
        }

        let animId: number;
        let frame = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                if (frame > 120) p.opacity -= 0.008;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            if (frame < 300) {
                animId = requestAnimationFrame(animate);
            }
        };

        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [active]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-10"
        />
    );
}

/* ═══════════════════════════════════════════════════
   THANK YOU CARD MODAL
   ═══════════════════════════════════════════════════ */
function ThankYouCard({
    show,
    onClose,
    name,
    amount,
    date,
}: {
    show: boolean;
    onClose: () => void;
    name: string;
    amount: number;
    date: string;
}) {
    const [showConfetti, setShowConfetti] = useState(false);
    const { siteName: brandName, logoUrl: brandLogo } = useSiteSettings();

    useEffect(() => {
        if (show) {
            setShowConfetti(true);
        }
    }, [show]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <Confetti active={showConfetti} />

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotateX: 30 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                        className="relative z-20 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                        style={{ perspective: "1000px" }}
                    >
                        {/* Card */}
                        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            {/* Golden glow background */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 blur-[100px]" />
                            </div>

                            <div className="relative p-8 text-center">
                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X size={18} className="text-white/40" />
                                </button>

                                {/* TTC Network Logo area */}
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <Image
                                            src={brandLogo}
                                            alt="TTC"
                                            width={32}
                                            height={32}
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-white/70 text-sm font-bold tracking-wide">
                                        {brandName.toUpperCase()}
                                    </span>
                                </div>

                                {/* Floating amount with golden glow */}
                                <motion.div
                                    initial={{ y: 40, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                    className="relative mb-6"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-40 h-40 rounded-full bg-gradient-to-r from-amber-400/30 to-yellow-500/30 blur-[60px]" />
                                    </div>
                                    <motion.p
                                        initial={{ scale: 0.5 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            delay: 0.5,
                                            type: "spring",
                                            stiffness: 200,
                                        }}
                                        className="relative text-6xl sm:text-7xl font-extrabold"
                                        style={{
                                            background:
                                                "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            filter: "drop-shadow(0 0 30px rgba(255,215,0,0.4))",
                                        }}
                                    >
                                        ৳{amount}
                                    </motion.p>
                                </motion.div>

                                {/* Heart icon */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.7, type: "spring" }}
                                    className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-rose-500/30"
                                >
                                    <Heart size={24} className="text-white fill-white" />
                                </motion.div>

                                {/* Thank you message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <h2 className="text-2xl font-extrabold text-white mb-1">
                                        Thank You, {name}!
                                    </h2>
                                    <p className="text-white/50 text-sm leading-relaxed mt-3 max-w-xs mx-auto">
                                        Your generosity keeps this platform alive for every TTCian.
                                        You are part of something meaningful. 💛
                                    </p>
                                </motion.div>

                                {/* Date and badge preview */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.2 }}
                                    className="mt-6 pt-5 border-t border-white/10"
                                >
                                    <p className="text-white/30 text-xs">{date}</p>
                                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-500/30">
                                        <Star
                                            size={12}
                                            className="text-amber-400 fill-amber-400"
                                        />
                                        <span className="text-amber-300 text-[10px] font-bold">
                                            Supporter Badge Awarded
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Download button */}
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    className="mt-5 flex items-center justify-center gap-2 mx-auto px-5 py-2 bg-white/10 text-white/70 rounded-xl text-xs font-semibold hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    <Download size={13} />
                                    Download Card
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════
   DYNAMIC PHASE STYLING HELPERS
   ═══════════════════════════════════════════════════ */
const PHASE_COLORS: Record<string, { bg: string, text: string, iconBg: string, darkIconBg: string }> = {
    purple: { bg: "bg-purple-100", text: "text-purple-600", iconBg: "bg-purple-50", darkIconBg: "dark:bg-purple-900/30" },
    blue:   { bg: "bg-blue-100",   text: "text-blue-600",   iconBg: "bg-blue-50",   darkIconBg: "dark:bg-blue-900/30" },
    orange: { bg: "bg-orange-100", text: "text-orange-600", iconBg: "bg-orange-50", darkIconBg: "dark:bg-orange-900/30" },
    teal:   { bg: "bg-teal-100",   text: "text-teal-600",   iconBg: "bg-teal-50",   darkIconBg: "dark:bg-teal-900/30" },
    green:  { bg: "bg-green-100",  text: "text-green-600",  iconBg: "bg-green-50",  darkIconBg: "dark:bg-green-900/30" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", iconBg: "bg-emerald-50", darkIconBg: "dark:bg-emerald-900/30" },
    rose:   { bg: "bg-rose-100",   text: "text-rose-600",   iconBg: "bg-rose-50",   darkIconBg: "dark:bg-rose-900/30" },
};

const getIconComponent = (iconName: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
        Palette, Server, Smartphone, Globe, Users, Layers, 
        Hammer, Megaphone, Star, Wallet, Shield, Heart, Plus, Copy, Edit, Save, 
        BookOpen, Video, Calendar, Clock, Loader2, Sparkles, AlertTriangle, FileText, Pencil,
        Banknote
    };
    return icons[iconName] || Layers;
};

/* ═══════════════════════════════════════════════════
   VERTICAL TIMELINE ROADMAP
   ═══════════════════════════════════════════════════ */
function VisionRoadmap({ phases, supporters }: { phases: (SupportPhase & { id: string })[], supporters: (FirestoreGift & { id: string })[] }) {
    return (
        <div className="pt-6 pb-12 max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <div className="relative inline-block">
                        <h2 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">
                            Vision Roadmap
                        </h2>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-24 h-1.5 bg-rose-500 rounded-full" />
                    </div>
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm font-medium mt-10 leading-relaxed px-4">
                    The journey to connecting every TTCian. See what we&apos;ve built, what we&apos;re building, and the heroes supporting each phase.
                </p>
            </div>

            <div className="space-y-8">
                {phases.map((phase) => (
                    <PhaseTimelineCard 
                        key={phase.id} 
                        phase={phase} 
                        supporters={supporters.filter(s => s.phaseId === phase.id)} 
                    />
                ))}
            </div>
        </div>
    );
}

function PhaseTimelineCard({ phase, supporters }: { phase: SupportPhase; supporters: (FirestoreGift & { id: string })[] }) {
    const [expanded, setExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortTop, setSortTop] = useState(true);

    const traction = phase.tractionLevel || 0;
    const isComplete = traction === 100 || phase.status === "Complete";

    const filteredSupporters = supporters
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => sortTop ? b.amount - a.amount : (b.date?.seconds || 0) - (a.date?.seconds || 0));

    // Phase dynamic theme and icon
    const themeKey = phase.color || "emerald";
    const theme = PHASE_COLORS[themeKey] || PHASE_COLORS.emerald;
    const Icon = getIconComponent(phase.icon || "Layers");

    // Map encouragement text
    const encouragementText = phase.status === "Complete" 
        ? "This phase was completed through incredible dedication and the generosity of our supporters."
        : phase.status === "In Progress"
        ? "Contributions right now directly accelerate this phase. Every effort matters."
        : "Coming soon. Early believers here will be recognized as pioneers.";

    return (
        <div className="bg-white dark:bg-[#111118] rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500`} />
            
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                {/* Icon area */}
                <div className="flex-1 flex gap-5 items-start">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${theme.iconBg} ${theme.darkIconBg} ${theme.text}`}>
                        <Icon size={24} />
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">
                                {phase.title}
                            </h3>
                            <div className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${theme.bg} ${theme.text} dark:bg-opacity-20`}>
                                {phase.status}
                            </div>
                        </div>
                        <p className={`text-[11px] font-bold italic ${theme.text} mb-4`}>
                            {encouragementText}
                        </p>

                        {/* Progress Tracker */}
                        {(phase.targetAmount || phase.tractionLevel !== undefined) && (
                            <div className="mt-4 max-w-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Progress</span>
                                    <span className={`text-[10px] font-black ${theme.text}`}>
                                        {phase.tractionLevel || Math.round(((phase.currentAmount || 0) / (phase.targetAmount || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${phase.tractionLevel || Math.round(((phase.currentAmount || 0) / (phase.targetAmount || 1)) * 100)}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] ${themeKey === 'emerald' ? 'bg-emerald-500' : themeKey === 'purple' ? 'bg-purple-500' : themeKey === 'blue' ? 'bg-blue-500' : themeKey === 'orange' ? 'bg-orange-500' : themeKey === 'teal' ? 'bg-teal-500' : themeKey === 'rose' ? 'bg-rose-500' : 'bg-primary'}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Personal Note Section */}
                        {phase.personalNote && (
                            <div className="mt-6 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star size={12} className="text-amber-500 fill-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Founder&apos;s Note</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">
                                    &ldquo;{phase.personalNote}&rdquo;
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status/Supporters area */}
                <div className="shrink-0 flex flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-800">
                    {phase.showFundraising && (
                        <div className="text-center md:text-right">
                             <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-1">Raised</div>
                             <div className="text-4xl font-black text-[#E2136E] dark:text-pink-500 tracking-tighter leading-none flex items-baseline gap-1">
                                 <span className="text-xl">৳</span>{supporters.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                             </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#161620] hover:bg-gray-50 dark:hover:bg-[#1c1c28] text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-gray-100 dark:border-gray-800 shadow-sm min-w-[140px] justify-center"
                    >
                        <Users size={14} /> 
                        {supporters.length} {supporters.length === 1 ? "Supporter" : "Supporters"}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    
                    {isComplete && (
                        <div className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                             <Check size={12} strokeWidth={3} /> Verified Complete
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50/50 dark:bg-gray-900/10 border-t border-gray-100 dark:border-gray-800"
                    >
                        <div className="p-6 md:p-8">
                             <div className="flex items-center justify-between gap-4 mb-8">
                                 <div className="relative flex-1">
                                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                     <input 
                                         type="text" 
                                         value={searchQuery}
                                         onChange={e => setSearchQuery(e.target.value)}
                                         placeholder="Search supporters..." 
                                         className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400"
                                     />
                                 </div>
                                 <button onClick={() => setSortTop(!sortTop)} className="p-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#161620] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm">
                                     <ArrowUpDown size={14} />
                                 </button>
                             </div>

                              {filteredSupporters.length === 0 ? (
                                  <div className="text-center py-10 px-4 bg-white dark:bg-transparent rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed">
                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching supporters found.</p>
                                  </div>
                              ) : (
                                  <div className={filteredSupporters.length === 1 ? "grid grid-cols-1 max-w-lg mx-auto" : filteredSupporters.length === 2 ? "grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-5" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
                                      {filteredSupporters.map(s => {
                                          const roleMap: Record<string, string> = { founder: "Founder", advocate: "Advocate", patron: "Patron", supporter: "Supporter", builder: "Builder" };
                                          const badgeLabel = s.supporterBadgeLabel || (s.role && roleMap[s.role] ? roleMap[s.role] : (s.amount >= 1000 ? "Builder" : s.amount >= 500 ? "Patron" : "Friend"));
                                          
                                          const badgeColors: Record<string, string> = {
                                              "Founder": "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
                                              "Builder": "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
                                              "Patron": "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
                                              "Friend": "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
                                              "Pioneer": "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
                                              "Believer": "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
                                              "Advocate": "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400",
                                              "Supporter": "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400"
                                          };

                                          const badgeClass = badgeColors[badgeLabel] || "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";

                                          const dateFormatted = s.date?.seconds 
                                              ? new Date(s.date.seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                              : "Early Supporter";

                                          const collegeDisplay = s.collegeName || (s.collegeId ? colleges.find(c => c.id === s.collegeId)?.shortName : "");

                                          const ProfileWrapper = ({ children }: { children: React.ReactNode }) => {
                                              const url = s.supporterProfileUrl || (s.userId && !s.isExternalSupporter ? `/profile/${s.userId}` : "");
                                              if (!url) return <>{children}</>;
                                              return <Link href={url} className="contents">{children}</Link>;
                                          };

                                          return (
                                              <motion.div 
                                                 key={s.id} 
                                                 whileHover={{ y: -4 }}
                                                 className="group bg-white dark:bg-[#161620] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm hover:shadow-xl dark:hover:shadow-amber-500/5 transition-all duration-300 relative flex flex-col justify-between"
                                              >
                                                  <div>
                                                      {/* Top Header Row */}
                                                      <div className="flex items-start justify-between gap-3 mb-3">
                                                          <div className="flex items-center gap-3 min-w-0">
                                                              <div className="relative shrink-0">
                                                                  <ProfileWrapper>
                                                                      <div className="w-12 h-12 rounded-full border-2 border-amber-400/40 dark:border-amber-400/30 shadow-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-400 cursor-pointer">
                                                                          {s.photoURL ? (
                                                                              <Image src={s.photoURL} alt={s.name || "Supporter"} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                                                                          ) : (s.name ? s.name[0] : "?")}
                                                                      </div>
                                                                  </ProfileWrapper>
                                                                  {(s.isVerifiedSupporter || s.status === "approved") && (
                                                                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161620] flex items-center justify-center shadow-sm" title="Verified Supporter">
                                                                          <Check size={10} className="text-white" strokeWidth={4} />
                                                                      </div>
                                                                  )}
                                                              </div>

                                                              <div className="min-w-0 flex-1">
                                                                  <ProfileWrapper>
                                                                      <h4 className="font-bold text-gray-900 dark:text-white truncate tracking-tight text-sm cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                                                          {s.name}
                                                                      </h4>
                                                                  </ProfileWrapper>
                                                                  {s.headline ? (
                                                                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate mt-0.5 leading-snug">
                                                                          {s.headline}
                                                                      </p>
                                                                  ) : (
                                                                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                                                          Community Contributor
                                                                      </p>
                                                                  )}
                                                              </div>
                                                          </div>

                                                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-gray-100 dark:border-gray-800">
                                                              {dateFormatted}
                                                          </span>
                                                      </div>

                                                      {/* Academic & Affiliation Micro-Chips */}
                                                      {(collegeDisplay || s.batchOrDept) && (
                                                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                              {collegeDisplay && (
                                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-800/30">
                                                                      <Building2 size={10} />
                                                                      {collegeDisplay}
                                                                  </span>
                                                              )}
                                                              {s.batchOrDept && (
                                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50">
                                                                      <GraduationCap size={10} />
                                                                      {s.batchOrDept}
                                                                  </span>
                                                              )}
                                                          </div>
                                                      )}

                                                      {/* Contribution Highlight Ribbon */}
                                                      {s.contributionHighlight && (
                                                          <div className="mb-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center gap-2">
                                                              <Sparkles size={12} className="text-amber-500 shrink-0" />
                                                              <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 leading-tight">
                                                                  {s.contributionHighlight}
                                                              </p>
                                                          </div>
                                                      )}

                                                      {/* Personal Message / Quote */}
                                                      {s.message && (
                                                          <div className="pl-3 border-l-2 border-amber-300 dark:border-amber-500/40 py-1 mb-4 bg-amber-50/20 dark:bg-amber-950/10 rounded-r-xl">
                                                              <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium italic leading-relaxed line-clamp-3">
                                                                  &ldquo;{s.message}&rdquo;
                                                              </p>
                                                          </div>
                                                      )}
                                                  </div>

                                                  {/* Footer Row: Role pill + Profile / Social Links */}
                                                  <div className="pt-3 border-t border-gray-50 dark:border-gray-800/80 flex items-center justify-between gap-2 mt-2">
                                                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm ${badgeClass}`}>
                                                          {badgeLabel}
                                                      </span>

                                                      <div className="flex items-center gap-1.5">
                                                          {s.socialLinks?.linkedin && (
                                                              <a 
                                                                  href={s.socialLinks.linkedin.startsWith("http") ? s.socialLinks.linkedin : `https://${s.socialLinks.linkedin}`} 
                                                                  target="_blank" 
                                                                  rel="noreferrer"
                                                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                                                  title="LinkedIn Profile"
                                                              >
                                                                  <Linkedin size={13} />
                                                              </a>
                                                          )}
                                                          {s.socialLinks?.github && (
                                                              <a 
                                                                  href={s.socialLinks.github.startsWith("http") ? s.socialLinks.github : `https://${s.socialLinks.github}`} 
                                                                  target="_blank" 
                                                                  rel="noreferrer"
                                                                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                                  title="GitHub Profile"
                                                              >
                                                                  <Github size={13} />
                                                              </a>
                                                          )}
                                                          {s.supporterProfileUrl || (s.userId && !s.isExternalSupporter) ? (
                                                              <Link 
                                                                  href={s.supporterProfileUrl || `/profile/${s.userId}`}
                                                                  className="text-[10px] font-bold text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                              >
                                                                  Profile <ExternalLink size={10} />
                                                              </Link>
                                                          ) : (
                                                              <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">Verified ✓</span>
                                                          )}
                                                      </div>
                                                  </div>
                                              </motion.div>
                                          );
                                      })}
                                  </div>
                              )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HOW TO SEND INSTRUCTIONS
   ═══════════════════════════════════════════════════ */
function HowToSend({ bkashNumber = "01805107667", nagadNumber = "01805107667" }: { bkashNumber?: string; nagadNumber?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [guideTab, setGuideTab] = useState<"bkash" | "nagad">("bkash");

    return (
        <div className="mt-8 bg-white dark:bg-[#111118] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                            How to Send Money via bKash & Nagad
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            Step-by-step instructions in English & বাংলা
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                />
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
                        <div className="px-6 pb-6 border-t border-gray-100 dark:border-white/5 pt-5 space-y-6">
                            {/* Guide switcher tab with official logos */}
                            <div className="flex p-1.5 bg-gray-100 dark:bg-white/5 rounded-xl max-w-xs">
                                <button
                                    onClick={() => setGuideTab("bkash")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${guideTab === "bkash" ? "bg-[#E2136E] text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                                >
                                    <div className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                                        <Image src="/logos/bkash.svg" alt="bKash" width={16} height={12} className="w-full h-full object-contain" />
                                    </div>
                                    <span>bKash Guide</span>
                                </button>
                                <button
                                    onClick={() => setGuideTab("nagad")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${guideTab === "nagad" ? "bg-gradient-to-r from-[#F7941D] to-[#ED1C24] text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                                >
                                    <div className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                                        <Image src="/logos/nagad.svg" alt="Nagad" width={16} height={12} className="w-full h-full object-contain" />
                                    </div>
                                    <span>Nagad Guide</span>
                                </button>
                            </div>

                            {guideTab === "bkash" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                                    {/* English Instructions */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                                            English Instructions (bKash)
                                        </h4>
                                        <ol className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                                            {[
                                                { s: "1", t: <>Open the <strong className="text-gray-900 dark:text-white font-black">bKash</strong> app on your smartphone</> },
                                                { s: "2", t: <>Tap <strong className="text-gray-900 dark:text-white font-black">&quot;Send Money&quot;</strong></> },
                                                { s: "3", t: <>Enter recipient number: <strong className="text-[#E2136E] dark:text-pink-400 font-black font-mono">{bkashNumber}</strong></> },
                                                { s: "4", t: <>Enter the amount you wish to contribute</> },
                                                { s: "5", t: <>In the <strong className="text-gray-900 dark:text-white font-black">Reference</strong> field, enter your name</> },
                                                { s: "6", t: <>Confirm with your bKash PIN</> },
                                                { s: "7", t: <>Copy and save the <strong className="text-gray-900 dark:text-white font-black">Transaction ID (TrxID)</strong> to verify below</> }
                                            ].map(item => (
                                                <li key={item.s} className="flex gap-2.5">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-50 dark:bg-pink-900/30 text-[#E2136E] dark:text-pink-400 flex items-center justify-center text-[10px] font-black">
                                                        {item.s}
                                                    </span>
                                                    <span className="font-medium pt-0.5">{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Bengali Instructions */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                                            বাংলা নির্দেশিকা (বিকাশ)
                                        </h4>
                                        <ol className="space-y-3 text-xs text-gray-600 dark:text-gray-400 font-bengali">
                                            {[
                                                { s: "১", t: <>আপনার ফোনে <strong className="text-gray-900 dark:text-white font-black">বিকাশ</strong> অ্যাপ ওপেন করুন</> },
                                                { s: "২", t: <><strong className="text-gray-900 dark:text-white font-black">&quot;সেন্ড মানি&quot;</strong> অপশন সিলেক্ট করুন</> },
                                                { s: "৩", t: <>নম্বর দিন: <strong className="text-[#E2136E] dark:text-pink-400 font-black font-mono font-english">{bkashNumber}</strong></> },
                                                { s: "৪", t: <>আপনার পছন্দের অনুদানের পরিমাণ লিখুন</> },
                                                { s: "৫", t: <><strong className="text-gray-900 dark:text-white font-black">রেফারেন্স</strong> এ আপনার নাম লিখুন</> },
                                                { s: "৬", t: <>পিন দিয়ে সেন্ড মানি কনফার্ম করুন</> },
                                                { s: "৭", t: <><strong className="text-gray-900 dark:text-white font-black">ট্রানজ্যাকশন আইডি (TrxID)</strong> কপি করে নিচের ভেরিফিকেশনে জমা দিন</> }
                                            ].map(item => (
                                                <li key={item.s} className="flex gap-2.5">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-50 dark:bg-pink-900/30 text-[#E2136E] dark:text-pink-400 flex items-center justify-center text-[10px] font-black font-english">
                                                        {item.s}
                                                    </span>
                                                    <span className="font-medium pt-0.5">{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                                    {/* English Instructions */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                                            English Instructions (Nagad)
                                        </h4>
                                        <ol className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                                            {[
                                                { s: "1", t: <>Open your <strong className="text-gray-900 dark:text-white font-black">Nagad</strong> app</> },
                                                { s: "2", t: <>Tap <strong className="text-gray-900 dark:text-white font-black">&quot;Send Money&quot;</strong></> },
                                                { s: "3", t: <>Enter recipient number: <strong className="text-[#F7941D] font-black font-mono">{nagadNumber}</strong></> },
                                                { s: "4", t: <>Enter the amount you wish to contribute</> },
                                                { s: "5", t: <>In the <strong className="text-gray-900 dark:text-white font-black">Reference</strong> field, enter your name</> },
                                                { s: "6", t: <>Confirm with your Nagad PIN</> },
                                                { s: "7", t: <>Save the <strong className="text-gray-900 dark:text-white font-black">Transaction ID (TxnID)</strong> to claim your badge</> }
                                            ].map(item => (
                                                <li key={item.s} className="flex gap-2.5">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-[#F7941D] flex items-center justify-center text-[10px] font-black">
                                                        {item.s}
                                                    </span>
                                                    <span className="font-medium pt-0.5">{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Bengali Instructions */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                                            বাংলা নির্দেশিকা (নগদ)
                                        </h4>
                                        <ol className="space-y-3 text-xs text-gray-600 dark:text-gray-400 font-bengali">
                                            {[
                                                { s: "১", t: <>আপনার ফোনে <strong className="text-gray-900 dark:text-white font-black">নগদ</strong> অ্যাপ ওপেন করুন</> },
                                                { s: "২", t: <><strong className="text-gray-900 dark:text-white font-black">&quot;সেন্ড মানি&quot;</strong> অপশন বেছে নিন</> },
                                                { s: "৩", t: <>নম্বর দিন: <strong className="text-[#F7941D] font-black font-mono font-english">{nagadNumber}</strong></> },
                                                { s: "৪", t: <>অনুদানের পরিমাণ লিখুন</> },
                                                { s: "৫", t: <><strong className="text-gray-900 dark:text-white font-black">রেফারেন্স</strong> এ আপনার নাম লিখুন</> },
                                                { s: "৬", t: <>নগদ পিন দিয়ে কনফার্ম করুন</> },
                                                { s: "৭", t: <><strong className="text-gray-900 dark:text-white font-black">ট্রানজ্যাকশন আইডি</strong> কপি করে নিচে জমা দিন</> }
                                            ].map(item => (
                                                <li key={item.s} className="flex gap-2.5">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-[#F7941D] flex items-center justify-center text-[10px] font-black font-english">
                                                        {item.s}
                                                    </span>
                                                    <span className="font-medium pt-0.5">{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PAYMENT CARD COMPONENT
   ═══════════════════════════════════════════════════ */
function PaymentCard({ 
    giftAmount, 
    setGiftAmount, 
    onGiftSubmit, 
    config, 
    bkashEnabled = true, 
    nagadEnabled = true 
}: { 
    giftAmount: string; 
    setGiftAmount: (val: string) => void; 
    onGiftSubmit: (method: "bKash" | "Nagad", amount: string) => void; 
    config: typeof CONFIG & { bkashType?: string; nagadType?: string; bkashNumber?: string; nagadNumber?: string }; 
    bkashEnabled?: boolean; 
    nagadEnabled?: boolean; 
}) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const tabs: { id: "bkash" | "nagad"; label: string; subLabel: string; color: string; activeClass: string }[] = [];
    if (bkashEnabled) {
        tabs.push({ id: "bkash", label: "bKash", subLabel: config.bkashType || "Personal", color: "#E2136E", activeClass: "bg-[#E2136E] text-white shadow-md shadow-pink-500/20" });
    }
    if (nagadEnabled) {
        tabs.push({ id: "nagad", label: "Nagad", subLabel: config.nagadType || "Personal", color: "#F7941D", activeClass: "bg-gradient-to-r from-[#F7941D] to-[#ED1C24] text-white shadow-md shadow-orange-500/20" });
    }

    const [activeTab, setActiveTab] = useState<"bkash" | "nagad">("bkash");

    // Keep activeTab synchronized with available tabs
    useEffect(() => {
        if (bkashEnabled && !nagadEnabled) {
            setActiveTab("bkash");
        } else if (!bkashEnabled && nagadEnabled) {
            setActiveTab("nagad");
        }
    }, [bkashEnabled, nagadEnabled]);

    if (tabs.length === 0) {
        return (
            <div className="w-full max-w-[480px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-gray-200/80 dark:border-white/10 shadow-2xl p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
                    <Heart size={28} className="text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Support Currently Paused</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Donations are temporarily offline. Please check back shortly or connect with our team.</p>
            </div>
        );
    }

    const currentNumber = activeTab === "bkash" ? (config.bkashNumber || "01805107667") : (config.nagadNumber || "01805107667");
    const currentType = activeTab === "bkash" ? (config.bkashType || "Personal") : (config.nagadType || "Personal");

    return (
        <div className="w-full max-w-[460px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-gray-200/80 dark:border-white/10 shadow-2xl shadow-black/10 overflow-hidden group">
            {/* Header Tabs (if both methods enabled) */}
            {tabs.length > 1 ? (
                <div className="flex p-1.5 bg-gray-100/80 dark:bg-white/5 m-4 mb-2 rounded-2xl relative">
                    {tabs.map(tab => {
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 relative z-10 ${
                                    isSelected ? tab.activeClass : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                                    <Image
                                        src={tab.id === "bkash" ? "/logos/bkash.svg" : "/logos/nagad.svg"}
                                        alt={tab.label}
                                        width={20}
                                        height={14}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span>{tab.label}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold opacity-80 ${isSelected ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-500"}`}>
                                    {tab.subLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="pt-5 px-6 pb-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-100 dark:bg-white/5 text-xs font-black text-gray-700 dark:text-gray-300">
                        <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                            <Image
                                src={tabs[0]?.id === "bkash" ? "/logos/bkash.svg" : "/logos/nagad.svg"}
                                alt={tabs[0]?.label || "MFS"}
                                width={20}
                                height={14}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {tabs[0]?.label} ({tabs[0]?.subLabel})
                    </div>
                </div>
            )}

            <div className="p-6 pt-3 space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                    >
                        {/* Branded Digital Card */}
                        <div 
                            className={`rounded-3xl p-6 text-white relative overflow-hidden shadow-xl ${
                                activeTab === "bkash" 
                                    ? "bg-gradient-to-br from-[#E2136E] via-[#C91060] to-[#960B46]" 
                                    : "bg-gradient-to-br from-[#F7941D] via-[#ED1C24] to-[#C11018]"
                            }`}
                        >
                            {/* Decorative ambient shine */}
                            <div className="absolute top-0 right-0 w-36 h-36 bg-white/15 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />

                            <div className="relative z-10 space-y-5">
                                <div className="flex justify-between items-start">
                                    <div className="h-11 px-3.5 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                                        <Image 
                                            src={activeTab === "bkash" ? "/logos/bkash.svg" : "/logos/nagad.svg"} 
                                            alt={activeTab === "bkash" ? "bKash" : "Nagad"}
                                            width={84}
                                            height={32}
                                            className="h-7 w-auto object-contain"
                                            priority
                                        />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">Recipient Account</p>
                                        <p className="text-sm font-black tracking-tight text-white">{activeTab === "bkash" ? "bKash" : "Nagad"} {currentType}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/70">Account Number</span>
                                        <span className="text-[9px] font-bold text-white/80 uppercase">Tap to copy</span>
                                    </div>
                                    <div 
                                        onClick={() => copyToClipboard(currentNumber)}
                                        className="group/num flex items-center justify-between p-3 rounded-2xl bg-black/15 hover:bg-black/25 backdrop-blur-sm border border-white/10 cursor-pointer transition-all active:scale-[0.99]"
                                        title="Click to copy number"
                                    >
                                        <p className="text-2xl font-mono font-black tracking-wider text-white">
                                            {currentNumber}
                                        </p>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors">
                                            {copied ? (
                                                <>
                                                    <Check size={14} className="text-emerald-300" />
                                                    <span className="text-[10px] text-emerald-200">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    <span className="text-[10px]">Copy</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 text-[10px] text-white/75 font-medium border-t border-white/10">
                                    <span>Method: Send Money</span>
                                    <span>Ref: Your Name</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Preset Gift Chips */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                                Choose Amount
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {[50, 100, 200, 500, 1000].map(amt => {
                                    const isSelected = giftAmount === String(amt);
                                    return (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setGiftAmount(String(amt))}
                                            className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                                                isSelected 
                                                    ? activeTab === "bkash"
                                                        ? "bg-[#E2136E] text-white border-transparent shadow-md shadow-pink-500/25 scale-[1.03]"
                                                        : "bg-gradient-to-r from-[#F7941D] to-[#ED1C24] text-white border-transparent shadow-md shadow-orange-500/25 scale-[1.03]"
                                                    : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-white/5 hover:border-primary/40"
                                            }`}
                                        >
                                            ৳{amt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Amount Input */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">
                                ৳
                            </span>
                            <input
                                type="number"
                                value={giftAmount}
                                onChange={e => setGiftAmount(e.target.value)}
                                placeholder="Or enter any custom amount..."
                                className="w-full pl-9 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-base font-black placeholder:text-xs placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* CTA: I Sent a Gift */}
                        <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => onGiftSubmit(activeTab === "bkash" ? "bKash" : "Nagad", giftAmount)}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-blue-500/20 flex items-center justify-center gap-2.5 text-base transition-colors"
                        >
                            <Heart size={18} className="fill-current text-[#E63946] animate-pulse" /> 
                            <span>I Have Sent a Gift</span>
                        </motion.button>
                        
                        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                            Instant verification & supporter badge on the vision roadmap
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>
            
            {/* Trust Badges footer */}
            <div className="p-4 bg-gray-50/70 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-around">
                <div className="flex items-center gap-1.5 opacity-70">
                    <Shield size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">Verified Platform</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-1.5 opacity-70">
                    <Sparkles size={14} className="text-primary dark:text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">100% Direct</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-1.5 opacity-70">
                    <CheckCircle2 size={14} className="text-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">Student-Built</span>
                </div>
            </div>
        </div>
    );
}

export default function SupportPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showGiftForm, setShowGiftForm] = useState(false);
    const [giftAmount, setGiftAmount] = useState("");
    const [giftTxId, setGiftTxId] = useState("");
    const [giftService, setGiftService] = useState<"bKash" | "Nagad">("bKash");
    const [giftName, setGiftName] = useState("");
    const [giftSubmitted, setGiftSubmitted] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [supporters, setSupporters] = useState<(FirestoreGift & { id: string })[]>([]);
    const [settings, setSettings] = useState<SupportSettings>({ fundingOpen: true, fundingMessage: "Help us build the ultimate university platform.", supportPageActive: true });
    const [phases, setPhases] = useState<(SupportPhase & { id: string })[]>([]);
    const [builderSettings, setBuilderSettings] = useState<FirestoreBuilderSettings | null>(null);
    const [showBuilderPopup, setShowBuilderPopup] = useState(false);

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [tempSettings, setTempSettings] = useState<Partial<SupportSettings>>({});

    const activeConfig = {
        bkashNumber: settings.bkashNumber || CONFIG.bkashNumber,
        bkashType: settings.bkashType || CONFIG.bkashType,
        bkashEnabled: settings.bkashEnabled ?? true,
        nagadNumber: settings.nagadNumber || CONFIG.nagadNumber,
        nagadType: settings.nagadType || CONFIG.nagadType,
        nagadEnabled: settings.nagadEnabled ?? true,
        raised: settings.raised ?? CONFIG.raised,
        goal: settings.goal ?? CONFIG.goal,
        supporters: String(settings.supporters ?? CONFIG.supporters),
        currencySymbol: settings.currencySymbol || CONFIG.currencySymbol,
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateSupportSettings(tempSettings);
            setSettings(prev => ({ ...prev, ...tempSettings }));
            setIsEditingSettings(false);
            showToast("Settings updated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to save settings.", "error");
        }
        setIsSaving(false);
    };

    const AdminSupportPanel = () => {
        const isBkashOn = (tempSettings.bkashEnabled ?? settings.bkashEnabled) ?? true;
        const isNagadOn = (tempSettings.nagadEnabled ?? settings.nagadEnabled) ?? true;

        return (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed top-20 sm:top-24 right-4 sm:right-6 z-[100] w-84 sm:w-96 max-w-[92vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
            >
                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-slate-50 to-transparent dark:from-amber-500/10 dark:via-slate-950/50 dark:to-transparent border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                            <Shield size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Admin Hub</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">MFS & Campaign Controls</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEditingSettings(!isEditingSettings)}
                        className={`p-2 rounded-xl transition-all ${isEditingSettings ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500"}`}
                        title={isEditingSettings ? "Close Admin Panel" : "Edit Settings"}
                    >
                        <Edit size={14} />
                    </button>
                </div>

                <AnimatePresence>
                    {isEditingSettings && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Section 1: Mobile Banking (MFS) */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile Financial Services</label>
                                        <span className="text-[9px] font-bold text-amber-500 uppercase">Bangladesh MFS</span>
                                    </div>

                                    {/* bKash Config Card */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-gray-100 dark:border-white/5 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 border border-gray-200/80 shadow-xs">
                                                    <Image src="/logos/bkash.svg" alt="bKash" width={20} height={14} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">bKash Configuration</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setTempSettings(prev => ({ ...prev, bkashEnabled: !isBkashOn }))}
                                                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${isBkashOn ? "bg-[#E2136E]" : "bg-gray-300 dark:bg-gray-700"}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isBkashOn ? "translate-x-4" : "translate-x-0"}`} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Account Number</span>
                                                <input 
                                                    type="text" 
                                                    value={tempSettings.bkashNumber ?? activeConfig.bkashNumber}
                                                    onChange={e => setTempSettings(prev => ({ ...prev, bkashNumber: e.target.value }))}
                                                    placeholder="01805107667"
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Type</span>
                                                <select
                                                    value={tempSettings.bkashType ?? activeConfig.bkashType}
                                                    onChange={e => setTempSettings(prev => ({ ...prev, bkashType: e.target.value as "Personal" | "Merchant" }))}
                                                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                                >
                                                    <option value="Personal">Personal</option>
                                                    <option value="Merchant">Merchant</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nagad Config Card */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-gray-100 dark:border-white/5 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 border border-gray-200/80 shadow-xs">
                                                    <Image src="/logos/nagad.svg" alt="Nagad" width={20} height={14} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">Nagad Configuration</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setTempSettings(prev => ({ ...prev, nagadEnabled: !isNagadOn }))}
                                                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${isNagadOn ? "bg-[#F7941D]" : "bg-gray-300 dark:bg-gray-700"}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isNagadOn ? "translate-x-4" : "translate-x-0"}`} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Account Number</span>
                                                <input 
                                                    type="text" 
                                                    value={tempSettings.nagadNumber ?? activeConfig.nagadNumber}
                                                    onChange={e => setTempSettings(prev => ({ ...prev, nagadNumber: e.target.value }))}
                                                    placeholder="01805107667"
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Type</span>
                                                <select
                                                    value={tempSettings.nagadType ?? activeConfig.nagadType}
                                                    onChange={e => setTempSettings(prev => ({ ...prev, nagadType: e.target.value as "Personal" | "Merchant" }))}
                                                    className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                                >
                                                    <option value="Personal">Personal</option>
                                                    <option value="Merchant">Merchant</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Goals & Progress */}
                                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fundraising Targets</label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Raised (৳)</label>
                                            <input 
                                                type="number" 
                                                value={tempSettings.raised ?? activeConfig.raised}
                                                onChange={e => setTempSettings(prev => ({ ...prev, raised: Number(e.target.value) }))}
                                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Goal (৳)</label>
                                            <input 
                                                type="number" 
                                                value={tempSettings.goal ?? activeConfig.goal}
                                                onChange={e => setTempSettings(prev => ({ ...prev, goal: Number(e.target.value) }))}
                                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Supporters Count</label>
                                            <input 
                                                type="text" 
                                                value={tempSettings.supporters ?? activeConfig.supporters}
                                                onChange={e => setTempSettings(prev => ({ ...prev, supporters: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Currency Symbol</label>
                                            <input 
                                                type="text" 
                                                value={tempSettings.currencySymbol ?? activeConfig.currencySymbol}
                                                onChange={e => setTempSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Saving Settings...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    useEffect(() => {
        setMounted(true);
        getApprovedGifts().then(setSupporters).catch(console.error);
        getSupportSettings().then(s => {
            setSettings(s);
        }).catch(err => {
            console.error("[SupportPage] Error fetching settings:", err);
        });
        getSupportPhases().then(allPhases => {
            const sorted = [...(allPhases || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            setPhases(sorted);
        }).catch(err => {
            console.error("[SupportPage] Error fetching phases:", err);
        });

        getBuilderSettings().then(setBuilderSettings).catch(console.error);
    }, []);

    if (mounted && !settings.supportPageActive && !isAdmin) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0A0A0B] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                        <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-full border border-gray-100 dark:border-white/5 flex items-center justify-center">
                            <Shield className="text-primary" size={40} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Support Currently Restricted</h1>
                        <p className="text-gray-500 font-medium mt-3 leading-relaxed">
                            The support page is temporarily unavailable. We are currently calibrating our roadmap and goal targets. Please check back later or reach out to us directly.
                        </p>
                    </div>
                    <Link href="/" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                        Back to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    const handleGiftSubmit = async () => {
        if (!giftTxId || !giftAmount || !giftName) return;
        
        setGiftSubmitted(true);
        try {
            await submitGift({
                name: giftName,
                amount: Number(giftAmount),
                txId: giftTxId,
                method: giftService
            });
            
            setShowGiftForm(false);
            setShowThankYou(true);
            setGiftAmount("");
            setGiftTxId("");
            setGiftName("");
        } catch (err) {
            console.error(err);
            showToast("Failed to submit verification. Please try again.", "error");
        }
        setGiftSubmitted(false);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-32 overflow-hidden selection:bg-primary selection:text-white min-h-screen">
            {mounted && isAdmin && <AdminSupportPanel />}

            {/* 1. VISION ROADMAP (FIRST SECTION) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 sm:pb-16 relative z-10">
                <VisionRoadmap phases={phases} supporters={supporters} />
            </section>

            {/* 2. "KEEP THE DREAM ALIVE" & MFS PAYMENT WIDGET */}
            <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden border-t border-b border-gray-200/70 dark:border-white/5">
                <MeshGradient />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-between">
                        {/* Left: Content & Mission */}
                        <div className="flex-1 space-y-10">
                            <motion.div 
                                initial={{ opacity: 0, x: -24 }} 
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.7 }}
                                className="space-y-6"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-full">
                                    <Sparkles size={14} className="text-primary dark:text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-400">Keep The Dream Alive</span>
                                </div>
                                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight font-sora">
                                    Fueling the Future of{" "}
                                    <span className="bg-gradient-to-r from-[#1A56DB] via-blue-600 to-[#1D9BF0] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#93C5FD] bg-clip-text text-transparent">
                                        TTC Network
                                    </span>
                                </h1>
                                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
                                    TTC Network is built independently by students to connect educators and learners across Bangladesh. Your support—no matter how small—directly accelerates our mission to empower every university and college.
                                </p>
                            </motion.div>

                            {/* Animated Stat Pills */}
                            <div className="flex flex-wrap gap-3.5">
                                <StatPill label="Raised" value={`${activeConfig.currencySymbol}${activeConfig.raised.toLocaleString()}`} icon={Wallet} delay={0.2} />
                                <StatPill label="Supporters" value={activeConfig.supporters} icon={Users} delay={0.35} />
                                <StatPill label="Trust Score" value="100%" icon={Shield} delay={0.5} />
                            </div>

                            {/* Progress Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="max-w-lg"
                            >
                                <ShimmerProgressBar raised={activeConfig.raised} goal={activeConfig.goal} />
                            </motion.div>
                        </div>

                        {/* Right: Payment Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.94, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2, type: "spring" }}
                            className="w-full lg:w-auto flex justify-center"
                        >
                            <PaymentCard 
                                giftAmount={giftAmount} 
                                setGiftAmount={setGiftAmount} 
                                onGiftSubmit={(method, amt) => {
                                    if (requireVerification("support the platform")) {
                                        setGiftService(method);
                                        if (amt) setGiftAmount(amt);
                                        setShowGiftForm(true);
                                    }
                                }} 
                                config={activeConfig}
                                bkashEnabled={activeConfig.bkashEnabled}
                                nagadEnabled={activeConfig.nagadEnabled}
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 3. WHY SUPPORT? (Bento Grid) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary dark:text-blue-400 mb-2">Our Commitments</h2>
                    <h3 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Why Your Gift Matters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { 
                            title: "Sustainability", 
                            desc: "Servers, database bandwidth, and cloud storage require continuous resources. Your contributions keep the platform online 24/7 for everyone.", 
                            icon: Server, 
                            color: "bg-blue-500" 
                        },
                        { 
                            title: "Innovation", 
                            desc: "We are engineering high-impact tools: real-time collaborative study circles, semester resources, and career connections for educators.", 
                            icon: Palette, 
                            color: "bg-purple-500" 
                        },
                        { 
                            title: "Community", 
                            desc: "100% of funds go directly into platform infrastructure and development. Zero corporate overhead—just student-led dedication.", 
                            icon: Heart, 
                            color: "bg-rose-500" 
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-8 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-xl shadow-black/5 flex flex-col items-start gap-6"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${item.color}/10 flex items-center justify-center text-white`}>
                                <div className={`w-full h-full rounded-2xl ${item.color} flex items-center justify-center shadow-lg`}>
                                    <item.icon size={20} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 4. HOW TO SEND INSTRUCTIONS */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 pb-20">
                <HowToSend bkashNumber={activeConfig.bkashNumber} nagadNumber={activeConfig.nagadNumber} />
            </section>

            {/* Floating builder footer */}
            <div className="fixed bottom-0 left-0 right-0 z-[60]">
                <div className="bg-white/95 dark:bg-[#0c0c12]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] py-3.5 px-4 text-center">
                    <button 
                        onClick={() => setShowBuilderPopup(true)}
                        className="group inline-flex items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span className="text-slate-800 dark:text-slate-200 font-black">
                            BUILT BY A STUDENT FOR STUDENTS
                        </span>
                        <Heart size={14} className="text-[#E63946] fill-[#E63946] animate-pulse group-hover:scale-125 transition-transform" />
                        <span className="text-primary dark:text-[#1D9BF0] font-black group-hover:underline decoration-2 underline-offset-4">
                            HELP KEEP THIS DREAM ALIVE
                        </span>
                    </button>
                </div>
            </div>

            {/* ═════ Gift Verification Form Modal ═════ */}
            <AnimatePresence>
                {showGiftForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => !giftSubmitted && setShowGiftForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-[#111118] rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden border border-gray-100 dark:border-gray-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {giftSubmitted ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-10 text-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} className="text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Submitted for Verification!
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                                        Sakib will verify your transaction and approve it shortly.
                                        You&apos;ll receive a Thank You Card and Supporter Badge once verified. 💛
                                    </p>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="p-6 pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                                                    <CheckCircle2 size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verify Your Gift</h2>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Enter your transaction details</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowGiftForm(false)}
                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <X size={18} className="text-gray-400" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Your Name</label>
                                            <input
                                                type="text"
                                                value={giftName}
                                                onChange={(e) => setGiftName(e.target.value)}
                                                placeholder="Your full name"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Amount Sent (৳)</label>
                                            <input
                                                type="number"
                                                value={giftAmount}
                                                onChange={(e) => setGiftAmount(e.target.value)}
                                                placeholder="e.g. 500"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Payment Method</label>
                                            <select
                                                value={giftService}
                                                onChange={(e) => setGiftService(e.target.value as "bKash" | "Nagad")}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                                            >
                                                <option value="bKash">bKash</option>
                                                <option value="Nagad">Nagad</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Transaction ID</label>
                                            <input
                                                type="text"
                                                value={giftTxId}
                                                onChange={(e) => setGiftTxId(e.target.value)}
                                                placeholder="e.g. TXN9K3M8B2P5"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono placeholder:text-gray-400"
                                            />
                                        </div>
                                        <button
                                            onClick={handleGiftSubmit}
                                            disabled={!giftName || !giftAmount || !giftTxId}
                                            className="w-full py-3.5 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] bg-gradient-to-r from-[#1A56DB] via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        >
                                            <Send size={16} />
                                            Submit for Verification
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ThankYouCard
                show={showThankYou}
                onClose={() => setShowThankYou(false)}
                name={giftName || "Supporter"}
                amount={parseInt(giftAmount) || 500}
                date="March 5, 2026"
            />

            {mounted && builderSettings && (
                <BuilderPopupModal 
                    show={showBuilderPopup} 
                    onClose={() => setShowBuilderPopup(false)} 
                    builderSettings={builderSettings} 
                />
            )}
        </div>
    );
}
