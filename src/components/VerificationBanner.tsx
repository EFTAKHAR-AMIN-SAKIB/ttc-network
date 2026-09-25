"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerificationBanner() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { isVerified } = useVerifiedAccess();
    const [devPreview, setDevPreview] = useState(() => {
        if (typeof window !== "undefined") {
            try {
                return new URLSearchParams(window.location.search).get("preview_unverified") === "true";
            } catch {
                return false;
            }
        }
        return false;
    });

    const [dismissed, setDismissed] = useState(() => {
        if (typeof window !== "undefined") {
            try {
                const key = user?.uid 
                    ? `ttc_dismissed_verification_${user.uid}` 
                    : "ttc_dismissed_verification_guest";
                return sessionStorage.getItem(key) === "true";
            } catch {
                return false;
            }
        }
        return false;
    });

    // Development preview toggle via ?preview_unverified=true on navigation
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.get("preview_unverified") === "true") {
                    setDevPreview(true);
                }
            } catch {
                // ignore
            }
        }
    }, [pathname]);

    const handleDismiss = () => {
        setDismissed(true);
        if (typeof window !== "undefined") {
            try {
                const key = user?.uid 
                    ? `ttc_dismissed_verification_${user.uid}` 
                    : "ttc_dismissed_verification_guest";
                sessionStorage.setItem(key, "true");
            } catch {
                // ignore
            }
        }
    };

    // Do not show on auth pages
    const hideOn = ["/login", "/signup", "/onboarding"];
    if (hideOn.some(path => pathname?.startsWith(path))) return null;

    // Show if dev preview flag is active OR if user is signed in and not verified
    const isUnverifiedUser = Boolean(user && !isVerified);
    const shouldDisplay = (devPreview || isUnverifiedUser) && !dismissed;

    if (!devPreview && (!user || isVerified)) return null;

    return (
        <AnimatePresence>
            {shouldDisplay && (
                <motion.div
                    initial={false}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
                    className="w-full bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 dark:from-amber-950/50 dark:via-amber-900/30 dark:to-amber-950/50 border-b border-amber-500/25 dark:border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs sm:text-[13px] pb-2.5 px-3.5 sm:px-6 relative z-40 select-none overflow-hidden"
                >
                    <div className="max-w-7xl mx-auto w-full flex items-start justify-between gap-2.5 sm:gap-4">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <ShieldAlert size={14} className="animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1 leading-relaxed font-medium">
                                <span className="font-bold text-amber-950 dark:text-amber-100">
                                    Account Pending Verification:
                                </span>{" "}
                                College admins will verify your identity shortly. You can browse, but some interactions (posting, commenting, reacting, accessing materials) will be locked until verified.
                            </div>
                        </div>
                        <button 
                            onClick={handleDismiss} 
                            aria-label="Dismiss verification banner"
                            className="shrink-0 p-1.5 -mr-1 -mt-0.5 rounded-lg text-amber-700/80 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-100 hover:bg-amber-500/20 active:scale-95 transition-all flex items-center justify-center"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
