"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMessagingInstance } from "@/lib/firebase";

export interface ForegroundNotification {
    id: string;
    title: string;
    body: string;
    icon?: string;
    image?: string;
    targetUrl?: string;
    senderName?: string;
    senderPhotoURL?: string;
    type?: string;
    timestamp: number;
}

/**
 * Hook that listens for foreground FCM notifications.
 * Works in both regular browsers (via onMessage) and native Android WebView (via CustomEvent).
 *
 * Returns the current notification (if any) and a dismiss function.
 * Notifications auto-dismiss after `autoDismissMs` (default 6s).
 */
export function useForegroundNotification(autoDismissMs = 6000) {
    const [notifications, setNotifications] = useState<ForegroundNotification[]>([]);
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        const timer = timeoutsRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timeoutsRef.current.delete(id);
        }
    }, []);

    const addNotification = useCallback(
        (notif: ForegroundNotification) => {
            setNotifications((prev) => {
                // Prevent duplicates
                if (prev.some((n) => n.id === notif.id)) return prev;
                // Keep max 5 toast notifications
                const updated = [notif, ...prev].slice(0, 5);
                return updated;
            });

            // Auto-dismiss
            const timer = setTimeout(() => {
                dismiss(notif.id);
            }, autoDismissMs);
            timeoutsRef.current.set(notif.id, timer);
        },
        [autoDismissMs, dismiss]
    );

    useEffect(() => {
        // ── Browser FCM foreground listener ──
        let unsubscribe: (() => void) | null = null;

        async function setupOnMessage() {
            try {
                const messaging = getMessagingInstance();
                if (!messaging) return;

                const { onMessage } = await import("firebase/messaging");
                unsubscribe = onMessage(messaging, (payload) => {
                    console.log("[Foreground] FCM message received:", payload);

                    const data = payload.data || {};
                    const notification = payload.notification;

                    addNotification({
                        id: `fg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        title: data.title || notification?.title || "TTC NETWORK",
                        body: data.body || notification?.body || "You have a new update.",
                        icon: data.icon || data.senderPhotoURL || notification?.icon,
                        image: data.image || notification?.image,
                        targetUrl: data.targetUrl || data.click_action || "/news-feed",
                        senderName: data.senderName,
                        senderPhotoURL: data.senderPhotoURL || data.icon,
                        type: data.type,
                        timestamp: Date.now(),
                    });
                });
            } catch (e) {
                // onMessage not supported (e.g., in native WebView) — that's OK
                console.log("[Foreground] onMessage setup skipped:", e);
            }
        }

        setupOnMessage();

        // ── Native Android bridge listener ──
        // The native app dispatches 'ttc-native-notification' CustomEvents
        // when a push arrives while the app is in the foreground.
        const handleNativeNotification = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (!detail) return;

            addNotification({
                id: `native-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                title: detail.title || "TTC NETWORK",
                body: detail.body || "You have a new update.",
                icon: detail.icon,
                image: detail.image,
                targetUrl: detail.targetUrl || detail.click_action || "/news-feed",
                senderName: detail.senderName,
                senderPhotoURL: detail.senderPhotoURL || detail.icon,
                type: detail.type,
                timestamp: Date.now(),
            });
        };

        window.addEventListener("ttc-native-notification", handleNativeNotification);

        return () => {
            unsubscribe?.();
            window.removeEventListener("ttc-native-notification", handleNativeNotification);
            // Clear all timers
            timeoutsRef.current.forEach((timer) => clearTimeout(timer));
            timeoutsRef.current.clear();
        };
    }, [addNotification]);

    return { notifications, dismiss, addNotification };
}
