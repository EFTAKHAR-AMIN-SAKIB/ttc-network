/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Hash, GraduationCap, School, Users, User } from "lucide-react";

interface StoryFilterProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showCollegeFilter: boolean;
  showMyStories?: boolean;
}

const filters = [
  { id: "all", label: "All Stories", icon: <Hash className="w-4 h-4" /> },
  { id: "student", label: "Current Students", icon: <GraduationCap className="w-4 h-4" /> },
  { id: "teacher", label: "Teachers", icon: <School className="w-4 h-4" /> },
  { id: "graduate", label: "Alumni", icon: <Users className="w-4 h-4" /> },
];

export default function StoryFilter({ activeTab, onTabChange, showCollegeFilter, showMyStories }: StoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - 200 : scrollLeft + 200;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const allFilters = [...filters];
  if (showCollegeFilter) {
    allFilters.push({ id: "my-college", label: "My College", icon: <School className="w-4 h-4 text-red-500" /> });
  }
  if (showMyStories) {
    allFilters.push({ id: "my-stories", label: "My Stories", icon: <User className="w-4 h-4 text-amber-500" /> });
  }

  return (
    <div className="relative flex items-center group max-w-4xl mx-auto px-1 sm:px-0">
      <button 
        onClick={() => scroll("left")}
        className="hidden sm:flex absolute -left-4 sm:-left-12 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      <div 
        ref={scrollRef}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 sm:py-2.5 w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => onTabChange(f.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all border-2 active:scale-95 shrink-0 cursor-pointer
              ${activeTab === f.id 
                ? "bg-slate-900 text-white border-slate-900 dark:bg-red-600 dark:border-red-600 shadow-md scale-[1.02] sm:scale-105" 
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              }
            `}
          >
            {f.icon}
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <button 
        onClick={() => scroll("right")}
        className="hidden sm:flex absolute -right-4 sm:-right-12 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
}

