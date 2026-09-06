"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, X, BookText, Globe, MessageSquare, Award, Heart, Scroll, UserPlus, Check, Trash2, Shield, Loader2, ArrowLeft, Share2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getNotificationsPaginated, markNotificationRead, markAllNotificationsRead, deleteNotification, type FirestoreNotification } from "@/lib/firestore";
import { useNotificationValidity } from "@/hooks/useNotificationValidity";

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

// Sub-Component: Styled typography & content preview
function FormattedNotificationText({ notif, isRead }: { notif: FirestoreNotification & { senderName?: string }, isRead: boolean }) {
    const textWeightClass = isRead ? "font-normal text-gray-500 dark:text-gray-400" : "font-semibold text-gray-955 dark:text-white";
    const senderWeightClass = isRead ? "font-semibold text-gray-700 dark:text-gray-305" : "font-black text-gray-905 dark:text-white";

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

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    
    const [notifications, setNotifications] = useState<(FirestoreNotification & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState<"all" | "unread" | "social" | "system">("all");
    const validityMap = useNotificationValidity(notifications);

    // Fetch initial notifications
    useEffect(() => {
        if (!user?.uid) return;
        
        setLoading(true);
        getNotificationsPaginated(user.uid, 20)
            .then(({ notifications: initialNotifs, lastDoc: lastDocSnap }) => {
                setNotifications(initialNotifs);
                setLastDoc(lastDocSnap);
                setHasMore(initialNotifs.length === 20);
                setLoading(false);
            })
            .catch((err) => {
                console.error("[NotificationsPage] Error loading notifications:", err);
                showToast("Failed to load notifications", "error");
                setLoading(false);
            });
    }, [user?.uid]);

    // Load older notifications
    const handleLoadMore = async () => {
        if (!user?.uid || loadingMore || !lastDoc || !hasMore) return;
        
        setLoadingMore(true);
        try {
            const { notifications: moreNotifs, lastDoc: lastDocSnap } = await getNotificationsPaginated(user.uid, 20, lastDoc);
            if (moreNotifs.length > 0) {
                setNotifications((prev) => [...prev, ...moreNotifs]);
                setLastDoc(lastDocSnap);
                setHasMore(moreNotifs.length === 20);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("[NotificationsPage] Error loading more notifications:", err);
            showToast("Failed to load more notifications", "error");
        } finally {
            setLoadingMore(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.uid) return;
        try {
            await markAllNotificationsRead(user.uid);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            showToast("All notifications marked as read", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to mark all as read", "error");
        }
    };

    const handleMarkSingleRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteSingle = async (id: string) => {
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showToast("Notification deleted", "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to delete notification", "error");
        }
    };

    const handleNotifClick = async (notif: FirestoreNotification & { id: string }) => {
        if (!notif.read) {
            await handleMarkSingleRead(notif.id);
        }

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

    // Client-side category filtering
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] pt-20 sm:pt-24 pb-12 sm:pb-20">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
                
                {/* Back Link */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-navy-900 dark:hover:text-gray-200 transition-colors font-black uppercase tracking-widest text-[10px] mb-8">
                    <ArrowLeft size={16} /> Back
                </button>

                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-gray-900 dark:text-white">Updates Feed</h1>
                        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Full Notifications History</p>
                    </div>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                        >
                            <Check size={14} className="stroke-[3]" />
                            <span>Mark all read</span>
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="rounded-2xl p-1.5 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800/60 flex gap-1 mb-6 shadow-sm overflow-x-auto no-scrollbar">
                    {(["all", "unread", "social", "system"] as const).map((tab) => {
                        const count = tab === "unread" 
                            ? notifications.filter(n => !n.read).length
                            : tab === "social" 
                            ? notifications.filter(n => ["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(n.type)).length
                            : tab === "system"
                            ? notifications.filter(n => !["comment", "reply", "reaction", "follow", "mention", "group_invite"].includes(n.type)).length
                            : notifications.length;

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === tab
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                }`}
                            >
                                <span className="capitalize">{tab}</span>
                                {count > 0 && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                                        activeTab === tab ? "bg-white text-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-xs uppercase font-bold tracking-widest text-gray-400">Loading your history...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800/80 p-12 text-center bg-white dark:bg-[#1a1b23]">
                        <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="text-md font-bold text-gray-900 dark:text-white mb-1">No notifications found</h3>
                        <p className="text-xs text-gray-400">Notifications in the "{activeTab}" category will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence initial={false}>
                            {filteredNotifications.map((notif) => {
                                const Icon = notifIcons[notif.type] || Bell;
                                const iconClass = notifColors[notif.type] || "text-gray-500 bg-gray-50 dark:bg-gray-800";
                                
                                return (
                                    <motion.div
                                        key={notif.id}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`group relative rounded-2xl border p-4.5 pr-12 pl-8 flex gap-4 transition-all duration-300 bg-white dark:bg-[#1a1b23] hover:shadow-md ${
                                            notif.read 
                                                ? "border-gray-100 dark:border-gray-800/40 opacity-75" 
                                                : "border-primary/20 dark:border-primary/10 shadow-sm bg-blue-50/5 dark:bg-blue-900/5"
                                        }`}
                                    >
                                        {/* Blue Dot on Left */}
                                        {!notif.read && (
                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}

                                        {/* Icon / Image */}
                                        <div className="flex-shrink-0">
                                            {(notif.senderAvatar || notif.senderPhotoURL) ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
                                                    <Image 
                                                        src={notif.senderAvatar || notif.senderPhotoURL!} 
                                                        alt={notif.senderName || "Sender"} 
                                                        width={40} 
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`}>
                                                    <Icon size={18} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow min-w-0 pr-8">
                                            <div onClick={() => handleNotifClick(notif)} className="cursor-pointer">
                                                {validityMap[notif.id] !== false ? (
                                                    <FormattedNotificationText notif={notif} isRead={notif.read} />
                                                ) : (
                                                    <p className="text-sm leading-normal font-medium text-gray-400 dark:text-gray-500 italic">
                                                        Content is not available
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                <span>{formatTime(notif.createdAt)}</span>
                                                {notif.read && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-gray-300 dark:text-gray-600">Read</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="absolute right-4.5 bottom-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.read && (
                                                <button
                                                    onClick={() => handleMarkSingleRead(notif.id)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} className="stroke-[2.5]" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteSingle(notif.id)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-all"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/40 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <span>Load older updates</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
