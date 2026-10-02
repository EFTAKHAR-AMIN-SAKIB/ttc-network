"use client";

import React from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export default function OfflineBanner() {
    const { isOnline, wasOffline, isChecking, checkConnection, dismissReconnected } = useOnlineStatus();

    // If completely online and not recently reconnected, don't render anything
    if (isOnline && !wasOffline) {
        return null;
    }

    return (
        <aside
            aria-live="polite"
            className="w-full z-40 transition-all duration-300 select-none animate-in fade-in slide-in-from-top-2"
        >
            {!isOnline ? (
                // ── Offline Mode Banner (Amber / Slate Modern Glass) ──────────────────────────
                <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/25 dark:border-amber-500/20 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 text-amber-900 dark:text-amber-200">
                    <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            <div className="flex items-center gap-1.5 font-medium truncate">
                                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="font-semibold text-gray-900 dark:text-white">Offline Mode:</span>
                                <span className="text-amber-800 dark:text-amber-300 truncate">
                                    Browsing saved posts & media.
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => checkConnection()}
                            disabled={isChecking}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 text-amber-900 dark:text-amber-200 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-amber-600 dark:text-amber-400" : ""}`} />
                            <span>{isChecking ? "Checking..." : "Retry"}</span>
                        </button>
                    </div>
                </div>
            ) : (
                // ── Reconnected Banner (Emerald Reassurance) ──────────────────────────
                <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/25 dark:border-emerald-500/20 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 text-emerald-900 dark:text-emerald-200">
                    <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 sm:gap-2.5 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-white">Back online!</span>
                            <span className="text-emerald-800 dark:text-emerald-300 hidden sm:inline">
                                Syncing latest feed and updates...
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={dismissReconnected}
                            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 font-semibold text-xs px-2 py-0.5 rounded cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
