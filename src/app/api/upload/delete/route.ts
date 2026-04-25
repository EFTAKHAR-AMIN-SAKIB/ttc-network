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

// ── Cloudinary (legacy) ───────────────────────────

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
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

            await getS3().send(new DeleteObjectCommand({
                Bucket: R2.bucket,
                Key: key,
            }));

            return NextResponse.json({ success: true, provider: "r2" });
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
