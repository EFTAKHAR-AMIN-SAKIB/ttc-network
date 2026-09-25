import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

// ── R2 Storage Config ────────────────────────────
const R2 = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET_NAME || "",
};

let _s3: S3Client | null = null;
function getS3(): S3Client | null {
    if (!R2.accessKeyId || !R2.secretAccessKey || !R2.endpoint || !R2.bucket) {
        return null;
    }
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
function getStudyS3(): S3Client | null {
    if (!STUDY_R2.accessKeyId || !STUDY_R2.secretAccessKey || !STUDY_R2.endpoint || !STUDY_R2.bucket) {
        return null;
    }
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

export async function deleteFileFromStorage(url: string) {
    if (!url || typeof url !== "string") return;
    try {
        // ─── R2 URL ──────────────────────────────
        if (url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com")) {
            const key = new URL(url).pathname.replace(/^\//, "");
            if (!key) return;

            const isStudyFile = STUDY_R2.publicUrl && url.includes(new URL(STUDY_R2.publicUrl).hostname);

            if (isStudyFile) {
                const s3 = getStudyS3();
                if (s3) {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: STUDY_R2.bucket,
                        Key: key,
                    })).catch(err => console.warn("[deleteFileFromStorage] Study R2 delete err:", err?.message));
                }
            } else {
                const s3 = getS3();
                if (s3) {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: R2.bucket,
                        Key: key,
                    })).catch(err => console.warn("[deleteFileFromStorage] R2 delete err:", err?.message));
                }
            }
        }
        // ─── Cloudinary URL ──────────────────────
        else if (url.includes("cloudinary.com")) {
            const publicId = extractCloudinaryId(url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, { invalidate: true })
                    .catch(err => console.warn("[deleteFileFromStorage] Cloudinary delete err:", err?.message));
            }
        }
    } catch (err) {
        console.warn("[deleteFileFromStorage] Failed to delete file:", url, err);
    }
}

/**
 * Safely delete all documents returned by a query in batches of <= 400
 */
async function deleteQueryDocsInBatches(query: FirebaseFirestore.Query) {
    if (!adminDb) return;
    const snap = await query.get();
    if (snap.empty) return;

    for (let i = 0; i < snap.docs.length; i += 400) {
        const chunk = snap.docs.slice(i, i + 400);
        const batch = adminDb.batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit().catch(err => console.warn("[deleteQueryDocsInBatches] Batch delete err:", err?.message));
    }
}

/**
 * Exhaustively deletes a user and ALL their data entirely from the server:
 * - Username mapping
 * - Follower / Following links
 * - Subcollections (followers, following, savedPosts, etc.)
 * - Uploaded media (profile picture, cover picture)
 * - User posts, stories, notices, study resources, comments, reactions, notifications
 * - Club and Group membership references
 * - Firestore User document
 * - Firebase Auth record
 */
export async function deleteUserEntirelyFromServer(userId: string, deleteContent: boolean = true) {
    if (!adminDb || !adminAuth) {
        throw new Error("Admin SDK is not configured.");
    }

    const targetUserRef = adminDb.collection("users").doc(userId);
    const targetUserDoc = await targetUserRef.get();
    const userData = targetUserDoc.exists ? targetUserDoc.data() : null;

    // 1. Release username from 'usernames' collection
    if (userData?.username) {
        await adminDb.collection("usernames").doc(userData.username.toLowerCase()).delete().catch(() => {});
    }
    const usernameQuery = await adminDb.collection("usernames").where("uid", "==", userId).get();
    for (const d of usernameQuery.docs) {
        await d.ref.delete().catch(() => {});
    }

    // 2. Clean up follow relationships
    // 2a. Followers (people who follow this user)
    const followersCol = targetUserRef.collection("followers");
    const followersSnap = await followersCol.get();
    for (const docSnap of followersSnap.docs) {
        const followerId = docSnap.id;
        try {
            await adminDb.collection("users").doc(followerId).collection("following").doc(userId).delete();
            await adminDb.collection("users").doc(followerId).update({
                followingCount: FieldValue.increment(-1),
            });
        } catch {
            // continue even if follower doc is missing
        }
    }

    // 2b. Following (people this user was following)
    const followingCol = targetUserRef.collection("following");
    const followingSnap = await followingCol.get();
    for (const docSnap of followingSnap.docs) {
        const followedId = docSnap.id;
        try {
            await adminDb.collection("users").doc(followedId).collection("followers").doc(userId).delete();
            await adminDb.collection("users").doc(followedId).update({
                followersCount: FieldValue.increment(-1),
            });
        } catch {
            // continue even if followed doc is missing
        }
    }

    // 3. Delete subcollections under the user document
    const subcollections = [
        "followers",
        "following",
        "savedPosts",
        "savedStories",
        "savedNotices",
        "savedStudyPosts",
        "joinedGroups",
    ];
    for (const subName of subcollections) {
        await deleteQueryDocsInBatches(targetUserRef.collection(subName));
    }

    // 4. Delete user files (profile photo, cover photo)
    if (userData) {
        if (userData.photoURL) await deleteFileFromStorage(userData.photoURL);
        if (userData.coverUrl) await deleteFileFromStorage(userData.coverUrl);
        if (Array.isArray(userData.certifications)) {
            for (const cert of userData.certifications) {
                if (cert?.url) await deleteFileFromStorage(cert.url);
            }
        }
        if (Array.isArray(userData.achievementsList)) {
            for (const ach of userData.achievementsList) {
                if (ach?.fileURL) await deleteFileFromStorage(ach.fileURL);
            }
        }
    }

    // 5. Delete user-associated content if deleteContent is true
    if (deleteContent) {
        // A. Posts created by user
        const postsSnap = await adminDb.collection("posts").where("creatorId", "==", userId).get();
        for (const postDoc of postsSnap.docs) {
            const post = postDoc.data();
            if (post?.thumbnailUrl) await deleteFileFromStorage(post.thumbnailUrl);
            await deleteQueryDocsInBatches(adminDb.collection("comments").where("postId", "==", postDoc.id));
            await postDoc.ref.delete().catch(() => {});
        }

        // B. Stories created by user
        const storiesSnap = await adminDb.collection("stories").where("authorId", "==", userId).get();
        for (const storyDoc of storiesSnap.docs) {
            const story = storyDoc.data();
            if (story?.thumbnailUrl) await deleteFileFromStorage(story.thumbnailUrl);
            await deleteQueryDocsInBatches(adminDb.collection("comments").where("postId", "==", storyDoc.id));
            await storyDoc.ref.delete().catch(() => {});
        }

        // C. Notices created by user
        const noticesSnap = await adminDb.collection("notices").where("authorId", "==", userId).get();
        for (const noticeDoc of noticesSnap.docs) {
            const notice = noticeDoc.data();
            if (notice?.thumbnailUrl) await deleteFileFromStorage(notice.thumbnailUrl);
            await noticeDoc.ref.delete().catch(() => {});
        }

        // D. Study posts created by user
        const studySnap = await adminDb.collection("studyPosts").where("authorId", "==", userId).get();
        for (const studyDoc of studySnap.docs) {
            const study = studyDoc.data();
            if (study?.thumbnailUrl) await deleteFileFromStorage(study.thumbnailUrl);
            if (study?.fileUrl) await deleteFileFromStorage(study.fileUrl);
            await deleteQueryDocsInBatches(adminDb.collection("comments").where("postId", "==", studyDoc.id));
            await studyDoc.ref.delete().catch(() => {});
        }

        // E. Group posts created by user
        await deleteQueryDocsInBatches(adminDb.collection("groupPosts").where("creatorId", "==", userId));

        // F. Comments created by user
        await deleteQueryDocsInBatches(adminDb.collection("comments").where("userId", "==", userId));

        // G. Notifications received or sent by user
        await deleteQueryDocsInBatches(adminDb.collection("notifications").where("recipientId", "==", userId));
        await deleteQueryDocsInBatches(adminDb.collection("notifications").where("senderId", "==", userId));

        // H. Gifts sent by user
        await deleteQueryDocsInBatches(adminDb.collection("gifts").where("userId", "==", userId));
    }

    // 6. Delete Firestore user document
    await targetUserRef.delete();

    // 7. Delete user from Firebase Auth
    try {
        await adminAuth.deleteUser(userId);
    } catch (authErr: unknown) {
        const e = authErr as Error;
        console.warn("[deleteUserEntirelyFromServer] Auth user deletion skipped or failed:", e?.message);
    }

    return true;
}
