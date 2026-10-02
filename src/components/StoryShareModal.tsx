/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Shield, Globe, CheckCircle2, AlertTriangle, School, ImagePlus, Trash2, Upload, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createStory, updateStory } from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useMentionAutosuggest, MentionDropdown } from "@/components/Social/MentionDropdown";

interface StoryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  editStory?: any | null;
}



export default function StoryShareModal({ isOpen, onClose, editStory }: StoryShareModalProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { requireVerification } = useVerifiedAccess();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const verified = requireVerification("share stories");
      if (!verified) {
        onClose();
      }
    }
  }, [isOpen]);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [oneAdvice, setOneAdvice] = useState("");
  const [visibility, setVisibility] = useState<"public" | "campus" | "private">("public");

  // Mention Autosuggest Hooks
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const titleMention = useMentionAutosuggest({
    value: title,
    setValue: setTitle,
    inputRef: titleInputRef,
  });

  const storyMention = useMentionAutosuggest({
    value: content,
    setValue: setContent,
    inputRef: contentInputRef,
  });

  // Cover Image State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editStory) {
      setTitle(editStory.title || "");
      setContent(editStory.fullStory || "");
      setOneAdvice(editStory.oneAdvice || "");
      setVisibility(editStory.visibility || "public");
      setCoverPreview(editStory.thumbnailUrl || "");
      setCoverFile(null);
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
    const draft = { title, content, oneAdvice, visibility, coverPreview: coverPreview && !coverFile ? coverPreview : "" };
    localStorage.setItem("ttc_story_draft", JSON.stringify(draft));
  };

  const restoreDraft = () => {
    const draft = JSON.parse(localStorage.getItem("ttc_story_draft") || "{}");
    setTitle(draft.title || "");
    setContent(draft.content || "");
    setOneAdvice(draft.oneAdvice || "");
    // Map values to privacy model
    const restoredVis = draft.visibility || "public";
    setVisibility(restoredVis === "private" ? "private" : restoredVis === "campus" || restoredVis === "college_only" ? "campus" : "public");
    if (draft.coverPreview) setCoverPreview(draft.coverPreview);
    setShowRestore(false);
    showToast("Draft restored!", "info");
  };

  const discardDraft = () => {
    localStorage.removeItem("ttc_story_draft");
    setShowRestore(false);
  };

  useEffect(() => {
    if (title || content) saveDraft();
  }, [title, content, oneAdvice, visibility]);

  // ── Cover Image Handlers ───────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (JPEG, PNG, WebP, GIF)", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be under 10MB", "error");
      return;
    }
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  }, [showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeCover = useCallback(() => {
    if (coverPreview && coverFile) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [coverPreview, coverFile]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (coverPreview && coverFile) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!title || !content) {
      showToast("Please fill in the required fields", "error");
      return;
    }

    setLoading(true);
    try {
      let thumbnailUrl = editStory?.thumbnailUrl || "";

      // Upload cover image if a new file was selected
      if (coverFile) {
        setUploadProgress("Uploading cover image...");
        thumbnailUrl = await uploadFile("stories", coverFile);
      } else if (!coverPreview && editStory?.thumbnailUrl) {
        // User removed the cover image during edit
        thumbnailUrl = "";
      }

      setUploadProgress("Saving story...");

      const storyData: any = {
        title,
        fullStory: content,
        preview: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
        oneAdvice,
        visibility,
        thumbnailUrl,
      };

      if (editStory) {
        await updateStory(editStory.id, storyData);
        showToast(visibility === "private" ? "Private story updated successfully!" : "Story updated successfully!", "success");
      } else {
        await createStory(storyData);
        showToast(visibility === "private" ? "Private story saved! Only you can view it." : "Story shared! Pending approval.", "success");
        discardDraft();
      }
      
      setUploadProgress("");
      onClose();
    } catch (err: any) {
      console.error("[StoryShareModal] Submit error:", err?.message || err, err);
      showToast(editStory ? "Update failed" : `Submission failed: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
      setUploadProgress("");
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
              {step === 2 && (editStory ? "Preview & Publish 👀" : "Preview & Publish 👀")}
            </h2>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Step {step} of 2</p>
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
                  <div className="relative z-20">
                    <MentionDropdown
                      isOpen={titleMention.isOpen}
                      query={titleMention.query}
                      suggestions={titleMention.suggestions}
                      selectedIndex={titleMention.selectedIndex}
                      setSelectedIndex={titleMention.setSelectedIndex}
                      onSelect={titleMention.insertMention}
                      onClose={() => titleMention.setIsOpen(false)}
                      position="bottom"
                    />
                    <input 
                      ref={titleInputRef}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        titleMention.checkMention();
                      }}
                      onKeyUp={(e) => {
                        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Tab') {
                          titleMention.checkMention();
                        }
                      }}
                      onClick={() => titleMention.checkMention()}
                      onFocus={() => titleMention.checkMention()}
                      onBlur={() => {
                        setTimeout(() => titleMention.setIsOpen(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (titleMention.isOpen && titleMention.handleKeyDown(e)) {
                          return;
                        }
                      }}
                      placeholder="Give your journey a name..."
                      className="w-full text-3xl font-black border-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-600 bg-transparent"
                    />
                  </div>
                  <div className="h-1 bg-red-100 dark:bg-red-900/30 rounded-full w-24" />
                </div>

                {/* ═══ COVER IMAGE UPLOAD ═══ */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-primary" />
                    Cover Image (Optional)
                  </label>
                  
                  {coverPreview ? (
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-800 shadow-sm">
                      <img 
                        src={coverPreview} 
                        alt="Cover preview" 
                        className="w-full h-48 sm:h-56 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-white/90 text-gray-700 rounded-2xl shadow-lg hover:bg-white transition-all hover:scale-105 active:scale-95"
                            title="Change image"
                          >
                            <Upload size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={removeCover}
                            className="p-3 bg-red-500/90 text-white rounded-2xl shadow-lg hover:bg-red-500 transition-all hover:scale-105 active:scale-95"
                            title="Remove image"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                      {coverFile && (
                        <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 text-white text-[10px] font-bold rounded-lg backdrop-blur-sm">
                          {(coverFile.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-10 flex flex-col items-center justify-center gap-3 text-center ${
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        isDragging ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}>
                        <ImagePlus className="w-7 h-7" />
                      </div>
                      <div>
                        <p className={`text-sm font-black transition-colors ${isDragging ? "text-primary" : "text-gray-500"}`}>
                          {isDragging ? "Drop your image here" : "Drag & drop or click to upload"}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                          JPEG, PNG, WebP, GIF • Max 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>

                {/* Audience / Visibility */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Share With
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "public" as const, icon: <Globe size={18} />, label: "Global", desc: "All campuses", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-500" },
                      { id: "campus" as const, icon: <School size={18} />, label: "Campus", desc: "Your college", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-500" },
                      { id: "private" as const, icon: <Lock size={18} />, label: "Private", desc: "Only visible to you", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-500" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVisibility(opt.id)}
                        className={`relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 group text-left
                          ${visibility === opt.id
                            ? `${opt.bg} ${opt.border} shadow-sm`
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                      >
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          visibility === opt.id ? `${opt.bg} ${opt.color}` : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                        }`}>
                          {opt.icon}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className={`text-xs font-black uppercase tracking-widest ${visibility === opt.id ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>{opt.label}</div>
                          <div className={`text-[10px] font-bold truncate ${visibility === opt.id ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>{opt.desc}</div>
                        </div>
                        {visibility === opt.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-black text-gray-500 uppercase tracking-widest">The Narrative *</label>
                    <span className="text-[10px] font-bold text-gray-400">{(content.match(/\w+/g) || []).length} words</span>
                  </div>
                  <div className="relative z-10">
                    <MentionDropdown
                      isOpen={storyMention.isOpen}
                      query={storyMention.query}
                      suggestions={storyMention.suggestions}
                      selectedIndex={storyMention.selectedIndex}
                      setSelectedIndex={storyMention.setSelectedIndex}
                      onSelect={storyMention.insertMention}
                      onClose={() => storyMention.setIsOpen(false)}
                      position="top"
                    />
                    <textarea 
                      ref={contentInputRef}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        storyMention.checkMention();
                      }}
                      onKeyUp={(e) => {
                        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Tab') {
                          storyMention.checkMention();
                        }
                      }}
                      onClick={() => storyMention.checkMention()}
                      onFocus={() => storyMention.checkMention()}
                      onBlur={() => {
                        setTimeout(() => storyMention.setIsOpen(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (storyMention.isOpen && storyMention.handleKeyDown(e)) {
                          return;
                        }
                      }}
                      placeholder="Where did it all start? What hurdles did you jump? What victory are you celebrating today?"
                      className="w-full min-h-[250px] text-lg font-medium leading-relaxed font-bengali border-2 border-gray-100 dark:border-gray-800 focus:border-primary p-6 rounded-[2rem] transition-all bg-white dark:bg-gray-800/10 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    />
                  </div>
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
                    className="w-full min-h-[120px] text-lg font-medium font-bengali border-2 border-gray-50 dark:border-gray-800 focus:border-amber-500 p-6 rounded-[2rem] bg-amber-50/10 italic placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col lg:flex-row gap-12 items-center justify-center p-4"
              >
                <div className="w-full max-w-sm">
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Feed Preview
                   </p>
                   {/* Custom compact preview card */}
                   <div className="bg-white dark:bg-[#1a1b23] rounded-[2rem] overflow-hidden border-2 border-gray-100 dark:border-gray-800 shadow-lg">
                     {/* Cover image banner */}
                     {coverPreview && (
                       <div className="relative h-32 sm:h-36 overflow-hidden">
                         <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                       </div>
                     )}
                     <div className="p-5">
                       {/* Author row */}
                       <div className="flex items-center gap-3 mb-3">
                         <div className="w-9 h-9 rounded-xl border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0">
                           {profile?.photoURL ? (
                             <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <span className="text-sm font-black text-gray-400">{profile?.displayName?.[0] || "?"}</span>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-sm font-black truncate">{profile?.displayName || "You"}</p>
                           <p className="text-[10px] text-gray-400 font-bold truncate">
                             {(profile as any)?.college || "Your College"} • 1 MIN
                           </p>
                         </div>
                       </div>
                       {/* Title & preview */}
                       <h3 className="text-base font-black mb-1.5 line-clamp-2 leading-tight">{title || "Story Title"}</h3>
                       <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-bengali">
                         {content.slice(0, 120)}{content.length > 120 ? "..." : ""}
                       </p>
                     </div>
                   </div>
                </div>

                <div className="hidden lg:block w-px h-64 bg-gray-100 dark:bg-gray-800" />

                <div className="max-w-md space-y-6">
                   <div className={`p-6 rounded-3xl border-2 transition-all ${
                      visibility === "private"
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40"
                    }`}>
                      <div className={`flex items-center gap-3 mb-3 ${
                        visibility === "private"
                          ? "text-rose-800 dark:text-rose-400"
                          : "text-emerald-800 dark:text-emerald-400"
                      }`}>
                        {visibility === "private" ? <Lock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                        <h4 className="font-black">{visibility === "private" ? "Private Journal Entry" : "Ready to inspire?"}</h4>
                      </div>
                      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/60 dark:bg-black/20 border w-fit ${
                        visibility === "private"
                          ? "border-rose-200/50 dark:border-rose-800/30"
                          : "border-emerald-200/50 dark:border-emerald-800/30"
                      }`}>
                        {visibility === "private" ? (
                          <Lock size={14} className="text-rose-500" />
                        ) : visibility === "campus" ? (
                          <School size={14} className="text-amber-500" />
                        ) : (
                          <Globe size={14} className="text-blue-500" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                          {visibility === "private" ? "Private (Only Me)" : visibility === "campus" ? "Campus Only" : "Global"}
                        </span>
                      </div>
                      {coverPreview && (
                        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-200/50 dark:border-emerald-800/30 w-fit">
                          <ImagePlus size={14} className="text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            Cover Image Attached
                          </span>
                        </div>
                      )}
                      <p className={`text-sm font-bold leading-relaxed ${
                        visibility === "private"
                          ? "text-rose-700 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-500"
                      }`}>
                        {visibility === "private"
                          ? (editStory
                              ? "This story is private. Only you (and administrators) can view it."
                              : "Your story will be kept private. It will be immediately available to you and will not appear on public feeds.")
                          : (editStory
                              ? `Your changes will be saved to the ${visibility === "campus" ? "campus" : "global"} audience.`
                              : `Your story will be shared with the ${visibility === "campus" ? "campus" : "global"} audience. Our moderators will review it within 24 hours.`)
                        }
                      </p>
                   </div>
                   
                   <p className="text-sm text-gray-500 font-medium leading-[1.6]">
                      By clicking submit, you confirm that this is your own story and does not violate our community guidelines or privacy of others.
                   </p>

                   <button
                    disabled={loading}
                    onClick={handleSubmit}
                    className={`w-full py-5 text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 ${
                      visibility === "private"
                        ? "bg-slate-900 dark:bg-rose-700 hover:bg-slate-800 shadow-slate-900/20"
                        : "bg-primary shadow-red-500/20"
                    }`}
                   >
                     {loading ? (
                       <>
                         <Loader2 className="w-6 h-6 animate-spin" />
                         {uploadProgress || "Processing..."}
                       </>
                     ) : (
                        <>
                          {editStory 
                            ? (visibility === "private" ? "Update Private Story" : "Update Story")
                            : (visibility === "private" ? "Save Private Story" : "Share Everywhere")}
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
              {[1,2].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${step === i ? "w-8 bg-primary" : "w-1.5 bg-gray-200"}`} />
              ))}
           </div>

           {step < 2 ? (
              <button 
                onClick={() => {
                  if (!title.trim() || !content.trim()) {
                    showToast("Please fill in the required fields", "error");
                    return;
                  }
                  setStep(step + 1);
                }}
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
