import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { deleteUserEntirelyFromServer } from "@/lib/server-user-deletion";

interface DeleteAccountRequestBody {
    idToken?: string;
    userId?: string;
}

export async function POST(request: NextRequest) {
    try {
        if (!adminAuth || !adminDb) {
            return NextResponse.json(
                { error: "Server configuration error: Firebase Admin SDK is not initialized." },
                { status: 500 }
            );
        }

        let bodyData: DeleteAccountRequestBody = {};
        try {
            bodyData = (await request.json()) as DeleteAccountRequestBody;
        } catch {
            // body may be empty
        }

        // Authenticate caller: support Authorization Bearer token, body idToken, or session cookie
        let callerUid: string | null = null;

        const authHeader = request.headers.get("authorization");
        const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
        const idToken = tokenFromHeader || bodyData?.idToken;

        if (idToken) {
            try {
                const decoded = await adminAuth.verifyIdToken(idToken, true);
                callerUid = decoded.uid;
            } catch (err: unknown) {
                const e = err as Error;
                console.warn("[delete-account API] ID token verification failed:", e?.message);
            }
        }

        // Fallback to session cookie
        if (!callerUid) {
            const sessionCookie = request.cookies.get("ttc_session")?.value;
            if (sessionCookie) {
                try {
                    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
                    callerUid = decoded.uid;
                } catch (err: unknown) {
                    const e = err as Error;
                    console.warn("[delete-account API] Session cookie verification failed:", e?.message);
                }
            }
        }

        if (!callerUid) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid or expired authentication credentials. Please sign in again." },
                { status: 401 }
            );
        }

        // Safety verification: caller can only delete their own account
        const targetUserId = bodyData?.userId;
        if (targetUserId && targetUserId !== callerUid) {
            return NextResponse.json(
                { error: "Forbidden: You are only permitted to delete your own account." },
                { status: 403 }
            );
        }

        const userIdToDelete = callerUid;

        // Execute comprehensive server-side deletion
        await deleteUserEntirelyFromServer(userIdToDelete, true);

        // Build response and clear session cookies
        const response = NextResponse.json({
            success: true,
            message: "Your account and all associated data have been permanently deleted from the server.",
        });

        response.cookies.set("ttc_session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        response.cookies.set("ttc_role", "", {
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch (error: unknown) {
        const e = error as Error;
        console.error("[delete-account API] Account deletion failed:", error);
        return NextResponse.json(
            { error: e?.message || "Failed to delete account from server." },
            { status: 500 }
        );
    }
}
