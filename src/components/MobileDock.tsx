"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Rss, BookOpen, School, Megaphone, BookText, Heart, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useSectionUpdates } from "@/hooks/useSectionUpdates";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const dockLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/news-feed", label: "News", icon: Rss },
    { href: "/story", label: "Story", icon: BookOpen },
    { href: "/college-info", label: "Colleges", icon: School },
    { href: "/notice", label: "Notice", icon: Megaphone },
    { href: "/study", label: "Study", icon: BookText },
    { href: "/support", label: "Support", icon: Heart },
];

export default function MobileDock() {
    const pathname = usePathname();
    const { lastSeen, latestUpdate, markAsSeen } = useSectionUpdates();
    const { isScrollingDown } = useScrollDirection();
    const [isStandalone, setIsStandalone] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);

    useEffect(() => {
        const handleComposer = (e: Event) => {
            const customEvent = e as CustomEvent<{ open: boolean }>;
            setIsComposerOpen(!!customEvent.detail?.open);
        };
        window.addEventListener("ttc-composer-toggle", handleComposer);
        return () => window.removeEventListener("ttc-composer-toggle", handleComposer);
    }, []);

    useEffect(() => {
        const isDisplayStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(isDisplayStandalone);
    }, []);

    const links = dockLinks.filter(
        (link) => !(link.label === "Home" && isStandalone)
    );

    const getSectionKey = (href: string) => {
        if (href === "/news-feed") return "news-feed";
        if (href === "/story") return "story";
        if (href === "/notice") return "notice";
        if (href === "/study") return "study";
        return null;
    };

    const hasUnseenUpdate = (href: string) => {
        if (href === "/news-feed") {
            return (
                latestUpdate.event > lastSeen.event ||
                latestUpdate.club > lastSeen.club ||
                latestUpdate.group > lastSeen.group
            );
        }
        if (href === "/story") return latestUpdate.story > lastSeen.story;
        if (href === "/notice") return latestUpdate.notice > lastSeen.notice;
        if (href === "/study") return latestUpdate.study > lastSeen.study;
        return false;
    };

    return (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-safe transition-transform duration-300 ease-in-out ${(isScrollingDown || isComposerOpen) ? "translate-y-full pointer-events-none" : "translate-y-0"}`}>
            <div className="flex items-center justify-around px-2 py-2">
                {links.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => {
                                const sectionKey = getSectionKey(link.href);
                                if (sectionKey) markAsSeen(sectionKey);
                            }}
                            className="relative flex flex-col items-center justify-center w-14 h-12"
                        >
                            <div className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-300 ${isActive ? "text-primary dark:text-[#1D9BF0]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}>
                                <div className="relative">
                                    <Icon size={isActive ? 22 : 20} className={`mb-1 transition-all duration-300 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                                    {(() => {
                                        if (hasUnseenUpdate(link.href)) {
                                            return (
                                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"}`}>
                                    {link.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDockIndicator"
                                        className="absolute -bottom-2 left-1/2 w-8 h-1 bg-primary dark:bg-[#1D9BF0] rounded-t-full transform -translate-x-1/2"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
            {/* Safe area padding for iOS devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)] w-full bg-transparent" />
        </div>
    );
}
