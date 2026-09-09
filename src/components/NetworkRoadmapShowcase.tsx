"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  School,
  MessageSquareText,
  BookOpen,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Compass,
} from "lucide-react";

interface FeatureItem {
  id: string;
  number: string;
  title: string;
  tabLabel: string;
  subtitle: string;
  description: string;
  icon: any;
  mockup: string;
  alt: string;
  link: string;
  linkText: string;
  tiltClass: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: "updates",
    number: "01",
    title: "Stay Updated",
    tabLabel: "Updates",
    subtitle: "Live Multi-Campus Feed",
    description:
      "Get the latest news, events and updates from your college and TTC community.",
    icon: MessageSquareText,
    mockup: "/showcase/mockup-news.png",
    alt: "TTC News Feed, Events and Club Announcements Mockup",
    link: "/news-feed",
    linkText: "লাইভ নিউজ ফিড দেখুন",
    tiltClass: "md:translate-y-2",
  },
  {
    id: "stories",
    number: "02",
    title: "Connect & Share Stories",
    tabLabel: "Stories",
    subtitle: "Community Driven Narratives",
    description:
      "Share your journey, experiences and be a part of a supportive community.",
    icon: Users,
    mockup: "/showcase/mockup-story.png",
    alt: "One Platform. All Colleges. Every Story. - TTC Network Stories Mockup",
    link: "/story",
    linkText: "গল্প ও অভিজ্ঞতা দেখুন",
    tiltClass: "md:translate-y-0",
  },
  {
    id: "colleges",
    number: "03",
    title: "Explore Your College",
    tabLabel: "Colleges",
    subtitle: "Campus Directory & Faculty",
    description:
      "Get detailed information about your college, faculty, clubs and more — all in one place.",
    icon: School,
    mockup: "/showcase/mockup-college.png",
    alt: "Govt. Teachers Training College Overview and Campus Details Mockup",
    link: "/college-info",
    linkText: "১৪টি কলেজ এক্সপ্লোর করুন",
    tiltClass: "md:translate-y-0",
  },
  {
    id: "learn",
    number: "04",
    title: "Learn & Grow",
    tabLabel: "Learn",
    subtitle: "Shared Knowledge Library",
    description:
      "Access study materials, join live classes and build your future together.",
    icon: BookOpen,
    mockup: "/showcase/mockup-study.png",
    alt: "Power Up Your Learning Journey - Shared Resources and Study Mockup",
    link: "/study",
    linkText: "স্টাডি রিসোর্স অ্যাক্সেস করুন",
    tiltClass: "md:translate-y-2",
  },
];

export default function NetworkRoadmapShowcase() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [mobileViewMode, setMobileViewMode] = useState<"carousel" | "timeline">("carousel");
  const [isInstalling, setIsInstalling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadClick = () => {
    setIsInstalling(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ttc-request-install"));
    }
    setTimeout(() => setIsInstalling(false), 1500);
  };

  // Scroll to a specific card in mobile carousel
  const scrollToCard = (index: number) => {
    setActiveTab(index);
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cards = container.children;
      if (cards[index]) {
        (cards[index] as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  };

  // Track active card on horizontal scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.82;
    const index = Math.round(scrollLeft / (cardWidth + 16));
    if (index >= 0 && index < FEATURES.length && index !== activeTab) {
      setActiveTab(index);
    }
  };

  return (
    <section className="relative overflow-hidden pt-4 sm:pt-6 lg:pt-8 pb-14 sm:pb-24 lg:pb-32 bg-gradient-to-b from-white via-slate-50/70 to-blue-50/20 dark:from-[#08080C] dark:via-[#0C0D14] dark:to-[#08080C] transition-colors duration-500">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/[0.04] dark:bg-blue-500/[0.03] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-sky-400/[0.04] dark:bg-sky-400/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ══ SECTION TITLE ══ */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[54px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] font-sora"
          >
            A Network to Connect{" "}
            <span className="relative inline-block text-blue-600 dark:text-sky-400">
              Every TTCian.
              {/* Hand-drawn brush swoosh underline */}
              <svg
                className="absolute -bottom-2.5 sm:-bottom-3 left-0 w-full overflow-visible text-blue-600 dark:text-sky-400"
                viewBox="0 0 260 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 11.5C65 4.5 170 3.5 257 8.5C198 13.5 105 15 15 10.5"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-90"
                />
              </svg>
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 font-normal max-w-xl mx-auto font-english"
          >
            Designed exclusively for teachers, trainees, and students across 14 Government Teachers&apos; Training Colleges.
          </motion.p>
        </div>

        {/* ══ DESKTOP & TABLET VIEW (md and above): 4 Features & 4 3D Mockups with Connected Mapping Line ══ */}
        <div className="hidden md:block relative">
          {/* Top Feature Headers (4 Columns) */}
          <div className="grid grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-10 relative z-20">
            {FEATURES.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <motion.div
                  key={feat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="flex flex-col items-start px-2 group"
                >
                  {/* Step Pill */}
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 mb-3.5 shadow-xs">
                    {feat.number}
                  </div>

                  {/* Icon Box */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/50 dark:to-indigo-950/40 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-sky-400 mb-3 shadow-xs group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <IconComp size={20} />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5 font-normal">
                    {feat.description}
                  </p>

                  {/* Arrow Indicator on Node 01 */}
                  {idx === 0 && (
                    <div className="mt-2 text-blue-500 dark:text-sky-400 select-none pointer-events-none">
                      <svg width="36" height="28" viewBox="0 0 36 28" fill="none" className="rotate-[-10deg]">
                        <path
                          d="M4 4 C16 4, 28 12, 28 24 M22 20 L28 25 L34 19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Arrow Indicator on Node 04 */}
                  {idx === 3 && (
                    <div className="mt-2 text-blue-500 dark:text-sky-400 select-none pointer-events-none self-end mr-4">
                      <svg width="36" height="28" viewBox="0 0 36 28" fill="none" className="rotate-[10deg] scale-x-[-1]">
                        <path
                          d="M4 4 C16 4, 28 12, 28 24 M22 20 L28 25 L34 19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ── Mapping / Road Line (SVG Spanning Across The 4 Phones) ── */}
          <div className="absolute top-[260px] lg:top-[280px] left-0 right-0 w-full h-[220px] pointer-events-none z-0">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1200 220"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="roadLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                  <stop offset="25%" stopColor="#38BDF8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.9" />
                  <stop offset="75%" stopColor="#60A5FA" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.5" />
                </linearGradient>
                <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Dynamic Connecting Road Path */}
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                d="M 60 70 C 180 140, 240 160, 340 100 C 440 40, 520 120, 620 110 C 720 100, 800 30, 920 80 C 1040 130, 1100 90, 1160 50"
                stroke="url(#roadLineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                filter="url(#roadGlow)"
              />

              {/* Connecting Milestone Nodes */}
              <circle cx="340" cy="100" r="6" className="fill-blue-600 animate-pulse" />
              <circle cx="340" cy="100" r="12" className="stroke-blue-400/40 fill-none" strokeWidth="2" />

              <circle cx="620" cy="110" r="6" className="fill-sky-500 animate-pulse" />
              <circle cx="620" cy="110" r="12" className="stroke-sky-400/40 fill-none" strokeWidth="2" />

              <circle cx="920" cy="80" r="6" className="fill-blue-600 animate-pulse" />
              <circle cx="920" cy="80" r="12" className="stroke-blue-400/40 fill-none" strokeWidth="2" />
            </svg>
          </div>

          {/* ── 4 Mockup Phones Grid ── */}
          <div className="grid grid-cols-4 gap-4 lg:gap-6 items-end relative z-10 pt-4 pb-12">
            {FEATURES.map((feat, idx) => (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.12, duration: 0.7, ease: "easeOut" }}
                className="group relative flex flex-col items-center cursor-pointer"
              >
                {/* 3D Phone Mockup Container */}
                <Link
                  href={feat.link}
                  className={`relative w-full max-w-[270px] aspect-[1/1.9] transition-all duration-500 transform ${feat.tiltClass} group-hover:scale-[1.04] group-hover:-translate-y-3 group-hover:drop-shadow-2xl block`}
                >
                  <Image
                    src={feat.mockup}
                    alt={feat.alt}
                    fill
                    sizes="(max-width: 1280px) 25vw, 270px"
                    className="object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_20px_32px_rgba(0,0,0,0.6)]"
                    priority={idx < 2}
                  />

                  {/* Floating Action Pill on Hover */}
                  <div className="absolute inset-x-0 bottom-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 text-white dark:bg-white/95 dark:text-slate-950 text-xs font-bold shadow-xl backdrop-blur-md">
                      <span>{feat.linkText}</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>

                {/* Soft Ground Ambient Shadow */}
                <div className="w-3/5 h-4 bg-slate-950/10 dark:bg-blue-600/10 rounded-full blur-lg -mt-3 group-hover:w-4/5 group-hover:blur-xl transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══ MOBILE VIEW (Dedicated for screens under md): Swipe Reel with Connected Road ══ */}
        <div className="block md:hidden">
          {/* Mobile View Toggle & Controls Header */}
          <div className="flex items-center justify-between gap-2 mb-4 px-1">
            {/* Step Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {FEATURES.map((feat, idx) => (
                <button
                  key={feat.id}
                  onClick={() => scrollToCard(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === idx
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80"
                  }`}
                >
                  <span className="text-[10px] font-black">{feat.number}</span>
                  <span className="text-xs">{feat.tabLabel}</span>
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Carousel vs Timeline */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setMobileViewMode("carousel")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  mobileViewMode === "carousel"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Swipe Tour"
              >
                <Compass size={15} />
              </button>
              <button
                onClick={() => setMobileViewMode("timeline")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  mobileViewMode === "timeline"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Winding Road Timeline"
              >
                <Layers size={15} />
              </button>
            </div>
          </div>

          {/* ── MODE 1: Horizontal Swipe Snap Carousel with Road Line ── */}
          {mobileViewMode === "carousel" && (
            <div className="relative">
              {/* Connected Background SVG Road Line for Carousel */}
              <div className="absolute top-[48%] left-0 right-0 w-full h-[60px] pointer-events-none z-0">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 400 60"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 30 C 100 50, 200 10, 300 45 C 350 20, 380 35, 400 30"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    className="opacity-40 dark:opacity-60"
                  />
                </svg>
              </div>

              {/* Horizontal Scroll Snap Track */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 py-3 no-scrollbar scroll-smooth relative z-10"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {FEATURES.map((feat, idx) => {
                  const IconComp = feat.icon;
                  return (
                    <div
                      key={feat.id}
                      className="w-[82vw] max-w-[320px] flex-shrink-0 snap-center flex flex-col items-center"
                    >
                      {/* Card Box */}
                      <div className="w-full rounded-[2rem] bg-gradient-to-b from-white via-slate-50/90 to-blue-50/40 dark:from-[#12141C] dark:via-[#161824] dark:to-[#12141C] border border-slate-200/80 dark:border-white/10 p-5 shadow-lg relative overflow-hidden flex flex-col items-center text-center">
                        {/* Top Step Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                            {feat.number}
                          </div>
                          <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">
                            {feat.subtitle}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                          {feat.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-english line-clamp-2">
                          {feat.description}
                        </p>

                        {/* 3D Phone Mockup Container */}
                        <Link
                          href={feat.link}
                          className="relative w-full max-w-[240px] aspect-[1/1.9] my-4 block active:scale-95 transition-transform"
                        >
                          <Image
                            src={feat.mockup}
                            alt={feat.alt}
                            fill
                            sizes="240px"
                            className="object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_20px_28px_rgba(0,0,0,0.7)]"
                            priority={idx === 0}
                          />
                        </Link>

                        {/* Direct Feature Action Link */}
                        <Link
                          href={feat.link}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-extrabold shadow-md active:scale-95 transition-all mt-1"
                        >
                          <span>{feat.linkText}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carousel Pagination & Swipe Controls */}
              <div className="flex items-center justify-between px-6 mt-4">
                <button
                  onClick={() => scrollToCard(Math.max(0, activeTab - 1))}
                  disabled={activeTab === 0}
                  className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-30 disabled:pointer-events-none shadow-xs"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Dots indicator */}
                <div className="flex items-center gap-1.5">
                  {FEATURES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToCard(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeTab === idx
                          ? "w-6 bg-blue-600 dark:bg-sky-400"
                          : "w-2 bg-slate-300 dark:bg-white/20"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => scrollToCard(Math.min(FEATURES.length - 1, activeTab + 1))}
                  disabled={activeTab === FEATURES.length - 1}
                  className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-30 disabled:pointer-events-none shadow-xs"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Swipe Hint */}
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Swipe left & right to explore features →
              </p>
            </div>
          )}

          {/* ── MODE 2: Winding Road Timeline (Vertical Scroll Journey) ── */}
          {mobileViewMode === "timeline" && (
            <div className="relative py-4 space-y-12">
              {/* Continuous Vertical SVG Winding Road Line */}
              <div className="absolute top-6 bottom-6 left-1/2 -translate-x-1/2 w-[60px] pointer-events-none z-0">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 60 800"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 30 0 C 10 100, 50 200, 30 300 C 10 400, 50 500, 30 600 C 10 700, 45 750, 30 800"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    className="opacity-50 dark:opacity-70"
                  />
                </svg>
              </div>

              {FEATURES.map((feat, idx) => {
                const IconComp = feat.icon;
                const isEven = idx % 2 === 0;
                return (
                  <motion.div
                    key={feat.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 flex flex-col items-center text-center"
                  >
                    {/* Milestone Center Node */}
                    <div className="relative mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-lg ring-4 ring-blue-500/20">
                        {feat.number}
                      </div>
                    </div>

                    {/* Step Content Card */}
                    <div className="w-full max-w-[330px] rounded-[2rem] bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 p-5 shadow-lg flex flex-col items-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-2">
                        <IconComp size={13} />
                        <span>{feat.subtitle}</span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-english leading-relaxed">
                        {feat.description}
                      </p>

                      {/* 3D Phone Mockup */}
                      <Link
                        href={feat.link}
                        className="relative w-full max-w-[240px] aspect-[1/1.9] my-4 block active:scale-95 transition-transform"
                      >
                        <Image
                          src={feat.mockup}
                          alt={feat.alt}
                          fill
                          sizes="240px"
                          className="object-contain drop-shadow-xl"
                        />
                      </Link>

                      <Link
                        href={feat.link}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        <span>{feat.linkText}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ MAPPING LINE ENDPOINT: DOWNLOAD WEB APP BUTTON & RAYS ══ */}
        <div className="mt-14 sm:mt-20 flex flex-col items-center text-center relative z-20">
          {/* Connecting Road Line from Above straight to Button */}
          <div className="w-[3px] h-10 sm:h-12 bg-gradient-to-b from-blue-500/40 via-blue-600 to-blue-600 mb-3 rounded-full" />

          {/* Button Wrapper with Decorative Radiant Sparks */}
          <div className="relative inline-block group">
            {/* Top-Left Spark Rays */}
            <div className="absolute -top-3 -left-6 text-blue-500 dark:text-sky-400 pointer-events-none select-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-[-15deg]">
                <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="3" y1="13" x2="7" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Top-Right Spark Rays */}
            <div className="absolute -top-3 -right-6 text-blue-500 dark:text-sky-400 pointer-events-none select-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-[15deg]">
                <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="19" y1="6" x2="16" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="21" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Glowing Ambient Halo */}
            <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10" />

            {/* Download Web App Button */}
            <button
              onClick={handleDownloadClick}
              disabled={isInstalling}
              className="relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer min-h-[50px]"
            >
              <Download size={18} className="animate-bounce" />
              <span>{isInstalling ? "Opening Web App..." : "Download Web App"}</span>
            </button>
          </div>

          {/* Subtext */}
          <p className="mt-4 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-english">
            Join 14 campuses. Be part of something bigger.
          </p>
        </div>
      </div>
    </section>
  );
}
