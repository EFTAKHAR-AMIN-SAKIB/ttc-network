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
    ChevronUp,
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
    MessageCircle,
    Mail,
    HelpCircle,
    LifeBuoy,
    Compass,
    Share2,
    CheckCheck,
    type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { colleges } from "@/data/colleges";
import OfficialContactCard from "@/components/OfficialContactCard";
import {
    getApprovedGifts,
    getSupportSettings,
    getSupportPhases,
    submitGift,
    updateSupportSettings,
    getOfficialSettings,
    updateOfficialSettings,
    subscribeOfficialSettings,
    type FirestoreGift,
    type SupportSettings,
    type SupportPhase,
    type FirestoreOfficialSettings,
} from "@/lib/firestore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

const CONFIG = {
    bkashNumber: "01805107667",
    bkashType: "Personal" as "Personal" | "Merchant",
    upayNumber: "01805107667",
    upayType: "Personal" as "Personal" | "Merchant",
    nagadNumber: "01805107667",
    nagadType: "Personal" as "Personal" | "Merchant",
    raised: 12500,
    supporters: "48",
    goal: 50000,
    currencySymbol: "৳",
};

/* ═══════════════════════════════════════════════════
   PREMIUM BACKGROUND TEXTURE & GRADIENT
   ═══════════════════════════════════════════════════ */
function MeshGradient() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Ambient Radial Spotlights */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-blue-600/[0.09] via-indigo-600/[0.04] to-transparent blur-[120px] rounded-full" />
            <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] bg-sky-400/[0.06] dark:bg-blue-500/[0.05] blur-[100px] rounded-full" />
            <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-indigo-600/[0.06] dark:bg-sky-500/[0.04] blur-[130px] rounded-full" />
            {/* Subtle micro dot grid */}
            <div
                className="absolute inset-0 opacity-[0.22] dark:opacity-[0.14]"
                style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   STAT PILL COMPONENT
   ═══════════════════════════════════════════════════ */
function StatPill({
    label,
    value,
    icon: Icon,
    delay = 0,
}: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            className="flex items-center gap-3 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200/70 dark:border-white/10 rounded-2xl shadow-sm hover:border-primary/40 dark:hover:border-blue-400/40 transition-all duration-300"
        >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-center text-primary dark:text-blue-400 shrink-0">
                <Icon size={17} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {label}
                </p>
                <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none mt-1">
                    {value}
                </p>
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   SHIMMER PROGRESS BAR COMPONENT
   ═══════════════════════════════════════════════════ */
function ShimmerProgressBar({ raised, goal, symbol = "৳" }: { raised: number; goal: number; symbol?: string }) {
    const percentage = Math.min(100, Math.max(0, (raised / (goal || 1)) * 100));

    return (
        <div className="w-full space-y-3 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/10 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                        Platform Growth Campaign
                    </p>
                </div>
                <span className="text-lg font-black text-primary dark:text-blue-400 font-mono">
                    {Math.round(percentage)}%
                </span>
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
                <span>
                    Raised:{" "}
                    <strong className="text-gray-900 dark:text-white font-black font-mono">
                        {symbol}{raised.toLocaleString()}
                    </strong>
                </span>
                <span>
                    Target:{" "}
                    <strong className="text-gray-900 dark:text-white font-black font-mono">
                        {symbol}{goal.toLocaleString()}
                    </strong>
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONFETTI COMPONENT (Canvas-based)
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
            "#1A56DB",
            "#00C49F",
            "#FF69B4",
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
    const [cardCopied, setCardCopied] = useState(false);
    const { siteName: brandName, logoUrl: brandLogo } = useSiteSettings();
    const { showToast } = useToast();

    useEffect(() => {
        if (show) {
            setShowConfetti(true);
        }
    }, [show]);

    const handleShare = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(
                `I just supported TTC Network with ৳${amount}! Join me in fueling education for Teachers' Training Colleges in Bangladesh: ${window.location.origin}/support`
            );
            setCardCopied(true);
            showToast("Share text copied to clipboard!", "success");
            setTimeout(() => setCardCopied(false), 2500);
        }
    };

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
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 22, stiffness: 220 }}
                        className="relative z-20 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-br from-[#121624] via-[#161f36] to-[#0d1e38] rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
                            {/* Golden Ambient Glow */}
                            <div className="absolute inset-0 opacity-25 pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 blur-[100px]" />
                            </div>

                            <div className="relative p-6 sm:p-8 text-center">
                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>

                                {/* Brand Header */}
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 p-1 flex items-center justify-center">
                                        <Image
                                            src={brandLogo || "/logos/ttc network.png"}
                                            alt="TTC"
                                            width={32}
                                            height={32}
                                            className="object-contain"
                                        />
                                    </div>
                                    <span className="text-white/80 text-xs font-black tracking-widest uppercase">
                                        {brandName || "TTC NETWORK"}
                                    </span>
                                </div>

                                {/* Floating Amount */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                    className="relative mb-5"
                                >
                                    <p
                                        className="text-5xl sm:text-6xl font-black font-mono tracking-tight"
                                        style={{
                                            background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            filter: "drop-shadow(0 0 25px rgba(255,215,0,0.35))",
                                        }}
                                    >
                                        ৳{amount.toLocaleString()}
                                    </p>
                                </motion.div>

                                {/* Heart Badge */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-rose-500/30">
                                    <Heart size={22} className="text-white fill-white" />
                                </div>

                                {/* Thank you message */}
                                <h2 className="text-2xl font-black text-white mb-2">
                                    Thank You, {name}!
                                </h2>
                                <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
                                    Your generosity fuels this platform for every student and educator in Bangladesh. You are recognized on our Vision Roadmap. 💛
                                </p>

                                {/* Date & Supporter Badge */}
                                <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-2">
                                    <p className="text-white/40 text-[11px] font-medium">{date}</p>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                                        <Star size={12} className="text-amber-400 fill-amber-400" />
                                        <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                            Supporter Badge Awarded
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15"
                                    >
                                        {cardCopied ? <CheckCheck size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                                        {cardCopied ? "Copied!" : "Share Story"}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20"
                                    >
                                        Done
                                    </button>
                                </div>
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
const PHASE_COLORS: Record<
    string,
    {
        bg: string;
        text: string;
        iconBg: string;
        darkIconBg: string;
        border: string;
        barBg: string;
        glow: string;
    }
> = {
    purple: {
        bg: "bg-purple-100",
        text: "text-purple-600 dark:text-purple-400",
        iconBg: "bg-purple-50",
        darkIconBg: "dark:bg-purple-900/30",
        border: "border-purple-500",
        barBg: "bg-purple-500",
        glow: "shadow-[0_0_12px_rgba(168,85,247,0.4)]",
    },
    blue: {
        bg: "bg-blue-100",
        text: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-50",
        darkIconBg: "dark:bg-blue-900/30",
        border: "border-blue-500",
        barBg: "bg-blue-500",
        glow: "shadow-[0_0_12px_rgba(59,130,246,0.4)]",
    },
    orange: {
        bg: "bg-orange-100",
        text: "text-orange-600 dark:text-orange-400",
        iconBg: "bg-orange-50",
        darkIconBg: "dark:bg-orange-900/30",
        border: "border-orange-500",
        barBg: "bg-orange-500",
        glow: "shadow-[0_0_12px_rgba(249,115,22,0.4)]",
    },
    teal: {
        bg: "bg-teal-100",
        text: "text-teal-600 dark:text-teal-400",
        iconBg: "bg-teal-50",
        darkIconBg: "dark:bg-teal-900/30",
        border: "border-teal-500",
        barBg: "bg-teal-500",
        glow: "shadow-[0_0_12px_rgba(20,184,166,0.4)]",
    },
    green: {
        bg: "bg-green-100",
        text: "text-green-600 dark:text-green-400",
        iconBg: "bg-green-50",
        darkIconBg: "dark:bg-green-900/30",
        border: "border-green-500",
        barBg: "bg-green-500",
        glow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]",
    },
    emerald: {
        bg: "bg-emerald-100",
        text: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-50",
        darkIconBg: "dark:bg-emerald-900/30",
        border: "border-emerald-500",
        barBg: "bg-emerald-500",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    },
    rose: {
        bg: "bg-rose-100",
        text: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-rose-50",
        darkIconBg: "dark:bg-rose-900/30",
        border: "border-rose-500",
        barBg: "bg-rose-500",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]",
    },
};

const getIconComponent = (iconName: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
        Palette,
        Server,
        Smartphone,
        Globe,
        Users,
        Layers,
        Hammer,
        Megaphone,
        Star,
        Wallet,
        Shield,
        Heart,
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
        Banknote,
    };
    return icons[iconName] || Layers;
};

/* ═══════════════════════════════════════════════════
   VERTICAL TIMELINE ROADMAP
   ═══════════════════════════════════════════════════ */
function VisionRoadmap({
    phases,
    supporters,
    onBackPhase,
}: {
    phases: (SupportPhase & { id: string })[];
    supporters: (FirestoreGift & { id: string })[];
    onBackPhase: (phaseId: string) => void;
}) {
    return (
        <div id="vision-roadmap" className="pt-2 pb-12 max-w-5xl mx-auto scroll-mt-24">
            <div className="text-center mb-12 sm:mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-block"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-primary dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">
                        <Compass size={13} /> Transparent Milestones
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Vision Roadmap
                    </h2>
                    <div className="w-20 sm:w-28 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 rounded-full mx-auto mt-3" />
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm font-medium mt-4 sm:mt-5 leading-relaxed px-4">
                    The journey to connecting every TTCian. Explore what we&apos;ve shipped, what we&apos;re currently building, and the community pioneers backing each phase.
                </p>
            </div>

            {phases.length === 0 ? (
                <div className="text-center py-12 p-8 bg-white dark:bg-[#111118] rounded-3xl border border-gray-100 dark:border-gray-800">
                    <Loader2 size={24} className="animate-spin text-primary mx-auto mb-3" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Loading roadmap phases...
                    </p>
                </div>
            ) : (
                <div className="space-y-6 sm:space-y-8">
                    {phases.map((phase) => (
                        <PhaseTimelineCard
                            key={phase.id}
                            phase={phase}
                            supporters={supporters.filter((s) => s.phaseId === phase.id)}
                            onBackPhase={() => onBackPhase(phase.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function PhaseTimelineCard({
    phase,
    supporters,
    onBackPhase,
}: {
    phase: SupportPhase & { id: string };
    supporters: (FirestoreGift & { id: string })[];
    onBackPhase: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortTop, setSortTop] = useState(true);

    // Dynamic phase theme & icon
    const themeKey = phase.color || "emerald";
    const theme = PHASE_COLORS[themeKey] || PHASE_COLORS.emerald;
    const Icon = getIconComponent(phase.icon || "Layers");

    // Safe progress calculation
    const progressPercent =
        phase.tractionLevel !== undefined
            ? Math.min(100, Math.max(0, phase.tractionLevel))
            : phase.targetAmount && phase.targetAmount > 0
            ? Math.min(
                  100,
                  Math.max(
                      0,
                      Math.round(((phase.currentAmount || 0) / phase.targetAmount) * 100)
                  )
              )
            : 0;

    const isComplete = progressPercent === 100 || phase.status === "Complete";

    const filteredSupporters = supporters
        .filter((s) => (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) =>
            sortTop
                ? (b.amount || 0) - (a.amount || 0)
                : (b.date?.seconds || 0) - (a.date?.seconds || 0)
        );

    const encouragementText =
        phase.status === "Complete"
            ? "Completed through incredible student dedication and patron generosity."
            : phase.status === "In Progress"
            ? "Actively in development. Contributions right now directly accelerate release."
            : "Planned next. Early believers here will be permanently celebrated as pioneers.";

    return (
        <div className="bg-white dark:bg-[#111118] rounded-3xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative transition-all duration-300 hover:shadow-md">
            {/* Dynamic Colored Left Accent Strip */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 ${theme.barBg}`}
            />

            <div className="p-5 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 pl-6 sm:pl-8">
                {/* Main Content Info */}
                <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                    <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${theme.iconBg} ${theme.darkIconBg} ${theme.text}`}
                    >
                        <Icon size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            <h3 className="font-black text-lg sm:text-xl text-gray-900 dark:text-white uppercase tracking-tight">
                                {phase.title}
                            </h3>
                            <div
                                className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${theme.bg} ${theme.text} dark:bg-opacity-20`}
                            >
                                {phase.status}
                            </div>
                        </div>

                        <p className={`text-xs font-semibold italic ${theme.text} mb-3 leading-relaxed`}>
                            {encouragementText}
                        </p>

                        {/* Progress Tracker */}
                        {(phase.targetAmount || phase.tractionLevel !== undefined) && (
                            <div className="mt-3 max-w-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Milestone Progress
                                    </span>
                                    <span className={`text-[11px] font-black font-mono ${theme.text}`}>
                                        {progressPercent}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${progressPercent}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full rounded-full ${theme.barBg} ${theme.glow}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Founder / Team Note */}
                        {phase.personalNote && (
                            <div className="mt-4 p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-900/20 max-w-xl">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Star size={11} className="text-amber-500 fill-amber-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                        Founder&apos;s Dispatch
                                    </span>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic">
                                    &ldquo;{phase.personalNote}&rdquo;
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status, Raised & Actions */}
                <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800/80">
                    {phase.showFundraising && (
                        <div className="text-left md:text-right">
                            <div className="text-[9px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">
                                Direct Backing
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-[#E2136E] dark:text-pink-400 font-mono tracking-tight">
                                ৳{supporters.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {/* Supporter accordion toggle */}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 dark:bg-[#161620] hover:bg-gray-100 dark:hover:bg-[#1c1c28] text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-gray-200/80 dark:border-gray-800 shadow-2xs"
                        >
                            <Users size={13} />
                            <span>
                                {supporters.length} {supporters.length === 1 ? "Patron" : "Patrons"}
                            </span>
                            <ChevronDown
                                size={13}
                                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Back this phase CTA */}
                        {phase.status !== "Complete" && (
                            <button
                                onClick={onBackPhase}
                                className="flex items-center gap-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary dark:text-blue-400 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                title="Back this specific phase"
                            >
                                <Heart size={12} className="fill-current text-rose-500" />
                                <span>Back Phase</span>
                            </button>
                        )}
                    </div>

                    {isComplete && (
                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <Check size={12} strokeWidth={3} /> Verified Complete
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable Supporters Drawer */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden bg-gray-50/60 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800"
                    >
                        <div className="p-5 sm:p-7 md:p-8">
                            <div className="flex items-center justify-between gap-3 mb-6">
                                <div className="relative flex-1 max-w-md">
                                    <Search
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search patrons by name..."
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400"
                                    />
                                </div>
                                <button
                                    onClick={() => setSortTop(!sortTop)}
                                    className="p-2 sm:px-3 sm:py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#161620] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shadow-2xs flex items-center gap-1 text-[11px] font-bold"
                                    title={sortTop ? "Sorting: Highest Amount" : "Sorting: Recent First"}
                                >
                                    <ArrowUpDown size={13} />
                                    <span className="hidden sm:inline">
                                        {sortTop ? "Top Amount" : "Recent"}
                                    </span>
                                </button>
                            </div>

                            {filteredSupporters.length === 0 ? (
                                <div className="text-center py-10 px-4 bg-white/70 dark:bg-[#161620]/50 rounded-2xl border border-gray-200/60 dark:border-gray-800 border-dashed">
                                    <Users size={24} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {searchQuery
                                            ? "No matching patrons found."
                                            : "Be the first pioneer to back this phase!"}
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            onClick={onBackPhase}
                                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-600 transition-colors"
                                        >
                                            <Heart size={13} className="fill-current" /> Back This Phase
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredSupporters.map((s) => {
                                        const roleMap: Record<string, string> = {
                                            founder: "Founder",
                                            advocate: "Advocate",
                                            patron: "Patron",
                                            supporter: "Supporter",
                                            builder: "Builder",
                                        };
                                        const badgeLabel =
                                            s.supporterBadgeLabel ||
                                            (s.role && roleMap[s.role]
                                                ? roleMap[s.role]
                                                : (s.amount || 0) >= 1000
                                                ? "Builder"
                                                : (s.amount || 0) >= 500
                                                ? "Patron"
                                                : "Friend");

                                        const badgeColors: Record<string, string> = {
                                            Founder:
                                                "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400",
                                            Builder:
                                                "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
                                            Patron:
                                                "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
                                            Friend:
                                                "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
                                            Pioneer:
                                                "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
                                            Believer:
                                                "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
                                            Advocate:
                                                "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400",
                                            Supporter:
                                                "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400",
                                        };

                                        const badgeClass =
                                            badgeColors[badgeLabel] ||
                                            "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";

                                        const dateFormatted = s.date?.seconds
                                            ? new Date(s.date.seconds * 1000).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "Pioneer";

                                        const collegeDisplay =
                                            s.collegeName ||
                                            (s.collegeId
                                                ? colleges.find((c) => c.id === s.collegeId)?.shortName
                                                : "");

                                        return (
                                            <div
                                                key={s.id}
                                                className="bg-white dark:bg-[#161620] border border-gray-200/70 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    {/* Top Row: Avatar & Name */}
                                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="relative shrink-0">
                                                                <div className="w-10 h-10 rounded-full border border-amber-400/50 shadow-xs overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-500 text-sm">
                                                                    {s.photoURL ? (
                                                                        <Image
                                                                            src={s.photoURL}
                                                                            alt={s.name || "Supporter"}
                                                                            width={40}
                                                                            height={40}
                                                                            className="w-full h-full object-cover"
                                                                            unoptimized
                                                                        />
                                                                    ) : (
                                                                        (s.name || "?").charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                {(s.isVerifiedSupporter ||
                                                                    s.status === "approved") && (
                                                                    <div
                                                                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161620] flex items-center justify-center shadow-xs"
                                                                        title="Verified Patron"
                                                                    >
                                                                        <Check
                                                                            size={9}
                                                                            className="text-white"
                                                                            strokeWidth={3}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                                                                    {s.name || "Anonymous Supporter"}
                                                                </h4>
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                                    {s.headline || "Community Contributor"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase shrink-0">
                                                            {dateFormatted}
                                                        </span>
                                                    </div>

                                                    {/* Academic Badges */}
                                                    {(collegeDisplay || s.batchOrDept) && (
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                            {collegeDisplay && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                                    <Building2 size={9} />
                                                                    {collegeDisplay}
                                                                </span>
                                                            )}
                                                            {s.batchOrDept && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                                    <GraduationCap size={9} />
                                                                    {s.batchOrDept}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Supporter Note */}
                                                    {s.message && (
                                                        <div className="pl-2.5 border-l-2 border-amber-400/60 py-0.5 mb-3 bg-amber-50/20 dark:bg-amber-950/10 rounded-r-lg">
                                                            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium italic line-clamp-2">
                                                                &ldquo;{s.message}&rdquo;
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer: Role and links */}
                                                <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 mt-1">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${badgeClass}`}
                                                    >
                                                        {badgeLabel}
                                                    </span>

                                                    <div className="flex items-center gap-1">
                                                        {s.socialLinks?.linkedin && (
                                                            <a
                                                                href={
                                                                    s.socialLinks.linkedin.startsWith("http")
                                                                        ? s.socialLinks.linkedin
                                                                        : `https://${s.socialLinks.linkedin}`
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                                title="LinkedIn"
                                                            >
                                                                <Linkedin size={12} />
                                                            </a>
                                                        )}
                                                        {s.socialLinks?.github && (
                                                            <a
                                                                href={
                                                                    s.socialLinks.github.startsWith("http")
                                                                        ? s.socialLinks.github
                                                                        : `https://${s.socialLinks.github}`
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                                                                title="GitHub"
                                                            >
                                                                <Github size={12} />
                                                            </a>
                                                        )}
                                                        {s.supporterProfileUrl ||
                                                        (s.userId && !s.isExternalSupporter) ? (
                                                            <Link
                                                                href={s.supporterProfileUrl || `/profile/${s.userId}`}
                                                                className="text-[10px] font-bold text-gray-500 hover:text-amber-600 dark:text-gray-400 flex items-center gap-0.5"
                                                            >
                                                                Profile <ExternalLink size={9} />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-400">
                                                                Verified ✓
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
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
   PAYMENT CARD COMPONENT
   ═══════════════════════════════════════════════════ */
function PaymentCard({
    giftAmount,
    setGiftAmount,
    onGiftSubmit,
    config,
    bkashEnabled = true,
    upayEnabled = true,
    nagadEnabled = true,
}: {
    giftAmount: string;
    setGiftAmount: (val: string) => void;
    onGiftSubmit: (method: "bKash" | "upay", amount: string) => void;
    config: typeof CONFIG & {
        bkashType?: string;
        upayType?: string;
        nagadType?: string;
        bkashNumber?: string;
        upayNumber?: string;
        nagadNumber?: string;
    };
    bkashEnabled?: boolean;
    upayEnabled?: boolean;
    nagadEnabled?: boolean;
}) {
    const isUpayEnabled = upayEnabled ?? nagadEnabled ?? true;
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();

    const copyToClipboard = (text: string, label: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            showToast(`${label} number copied to clipboard!`, "success");
            setTimeout(() => setCopied(false), 2200);
        }
    };

    const tabs: {
        id: "bkash" | "upay";
        label: string;
        subLabel: string;
        color: string;
        activeClass: string;
    }[] = [];
    if (bkashEnabled) {
        tabs.push({
            id: "bkash",
            label: "bKash",
            subLabel: config.bkashType || "Personal",
            color: "#E2136E",
            activeClass: "bg-[#E2136E] text-white shadow-md shadow-pink-500/20",
        });
    }
    if (isUpayEnabled) {
        tabs.push({
            id: "upay",
            label: "upay",
            subLabel: config.upayType || config.nagadType || "Personal",
            color: "#005BAC",
            activeClass:
                "bg-gradient-to-r from-[#005BAC] to-[#003B73] text-white shadow-md shadow-blue-600/20",
        });
    }

    const [activeTab, setActiveTab] = useState<"bkash" | "upay">("bkash");

    useEffect(() => {
        if (bkashEnabled && !isUpayEnabled) {
            setActiveTab("bkash");
        } else if (!bkashEnabled && isUpayEnabled) {
            setActiveTab("upay");
        }
    }, [bkashEnabled, isUpayEnabled]);

    if (tabs.length === 0) {
        return (
            <div className="w-full max-w-[480px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-3">
                    <Heart size={24} className="text-amber-500" />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                    Contributions Paused
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Payment gateways are currently being recalibrated. Please check back shortly.
                </p>
            </div>
        );
    }

    const currentNumber =
        activeTab === "bkash"
            ? config.bkashNumber || "01805107667"
            : config.upayNumber || config.nagadNumber || "01805107667";
    const currentType =
        activeTab === "bkash"
            ? config.bkashType || "Personal"
            : config.upayType || config.nagadType || "Personal";

    return (
        <div
            id="payment-card"
            className="w-full max-w-[460px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] border border-gray-200/80 dark:border-white/10 shadow-2xl shadow-black/10 overflow-hidden"
        >
            {/* Payment Method Selector Tabs */}
            {tabs.length > 1 ? (
                <div className="grid grid-cols-2 p-1.5 bg-gray-100/90 dark:bg-white/5 m-3 sm:m-4 mb-2 rounded-2xl gap-1.5">
                    {tabs.map((tab) => {
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full min-w-0 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-2 sm:px-3 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                                    isSelected
                                        ? tab.activeClass
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                                    <Image
                                        src={tab.id === "bkash" ? "/logos/bkash.svg" : "/logos/upay.png"}
                                        alt={tab.label}
                                        width={20}
                                        height={20}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="truncate">{tab.label}</span>
                                <span
                                    className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                        isSelected
                                            ? "bg-white/20 text-white"
                                            : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                                    }`}
                                >
                                    {tab.subLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="pt-4 px-6 pb-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-100 dark:bg-white/5 text-xs font-black text-gray-700 dark:text-gray-300">
                        <div className="w-5 h-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                            <Image
                                src={tabs[0]?.id === "bkash" ? "/logos/bkash.svg" : "/logos/upay.png"}
                                alt={tabs[0]?.label || "MFS"}
                                width={20}
                                height={20}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {tabs[0]?.label} ({tabs[0]?.subLabel})
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-6 pt-2 space-y-5">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Branded Digital Card */}
                        <div
                            className={`rounded-2xl sm:rounded-3xl p-5 text-white relative overflow-hidden shadow-lg ${
                                activeTab === "bkash"
                                    ? "bg-gradient-to-br from-[#E2136E] via-[#C91060] to-[#960B46]"
                                    : "bg-gradient-to-br from-[#005BAC] via-[#004B93] to-[#002D62]"
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-white/15 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />

                            <div className="relative z-10 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-[76px] h-10 px-2.5 bg-white rounded-xl flex items-center justify-center shadow-xs">
                                        <Image
                                            src={activeTab === "bkash" ? "/logos/bkash.svg" : "/logos/upay.png"}
                                            alt={activeTab === "bkash" ? "bKash" : "upay"}
                                            width={80}
                                            height={28}
                                            className="h-6 w-auto object-contain"
                                            priority
                                        />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                                            Recipient
                                        </p>
                                        <p className="text-xs sm:text-sm font-black text-white">
                                            {activeTab === "bkash" ? "bKash" : "upay"} {currentType}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[9px] font-bold text-white/80 uppercase">
                                        <span className="tracking-widest">Account Number</span>
                                        <span>Tap to copy</span>
                                    </div>
                                    <div
                                        onClick={() =>
                                            copyToClipboard(
                                                currentNumber,
                                                activeTab === "bkash" ? "bKash" : "upay"
                                            )
                                        }
                                        className="group/num flex items-center justify-between p-3 rounded-xl bg-black/15 hover:bg-black/25 backdrop-blur-sm border border-white/10 cursor-pointer transition-all active:scale-[0.99]"
                                        title="Click to copy number"
                                    >
                                        <p className="text-lg sm:text-xl font-mono font-black tracking-wider text-white">
                                            {currentNumber}
                                        </p>
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors">
                                            {copied ? (
                                                <>
                                                    <Check size={13} className="text-emerald-300" />
                                                    <span className="text-[10px] text-emerald-200">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={13} />
                                                    <span className="text-[10px]">Copy</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 text-[10px] text-white/80 font-medium border-t border-white/15">
                                    <span>Method: Send Money</span>
                                    <span>Ref: Your Name</span>
                                </div>
                            </div>
                        </div>

                        {/* Student-Friendly Preset Gift Chips */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                                Choose Contribution
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[100, 300, 500, 1000].map((amt) => {
                                    const isSelected = giftAmount === String(amt);
                                    return (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setGiftAmount(String(amt))}
                                            className={`py-2 rounded-xl text-xs font-black transition-all border ${
                                                isSelected
                                                    ? activeTab === "bkash"
                                                        ? "bg-[#E2136E] text-white border-transparent shadow-sm scale-[1.02]"
                                                        : "bg-gradient-to-r from-[#005BAC] to-[#003B73] text-white border-transparent shadow-sm scale-[1.02]"
                                                    : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-white/5 hover:border-primary/40"
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-base">
                                ৳
                            </span>
                            <input
                                type="number"
                                value={giftAmount}
                                onChange={(e) => setGiftAmount(e.target.value)}
                                placeholder="Or enter custom amount (e.g. 50, 200, 2500)..."
                                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-sm font-black placeholder:text-xs placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* CTA: I Sent a Gift */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() =>
                                onGiftSubmit(activeTab === "bkash" ? "bKash" : "upay", giftAmount)
                            }
                            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-blue-500/20 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
                        >
                            <Heart size={16} className="fill-current text-[#E63946] animate-pulse" />
                            <span>I Have Sent a Gift</span>
                        </motion.button>

                        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider pb-1">
                            Verified on the Vision Roadmap with a permanent patron badge
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HOW TO SEND INSTRUCTIONS COMPONENT
   ═══════════════════════════════════════════════════ */
function HowToSend({
    bkashNumber = "01805107667",
    upayNumber = "01805107667",
}: {
    bkashNumber?: string;
    upayNumber?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [guideTab, setGuideTab] = useState<"bkash" | "upay">("bkash");

    return (
        <div className="bg-white dark:bg-[#111118] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                            How to Send Money via bKash & upay
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            Step-by-step instructions in English & বাংলা
                        </p>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${
                        expanded ? "rotate-180" : ""
                    }`}
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
                        <div className="px-5 sm:px-6 pb-6 border-t border-gray-100 dark:border-white/5 pt-5 space-y-5">
                            <div className="grid grid-cols-2 p-1.5 bg-gray-100 dark:bg-white/5 rounded-xl max-w-xs gap-1.5">
                                <button
                                    onClick={() => setGuideTab("bkash")}
                                    className={`w-full min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                                        guideTab === "bkash"
                                            ? "bg-[#E2136E] text-white shadow-xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    <div className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                                        <Image
                                            src="/logos/bkash.svg"
                                            alt="bKash"
                                            width={16}
                                            height={12}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span>bKash Guide</span>
                                </button>
                                <button
                                    onClick={() => setGuideTab("upay")}
                                    className={`w-full min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                                        guideTab === "upay"
                                            ? "bg-gradient-to-r from-[#005BAC] to-[#003B73] text-white shadow-xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    <div className="w-4 h-4 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                                        <Image
                                            src="/logos/upay.png"
                                            alt="upay"
                                            width={16}
                                            height={16}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span>upay Guide</span>
                                </button>
                            </div>

                            {guideTab === "bkash" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                                    {/* English Instructions */}
                                    <div className="space-y-2.5">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            English Instructions (bKash)
                                        </h4>
                                        <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                            {[
                                                { s: "1", t: <>Open the <strong className="text-gray-900 dark:text-white">bKash</strong> app on your smartphone</> },
                                                { s: "2", t: <>Tap <strong className="text-gray-900 dark:text-white">&quot;Send Money&quot;</strong></> },
                                                { s: "3", t: <>Enter recipient number: <strong className="text-[#E2136E] dark:text-pink-400 font-mono">{bkashNumber}</strong></> },
                                                { s: "4", t: <>Enter the amount you wish to contribute</> },
                                                { s: "5", t: <>In the <strong className="text-gray-900 dark:text-white">Reference</strong> field, enter your name</> },
                                                { s: "6", t: <>Confirm with your bKash PIN</> },
                                                { s: "7", t: <>Copy and save the <strong className="text-gray-900 dark:text-white">Transaction ID (TrxID)</strong> to verify below</> },
                                            ].map((item) => (
                                                <li key={item.s} className="flex gap-2.5 items-start">
                                                    <span className="shrink-0 w-4 h-4 rounded-full bg-pink-100 dark:bg-pink-900/40 text-[#E2136E] dark:text-pink-400 flex items-center justify-center text-[9px] font-black mt-0.5">
                                                        {item.s}
                                                    </span>
                                                    <span>{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Bengali Instructions */}
                                    <div className="space-y-2.5">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            বাংলা নির্দেশিকা (বিকাশ)
                                        </h4>
                                        <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400 font-bengali">
                                            {[
                                                { s: "১", t: <>আপনার ফোনে <strong className="text-gray-900 dark:text-white">বিকাশ</strong> অ্যাপ ওপেন করুন</> },
                                                { s: "২", t: <><strong className="text-gray-900 dark:text-white">&quot;সেন্ড মানি&quot;</strong> অপশন সিলেক্ট করুন</> },
                                                { s: "৩", t: <>নম্বর দিন: <strong className="text-[#E2136E] dark:text-pink-400 font-mono font-english">{bkashNumber}</strong></> },
                                                { s: "৪", t: <>আপনার অনুদানের পরিমাণ লিখুন</> },
                                                { s: "৫", t: <><strong className="text-gray-900 dark:text-white">রেফারেন্স</strong> এ আপনার নাম লিখুন</> },
                                                { s: "৬", t: <>পিন দিয়ে সেন্ড মানি কনফার্ম করুন</> },
                                                { s: "৭", t: <><strong className="text-gray-900 dark:text-white">ট্রানজ্যাকশন আইডি (TrxID)</strong> কপি করে নিচে জমা দিন</> },
                                            ].map((item) => (
                                                <li key={item.s} className="flex gap-2.5 items-start">
                                                    <span className="shrink-0 w-4 h-4 rounded-full bg-pink-100 dark:bg-pink-900/40 text-[#E2136E] dark:text-pink-400 flex items-center justify-center text-[9px] font-black mt-0.5 font-english">
                                                        {item.s}
                                                    </span>
                                                    <span>{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                                    {/* English Instructions */}
                                    <div className="space-y-2.5">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            English Instructions (upay)
                                        </h4>
                                        <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                            {[
                                                { s: "1", t: <>Open your <strong className="text-gray-900 dark:text-white">upay</strong> app</> },
                                                { s: "2", t: <>Tap <strong className="text-gray-900 dark:text-white">&quot;Send Money&quot;</strong></> },
                                                { s: "3", t: <>Enter recipient number: <strong className="text-[#005BAC] dark:text-blue-400 font-mono">{upayNumber}</strong></> },
                                                { s: "4", t: <>Enter your contribution amount</> },
                                                { s: "5", t: <>In the <strong className="text-gray-900 dark:text-white">Reference</strong> field, enter your name</> },
                                                { s: "6", t: <>Confirm with your upay PIN</> },
                                                { s: "7", t: <>Save the <strong className="text-gray-900 dark:text-white">Transaction ID (TxnID)</strong> to verify below</> },
                                            ].map((item) => (
                                                <li key={item.s} className="flex gap-2.5 items-start">
                                                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#005BAC] dark:text-blue-400 flex items-center justify-center text-[9px] font-black mt-0.5">
                                                        {item.s}
                                                    </span>
                                                    <span>{item.t}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Bengali Instructions */}
                                    <div className="space-y-2.5">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            বাংলা নির্দেশিকা (উপায়)
                                        </h4>
                                        <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400 font-bengali">
                                            {[
                                                { s: "১", t: <>আপনার ফোনে <strong className="text-gray-900 dark:text-white">উপায়</strong> অ্যাপ ওপেন করুন</> },
                                                { s: "২", t: <><strong className="text-gray-900 dark:text-white">&quot;সেন্ড মানি&quot;</strong> অপশন বেছে নিন</> },
                                                { s: "৩", t: <>নম্বর দিন: <strong className="text-[#005BAC] dark:text-blue-400 font-mono font-english">{upayNumber}</strong></> },
                                                { s: "৪", t: <>অনুদানের পরিমাণ লিখুন</> },
                                                { s: "৫", t: <><strong className="text-gray-900 dark:text-white">রেফারেন্স</strong> এ আপনার নাম লিখুন</> },
                                                { s: "৬", t: <>উপায় পিন দিয়ে কনফার্ম করুন</> },
                                                { s: "৭", t: <><strong className="text-gray-900 dark:text-white">ট্রানজ্যাকশন আইডি</strong> কপি করে নিচে জমা দিন</> },
                                            ].map((item) => (
                                                <li key={item.s} className="flex gap-2.5 items-start">
                                                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#005BAC] dark:text-blue-400 flex items-center justify-center text-[9px] font-black mt-0.5 font-english">
                                                        {item.s}
                                                    </span>
                                                    <span>{item.t}</span>
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
   COMMUNITY HELP DESK & FAQS
   ═══════════════════════════════════════════════════ */
function HelpDeskSection({
    officialSettings,
}: {
    officialSettings: FirestoreOfficialSettings | null;
}) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            q: "How do I get the Verified Supporter badge?",
            a: "Send any gift amount via bKash or upay, then click 'I Have Sent a Gift' to submit your Transaction ID and name. Our admin team will verify the payment and immediately award your golden Supporter Badge and roadmap spotlight.",
        },
        {
            q: "Can students contribute smaller amounts?",
            a: "Absolutely! TTC Network is built by students, for students. Contributions as humble as ৳50 or ৳100 directly help cover our server uptime and database costs. Every single taka matters.",
        },
        {
            q: "Where does the contribution money go?",
            a: "100% of community contributions go directly into server hosting, Firebase database operations, file storage bandwidth for study materials, domain renewal, and future mobile app development. There is zero corporate profit.",
        },
        {
            q: "How do I get my campus account or story verified?",
            a: "Make sure your college, department, and session are accurately filled out in your Profile. You can also reach out to your college's Campus Manager or email us at contact@ttcnetwork.com for swift verification.",
        },
        {
            q: "How do I report a platform bug or request a feature?",
            a: "You can click the WhatsApp or Email button below to chat directly with our team, or connect with developer Sakib. We respond to all student and educator suggestions promptly.",
        },
    ];

    return (
        <div id="help-desk" className="max-w-5xl mx-auto scroll-mt-24">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3">
                    <LifeBuoy size={13} /> Help Desk & Assistance
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    Frequently Asked Questions
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium mt-2 max-w-xl mx-auto">
                    Quick answers regarding platform contributions, verification, and technical support.
                </p>
            </div>

            {/* FAQs Accordion */}
            <div className="space-y-3 mb-10">
                {faqs.map((faq, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div
                            key={i}
                            className="bg-white dark:bg-[#111118] border border-gray-200/80 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs"
                        >
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : i)}
                                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <HelpCircle size={16} className="text-primary shrink-0" />
                                    {faq.q}
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={`text-gray-400 shrink-0 transition-transform duration-300 ${
                                        isOpen ? "rotate-180 text-primary" : ""
                                    }`}
                                />
                            </button>
                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed border-t border-gray-100 dark:border-white/5">
                                            {faq.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Official Links & Contact Card (Synced with Homepage & Admin Panel) */}
            {officialSettings && <OfficialContactCard settings={officialSettings} />}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN SUPPORT PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function SupportPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";

    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showGiftForm, setShowGiftForm] = useState(false);
    const [giftAmount, setGiftAmount] = useState("");
    const [giftTxId, setGiftTxId] = useState("");
    const [giftService, setGiftService] = useState<"bKash" | "upay">("bKash");
    const [giftName, setGiftName] = useState("");
    const [giftCollegeId, setGiftCollegeId] = useState("");
    const [giftBatch, setGiftBatch] = useState("");
    const [giftMessage, setGiftMessage] = useState("");
    const [giftPhaseId, setGiftPhaseId] = useState("");
    const [giftSubmitted, setGiftSubmitted] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [thankYouData, setThankYouData] = useState({ name: "Supporter", amount: 1000, date: "" });

    const [supporters, setSupporters] = useState<(FirestoreGift & { id: string })[]>([]);
    const [settings, setSettings] = useState<SupportSettings>({
        fundingOpen: true,
        fundingMessage: "Help us build the ultimate university platform.",
        supportPageActive: true,
    });
    const [phases, setPhases] = useState<(SupportPhase & { id: string })[]>([]);

    const [officialSettings, setOfficialSettings] = useState<FirestoreOfficialSettings | null>(null);
    const [tempOfficialSettings, setTempOfficialSettings] = useState<FirestoreOfficialSettings | null>(null);

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [tempSettings, setTempSettings] = useState<Partial<SupportSettings>>({});

    const activeConfig = {
        bkashNumber: settings.bkashNumber || CONFIG.bkashNumber,
        bkashType: settings.bkashType || CONFIG.bkashType,
        bkashEnabled: settings.bkashEnabled ?? true,
        upayNumber: settings.upayNumber || settings.nagadNumber || CONFIG.upayNumber,
        upayType: settings.upayType || settings.nagadType || CONFIG.upayType,
        upayEnabled: settings.upayEnabled ?? settings.nagadEnabled ?? true,
        nagadNumber: settings.upayNumber || settings.nagadNumber || CONFIG.upayNumber,
        nagadType: settings.upayType || settings.nagadType || CONFIG.upayType,
        nagadEnabled: settings.upayEnabled ?? settings.nagadEnabled ?? true,
        raised: settings.raised ?? CONFIG.raised,
        goal: settings.goal ?? CONFIG.goal,
        supporters: String(settings.supporters ?? CONFIG.supporters),
        currencySymbol: settings.currencySymbol || CONFIG.currencySymbol,
    };

    // Auto-fill logged in user info
    useEffect(() => {
        if (profile) {
            if (!giftName && profile.displayName) setGiftName(profile.displayName);
            if (!giftCollegeId && profile.collegeId) setGiftCollegeId(profile.collegeId);
        }
    }, [profile, giftName, giftCollegeId]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const promises: Promise<any>[] = [updateSupportSettings(tempSettings)];
            if (tempOfficialSettings) {
                promises.push(updateOfficialSettings(tempOfficialSettings));
            }
            await Promise.all(promises);
            setSettings((prev) => ({ ...prev, ...tempSettings }));
            if (tempOfficialSettings) {
                setOfficialSettings(tempOfficialSettings);
            }
            setIsEditingSettings(false);
            showToast("Settings updated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to save settings.", "error");
        }
        setIsSaving(false);
    };

    useEffect(() => {
        setMounted(true);
        getApprovedGifts().then(setSupporters).catch(console.error);
        getSupportSettings()
            .then(setSettings)
            .catch((err) => console.error("[SupportPage] Error fetching settings:", err));
        getSupportPhases()
            .then((allPhases) => {
                const sorted = [...(allPhases || [])].sort(
                    (a, b) => (a.order || 0) - (b.order || 0)
                );
                setPhases(sorted);
            })
            .catch((err) => console.error("[SupportPage] Error fetching phases:", err));

        const unsubOfficial = subscribeOfficialSettings((st) => {
            setOfficialSettings(st);
            setTempOfficialSettings((prev) => prev || st);
        });

        return () => {
            unsubOfficial();
        };
    }, []);

    const handleOpenGiftModal = (method?: "bKash" | "upay", amt?: string, phaseId?: string) => {
        if (requireVerification("support the platform")) {
            if (method) setGiftService(method);
            if (amt) setGiftAmount(amt);
            if (phaseId) setGiftPhaseId(phaseId);
            setShowGiftForm(true);
        }
    };

    const handleGiftSubmit = async () => {
        if (!giftTxId.trim() || !giftAmount || !giftName.trim()) return;

        setGiftSubmitted(true);
        try {
            const selectedCollege = colleges.find((c) => c.id === giftCollegeId);
            await submitGift({
                name: giftName.trim(),
                amount: Number(giftAmount),
                txId: giftTxId.trim(),
                method: giftService,
                phaseId: giftPhaseId || undefined,
                message: giftMessage.trim() || undefined,
                collegeName: selectedCollege ? selectedCollege.shortName : undefined,
                collegeId: giftCollegeId || undefined,
                batchOrDept: giftBatch.trim() || undefined,
            } as any);

            const todayFormatted = new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
            });

            setThankYouData({
                name: giftName.trim(),
                amount: Number(giftAmount) || 1000,
                date: todayFormatted,
            });

            setShowGiftForm(false);
            setShowThankYou(true);
            setGiftTxId("");
            setGiftMessage("");
            setGiftBatch("");
        } catch (err) {
            console.error(err);
            showToast("Failed to submit verification. Please try again.", "error");
        }
        setGiftSubmitted(false);
    };

    const scrollToAnchor = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
        }
    };

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
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                            Support Currently Restricted
                        </h1>
                        <p className="text-gray-500 font-medium mt-3 leading-relaxed">
                            The support page is temporarily unavailable. We are currently calibrating our roadmap and targets. Please check back later.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                    >
                        Back to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    /* Admin Support Hub Widget */
    const AdminSupportPanel = () => {
        const isBkashOn = (tempSettings.bkashEnabled ?? settings.bkashEnabled) ?? true;
        const isUpayOn =
            (tempSettings.upayEnabled ??
                tempSettings.nagadEnabled ??
                settings.upayEnabled ??
                settings.nagadEnabled) ??
            true;

        return (
            <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-[90] w-84 sm:w-96 max-w-[92vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                            <Shield size={16} />
                        </div>
                        <div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                                Admin Hub
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                Support & MFS Controls
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditingSettings(!isEditingSettings)}
                        className={`p-2 rounded-xl transition-all ${
                            isEditingSettings
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-gray-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500"
                        }`}
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
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            MFS Gateways
                                        </label>
                                    </div>

                                    {/* bKash Config */}
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-gray-100 dark:border-white/5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                bKash
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        bkashEnabled: !isBkashOn,
                                                    }))
                                                }
                                                className={`relative w-8 h-4.5 rounded-full transition-all duration-300 ${
                                                    isBkashOn ? "bg-[#E2136E]" : "bg-gray-300 dark:bg-gray-700"
                                                }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                                                        isBkashOn ? "translate-x-3.5" : "translate-x-0"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                value={tempSettings.bkashNumber ?? activeConfig.bkashNumber}
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        bkashNumber: e.target.value,
                                                    }))
                                                }
                                                className="col-span-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono font-bold"
                                            />
                                            <select
                                                value={tempSettings.bkashType ?? activeConfig.bkashType}
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        bkashType: e.target.value as "Personal" | "Merchant",
                                                    }))
                                                }
                                                className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold"
                                            >
                                                <option value="Personal">Personal</option>
                                                <option value="Merchant">Merchant</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Upay Config */}
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-gray-100 dark:border-white/5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                upay
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        upayEnabled: !isUpayOn,
                                                        nagadEnabled: !isUpayOn,
                                                    }))
                                                }
                                                className={`relative w-8 h-4.5 rounded-full transition-all duration-300 ${
                                                    isUpayOn ? "bg-[#005BAC]" : "bg-gray-300 dark:bg-gray-700"
                                                }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${
                                                        isUpayOn ? "translate-x-3.5" : "translate-x-0"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                value={
                                                    tempSettings.upayNumber ??
                                                    tempSettings.nagadNumber ??
                                                    activeConfig.upayNumber
                                                }
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        upayNumber: e.target.value,
                                                        nagadNumber: e.target.value,
                                                    }))
                                                }
                                                className="col-span-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono font-bold"
                                            />
                                            <select
                                                value={
                                                    tempSettings.upayType ??
                                                    tempSettings.nagadType ??
                                                    activeConfig.upayType
                                                }
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        upayType: e.target.value as "Personal" | "Merchant",
                                                        nagadType: e.target.value as "Personal" | "Merchant",
                                                    }))
                                                }
                                                className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold"
                                            >
                                                <option value="Personal">Personal</option>
                                                <option value="Merchant">Merchant</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Goals Target */}
                                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                                Raised (৳)
                                            </label>
                                            <input
                                                type="number"
                                                value={tempSettings.raised ?? activeConfig.raised}
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        raised: Number(e.target.value),
                                                    }))
                                                }
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                                Goal (৳)
                                            </label>
                                            <input
                                                type="number"
                                                value={tempSettings.goal ?? activeConfig.goal}
                                                onChange={(e) =>
                                                    setTempSettings((prev) => ({
                                                        ...prev,
                                                        goal: Number(e.target.value),
                                                    }))
                                                }
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Official Links & Contact Controls */}
                                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                            <Globe size={12} className="text-emerald-500" />
                                            Official Links & Contact
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tempOfficialSettings?.isVisible ?? officialSettings?.isVisible ?? true}
                                                onChange={(e) =>
                                                    setTempOfficialSettings((prev) => ({
                                                        ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                        isVisible: e.target.checked,
                                                    }))
                                                }
                                                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500"
                                            />
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                Visible
                                            </span>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                Section Title
                                            </label>
                                            <input
                                                type="text"
                                                value={tempOfficialSettings?.title ?? officialSettings?.title ?? ""}
                                                onChange={(e) =>
                                                    setTempOfficialSettings((prev) => ({
                                                        ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                        title: e.target.value,
                                                    }))
                                                }
                                                placeholder="Official TTC Network"
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                Tagline
                                            </label>
                                            <input
                                                type="text"
                                                value={tempOfficialSettings?.tagline ?? officialSettings?.tagline ?? ""}
                                                onChange={(e) =>
                                                    setTempOfficialSettings((prev) => ({
                                                        ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                        tagline: e.target.value,
                                                    }))
                                                }
                                                placeholder="Connect, follow, or reach out"
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                Official Email
                                            </label>
                                            <input
                                                type="email"
                                                value={tempOfficialSettings?.email ?? officialSettings?.email ?? ""}
                                                onChange={(e) =>
                                                    setTempOfficialSettings((prev) => ({
                                                        ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                        email: e.target.value,
                                                    }))
                                                }
                                                placeholder="contact@ttcnetwork.com"
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                Trust Line (Badge Text)
                                            </label>
                                            <input
                                                type="text"
                                                value={tempOfficialSettings?.trustLine ?? officialSettings?.trustLine ?? ""}
                                                onChange={(e) =>
                                                    setTempOfficialSettings((prev) => ({
                                                        ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                        trustLine: e.target.value,
                                                    }))
                                                }
                                                placeholder="OFFICIAL COMMUNICATION CHANNELS"
                                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-xs font-bold"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                    Website URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tempOfficialSettings?.websiteUrl ?? officialSettings?.websiteUrl ?? ""}
                                                    onChange={(e) =>
                                                        setTempOfficialSettings((prev) => ({
                                                            ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                            websiteUrl: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="https://ttcnetwork.xyz"
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-[11px] font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                    Facebook URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tempOfficialSettings?.facebookUrl ?? officialSettings?.facebookUrl ?? ""}
                                                    onChange={(e) =>
                                                        setTempOfficialSettings((prev) => ({
                                                            ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                            facebookUrl: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="https://facebook.com/..."
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-[11px] font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                    Twitter / X URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tempOfficialSettings?.twitterUrl ?? officialSettings?.twitterUrl ?? ""}
                                                    onChange={(e) =>
                                                        setTempOfficialSettings((prev) => ({
                                                            ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                            twitterUrl: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="https://x.com/..."
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-[11px] font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                                                    LinkedIn URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tempOfficialSettings?.linkedinUrl ?? officialSettings?.linkedinUrl ?? ""}
                                                    onChange={(e) =>
                                                        setTempOfficialSettings((prev) => ({
                                                            ...(prev || officialSettings || ({} as FirestoreOfficialSettings)),
                                                            linkedinUrl: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="https://linkedin.com/..."
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-lg text-[11px] font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSaving ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Save size={13} />
                                    )}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-32 sm:pb-24 overflow-x-hidden selection:bg-primary selection:text-white min-h-screen">
            {mounted && isAdmin && <AdminSupportPanel />}

            {/* ═══════════════════════════════════════════════════
               HERO & ANCHOR NAVIGATION HEADER
               ═══════════════════════════════════════════════════ */}
            <header className="relative pt-10 sm:pt-14 pb-8 sm:pb-12 overflow-hidden border-b border-gray-200/60 dark:border-white/5">
                <MeshGradient />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 rounded-full">
                            <Sparkles size={14} className="text-primary dark:text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-400">
                                100% Student-Built & Open Community
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight font-sora">
                            Support & Empower{" "}
                            <span className="bg-gradient-to-r from-[#1A56DB] via-blue-600 to-[#1D9BF0] dark:from-[#3B82F6] dark:via-[#60A5FA] dark:to-[#93C5FD] bg-clip-text text-transparent">
                                TTC Network
                            </span>
                        </h1>

                        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
                            Connecting 14 Teachers&apos; Training Colleges across Bangladesh. Built independently with passion. Back our open-source vision roadmap, become a recognized patron, or get instant assistance.
                        </p>

                        {/* Quick Anchor Navigation Pills */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => scrollToAnchor("vision-roadmap")}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 text-xs font-bold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <Compass size={14} className="text-primary dark:text-blue-400" />
                                <span>Vision Roadmap</span>
                            </button>
                            <button
                                onClick={() => scrollToAnchor("payment-card")}
                                className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-blue-600 text-xs font-black shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                            >
                                <Heart size={14} className="fill-current text-rose-300" />
                                <span>Send a Gift</span>
                            </button>
                            <button
                                onClick={() => scrollToAnchor("why-support")}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 text-xs font-bold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <Sparkles size={14} className="text-amber-500" />
                                <span>Why Support</span>
                            </button>
                            <button
                                onClick={() => scrollToAnchor("help-desk")}
                                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 text-xs font-bold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <LifeBuoy size={14} className="text-emerald-500" />
                                <span>Help & FAQs</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════
               1. VISION ROADMAP (FIRST FOCUS SECTION)
               ═══════════════════════════════════════════════════ */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-12 relative z-10">
                <VisionRoadmap
                    phases={phases}
                    supporters={supporters}
                    onBackPhase={(phaseId) => handleOpenGiftModal(undefined, undefined, phaseId)}
                />
            </section>

            {/* ═══════════════════════════════════════════════════
               2. "KEEP THE DREAM ALIVE" & MFS PAYMENT STATION
               ═══════════════════════════════════════════════════ */}
            <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-24 overflow-hidden border-t border-b border-gray-200/70 dark:border-white/5">
                <MeshGradient />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-center justify-between">
                        {/* Left: Mission & Campaign Target */}
                        <div className="flex-1 space-y-8">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 dark:bg-rose-400/10 border border-rose-500/20 dark:border-rose-400/20 rounded-full">
                                    <Heart size={13} className="text-rose-600 dark:text-rose-400 fill-rose-600" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                                        Keep The Dream Alive
                                    </span>
                                </div>
                                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight font-sora">
                                    Your Contribution Empowers Every College.
                                </h2>
                                <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
                                    TTC Network operates independently without government grants or corporate sponsors. Whether you are a student sending ৳50 or an alumnus sending ৳2,000, your backing directly maintains server speed, cloud bandwidth, and study circle tools.
                                </p>
                            </div>

                            {/* Stat Pills */}
                            <div className="flex flex-wrap gap-3">
                                <StatPill
                                    label="Raised"
                                    value={`${activeConfig.currencySymbol}${activeConfig.raised.toLocaleString()}`}
                                    icon={Wallet}
                                    delay={0.1}
                                />
                                <StatPill
                                    label="Supporters"
                                    value={activeConfig.supporters}
                                    icon={Users}
                                    delay={0.2}
                                />
                                <StatPill
                                    label="Colleges Connected"
                                    value="14 TTCs"
                                    icon={Building2}
                                    delay={0.3}
                                />
                            </div>

                            {/* Campaign Shimmer Progress Bar */}
                            <div className="max-w-lg">
                                <ShimmerProgressBar
                                    raised={activeConfig.raised}
                                    goal={activeConfig.goal}
                                    symbol={activeConfig.currencySymbol}
                                />
                            </div>
                        </div>

                        {/* Right: Payment Card Widget */}
                        <div className="w-full lg:w-auto flex justify-center">
                            <PaymentCard
                                giftAmount={giftAmount}
                                setGiftAmount={setGiftAmount}
                                onGiftSubmit={(method, amt) => handleOpenGiftModal(method, amt)}
                                config={activeConfig}
                                bkashEnabled={activeConfig.bkashEnabled}
                                upayEnabled={activeConfig.upayEnabled}
                            />
                        </div>
                    </div>

                    {/* Step-by-Step Payment Instructions */}
                    <div className="mt-12 max-w-5xl mx-auto">
                        <HowToSend
                            bkashNumber={activeConfig.bkashNumber}
                            upayNumber={activeConfig.upayNumber}
                        />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
               3. WHY SUPPORT? (BENTO GRID)
               ═══════════════════════════════════════════════════ */}
            <section id="why-support" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10 scroll-mt-24">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary dark:text-blue-400 mb-2">
                        Transparent Commitments
                    </h2>
                    <h3 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        Why Your Gift Matters
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-2">
                        Here is exactly where every taka of your contribution is invested.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            title: "Hosting & Infrastructure",
                            desc: "High-speed Next.js hosting, Firestore cloud database reads, and CDN bandwidth keeping academic files online 24/7 with 99.9% uptime.",
                            icon: Server,
                            color: "bg-blue-500",
                        },
                        {
                            title: "Feature Innovation",
                            desc: "Continuous engineering of high-impact tools: real-time study hubs, college notice broadcasting, PWA offline reading, and verified profiles.",
                            icon: Palette,
                            color: "bg-purple-500",
                        },
                        {
                            title: "Community & Independence",
                            desc: "100% student-led and ad-free. Zero paywalls or invasive tracking. Built with love and dedicated solely to trainee teachers and educators.",
                            icon: Heart,
                            color: "bg-rose-500",
                        },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="p-7 sm:p-8 bg-white dark:bg-slate-900 border border-gray-200/70 dark:border-white/5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-start gap-5"
                        >
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                                <div className={`w-full h-full rounded-2xl ${item.color} flex items-center justify-center shadow-md`}>
                                    <item.icon size={20} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {item.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
               4. HELP DESK, FAQS & DIRECT ASSISTANCE
               ═══════════════════════════════════════════════════ */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 border-t border-gray-200/70 dark:border-white/5">
                <HelpDeskSection officialSettings={officialSettings} />
            </section>

            {/* ═══════════════════════════════════════════════════
               GIFT VERIFICATION FORM MODAL
               ═══════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showGiftForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
                        onClick={() => !giftSubmitted && setShowGiftForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-[#111118] rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden border border-gray-200 dark:border-gray-800 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {giftSubmitted ? (
                                <div className="p-8 sm:p-10 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} className="text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Submitted for Verification!
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium leading-relaxed">
                                        Our admin team will verify your transaction and approve your patron spotlight. Thank you for keeping TTC Network alive! 💛
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                                                    <CheckCircle2 size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                                        Verify Your Gift
                                                    </h2>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Claim your Supporter Badge & roadmap spotlight
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowGiftForm(false)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                aria-label="Close"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                        {/* Name */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                Your Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={giftName}
                                                onChange={(e) => setGiftName(e.target.value)}
                                                placeholder="e.g. Sakib Ahmed"
                                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 font-medium"
                                            />
                                        </div>

                                        {/* Amount & Method in 2 columns */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                    Amount Sent (৳) *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={giftAmount}
                                                    onChange={(e) => setGiftAmount(e.target.value)}
                                                    placeholder="e.g. 500"
                                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 font-mono font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                    Payment Method *
                                                </label>
                                                <select
                                                    value={giftService}
                                                    onChange={(e) =>
                                                        setGiftService(e.target.value as "bKash" | "upay")
                                                    }
                                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                                                >
                                                    <option value="bKash">bKash</option>
                                                    <option value="upay">upay</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Transaction ID */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                Transaction ID (TrxID / TxnID) *
                                            </label>
                                            <input
                                                type="text"
                                                value={giftTxId}
                                                onChange={(e) => setGiftTxId(e.target.value)}
                                                placeholder="e.g. TXN9K3M8B2P5"
                                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold placeholder:text-gray-400 uppercase"
                                            />
                                        </div>

                                        {/* College & Batch (Optional) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                    Your College (Optional)
                                                </label>
                                                <select
                                                    value={giftCollegeId}
                                                    onChange={(e) => setGiftCollegeId(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                                >
                                                    <option value="">Select your college...</option>
                                                    {colleges.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.shortName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                    Batch / Session (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={giftBatch}
                                                    onChange={(e) => setGiftBatch(e.target.value)}
                                                    placeholder="e.g. B.Ed 2023-24"
                                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400 font-medium"
                                                />
                                            </div>
                                        </div>

                                        {/* Supported Phase Selector */}
                                        {phases.length > 0 && (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                    Phase to Back (Optional)
                                                </label>
                                                <select
                                                    value={giftPhaseId}
                                                    onChange={(e) => setGiftPhaseId(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                                >
                                                    <option value="">Auto-assign to Active Phase</option>
                                                    {phases.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.title} ({p.status})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Optional Personal Note / Quote */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                                Encouraging Quote / Note (Optional)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={giftMessage}
                                                onChange={(e) => setGiftMessage(e.target.value)}
                                                placeholder="Leave a short message for the community (e.g. Proud of TTC Network!)..."
                                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400 font-medium resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={handleGiftSubmit}
                                            disabled={!giftName.trim() || !giftAmount || !giftTxId.trim()}
                                            className="w-full py-3.5 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99] bg-gradient-to-r from-[#1A56DB] via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm"
                                        >
                                            <Send size={15} />
                                            <span>Submit for Verification</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════
               THANK YOU CARD MODAL
               ═══════════════════════════════════════════════════ */}
            <ThankYouCard
                show={showThankYou}
                onClose={() => setShowThankYou(false)}
                name={thankYouData.name}
                amount={thankYouData.amount}
                date={thankYouData.date}
            />
        </div>
    );
}
