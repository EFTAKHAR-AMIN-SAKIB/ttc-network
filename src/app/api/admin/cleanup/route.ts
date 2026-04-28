import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
    // ── Auth check: require valid admin session ─────────────
    const sessionCookie = request.cookies.get("ttc_session")?.value;
    if (!sessionCookie || !adminAuth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    if (!adminDb) return NextResponse.json({ error: "No DB" }, { status: 500 });

    // Verify admin/manager role
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const role = userDoc.data()?.role;
    if (role !== "admin" && role !== "manager" && role !== "super_manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const commentsSnap = await adminDb.collection("comments").get();
        let deleted = 0;
        
        for (const doc of commentsSnap.docs) {
            const comment = doc.data();
            const postId = comment.postId;
            
            if (postId) {
                // Check if post exists in posts, stories, or studyPosts
                const postSnap = await adminDb.collection("posts").doc(postId).get();
                const storySnap = await adminDb.collection("stories").doc(postId).get();
                const studySnap = await adminDb.collection("studyPosts").doc(postId).get();
                
                if (!postSnap.exists && !storySnap.exists && !studySnap.exists) {
                    await adminDb.collection("comments").doc(doc.id).delete();
                    deleted++;
                }
            } else {
                // Invalid comment without postId
                await adminDb.collection("comments").doc(doc.id).delete();
                deleted++;
            }
        }
        
        return NextResponse.json({ message: `Cleanup complete. Deleted ${deleted} orphaned comments.` });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
