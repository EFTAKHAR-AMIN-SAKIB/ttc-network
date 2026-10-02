/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, MessageCircle, Clock, User, Sparkles, Footprints, BookOpen, Pencil, Trash2, School, Globe, Bookmark, Share2, Lock, LogIn, Hash, ChevronDown, Check, Maximize2, X } from "lucide-react";
import { type FirestoreStory, reactToStory, updateStoryVisibility } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { TimeAgo } from "@/components/Social/SocialUtils";
import { isContentRestrictedForUser } from "@/lib/permissions";

import { ReactionBtn, ReactionSummary } from "@/components/Social/ReactionSystem";
import { CommentDrawer } from "@/components/Social/CommentSystem";

/** Build the clean URL for a story: /story/01 if storyNumber exists, else /story/{id} */
function getStoryUrl(story: FirestoreStory & { id: string }): string {
  if (story.storyNumber) {
    return `/story/${story.storyNumber.toString().padStart(2, '0')}`;
  }
  return `/story/${story.id}`;
}

interface StoryCardProps {
  story: FirestoreStory & { id: string };
  priority?: boolean;
  onEdit?: (story: any) => void;
  onDelete?: (id: string) => void;
  isSaved?: boolean;
  onSave?: (id: string) => void;
  onShare?: (story: any) => void;
}

export default function StoryCard({ story, priority, onEdit, onDelete, isSaved, onSave, onShare }: StoryCardProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState<"public" | "campus" | "college_only" | "private">(story.visibility || "public");
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setCurrentVisibility(story.visibility || "public");
  }, [story.visibility]);
  const permissions = React.useMemo(() => {
    const isAuthor = user?.uid === story.authorId;
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";
    const isManagerSameCollege = profile?.role === "manager" && profile?.collegeId === story.collegeId;
    return {
       canEdit: isAuthor,
       canDelete: isAuthor || isAdmin || isManagerSameCollege
    };
  }, [user, profile, story]);

  // Unified Role colors for Story Cards
  const roleColors: Record<string, string> = {
    student: "border-amber-500/30 dark:border-amber-500/20",
    teacher: "border-blue-500/30 dark:border-blue-500/20",
    graduate: "border-emerald-500/30 dark:border-emerald-500/20"
  };

  const handleVisibilityChange = async (newVis: "public" | "campus" | "private") => {
    setShowAudienceMenu(false);
    if (newVis === currentVisibility) return;
    try {
      await updateStoryVisibility(story.id, newVis);
      setCurrentVisibility(newVis);
      showToast(
        newVis === "private" 
          ? "Story set to Private (Only Me)" 
          : newVis === "campus" 
          ? "Story set to Campus Only" 
          : "Story set to Global", 
        "success"
      );
    } catch (e: any) {
      showToast("Failed to update story privacy: " + (e?.message || ""), "error");
    }
  };

  const accentColor = roleColors[story.authorRole || 'student'] || "border-gray-100 dark:border-gray-800";
  
  // Format role for sentence case header
  const role = story.authorRole || 'student';
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
  const collegeShort = story.college.split(',')[0].trim();

  const isRestricted = isContentRestrictedForUser({ ...story, visibility: currentVisibility }, profile, user?.uid);
  const storyUrl = getStoryUrl(story);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-3xl overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 flex flex-col h-full w-full justify-between ${accentColor}`}
    >
      {/* Role Indicator Border (Left) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 z-20 ${
        story.authorRole === 'student' ? 'bg-amber-500' : 
        story.authorRole === 'teacher' ? 'bg-blue-500' : 
        'bg-emerald-500'
      }`} />

      {/* Subtle editorial watermark for text-only stories */}
      {!story.thumbnailUrl && (
        <div className="absolute right-3.5 top-2.5 text-gray-100 dark:text-gray-800/30 select-none pointer-events-none font-serif text-4xl leading-none font-black z-0">
          “
        </div>
      )}

      {/* ═══ COVER IMAGE (ADJUSTABLE BANNER) ═══ */}
      {story.thumbnailUrl && (
        <div className="relative overflow-hidden shrink-0 w-full h-36 sm:h-40 md:h-44 max-h-[180px] bg-slate-950 group/img">
          {/* Ambient blurred backdrop for letterboxed areas */}
          <div 
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${story.thumbnailUrl})` }}
          />
          
          {/* Main Image with Interactive Lightbox Trigger */}
          <Link href={storyUrl} className="relative z-10 w-full h-full flex items-center justify-center">
            <img 
              src={story.thumbnailUrl} 
              alt={story.title || "Story Cover"} 
              className={`w-full h-full transition-all duration-300 ${
                imageFit === "contain" ? "object-contain" : "object-cover object-top"
              } group-hover/img:scale-[1.02]`}
              loading="lazy"
            />
          </Link>

          {/* Story Number Badge (Top Left) */}
          {story.storyNumber && (
            <div className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black rounded-md border border-white/15 flex items-center gap-1 shadow-lg">
              <Hash size={9} className="text-amber-400" />
              {story.storyNumber.toString().padStart(2, '0')}
            </div>
          )}

          {/* Adjustable View Controls (Top Right) */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <button
              type="button"
              onClick={() => setImageFit(prev => prev === "contain" ? "cover" : "contain")}
              className="px-1.5 py-0.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[9px] font-black rounded-md border border-white/15 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
              title={imageFit === "contain" ? "Zoom to fill card" : "Fit whole image"}
            >
              {imageFit === "contain" ? "Fit" : "Fill"}
            </button>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="p-1 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-md border border-white/15 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="View full poster in modal"
            >
              <Maximize2 size={11} />
            </button>
          </div>
        </div>
      )}

      <div className="p-3.5 sm:p-4 flex flex-col flex-1 min-h-0">
        {/* Top: Author & Actions Bar */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Link 
              href={story.authorId ? `/profile/${story.authorId}` : "#"} 
              className="relative shrink-0 block"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl border border-white dark:border-gray-800 shadow-sm flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 transition-transform group-hover:scale-105">
                {story.authorPhoto ? (
                  <img src={story.authorPhoto} alt={story.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs sm:text-sm font-black text-gray-400">{story.name?.[0]}</span>
                )}
              </div>
            </Link>
            <div className="min-w-0">
              <Link 
                href={story.authorId ? `/profile/${story.authorId}` : "#"} 
                className="text-xs sm:text-[13px] font-black dark:text-gray-100 hover:text-primary transition-colors truncate tracking-tight block"
                onClick={(e) => e.stopPropagation()}
              >
                {story.name}
              </Link>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                <span className="text-navy-600 dark:text-navy-400">{formattedRole}</span>
                <span>•</span>
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{collegeShort}</span>
                {story.timestamp && (
                  <>
                    <span>•</span>
                    <TimeAgo ts={story.timestamp} />
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Edit / Delete Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && permissions.canEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(story);
                }}
                className="p-1.5 bg-gray-50 hover:bg-primary/10 dark:bg-gray-800 text-gray-400 hover:text-primary rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Edit Story"
              >
                <Pencil size={11} />
              </button>
            )}
            {onDelete && permissions.canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(story.id);
                }}
                className="p-1.5 bg-gray-50 hover:bg-rose-50 dark:bg-gray-800 text-gray-400 hover:text-rose-500 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Delete Story"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Badges Row (Reading time, Story # for text stories & Audience privacy) */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {story.storyNumber && !story.thumbnailUrl && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-0.5 rounded-full border border-gray-200/60 dark:border-gray-700/60">
              <Hash className="w-3 h-3 text-primary" />
              Story {story.storyNumber.toString().padStart(2, '0')}
            </div>
          )}

          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100/70 dark:bg-gray-800/50 px-2 py-0.5 rounded-full border border-gray-200/50 dark:border-gray-700/50">
            <Clock className="w-3 h-3 text-primary" />
            {story.readingTimeMinutes} MIN
          </div>

          {/* Audience Badge with Author Quick Switch */}
          <div className="relative">
            {permissions.canEdit ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAudienceMenu(!showAudienceMenu);
                  }}
                  className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    currentVisibility === "private"
                      ? "text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                      : currentVisibility === "campus" || currentVisibility === "college_only"
                      ? "text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                      : "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                  }`}
                  title="Change audience / privacy"
                >
                  {currentVisibility === "private" ? (
                    <Lock className="w-3 h-3" />
                  ) : currentVisibility === "campus" || currentVisibility === "college_only" ? (
                    <School className="w-3 h-3" />
                  ) : (
                    <Globe className="w-3 h-3" />
                  )}
                  <span>
                    {currentVisibility === "private" ? "Private" : currentVisibility === "campus" || currentVisibility === "college_only" ? "Campus" : "Global"}
                  </span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${showAudienceMenu ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showAudienceMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-[60]" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAudienceMenu(false);
                        }} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="absolute left-0 top-full mt-1.5 w-48 p-1.5 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-[70] space-y-1"
                      >
                        <div className="px-2.5 py-1 border-b border-gray-100 dark:border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Audience Privacy</p>
                        </div>
                        {[
                          { id: "public" as const, label: "Global", icon: Globe, color: "text-blue-500" },
                          { id: "campus" as const, label: "Campus Only", icon: School, color: "text-amber-500" },
                          { id: "private" as const, label: "Private (Only Me)", icon: Lock, color: "text-rose-500" },
                        ].map((opt) => {
                          const OptIcon = opt.icon;
                          const isSelected = currentVisibility === opt.id || (opt.id === "campus" && currentVisibility === "college_only");
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVisibilityChange(opt.id);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected 
                                  ? "bg-gray-100 dark:bg-white/10 font-bold" 
                                  : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <OptIcon size={14} className={opt.color} />
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && <Check size={12} className="text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                {(currentVisibility === "campus" || currentVisibility === "college_only") && (
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-500/20">
                    <School className="w-3 h-3" />
                    Campus
                  </div>
                )}
                {currentVisibility === "private" && (
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-500/20">
                    <Lock className="w-3 h-3" />
                    Private
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Story Content Area (Clickable Link to /story/id) */}
        <Link href={storyUrl} className="flex-1 flex flex-col group/content min-h-0">
          <h3 className={`font-black mb-1.5 leading-snug dark:text-gray-100 group-hover/content:text-primary transition-colors tracking-tight ${
            story.thumbnailUrl ? "text-sm sm:text-[15px] line-clamp-1 sm:line-clamp-2" : "text-[15px] sm:text-base line-clamp-2"
          }`}>
            {story.title}
          </h3>
          
          {isRestricted ? (
            <div className="my-1.5 p-3 rounded-xl bg-slate-900/90 text-white border border-white/10 shadow-lg text-center flex flex-col items-center justify-center gap-1 flex-1">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Lock size={12} />
              </div>
              <p className="text-[11px] font-bold text-gray-200">
                {currentVisibility === "private" 
                  ? "This story is marked as private by the creator." 
                  : `Campus Only Story — Only visible to verified members of ${story.college || "this college"}.`}
              </p>
              {!user?.uid && currentVisibility !== "private" && (
                <span className="mt-0.5 px-2.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                  <LogIn size={10} /> Log In to Read
                </span>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className={`text-gray-600 dark:text-gray-300 leading-relaxed font-bengali ${
                  story.thumbnailUrl 
                    ? "text-xs sm:text-[13px] line-clamp-2 sm:line-clamp-3 mb-1.5" 
                    : "text-xs sm:text-sm line-clamp-5 sm:line-clamp-6 mb-2"
                }`}>
                  {(!story.thumbnailUrl && story.fullStory) ? story.fullStory : story.preview}
                </p>

                {/* Author's Advice Callout (For text stories if advice exists) */}
                {!story.thumbnailUrl && story.oneAdvice && (
                  <div className="mb-2 p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 text-[11px] font-bengali text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                    <Sparkles size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">Author&apos;s Advice</span>
                      <p className="italic font-medium line-clamp-2 leading-relaxed">“{story.oneAdvice}”</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Text-story read invitation so card space feels purposeful and interactive */}
              {!story.thumbnailUrl && (
                <div className="pt-1 flex items-center justify-between text-[11px] text-primary font-bold group-hover/content:text-primary-dark transition-colors">
                  <span className="inline-flex items-center gap-1 group-hover/content:translate-x-1 transition-transform">
                    সম্পূর্ণ গল্প পড়ুন &rarr;
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                    Read story
                  </span>
                </div>
              )}
            </div>
          )}
        </Link>

        {/* ═══ INTERACTIONS BAR (Docked at Bottom) ═══ */}
        {!isRestricted && (
          <div className="mt-auto pt-1.5 border-t border-gray-100 dark:border-gray-800/80">
            {/* 1. Engagement Summary Row (Only when reactions or comments exist) */}
            <ReactionSummary 
              reactions={story.reactions}
              reactedBy={story.reactedBy}
              commentsCount={story.commentsCount || 0}
              onOpenComments={() => setShowComments(!showComments)}
            />

            {/* 2. Action Buttons Row */}
            <div className="flex items-center justify-between gap-0.5 pt-0.5">
              {/* React */}
              <div className="flex-1 flex items-center justify-center min-w-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <ReactionBtn 
                  contentId={story.id} 
                  contentType="story" 
                  reactions={story.reactions} 
                  reactedBy={story.reactedBy} 
                  currentUserId={user?.uid}
                  showSummary={false}
                  variant="facebook"
                  compact={true}
                />
              </div>

              {/* Comment */}
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowComments(!showComments);
                }}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1 rounded-lg transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                  showComments 
                    ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                }`}
                title="Comment on story"
              >
                <MessageCircle size={14} className={`shrink-0 transition-transform hover:scale-110 ${showComments ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">Comment</span>
              </button>

              {/* Share */}
              {onShare && currentVisibility !== "private" && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShare(story);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0"
                  title="Share Story"
                >
                  <Share2 size={14} className="shrink-0 transition-transform hover:scale-110" />
                  <span className="text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">Share</span>
                </button>
              )}

              {/* Save / Bookmark */}
              {onSave && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSave(story.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1 rounded-lg transition-all duration-150 active:scale-95 select-none cursor-pointer min-w-0 ${
                    isSaved 
                      ? "text-primary font-bold bg-primary/5 dark:bg-primary/10" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 font-semibold"
                  }`}
                  title={isSaved ? "Remove Bookmark" : "Save Story"}
                >
                  <Bookmark size={15} className={`shrink-0 transition-transform hover:scale-110 ${isSaved ? "fill-primary" : ""}`} />
                  <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{isSaved ? "Saved" : "Save"}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Comment Drawer Overlay */}
        <AnimatePresence>
          {showComments && (
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <CommentDrawer 
                isOpen={showComments} 
                onClose={() => setShowComments(false)}
                contentId={story.id}
                contentType="story"
              />
            </div>
          )}
        </AnimatePresence>

        {/* ═══ LIGHTBOX MODAL (VIEW FULL POSTER IN HIGH RESOLUTION) ═══ */}
        <AnimatePresence>
          {lightboxOpen && story.thumbnailUrl && (
            <div 
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxOpen(false); }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={20} />
                </button>
                <img 
                  src={story.thumbnailUrl} 
                  alt={story.title} 
                  className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/15"
                />
                <p className="mt-3 text-white/90 font-bold text-xs sm:text-sm text-center">
                  {story.title} • {story.name}
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Export the URL helper for use in other components
export { getStoryUrl };
