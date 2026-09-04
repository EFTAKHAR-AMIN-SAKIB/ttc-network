import { getMessagingInstance } from "./firebase";
import { getToken } from "firebase/messaging";
import { registerFCMToken } from "./firestore";

export const FIREBASE_VAPID_KEY =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    "BNS7wp8fO1t57Ogw3MV66_8WcSnVzKCoWwcTRG-BAAPCFcE13sdDpxS9m2UrGzk2YJWsydrj8vXhninTe6ooyl";

/**
 * Registers the service worker, checks notification permission,
 * retrieves the client's FCM token, and saves it to Firestore.
 */
export async function setupFCM(uid: string, requestPermissionIfNeeded: boolean = false): Promise<string | null> {
    if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
    ) {
        console.warn("[FCM] Push notifications not supported in this browser environment.");
        return null;
    }

    try {
        // 1. Get or register the service worker (/sw.js)
        let registration = await navigator.serviceWorker.getRegistration("/");
        if (!registration) {
            registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
        await navigator.serviceWorker.ready;

        // 2. Request Notification Permission only if explicitly prompted or already granted
        let permission = Notification.permission;
        if (permission === "default" && requestPermissionIfNeeded) {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
            console.log("[FCM] Notification permission status:", permission);
            return null;
        }

        // 3. Get FCM Token
        const messaging = getMessagingInstance();
        if (!messaging) {
            console.warn("[FCM] Messaging instance could not be initialized.");
            return null;
        }

        const token = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: FIREBASE_VAPID_KEY,
        });

        if (token) {
            console.log("[FCM] Client FCM Token obtained successfully.");
            await registerFCMToken(uid, token);
            return token;
        } else {
            console.warn("[FCM] No registration token available.");
            return null;
        }
    } catch (err) {
        console.error("[FCM] Error setting up FCM:", err);
        return null;
    }
}

/**
 * Triggered from a user action (e.g. clicking Enable Notifications button)
 */
export async function enablePushNotifications(uid: string): Promise<boolean> {
    const token = await setupFCM(uid, true);
    return !!token;
}

/**
 * Send a test background push notification to the current user
 */
export async function sendTestPushNotification(uid: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await fetch("/api/send-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipientId: uid,
                title: "TTC NETWORK",
                body: "🎉 Background push notifications are working! Alerts will appear even when the app is closed.",
                targetUrl: "/news-feed",
            }),
        });
        const data = await res.json();
        if (res.ok && data.successCount > 0) {
            return { success: true, message: "Test notification sent! Check your screen." };
        }
        return {
            success: false,
            message: data.message || "Failed to send test push. Make sure notifications are enabled.",
        };
    } catch (err: any) {
        return { success: false, message: err.message || "Network error" };
    }
}
