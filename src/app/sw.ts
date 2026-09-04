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

// ── Firebase Cloud Messaging Background Handler ─────────────────────
try {
  self.importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
  self.importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  if (firebaseConfig.apiKey && typeof self.firebase !== "undefined") {
    self.firebase.initializeApp(firebaseConfig);
    const messaging = self.firebase.messaging();

    messaging.onBackgroundMessage((payload: any) => {
      const notificationTitle = payload.data?.title || payload.notification?.title || "TTC NETWORK";
      const notificationOptions = {
        body: payload.data?.body || payload.notification?.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          click_action: payload.data?.click_action || "/",
        },
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (err) {
  console.warn("[SW] FCM background messaging initialization:", err);
}

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any[]) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(clickAction) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction);
      }
    })
  );
});

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

