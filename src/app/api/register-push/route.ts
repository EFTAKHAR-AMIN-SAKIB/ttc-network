import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { uid, token } = await req.json();

        if (!uid || !token) {
            return NextResponse.json({ error: "Missing uid or token" }, { status: 400 });
        }

        if (!isAdminConfigured || !adminDb) {
            console.warn("[Register Push API] Firebase Admin SDK is not configured.");
            return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
        }

        // Ensure user document exists or update fcmTokens with arrayUnion
        const userRef = adminDb.collection("users").doc(uid);
        await userRef.set({
            fcmTokens: FieldValue.arrayUnion(token)
        }, { merge: true });

        console.log(`[Register Push API] FCM token registered successfully for user: ${uid}`);
        return NextResponse.json({
            success: true,
            message: "FCM token registered successfully"
        }, { status: 200 });

    } catch (err: any) {
        console.error("[Register Push API] Error registering FCM token:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
