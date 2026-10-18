/**
 * Server-Side Notice Cleanup Service
 * =====================================
 * Automatically finds and permanently purges notices whose 14-day post-deadline
 * grace period has expired (autoDeleteAt <= now).
 *
 * Full Server Deletion:
 * - Deletes associated image/routine scan files from storage (Cloudinary / R2)
 * - Deletes notice documents permanently from Firestore
 */

import { adminDb } from "@/lib/firebase-admin";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

// ── R2 Storage Config ────────────────────────────
const R2 = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET_NAME || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
};

let _s3: S3Client | null = null;
function getS3(): S3Client | null {
    if (!R2.accessKeyId || !R2.secretAccessKey || !R2.endpoint || !R2.bucket) return null;
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

// ── Cloudinary Config ────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractCloudinaryInfo(url: string): { publicId: string; resourceType: "image" | "video" | "raw" } | null {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes("cloudinary.com")) return null;

        const uploadIdx = parsed.pathname.indexOf("/upload/");
        if (uploadIdx === -1) return null;

        const afterUpload = parsed.pathname.slice(uploadIdx + "/upload/".length);
        const segments = afterUpload.split("/");
        let startIndex = 0;

        while (startIndex < segments.length) {
            const seg = segments[startIndex];
            if (/^v\d+$/.test(seg) || seg.includes(",") || /^[a-z]{1,2}_/i.test(seg)) {
                startIndex++;
            } else {
                break;
            }
        }

        const publicPath = segments.slice(startIndex).join("/");
        const isVideo = parsed.pathname.includes("/video/") || /\.(mp4|webm|mov|ogg|mkv|avi|3gp)$/i.test(parsed.pathname);
        const isRaw = parsed.pathname.includes("/raw/") || /\.(pdf|doc|docx|zip)$/i.test(parsed.pathname);
        const resourceType = isVideo ? "video" : (isRaw ? "raw" : "image");

        const lastDot = publicPath.lastIndexOf(".");
        const publicId = (resourceType !== "raw" && lastDot > 0) ? publicPath.substring(0, lastDot) : publicPath;

        return {
            publicId: decodeURIComponent(publicId),
            resourceType,
        };
    } catch {
        return null;
    }
}

async function deleteServerFile(url: string): Promise<boolean> {
    if (!url || typeof url !== "string") return false;
    try {
        if (url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com") || (R2.publicUrl && url.includes(new URL(R2.publicUrl).hostname))) {
            const key = new URL(url).pathname.replace(/^\/+/, "");
            if (!key) return false;
            const s3 = getS3();
            if (s3) {
                await s3.send(new DeleteObjectCommand({
                    Bucket: R2.bucket,
                    Key: key,
                }));
                return true;
            }
        } else if (url.includes("cloudinary.com")) {
            const info = extractCloudinaryInfo(url);
            if (info) {
                await cloudinary.uploader.destroy(info.publicId, {
                    resource_type: info.resourceType,
                    invalidate: true,
                });
                return true;
            }
        }
    } catch (err) {
        console.warn("[Notice Storage Delete] Error deleting file:", url, err);
    }
    return false;
}

export interface NoticeCleanupResult {
    success: boolean;
    totalChecked: number;
    deletedCount: number;
    deletedNotices: { id: string; title: string; deadline?: string; autoDeleteAt?: string }[];
    errors: string[];
}

export async function cleanupExpiredNotices(): Promise<NoticeCleanupResult> {
    if (!adminDb) {
        return {
            success: false,
            totalChecked: 0,
            deletedCount: 0,
            deletedNotices: [],
            errors: ["Admin DB not initialized"],
        };
    }

    const now = new Date();
    const result: NoticeCleanupResult = {
        success: true,
        totalChecked: 0,
        deletedCount: 0,
        deletedNotices: [],
        errors: [],
    };

    try {
        const snap = await adminDb.collection("notices").get();
        result.totalChecked = snap.docs.length;

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (!data.autoDeleteAt) continue;

            let autoDeleteDate: Date | null = null;
            if (typeof data.autoDeleteAt.toDate === "function") {
                autoDeleteDate = data.autoDeleteAt.toDate();
            } else if (data.autoDeleteAt._seconds) {
                autoDeleteDate = new Date(data.autoDeleteAt._seconds * 1000);
            } else if (data.autoDeleteAt) {
                autoDeleteDate = new Date(data.autoDeleteAt);
            }

            if (autoDeleteDate && autoDeleteDate.getTime() <= now.getTime()) {
                const noticeId = docSnap.id;
                try {
                    // 1. Delete associated image/thumbnail from storage
                    if (data.thumbnailUrl) {
                        await deleteServerFile(data.thumbnailUrl);
                    }
                    // 2. Delete notice document from Firestore
                    await docSnap.ref.delete();
                    
                    result.deletedCount++;
                    result.deletedNotices.push({
                        id: noticeId,
                        title: data.title || "Untitled Notice",
                        deadline: data.deadline ? (data.deadline.toDate ? data.deadline.toDate().toISOString() : String(data.deadline)) : undefined,
                        autoDeleteAt: autoDeleteDate.toISOString(),
                    });
                    console.log(`[Notice Auto-Cleanup] Purged expired notice ${noticeId}: "${data.title}" (Purged after 14-day deadline cutoff: ${autoDeleteDate.toISOString()})`);
                } catch (docErr) {
                    const msg = `Failed to purge notice ${noticeId}: ${docErr instanceof Error ? docErr.message : String(docErr)}`;
                    console.error("[Notice Auto-Cleanup]", msg);
                    result.errors.push(msg);
                }
            }
        }
    } catch (err) {
        result.success = false;
        result.errors.push(err instanceof Error ? err.message : String(err));
    }

    return result;
}
