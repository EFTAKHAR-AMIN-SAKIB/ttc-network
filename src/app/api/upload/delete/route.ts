/**
 * Delete API Route — R2 + Legacy Cloudinary
 * ============================================
 * Deletes files by URL. Auto-detects the storage provider:
 * - R2 URLs → S3 DeleteObject
 * - Cloudinary URLs → Cloudinary SDK destroy
 *
 * Accepts either:
 * - { url: string } (single file deletion)
 * - { urls: string[] } (batch deletion)
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// ── R2 ────────────────────────────────────────────

const R2 = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET_NAME || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
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

// ── URL Extractors ────────────────────────────────

function extractCloudinaryInfo(url: string): { publicId: string; resourceType: "image" | "video" | "raw" } | null {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes("cloudinary.com")) return null;

        const uploadIdx = parsed.pathname.indexOf("/upload/");
        if (uploadIdx === -1) return null;

        const afterUpload = parsed.pathname.slice(uploadIdx + "/upload/".length);
        const segments = afterUpload.split("/");
        let startIndex = 0;

        // Skip transform segments (containing commas or matching prefixes like c_fill, w_500) and version segments (v12345)
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

function extractR2Info(url: string): { key: string; isStudyFile: boolean } | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        const r2Host = R2.publicUrl ? new URL(R2.publicUrl).hostname.toLowerCase() : "";
        const studyHost = STUDY_R2.publicUrl ? new URL(STUDY_R2.publicUrl).hostname.toLowerCase() : "";

        const isR2 = host.includes("r2.dev") || 
                     host.includes("r2.cloudflarestorage.com") ||
                     (r2Host && host === r2Host) ||
                     (studyHost && host === studyHost);

        if (!isR2) return null;

        const rawKey = parsed.pathname.replace(/^\/+/, "");
        if (!rawKey) return null;

        const isStudyFile = Boolean(studyHost && host === studyHost);

        return {
            key: decodeURIComponent(rawKey),
            isStudyFile,
        };
    } catch {
        return null;
    }
}

// ── Single file delete helper ─────────────────────

async function deleteSingleFile(url: string, isAdmin: boolean): Promise<{ success: boolean; provider: string }> {
    try {
        // ── 1. Check R2 ──────────────────────────────────
        const r2Info = extractR2Info(url);
        if (r2Info) {
            // Protected prefixes check for non-admin
            if (!isAdmin) {
                const lowerKey = r2Info.key.toLowerCase();
                if (lowerKey.startsWith("system/") || lowerKey.startsWith("branding/") || lowerKey.startsWith("site/")) {
                    return { success: false, provider: "r2_forbidden" };
                }
            }

            if (r2Info.isStudyFile) {
                await getStudyS3().send(new DeleteObjectCommand({
                    Bucket: STUDY_R2.bucket,
                    Key: r2Info.key,
                }));
            } else {
                await getS3().send(new DeleteObjectCommand({
                    Bucket: R2.bucket,
                    Key: r2Info.key,
                }));
            }

            return { success: true, provider: "r2" };
        }

        // ── 2. Check Cloudinary ──────────────────────────
        const cloudInfo = extractCloudinaryInfo(url);
        if (cloudInfo) {
            if (!isAdmin) {
                const lowerId = cloudInfo.publicId.toLowerCase();
                if (lowerId.startsWith("system/") || lowerId.startsWith("branding/") || lowerId.startsWith("site/")) {
                    return { success: false, provider: "cloudinary_forbidden" };
                }
            }

            let result = await cloudinary.uploader.destroy(cloudInfo.publicId, {
                resource_type: cloudInfo.resourceType,
                invalidate: true,
            });

            // Fallback attempt if resource type mismatch (e.g., video misclassified as image or vice versa)
            if (result.result !== "ok" && result.result !== "not found") {
                const fallbackType = cloudInfo.resourceType === "video" ? "image" : "video";
                const fallbackResult = await cloudinary.uploader.destroy(cloudInfo.publicId, {
                    resource_type: fallbackType,
                    invalidate: true,
                });
                if (fallbackResult.result === "ok") {
                    result = fallbackResult;
                }
            }

            const ok = result.result === "ok" || result.result === "not found";
            return { success: ok, provider: "cloudinary" };
        }

        return { success: false, provider: "unknown" };
    } catch (err) {
        console.warn("[Delete API] Error deleting file:", url, err);
        return { success: false, provider: "error" };
    }
}

// ── Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // ── Auth check: require valid session ─────────────
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

        // Check user existence
        if (!adminDb) {
            return NextResponse.json({ error: "Database not configured" }, { status: 500 });
        }

        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const isAdmin = userData?.role === "admin" || userData?.role === "manager" || userData?.role === "super_manager";

        // Parse payload (supports { url } and { urls: string[] })
        const body = await request.json().catch(() => ({}));
        const rawUrls: string[] = [];
        if (typeof body.url === "string" && body.url.trim()) {
            rawUrls.push(body.url.trim());
        }
        if (Array.isArray(body.urls)) {
            body.urls.forEach((u: unknown) => {
                if (typeof u === "string" && u.trim()) {
                    rawUrls.push(u.trim());
                }
            });
        }

        if (rawUrls.length === 0) {
            return NextResponse.json({ error: "No URL(s) provided" }, { status: 400 });
        }

        const uniqueUrls = Array.from(new Set(rawUrls));

        // Delete all provided URLs concurrently
        const results = await Promise.all(
            uniqueUrls.map(u => deleteSingleFile(u, isAdmin))
        );

        if (uniqueUrls.length === 1) {
            const single = results[0];
            return NextResponse.json({
                success: single.success,
                provider: single.provider,
            });
        }

        const successfulCount = results.filter(r => r.success).length;
        return NextResponse.json({
            success: true,
            total: uniqueUrls.length,
            deleted: successfulCount,
        });

    } catch (error) {
        console.error("[Delete API]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 },
        );
    }
}
