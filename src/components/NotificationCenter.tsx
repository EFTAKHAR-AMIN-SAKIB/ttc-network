"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, X, BookText, Globe, MessageSquare, Award, Heart, Scroll, UserPlus, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FirestoreNotification } from "@/lib/firestore";
import { useState, useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

const notifIcons: Record<string, ComponentType<{ size?: number | string; className?: string }>> = {
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
    reaction: Heart,
    follow: UserPlus,
    badge_received: Award,
    mention: MessageSquare,
    reply: MessageSquare,
    new_post: Bell,
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
    reaction: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
    follow: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    badge_received: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    mention: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    reply: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
    new_post: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: (FirestoreNotification & { id: string })[];
    unreadCount: number;
    onMarkRead: (notif: FirestoreNotification & { id: string }) => void;
    onMarkAllRead: () => void;
    onMarkSingleRead: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NotificationCenter({
    isOpen,
    onClose,
    notifications,
    unreadCount,
    onMarkRead,
    onMarkAllRead,
    onMarkSingleRead,
    onDelete,
}: NotificationCenterProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "unread" | "social" | "system">("all");

    useEffect(() => {
        setMounted(true);
    }, []);

    const formatTime = (ts: { seconds?: number } | null | undefined) => {
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

    // Client-side filtering
    const filteredNotifications = notifications.filter(notif => {
        if (activeTab === "unread") return !notif.read;
        if (activeTab === "social") {
            return ["comment", "reply", "reaction", "follow", "mention"].includes(notif.type);
        }
        if (activeTab === "system") {
            return !["comment", "reply", "reaction", "follow", "mention"].includes(notif.type);
        }
        return true;
    });

    const newNotifs = filteredNotifications.filter(n => !n.read);
    const earlierNotifs = filteredNotifications.filter(n => n.read);

    // Tab buttons component
    const FilterTabs = () => (
        <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-800/60 flex gap-1.5 overflow-x-auto no-scrollbar bg-gray-50/50 dark:bg-transparent">
            {(["all", "unread", "social", "system"] as const).map((tab) => {
                const count = tab === "unread" 
                    ? notifications.filter(n => !n.read).length
                    : tab === "social" 
                    ? notifications.filter(n => ["comment", "reply", "reaction", "follow", "mention"].includes(n.type)).length
                    : tab === "system"
                    ? notifications.filter(n => !["comment", "reply", "reaction", "follow", "mention"].includes(n.type)).length
                    : notifications.length;

                const isActive = activeTab === tab;
                return (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-full text-xs font-black transition-all whitespace-nowrap capitalize ${
                            isActive
                                ? "bg-primary text-white shadow-sm"
                                : "bg-gray-100 dark:bg-[#1f202b] hover:bg-gray-200 dark:hover:bg-gray-800/40 text-gray-500 dark:text-gray-400"
                        }`}
                    >
                        {tab} {count > 0 && <span className={`ml-1 text-[9px] ${isActive ? "text-white" : "text-gray-400 dark:text-gray-500 font-bold"}`}>({count})</span>}
                    </button>
                );
            })}
        </div>
    );

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
                            className="absolute right-0 mt-3 w-[420px] max-h-[650px] bg-white/95 dark:bg-[#1a1b23]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-200/50 dark:border-gray-800/80 overflow-hidden z-[100] flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between bg-white/50 dark:bg-transparent shrink-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest flex items-center gap-2">
                                        Notifications
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full animate-pulse">
                                                {unreadCount} NEW
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={onMarkAllRead}
                                        className="text-[10px] font-bold text-primary hover:text-primary/70 transition-colors uppercase tracking-tight"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            {/* Filter Tabs */}
                            <FilterTabs />

                            {/* List */}
                            <div className="overflow-y-auto max-h-[480px] no-scrollbar flex-1">
                                <AnimatePresence mode="popLayout">
                                    {filteredNotifications.length > 0 ? (
                                        <motion.div layout className="py-2">
                                            {newNotifs.length > 0 && (
                                                <motion.div layout className="px-5 py-2">
                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">New</span>
                                                </motion.div>
                                            )}
                                            {newNotifs.map((notif) => (
                                                <motion.div
                                                    key={notif.id}
                                                    layout
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <NotificationItem 
                                                        notif={notif} 
                                                        onClick={() => handleNotifClick(notif)} 
                                                        onMarkSingleRead={onMarkSingleRead}
                                                        onDelete={onDelete}
                                                        formatTime={formatTime} 
                                                    />
                                                </motion.div>
                                            ))}

                                            {earlierNotifs.length > 0 && (
                                                <motion.div layout className="px-5 py-3 mt-2 border-t border-gray-100/50 dark:border-gray-800/20">
                                                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Earlier</span>
                                                </motion.div>
                                            )}
                                            {earlierNotifs.map((notif) => (
                                                <motion.div
                                                    key={notif.id}
                                                    layout
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <NotificationItem 
                                                        notif={notif} 
                                                        onClick={() => handleNotifClick(notif)} 
                                                        onMarkSingleRead={onMarkSingleRead}
                                                        onDelete={onDelete}
                                                        formatTime={formatTime} 
                                                    />
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    ) : (
                                        <EmptyState />
                                    )}
                                </AnimatePresence>
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
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                        <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <Bell className="text-primary" size={18} /> Updates
                                            {unreadCount > 0 && (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full animate-pulse">
                                                    {unreadCount} NEW
                                                </span>
                                            )}
                                        </h2>
                                        <button 
                                            onClick={onClose}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#161620] text-gray-500 active:scale-95 transition-transform"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    {unreadCount > 0 && (
                                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#161620] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{unreadCount} unread items</span>
                                            <button 
                                                onClick={onMarkAllRead}
                                                className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                    )}

                                    {/* Mobile Filter Tabs */}
                                    <FilterTabs />

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto p-3 no-scrollbar space-y-2.5 pb-safe">
                                        <AnimatePresence mode="popLayout">
                                            {filteredNotifications.length > 0 ? (
                                                filteredNotifications.map((notif) => (
                                                    <motion.div
                                                        key={notif.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <NotificationItem 
                                                            notif={notif} 
                                                            onClick={() => handleNotifClick(notif)} 
                                                            onMarkSingleRead={onMarkSingleRead}
                                                            onDelete={onDelete}
                                                            formatTime={formatTime}
                                                            isMobile 
                                                        />
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="h-full flex items-center justify-center -mt-20">
                                                    <EmptyState />
                                                </div>
                                            )}
                                        </AnimatePresence>
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

// Sub-Component: Styled typography & content preview
function FormattedNotificationText({ notif }: { notif: FirestoreNotification & { senderName?: string } }) {
    if (notif.senderName && notif.message.startsWith(notif.senderName)) {
        const restOfMessage = notif.message.substring(notif.senderName.length);
        const quoteIndex = restOfMessage.indexOf(': "');

        if (quoteIndex !== -1) {
            const actionText = restOfMessage.substring(0, quoteIndex + 1);
            const quoteText = restOfMessage.substring(quoteIndex + 2).replace(/"$/, ""); // strip closing quote

            return (
                <div className="text-sm leading-normal">
                    <span className="font-extrabold text-gray-900 dark:text-gray-100">{notif.senderName}</span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{actionText}</span>
                    <div className="mt-2 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-805/40 border-l-[3px] border-primary/45 rounded-r-xl text-xs italic text-gray-600 dark:text-gray-300 font-medium leading-relaxed break-words shadow-sm">
                        &quot;{quoteText}&quot;
                    </div>
                </div>
            );
        }

        return (
            <div className="text-sm text-gray-600 dark:text-gray-450 leading-normal font-medium">
                <span className="font-extrabold text-gray-900 dark:text-gray-100">{notif.senderName}</span>
                {restOfMessage}
            </div>
        );
    }

    return <p className="text-sm text-gray-805 dark:text-gray-200 font-bold leading-normal">{notif.message}</p>;
}

// Sub-Component: Individual Notification Row Item
function NotificationItem({
    notif,
    onClick,
    onMarkSingleRead,
    onDelete,
    formatTime,
    isMobile
}: {
    notif: FirestoreNotification & { id: string; senderName?: string; senderPhotoURL?: string };
    onClick: () => void;
    onMarkSingleRead: (id: string) => void;
    onDelete: (id: string) => void;
    formatTime: (ts: { seconds?: number } | null | undefined) => string;
    isMobile?: boolean;
}) {
    const Icon = notifIcons[notif.type] || Bell;
    const colorClass = notifColors[notif.type] || "text-gray-500 bg-gray-50 dark:bg-gray-800";

    return (
        <div
            onClick={onClick}
            className={`w-full text-left flex items-start gap-3.5 transition-all group relative cursor-pointer ${
                isMobile 
                ? "p-4 rounded-2xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-[#161620]" 
                : "px-5 py-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/30"
            } ${!notif.read ? (isMobile ? "bg-primary/[0.03] border-primary/20 dark:bg-primary/[0.05]" : "bg-blue-50/15 dark:bg-blue-900/5") : "opacity-80 hover:opacity-100"}`}
        >
            {/* Left: Avatar or System Icon */}
            <div className="shrink-0 relative mt-0.5 animate-in fade-in zoom-in duration-300">
                {notif.senderPhotoURL ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-105 dark:bg-gray-800">
                        <Image
                            src={notif.senderPhotoURL}
                            alt={notif.senderName || "User"}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${colorClass}`}>
                        <Icon size={18} />
                    </div>
                )}

                {/* Overlaid Action Badge (Only for Social actions) */}
                {notif.senderPhotoURL && (
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#161620] shadow-sm ${colorClass}`}>
                        <Icon size={9} className="stroke-[3]" />
                    </div>
                )}
            </div>

            {/* Middle: Content & Timestamp */}
            <div className="flex-1 min-w-0 pr-8">
                <FormattedNotificationText notif={notif} />
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {formatTime(notif.createdAt)}
                    </span>
                </div>
            </div>

            {/* Right Side: Unread dot / Quick hover controls */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                {/* Default State: Unread dot */}
                {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse group-hover:hidden transition-all duration-150" />
                )}

                {/* Quick actions: Show on hover (Desktop) or always (Mobile) */}
                <div className={`${isMobile ? "flex" : "hidden group-hover:flex"} items-center gap-1 bg-white/95 dark:bg-[#1a1b23]/95 p-1 rounded-lg border border-gray-100 dark:border-gray-800 shadow-md`}>
                    {!notif.read && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkSingleRead(notif.id);
                            }}
                            className="p-1 text-gray-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Mark as read"
                        >
                            <Check size={14} className="stroke-[2.5]" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notif.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Delete notification"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sub-Component: Empty State
function EmptyState() {
    return (
        <div className="px-8 py-16 text-center select-none animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/40 rounded-[40%] flex items-center justify-center mx-auto mb-6 rotate-12">
                <Scroll size={32} className="text-gray-200 dark:text-gray-700 -rotate-12" />
            </div>
            <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-1.5 uppercase tracking-wider">No updates found</h4>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed max-w-[220px] mx-auto">
                No notifications match the active filter criteria. Check back later!
            </p>
        </div>
    );
}
