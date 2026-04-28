/**
 * Session API Route — Server-Signed Session Cookie
 * ==================================================
 * Creates and verifies Firebase session cookies using the Admin SDK.
 * This replaces the old client-forged JSON cookie approach.
 *
 * POST /api/session — Create a session from a Firebase ID token
 * DELETE /api/session — Destroy the session (logout)
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const SESSION_COOKIE_NAME = "ttc_session";
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(request: NextRequest) {
    try {
        if (!adminAuth) {
            return NextResponse.json(
                { error: "Admin SDK not configured" },
                { status: 500 }
            );
        }

        const { idToken } = await request.json();

        if (!idToken || typeof idToken !== "string") {
            return NextResponse.json(
                { error: "ID token is required" },
                { status: 400 }
            );
        }

        // Verify the ID token is valid and recent (max 5 minutes old)
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);

        // Only create session if the token was issued recently (within 5 minutes)
        const tokenAge = Date.now() - decodedToken.auth_time * 1000;
        if (tokenAge > 5 * 60 * 1000) {
            return NextResponse.json(
                { error: "Token is too old. Please sign in again." },
                { status: 401 }
            );
        }

        // Create a server-signed session cookie
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn: SESSION_EXPIRY_MS,
        });

        // Fetch the user's role from Firestore for the response
        let role = "student";
        let collegeId = "";
        if (adminDb) {
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                role = data?.role || "student";
                collegeId = data?.collegeId || "";
            }
        }

        // Build the response with the session cookie set as HttpOnly
        const response = NextResponse.json({
            success: true,
            role,
            collegeId,
        });

        response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_EXPIRY_MS / 1000, // seconds
        });

        return response;
    } catch (error: any) {
        console.error("[Session API] Error creating session:", error?.code || error?.message);
        return NextResponse.json(
            { error: "Failed to create session" },
            { status: 401 }
        );
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    return response;
}
