import { NextResponse } from "next/server";

export async function GET() {
    const swCode = `
        importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
        importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

        const firebaseConfig = {
            apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}",
            authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}",
            projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}",
            storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}",
            messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
            appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}"
        };

        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Received background message ', payload);
            const notificationTitle = payload.data?.title || payload.notification?.title || 'TTC Network';
            const notificationOptions = {
                body: payload.data?.body || payload.notification?.body || '',
                icon: '/icon.png',
                badge: '/icon.png',
                data: {
                    click_action: payload.data?.click_action || '/'
                }
            };
            self.registration.showNotification(notificationTitle, notificationOptions);
        });

        self.addEventListener('notificationclick', (event) => {
            event.notification.close();
            const clickAction = event.notification.data?.click_action || '/';
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                    for (let i = 0; i < windowClients.length; i++) {
                        const client = windowClients[i];
                        if (client.url.includes(clickAction) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow(clickAction);
                    }
                })
            );
        });
    `;

    return new Response(swCode, {
        headers: {
            "Content-Type": "application/javascript",
            "Service-Worker-Allowed": "/"
        }
    });
}
