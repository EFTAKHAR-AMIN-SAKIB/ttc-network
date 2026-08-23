/**
 * Story Counter API
 * ==================
 * Server-side endpoint to atomically allocate the next story number.
 * Uses Firebase Admin SDK (bypasses Firestore security rules).
 * 
 * POST /api/story-counter → { storyNumber: 1 }
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });
        }

        // Verify authentication via session cookie
        const sessionCookie = req.cookies.get("ttc_session")?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        try {
            await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Atomically increment the counter using Admin SDK (bypasses security rules)
        const counterRef = adminDb.collection("counters").doc("stories");
        
        const storyNumber = await adminDb.runTransaction(async (transaction) => {
            const counterSnap = await transaction.get(counterRef);
            let current = 1;
            if (counterSnap.exists) {
                current = (counterSnap.data()?.next as number) || 1;
            }
            transaction.set(counterRef, { next: current + 1 }, { merge: true });
            return current;
        });

        return NextResponse.json({ storyNumber });
    } catch (err: any) {
        console.error("[story-counter] Error:", err);
        return NextResponse.json({ error: err?.message || "Counter failed" }, { status: 500 });
    }
}
