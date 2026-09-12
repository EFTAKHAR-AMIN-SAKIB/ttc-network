import { getMessagingInstance } from "./firebase";
import { getToken } from "firebase/messaging";
import { registerFCMToken } from "./firestore";

export const FIREBASE_VAPID_KEY =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    "BNS7wp8fO1t57Ogvv3MV66_8WcSnVzKCoWwcTRG-BAAPCFcE13sdDpxS9m2UrGzk2YJWsydrj8vXhninTe6ooyI";

/**
 * Detect if we're running inside the TTC Network Android WebView wrapper.
 * The native app appends 'TTCNetworkApp' to the User-Agent string.
 */
function isNativeAndroidApp(): boolean {
    if (typeof window === "undefined" || !navigator?.userAgent) return false;
    return navigator.userAgent.includes("TTCNetworkApp");
}

/**
 * Retrieve the native FCM token from the Android WebView bridge.
 * Returns null if not running in the native app or if no token is available.
 */
function getNativeToken(): string | null {
    try {
        if (typeof window !== "undefined") {
            const injectedToken = (window as any).__ttcNativeFcmToken;
            if (injectedToken && injectedToken.length > 0) return injectedToken;

            if ((window as any).TTCNative) {
                const token = (window as any).TTCNative.getFCMToken();
                return token && token.length > 0 ? token : null;
            }
        }
    } catch (e) {
        console.warn("[FCM] Could not get native token:", e);
    }
    return null;
}

/**
 * Registers the service worker, checks notification permission,
 * retrieves the client's FCM token, and saves it to Firestore.
 */
export async function setupFCM(uid: string, requestPermissionIfNeeded: boolean = false): Promise<string | null> {
    if (typeof window === "undefined") return null;

    // ─── Native Android WebView path ───
    // WebView doesn't support Web Push API (PushManager), so we use
    // the native FCM token provided by the Android wrapper via JS bridge.
    if (isNativeAndroidApp()) {
        console.log("[FCM] Native Android app detected — using native FCM token bridge.");
        const nativeToken = getNativeToken();
        if (nativeToken) {
            console.log("[FCM] Native token obtained:", nativeToken.substring(0, 15) + "...");
            await registerFCMToken(uid, nativeToken);
            // Also tell the native side to register the token server-side
            try {
                (window as any).TTCNative?.registerToken(uid);
            } catch (e) {
                console.warn("[FCM] Native registerToken call failed:", e);
            }
            return nativeToken;
        } else {
            console.warn("[FCM] Native app detected but no FCM token available yet.");
            // Listen for token ready event from native injection
            return new Promise<string | null>((resolve) => {
                const handler = () => {
                    window.removeEventListener("ttc-native-fcm-ready", handler);
                    const token = getNativeToken();
                    if (token) {
                        registerFCMToken(uid, token).then(() => resolve(token));
                        try { (window as any).TTCNative?.registerToken(uid); } catch (_) {}
                    } else {
                        resolve(null);
                    }
                };
                window.addEventListener("ttc-native-fcm-ready", handler);
                // Timeout after 5 seconds
                setTimeout(() => {
                    window.removeEventListener("ttc-native-fcm-ready", handler);
                    resolve(null);
                }, 5000);
            });
        }
    }

    // ─── Standard Web Push path (browsers) ───
    if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
    ) {
        console.warn("[FCM] Push notifications not supported in this browser environment.");
        return null;
    }

    try {
        // 1. Get or register the service worker (/sw.js)
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
        const activeRegistration = await navigator.serviceWorker.ready;
        const targetRegistration = activeRegistration || registration;

        // Ensure service worker is fully activated
        if (targetRegistration.installing || targetRegistration.waiting) {
            console.log("[FCM] Waiting for service worker activation...");
            await new Promise<void>((resolve) => {
                const sw = targetRegistration.installing || targetRegistration.waiting;
                if (!sw) {
                    resolve();
                    return;
                }
                sw.addEventListener("statechange", () => {
                    if (sw.state === "activated") resolve();
                });
                setTimeout(resolve, 1500);
            });
        }

        // Clear any stale push subscription from previous sessions/keys
        if (targetRegistration && targetRegistration.pushManager) {
            try {
                const existingSub = await targetRegistration.pushManager.getSubscription();
                if (existingSub) {
                    console.log("[FCM] Clearing stale push subscription to refresh registration...");
                    await existingSub.unsubscribe();
                }
            } catch (unsubErr) {
                console.warn("[FCM] Could not unsubscribe stale subscription:", unsubErr);
            }
        }

        // 2. Request Notification Permission only if explicitly prompted or already granted
        let permission = Notification.permission;
        if (permission === "default" && requestPermissionIfNeeded) {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
            console.log("[FCM] Notification permission status:", permission);
            return null;
        }

        // 3. Get FCM Token with robust fallback
        const messaging = getMessagingInstance();
        if (!messaging) {
            console.warn("[FCM] Messaging instance could not be initialized.");
            return null;
        }

        let token: string | null = null;
        let lastError: any = null;

        // Try with service worker registration first
        if (targetRegistration) {
            try {
                token = await getToken(messaging, {
                    serviceWorkerRegistration: targetRegistration,
                    vapidKey: FIREBASE_VAPID_KEY,
                });
            } catch (swErr: any) {
                console.warn("[FCM] getToken with serviceWorkerRegistration failed, trying fallback:", swErr);
                lastError = swErr;
            }
        }

        // Fallback: try default without passing serviceWorkerRegistration
        if (!token) {
            try {
                token = await getToken(messaging, {
                    vapidKey: FIREBASE_VAPID_KEY,
                });
            } catch (defaultErr: any) {
                console.error("[FCM] default getToken failed:", defaultErr);
                lastError = defaultErr;
            }
        }

        if (token) {
            console.log("[FCM] Client FCM Token obtained successfully:", token.substring(0, 15) + "...");
            await registerFCMToken(uid, token);
            return token;
        } else {
            console.warn("[FCM] No registration token available:", lastError);
            const errStr = String(lastError?.message || "");
            if (errStr.includes("push service error")) {
                throw new Error("Push service error: If using Brave browser, enable 'Google services for push messaging' in Brave Settings. If on Xiaomi/MIUI, check Battery Saver settings.");
            }
            throw new Error(lastError?.message || "Failed to generate FCM token from browser");
        }
    } catch (err: any) {
        console.error("[FCM] Error setting up FCM:", err);
        const errStr = String(err?.message || "");
        if (errStr.includes("push service error")) {
            throw new Error("Push service error: If using Brave, enable 'Google services for push messaging' in Brave Settings. If on Xiaomi, check Battery Saver.");
        }
        throw err;
    }
}

/**
 * Triggered from a user action (e.g. clicking Enable Notifications button)
 */
export async function enablePushNotifications(uid: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (typeof window === "undefined") {
        return { success: false, error: "Push notifications are not supported by this browser." };
    }

    // For native Android app, skip web-specific checks
    if (isNativeAndroidApp()) {
        try {
            const token = await setupFCM(uid, false);
            if (!token) {
                return { success: false, error: "Failed to get native device token. Please restart the app." };
            }
            return { success: true, token };
        } catch (err: any) {
            return { success: false, error: err.message || "Failed to enable native notifications" };
        }
    }

    if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
    ) {
        return { success: false, error: "Push notifications are not supported by this browser." };
    }

    try {
        let permission = Notification.permission;
        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission === "denied") {
            return { success: false, error: "Notifications are blocked in your browser settings. Please allow them to continue." };
        }

        if (permission !== "granted") {
            return { success: false, error: "Notification permission was not granted." };
        }

        const token = await setupFCM(uid, false);
        if (!token) {
            return { success: false, error: "Failed to generate device token. Please refresh and try again." };
        }

        return { success: true, token };
    } catch (err: any) {
        console.error("[FCM] Error enabling push notifications:", err);
        return { success: false, error: err.message || "Failed to enable notifications" };
    }
}

/**
 * Send a test background push notification to the current user
 */
export async function sendTestPushNotification(uid: string): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Ensure token is registered for this device first!
        let token: string | null = null;
        try {
            token = await setupFCM(uid, false);
        } catch (e: any) {
            return {
                success: false,
                message: "Could not generate device token: " + (e.message || "Unknown error"),
            };
        }

        if (!token) {
            return {
                success: false,
                message: "Could not register push token for this device. Please verify notification permissions.",
            };
        }

        // 2. Dispatch test push notification
        const res = await fetch("/api/send-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipientId: uid,
                title: "TTC NETWORK",
                body: "🎉 Background push notifications are working! Alerts will appear even when the app is closed.",
                targetUrl: "/news-feed",
                actionTitle: "Explore Feed",
                tag: "ttc-test-alert",
            }),
        });
        const data = await res.json();
        if (res.ok && data.successCount > 0) {
            return { success: true, message: "Test notification sent! Check your notification bar." };
        }
        return {
            success: false,
            message: data.message || "Failed to send test push. Make sure notifications are enabled.",
        };
    } catch (err: any) {
        return { success: false, message: err.message || "Network error" };
    }
}
