import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    firebase: any;
    importScripts: (...scripts: string[]) => void;
  }
}

declare const self: any;

// ── Native Background Push Notification Handler ────────────────────
// Ensures alerts appear on user's device even when the app is completely closed.
self.addEventListener("push", (event: any) => {
  let title = "TTC NETWORK";
  let body = "You have a new update.";
  let clickAction = "/news-feed";
  let icon = "/icon-192.png";
  let badge = "/icon-192.png";
  let image: string | undefined = undefined;
  let tag = "ttc-alert-" + Date.now();
  let actions: any[] = [{ action: "open_target", title: "View" }];

  if (event.data) {
    try {
      const payload = event.data.json();

      // Handles both Firebase Admin FCM payloads and standard WebPush payloads
      title =
        payload.notification?.title ||
        payload.data?.title ||
        payload.title ||
        title;

      body =
        payload.notification?.body ||
        payload.data?.body ||
        payload.body ||
        body;

      clickAction =
        payload.data?.click_action ||
        payload.data?.targetUrl ||
        payload.fcmOptions?.link ||
        payload.notification?.click_action ||
        clickAction;

      icon = payload.notification?.icon || payload.data?.icon || payload.data?.senderPhotoURL || icon;
      badge = payload.notification?.badge || payload.data?.badge || badge;
      image = payload.notification?.image || payload.data?.image || undefined;
      tag = payload.data?.tag || payload.notification?.tag || tag;
      if (Array.isArray(payload.notification?.actions) && payload.notification.actions.length > 0) {
        actions = payload.notification.actions;
      } else if (Array.isArray(payload.data?.actions) && payload.data.actions.length > 0) {
        actions = payload.data.actions;
      }
    } catch {
      try {
        const text = event.data.text();
        if (text) body = text;
      } catch (err) {
        console.warn("[SW] Could not parse push payload:", err);
      }
    }
  }

  // Guarantee absolute URLs so Android/Chrome never drops them
  const toAbsoluteUrl = (url?: string, defaultPath: string = "/icon-192.png") => {
    const p = url || defaultPath;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    return `${self.location.origin}${p.startsWith("/") ? "" : "/"}${p}`;
  };

  const notificationOptions: any = {
    body,
    icon: toAbsoluteUrl(icon, "/icon-192.png"),
    badge: toAbsoluteUrl(badge, "/icon-192.png"),
    data: {
      click_action: clickAction,
      targetUrl: clickAction,
    },
    vibrate: [200, 100, 200],
    tag,
    renotify: true,
    actions,
  };

  if (image) {
    notificationOptions.image = toAbsoluteUrl(image, "");
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// ── Notification Click Handler ──────────────────────────────────────
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const clickAction = event.notification.data?.click_action || event.notification.data?.targetUrl || "/news-feed";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any[]) => {
      // Focus existing window if available
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ("focus" in client) {
          if ("navigate" in client && clickAction !== "/") {
            client.navigate(clickAction);
          }
          return client.focus();
        }
      }
      // If app is closed, launch a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction);
      }
    })
  );
});

// ── Firebase Cloud Messaging Background Compat Handler ──────────────
try {
  self.importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
  self.importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDfq-EOAzmInRp4QT_gH9w2DK4l9KOFTBM",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ttc-connect-2273e.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ttc-connect-2273e",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ttc-connect-2273e.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "523150908585",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:523150908585:web:7605ff120912e66fde5db8",
  };

  if (firebaseConfig.apiKey && typeof self.firebase !== "undefined") {
    self.firebase.initializeApp(firebaseConfig);
    const messaging = self.firebase.messaging();

    messaging.onBackgroundMessage((payload: any) => {
      const notificationTitle = payload.data?.title || payload.notification?.title || "TTC NETWORK";
      const rawIcon = payload.data?.icon || payload.notification?.icon || payload.data?.senderPhotoURL || "/icon-192.png";
      const rawBadge = payload.data?.badge || payload.notification?.badge || "/icon-192.png";
      const toAbsolute = (url?: string) => (url && url.startsWith("http")) ? url : `${self.location.origin}${url?.startsWith("/") ? "" : "/"}${url || "icon-192.png"}`;

      const notificationOptions: any = {
        body: payload.data?.body || payload.notification?.body || "",
        icon: toAbsolute(rawIcon),
        badge: toAbsolute(rawBadge),
        actions: [{ action: "open_target", title: "View" }],
        data: {
          click_action: payload.data?.click_action || payload.data?.targetUrl || "/",
        },
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (err) {
  // Graceful fallback - native push listener already handles alerts
  console.log("[SW] FCM compat initialized with native fallback");
}

// ── Serwist PWA Caching & Offline Routing ────────────────────────────
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();

