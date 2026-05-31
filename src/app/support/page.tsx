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
    CreditCard,
    QrCode,
    ExternalLink,
    Banknote
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getApprovedGifts, getSupportSettings, getSupportPhases, getBuilderSettings, submitGift, updateSupportSettings, type FirestoreGift, type SupportSettings, type SupportPhase, type FirestoreBuilderSettings } from "@/lib/firestore";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import BuilderPopupModal from "@/components/BuilderPopupModal";

const CONFIG = {
    stripeLink: "https://donate.stripe.com/test_14A9AU2l3g027rq8V12cg00",
    cryptoWallet: "0xCa78EFEda896070E997BbA0c82deA12a5ca7DEc3",
    bkashNumber: "01805107667",
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
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
            <motion.div 
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/4 -left-1/4 w-full h-full bg-cyan-400/30 rounded-full blur-[120px]" 
            />
            <motion.div 
                animate={{
                    x: [0, -80, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.5, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 -right-1/4 w-full h-full bg-purple-400/20 rounded-full blur-[150px]" 
            />
            <motion.div 
                animate={{
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/4 left-1/4 w-full h-full bg-amber-400/10 rounded-full blur-[100px]" 
            />
        </div>
    );
}

function StatPill({ label, value, icon: Icon, delay = 0 }: { label: string, value: string | number, icon: any, delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.8, type: "spring" }}
            className="flex items-center gap-3 px-5 py-3 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5"
        >
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-black text-gray-900 dark:text-white leading-none mt-1"
                >
                    {value}
                </motion.p>
            </div>
        </motion.div>
    );
}

function ShimmerProgressBar({ raised, goal }: { raised: number, goal: number }) {
    const percentage = Math.min(100, (raised / goal) * 100);
    
    return (
        <div className="w-full space-y-3">
            <div className="flex justify-between items-end">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Platform Growth Phase</p>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">{Math.round(percentage)}%</p>
            </div>
            <div className="h-4 w-full bg-gray-200/50 dark:bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 relative"
                >
                    <motion.div 
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    />
                </motion.div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Raised: {CONFIG.currencySymbol}{raised.toLocaleString()}</span>
                <span>Goal: {CONFIG.currencySymbol}{goal.toLocaleString()}</span>
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

const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
        Palette, Server, Smartphone, Globe, Users, Layers, 
        Hammer, Megaphone, Star, Wallet, Shield, Heart, Plus, Copy, Edit, Save, 
        BookOpen, Video, Calendar, Clock, Loader2, Sparkles, AlertTriangle, FileText, Pencil,
        Banknote
    };
    return icons[iconName] || Layers;
};

const UnderlineSVG = ({ color }: { color: string }) => (
    <motion.svg
        width="100%"
        height="12"
        viewBox="0 0 300 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute -bottom-2 left-0 w-full ${color}`}
    >
        <motion.path
            d="M5 9C50 3 150 3 295 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        />
    </motion.svg>
);

/* ═══════════════════════════════════════════════════
   ROLE HELPERS — map role to display label & style
   ═══════════════════════════════════════════════════ */
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    patron:    { label: "Patron",    color: "#C0392B", bg: "#fdf2f2", icon: <Shield size={12} /> },
    builder:   { label: "Builder",   color: "#059669", bg: "#ecfdf5", icon: <Hammer size={12} /> },
    friend:    { label: "Friend",    color: "#d97706", bg: "#fffbeb", icon: <Heart size={12} /> },
    supporter: { label: "Supporter", color: "#4b5563", bg: "#f3f4f6", icon: <Users size={12} /> }
};

/* ═══════════════════════════════════════════════════
   VERTICAL TIMELINE ROADMAP
   ═══════════════════════════════════════════════════ */
function VisionRoadmap({ phases, supporters }: { phases: (SupportPhase & { id: string })[], supporters: (FirestoreGift & { id: string })[] }) {
    return (
        <div className="py-24 max-w-5xl mx-auto">
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
                    The journey to connecting every TTCian. See what we've built, what we're building, and the heroes supporting each phase.
                </p>
            </div>

            <div className="space-y-8">
                {phases.map((phase, i) => (
                    <PhaseTimelineCard 
                        key={phase.id} 
                        phase={phase} 
                        index={i} 
                        supporters={supporters.filter(s => s.phaseId === phase.id)} 
                    />
                ))}
            </div>
        </div>
    );
}

function PhaseTimelineCard({ phase, index, supporters }: { phase: SupportPhase; index: number; supporters: (FirestoreGift & { id: string })[] }) {
    const [expanded, setExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortTop, setSortTop] = useState(true);

    const traction = phase.tractionLevel || 0;
    const isComplete = traction === 100 || phase.status === "Complete";
    const isInProgress = !isComplete && phase.status === "In Progress";

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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Founder's Note</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">
                                    "{phase.personalNote}"
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
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

                                         const ProfileWrapper = ({ children }: { children: React.ReactNode }) => {
                                             const url = s.supporterProfileUrl || (s.userId ? `/profile/${s.userId}` : "");
                                             if (!url) return <>{children}</>;
                                             return <Link href={url} className="contents">{children}</Link>;
                                         };

                                         return (
                                             <motion.div 
                                                key={s.id} 
                                                whileHover={{ y: -4 }}
                                                className="group bg-white dark:bg-[#161620] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl dark:hover:shadow-amber-500/5 transition-all duration-300 relative"
                                             >
                                                 <div className="flex items-center gap-4 mb-4">
                                                     <div className="relative shrink-0">
                                                        <ProfileWrapper>
                                                            <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-gray-400 cursor-pointer">
                                                                {s.photoURL ? <img src={s.photoURL} alt={s.name} className="w-full h-full object-cover" /> : s.name[0]}
                                                            </div>
                                                        </ProfileWrapper>
                                                        {(s.isVerifiedSupporter || s.status === "approved") && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161620] flex items-center justify-center shadow-sm">
                                                                <Check size={10} className="text-white" strokeWidth={4} />
                                                            </div>
                                                        )}
                                                     </div>
                                                     <div className="min-w-0">
                                                        <ProfileWrapper>
                                                            <h4 className="font-black text-gray-900 dark:text-white truncate tracking-tight text-sm leading-none cursor-pointer hover:text-amber-600 transition-colors">{s.name}</h4>
                                                        </ProfileWrapper>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                                                            {dateFormatted}
                                                        </p>
                                                     </div>
                                                 </div>

                                                 {s.message && (
                                                     <div className="pl-3 border-l-2 border-amber-100 dark:border-amber-900/30 py-1 mb-4">
                                                         <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium italic leading-relaxed line-clamp-3">
                                                             "{s.message}"
                                                         </p>
                                                     </div>
                                                 )}

                                                 <div className="pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                                     <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm ${badgeClass}`}>
                                                         {badgeLabel}
                                                     </span>
                                                     <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">Verified ✓</span>
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
function HowToSend() {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="mt-8 bg-white dark:bg-[#1a1b23] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-5 flex items-center justify-between text-left"
            >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    📖 How to Send Money via bKash
                </h3>
                <ChevronDown
                    size={16}
                    className={`text-gray-500/60 dark:text-gray-500 transition-transform ${expanded ? "rotate-180" : ""
                        }`}
                />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-8">
                            {/* English Instructions */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">
                                    English Guide
                                </h4>
                                <ol className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                                    {[
                                        { s: "1", t: <>Open the <strong className="text-gray-900 dark:text-white font-black">bKash</strong> app on your phone</> },
                                        { s: "2", t: <>Tap <strong className="text-gray-900 dark:text-white font-black">&quot;Send Money&quot;</strong></> },
                                        { s: "3", t: <>Enter the number: <strong className="text-pink-600 dark:text-pink-400 font-black">01805107667</strong></> },
                                        { s: "4", t: <>Enter the amount you wish to send</> },
                                        { s: "5", t: <>In the <strong className="text-gray-900 dark:text-white font-black">reference</strong> field, type your name</> },
                                        { s: "6", t: <>Confirm and enter your bKash PIN</> },
                                        { s: "7", t: <>Save the <strong className="text-gray-900 dark:text-white font-black">Transaction ID</strong> for verification</> }
                                    ].map(item => (
                                        <li key={item.s} className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-400 flex items-center justify-center text-[10px] font-black shadow-sm">
                                                {item.s}
                                            </span>
                                            <span className="font-medium pt-0.5">{item.t}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Bengali Instructions */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">
                                    বাংলা নির্দেশিকা
                                </h4>
                                <ol className="space-y-4 text-sm text-gray-600 dark:text-gray-400 font-bengali">
                                    {[
                                        { s: "১", t: <>আপনার ফোনে <strong className="text-gray-900 dark:text-white font-black">বিকাশ</strong> অ্যাপ খুলুন</> },
                                        { s: "২", t: <><strong className="text-gray-900 dark:text-white font-black">&quot;সেন্ড মানি&quot;</strong> ট্যাপ করুন</> },
                                        { s: "৩", t: <>নম্বর দিন: <strong className="text-pink-600 dark:text-pink-400 font-black">০১৮০৫১০৭৬৬৭</strong></> },
                                        { s: "৪", t: <>আপনি যে পরিমাণ পাঠাতে চান তা লিখুন</> },
                                        { s: "৫", t: <><strong className="text-gray-900 dark:text-white font-black">রেফারেন্স</strong> ঘরে আপনার নাম লিখুন</> },
                                        { s: "৬", t: <>নিশ্চিত করুন এবং আপনার বিকাশ পিন দিন</> },
                                        { s: "৭", t: <><strong className="text-gray-900 dark:text-white font-black">ট্রানজ্যাকশন আইডি</strong> সংরক্ষণ করুন</> }
                                    ].map(item => (
                                        <li key={item.s} className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-400 flex items-center justify-center text-[10px] font-black shadow-sm font-english">
                                                {item.s}
                                            </span>
                                            <span className="font-medium pt-0.5">{item.t}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
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
function PaymentCard({ giftAmount, setGiftAmount, onGiftSubmit, config, cardEnabled = true, bkashEnabled = true, cryptoEnabled = true }: { giftAmount: string, setGiftAmount: (val: string) => void, onGiftSubmit: () => void, config: typeof CONFIG, cardEnabled?: boolean, bkashEnabled?: boolean, cryptoEnabled?: boolean }) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const allTabs = [
        { id: "card", label: "Card", icon: CreditCard, enabled: cardEnabled },
        { id: "bkash", label: "bKash", icon: Smartphone, enabled: bkashEnabled },
        { id: "crypto", label: "Crypto", icon: Wallet, enabled: cryptoEnabled }
    ];
    const tabs = allTabs.filter(t => t.enabled);
    const [activeTab, setActiveTab] = useState<"card" | "bkash" | "crypto">((tabs[0]?.id as any) || "card");

    // If no tabs are enabled, show a paused message
    if (tabs.length === 0) {
        return (
            <div className="w-full max-w-[480px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
                    <Heart size={28} className="text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Donations Paused</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">All payment methods are currently unavailable. Please check back later.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[480px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden group">
            {/* Tab Header */}
            <div className="flex p-2 bg-gray-100/50 dark:bg-white/5 m-4 rounded-2xl relative">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all relative z-10 ${activeTab === tab.id ? "text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="p-8 pt-4">
                <AnimatePresence mode="wait">
                    {activeTab === "card" && (
                        <motion.div
                            key="card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2 mb-8">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">Secure Card Payment</h3>
                                <p className="text-xs text-gray-500 font-medium">Powered by Stripe Global Infrastructure</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[100, 500, 1000].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setGiftAmount(String(amt))}
                                        className={`py-4 rounded-2xl text-sm font-black transition-all border ${giftAmount === String(amt) ? "bg-amber-400 text-slate-900 border-transparent shadow-lg shadow-amber-400/20" : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:border-amber-400/50"}`}
                                    >
                                        ৳{amt}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="number"
                                value={giftAmount}
                                onChange={e => setGiftAmount(e.target.value)}
                                placeholder="Enter custom amount..."
                                className="w-full p-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-center font-black text-xl placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600 focus:ring-4 focus:ring-amber-400/10 focus:border-amber-400 transition-all outline-none"
                            />

                            <motion.a
                                href={config.stripeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-5 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg"
                            >
                                <CreditCard size={20} /> Pay with Card <ExternalLink size={14} className="opacity-50" />
                            </motion.a>
                            
                            <div className="flex items-center justify-center gap-4 pt-2 opacity-30 grayscale">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-5" />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "bkash" && (
                        <motion.div
                            key="bkash"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-[#E2136E] rounded-3xl p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                <div className="relative z-10 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#E2136E] font-black text-xl">b</div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Recipient</p>
                                            <p className="text-lg font-black tracking-tight">bKash Personal</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Account Number</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-2xl font-mono font-black tracking-tighter">{config.bkashNumber}</p>
                                            <button onClick={() => copyToClipboard(config.bkashNumber)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                {copied ? <Check size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onGiftSubmit}
                                className="w-full py-5 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg"
                            >
                                <Heart size={20} fill="currentColor" /> I Sent a Gift
                            </motion.button>
                            <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">Verify transaction to get your badge</p>
                        </motion.div>
                    )}

                    {activeTab === "crypto" && (
                        <motion.div
                            key="crypto"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2 mb-4">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">Web3 / Crypto Payment</h3>
                                <p className="text-xs text-gray-500 font-medium">Support via Blockchain networks</p>
                            </div>

                            <div className="flex justify-center py-2">
                                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-inner">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${config.cryptoWallet}`} 
                                        alt="Wallet QR" 
                                        className="w-32 h-32"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wallet Address</p>
                                <div className="flex items-center gap-3">
                                    <p className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 break-all">{config.cryptoWallet}</p>
                                    <button onClick={() => copyToClipboard(config.cryptoWallet)} className="shrink-0 p-2 text-gray-400 hover:text-amber-500 transition-colors">
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Accepted Networks</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {["Ethereum", "BNB Chain", "Polygon", "Base"].map(net => (
                                        <span key={net} className="px-3 py-1 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{net}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Trust Badges below payment area inside card but distinct */}
            <div className="p-6 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-around">
                <div className="flex flex-col items-center gap-1 opacity-50">
                    <Shield size={16} className="text-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">Secured</span>
                </div>
                <div className="flex flex-col items-center gap-1 opacity-50">
                    <CheckCircle2 size={16} className="text-blue-500" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">Student-Built</span>
                </div>
                <div className="flex flex-col items-center gap-1 opacity-50">
                    <Sparkles size={16} className="text-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">100% Direct</span>
                </div>
            </div>
        </div>
    );
}
export default function SupportPage() {
    const { siteName } = useSiteSettings();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [editNote, setEditNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [showGiftForm, setShowGiftForm] = useState(false);
    const [giftAmount, setGiftAmount] = useState("");
    const [giftTxId, setGiftTxId] = useState("");
    const [giftService, setGiftService] = useState("bkash");
    const [giftName, setGiftName] = useState("");
    const [giftSubmitted, setGiftSubmitted] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [supporters, setSupporters] = useState<(FirestoreGift & { id: string })[]>([]);
    const [settings, setSettings] = useState<SupportSettings>({ fundingOpen: true, fundingMessage: "Help us build the ultimate university platform.", supportPageActive: true });
    const [phases, setPhases] = useState<(SupportPhase & { id: string })[]>([]);
    const [copied, setCopied] = useState(false);
    const [builderSettings, setBuilderSettings] = useState<FirestoreBuilderSettings | null>(null);
    const [showBuilderPopup, setShowBuilderPopup] = useState(false);

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [tempSettings, setTempSettings] = useState<Partial<SupportSettings>>({});

    const activeConfig = {
        stripeLink: settings.stripeLink || CONFIG.stripeLink,
        cryptoWallet: settings.cryptoWallet || CONFIG.cryptoWallet,
        bkashNumber: settings.bkashNumber || CONFIG.bkashNumber,
        raised: settings.raised ?? CONFIG.raised,
        goal: settings.goal ?? CONFIG.goal,
        supporters: String(settings.supporters ?? CONFIG.supporters),
        currencySymbol: settings.currencySymbol || CONFIG.currencySymbol,
    };

    const cardEnabled = settings.cardEnabled ?? true;
    const bkashEnabled = settings.bkashEnabled ?? true;
    const cryptoEnabled = settings.cryptoEnabled ?? true;

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateSupportSettings(tempSettings);
            setSettings(prev => ({ ...prev, ...tempSettings }));
            setIsEditingSettings(false);
        } catch (err) {
            console.error(err);
            showToast("Failed to save settings.", "error");
        }
        setIsSaving(false);
    };

    const AdminSupportPanel = () => (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-24 right-6 z-[100] w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
        >
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-amber-500" size={18} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Admin Hub</span>
                </div>
                <button 
                    onClick={() => setIsEditingSettings(!isEditingSettings)}
                    className={`p-2 rounded-xl transition-all ${isEditingSettings ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 hover:text-amber-500"}`}
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
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stripe Link</label>
                                <input 
                                    type="text" 
                                    value={tempSettings.stripeLink ?? activeConfig.stripeLink}
                                    onChange={e => setTempSettings(prev => ({ ...prev, stripeLink: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crypto Wallet</label>
                                <input 
                                    type="text" 
                                    value={tempSettings.cryptoWallet ?? activeConfig.cryptoWallet}
                                    onChange={e => setTempSettings(prev => ({ ...prev, cryptoWallet: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">bKash Number</label>
                                <input 
                                    type="text" 
                                    value={tempSettings.bkashNumber ?? activeConfig.bkashNumber}
                                    onChange={e => setTempSettings(prev => ({ ...prev, bkashNumber: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raised</label>
                                    <input 
                                        type="number" 
                                        value={tempSettings.raised ?? activeConfig.raised}
                                        onChange={e => setTempSettings(prev => ({ ...prev, raised: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Goal</label>
                                    <input 
                                        type="number" 
                                        value={tempSettings.goal ?? activeConfig.goal}
                                        onChange={e => setTempSettings(prev => ({ ...prev, goal: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supporters</label>
                                    <input 
                                        type="text" 
                                        value={tempSettings.supporters ?? activeConfig.supporters}
                                        onChange={e => setTempSettings(prev => ({ ...prev, supporters: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</label>
                                    <input 
                                        type="text" 
                                        value={tempSettings.currencySymbol ?? activeConfig.currencySymbol}
                                        onChange={e => setTempSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>
                            {/* ─── Payment Method Toggles ─── */}
                            <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Methods</label>
                                <div className="space-y-2.5 mt-2">
                                    {[
                                        { key: "cardEnabled" as const, label: "Card (Stripe)", icon: CreditCard, color: "text-blue-500" },
                                        { key: "bkashEnabled" as const, label: "bKash", icon: Smartphone, color: "text-pink-500" },
                                        { key: "cryptoEnabled" as const, label: "Crypto", icon: Wallet, color: "text-purple-500" },
                                    ].map(method => {
                                        const isOn = (tempSettings[method.key] ?? (settings as any)[method.key]) ?? true;
                                        return (
                                            <div key={method.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-2.5">
                                                    <method.icon size={14} className={method.color} />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{method.label}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setTempSettings(prev => ({ ...prev, [method.key]: !isOn }))}
                                                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isOn ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-gray-300 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${isOn ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    useEffect(() => {
        getApprovedGifts().then(setSupporters).catch(console.error);
        getSupportSettings().then(s => {
            setSettings(s);
            setEditNote(s.supportPageNote || "");
        }).catch(err => {
            console.error("[SupportPage] Error fetching settings:", err);
            // Fallback: don't block the page if fetch fails for admin
        });
        getSupportPhases().then(allPhases => {
            const sorted = [...(allPhases || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            setPhases(sorted);
        }).catch(err => {
            console.error("[SupportPage] Error fetching phases:", err);
        });

        getBuilderSettings().then(setBuilderSettings).catch(console.error);
    }, []);

    const handleSaveNote = async () => {
        setIsSaving(true);
        try {
            await updateSupportSettings({ supportPageNote: editNote } as Partial<SupportSettings>);
            setSettings(prev => ({ ...prev, supportPageNote: editNote }));
            setIsEditingNote(false);
        } catch (err) {
            console.error(err);
            showToast("Failed to save note.", "error");
        }
        setIsSaving(false);
    };

    if (!settings.supportPageActive && !isAdmin) {
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

    const fundingOpen = settings?.fundingOpen ?? true;
    const fundingMessage = settings?.fundingMessage || "Your support — no matter how small — helps keep this platform alive and growing for every TTCian across Bangladesh. 💛";

    const bkashNumber = "01805107667";

    const copyNumber = () => {
        navigator.clipboard.writeText(bkashNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGiftSubmit = async () => {
        if (!giftTxId || !giftAmount || !giftName) return;
        
        setGiftSubmitted(true);
        try {
            await submitGift({
                name: giftName,
                amount: Number(giftAmount),
                txId: giftTxId,
                method: giftService as "bKash" | "Nagad"
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

    const presetAmounts = [50, 100, 200, 500, 1000];

    return (
        <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-32 overflow-hidden selection:bg-amber-400 selection:text-slate-900">
            {isAdmin && <AdminSupportPanel />}
            {/* ===== Vision Roadmap (Top Section) ===== */}
            <div className="max-w-7xl mx-auto px-6 relative pt-12 pb-24">
                <VisionRoadmap phases={phases} supporters={supporters} />
            </div>

            {/* ===== Hero Section with Mesh Gradient (Now Middle) ===== */}
            <div className="relative pt-32 pb-40 overflow-hidden border-t border-b border-gray-200 dark:border-white/5">
                <MeshGradient />
                
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-16 lg:gap-32 items-center">
                        {/* Left: Content & Mission */}
                        <div className="flex-1 space-y-12">
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }} 
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="space-y-6"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-full">
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Keep The Dream Alive</span>
                                </div>
                                <h1 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
                                    Fueling the Future of <span className="text-amber-500">TTC Network</span>
                                </h1>
                                <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                                    TTC Network is built independently to connect educators across Bangladesh. Your support—no matter how small—directly accelerates our mission to empower every student.
                                </p>
                            </motion.div>

                            {/* Animated Stat Pills */}
                            <div className="flex flex-wrap gap-4">
                                <StatPill label="Raised" value={`${activeConfig.currencySymbol}${activeConfig.raised.toLocaleString()}`} icon={Wallet} delay={0.2} />
                                <StatPill label="Supporters" value={activeConfig.supporters} icon={Users} delay={0.4} />
                                <StatPill label="Trust Score" value="100%" icon={Shield} delay={0.6} />
                            </div>

                            {/* Progress Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="max-w-md"
                            >
                                <ShimmerProgressBar raised={activeConfig.raised} goal={activeConfig.goal} />
                            </motion.div>
                        </div>

                        {/* Right: Payment Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
                            className="w-full lg:w-auto"
                        >
                            <PaymentCard 
                                giftAmount={giftAmount} 
                                setGiftAmount={setGiftAmount} 
                                onGiftSubmit={() => setShowGiftForm(true)} 
                                config={activeConfig}
                                cardEnabled={cardEnabled}
                                bkashEnabled={bkashEnabled}
                                cryptoEnabled={cryptoEnabled}
                            />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ===== Why Support? Section (Bento Grid) ===== */}
            <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { 
                            title: "Sustainability", 
                            desc: "Servers and infrastructure require constant resources. Your support ensures we stay online 24/7.", 
                            icon: Server, 
                            color: "bg-blue-500" 
                        },
                        { 
                            title: "Innovation", 
                            desc: "We're building features like real-time study hubs and career networking tools for educators.", 
                            icon: Palette, 
                            color: "bg-purple-500" 
                        },
                        { 
                            title: "Community", 
                            desc: "100% of your gift goes back into the platform. No corporate overhead, just student-powered growth.", 
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
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 relative z-10 mt-12">
                <HowToSend />
            </div>


            <div className="fixed bottom-0 left-0 right-0 z-[60]">
                <div className="bg-white dark:bg-[#0c0c12] border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] py-4 text-center">
                    <button 
                        onClick={() => setShowBuilderPopup(true)}
                        className="group text-xs sm:text-sm font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.2em] flex items-center justify-center gap-3 mx-auto transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        BUILT BY A STUDENT FOR STUDENTS <Heart size={14} className="text-red-500 fill-red-500 animate-pulse group-hover:scale-125 transition-transform" /> <span className="opacity-60 group-hover:opacity-100 transition-opacity">HELP KEEP THIS DREAM ALIVE</span>
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
                                        You'll receive a Thank You Card and Supporter Badge once verified. 💛
                                    </p>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="p-6 pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
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
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/10 focus:border-amber-400 dark:focus:border-amber-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Amount Sent (৳)</label>
                                            <input
                                                type="number"
                                                value={giftAmount}
                                                onChange={(e) => setGiftAmount(e.target.value)}
                                                placeholder="e.g. 500"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/10 focus:border-amber-400 dark:focus:border-amber-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Payment Method</label>
                                            <select
                                                value={giftService}
                                                onChange={(e) => setGiftService(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/10 focus:border-amber-400 dark:focus:border-amber-500 transition-all"
                                            >
                                                <option value="bkash">bKash</option>
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
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-[#161620] text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#1c1c28] focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-500/10 focus:border-amber-400 dark:focus:border-amber-500 transition-all font-mono placeholder:text-gray-400"
                                            />
                                        </div>
                                        <button
                                            onClick={handleGiftSubmit}
                                            disabled={!giftName || !giftAmount || !giftTxId}
                                            className="w-full py-3.5 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98]"
                                            style={{
                                                background: !giftName || !giftAmount || !giftTxId ? "#ccc" : "linear-gradient(135deg, #FFD700, #FFA500)",
                                                color: !giftName || !giftAmount || !giftTxId ? "#fff" : "#1a1a2e",
                                            }}
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

            {builderSettings && (
                <BuilderPopupModal 
                    show={showBuilderPopup} 
                    onClose={() => setShowBuilderPopup(false)} 
                    builderSettings={builderSettings} 
                />
            )}
        </div>
    );
}
