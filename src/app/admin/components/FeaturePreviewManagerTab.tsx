"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Save,
  Upload,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Type,
  Link as LinkIcon,
  ChevronDown,
  Info,
} from "lucide-react";
import Image from "next/image";
import {
  getRoadmapSettings,
  updateRoadmapSettings,
  DEFAULT_ROADMAP_SETTINGS,
  type FirestoreRoadmapSettings,
  type FirestoreRoadmapFeature,
} from "@/lib/firestore";
import { uploadToStorage } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";

const DEFAULT_IMAGES: Record<string, string> = {
  updates: "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/branding/roadmap/preview_updates_1789059553683.webp",
  stories: "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/branding/roadmap/preview_stories_1789059607972.webp",
  colleges: "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/branding/roadmap/preview_colleges_1789060649320.webp",
  learn: "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/branding/roadmap/preview_learn_1789060664688.jpeg",
};

export default function FeaturePreviewManagerTab() {
  const [settings, setSettings] = useState<FirestoreRoadmapSettings>(DEFAULT_ROADMAP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string>("updates");
  const { showToast } = useToast();

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    getRoadmapSettings()
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => {
        console.error("Error loading roadmap settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateRoadmapSettings(settings);
      showToast("✅ Feature Preview & 3D Mockup settings saved successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Failed to save: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (featureId: string, file: File) => {
    setUploadingId(featureId);
    try {
      const result = await uploadToStorage(
        file,
        "branding",
        "roadmap",
        `preview_${featureId}_${Date.now()}`
      );

      setSettings((prev) => {
        const updatedFeatures = prev.features.map((f) =>
          f.id === featureId ? { ...f, mockupImage: result.url } : f
        );
        return { ...prev, features: updatedFeatures };
      });

      showToast("✅ Screenshot uploaded! Click 'Save Changes' to apply.", "success");
    } catch (err: any) {
      console.error("Upload failed:", err);
      showToast(`❌ Upload failed: ${err?.message || "Error"}`, "error");
    } finally {
      setUploadingId(null);
    }
  };

  const handleResetImage = (featureId: string) => {
    const defaultImg = DEFAULT_IMAGES[featureId] || "";
    setSettings((prev) => {
      const updatedFeatures = prev.features.map((f) =>
        f.id === featureId ? { ...f, mockupImage: defaultImg } : f
      );
      return { ...prev, features: updatedFeatures };
    });
    showToast("Reset to default preview image.", "info");
  };

  const updateFeature = (
    featureId: string,
    field: keyof FirestoreRoadmapFeature,
    value: string
  ) => {
    setSettings((prev) => {
      const updatedFeatures = prev.features.map((f) =>
        f.id === featureId ? { ...f, [field]: value } : f
      );
      return { ...prev, features: updatedFeatures };
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 my-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 animate-pulse h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8 pb-10">
      {/* ── Section Header Divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 rounded-full">
          <Smartphone size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Feature Preview & 3D Mockups
          </span>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      </div>

      {/* ── Top Bar: Title, Visibility & Save ── */}
      <div className="bg-white dark:bg-[#16181C] rounded-[22px] p-5 sm:p-6 border border-gray-100 dark:border-white/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 font-english">
            <Sparkles size={18} className="text-blue-500" />
            3D Mobile Roadmap & Feature Mockups
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage the 4 interactive 3D phone mockups, uploaded screenshots, and feature texts displayed on the homepage.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Section Visibility Switch */}
          <button
            onClick={() => setSettings((s) => ({ ...s, isVisible: !s.isVisible }))}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
              settings.isVisible
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
            }`}
          >
            {settings.isVisible ? (
              <>
                <CheckCircle2 size={13} className="text-green-600" />
                <span>Visible on Homepage</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} className="text-gray-500" />
                <span>Hidden from Homepage</span>
              </>
            )}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* ── Section General Copy Settings ── */}
      <div className="bg-white dark:bg-[#16181C] rounded-[22px] p-5 sm:p-6 border border-gray-100 dark:border-white/5 shadow-xs">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
          <Type size={13} className="text-blue-500" /> Section Headline & Description
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Title Prefix
            </label>
            <input
              type="text"
              value={settings.titlePrefix}
              onChange={(e) => setSettings({ ...settings, titlePrefix: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="A Network to Connect "
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Title Accent (Highlighted in Blue)
            </label>
            <input
              type="text"
              value={settings.titleAccent}
              onChange={(e) => setSettings({ ...settings, titleAccent: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Every TTCian."
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
            Section Subtitle
          </label>
          <textarea
            rows={2}
            value={settings.subtitle}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            placeholder="Designed exclusively for teachers, trainees, and students..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Download Button Text
            </label>
            <input
              type="text"
              value={settings.downloadButtonText}
              onChange={(e) => setSettings({ ...settings, downloadButtonText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Download Web App"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Download Subtext
            </label>
            <input
              type="text"
              value={settings.downloadSubtext}
              onChange={(e) => setSettings({ ...settings, downloadSubtext: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Join 14 campuses. Be part of something bigger."
            />
          </div>
        </div>
      </div>

      {/* ── Information Callout ── */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-3">
        <Info size={18} className="text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-english">
          <span className="font-bold text-blue-700 dark:text-sky-300">How 3D Mobile Mockups work: </span>
          The phone body, Dynamic Island notch, titanium frame, and 3D tilts are generated completely in code.
          You can simply take a normal mobile screenshot of any section (News Feed, Stories, Colleges, Study) and upload it here.
          It will instantly fit into the 3D phone chassis with perspective and glass reflection!
        </div>
      </div>

      {/* ── 4 Feature Cards (Interactive Mockup Customizer) ── */}
      <div className="space-y-4">
        {settings.features.map((feat, idx) => {
          const isExpanded = expandedFeature === feat.id;
          const isUploading = uploadingId === feat.id;

          return (
            <div
              key={feat.id}
              className="bg-white dark:bg-[#16181C] rounded-[22px] border border-gray-100 dark:border-white/5 shadow-xs overflow-hidden transition-all"
            >
              {/* Card Accordion Trigger */}
              <button
                onClick={() => setExpandedFeature(isExpanded ? "" : feat.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {feat.number}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{feat.title}</span>
                      <span className="text-xs font-normal text-gray-400">({feat.subtitle})</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[280px] sm:max-w-md">
                      {feat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Tiny thumbnail preview */}
                  <div className="w-7 h-12 rounded-md bg-slate-900 overflow-hidden border border-slate-700 relative shadow-xs hidden sm:block">
                    <Image
                      src={feat.mockupImage || DEFAULT_IMAGES[feat.id] || ""}
                      alt={feat.title}
                      fill
                      sizes="28px"
                      className="object-cover object-top"
                    />
                  </div>

                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/40 dark:bg-white/[0.01]">
                      {/* Left: Phone Mockup Preview & Upload Box (4 cols) */}
                      <div className="md:col-span-5 flex flex-col items-center">
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Mockup Screenshot Preview
                        </div>

                        {/* Mini Phone Frame Display */}
                        <div className="relative w-[180px] aspect-[9/19.5] p-2 bg-gradient-to-b from-slate-700 via-slate-900 to-black rounded-[28px] border border-slate-600/60 shadow-xl my-2">
                          <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-slate-950">
                            {/* Dynamic Island Notch */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[42px] h-[10px] bg-black rounded-full z-20 border border-white/5 flex items-center justify-between px-1 pointer-events-none">
                              <div className="w-[2px] h-[2px] rounded-full bg-[#0d0d0d]" />
                              <div className="w-[5px] h-[5px] rounded-full bg-[#060913] border border-[#1b253b] flex items-center justify-center">
                                <div className="w-[2px] h-[2px] rounded-full bg-blue-500/70" />
                              </div>
                            </div>

                            <Image
                              src={feat.mockupImage || DEFAULT_IMAGES[feat.id] || ""}
                              alt={feat.title}
                              fill
                              sizes="180px"
                              className="object-cover object-top"
                            />

                            {/* Glass reflection */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-10" />
                          </div>
                        </div>

                        {/* Upload & Reset Buttons */}
                        <div className="flex flex-col gap-2 w-full max-w-[200px] mt-3">
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              fileInputRefs.current[feat.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(feat.id, file);
                            }}
                          />

                          <button
                            onClick={() => fileInputRefs.current[feat.id]?.click()}
                            disabled={isUploading}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Upload size={13} />
                            )}
                            <span>{isUploading ? "Uploading..." : "Upload Screenshot"}</span>
                          </button>

                          <button
                            onClick={() => handleResetImage(feat.id)}
                            className="w-full py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <RotateCcw size={12} />
                            <span>Reset to Default</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Feature Content Inputs (7 cols) */}
                      <div className="md:col-span-7 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                              Feature Title
                            </label>
                            <input
                              type="text"
                              value={feat.title}
                              onChange={(e) => updateFeature(feat.id, "title", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                              Subtitle / Badge Text
                            </label>
                            <input
                              type="text"
                              value={feat.subtitle}
                              onChange={(e) => updateFeature(feat.id, "subtitle", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={feat.description}
                            onChange={(e) => updateFeature(feat.id, "description", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                              Action Button Text
                            </label>
                            <input
                              type="text"
                              value={feat.linkText}
                              onChange={(e) => updateFeature(feat.id, "linkText", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                              Target Route / Link URL
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={feat.link}
                                onChange={(e) => updateFeature(feat.id, "link", e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                              />
                              <LinkIcon
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                            Direct Image URL (Optional fallback)
                          </label>
                          <input
                            type="text"
                            value={feat.mockupImage}
                            onChange={(e) => updateFeature(feat.id, "mockupImage", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                            placeholder="https://... or /showcase/..."
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Save Action ── */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isSaving ? "Saving All Changes..." : "Save All Changes"}</span>
        </button>
      </div>
    </div>
  );
}
