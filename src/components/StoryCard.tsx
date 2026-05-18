/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MessageSquare, Clock, User, Sparkles, Footprints, BookOpen, Pencil, Trash2, School, Globe } from "lucide-react";
import { type FirestoreStory, reactToStory } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import { ReactionBtn } from "@/components/Social/ReactionSystem";

interface StoryCardProps {
  story: FirestoreStory & { id: string };
  priority?: boolean;
  onEdit?: (story: any) => void;
  onDelete?: (id: string) => void;
}

export default function StoryCard({ story, priority, onEdit, onDelete }: StoryCardProps) {
  const { user, profile } = useAuth();
  const permissions = React.useMemo(() => {
    // We need canEditStory from permissions.ts, but let's just use the logic inlined if we don't want to import it everywhere,
    // or better, import it. 
    // Actually, canEditStory is imported in story/page.tsx. 
    // For consistency with PostCard, let's just do the check here.
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

  const accentColor = roleColors[story.authorRole || 'student'] || "border-gray-100 dark:border-gray-800";
  
  // Format role for sentence case header
  const role = story.authorRole || 'student';
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
  const collegeShort = story.college.split(',')[0].trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative bg-white dark:bg-[#1a1b23] rounded-[2rem] overflow-hidden border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-primary/20 ${accentColor}`}
    >
      {/* Role Indicator Border (Left) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        story.authorRole === 'student' ? 'bg-amber-500' : 
        story.authorRole === 'teacher' ? 'bg-blue-500' : 
        'bg-emerald-500'
      }`} />

      <Link href={`/story/${story.id}`} className="block p-6 sm:p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="w-12 h-12 rounded-2xl border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 transition-transform group-hover:scale-105 group-hover:rotate-2">
                  {story.authorPhoto ? (
                    <img src={story.authorPhoto} alt={story.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-gray-400">{story.name?.[0]}</span>
                  )}
                </div>
                {story.coverMood && (
                   <span className="absolute -bottom-1 -right-1 text-base filter drop-shadow-sm">{story.coverMood.split(" ").pop()}</span>
                )}
             </div>
             <div className="min-w-0">
                <h4 className="text-base font-black dark:text-gray-100 truncate tracking-tight">{story.name}</h4>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <span className="text-navy-600 dark:text-navy-400">{formattedRole}</span> • {collegeShort}
                </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700">
              <Clock className="w-3 h-3 text-primary" />
              {story.readingTimeMinutes} MIN
            </div>
            {(story.visibility === "campus" || story.visibility === "college_only") && (
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-full border border-amber-200/50 dark:border-amber-500/20">
                <School className="w-3 h-3" />
                Campus
              </div>
            )}

            {onEdit && permissions.canEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(story);
                }}
                className="p-1.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-primary rounded-full border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:scale-110 active:scale-95 z-40"
                title="Edit Story"
              >
                <Pencil size={12} />
              </button>
            )}

            {onDelete && permissions.canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(story.id);
                }}
                className="p-1.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:scale-110 active:scale-95 z-40"
                title="Delete Story"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-xl font-black mb-3 line-clamp-2 leading-tight dark:text-gray-100 group-hover:text-primary transition-colors tracking-tight">
          {story.title}
        </h3>
        
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 line-clamp-3 mb-6 leading-relaxed font-bengali">
          {story.preview}
        </p>

        <div className="flex items-center justify-between pt-5 border-t border-gray-50 dark:border-gray-800">
          <div onClick={(e) => e.preventDefault()}>
            <ReactionBtn 
              contentId={story.id} 
              contentType="story" 
              reactions={story.reactions} 
              reactedBy={story.reactedBy} 
              currentUserId={user?.uid}
            />
          </div>
          
          <div className="flex items-center gap-2 group/btn">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover/btn:text-primary transition-colors">Open</span>
            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover/btn:bg-primary group-hover/btn:text-white group-hover/btn:rotate-12 transition-all duration-300 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

