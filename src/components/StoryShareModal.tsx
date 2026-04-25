/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Shield, Globe, CheckCircle2, AlertTriangle, School } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createStory, updateStory } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import StoryCard from "./StoryCard";

interface StoryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  editStory?: any | null;
}

const moods = [
  { emoji: "🎓", label: "Proud" },
  { emoji: "💪", label: "Struggling" },
  { emoji: "✨", label: "Inspired" },
  { emoji: "🌱", label: "Growing" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "🎯", label: "Focused" },
];

export default function StoryShareModal({ isOpen, onClose, editStory }: StoryShareModalProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("Proud 🎓");
  const [content, setContent] = useState("");
  const [futureGoals, setFutureGoals] = useState("");
  const [oneAdvice, setOneAdvice] = useState("");
  const [visibility, setVisibility] = useState<"public" | "campus">("public");

  // PERSISTENCE LOGIC
  useEffect(() => {
    if (editStory) {
      setTitle(editStory.title || "");
      setMood(editStory.coverMood || "Proud 🎓");
      setContent(editStory.fullStory || "");
      setFutureGoals(editStory.futureGoals || "");
      setOneAdvice(editStory.oneAdvice || "");
      setVisibility(editStory.visibility || "public");
      setStep(1);
    } else {
      const draft = localStorage.getItem("ttc_story_draft");
      if (draft && !title && !content) {
        setShowRestore(true);
      }
    }
  }, [editStory, isOpen]);

  const saveDraft = () => {
    if (editStory) return; // Don't save drafts when editing
    const draft = { title, mood, content, futureGoals, oneAdvice, visibility };
    localStorage.setItem("ttc_story_draft", JSON.stringify(draft));
  };

  const restoreDraft = () => {
    const draft = JSON.parse(localStorage.getItem("ttc_story_draft") || "{}");
    setTitle(draft.title || "");
    setMood(draft.mood || "Proud 🎓");
    setContent(draft.content || "");
    setFutureGoals(draft.futureGoals || "");
    setOneAdvice(draft.oneAdvice || "");
    // Map legacy values to new privacy model
    const restoredVis = draft.visibility || "public";
    setVisibility(restoredVis === "college_only" || restoredVis === "private" ? "campus" : "public");
    setShowRestore(false);
    showToast("Draft restored!", "info");
  };

  const discardDraft = () => {
    localStorage.removeItem("ttc_story_draft");
    setShowRestore(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (title || content) saveDraft();
  }, [title, mood, content, futureGoals, oneAdvice, visibility]);

  const handleSubmit = async () => {
    if (!title || !content) {
      showToast("Please fill in the required fields", "error");
      return;
    }

    setLoading(true);
    try {

      const storyData = {
        title,
        fullStory: content,
        preview: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
        coverMood: mood,
        futureGoals,
        oneAdvice,
        visibility,
      };

      if (editStory) {
        await updateStory(editStory.id, storyData);
        showToast("Story updated successfully!", "success");
      } else {
        await createStory(storyData);
        showToast("Story shared! Pending approval.", "success");
        discardDraft();
      }
      
      onClose();
    } catch (err) {
      showToast(editStory ? "Update failed" : "Submission failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/40 backdrop-blur-md p-4 overflow-y-auto pt-12 pb-12">
      <AnimatePresence>
        {showRestore && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1a1a28]/90 backdrop-blur-xl border border-amber-200/50 dark:border-amber-500/30 p-4 rounded-[2rem] flex flex-col sm:flex-row items-center gap-4 shadow-2xl z-[110] min-w-[320px]"
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                </div>
                Draft Detected
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={restoreDraft} 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
              >
                Restore
              </button>
              <button 
                onClick={discardDraft} 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-[#0c0c10] w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative overflow-hidden h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              {step === 1 && (editStory ? "Edit Your Story ✨" : "Your Story ✨")}
              {step === 2 && (editStory ? "Edit Details 🎯" : "The Details 🎯")}
              {step === 3 && (editStory ? "Preview Changes 👀" : "Final Look 👀")}
            </h2>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-grow overflow-y-auto px-8 py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest">Story Title *</label>
                    <input 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your journey a name..."
                      className="w-full text-3xl font-black border-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-600 bg-transparent"
                    />
                    <div className="h-1 bg-red-100 dark:bg-red-900/30 rounded-full w-24" />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest">Current Mood</label>
                  <div className="flex flex-wrap gap-2">
                    {moods.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => setMood(`${m.label} ${m.emoji}`)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2
                          ${mood === `${m.label} ${m.emoji}` 
                            ? "bg-red-50 border-red-500 text-red-600 scale-105" 
                            : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500"
                          }
                        `}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-black text-gray-500 uppercase tracking-widest">The Narrative *</label>
                    <span className="text-[10px] font-bold text-gray-400">{(content.match(/\w+/g) || []).length} words</span>
                  </div>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Where did it all start? What hurdles did you jump? What victory are you celebrating today?"
                    className="w-full min-h-[300px] text-lg font-medium leading-relaxed font-bengali border-2 border-gray-100 dark:border-gray-800 focus:border-primary p-6 rounded-[2rem] transition-all bg-white dark:bg-gray-800/10 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="max-w-2xl mx-auto space-y-12"
              >
                <div className="space-y-4">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Future Goals (Optional)
                  </label>
                  <textarea 
                    value={futureGoals}
                    onChange={(e) => setFutureGoals(e.target.value)}
                    placeholder="Where do you see yourself in 5 years? Which primary school or education policy do you want to touch?"
                    className="w-full min-h-[120px] text-lg font-medium font-bengali border-2 border-gray-50 dark:border-gray-800 focus:border-emerald-500 p-6 rounded-[2rem] bg-emerald-50/10"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    One Piece of Advice (Optional)
                  </label>
                  <textarea 
                    value={oneAdvice}
                    onChange={(e) => setOneAdvice(e.target.value)}
                    placeholder="If you could whisper one lesson to a freshman today, what would it be?"
                    className="w-full min-h-[120px] text-lg font-medium font-bengali border-2 border-gray-50 dark:border-gray-800 focus:border-amber-500 p-6 rounded-[2rem] bg-amber-50/10 italic"
                  />
                </div>


                {/* Privacy */}
                <div className="space-y-6 pt-8 border-t border-gray-100 dark:border-gray-800">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Who can see this?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: "public", label: "Global", icon: <Globe />, desc: "Entire community" },
                      { id: "campus", label: "Campus", icon: <School />, desc: "Only your college" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVisibility(v.id as "public" | "campus")}
                        className={`p-4 rounded-3xl text-left border-2 transition-all group
                          ${visibility === v.id 
                            ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                          }
                        `}
                      >
                        <div className={`mb-2 transition-colors ${visibility === v.id ? "opacity-100 text-white" : "opacity-60 text-gray-400 group-hover:text-primary"}`}>{v.icon}</div>
                        <div className="font-black text-sm">{v.label}</div>
                        <div className={`text-[10px] font-bold ${visibility === v.id ? "text-slate-100" : "text-gray-400"}`}>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col lg:flex-row gap-12 items-center justify-center p-4"
              >
                <div className="w-full max-w-sm">
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Feed Preview
                   </p>
                   <div className="pointer-events-none scale-90 sm:scale-100 origin-top">
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                     <StoryCard story={{
                        id: 'preview',
                        title,
                        preview: content.slice(0, 150) + "...",
                        fullStory: content,
                        name: profile?.displayName || "You",
                        authorPhoto: profile?.photoURL || "",
                        authorRole: (profile?.role as "student" | "teacher" | "graduate") || "student",
                        college: (profile as { college?: string })?.college || "Your College",
                        coverMood: mood,
                        readingTimeMinutes: Math.max(1, Math.ceil(content.length / 1500)),
                        reactions: { inspired: 0, relatable: 0, insightful: 0, respect: 0, powerful: 0 }
                     }} />
                   </div>
                </div>

                <div className="hidden lg:block w-px h-64 bg-gray-100 dark:bg-gray-800" />

                <div className="max-w-md space-y-6">
                   <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-3 mb-2 text-emerald-800 dark:text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                        <h4 className="font-black">Ready to inspire?</h4>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-500 font-bold leading-relaxed">
                        {editStory
                          ? `Your changes will be saved to the ${visibility === "campus" ? "campus" : "global"} audience.`
                          : `Your story will be shared with the ${visibility === "campus" ? "campus" : "global"} audience. Our moderators will review it within 24 hours.`
                        }
                      </p>
                   </div>
                   
                   <p className="text-sm text-gray-500 font-medium leading-[1.6]">
                      By clicking submit, you confirm that this is your own story and does not violate our community guidelines or privacy of others.
                   </p>

                   <button
                    disabled={loading}
                    onClick={handleSubmit}
                    className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-xl shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     {loading ? (editStory ? "Updating..." : "Submitting...") : (
                        <>
                          {editStory ? "Update Story" : "Share Everywhere"}
                          <ArrowRight />
                        </>
                     )}
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
           <button 
             disabled={step === 1}
             onClick={() => setStep(step - 1)}
             className={`flex items-center gap-2 font-black text-sm uppercase tracking-widest transition-opacity ${step === 1 ? "opacity-0 invisible" : "text-gray-400 hover:text-navy-900"}`}
           >
             <ArrowLeft className="w-4 h-4" />
             Back
           </button>

           <div className="flex gap-2">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${step === i ? "w-8 bg-primary" : "w-1.5 bg-gray-200"}`} />
              ))}
           </div>

           {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                className="px-8 py-3 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-red-700"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
           ) : (
             <div className="w-24 md:w-32" /> // Spacer for alignment
           )}
        </div>
      </motion.div>
    </div>
  );
}
