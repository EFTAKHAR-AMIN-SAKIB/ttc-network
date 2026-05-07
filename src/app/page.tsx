"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Users,
  Target,
  Sparkles,
  Code,
  ArrowRight,
  ChevronDown,
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
  type LucideIcon,
} from "lucide-react";
import OrbitalHero from "@/components/OrbitalHero";
import BuilderPopupModal from "@/components/BuilderPopupModal";
import OfficialContactCard from "@/components/OfficialContactCard";
import {
  getVisibleQACards,
  getVisibleAdmissionSteps,
  getVisibleAdmissionCosts,
  getAdmissionSettings,
  getBuilderSettings,
  getOfficialSettings,
  getOriginStorySettings,
  type FirestoreQACard,
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

/* ─── Step Color Palette ─── */
const STEP_COLORS = [
  { gradient: "from-blue-500 to-indigo-600", bg: "rgba(59,130,246,0.08)", accent: "#3B82F6" },
  { gradient: "from-amber-500 to-orange-600", bg: "rgba(245,158,11,0.08)", accent: "#F59E0B" },
  { gradient: "from-emerald-500 to-teal-600", bg: "rgba(16,185,129,0.08)", accent: "#10B981" },
  { gradient: "from-violet-500 to-purple-600", bg: "rgba(139,92,246,0.08)", accent: "#8B5CF6" },
];

/* ─── FAQ Styles ─── */
const QA_STYLES = [
  { icon: GraduationCap, color: "from-blue-500 to-indigo-600" },
  { icon: BookOpen, color: "from-emerald-500 to-teal-600" },
  { icon: ClipboardCheck, color: "from-orange-500 to-red-500" },
  { icon: Clock, color: "from-violet-500 to-purple-600" },
];

/* ─── Story Timeline Data ─── */
const STORY_TIMELINE = [
  {
    id: "identity",
    title: "TTC Exists. But No One Really Knows It.",
    icon: Landmark,
    story: "B.Ed Honours is a real bachelor's degree. But ask anyone outside the teacher community — they'll just say 'oh, that's the teacher training place.' There's no single space to showcase what TTC truly is — its teachers, students, programmes, and achievements. TTC deserved a proper identity. It never had one.",
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

/* ─── FAQ Accordion Item ─── */
function FAQItem({
  faq,
  index,
}: {
  faq: FirestoreQACard & { id: string };
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const style = QA_STYLES[index % QA_STYLES.length];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full group"
      >
        <div
          className={`flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-[#16181C] border transition-all duration-300 ${open
            ? "border-primary/20 shadow-lg shadow-primary/5"
            : "border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-white/20"
            }`}
        >
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center transition-transform duration-300 ${open ? "scale-110" : "group-hover:scale-105"}`}
          >
            <Icon size={18} className="text-white" />
          </div>

          {/* Question */}
          <h3 className="flex-1 text-left text-base sm:text-lg font-bold text-[#0F1419] dark:text-[#E7E9EA] font-bengali">
            {faq.question}
          </h3>

          {/* Chevron */}
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform duration-300 ${open ? "rotate-180 text-primary" : ""
              }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 pt-3 ml-14"
              style={{
                borderLeft: "3px solid #1A56DB",
                background: "var(--faq-answer-bg, rgba(238,242,255,0.5))",
                borderRadius: "0 0 14px 14px",
                marginLeft: "3.5rem",
              }}
            >
              <p className="text-sm sm:text-base text-[#0F1419] dark:text-[#E7E9EA] font-bengali leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Admission Step Card ─── */
function AdmissionStepCard({
  step,
  index,
}: {
  step: FirestoreAdmissionStep & { id: string };
  index: number;
}) {
  const colorSet = STEP_COLORS[index % STEP_COLORS.length];
  const IconComponent = ICON_MAP[step.iconName] || GraduationCap;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.5 }}
      className="relative flex gap-5 sm:gap-7"
    >
      {/* Timeline Node */}
      <div className="flex-shrink-0 flex flex-col items-center z-10">
        <div className="admission-step-badge w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl relative">
          <span className="relative z-10">{step.stepNumber}</span>
          {/* Animated ring */}
          <div className="absolute inset-[-4px] rounded-[20px] border-2 border-primary/20 dark:border-indigo-500/20 animate-pulse" />
        </div>
        {/* Connector line (hidden on last) */}
        <div className="flex-1 w-[3px] bg-gradient-to-b from-primary/30 to-transparent dark:from-indigo-500/20 min-h-[20px]" />
      </div>

      {/* Step Card */}
      <div className="admission-step-card flex-1 p-6 sm:p-7 mb-6 group">
        {/* Top accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px] bg-gradient-to-r ${colorSet.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
        />

        {/* Icon + Title Row */}
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colorSet.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
          >
            <IconComponent size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white font-bengali leading-snug">
              {step.title}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5 font-english tracking-wide">
              {step.subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm sm:text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed font-bengali">
          {step.description}
        </p>

        {/* Step indicator pill */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: colorSet.bg, color: colorSet.accent }}
          >
            ধাপ {step.stepNumber}
          </span>
        </div>
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="admission-cost-panel p-6 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <Coins size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white font-bengali">
            {title}
          </h3>
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            সরকারি কলেজের ক্ষেত্রে প্রযোজ্য
          </p>
        </div>
      </div>

      {/* Cost Rows */}
      <div className="space-y-2">
        {costs.map((cost, i) => (
          <motion.div
            key={cost.id}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 + 0.4, duration: 0.4 }}
            className={cost.isHighlighted ? "admission-cost-row-highlight" : "admission-cost-row"}
          >
            <div className="flex items-center justify-between gap-4">
              <span className={`text-sm font-bengali ${cost.isHighlighted ? "font-extrabold text-primary dark:text-indigo-400" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
                {cost.label}
              </span>
              <span className={`text-sm font-bengali whitespace-nowrap ${cost.isHighlighted ? "font-extrabold text-primary dark:text-indigo-400" : "font-bold text-gray-900 dark:text-white"}`}>
                {cost.amount}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5">
        <p className="text-[11px] text-gray-500 dark:text-gray-500 font-bengali leading-relaxed">
          * উপরোক্ত খরচের পরিমাণ আনুমানিক এবং জাতীয় বিশ্ববিদ্যালয়ের নির্দেশনা অনুসারে পরিবর্তন হতে পারে।
        </p>
      </div>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─── */
export default function HomePage() {
  const [qaCards, setQaCards] = useState<(FirestoreQACard & { id: string })[]>([]);
  const [loadingQA, setLoadingQA] = useState(true);
  const [admissionSteps, setAdmissionSteps] = useState<(FirestoreAdmissionStep & { id: string })[]>([]);
  const [admissionCosts, setAdmissionCosts] = useState<(FirestoreAdmissionCostItem & { id: string })[]>([]);
  const [admissionSettings, setAdmissionSettings] = useState<FirestoreAdmissionSettings | null>(null);
  const [loadingAdmission, setLoadingAdmission] = useState(true);

  const [builderSettings, setBuilderSettings] = useState<FirestoreBuilderSettings | null>(null);
  const [officialSettings, setOfficialSettings] = useState<FirestoreOfficialSettings | null>(null);
  const [originStorySettings, setOriginStorySettings] = useState<FirestoreOriginStorySettings | null>(null);
  const [showBuilderPopup, setShowBuilderPopup] = useState(false);

  useEffect(() => {
    getVisibleQACards()
      .then(setQaCards)
      .catch(console.error)
      .finally(() => setLoadingQA(false));

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

      {/* ===== FAQ SECTION — Right after Hero ===== */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="text-center mb-10"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-5"
            >
              <HelpCircle size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-wide uppercase">
                Quick Answers
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white font-english"
            >
              Everything About{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                TTC
              </span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="mt-3 text-[#536471] dark:text-[#71767B] text-sm max-w-lg mx-auto"
            >
              Common questions about Teachers&apos; Training College and the
              B.Ed Honours programme.
            </motion.p>
          </motion.div>

          {/* Accordion List */}
          <div className="space-y-3">
            {loadingQA ? (
              <div className="text-center text-gray-400 text-sm py-4">Loading Quick Answers...</div>
            ) : qaCards.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">No Quick Answers available.</div>
            ) : (
              qaCards.map((faq, index) => (
                <FAQItem key={faq.id} faq={faq} index={index} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===== ADMISSION PROCESS GUIDE ===== */}
      {admissionSettings?.isVisible !== false && (
        <section
          id="admission-guide"
          className="py-16 sm:py-24 px-4 relative overflow-hidden"
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
              className="text-center mb-14"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-5"
              >
                <GraduationCap size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary tracking-wide uppercase">
                  Admission Guide
                </span>
              </motion.div>

              <motion.h2
                variants={itemVariants}
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white font-bengali leading-tight"
              >
                {admissionSettings?.sectionTitle || "বি.এড (অনার্স) ভর্তি প্রক্রিয়া"}
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-bengali"
              >
                {admissionSettings?.sectionSubtitle || "সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সহজ ও পূর্ণাঙ্গ গাইডলাইন"}
              </motion.p>
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start">
                {/* Timeline Steps */}
                <div className="lg:col-span-3">
                  {admissionSteps.map((step, index) => (
                    <AdmissionStepCard key={step.id} step={step} index={index} />
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



      {/* ===== WHAT IT MEANS FOR EVERY TTCIAN (Emotional Narrative) ===== */}
      <section className="py-24 sm:py-32 px-4 relative bg-[#FAFAFA] dark:bg-[#08080A]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={containerVariants}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-6 border border-primary/10">
              <Users size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase text-center w-full">
                For the Community
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white font-sora tracking-tight leading-none">
              A space for <span className="text-primary underline decoration-primary/10 underline-offset-[8px]">Every TTCian</span>
            </h2>
          </motion.div>

          {/* Emotional Narrative Stack */}
          <div className="grid grid-cols-1 gap-12 sm:gap-16">
            {[
              {
                id: "student",
                title: "Student",
                hook: "You felt lost on your first day. Now you don't have to.",
                benefit: "Access notes, subject groups, and senior stories from all 14 campuses. Find your direct path to success, together.",
                symbol: School, // Symbolic of the start/campus
                color: "text-primary dark:text-indigo-400",
                rotate: "rotate-1"
              },
              {
                id: "teacher",
                title: "Teacher",
                hook: "You've given so much — here's where your work gets remembered.",
                benefit: "Share instructions, pedagogy tips, and departmental brilliance that reach every corner of the network instantly.",
                symbol: ClipboardList, // Standard Lucide substitute for notice board
                color: "text-accent dark:text-pink-500",
                rotate: "-rotate-1"
              },
              {
                id: "alumni",
                title: "Alumni",
                hook: "You left the campus, but TTC never left you.",
                benefit: "Stay connected to your roots, mentor the next generation, and keep the batch identity alive forever.",
                symbol: Landmark, // Symbolic of the institution/gate
                color: "text-emerald-600 dark:text-emerald-400",
                rotate: "rotate-2"
              }
            ].map((persona, idx) => {
              const SymbolIcon = persona.symbol;
              return (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2, duration: 0.8 }}
                  className={`group relative max-w-4xl mx-auto w-full p-8 sm:p-12 notebook-paper rounded-3xl border border-black/5 dark:border-white/5 shadow-xl transition-all duration-500 hover:scale-[1.02] ${persona.rotate}`}
                >
                  <div className="absolute top-4 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <SymbolIcon size={120} strokeWidth={1} />
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row items-start gap-8 md:items-center">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-white dark:bg-[#1C1F25] flex items-center justify-center shadow-lg border border-black/5 dark:border-white/5 ${persona.color}`}>
                      <SymbolIcon size={28} />
                    </div>

                    <div className="flex-1">
                      <div className="mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${persona.color}`}>
                          {persona.title}
                        </span>
                      </div>

                      <h3 className="font-handwritten text-4xl sm:text-5xl lg:text-6xl text-gray-800 dark:text-white/90 leading-tight mb-6">
                        {persona.hook}
                      </h3>

                      <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl leading-relaxed">
                        {persona.benefit}
                      </p>
                    </div>
                  </div>

                  {/* Informal notation decoration */}
                  <div className="absolute bottom-4 right-8 font-handwritten text-sm text-gray-400 dark:text-gray-500 opacity-50">
                    p. {idx + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16 text-base sm:text-xl font-bold text-primary max-w-2xl mx-auto"
          >
            For the first time, being part of TTC means being part of{" "}
            <span className="text-accent">
              something bigger than your own campus.
            </span>
          </motion.p>
        </div>
      </section>

      {/* ===== THE MISSION (Living Statement Block) ===== */}
      <section className="py-24 sm:py-32 px-4 relative overflow-hidden noise-bg">
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/5 dark:bg-accent/10 rounded-full border border-accent/10">
                <Target size={14} className="text-accent" />
                <span className="text-xs font-bold text-accent tracking-widest uppercase">
                  Our Mission
                </span>
              </div>
            </motion.div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-12">
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-y-4 gap-x-6">
                <span className="text-2xl sm:text-3xl font-medium text-gray-400 dark:text-gray-500 font-hindi leading-none">To connect every</span>
                <span className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white font-sora tracking-tighter leading-none">Student,</span>
                <span className="text-3xl sm:text-4xl font-bold text-primary dark:text-indigo-400 font-sora leading-none">Teacher,</span>
                <span className="text-2xl sm:text-3xl font-medium text-gray-400 dark:text-gray-500 font-hindi leading-none">and</span>
                <span className="text-4xl sm:text-5xl font-black text-accent font-sora tracking-tight leading-none">College</span>
                <span className="text-2xl sm:text-3xl font-medium text-gray-400 dark:text-gray-500 font-hindi leading-none whitespace-nowrap">under one roof —</span>
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-[1.1] mb-8 font-english max-w-4xl mx-auto">
                so that{" "}
                <span className="animate-variable-underline text-primary dark:text-indigo-400">
                  knowledge travels freely
                </span>,{" "}
                <br className="hidden sm:block" />
                stories{" "}
                <span className="font-handwritten text-accent text-5xl sm:text-7xl lg:text-8xl inline-block -rotate-2 ml-2">
                  inspire boldly
                </span>, <br className="hidden sm:block" />
                and no TTCian ever feels like they are <span className="text-lg sm:text-2xl font-medium text-gray-400 dark:text-gray-500 italic block sm:inline mt-4 sm:mt-0">figuring it all out alone.</span>
              </motion.h2>

              <motion.div variants={itemVariants} className="pt-12">
                <div className="w-12 h-0.5 bg-gray-200 dark:bg-white/10 mx-auto mb-10" />
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 font-black tracking-[0.4em] uppercase mb-4">
                  TTC Network is not built for institutions.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <span className="text-2xl sm:text-3xl text-gray-900 dark:text-white font-light">It is built for</span>
                  <span className="text-5xl sm:text-7xl font-handwritten text-primary dark:text-indigo-300 -rotate-3 hover:rotate-0 transition-transform duration-500 cursor-default">
                    People.
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

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
