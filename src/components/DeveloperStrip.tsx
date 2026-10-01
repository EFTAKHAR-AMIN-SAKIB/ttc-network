"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { getBuilderSettings, type FirestoreBuilderSettings } from "@/lib/firestore";
import BuilderPopupModal from "@/components/BuilderPopupModal";

/* ─── Rotating messages — cycles through with smooth animation ─── */
const rotatingMessages = [
    "Designed & built by Sakib · UI/UX Designer from Feni, Bangladesh 🇧🇩",
    "Crafting pixel-perfect interfaces with passion · meet the developer →",
    "TTC Network is a student-built platform — running on heart & code 💛",
    "Open for freelance projects · Clean code, clean design.",
    "Frontend Developer & Web3 explorer · Building the future of education.",
    "Every pixel carries intention. Every feature tells a story.",
];

const supportMessages = [
    "Your support keeps TTC Network alive · Every taka counts 💛",
    "Built by a student for students — help keep this dream alive →",
    "Support TTC Network · Fund a student developer's mission 🚀",
];

export default function DeveloperStrip() {
    const pathname = usePathname();
    const [showModal, setShowModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Disabled on support page
    const visiblePages: string[] = [];
    const isVisible = visiblePages.includes(pathname);
    const [builderSettings, setBuilderSettings] = useState<FirestoreBuilderSettings | null>(null);

    useEffect(() => {
        if (!isVisible) return;
        getBuilderSettings().then(setBuilderSettings).catch(console.error);
    }, [isVisible]);

    const messages = pathname === "/support" ? supportMessages : rotatingMessages;

    // Rotate messages every 5 seconds
    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % messages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [messages.length, isVisible]);

    if (!isVisible) return null;

    return (
        <>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="dev-strip"
                onClick={() => setShowModal(true)}
            >
                <div className="relative overflow-hidden h-5 flex items-center">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={currentIndex}
                            initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                            exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="text-white/90 text-xs sm:text-sm font-english tracking-wide whitespace-nowrap"
                        >
                            {messages[currentIndex]}
                        </motion.span>
                    </AnimatePresence>
                </div>
                <ExternalLink size={14} className="ml-2 text-white/60 flex-shrink-0" />
            </motion.div>

            <BuilderPopupModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                builderSettings={builderSettings!} 
            />
        </>
    );
}
