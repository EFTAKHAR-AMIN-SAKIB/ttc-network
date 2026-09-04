"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, X, BookText, Globe, MessageSquare, Award, Heart, Scroll, UserPlus, Check, Trash2, Share2, FileText, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FirestoreNotification } from "@/lib/firestore";
import { useState, useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useNotificationValidity } from "@/hooks/useNotificationValidity";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { enablePushNotifications, sendTestPushNotification, setupFCM } from "@/lib/fcm";

const notifIcons: Record<string, ComponentType<{ size?: number | string; className?: string }>> = {
    comment: MessageSquare,
    reply: MessageSquare,
    mention: MessageSquare,
    reaction: Heart,
    share: Share2,
    // notice / resource
    new_notice: FileText,
    urgent_notice: FileText,
    story_approved: FileText,
    story_rejected: FileText,
    post_approved: FileText,
    post_rejected: FileText,
    // system fallbacks
    follow: Bell,
    group_invite: Bell,
    badge_received: Bell,
    college_edit_approved: Bell,
    college_edit_rejected: Bell,
    gift_approved: Bell,
    club_join_approved: Bell,
    club_join_rejected: Bell,
    new_post: Bell,
};

const notifColors: Record<string, string> = {
    reaction: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
    comment: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
    reply: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
    mention: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
    share: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    new_notice: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    urgent_notice: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    story_approved: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    story_rejected: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    post_approved: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    post_rejected: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    follow: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    group_invite: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    badge_received: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    college_edit_approved: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    college_edit_rejected: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    gift_approved: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    club_join_approved: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    club_join_rejected: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    new_post: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
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
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "unread" | "social" | "system">("all");
    const [pushPermission, setPushPermission] = useState<string>("default");
    const [isEnablingPush, setIsEnablingPush] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const validityMap = useNotificationValidity(notifications);
    const { showToast } = useToast();

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined" && "Notification" in window) {
            setPushPermission(Notification.permission);
            if (Notification.permission === "granted" && user?.uid) {
                setupFCM(user.uid, false).catch(() => {});
            }
        } else {
            setPushPermission("unsupported");
        }
    }, [user?.uid]);

    const handleEnablePush = async () => {
        if (!user?.uid) {
            showToast("Please log in to enable notifications", "error");
            return;
        }
        setIsEnablingPush(true);
        try {
            const success = await enablePushNotifications(user.uid);
            if (success) {
                setPushPermission("granted");
                showToast("Push notifications enabled! You will now receive background alerts.", "success");
            } else {
                if (typeof window !== "undefined" && "Notification" in window) {
                    setPushPermission(Notification.permission);
                }
                showToast("Notification permission was not granted.", "info");
            }
        } catch (err: any) {
            showToast("Failed to enable notifications: " + (err.message || "Unknown error"), "error");
        } finally {
            setIsEnablingPush(false);
        }
    };

    const handleTestPush = async () => {
        if (!user?.uid) return;
        setIsSendingTest(true);
        try {
            const result = await sendTestPushNotification(user.uid);
            if (result.success) {
                showToast("Test notification sent! Check your device notifications.", "success");
            } else {
                showToast(result.message, "error");
            }
        } catch (err: any) {
            showToast("Failed to send test push: " + (err.message || "Unknown error"), "error");
        } finally {
            setIsSendingTest(false);
        }
    };

    const PushBanner = () => {
        if (pushPermission === "unsupported") return null;

        if (pushPermission === "default") {
            return (
                <div className="mx-4 my-2.5 p-3 rounded-xl bg-gradient-to-r from-red-500/10 via-primary/5 to-transparent border border-primary/20 flex flex-col gap-2 shrink-0">
                    <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-primary text-white shrink-0 mt-0.5">
                            <BellRing size={14} className="animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                Turn on Device Push Alerts
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                                Receive alerts on your device even when TTC NETWORK is closed.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleEnablePush}
                        disabled={isEnablingPush}
                        className="w-full py-1.5 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {isEnablingPush ? "Enabling..." : "Enable Push Notifications"}
                    </button>
                </div>
            );
        }

        if (pushPermission === "granted") {
            return (
                <div className="px-5 py-2 bg-emerald-50/80 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-800/40 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle size={12} className="stroke-[2.5]" />
                        Device notifications active
                    </span>
                    <button
                        onClick={handleTestPush}
                        disabled={isSendingTest}
                        className="text-[10px] font-black text-primary uppercase tracking-tight hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                        {isSendingTest ? "Sending..." : "Send Test Alert"}
                    </button>
                </div>
            );
        }

        if (pushPermission === "denied") {
            return (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-800/30 text-[10px] text-amber-700 dark:text-amber-400 font-medium shrink-0">
                    ⚠️ Notifications are blocked in browser settings. Unblock in browser settings to receive background alerts.
                </div>
            );
        }

        return null;
    };

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

        const isValid = validityMap[notif.id] !== false;
        if (!isValid) {
            showToast("This content is no longer available", "error");
            return;
        }

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
            return ["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(notif.type);
        }
        if (activeTab === "system") {
            return !["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(notif.type);
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
                    ? notifications.filter(n => ["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(n.type)).length
                    : tab === "system"
                    ? notifications.filter(n => !["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(n.type)).length
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

                            {/* Push Notification Controls */}
                            <PushBanner />

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
                                                        isValid={validityMap[notif.id] !== false}
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
                                                        isValid={validityMap[notif.id] !== false}
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

                                    {/* Push Notification Controls */}
                                    <PushBanner />

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
                                                            isValid={validityMap[notif.id] !== false}
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
function FormattedNotificationText({ notif, isRead }: { notif: FirestoreNotification & { senderName?: string }, isRead: boolean }) {
    const textWeightClass = isRead ? "font-normal text-gray-500 dark:text-gray-400" : "font-semibold text-gray-950 dark:text-white";
    const senderWeightClass = isRead ? "font-semibold text-gray-700 dark:text-gray-305" : "font-black text-gray-955 dark:text-white";

    if (notif.senderName && notif.message.startsWith(notif.senderName)) {
        const restOfMessage = notif.message.substring(notif.senderName.length);
        const quoteIndex = restOfMessage.indexOf(': "');

        if (quoteIndex !== -1) {
            const actionText = restOfMessage.substring(0, quoteIndex + 1);
            const quoteText = restOfMessage.substring(quoteIndex + 2).replace(/"$/, ""); // strip closing quote

            return (
                <div className="text-sm leading-normal">
                    <span className={senderWeightClass}>{notif.senderName}</span>
                    <span className={`font-medium ${isRead ? "text-gray-450 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>{actionText}</span>
                    <div className={`mt-2 px-3.5 py-2.5 border-l-[3px] rounded-r-xl text-xs italic leading-relaxed break-words shadow-sm ${
                        isRead 
                        ? "bg-gray-50/50 dark:bg-gray-800/10 border-gray-200 dark:border-gray-800 text-gray-550 dark:text-gray-400" 
                        : "bg-gray-50 dark:bg-gray-800/40 border-primary/45 text-gray-700 dark:text-gray-300"
                    }`}>
                        &quot;{quoteText}&quot;
                    </div>
                </div>
            );
        }

        return (
            <div className={`text-sm leading-normal ${textWeightClass}`}>
                <span className={senderWeightClass}>{notif.senderName}</span>
                {restOfMessage}
            </div>
        );
    }

    return <p className={`text-sm leading-normal ${isRead ? "font-normal text-gray-505 dark:text-gray-400" : "font-bold text-gray-950 dark:text-white"}`}>{notif.message}</p>;
}

// Sub-Component: Individual Notification Row Item
function NotificationItem({
    notif,
    onClick,
    onMarkSingleRead,
    onDelete,
    formatTime,
    isMobile,
    isValid = true
}: {
    notif: FirestoreNotification & { id: string; senderName?: string; senderPhotoURL?: string };
    onClick: () => void;
    onMarkSingleRead: (id: string) => void;
    onDelete: (id: string) => void;
    formatTime: (ts: { seconds?: number } | null | undefined) => string;
    isMobile?: boolean;
    isValid?: boolean;
}) {
    const Icon = notifIcons[notif.type] || Bell;
    const colorClass = notifColors[notif.type] || "text-gray-500 bg-gray-50 dark:bg-gray-800";

    return (
        <div
            onClick={onClick}
            className={`w-full text-left flex items-start gap-3.5 transition-all group relative cursor-pointer pr-12 pl-8 ${
                isMobile 
                ? "p-4 pr-12 pl-8 rounded-2xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-[#161620]" 
                : "px-5 pr-12 pl-8 py-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/30"
            } ${!notif.read ? (isMobile ? "bg-primary/[0.03] border-primary/20 dark:bg-primary/[0.05]" : "bg-blue-50/15 dark:bg-blue-900/5") : "opacity-80 hover:opacity-100"}`}
        >
            {/* Blue dot on left */}
            {!notif.read && (
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}

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
            <div className="flex-grow min-w-0 pr-8">
                {isValid ? (
                    <FormattedNotificationText notif={notif} isRead={notif.read} />
                ) : (
                    <p className="text-sm leading-normal font-medium text-gray-400 dark:text-gray-500 italic">
                        Content is not available
                    </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {formatTime(notif.createdAt)}
                    </span>
                </div>
            </div>

            {/* Right Side: Quick hover controls */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">

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
