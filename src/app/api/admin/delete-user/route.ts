import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { deleteUserEntirelyFromServer } from "@/lib/server-user-deletion";

export async function POST(request: NextRequest) {
    try {
        // ── Auth check: require valid admin session ─────────────
        const sessionCookie = request.cookies.get("ttc_session")?.value;
        if (!sessionCookie || !adminAuth || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch {
            return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
        }

        // Verify role (strictly admin)
        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!callerDoc.exists) {
            return NextResponse.json({ error: "Caller user not found" }, { status: 404 });
        }

        const callerRole = callerDoc.data()?.role;
        if (callerRole !== "admin") {
            return NextResponse.json({ error: "Forbidden: Only admins can delete users" }, { status: 403 });
        }

        const { userId, deleteData } = await request.json();
        if (!userId || typeof userId !== "string") {
            return NextResponse.json({ error: "No userId provided" }, { status: 400 });
        }

        // Execute unified server-side deletion
        await deleteUserEntirelyFromServer(userId, deleteData !== false);

        return NextResponse.json({ success: true, message: "User entirely deleted from server." });
    } catch (error) {
        console.error("[DeleteUser API]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Deletion failed" },
            { status: 500 },
        );
    }
}
