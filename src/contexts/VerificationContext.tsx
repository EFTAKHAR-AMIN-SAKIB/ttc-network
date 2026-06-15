"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";

interface VerificationContextType {
    isVerified: boolean;
    requireVerification: (action?: string) => boolean;
    showModal: (action?: string) => void;
}

const VerificationContext = createContext<VerificationContextType>({
    isVerified: false,
    requireVerification: () => false,
    showModal: () => {},
});

export function useVerifiedAccess() {
    return useContext(VerificationContext);
}

export function VerificationProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [actionText, setActionText] = useState("");

    // Admin, manager, super_manager are inherently verified
    const isVerified = 
        profile?.roleVerified === true || 
        profile?.role === "admin" || 
        profile?.role === "manager" || 
        profile?.role === "super_manager";

    const showModal = (action?: string) => {
        setActionText(action || "interact with the website");
        setIsOpen(true);
    };

    const requireVerification = (action?: string): boolean => {
        if (isVerified) return true;
        showModal(action);
        return false;
    };

    return (
        <VerificationContext.Provider value={{ isVerified, requireVerification, showModal }}>
            {children}
            
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#161620] rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-10"
                        >
                            {/* Close button */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-8 text-center">
                                {/* Shield Icon with pulse */}
                                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                        className="absolute inset-0 rounded-full bg-amber-500/10 dark:bg-amber-500/5"
                                    />
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center relative z-10 border border-amber-200/20">
                                        <ShieldAlert size={32} className="animate-pulse" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight mb-3">
                                    Verification Required
                                </h3>
                                
                                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed text-sm mb-8 px-2">
                                    Your account needs to be verified by a college admin or manager before you can <span className="font-bold text-navy-900 dark:text-white">{actionText}</span>. This helps us keep our community safe and trusted.
                                </p>

                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-4 bg-navy-900 dark:bg-primary text-white dark:text-navy-900 rounded-2xl font-black text-base transition-all active:scale-95 hover:opacity-90 shadow-lg"
                                >
                                    Understood
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </VerificationContext.Provider>
    );
}
