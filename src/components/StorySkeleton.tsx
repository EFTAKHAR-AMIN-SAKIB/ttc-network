"use client";

import React from "react";

export default function StorySkeleton() {
  return (
    <div className="bg-white dark:bg-[#16181c] rounded-2xl sm:rounded-3xl border-2 border-gray-100 dark:border-gray-800 flex flex-col h-auto md:h-full md:justify-between overflow-hidden p-3.5 sm:p-5 gap-4">
      <div className="space-y-4">
        {/* Author Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl skeleton-shimmer shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-28 h-3.5 rounded skeleton-shimmer" />
            <div className="w-40 h-2.5 rounded skeleton-shimmer opacity-50" />
          </div>
        </div>
        {/* Badges */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-4 rounded-full skeleton-shimmer" />
          <div className="w-14 h-4 rounded-full skeleton-shimmer" />
        </div>
        {/* Title & Preview */}
        <div className="space-y-2.5">
          <div className="w-4/5 h-5 rounded skeleton-shimmer" />
          <div className="w-full h-3.5 rounded skeleton-shimmer opacity-70" />
          <div className="w-full h-3.5 rounded skeleton-shimmer opacity-70" />
          <div className="w-3/4 h-3.5 rounded skeleton-shimmer opacity-70" />
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex justify-between gap-2">
        <div className="w-16 h-7 rounded-xl skeleton-shimmer" />
        <div className="w-16 h-7 rounded-xl skeleton-shimmer" />
        <div className="w-16 h-7 rounded-xl skeleton-shimmer" />
        <div className="w-16 h-7 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}
