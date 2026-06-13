import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

// ── R2 ────────────────────────────────────────────
const R2 = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET_NAME || "",
};

let _s3: S3Client | null = null;
function getS3(): S3Client {
    if (_s3) return _s3;
    _s3 = new S3Client({
        region: "auto",
        endpoint: R2.endpoint,
        credentials: {
            accessKeyId: R2.accessKeyId,
            secretAccessKey: R2.secretAccessKey,
        },
        forcePathStyle: true,
    });
    return _s3;
}

const STUDY_R2 = {
    accessKeyId: process.env.STUDY_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.STUDY_R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.STUDY_R2_ENDPOINT || "",
    bucket: process.env.STUDY_R2_BUCKET_NAME || "",
    publicUrl: process.env.STUDY_R2_PUBLIC_URL || "",
};

let _studyS3: S3Client | null = null;
function getStudyS3(): S3Client {
    if (_studyS3) return _studyS3;
    
    let endpoint = STUDY_R2.endpoint;
    try {
        const urlObj = new URL(endpoint);
        endpoint = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
        // use as is
    }

    _studyS3 = new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
            accessKeyId: STUDY_R2.accessKeyId,
            secretAccessKey: STUDY_R2.secretAccessKey,
        },
        forcePathStyle: true,
    });
    return _studyS3;
}

// ── Cloudinary (legacy) ───────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractCloudinaryId(url: string): string | null {
    try {
        const match = new URL(url).pathname.match(/\/image\/upload\/v\d+\/(.+)$/);
        if (!match) return null;
        const p = match[1];
        const dot = p.lastIndexOf(".");
        return dot > 0 ? p.substring(0, dot) : p;
    } catch {
        return null;
    }
}

async function deleteFileFromStorage(url: string) {
    if (!url || typeof url !== "string") return;
    try {
        // ─── R2 URL ──────────────────────────────
        if (url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com")) {
            const key = new URL(url).pathname.replace(/^\//, "");
            if (!key) return;

            const isStudyFile = STUDY_R2.publicUrl && url.includes(new URL(STUDY_R2.publicUrl).hostname);

            if (isStudyFile) {
                await getStudyS3().send(new DeleteObjectCommand({
                    Bucket: STUDY_R2.bucket,
                    Key: key,
                }));
            } else {
                await getS3().send(new DeleteObjectCommand({
                    Bucket: R2.bucket,
                    Key: key,
                }));
            }
        }
        // ─── Cloudinary URL ──────────────────────
        else if (url.includes("cloudinary.com")) {
            const publicId = extractCloudinaryId(url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, { invalidate: true });
            }
        }
    } catch (err) {
        console.error("[DeleteUser API] Failed to delete file:", url, err);
    }
}

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

        const targetUserRef = adminDb.collection("users").doc(userId);
        const targetUserDoc = await targetUserRef.get();
        const userData = targetUserDoc.exists ? targetUserDoc.data() : null;

        // 1. Clean up follow relationships
        // 1a. Clean up followers (people following the deleted user U)
        const followersCol = targetUserRef.collection("followers");
        const followersSnap = await followersCol.get();
        for (const docSnap of followersSnap.docs) {
            const followerId = docSnap.id;
            await adminDb.collection("users").doc(followerId).collection("following").doc(userId).delete();
            await adminDb.collection("users").doc(followerId).update({
                followingCount: FieldValue.increment(-1)
            });
        }

        // 1b. Clean up following (people the deleted user U is following)
        const followingCol = targetUserRef.collection("following");
        const followingSnap = await followingCol.get();
        for (const docSnap of followingSnap.docs) {
            const followedId = docSnap.id;
            await adminDb.collection("users").doc(followedId).collection("followers").doc(userId).delete();
            await adminDb.collection("users").doc(followedId).update({
                followersCount: FieldValue.increment(-1)
            });
        }

        // 2. Delete subcollections under the deleted user document
        const subcollections = ["followers", "following", "savedPosts", "savedStories", "savedNotices", "savedStudyPosts"];
        for (const subName of subcollections) {
            const subCol = targetUserRef.collection(subName);
            const subSnap = await subCol.get();
            const batch = adminDb.batch();
            subSnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 3. Delete user files (profile photo, cover photo)
        if (userData) {
            if (userData.photoURL) await deleteFileFromStorage(userData.photoURL);
            if (userData.coverUrl) await deleteFileFromStorage(userData.coverUrl);
        }

        // 4. Delete user-associated data if deleteData is true
        if (deleteData) {
            // A. Posts created by user
            const postsSnap = await adminDb.collection("posts").where("creatorId", "==", userId).get();
            for (const postDoc of postsSnap.docs) {
                const post = postDoc.data();
                if (post.thumbnailUrl) {
                    await deleteFileFromStorage(post.thumbnailUrl);
                }
                // Delete comments on this post
                const postComments = await adminDb.collection("comments").where("postId", "==", postDoc.id).get();
                const commentBatch = adminDb.batch();
                postComments.docs.forEach(c => commentBatch.delete(c.ref));
                await commentBatch.commit();

                // Delete post document
                await postDoc.ref.delete();
            }

            // B. Stories created by user
            const storiesSnap = await adminDb.collection("stories").where("authorId", "==", userId).get();
            for (const storyDoc of storiesSnap.docs) {
                const story = storyDoc.data();
                if (story.thumbnailUrl) {
                    await deleteFileFromStorage(story.thumbnailUrl);
                }
                // Delete comments on this story
                const storyComments = await adminDb.collection("comments").where("postId", "==", storyDoc.id).get();
                const commentBatch = adminDb.batch();
                storyComments.docs.forEach(c => commentBatch.delete(c.ref));
                await commentBatch.commit();

                // Delete story document
                await storyDoc.ref.delete();
            }

            // C. Notices created by user
            const noticesSnap = await adminDb.collection("notices").where("authorId", "==", userId).get();
            for (const noticeDoc of noticesSnap.docs) {
                const notice = noticeDoc.data();
                if (notice.thumbnailUrl) {
                    await deleteFileFromStorage(notice.thumbnailUrl);
                }
                // Delete notice document
                await noticeDoc.ref.delete();
            }

            // D. Study posts created by user
            const studySnap = await adminDb.collection("studyPosts").where("authorId", "==", userId).get();
            for (const studyDoc of studySnap.docs) {
                const study = studyDoc.data();
                if (study.thumbnailUrl) {
                    await deleteFileFromStorage(study.thumbnailUrl);
                }
                if (study.fileUrl) {
                    await deleteFileFromStorage(study.fileUrl);
                }
                // Delete comments on this study post
                const studyComments = await adminDb.collection("comments").where("postId", "==", studyDoc.id).get();
                const commentBatch = adminDb.batch();
                studyComments.docs.forEach(c => commentBatch.delete(c.ref));
                await commentBatch.commit();

                // Delete study post document
                await studyDoc.ref.delete();
            }

            // E. Gifts sent by user
            const giftsSnap = await adminDb.collection("gifts").where("userId", "==", userId).get();
            const giftBatch = adminDb.batch();
            giftsSnap.docs.forEach(g => giftBatch.delete(g.ref));
            await giftBatch.commit();

            // F. Comments created by user
            const commentsSnap = await adminDb.collection("comments").where("userId", "==", userId).get();
            const commentBatch = adminDb.batch();
            commentsSnap.docs.forEach(c => commentBatch.delete(c.ref));
            await commentBatch.commit();

            // G. Notifications received or sent by user
            const notificationsSnap1 = await adminDb.collection("notifications").where("recipientId", "==", userId).get();
            const notifBatch1 = adminDb.batch();
            notificationsSnap1.docs.forEach(n => notifBatch1.delete(n.ref));
            await notifBatch1.commit();

            const notificationsSnap2 = await adminDb.collection("notifications").where("senderId", "==", userId).get();
            const notifBatch2 = adminDb.batch();
            notificationsSnap2.docs.forEach(n => notifBatch2.delete(n.ref));
            await notifBatch2.commit();
        }

        // 5. Delete Firestore user document
        await targetUserRef.delete();

        // 6. Delete user from Firebase Auth
        try {
            await adminAuth.deleteUser(userId);
        } catch (authErr: any) {
            console.warn("Auth user deletion skipped or failed (user might not exist in Auth):", authErr.message);
        }

        return NextResponse.json({ success: true, message: "User entirely deleted from server." });
    } catch (error) {
        console.error("[DeleteUser API]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Deletion failed" },
            { status: 500 },
        );
    }
}
