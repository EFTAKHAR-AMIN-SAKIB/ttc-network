"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  Download,
  Sparkles,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Bell,
  Share,
  AlertCircle,
} from "lucide-react";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt?: any;
  isAppInstalled?: boolean;
  setIsAppInstalled?: (v: boolean) => void;
  isIos?: boolean;
}

export default function AppDownloadModal({
  isOpen,
  onClose,
  installPrompt,
  isAppInstalled = false,
  setIsAppInstalled,
  isIos = false,
}: AppDownloadModalProps) {
  const { logoUrl } = useSiteSettings();
  const [showGuide, setShowGuide] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pwaInstalling, setPwaInstalling] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle direct APK download click via Cloudflare R2 (Unlimited egress bandwidth)
  const handleApkDownload = () => {
    setDownloading(true);
    setShowGuide(true);

    const link = document.createElement("a");
    link.href = "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/app/TTC-Network.apk";
    link.download = "TTC-Network.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 3500);
  };

  // Handle PWA installation
  const handlePwaInstall = async () => {
    if (isAppInstalled) {
      window.location.href = "/news-feed";
      return;
    }

    if (installPrompt) {
      try {
        setPwaInstalling(true);
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setIsAppInstalled?.(true);
          if (typeof window !== "undefined") {
            window.__ttcAppInstalled = true;
            window.__ttcInstallPrompt = null;
          }
          onClose();
        }
      } catch (err) {
        console.warn("[PWA] Install prompt error:", err);
      } finally {
        setPwaInstalling(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        {/* Minimalist Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container: Minimalist, sleek, matches website card vibe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white dark:bg-[#111318] border border-neutral-200/90 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col z-10 font-sora"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              {/* TTC NETWORK App Logo */}
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0">
                <Image
                  src={logoUrl || "/logos/ttc network.png"}
                  alt="TTC NETWORK"
                  width={40}
                  height={40}
                  className="object-contain w-full h-full p-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-950 dark:text-white tracking-tight">
                  TTC NETWORK
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                  Beta v1.0
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-left">
            {/* ══ 1. Play Store Notice (Highlighted & Eye-Catching) ══ */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-amber-500/[0.09] via-amber-500/[0.04] to-transparent dark:from-amber-400/[0.12] dark:via-amber-400/[0.04] border border-amber-500/35 dark:border-amber-400/30 shadow-xs">
              <div className="flex items-start gap-3">
                {/* Official Google Play Store Colored Icon Container */}
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1b1f28] border border-neutral-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1 9.9-9.9v-.2L3.7 1.7l-.1.1z"
                      fill="#00E676"
                    />
                    <path
                      d="M16.9 15.5l-3.3-3.3v-.2l3.3-3.3.1.1 3.9 2.2c1.1.6 1.1 1.6 0 2.2l-4 2.2z"
                      fill="#FFD600"
                    />
                    <path
                      d="M13.6 12.1L3.6 22.2c.4.4 1 .4 1.7 0l11.7-6.7-3.4-3.4z"
                      fill="#FF3D00"
                    />
                    <path
                      d="M13.6 11.9l3.4-3.4L5.3 1.8c-.7-.4-1.3-.4-1.7 0l10 10.1z"
                      fill="#00B0FF"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-extrabold text-neutral-950 dark:text-white text-xs">
                      Google Play Store
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 dark:bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      শীঘ্রই আসছে • Coming Soon
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    অ্যাপটিতে নিয়মিত নতুন আপডেট ও ফিচার যুক্ত হচ্ছে। ফাইনাল ভার্সন তৈরি হওয়া মাত্রই আনুষ্ঠানিকভাবে <strong>Google Play Store</strong>-এ রিলিজ ঘোষণা করা হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* ══ 2. Primary Option: Native Android APK (Recommended) ══ */}
            <div className="p-4 rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-extrabold text-neutral-950 dark:text-white">
                      Android APK
                    </h4>
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                      • ৬.৫ MB
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    ফুল নেটিভ এক্সপেরিয়েন্স
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  <Bell size={10} />
                  <span>ইনস্ট্যান্ট নোটিফিকেশন</span>
                </div>
              </div>

              {/* Download Button (Matches Website Style) */}
              <button
                onClick={handleApkDownload}
                className="w-full relative group inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-neutral-950 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs sm:text-sm font-extrabold shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <Download size={15} className={downloading ? "animate-bounce" : ""} />
                <span>{downloading ? "ডাউনলোড হচ্ছে..." : "APK ডাউনলোড করুন"}</span>
              </button>

              {/* Natural & Minimalist Play Protect Guide */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
                >
                  <span>ইনস্টল করার নিয়ম (ওয়ার্নিং দেখালে)</span>
                  {showGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <AnimatePresence>
                  {showGuide && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-200/80 dark:border-white/5"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-neutral-400">১.</span>
                        <span>ডাউনলোডে <em>&apos;Harmful file&apos;</em> চাইলে <strong>Download anyway</strong> চাপুন।</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-neutral-400">২.</span>
                        <span>প্লে প্রোটেক্ট বক্স আসলে <strong>More details ▾</strong> চাপুন।</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-neutral-400">৩.</span>
                        <span>এরপর <strong>Install anyway</strong> চাপলেই ইনস্টল সম্পন্ন হবে।</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 pt-1 border-t border-neutral-100 dark:border-white/5">
                        * প্লে স্টোরের বাইরে সরাসরি দেওয়ায় এই ওয়ার্নিং আসে। এটি ১০০% নিরাপদ।
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ══ 3. Web App (PWA) Option (Highlighted like APK) ══ */}
            <div className="p-4 rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-extrabold text-neutral-950 dark:text-white">
                      ওয়েব অ্যাপ (PWA)
                    </h4>
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                      • ০ MB স্টোরেজ
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    ব্রাউজার থেকে সরাসরি হোম স্ক্রিনে ইনস্টল
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[10px] font-bold">
                  <Zap size={10} />
                  <span>কোনো মেমোরি খরচ নেই</span>
                </div>
              </div>

              {/* Install / Download Button (Prominent & Styled like APK Button) */}
              {isIos ? (
                <div className="p-3 rounded-xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-white/5 text-[11px] text-neutral-600 dark:text-neutral-300 space-y-1">
                  <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Share size={12} className="text-blue-500" />
                    iPhone / iPad-এ যেভাবে যুক্ত করবেন:
                  </div>
                  <p>১. Safari ব্রাউজারের নিচে <strong>Share (শেয়ার)</strong> বাটনে চাপুন।</p>
                  <p>২. তালিকা থেকে <strong>Add to Home Screen</strong> সিলেক্ট করুন।</p>
                </div>
              ) : (
                <button
                  onClick={handlePwaInstall}
                  disabled={pwaInstalling}
                  className="w-full relative group inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-neutral-950 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 text-xs sm:text-sm font-extrabold shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <Zap size={15} className="text-sky-400 dark:text-blue-600" />
                  <span>
                    {isAppInstalled
                      ? "ওয়েব অ্যাপ ওপেন করুন"
                      : pwaInstalling
                      ? "ইনস্টল হচ্ছে..."
                      : "ওয়েব অ্যাপ ইনস্টল করুন"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Minimalist Footer */}
          <div className="px-6 py-3 bg-neutral-50/50 dark:bg-white/[0.01] border-t border-neutral-100 dark:border-white/5 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>নিরাপদ ও ভেরিফাইড</span>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
