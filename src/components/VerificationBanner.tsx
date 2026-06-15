"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerificationBanner() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { isVerified } = useVerifiedAccess();
    const [dismissed, setDismissed] = useState(false);

    // Hide if not signed in, or if verified, or if banner dismissed
    if (!user || isVerified || dismissed) return null;

    // Do not show on auth pages
    const hideOn = ["/login", "/signup", "/onboarding"];
    if (hideOn.some(path => pathname?.startsWith(path))) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs py-3 px-6 flex items-center justify-between gap-4 font-bold relative z-50 select-none"
            >
                <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
                    <ShieldAlert size={14} className="text-amber-500 shrink-0 animate-pulse" />
                    <span>
                        Your account is pending verification. College admins will verify your identity shortly. 
                        You can browse, but some interactions (posting, commenting, reacting, accessing materials) will be locked until verified.
                    </span>
                </div>
                <button 
                    onClick={() => setDismissed(true)} 
                    className="p-1 hover:bg-amber-500/10 rounded-full transition-colors text-amber-500"
                >
                    <X size={14} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
