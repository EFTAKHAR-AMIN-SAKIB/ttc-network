"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, X, BookText, Globe, MessageSquare, Award, Heart, Scroll } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FirestoreNotification } from "@/lib/firestore";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const notifIcons: Record<string, any> = {
    post_approved: CheckCircle,
    post_rejected: X,
    story_approved: BookText,
    story_rejected: X,
    college_edit_approved: Globe,
    college_edit_rejected: X,
    new_notice: MessageSquare,
    urgent_notice: Bell,
    gift_approved: Heart,
    club_join_approved: Award,
    club_join_rejected: X,
    comment: MessageSquare,
};

const notifColors: Record<string, string> = {
    post_approved: "text-green-500 bg-green-50 dark:bg-green-500/10",
    post_rejected: "text-red-500 bg-red-50 dark:bg-red-500/10",
    story_approved: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    story_rejected: "text-red-500 bg-red-50 dark:bg-red-500/10",
    college_edit_approved: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    college_edit_rejected: "text-red-500 bg-red-50 dark:bg-red-500/10",
    new_notice: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
    urgent_notice: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    gift_approved: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
    club_join_approved: "text-[#1A5276] bg-[#1A5276]/5",
    club_join_rejected: "text-red-500 bg-red-50 dark:bg-red-500/10",
    comment: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: (FirestoreNotification & { id: string })[];
    unreadCount: number;
    onMarkRead: (notif: FirestoreNotification & { id: string }) => void;
    onMarkAllRead: () => void;
}

export function NotificationCenter({
    isOpen,
    onClose,
    notifications,
    unreadCount,
    onMarkRead,
    onMarkAllRead,
}: NotificationCenterProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const formatTime = (ts: any) => {
        if (!ts?.seconds) return "";
        const d = new Date(ts.seconds * 1000);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return `${diffDay}d ago`;
        return d.toLocaleDateString();
    };

    const handleNotifClick = (notif: FirestoreNotification & { id: string }) => {
        onMarkRead(notif);
        onClose();

        if (notif.targetUrl) {
            router.push(notif.targetUrl);
            return;
        }

        // Fallback for legacy notifications
        if (notif.relatedType === "post") router.push("/news-feed");
        else if (notif.relatedType === "story") router.push(`/story/${notif.relatedId}`);
        else if (notif.relatedType === "college") router.push("/college-info");
        else if (notif.relatedType === "club") router.push("/college-info");
        else if (notif.relatedType === "notice") router.push("/notice");
    };

    // Grouping
    const newNotifs = notifications.filter(n => !n.read);
    const earlierNotifs = notifications.filter(n => n.read);

    return (
        <>
            {/* Desktop Dropdown */}
            <div className="hidden md:block">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                            className="absolute right-0 mt-3 w-[400px] max-h-[600px] bg-white/95 dark:bg-[#1a1b23]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-[100]"
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-transparent">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest flex items-center gap-2">
                                        Notifications
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full animate-pulse">
                                                {unreadCount} NEW
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={onMarkAllRead}
                                        className="text-[11px] font-bold text-primary hover:text-primary/70 transition-colors uppercase tracking-tight"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto max-h-[500px] no-scrollbar">
                                {notifications.length > 0 ? (
                                    <div className="py-2">
                                        {newNotifs.length > 0 && (
                                            <div className="px-5 py-2">
                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">New</span>
                                            </div>
                                        )}
                                        {newNotifs.map((notif) => (
                                            <NotificationItem 
                                                key={notif.id} 
                                                notif={notif} 
                                                onClick={() => handleNotifClick(notif)} 
                                                formatTime={formatTime} 
                                            />
                                        ))}

                                        {earlierNotifs.length > 0 && (
                                            <div className="px-5 py-3 mt-2">
                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Earlier</span>
                                            </div>
                                        )}
                                        {earlierNotifs.map((notif) => (
                                            <NotificationItem 
                                                key={notif.id} 
                                                notif={notif} 
                                                onClick={() => handleNotifClick(notif)} 
                                                formatTime={formatTime} 
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Full-Screen Modal */}
            {mounted && typeof document !== "undefined" && createPortal(
                <div className="md:hidden">
                    <AnimatePresence>
                        {isOpen && (
                            <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0C0C10]">
                                <motion.div
                                    initial={{ opacity: 0, y: "100%" }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="flex flex-col h-full w-full relative"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <Bell className="text-primary" size={20} /> Updates
                                            {unreadCount > 0 && (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full animate-pulse">
                                                    {unreadCount} NEW
                                                </span>
                                            )}
                                        </h2>
                                        <button 
                                            onClick={onClose}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#161620] text-gray-500 active:scale-95 transition-transform"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    {unreadCount > 0 && (
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-[#161620] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{unreadCount} unread items</span>
                                            <button 
                                                onClick={onMarkAllRead}
                                                className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                    )}

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto p-2 no-scrollbar space-y-2 pb-safe">
                                        {notifications.length > 0 ? (
                                            <>
                                                {notifications.map((notif) => (
                                                    <NotificationItem 
                                                        key={notif.id} 
                                                        notif={notif} 
                                                        onClick={() => handleNotifClick(notif)} 
                                                        formatTime={formatTime}
                                                        isMobile 
                                                    />
                                                ))}
                                            </>
                                        ) : (
                                            <div className="h-full flex items-center justify-center -mt-20">
                                                <EmptyState />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </>
    );
}

function NotificationItem({ notif, onClick, formatTime, isMobile }: { notif: any, onClick: () => void, formatTime: any, isMobile?: boolean }) {
    const Icon = notifIcons[notif.type] || Bell;
    const colorClass = notifColors[notif.type] || "text-gray-500 bg-gray-50 dark:bg-gray-800";

    return (
        <button
            onClick={onClick}
            className={`w-full text-left flex items-start gap-4 transition-all group ${
                isMobile 
                ? "p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161620]" 
                : "px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            } ${!notif.read ? (isMobile ? "bg-primary/5 border-primary/20 dark:bg-primary/10" : "bg-blue-50/40 dark:bg-blue-900/10") : "opacity-75 hover:opacity-100"}`}
        >
            <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${colorClass}`}>
                <Icon size={isMobile ? 20 : 18} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm leading-[1.5] ${!notif.read ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-600 dark:text-gray-400"}`}>
                    {notif.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {formatTime(notif.createdAt)}
                    </span>
                    {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                </div>
            </div>
        </button>
    );
}

function EmptyState() {
    return (
        <div className="px-8 py-16 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-[40%] flex items-center justify-center mx-auto mb-6 rotate-12">
                <Scroll size={32} className="text-gray-200 dark:text-gray-700 -rotate-12" />
            </div>
            <h4 className="text-base font-black text-gray-900 dark:text-gray-100 mb-2">No updates yet</h4>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                When you get activity on your posts or stories, they'll show up here.
            </p>
        </div>
    );
}
