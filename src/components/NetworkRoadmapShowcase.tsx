"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  School,
  MessageSquareText,
  BookOpen,
  Download,
  ArrowRight,
} from "lucide-react";
import PhoneMockup3D, { type TiltVariant } from "./PhoneMockup3D";
import {
  getRoadmapSettings,
  DEFAULT_ROADMAP_SETTINGS,
  type FirestoreRoadmapSettings,
} from "@/lib/firestore";

const ICON_MAP = [MessageSquareText, Users, School, BookOpen];

const DESKTOP_TILT_VARIANTS: TiltVariant[] = [
  "hero",      // 01: Hero 100%, slight left tilt
  "stories",   // 02: ~83%, slight right tilt, lower
  "colleges",  // 03: ~88%, slight left tilt, elevated
  "learn",     // 04: ~74%, slight right tilt, receding
];

export default function NetworkRoadmapShowcase() {
  const [settings, setSettings] = useState<FirestoreRoadmapSettings>(DEFAULT_ROADMAP_SETTINGS);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    getRoadmapSettings()
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => {
        console.error("Failed to load roadmap settings:", err);
      });
  }, []);

  const handleDownloadClick = () => {
    setIsInstalling(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ttc-request-install"));
    }
    setTimeout(() => setIsInstalling(false), 500);
  };

  const scrollToMobileSection = (id: string) => {
    const el = document.getElementById(`feature-chapter-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (!settings.isVisible) return null;

  const features = settings.features || DEFAULT_ROADMAP_SETTINGS.features;

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-24 lg:pb-36 bg-gradient-to-b from-white via-slate-50/70 to-[#F4F6F9] dark:from-[#08080C] dark:via-[#0C0D14] dark:to-[#08080C] transition-colors duration-500">
      {/* ── Subtle Ambient Studio Lighting ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-blue-500/[0.035] dark:bg-blue-600/[0.025] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-sky-400/[0.03] dark:bg-sky-500/[0.02] blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ══ SECTION HEADER ══ */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 lg:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[54px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] font-sora"
          >
            {settings.titlePrefix || "A Network to Connect "}
            <span className="relative inline-block text-blue-600 dark:text-sky-400">
              {settings.titleAccent || "Every TTCian."}
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
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-400 font-normal max-w-xl mx-auto font-english"
          >
            {settings.subtitle ||
              "Designed exclusively for teachers, trainees, and students across 14 Government Teachers' Training Colleges."}
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DESKTOP & TABLET VIEW (md and up):
            4 Top Feature Columns + Continuous Blue Connector Path + 4 Interconnected 3D Phones
        ══════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:block relative">
          {/* Top Feature Headers (4 Columns with Pill Numbers & Icons) */}
          <div className="grid grid-cols-4 gap-4 lg:gap-8 mb-6 lg:mb-8 relative z-20">
            {features.map((feat, idx) => {
              const IconComp = ICON_MAP[idx] || MessageSquareText;
              const isHovered = hoveredIndex === idx;

              return (
                <motion.div
                  key={feat.id || idx}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex flex-col items-start px-2 group cursor-pointer transition-all duration-300 rounded-2xl p-2.5 ${
                    isHovered ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Number Badge Pill */}
                  <div
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider mb-2.5 shadow-2xs transition-colors duration-300 ${
                      isHovered
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:text-sky-400 dark:border-blue-800/60"
                    }`}
                  >
                    {feat.number}
                  </div>

                  {/* Clean Icon Box */}
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-2.5 shadow-xs transition-all duration-300 ${
                      isHovered
                        ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-sm shadow-blue-500/20"
                        : "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-blue-600 dark:text-sky-400 group-hover:border-blue-400"
                    }`}
                  >
                    <IconComp size={19} />
                  </div>

                  {/* Title & Description */}
                  <h3
                    className={`text-base lg:text-[17px] font-bold tracking-tight leading-snug font-sora transition-colors duration-200 ${
                      isHovered
                        ? "text-blue-600 dark:text-sky-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {feat.title}
                  </h3>
                  <p className="text-xs lg:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-normal font-english line-clamp-2 max-w-[240px]">
                    {feat.description}
                  </p>

                  {/* Vertical Guide Line pointing downward toward the phone */}
                  <div className="w-[1.5px] h-5 bg-gradient-to-b from-blue-500/30 to-blue-500/80 mt-2.5 rounded-full" />
                </motion.div>
              );
            })}
          </div>

          {/* ── 4 Physical 3D Phone Mockups Grid Stage & Synchronized Flowing Line ── */}
          <div className="relative z-10 pt-4 pb-14">
            {/* Continuous Electric-Blue SVG Spline Path (Anchored directly inside the phone stage!) */}
            <div className="absolute inset-x-0 top-0 h-[280px] pointer-events-none z-0">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 1200 280"
                fill="none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="electricBluePathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                    <stop offset="10%" stopColor="#2563EB" stopOpacity="0.95" />
                    <stop offset="38%" stopColor="#38BDF8" stopOpacity="0.95" />
                    <stop offset="65%" stopColor="#2563EB" stopOpacity="0.95" />
                    <stop offset="88%" stopColor="#60A5FA" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.2" />
                  </linearGradient>

                  <filter id="subtlePathGlow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Continuous fluid spline: passes directly through the upper third of all 4 phones */}
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  d="M 0 100 C 50 100, 100 110, 150 110 C 200 110, 250 130, 300 130 C 350 130, 400 135, 450 135 C 500 135, 550 105, 600 105 C 650 105, 700 90, 750 90 C 800 90, 850 120, 900 120 C 950 120, 1000 130, 1050 130 C 1100 130, 1150 115, 1200 110"
                  stroke="url(#electricBluePathGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#subtlePathGlow)"
                />

                {/* Node 1: Circular Ring Connector between Phone 1 and Phone 2 (x=300, y=130) */}
                <g transform="translate(300, 130)">
                  <circle
                    r="8"
                    className="stroke-blue-400/80 fill-blue-50/80 dark:fill-[#0d1424]"
                    strokeWidth="1.6"
                  />
                  <circle r="3.2" className="fill-blue-600 dark:fill-sky-400" />
                </g>

                {/* Node 2: Circular Ring Connector between Phone 2 and Phone 3 (x=600, y=105) */}
                <g transform="translate(600, 105)">
                  <circle
                    r="8"
                    className="stroke-sky-400/80 fill-sky-50/80 dark:fill-[#0d1424]"
                    strokeWidth="1.6"
                  />
                  <circle r="3.2" className="fill-sky-500 dark:fill-sky-400" />
                </g>

                {/* Node 3: Circular Ring Connector between Phone 3 and Phone 4 (x=900, y=120) */}
                <g transform="translate(900, 120)">
                  <circle
                    r="8"
                    className="stroke-blue-400/80 fill-blue-50/80 dark:fill-[#0d1424]"
                    strokeWidth="1.6"
                  />
                  <circle r="3.2" className="fill-blue-600 dark:fill-sky-400" />
                </g>
              </svg>
            </div>

            {/* Grid of 4 Phones (Relative z-10 so they naturally sit in front of the line) */}
            <div className="grid grid-cols-4 gap-4 lg:gap-8 items-center relative z-10">
              {features.map((feat, idx) => {
                const tiltVariant = DESKTOP_TILT_VARIANTS[idx] || "hero";
                const isHovered = hoveredIndex === idx;

                return (
                  <motion.div
                    key={feat.id || idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + idx * 0.08, duration: 0.6, ease: "easeOut" }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="group relative flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Link href={feat.link} className="relative w-full block">
                      <PhoneMockup3D
                        imageSrc={feat.mockupImage || DEFAULT_ROADMAP_SETTINGS.features[idx]?.mockupImage || ""}
                        alt={feat.alt || feat.title}
                        tiltVariant={tiltVariant}
                        isHovered={isHovered}
                        priority={idx < 2}
                      />

                      {/* Subtle Floating Direct Link Button on Hover */}
                      <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/95 text-white dark:bg-white/95 dark:text-slate-950 text-[11px] font-bold shadow-xl backdrop-blur-md ring-1 ring-white/10">
                          <span>{feat.linkText}</span>
                          <ArrowRight size={11} />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MOBILE VIEW (under md):
            Editorial Vertical Storytelling Journey
        ══════════════════════════════════════════════════════════════════ */}
        <div className="block md:hidden">
          {/* Quick-Jump Step Pill Selector */}
          <div className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto no-scrollbar py-1">
            {features.map((feat, idx) => (
              <button
                key={feat.id || idx}
                onClick={() => scrollToMobileSection(feat.id || String(idx))}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 shadow-2xs active:scale-95"
              >
                <span className="text-[10px] font-black text-blue-600 dark:text-sky-400">{feat.number}</span>
                <span className="text-xs">{feat.tabLabel}</span>
              </button>
            ))}
          </div>

          {/* Sequential Storytelling Chapters */}
          <div className="space-y-8">
            {features.map((feat, idx) => {
              const IconComp = ICON_MAP[idx] || MessageSquareText;
              // Controlled subtle tilt alternating left/right for editorial rhythm
              const isEven = idx % 2 === 0;
              const mobileTilt = isEven ? "hero" : "stories";

              return (
                <div
                  key={feat.id || idx}
                  id={`feature-chapter-${feat.id || idx}`}
                  className="flex flex-col items-center text-center"
                >
                  {/* Feature Header Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center mb-4 px-4"
                  >
                    {/* Badge & Subtitle */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shadow-xs">
                        {feat.number}
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">
                        {feat.subtitle}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug font-sora">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal font-english max-w-[300px] leading-relaxed">
                      {feat.description}
                    </p>
                  </motion.div>

                  {/* 3D Phone Mockup Container (Large, clear, and perfectly readable) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="relative w-full max-w-[260px] flex flex-col items-center my-2"
                  >
                    <Link href={feat.link} className="block w-full active:scale-95 transition-transform">
                      <PhoneMockup3D
                        imageSrc={feat.mockupImage || DEFAULT_ROADMAP_SETTINGS.features[idx]?.mockupImage || ""}
                        alt={feat.alt || feat.title}
                        tiltVariant={mobileTilt}
                        overrideScale={0.96}
                        overrideYOffset={0}
                        sizes="260px"
                        priority={idx === 0}
                      />
                    </Link>

                    {/* Direct Explore Link Button */}
                    <Link
                      href={feat.link}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all mt-4"
                    >
                      <span>{feat.linkText}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </motion.div>

                  {/* Vertical Journey Connector Path to Next Chapter (omitted on last item) */}
                  {idx < features.length - 1 && (
                    <div className="flex flex-col items-center justify-center my-4 h-12">
                      <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
                        <path
                          d="M 20 0 C 30 16, 10 34, 20 50"
                          stroke="#2563EB"
                          strokeWidth="2.2"
                          strokeDasharray="3 3"
                          className="opacity-50 dark:opacity-70"
                        />
                        <circle
                          cx="20"
                          cy="25"
                          r="5.5"
                          className="fill-blue-500/10 stroke-blue-500"
                          strokeWidth="1.5"
                        />
                        <circle cx="20" cy="25" r="2.5" className="fill-blue-600 dark:fill-sky-400" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MAPPING LINE ENDPOINT: DOWNLOAD WEB APP BUTTON & RADIANT RAYS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mt-14 sm:mt-20 flex flex-col items-center text-center relative z-20">
          {/* Vertical Blue Anchor Lead-In */}
          <div className="w-[2.5px] h-10 sm:h-12 bg-gradient-to-b from-blue-500/30 via-blue-600 to-blue-600 mb-3 rounded-full" />

          {/* Button Container with Radiant Sparks */}
          <div className="relative inline-block group">
            {/* Top-Left Radiant Spark Rays */}
            <div className="absolute -top-3 -left-6 text-blue-500 dark:text-sky-400 pointer-events-none select-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-[-15deg]">
                <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="3" y1="13" x2="7" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Top-Right Radiant Spark Rays */}
            <div className="absolute -top-3 -right-6 text-blue-500 dark:text-sky-400 pointer-events-none select-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="rotate-[15deg]">
                <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="19" y1="6" x2="16" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="21" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Glowing Ambient Halo */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl group-hover:blur-2xl transition-all duration-300 -z-10" />

            {/* Download Web App Action Button */}
            <button
              onClick={handleDownloadClick}
              disabled={isInstalling}
              className="relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer min-h-[50px]"
            >
              <Download size={18} className="animate-bounce" />
              <span>{isInstalling ? "অ্যাপ অপশন খুলছে..." : settings.downloadButtonText || "অ্যাপ ডাউনলোড করুন"}</span>
            </button>
          </div>

          {/* Subtext */}
          <p className="mt-4 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-english">
            {settings.downloadSubtext || "Join 14 campuses. Be part of something bigger."}
          </p>
        </div>
      </div>
    </section>
  );
}
