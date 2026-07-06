import { getMessagingInstance } from "./firebase";
import { getToken } from "firebase/messaging";
import { registerFCMToken } from "./firestore";

/**
 * Registers the service worker, requests notification permission,
 * retrieves the client's FCM token, and saves it to Firestore.
 */
export async function setupFCM(uid: string): Promise<void> {
    if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
    ) {
        return;
    }

    try {
        // 1. Register service worker at custom dynamic route path
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
            scope: "/"
        });
        console.log("[FCM] Service Worker registered with scope:", registration.scope);

        // 2. Request Notification Permission if not already granted/denied
        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                console.warn("[FCM] Notification permission denied by user.");
                return;
            }
        } else if (Notification.permission === "denied") {
            console.warn("[FCM] Notifications are blocked. Enable them in browser settings.");
            return;
        }

        // 3. Get FCM Token
        const messaging = getMessagingInstance();
        if (!messaging) {
            console.warn("[FCM] Messaging instance could not be initialized.");
            return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.warn("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not defined in environment variables.");
            return;
        }

        const token = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey,
        });

        if (token) {
            console.log("[FCM] Client FCM Token obtained.");
            await registerFCMToken(uid, token);
        } else {
            console.warn("[FCM] No registration token available.");
        }
    } catch (err) {
        console.error("[FCM] Error setting up FCM:", err);
    }
}
