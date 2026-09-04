import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, adminDb } from "@/lib/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

export async function POST(req: NextRequest) {
    try {
        const { recipientId, title, body, targetUrl } = await req.json();
        
        if (!recipientId || !title || !body) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!isAdminConfigured || !adminDb) {
            console.warn("[Push Notification API] Firebase Admin SDK is not configured. Push skipped.");
            return NextResponse.json({ message: "Admin SDK not configured, push skipped" }, { status: 200 });
        }

        // Fetch user's registered FCM tokens from Firestore
        const userDoc = await adminDb.collection("users").doc(recipientId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ message: "User not found, push skipped" }, { status: 200 });
        }

        const userData = userDoc.data();
        const fcmTokens: string[] = userData?.fcmTokens || [];

        if (fcmTokens.length === 0) {
            return NextResponse.json({ message: "No registered tokens found, push skipped" }, { status: 200 });
        }

        // Construct multicast message payload
        const clickUrl = targetUrl || "/news-feed";
        const message = {
            tokens: fcmTokens,
            notification: {
                title,
                body,
            },
            data: {
                click_action: clickUrl,
                title: String(title),
                body: String(body),
                targetUrl: clickUrl,
            },
            webpush: {
                headers: {
                    Urgency: "high",
                    TTL: "86400",
                },
                notification: {
                    title,
                    body,
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    tag: `ttc-${Date.now()}`,
                    renotify: true,
                    data: {
                        click_action: clickUrl,
                    },
                },
                fcmOptions: {
                    link: clickUrl,
                },
            },
        };

        // Send push notifications via Firebase Admin Messaging SDK
        const response = await getMessaging().sendEachForMulticast(message);
        
        // Cleanup expired or invalid tokens from user's document
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code;
                    // Token is expired, unregistered, or invalid
                    if (
                        errCode === "messaging/invalid-registration-token" ||
                        errCode === "messaging/registration-token-not-registered"
                    ) {
                        invalidTokens.push(fcmTokens[idx]);
                    }
                }
            });

            if (invalidTokens.length > 0) {
                const updatedTokens = fcmTokens.filter(t => !invalidTokens.includes(t));
                await adminDb.collection("users").doc(recipientId).update({
                    fcmTokens: updatedTokens
                });
                console.log(`[Push Notification API] Cleaned up ${invalidTokens.length} expired FCM tokens.`);
            }
        }

        if (response.successCount === 0 && response.failureCount > 0) {
            const firstError = response.responses.find(r => !r.success)?.error?.message || "Delivery failed";
            return NextResponse.json({
                message: `Failed to deliver push: ${firstError}`,
                successCount: 0,
                failureCount: response.failureCount
            }, { status: 200 });
        }

        return NextResponse.json({
            message: "Push notifications processed",
            successCount: response.successCount,
            failureCount: response.failureCount
        }, { status: 200 });

    } catch (err: any) {
        console.error("[Push Notification API] Error sending push:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
