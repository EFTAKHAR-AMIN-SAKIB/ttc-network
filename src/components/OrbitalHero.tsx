"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Users, Download, X, ArrowRight, Compass, Share } from "lucide-react";
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
                            {college.id === "mymensingh" ? "MW" : college.id === "mymensingh_coed" ? "MM" : college.city.slice(0, 2).toUpperCase()}
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
                                    {college.id === "mymensingh" ? "MW" : college.id === "mymensingh_coed" ? "MM" : college.city.slice(0, 2).toUpperCase()}
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

    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        const unsub = subscribeColleges((data) => setFsColleges(data));

        // Detect if already installed or in standalone mode
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;
        
        if (isStandalone) {
            setIsAppInstalled(true);
        } else if ("getInstalledRelatedApps" in navigator) {
            (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
                if (apps && apps.length > 0) {
                    setIsAppInstalled(true);
                }
            }).catch(() => {});
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIpad = userAgent.includes("ipad");
        const isIphone = userAgent.includes("iphone");
        setIsIos(isIpad || isIphone);

        // Check if head script or PwaRegister already captured the install prompt
        if (typeof window !== "undefined" && window.__ttcInstallPrompt) {
            setInstallPrompt(window.__ttcInstallPrompt);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            if (typeof window !== "undefined") window.__ttcInstallPrompt = e;
        };

        const handlePromptReady = (e: any) => {
            const prompt = e.detail || (typeof window !== "undefined" ? window.__ttcInstallPrompt : null);
            if (prompt) setInstallPrompt(prompt);
        };

        const handleAppInstalled = () => {
            setIsAppInstalled(true);
            setInstallPrompt(null);
            setShowInstallGuide(false);
            if (typeof window !== "undefined") {
                window.__ttcAppInstalled = true;
                window.__ttcInstallPrompt = null;
            }
        };

        const handleRequestInstall = () => {
            handleInstallClick();
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);
        window.addEventListener("ttc-install-prompt-ready", handlePromptReady);
        window.addEventListener("ttc-app-installed", handleAppInstalled);
        window.addEventListener("ttc-request-install", handleRequestInstall);

        return () => {
            unsub();
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            window.removeEventListener("ttc-install-prompt-ready", handlePromptReady);
            window.removeEventListener("ttc-app-installed", handleAppInstalled);
            window.removeEventListener("ttc-request-install", handleRequestInstall);
        };
    }, [installPrompt, isAppInstalled, isIos]);

    const handleInstallClick = async () => {
        if (isAppInstalled) {
            window.location.href = "/news-feed";
            return;
        }

        setIsInstalling(true);

        // 1. Get prompt from local state or window global
        let promptEvent = installPrompt || (typeof window !== "undefined" ? window.__ttcInstallPrompt : null);

        // 2. If not yet ready on a non-iOS browser, wait briefly up to 1000ms
        if (!promptEvent && !isIos) {
            promptEvent = await new Promise((resolve) => {
                const timer = setTimeout(() => {
                    window.removeEventListener("ttc-install-prompt-ready", onReady);
                    resolve(null);
                }, 1000);
                const onReady = (e: any) => {
                    clearTimeout(timer);
                    window.removeEventListener("ttc-install-prompt-ready", onReady);
                    resolve(e.detail || (typeof window !== "undefined" ? window.__ttcInstallPrompt : null));
                };
                window.addEventListener("ttc-install-prompt-ready", onReady);
            });
        }

        setIsInstalling(false);

        // 3. If prompt is available, trigger native browser install prompt
        if (promptEvent) {
            try {
                await promptEvent.prompt();
                const choiceResult = await promptEvent.userChoice;
                if (choiceResult?.outcome === "accepted") {
                    setIsAppInstalled(true);
                    setInstallPrompt(null);
                    if (typeof window !== "undefined") {
                        window.__ttcInstallPrompt = null;
                        window.__ttcAppInstalled = true;
                    }
                }
            } catch (err) {
                console.warn("[PWA] Prompt execution error:", err);
                setShowInstallGuide(true);
            }
        } else {
            // Fallback: only for iOS Safari or browsers without programmatic install
            setShowInstallGuide(true);
        }
    };

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
            "rgba(37,99,235,0.4)", "rgba(56,189,248,0.35)", "rgba(255,255,255,0.3)",
            "rgba(59,130,246,0.3)", "rgba(147,197,253,0.25)", "rgba(37,99,235,0.2)",
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
        <section className="relative overflow-hidden pt-1 sm:pt-2 md:pt-3 pb-0 sm:pb-1 lg:pb-2">
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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full max-w-7xl">
                            {/* Left Column: Rich Copy & CTAs */}
                            <div className="lg:col-span-6 flex flex-col items-start text-left space-y-5">
                                {/* Tagline Category */}
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/[0.06] dark:bg-sky-500/[0.08] border border-primary/15 dark:border-sky-400/20 text-primary dark:text-sky-300 backdrop-blur-sm"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-sky-400" />
                                    <span className="text-[11px] font-bold tracking-wider uppercase font-english">
                                        Govt. Teachers&apos; Training Colleges
                                    </span>
                                </motion.div>

                                {/* Main Headline */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15, duration: 0.6 }}
                                    className="text-4xl sm:text-5xl lg:text-[58px] font-black text-gray-950 dark:text-white leading-[1.08] tracking-[-0.03em] font-sora"
                                >
                                    Connecting <br />
                                    <span className="text-blue-600 dark:text-sky-400">
                                        14 Campuses
                                    </span> <br />
                                    in one place.
                                </motion.h1>

                                {/* Bespoke CTA Button Group: Clean Two-Button Row */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35, duration: 0.6 }}
                                    className="flex flex-wrap items-center gap-3.5 w-full pt-2"
                                >
                                    {/* Primary Bespoke Action */}
                                    <Link
                                        href="/news-feed"
                                        className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 text-sm font-extrabold shadow-xl shadow-gray-950/15 dark:shadow-white/10 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                                    >
                                        <Compass size={16} className="text-sky-400 dark:text-primary group-hover:rotate-45 transition-transform duration-300" />
                                        <span>কমিউনিটি এক্সপ্লোর করুন</span>
                                        <div className="w-6 h-6 rounded-full bg-white/15 dark:bg-black/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                                        </div>
                                    </Link>

                                    {/* Elevated Mini Download Button with Black & White Effect */}
                                    <button
                                        onClick={handleInstallClick}
                                        disabled={isInstalling}
                                        className="group relative inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black border border-white/20 hover:border-white/50 dark:border-black/20 dark:hover:border-black/50 text-sm font-extrabold shadow-xl shadow-black/25 dark:shadow-white/10 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden"
                                    >
                                        {/* Animated monochrome shine sweep effect */}
                                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />

                                        <div className="w-6 h-6 rounded-lg bg-white/15 dark:bg-black/10 border border-white/10 dark:border-black/10 flex items-center justify-center text-white dark:text-black">
                                            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                        </div>
                                        <span>{isInstalling ? "খুলছে..." : "অ্যাপ ডাউনলোড"}</span>
                                        <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-white text-black dark:bg-black dark:text-white shadow-xs">
                                            App
                                        </span>
                                    </button>
                                </motion.div>

                                {/* Minimalist Trust Strip */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-white/5 w-full text-xs text-gray-500 dark:text-gray-400 font-medium font-bengali"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="font-english font-semibold text-gray-700 dark:text-gray-300">14 Campuses</span>
                                    </div>
                                    <span className="text-gray-300 dark:text-gray-700">•</span>
                                    <span>উন্মুক্ত প্ল্যাটফর্ম</span>
                                    <span className="text-gray-300 dark:text-gray-700">•</span>
                                    <span>সরাসরি নোটিশ ও রিসোর্স</span>
                                </motion.div>
                            </div>

                            {/* Right Column: Orbital Animation System */}
                            <div className="lg:col-span-6 flex items-center justify-center relative">
                                <div
                                    ref={containerRef}
                                    className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] lg:w-[500px] lg:h-[500px] xl:w-[540px] xl:h-[540px] flex-shrink-0"
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
                        <div className="flex flex-col items-center w-full px-3 text-center space-y-5">
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/[0.06] dark:bg-sky-500/[0.08] border border-primary/15 dark:border-sky-400/20 text-primary dark:text-sky-300"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-sky-400" />
                                <span className="text-[10px] font-bold tracking-wider uppercase font-english">
                                    Govt. Teachers&apos; Training Colleges
                                </span>
                            </motion.div>

                            {/* Headline */}
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white leading-[1.12] tracking-tight font-sora"
                            >
                                Connecting <br />
                                <span className="text-blue-600 dark:text-sky-400">
                                    14 Campuses
                                </span> <br />
                                in one place.
                            </motion.h1>

                            {/* Center Emblem */}
                            <div className="relative flex items-center justify-center py-2">
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

                            {/* Mobile CTAs: Clean Dual Buttons with Elevated Radiant Download Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="flex flex-col items-stretch justify-center gap-2.5 w-full max-w-xs mx-auto"
                            >
                                <Link
                                    href="/news-feed"
                                    className="group flex items-center justify-center gap-2.5 px-5 py-3.5 bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 font-extrabold rounded-2xl shadow-lg text-sm active:scale-[0.98] transition-transform"
                                >
                                    <Compass size={15} className="text-sky-400 dark:text-primary" />
                                    <span>কমিউনিটি এক্সপ্লোর করুন</span>
                                    <ArrowRight size={12} />
                                </Link>

                                <button
                                    onClick={handleInstallClick}
                                    disabled={isInstalling}
                                    className="group relative flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black border border-white/20 dark:border-black/20 text-sm font-extrabold shadow-lg shadow-black/25 dark:shadow-white/10 active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden"
                                >
                                    {/* Animated monochrome shine sweep effect */}
                                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />

                                    <div className="w-5 h-5 rounded-md bg-white/15 dark:bg-black/10 flex items-center justify-center text-white dark:text-black">
                                        <Download size={13} />
                                    </div>
                                    <span>{isInstalling ? "খুলছে..." : "অ্যাপ ডাউনলোড"}</span>
                                    <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-white text-black dark:bg-black dark:text-white shadow-xs">
                                        App
                                    </span>
                                </button>
                            </motion.div>

                            {/* Scrolling strip */}
                            <MobileLogoStrip collegesList={mergedColleges} />

                            {/* Badge count */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium text-gray-500 dark:text-gray-400"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>14 Campuses Connected</span>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            {/* Universal Install Guide Modal */}
            {showInstallGuide && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#16181C] border border-gray-100 dark:border-white/5 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowInstallGuide(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                            <Download size={26} />
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            Install TTC NETWORK
                        </h3>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                            Install the web app on your device for fast offline access and a native experience.
                        </p>
                        
                        {isIos ? (
                            <div className="space-y-4 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                        1
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                                        Tap the <span className="font-bold text-primary inline-flex items-center gap-1">Share <Share size={12} className="inline" /></span> button in Safari&apos;s bottom toolbar.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                        2
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                                        Scroll down and tap <span className="font-bold text-primary">Add to Home Screen</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                        1
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                                        Look for the <span className="font-bold text-primary">Install icon</span> in your browser address bar (top right).
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                        2
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                                        Or click browser menu <span className="font-bold text-primary">(⋮)</span> and select <span className="font-bold text-primary">&quot;Install TTC NETWORK&quot;</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <button
                            onClick={() => setShowInstallGuide(false)}
                            className="mt-6 w-full py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold rounded-xl text-xs transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

