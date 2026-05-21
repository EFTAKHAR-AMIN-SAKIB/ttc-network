/**
 * Delete API Route — R2 + Legacy Cloudinary
 * ============================================
 * Deletes files by URL. Auto-detects the storage provider:
 * - R2 URLs → S3 DeleteObject
 * - Cloudinary URLs → Cloudinary SDK destroy
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

        // Verify role (admin or manager)
        if (!adminDb) {
            return NextResponse.json({ error: "Database not configured" }, { status: 500 });
        }

        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        if (userData?.role !== "admin" && userData?.role !== "manager" && userData?.role !== "super_manager") {
            return NextResponse.json({ error: "Forbidden: Only admins and managers can delete files" }, { status: 403 });
        }

        const { url } = await request.json();

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        // ─── R2 URL ──────────────────────────────
        if (url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com")) {
            const key = new URL(url).pathname.replace(/^\//, "");
            if (!key) {
                return NextResponse.json({ error: "Invalid R2 URL" }, { status: 400 });
            }

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

            return NextResponse.json({ success: true, provider: "r2", isStudyFile });
        }

        // ─── Cloudinary URL ──────────────────────
        if (url.includes("cloudinary.com")) {
            const publicId = extractCloudinaryId(url);
            if (!publicId) {
                return NextResponse.json({ error: "Could not extract public_id" }, { status: 400 });
            }

            const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
            return NextResponse.json({ success: result.result === "ok", provider: "cloudinary" });
        }

        // ─── Unknown ─────────────────────────────
        return NextResponse.json({ success: false, provider: "unknown" });

    } catch (error) {
        console.error("[Delete API]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 },
        );
    }
}

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
