"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Users } from "lucide-react";
import { colleges } from "@/data/colleges";
import { subscribeColleges, type FirestoreCollege } from "@/lib/firestore";


/* ═══════════════════════════════════════════════════════════
   ORBITAL CONFIGURATION
   Two elliptical rings — inner & outer — wide enough
   that logos NEVER touch the central emblem.
   Inner ring rx ≈ 0.44, Outer ring rx ≈ 0.48
   ═══════════════════════════════════════════════════════════ */
function getOrbitConfig(index: number, total: number) {
    const ring = index % 2;

    // Radii in viewBox coords (640×640 canvas)
    // Inner: 560×260 ellipse   Outer: 620×300 ellipse
    const rxBase = ring === 0 ? 280 : 310;
    const ryBase = ring === 0 ? 130 : 150;

    // Speeds: inner faster
    const durations = [22, 38, 24, 34, 26, 40, 23, 36, 25, 42, 27, 35, 21, 37];
    const duration = durations[index % durations.length];
    const direction: 1 | -1 = ring === 0 ? 1 : -1;

    // Evenly spaced start angles within each ring
    const ringCount = Math.ceil(total / 2);
    const ringIndex = Math.floor(index / 2);
    const startAngle = (ringIndex / ringCount) * 360;

    return { rxBase, ryBase, startAngle, direction, duration };
}

/* ═══════════════════════════════════════════════════════════
   ORBITING LOGO — RAF-animated, 3D depth illusion
   ═══════════════════════════════════════════════════════════ */
function OrbitingLogo({
    college,
    index,
    total,
    containerSize,
    fadeDelay,
}: {
    college: (typeof colleges)[0];
    index: number;
    total: number;
    containerSize: number;
    fadeDelay: number;
}) {
    const config = getOrbitConfig(index, total);
    const [hovered, setHovered] = useState(false);
    const [renderPos, setRenderPos] = useState({ x: 0, y: 0, depth: 0 });
    const angleRef = useRef((config.startAngle * Math.PI) / 180);
    const animRef = useRef<number>(0);
    const pausedRef = useRef(false);
    const lastTimeRef = useRef<number>(0);

    const scale = containerSize / 640;
    const rx = config.rxBase * scale;
    const ry = config.ryBase * scale;

    useEffect(() => { pausedRef.current = hovered; }, [hovered]);

    useEffect(() => {
        const speed = ((2 * Math.PI) / config.duration) * config.direction;
        const animate = (time: number) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;
            if (!pausedRef.current) angleRef.current += speed * delta;
            const x = Math.cos(angleRef.current) * rx;
            const y = Math.sin(angleRef.current) * ry;
            const depth = Math.sin(angleRef.current);
            setRenderPos({ x, y, depth });
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [rx, ry, config.duration, config.direction]);

    const SIZE = 58;
    const half = SIZE / 2;
    const depthScale = 0.78 + (renderPos.depth + 1) * 0.16;
    const depthOpacity = 0.4 + (renderPos.depth + 1) * 0.3;
    const zIndex = hovered ? 30 : Math.round(renderPos.depth * 10 + 10);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: fadeDelay, duration: 0.5, ease: "easeOut" }}
        >
            <Link
                href={`/college-info?college=${college.slug}`}
                className="absolute block"
                style={{
                    left: `calc(50% + ${renderPos.x}px - ${half}px)`,
                    top: `calc(50% + ${renderPos.y}px - ${half}px)`,
                    width: SIZE,
                    height: SIZE,
                    zIndex,
                    transform: `scale(${hovered ? 1.2 : depthScale})`,
                    opacity: hovered ? 1 : depthOpacity,
                    transition: hovered
                        ? "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease"
                        : "opacity 0.1s ease",
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <div
                    className="w-full h-full rounded-full flex items-center justify-center overflow-hidden logo-orb"
                    style={{
                        padding: 3,
                        transition: "box-shadow 0.3s ease",
                        boxShadow: hovered
                            ? "0 0 0 3px var(--accent), 0 8px 32px rgba(0,0,0,0.2)"
                            : undefined,
                    }}
                >
                    {college.hasLogo ? (
                        <Image
                            src={college.logo}
                            alt={college.name}
                            width={SIZE}
                            height={SIZE}
                            className="object-contain rounded-full"
                        />
                    ) : (
                        <div
                            className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: "var(--accent)" }}
                        >
                            {college.city.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Tooltip */}
                <div
                    className="absolute left-1/2 whitespace-nowrap text-[10px] font-bold px-3 py-1.5 rounded-lg pointer-events-none"
                    style={{
                        top: -34,
                        background: "var(--tooltip-bg)",
                        color: "var(--tooltip-text)",
                        opacity: hovered ? 1 : 0,
                        transform: `translateX(-50%) translateY(${hovered ? 0 : 6}px)`,
                        transition: "all 0.25s ease",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    }}
                >
                    {college.name}
                    <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2"
                        style={{
                            width: 0, height: 0,
                            borderLeft: "4px solid transparent",
                            borderRight: "4px solid transparent",
                            borderTop: "4px solid var(--tooltip-bg)",
                        }}
                    />
                </div>
            </Link>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════
   COSMIC PARTICLE
   ═══════════════════════════════════════════════════════════ */
function CosmicParticle({ x, y, size, color, duration, delay, randomX, randomY }: {
    x: number; y: number; size: number; color: string; duration: number; delay: number;
    randomX: number[]; randomY: number[];
}) {
    return (
        <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ width: size, height: size, left: `${x}%`, top: `${y}%`, background: color }}
            animate={{
                opacity: [0, 0.7, 0],
                x: randomX,
                y: randomY,
            }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE LOGO STRIP — Horizontal auto-scroll
   ═══════════════════════════════════════════════════════════ */
function MobileLogoStrip({ collegesList }: { collegesList: typeof colleges }) {
    const doubled = [...collegesList, ...collegesList];
    return (
        <div className="relative overflow-hidden mt-6 py-3">
            <div className="mobile-logo-strip flex gap-4 w-max">
                {doubled.map((college, i) => (
                    <Link key={`${college.id}-${i}`} href={`/college-info?college=${college.slug}`} className="flex-shrink-0">
                        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center overflow-hidden logo-orb" style={{ padding: 2 }}>
                            {college.hasLogo ? (
                                <Image src={college.logo} alt={college.name} width={50} height={50} className="object-contain rounded-full" />
                            ) : (
                                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: "var(--accent)" }}>
                                    {college.city.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   HORIZONTAL TTC EMBLEM
   ───────────────────────────────────────────
        T            T            C
    Teachers'    Training     College
   ───────────────────────────────────────────
   Three columns side-by-side, large letter on top,
   word label below. Clean, typographic, elegant.
   ═══════════════════════════════════════════════════════════ */
function TTCEmblem({ isMobile }: { isMobile: boolean }) {
    const letterSize = isMobile ? "text-[56px]" : "text-[80px] lg:text-[96px]";
    const wordSize = isMobile ? "text-[9px]" : "text-[11px] lg:text-[13px]";
    const gap = isMobile ? "gap-4" : "gap-6 lg:gap-10";

    const columns: [string, string][] = [
        ["T", "Teachers\u2019"],
        ["T", "Training"],
        ["C", "College"],
    ];

    return (
        <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.15, type: "spring", stiffness: 180, damping: 20 }}
            className="select-none pointer-events-none"
        >
            <div className={`flex items-end justify-center ${gap}`}>
                {columns.map(([letter, word], i) => (
                    <div key={i} className="flex flex-col items-center">
                        <span
                            className={`${letterSize} font-black leading-none emblem-letter`}
                            style={{
                                fontFamily: "var(--font-sora), var(--font-plus-jakarta), sans-serif",
                                letterSpacing: "-0.03em",
                            }}
                        >
                            {letter}
                        </span>
                        <span
                            className={`${wordSize} font-semibold uppercase tracking-[0.18em] mt-1 emblem-word`}
                            style={{
                                fontFamily: "var(--font-sora), var(--font-plus-jakarta), sans-serif",
                            }}
                        >
                            {word}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════
   SVG ORBIT RINGS — Gradient stroke ellipses
   Matching the actual logo orbit radii exactly
   so rings visually align with logo paths
   ═══════════════════════════════════════════════════════════ */
function OrbitalRings() {
    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 640 640"
            fill="none"
            style={{ overflow: "visible" }}
        >
            <defs>
                <linearGradient id="orbitGrad1" gradientUnits="userSpaceOnUse" x1="40" y1="320" x2="600" y2="320">
                    <stop offset="0%" stopColor="var(--ring-color-1)" stopOpacity="0" />
                    <stop offset="35%" stopColor="var(--ring-color-1)" stopOpacity="0.5" />
                    <stop offset="65%" stopColor="var(--ring-color-2)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--ring-color-1)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="orbitGrad2" gradientUnits="userSpaceOnUse" x1="0" y1="320" x2="640" y2="320">
                    <stop offset="0%" stopColor="var(--ring-color-2)" stopOpacity="0" />
                    <stop offset="30%" stopColor="var(--ring-color-2)" stopOpacity="0.35" />
                    <stop offset="70%" stopColor="var(--ring-color-1)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--ring-color-2)" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Inner ring — matches logo orbit (rx=280 ry=130) */}
            <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                transition={{
                    opacity: { delay: 0.3, duration: 0.5 },
                    rotate: { duration: 22, ease: "linear", repeat: Infinity },
                }}
                style={{ transformOrigin: "320px 320px" }}
            >
                <ellipse cx="320" cy="320" rx="280" ry="130" stroke="url(#orbitGrad1)" strokeWidth="1.2" fill="none" />
            </motion.g>

            {/* Outer ring — matches logo orbit (rx=310 ry=150) */}
            <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: -360 }}
                transition={{
                    opacity: { delay: 0.5, duration: 0.5 },
                    rotate: { duration: 38, ease: "linear", repeat: Infinity },
                }}
                style={{ transformOrigin: "320px 320px" }}
            >
                <ellipse cx="320" cy="320" rx="310" ry="150" stroke="url(#orbitGrad2)" strokeWidth="0.8" fill="none" />
            </motion.g>
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ORBITAL HERO
   ═══════════════════════════════════════════════════════════ */
export default function OrbitalHero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState(550);
    const [isMobile, setIsMobile] = useState(false);
    const [fsColleges, setFsColleges] = useState<FirestoreCollege[]>([]);

    useEffect(() => {
        const unsub = subscribeColleges((data) => setFsColleges(data));
        return () => unsub();
    }, []);

    const mergedColleges = useMemo(() => {
        return colleges.map(c => {
            const fs = fsColleges.find(f => f.id === c.id);
            if (!fs) return c;
            return {
                ...c,
                logo: fs.logo || c.logo,
                hasLogo: !!(fs.logo || c.logo),
                name: fs.name || c.name,
            };
        });
    }, [fsColleges]);

    useEffect(() => {
        const update = () => {
            if (containerRef.current) setContainerSize(containerRef.current.offsetWidth);
            setIsMobile(window.innerWidth < 768);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const [particles, setParticles] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const colors = [
            "rgba(230,57,70,0.4)", "rgba(230,57,70,0.25)", "rgba(255,255,255,0.25)",
            "rgba(230,57,70,0.3)", "rgba(255,255,255,0.15)", "rgba(230,57,70,0.2)",
        ];
        const newParticles = Array.from({ length: 10 }, (_, i) => ({
            x: 15 + Math.random() * 70,
            y: 15 + Math.random() * 70,
            size: 2 + Math.random() * 2,
            color: colors[i % colors.length],
            duration: 5 + Math.random() * 5,
            delay: Math.random() * 4,
            randomX: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
            randomY: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
        }));
        setParticles(newParticles);
    }, []);

    return (
        <section className="relative overflow-hidden py-14 md:py-24 lg:py-28">
            {/* Background */}
            <div className="absolute inset-0 hero-bg" />

            {/* Subtle center glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hero-glow"
                style={{ width: "75%", height: "55%", borderRadius: "50%", filter: "blur(80px)" }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center">

                    {/* ══ DESKTOP: Split two-column layout ══ */}
                    {!isMobile && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl">
                            {/* Left Column: Rich Copy & CTAs */}
                            <div className="lg:col-span-5 flex flex-col items-start text-left space-y-6">
                                {/* Tagline Category */}
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                    <span className="text-[10px] sm:text-xs font-black text-primary tracking-widest uppercase font-english">
                                        The Unified Digital Hub
                                    </span>
                                </motion.div>

                                {/* Main Headline */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                    className="text-4xl sm:text-5xl lg:text-[54px] font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight font-sora"
                                >
                                    Connecting <br />
                                    <span className="bg-gradient-to-r from-primary via-accent to-red-500 bg-clip-text text-transparent drop-shadow-sm">
                                        All 14 Campuses
                                    </span> <br />
                                    Under One Roof
                                </motion.h1>

                                {/* Subtitle Description */}
                                <motion.p
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.6 }}
                                    className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium leading-relaxed font-bengali"
                                >
                                    সরকারি টিচার্স ট্রেনিং কলেজের শিক্ষার্থী, শিক্ষক ও প্রাক্তন শিক্ষার্থীদের একমাত্র মিলনমেলা। নোটিশ বোর্ড, স্টাডি মেটেরিয়ালস ও ক্যাম্পাস স্টোরি এক্সপ্লোর করুন এক ক্লিকে।
                                </motion.p>

                                {/* Glowing CTAs */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6, duration: 0.6 }}
                                    className="flex flex-wrap items-center gap-3 w-full"
                                >
                                    <Link
                                        href="/news-feed"
                                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent text-white font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-300 text-sm active:scale-95 btn-glow-hover"
                                    >
                                        <Sparkles size={16} />
                                        <span>Explore News Feed</span>
                                    </Link>
                                    <Link
                                        href="/notice"
                                        className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white dark:bg-[#16181C] hover:bg-gray-50 dark:hover:bg-[#1E2028] text-gray-800 dark:text-white font-extrabold rounded-2xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transform hover:-translate-y-0.5 transition-all duration-300 text-sm active:scale-95"
                                    >
                                        <span>Notice Board</span>
                                    </Link>
                                    <Link
                                        href="/study"
                                        className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-50 dark:bg-[#101216] hover:bg-gray-100 dark:hover:bg-[#16181C] text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs border border-gray-200/50 dark:border-white/5 transition-all duration-300"
                                    >
                                        <span>Study Portal</span>
                                    </Link>
                                </motion.div>

                                {/* Mini Info / Badges */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-white/5 w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-english uppercase tracking-wider">
                                            {mergedColleges.length} Colleges Connected
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users size={12} className="text-primary" />
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-english uppercase tracking-wider">
                                            Active Community
                                        </span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Column: Orbital Animation System */}
                            <div className="lg:col-span-7 flex items-center justify-center relative">
                                <div
                                    ref={containerRef}
                                    className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] flex-shrink-0"
                                >
                                    {/* Pulsing glow behind emblem */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <motion.div
                                            className="absolute rounded-full"
                                            style={{
                                                width: 160, height: 160,
                                                background: "radial-gradient(circle, var(--glow-inner) 0%, transparent 60%)",
                                            }}
                                            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        <motion.div
                                            className="absolute rounded-full"
                                            style={{
                                                width: 320, height: 320,
                                                background: "radial-gradient(circle, var(--glow-outer) 0%, transparent 70%)",
                                            }}
                                            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </div>

                                    {/* Orbit ring guides */}
                                    <OrbitalRings />

                                    {/* Particles */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {particles.map((p, i) => <CosmicParticle key={i} {...p} />)}
                                    </div>

                                    {/* Center emblem (z-index 12 — between back and front logos) */}
                                    <div className="absolute inset-0 flex items-center justify-center z-[12]">
                                        <TTCEmblem isMobile={false} />
                                    </div>

                                    {/* Orbiting logos */}
                                    {mergedColleges.map((college, i) => (
                                        <OrbitingLogo
                                            key={college.id}
                                            college={college}
                                            index={i}
                                            total={mergedColleges.length}
                                            containerSize={containerSize}
                                            fadeDelay={0.8 + i * 0.06}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ MOBILE: Emblem + scroll strip ══ */}
                    {isMobile && (
                        <div className="flex flex-col items-center w-full px-2 text-center space-y-6">
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                <span className="text-[10px] font-black text-primary tracking-widest uppercase font-english">
                                    The Unified Digital Hub
                                </span>
                            </motion.div>

                            {/* Center Emblem */}
                            <div className="relative flex items-center justify-center py-4">
                                <motion.div
                                    className="absolute rounded-full"
                                    style={{
                                        width: 120, height: 120,
                                        background: "radial-gradient(circle, var(--glow-inner) 0%, transparent 60%)",
                                    }}
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <TTCEmblem isMobile={true} />
                            </div>

                            {/* Headline */}
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-black text-gray-900 dark:text-white leading-[1.15] tracking-tight font-sora"
                            >
                                Connecting <br />
                                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                    All 14 Campuses
                                </span>
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed font-bengali max-w-sm mx-auto"
                            >
                                সরকারি টিচার্স ট্রেনিং কলেজের নোটিশ বোর্ড, স্টাডি মেটেরিয়ালস ও ক্যাম্পাস স্টোরি এক্সপ্লোর করুন এক ক্লিকে।
                            </motion.p>

                            {/* Mobile CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-xs mx-auto"
                            >
                                <Link
                                    href="/news-feed"
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-accent text-white font-extrabold rounded-xl shadow-md text-sm"
                                >
                                    <Sparkles size={14} />
                                    <span>Explore Feed</span>
                                </Link>
                                <div className="flex gap-2 justify-center w-full">
                                    <Link
                                        href="/notice"
                                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white dark:bg-[#16181C] text-gray-800 dark:text-white font-bold rounded-xl border border-gray-200 dark:border-white/10 text-xs"
                                    >
                                        Notice Board
                                    </Link>
                                    <Link
                                        href="/study"
                                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-white dark:bg-[#16181C] text-gray-800 dark:text-white font-bold rounded-xl border border-gray-200 dark:border-white/10 text-xs"
                                    >
                                        Study Portal
                                    </Link>
                                </div>
                            </motion.div>

                            {/* Scrolling strip */}
                            <MobileLogoStrip collegesList={mergedColleges} />

                            {/* Badge count */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-pill text-[10px] font-bold text-gray-500 dark:text-gray-400"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{mergedColleges.length} Colleges Connected</span>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

