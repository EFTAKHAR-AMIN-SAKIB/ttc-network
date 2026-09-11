import { NextResponse } from "next/server";

export async function GET() {
    const swCode = `
        // Native Push Handler
        self.addEventListener("push", (event) => {
            let title = "TTC NETWORK";
            let body = "You have a new update.";
            let clickAction = "/news-feed";
            let icon = "/icon-192.png";
            let badge = "/icon-192.png";
            let image = undefined;
            let tag = "ttc-alert-" + Date.now();
            let actions = [{ action: "open_target", title: "View" }];

            if (event.data) {
                try {
                    const payload = event.data.json();
                    title = payload.notification?.title || payload.data?.title || payload.title || title;
                    body = payload.notification?.body || payload.data?.body || payload.body || body;
                    clickAction = payload.data?.click_action || payload.data?.targetUrl || payload.fcmOptions?.link || payload.notification?.click_action || clickAction;
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
                    } catch (e) {}
                }
            }

            const toAbsoluteUrl = (url, defaultPath = "/icon-192.png") => {
                const p = url || defaultPath;
                if (p.startsWith("http://") || p.startsWith("https://")) return p;
                return self.location.origin + (p.startsWith("/") ? "" : "/") + p;
            };

            const options = {
                body,
                icon: toAbsoluteUrl(icon, "/icon-192.png"),
                badge: toAbsoluteUrl(badge, "/icon-192.png"),
                data: { click_action: clickAction, targetUrl: clickAction },
                vibrate: [200, 100, 200],
                tag,
                renotify: true,
                actions
            };

            if (image) {
                options.image = toAbsoluteUrl(image, "");
            }

            event.waitUntil(self.registration.showNotification(title, options));
        });

        self.addEventListener('notificationclick', (event) => {
            event.notification.close();
            if (event.action === "dismiss") return;

            const clickAction = event.notification.data?.click_action || event.notification.data?.targetUrl || '/news-feed';
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                    for (let i = 0; i < windowClients.length; i++) {
                        const client = windowClients[i];
                        if ('focus' in client) {
                            if ('navigate' in client && clickAction !== '/') {
                                client.navigate(clickAction);
                            }
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow(clickAction);
                    }
                })
            );
        });

        try {
            importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
            importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

            const firebaseConfig = {
                apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDfq-EOAzmInRp4QT_gH9w2DK4l9KOFTBM'}",
                authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ttc-connect-2273e.firebaseapp.com'}",
                projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ttc-connect-2273e'}",
                storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ttc-connect-2273e.firebasestorage.app'}",
                messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '523150908585'}",
                appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:523150908585:web:7605ff120912e66fde5db8'}"
            };

            firebase.initializeApp(firebaseConfig);
            const messaging = firebase.messaging();

            messaging.onBackgroundMessage((payload) => {
                const notificationTitle = payload.data?.title || payload.notification?.title || 'TTC NETWORK';
                const rawIcon = payload.data?.icon || payload.notification?.icon || payload.data?.senderPhotoURL || '/icon-192.png';
                const rawBadge = payload.data?.badge || payload.notification?.badge || '/icon-192.png';
                const toAbsolute = (url) => (url && url.startsWith('http')) ? url : self.location.origin + (url && url.startsWith('/') ? '' : '/') + (url || 'icon-192.png');

                const notificationOptions = {
                    body: payload.data?.body || payload.notification?.body || '',
                    icon: toAbsolute(rawIcon),
                    badge: toAbsolute(rawBadge),
                    actions: [{ action: 'open_target', title: 'View' }],
                    data: {
                        click_action: payload.data?.click_action || payload.data?.targetUrl || '/news-feed'
                    }
                };
                self.registration.showNotification(notificationTitle, notificationOptions);
            });
        } catch (err) {
            console.log('[SW] Firebase compat fallback active');
        }
    `;

    return new Response(swCode, {
        headers: {
            "Content-Type": "application/javascript",
            "Service-Worker-Allowed": "/"
        }
    });
}
