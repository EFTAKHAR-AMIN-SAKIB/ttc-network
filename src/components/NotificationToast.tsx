"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MessageSquare, Heart, FileText, Share2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { type ForegroundNotification } from "@/hooks/useForegroundNotification";
import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

const typeIcons: Record<string, ComponentType<{ size?: number | string; className?: string }>> = {
    comment: MessageSquare,
    reply: MessageSquare,
    mention: MessageSquare,
    reaction: Heart,
    share: Share2,
    follow: UserPlus,
    new_notice: FileText,
    urgent_notice: FileText,
};

const typeColors: Record<string, string> = {
    comment: "from-indigo-500/90 to-indigo-600/90",
    reply: "from-indigo-500/90 to-indigo-600/90",
    mention: "from-indigo-500/90 to-indigo-600/90",
    reaction: "from-pink-500/90 to-pink-600/90",
    share: "from-emerald-500/90 to-emerald-600/90",
    follow: "from-violet-500/90 to-violet-600/90",
    new_notice: "from-amber-500/90 to-amber-600/90",
    urgent_notice: "from-red-500/90 to-red-600/90",
};

interface NotificationToastProps {
    notifications: ForegroundNotification[];
    onDismiss: (id: string) => void;
    autoDismissMs?: number;
}

export function NotificationToast({ notifications, onDismiss, autoDismissMs = 6000 }: NotificationToastProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleClick = (notif: ForegroundNotification) => {
        onDismiss(notif.id);
        if (notif.targetUrl) {
            router.push(notif.targetUrl);
        }
    };

    if (!mounted || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none flex flex-col items-center gap-2 p-3 pt-[env(safe-area-inset-top,12px)]">
            <AnimatePresence mode="popLayout">
                {notifications.map((notif) => {
                    const Icon = typeIcons[notif.type || ""] || Bell;
                    const gradientClass = typeColors[notif.type || ""] || "from-primary/90 to-primary/95";

                    return (
                        <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, y: -60, scale: 0.85 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -40, scale: 0.9 }}
                            transition={{
                                type: "spring",
                                damping: 22,
                                stiffness: 260,
                                mass: 0.8,
                            }}
                            onClick={() => handleClick(notif)}
                            className="pointer-events-auto w-full max-w-md cursor-pointer"
                        >
                            <div className="relative overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-white/20 dark:border-gray-700/40">
                                {/* Glass background */}
                                <div className="absolute inset-0 bg-white/95 dark:bg-[#1a1b23]/95 backdrop-blur-xl" />

                                {/* Gradient accent strip at top */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass}`} />

                                {/* Auto-dismiss progress bar */}
                                <motion.div
                                    className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${gradientClass}`}
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
                                />

                                {/* Content */}
                                <div className="relative flex items-start gap-3 p-3.5 pr-10">
                                    {/* Avatar / Icon */}
                                    <div className="shrink-0 mt-0.5">
                                        {notif.senderPhotoURL ? (
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                                                    <Image
                                                        src={notif.senderPhotoURL}
                                                        alt={notif.senderName || "User"}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                {/* Action type badge */}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center border-2 border-white dark:border-[#1a1b23] shadow-sm`}>
                                                    <Icon size={9} className="text-white stroke-[3]" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-sm`}>
                                                <Icon size={18} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Text content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                                TTC NETWORK
                                            </span>
                                            <span className="text-[8px] text-gray-400 dark:text-gray-500">•</span>
                                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">
                                                Just now
                                            </span>
                                        </div>
                                        <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">
                                            {notif.title !== "TTC NETWORK" ? notif.title : notif.senderName || ""}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug mt-0.5 line-clamp-2">
                                            {notif.body}
                                        </p>
                                    </div>

                                    {/* Close button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDismiss(notif.id);
                                        }}
                                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-90"
                                    >
                                        <X size={12} className="stroke-[3]" />
                                    </button>
                                </div>

                                {/* Image preview if present */}
                                {notif.image && (
                                    <div className="relative mx-3.5 mb-3 rounded-xl overflow-hidden h-32">
                                        <Image
                                            src={notif.image}
                                            alt="Notification image"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>,
        document.body
    );
}
