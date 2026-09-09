"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Users,
  Target,
  Sparkles,
  Code,
  ArrowRight,
  HelpCircle,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Monitor,
  Trophy,
  FileCheck,
  Award,
  Clipboard,
  Pencil,
  School,
  UserCheck,
  FileText,
  CheckSquare,
  Landmark,
  Coins,
  Linkedin,
  Mail,
  Link2Off,
  MicOff,
  FileWarning,
  Book,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Receipt,
  Info,
  type LucideIcon,
} from "lucide-react";
import OrbitalHero from "@/components/OrbitalHero";
import NetworkRoadmapShowcase from "@/components/NetworkRoadmapShowcase";
import BuilderPopupModal from "@/components/BuilderPopupModal";
import OfficialContactCard from "@/components/OfficialContactCard";
import {
  getVisibleAdmissionSteps,
  getVisibleAdmissionCosts,
  getAdmissionSettings,
  getBuilderSettings,
  getOfficialSettings,
  getOriginStorySettings,
  type FirestoreAdmissionStep,
  type FirestoreAdmissionCostItem,
  type FirestoreAdmissionSettings,
  type FirestoreBuilderSettings,
  type FirestoreOfficialSettings,
  type FirestoreOriginStorySettings,
} from "@/lib/firestore";

/* ─── Icon Map (resolves Firestore iconName → Lucide component) ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  Monitor,
  Trophy,
  FileCheck,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Clock,
  Award,
  Clipboard,
  Pencil,
  School,
  UserCheck,
  FileText,
  CheckSquare,
  Landmark,
  Coins,
  HelpCircle,
};

/* ─── Admission Step Themes & Bengali Badging ─── */
const ADMISSION_STEP_THEMES = [
  {
    bengaliNum: "০১",
    phaseTag: "প্রাথমিক পর্যায়",
    nodeGradient: "from-blue-600 to-indigo-600",
    ringCol: "ring-blue-500/20 dark:ring-blue-400/25",
    pillBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/50",
    topAccent: "from-blue-600 via-indigo-600 to-sky-500",
    highlights: ["আবেদন ফি: ৩৫০/-", "পোর্টাল: app1.nu.edu.bd", "এসএসসি ও এইচএসসি তথ্য"],
  },
  {
    bengaliNum: "০২",
    phaseTag: "বাছাই ও ফলাফল",
    nodeGradient: "from-teal-600 to-cyan-600",
    ringCol: "ring-teal-500/20 dark:ring-teal-400/25",
    pillBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/50",
    topAccent: "from-teal-600 via-cyan-600 to-emerald-500",
    highlights: ["জিপিএ ভিত্তিক মেধা তালিকা", "বিষয়/কলেজ মাইগ্রেশন সুবিধা", "১ম ও ২য় রিলিজ স্লিপ"],
  },
  {
    bengaliNum: "০৩",
    phaseTag: "কাগজপত্র যাচাই",
    nodeGradient: "from-indigo-600 to-purple-600",
    ringCol: "ring-indigo-500/20 dark:ring-indigo-400/25",
    pillBg: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50",
    topAccent: "from-indigo-600 via-purple-600 to-violet-500",
    highlights: ["মূল মার্কশিট ও প্রশংসাপত্র", "রঙিন পাসপোর্ট সাইজ ছবি", "কলেজ অফিসে ভেরিফিকেশন"],
  },
  {
    bengaliNum: "০৪",
    phaseTag: "চূড়ান্ত ভর্তি",
    nodeGradient: "from-emerald-600 to-teal-600",
    ringCol: "ring-emerald-500/20 dark:ring-emerald-400/25",
    pillBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50",
    topAccent: "from-emerald-600 via-teal-600 to-cyan-500",
    highlights: ["কলেজ রোল ও আইডি কার্ড", "ক্লাস রুটিন ও ওরিয়েন্টেশন", "৪ বছর মেয়াদী সেমিস্টার শুরু"],
  },
];

/* ─── Story Timeline Data ─── */
const STORY_TIMELINE = [
  {
    id: "identity",
    title: "TTC Exists. But No One Really Knows It.",
    icon: Landmark,
    story: "B.Ed Honours is a real bachelor's degree and M.Ed is a respected master's. But ask anyone outside the teacher community — they'll just say 'oh, that's the teacher training place.' There's no single space to showcase what TTC truly is — its teachers, students, programmes, and achievements. TTC deserved a proper identity. It never had one.",
  },
  {
    id: "bridge",
    title: "Teachers and Students — In the Same System, But Worlds Apart.",
    icon: Users,
    story: "A teacher in Feni has no idea what a brilliant teacher in Dhaka is doing. A student finishing their first year has no way to reach a senior who already walked that path. The TTC community is scattered — and there was no bridge.",
  },
  {
    id: "meaning",
    title: "What Am I Even Doing Here?",
    icon: Target,
    story: "Most TTC students enter without a clear picture of what this journey means or where it leads. No platform existed where they could ask real questions, share their confusion, explore ideas, or understand what it truly means to build a career as a TTCian.",
  },
  {
    id: "information",
    title: "The Notice Was There. You Just Missed It.",
    icon: ClipboardList,
    story: "Important updates buried in group chats. Notice boards with faded ink. A new student trying to decide whether to enrol in B.Ed Honours — with nowhere reliable to look. Information existed, but it was never organized for the people who needed it most.",
  },
  {
    id: "knowledge",
    title: "The Study Material Vanished With the Batch.",
    icon: Book,
    story: "A teacher shares a resource in class. A student needs it three months later — it's gone. Teachers re-share the same material batch after batch with no central home. Students scramble when it matters most. Knowledge existed — it just had nowhere to live.",
  },
];



/* ─── Animation Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

/* ─── Admission Step Card ─── */
function AdmissionStepCard({
  step,
  index,
  isLast,
}: {
  step: FirestoreAdmissionStep & { id: string };
  index: number;
  isLast?: boolean;
}) {
  const theme = ADMISSION_STEP_THEMES[index % ADMISSION_STEP_THEMES.length];
  const IconComponent = ICON_MAP[step.iconName] || GraduationCap;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="relative flex gap-3 sm:gap-5 items-stretch group"
    >
      {/* Timeline Node Column (Minimalist Circular Stepper) */}
      <div className="flex-shrink-0 flex flex-col items-center pt-1 sm:pt-1.5">
        <div
          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${theme.nodeGradient} text-white font-bold text-xs sm:text-sm shadow-sm ring-4 ${theme.ringCol} flex items-center justify-center flex-shrink-0 aspect-square select-none relative z-10 transition-transform duration-200 group-hover:scale-110`}
        >
          <span className="font-bengali leading-none">{theme.bengaliNum}</span>
        </div>
        {!isLast && (
          <div className="flex-1 w-[2px] my-1 sm:my-1.5 bg-gradient-to-b from-blue-500/30 via-teal-500/25 to-indigo-500/20 dark:from-sky-400/25 dark:via-teal-400/20 dark:to-indigo-400/15 rounded-full" />
        )}
      </div>

      {/* Step Content Card */}
      <div className="admission-step-card flex-1 p-4 sm:p-6 mb-4 sm:mb-6">
        {/* Top Accent Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2.5px] rounded-t-[16px] sm:rounded-t-[20px] bg-gradient-to-r ${theme.topAccent} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}
        />

        {/* Header Row: Icon + Title + Phase Badge */}
        <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${theme.nodeGradient} flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:scale-105 flex-shrink-0`}
            >
              <IconComponent size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-bengali leading-snug">
                {step.title}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 font-bengali mt-0.5 truncate">
                {step.subtitle}
              </p>
            </div>
          </div>

          <span
            className={`flex-shrink-0 inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${theme.pillBg} font-bengali tracking-wide whitespace-nowrap`}
          >
            {theme.phaseTag}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-bengali">
          {step.description}
        </p>

        {/* Key Highlights Chips */}
        {theme.highlights && theme.highlights.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-3 border-t border-dashed border-gray-100 dark:border-white/5 flex flex-wrap gap-1.5 sm:gap-2">
            {theme.highlights.map((point, pIdx) => (
              <span
                key={pIdx}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium bg-gray-50 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5 font-bengali"
              >
                <CheckCircle2 size={11} className="text-teal-600 dark:text-teal-400 flex-shrink-0 sm:w-3 sm:h-3" />
                <span>{point}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Cost Breakdown Panel ─── */
function CostBreakdownPanel({
  costs,
  title,
}: {
  costs: (FirestoreAdmissionCostItem & { id: string })[];
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="admission-cost-panel p-4 sm:p-7"
    >
      {/* Header with Verified Shield */}
      <div className="flex items-start justify-between gap-3 pb-4 sm:pb-5 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Coins size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-white font-bengali">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider font-bengali">
                ১৪টি সরকারি টিটিসি-র জন্য প্রযোজ্য
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Affordability highlight alert */}
      <div className="mt-3.5 sm:mt-4 p-3 sm:p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] sm:text-xs font-bengali text-blue-900 dark:text-blue-200 flex items-start gap-2 sm:gap-2.5 leading-relaxed">
        <Info size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 sm:w-4 sm:h-4" />
        <span>
          সরকারি টিচার্স ট্রেনিং কলেজে বি.এড (অনার্স) প্রোগ্রাম সম্পূর্ণ সরকারি অর্থায়নে পরিচালিত হওয়ায় খরচ দেশের যেকোনো গ্র্যাজুয়েশন কোর্সের তুলনায় অত্যন্ত সাশ্রয়ী।
        </span>
      </div>

      {/* Cost List */}
      <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-2.5">
        {costs.map((cost) => {
          if (cost.isHighlighted) {
            return (
              <motion.div
                key={cost.id}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="admission-cost-row-highlight mt-3 sm:mt-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs"
              >
                <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Receipt size={14} className="text-primary dark:text-sky-400 flex-shrink-0" />
                      <span className="text-xs sm:text-[15px] font-extrabold text-gray-900 dark:text-white font-bengali">
                        {cost.label}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-bengali mt-0.5 pl-4 sm:pl-5">
                      ৮টি সেমিস্টার ও পরীক্ষা ফি সহ আনুমানিক
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs sm:text-base font-black text-primary dark:text-sky-400 font-bengali tracking-tight bg-white dark:bg-black/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-primary/20 dark:border-sky-400/20 shadow-xs whitespace-nowrap">
                      {cost.amount}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <div
              key={cost.id}
              className="flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 dark:bg-sky-400/60 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 font-bengali truncate">
                  {cost.label}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white font-bengali whitespace-nowrap bg-white dark:bg-white/5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-gray-100 dark:border-white/5 flex-shrink-0">
                {cost.amount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Official NU Portal CTA */}
      <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-gray-100 dark:border-white/10">
        <a
          href="http://app1.nu.edu.bd"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200 font-bengali group"
        >
          <span>জাতীয় বিশ্ববিদ্যালয় ভর্তি পোর্টাল</span>
          <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>

      {/* Footer note */}
      <div className="mt-2.5 sm:mt-3 text-center">
        <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-bengali leading-relaxed">
          * কলেজ ও জাতীয় বিশ্ববিদ্যালয়ের নির্দেশিকা অনুসারে ফি সামান্য পরিবর্তিত হতে পারে।
        </p>
      </div>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─── */
export default function HomePage() {
  const router = useRouter();
  const [admissionSteps, setAdmissionSteps] = useState<(FirestoreAdmissionStep & { id: string })[]>([]);
  const [admissionCosts, setAdmissionCosts] = useState<(FirestoreAdmissionCostItem & { id: string })[]>([]);
  const [admissionSettings, setAdmissionSettings] = useState<FirestoreAdmissionSettings | null>(null);
  const [loadingAdmission, setLoadingAdmission] = useState(true);

  const [builderSettings, setBuilderSettings] = useState<FirestoreBuilderSettings | null>(null);
  const [officialSettings, setOfficialSettings] = useState<FirestoreOfficialSettings | null>(null);
  const [originStorySettings, setOriginStorySettings] = useState<FirestoreOriginStorySettings | null>(null);
  const [showBuilderPopup, setShowBuilderPopup] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA) or entered via PWA start URL
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.cookie.split("; ").some((c) => c === "pwa_mode=true");

    if (isStandalone) {
      router.replace("/news-feed");
      return;
    }

    Promise.all([
      getVisibleAdmissionSteps(),
      getVisibleAdmissionCosts(),
      getAdmissionSettings(),
    ])
      .then(([steps, costs, settings]) => {
        setAdmissionSteps(steps);
        setAdmissionCosts(costs);
        setAdmissionSettings(settings);
      })
      .catch(console.error)
      .finally(() => setLoadingAdmission(false));

    getBuilderSettings().then(setBuilderSettings).catch(console.error);
    getOfficialSettings().then(setOfficialSettings).catch(console.error);
    getOriginStorySettings().then(setOriginStorySettings).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen">
      {/* ===== HERO SECTION (ORBITAL ANIMATION) ===== */}
      <OrbitalHero />

      {/* ===== 3D MOBILE ROADMAP SHOWCASE ===== */}
      <NetworkRoadmapShowcase />

      {/* ===== ADMISSION PROCESS GUIDE ===== */}
      {admissionSettings?.isVisible !== false && (
        <section
          id="admission-guide"
          className="py-12 sm:py-24 px-3 sm:px-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(26,86,219,0.02) 0%, transparent 40%, rgba(139,92,246,0.02) 100%)",
          }}
        >
          {/* Background decorative blurs */}
          <div className="absolute top-20 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 -right-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto relative">
            {/* Section Header */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={containerVariants}
              className="text-center mb-10 sm:mb-14"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-full mb-4 sm:mb-5"
              >
                <GraduationCap size={14} className="text-primary" />
                <span className="text-[11px] sm:text-xs font-bold text-primary tracking-wide uppercase">
                  Admission Guide
                </span>
              </motion.div>

              <motion.h2
                variants={itemVariants}
                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white font-bengali leading-tight"
              >
                {admissionSettings?.sectionTitle || "বি.এড (অনার্স) ভর্তি প্রক্রিয়া"}
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-bengali"
              >
                {admissionSettings?.sectionSubtitle || "সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সহজ ও পূর্ণাঙ্গ গাইডলাইন"}
              </motion.p>

              {/* Quick Overview Badges */}
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-3xl mx-auto mt-6"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 shadow-xs text-xs font-semibold text-gray-700 dark:text-gray-200 font-bengali">
                  <School size={13} className="text-primary dark:text-sky-400" />
                  <span>১৪টি সরকারি টিটিসি</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 shadow-xs text-xs font-semibold text-gray-700 dark:text-gray-200 font-bengali">
                  <Clock size={13} className="text-teal-600 dark:text-teal-400" />
                  <span>কোর্স মেয়াদ: ৪ বছর (৮টি সেমিস্টার)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 shadow-xs text-xs font-semibold text-gray-700 dark:text-gray-200 font-bengali">
                  <Award size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>ভর্তি পরীক্ষা নেই • জিপিএ ভিত্তিক মেধা</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 shadow-xs text-xs font-semibold text-gray-700 dark:text-gray-200 font-bengali">
                  <Coins size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>সরকারি সাবসিডিপ্রাপ্ত স্বল্পতম খরচ</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Content Grid: Timeline + Cost Panel */}
            {loadingAdmission ? (
              /* Shimmer Loading */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-5">
                      <div className="w-[60px] h-[60px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse flex-shrink-0" />
                      <div className="flex-1 bg-white dark:bg-[#16181C] rounded-[20px] border border-gray-100 dark:border-white/5 p-6 animate-pulse">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-4" />
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-[#16181C] rounded-[20px] border border-gray-100 dark:border-white/5 p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6" />
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between mb-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/5" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : admissionSteps.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                ভর্তি প্রক্রিয়ার তথ্য শীঘ্রই আপডেট করা হবে।
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
                {/* Timeline Steps */}
                <div className="lg:col-span-3">
                  {admissionSteps.map((step, index) => (
                    <AdmissionStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      isLast={index === admissionSteps.length - 1}
                    />
                  ))}
                </div>

                {/* Cost Breakdown Panel */}
                {admissionCosts.length > 0 && (
                  <div className="lg:col-span-2 lg:sticky lg:top-24">
                    <CostBreakdownPanel
                      costs={admissionCosts}
                      title={admissionSettings?.costTitle || "খরচের আনুমানিক ধারণা"}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== WHY TTC NETWORK EXISTS (Card-Based Storytelling) ===== */}
      {originStorySettings?.isVisible !== false && (
      <section className="py-24 sm:py-32 px-4 relative overflow-hidden bg-white dark:bg-[#050505] transition-colors duration-500">
        <div className="max-w-6xl mx-auto relative z-10">

          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 rounded-full mb-6 border border-red-500/10"
            >
              <Heart size={14} className="text-red-500" />
              <span className="text-[10px] font-black tracking-widest uppercase text-red-500">
                The Origin Story
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white mb-6 font-sora tracking-tight"
            >
              Why TTC Network <span className="text-red-500">Exists</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-slate-600 dark:text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Every TTC student and teacher deserves better. Here&apos;s what we kept seeing — and couldn&apos;t ignore.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 01. Identity (Full Width Top Card) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 relative group overflow-hidden p-8 sm:p-12 rounded-[2rem] border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-amber-500/[0.03] hover:bg-slate-50 dark:hover:bg-amber-500/[0.06] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Landmark size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-6 leading-tight transition-colors">
                    {STORY_TIMELINE[0].title}
                  </h3>
                  <p className="text-slate-600 dark:text-gray-400 text-base sm:text-lg leading-relaxed max-w-3xl transition-colors">
                    {STORY_TIMELINE[0].story}
                  </p>
                </div>
              </div>

              {/* Large decorative icon in background */}
              <Landmark size={200} className="absolute -bottom-10 -right-10 text-amber-500/5 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            </motion.div>

            {/* 02. Bridge (Blue) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative group overflow-hidden p-8 sm:p-10 rounded-[2rem] border border-slate-200 dark:border-blue-500/20 bg-white dark:bg-blue-500/[0.03] hover:bg-slate-50 dark:hover:bg-blue-500/[0.06] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-8">
                  <Users size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6 leading-snug transition-colors">
                  {STORY_TIMELINE[1].title}
                </h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed transition-colors">
                  {STORY_TIMELINE[1].story}
                </p>
              </div>
            </motion.div>

            {/* 03. Meaning (Purple) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative group overflow-hidden p-8 sm:p-10 rounded-[2rem] border border-slate-200 dark:border-purple-500/20 bg-white dark:bg-purple-500/[0.03] hover:bg-slate-50 dark:hover:bg-purple-500/[0.06] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-8">
                  <Target size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6 leading-snug transition-colors">
                  {STORY_TIMELINE[2].title}
                </h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed transition-colors">
                  {STORY_TIMELINE[2].story}
                </p>
              </div>
            </motion.div>

            {/* 04. Information (Green) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative group overflow-hidden p-8 sm:p-10 rounded-[2rem] border border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/[0.03] hover:bg-slate-50 dark:hover:bg-emerald-500/[0.06] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8">
                  <ClipboardList size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6 leading-snug transition-colors">
                  {STORY_TIMELINE[3].title}
                </h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed transition-colors">
                  {STORY_TIMELINE[3].story}
                </p>
              </div>
            </motion.div>

            {/* 05. Knowledge (Red) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="relative group overflow-hidden p-8 sm:p-10 rounded-[2rem] border border-slate-200 dark:border-red-500/20 bg-white dark:bg-red-500/[0.03] hover:bg-slate-50 dark:hover:bg-red-500/[0.06] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-8">
                  <Book size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6 leading-snug transition-colors">
                  {STORY_TIMELINE[4].title}
                </h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed transition-colors">
                  {STORY_TIMELINE[4].story}
                </p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 dark:bg-red-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 dark:bg-amber-500/5 blur-[120px] rounded-full" />
        </div>
      </section>
      )}





      {/* ===== FOUNDER SPOTLIGHT (Built by One of Your Own) ===== */}
      {builderSettings?.isVisible !== false && (
        <section className="py-24 sm:py-32 px-4 relative overflow-hidden bg-white dark:bg-[#0C0C10]">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
              className="relative"
            >
              {/* Journal Header Decoration */}
              <div className="absolute top-0 left-0 text-[100px] font-handwritten text-gray-100 dark:text-white/5 -translate-y-1/2 pointer-events-none select-none">
                Entry #01
              </div>

              <div className="flex flex-col items-center text-center">
                {/* Avatar with Hand-Drawn Border */}
                <div className="relative mb-12">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 relative z-10">
                    <div className="absolute inset-0 hand-drawn-border text-primary dark:text-indigo-400 rotate-6" />
                    <div className="absolute inset-0 hand-drawn-border text-accent -rotate-3" />

                    <div className="absolute inset-2 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
                      {builderSettings?.imageMode === 'image' && builderSettings?.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={builderSettings.imageUrl}
                          alt={builderSettings.builderName}
                          className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300 dark:text-white/20">
                          {builderSettings?.imageText || "S"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Persona Annotation */}
                  <div className="absolute -right-12 top-1/2 -translate-y-1/2 rotate-12 font-handwritten text-xl text-accent dark:text-pink-500 whitespace-nowrap">
                    built by a student.
                  </div>
                </div>

                {/* Editorial Info */}
                <div className="max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10 mb-8">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-[0.3em] uppercase">
                      Founder & Builder
                    </span>
                  </div>

                  <h2 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tighter leading-none">
                    {builderSettings?.titlePrefix || "Built by "}
                    <span className="text-primary dark:text-indigo-400 underline decoration-primary/20 decoration-wavy underline-offset-[12px]">
                      {builderSettings?.titleAccent || "One of Your Own"}
                    </span>
                  </h2>

                  <div className="space-y-8 text-xl sm:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed">
                    <p className="font-medium">
                      {builderSettings?.descriptionPara1 || "This platform was not designed in a corporate office. It was imagined by a student sitting inside Government Teachers' Training College, Feni."}
                    </p>

                    {/* The Centerpiece Quote */}
                    <blockquote className="py-12 relative">
                      <div className="text-6xl sm:text-8xl text-gray-100 dark:text-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        &ldquo;
                      </div>
                      <p className="raw-italic text-4xl sm:text-6xl text-gray-900 dark:text-white relative z-10 leading-[1.1]">
                        {builderSettings?.descriptionPara2 || "Every pixel of this platform carries that intention."}
                      </p>
                    </blockquote>
                  </div>

                  {/* Builder Meta */}
                  <div className="mt-12 flex flex-col items-center gap-6">
                    <div className="text-center">
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                        {builderSettings?.builderName || "MD. Eftakhar Amin Sakib"}
                      </h3>
                      <p className="text-sm font-bold text-accent uppercase tracking-widest mt-2 flex items-center justify-center gap-3">
                        <span className="w-8 h-[1px] bg-accent/30" />
                        {builderSettings?.builderTitle || "UI/UX Designer & Frontend Developer"}
                        <span className="w-8 h-[1px] bg-accent/30" />
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowBuilderPopup(true)}
                        className="group flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full text-sm font-black transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 active:scale-95"
                      >
                        Say Hello 👋
                      </button>

                      <div className="flex items-center gap-2 group cursor-default">
                        <Heart size={20} className="text-accent group-hover:scale-125 transition-transform" fill="currentColor" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                          Built for TTCians
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Official Contact Card */}
      {officialSettings && <OfficialContactCard settings={officialSettings} />}

      {/* ===== BUILDER POPUP MODAL ===== */}
      <BuilderPopupModal
        show={showBuilderPopup}
        onClose={() => setShowBuilderPopup(false)}
        builderSettings={builderSettings!}
      />

    </div>
  );
}
