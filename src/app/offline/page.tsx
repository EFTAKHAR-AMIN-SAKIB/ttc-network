"use client";

import { WifiOff, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8 text-center select-none font-sans">
      {/* Offline Icon Container */}
      <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center mb-6 text-primary dark:text-blue-400 shadow-lg shadow-blue-500/10">
        <WifiOff size={38} strokeWidth={2.2} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
        You&apos;re Offline
      </h1>

      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed mb-8">
        It looks like your internet connection dropped. Cached content is still accessible, or check your Wi-Fi/mobile data to reconnect.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all text-sm cursor-pointer"
        >
          <RotateCcw size={16} />
          <span>Try Again</span>
        </button>

        <Link
          href="/news-feed"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all text-sm"
        >
          <Home size={16} />
          <span>Go to Feed</span>
        </Link>
      </div>

      <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 mt-10 tracking-wider uppercase">
        TTC Network · Standalone PWA
      </p>
    </div>
  );
}
