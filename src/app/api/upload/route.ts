/**
 * Upload API Route — Cloudflare R2
 * ==================================
 * Server-side endpoint that uploads files to Cloudflare R2
 * via S3-compatible API.
 *
 * Features:
 * - Accepts images AND PDFs (fixes achievement upload bug)
 * - Uploads raw binary (no base64 = 50% less server RAM)
 * - Standardized folder/key structure
 * - Fixed-key overwrite support (site logo, builder profile)
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { adminAuth } from "@/lib/firebase-admin";

// ═══════════════════════════════════════════════════
//  R2 CLIENT
// ═══════════════════════════════════════════════════

const R2 = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET_NAME || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
};

const isConfigured =
    R2.accessKeyId && R2.secretAccessKey && R2.endpoint && R2.bucket && R2.publicUrl;

let _client: S3Client | null = null;

function getClient(): S3Client {
    if (_client) return _client;
    _client = new S3Client({
        region: "auto",
        endpoint: R2.endpoint,
        credentials: {
            accessKeyId: R2.accessKeyId,
            secretAccessKey: R2.secretAccessKey,
        },
        forcePathStyle: true,
    });
    return _client;
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

const ALLOWED_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/svg+xml", "application/pdf",
]);

const MAX_IMAGE = 10 * 1024 * 1024;   // 10MB
const MAX_DOC = 20 * 1024 * 1024;     // 20MB

function getExt(mime: string, name: string): string {
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
        const ext = name.substring(dot + 1).toLowerCase();
        if (ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
    }
    const map: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf",
    };
    return map[mime] || "bin";
}

function randomId(len = 8): string {
    const c = "abcdefghijklmnopqrstuvwxyz0123456789";
    const b = new Uint8Array(len);
    crypto.getRandomValues(b);
    return Array.from(b, v => c[v % c.length]).join("");
}

// ═══════════════════════════════════════════════════
//  HANDLER
// ═══════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    try {
        // ── Auth check: require valid session ─────────────
        const sessionCookie = request.cookies.get("ttc_session")?.value;
        if (!sessionCookie || !adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
            await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch {
            return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
        }

        if (!isConfigured) {
            return NextResponse.json(
                { error: "R2 not configured. Check .env.local" },
                { status: 500 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const rawFolder = (formData.get("folder") as string) || "uploads";
        // Sanitize each segment individually — preserves "/" folder structure
        // while blocking ".." traversal and special chars
        const folder = rawFolder
            .replace(/\.\./g, "")
            .split("/")
            .map(seg => seg.replace(/[^a-zA-Z0-9_-]/g, ""))
            .filter(Boolean)
            .join("/") || "uploads";
        const rawPublicId = formData.get("publicId") as string | null;
        const publicId = rawPublicId
            ? rawPublicId
                .replace(/\.\./g, "")
                .split("/")
                .map(s => s.replace(/[^a-zA-Z0-9_-]/g, ""))
                .filter(Boolean)
                .join("/")
            : null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: `Unsupported file type: "${file.type}". Allowed: JPEG, PNG, WebP, GIF, SVG, PDF.` },
                { status: 400 },
            );
        }

        const isPdf = file.type === "application/pdf";
        const limit = isPdf ? MAX_DOC : MAX_IMAGE;
        if (file.size > limit) {
            return NextResponse.json(
                { error: `File too large (${(file.size / 1048576).toFixed(1)}MB). Max: ${isPdf ? "20MB" : "10MB"}.` },
                { status: 400 },
            );
        }

        // Build object key
        const ext = getExt(file.type, file.name);
        let key: string;
        if (publicId) {
            // Fixed key for overwrite (same as Cloudinary's publicId concept)
            key = `${folder}/${publicId}.${ext}`;
        } else {
            key = `${folder}/${Date.now()}-${randomId()}.${ext}`;
        }

        // Upload raw binary to R2
        const buf = Buffer.from(await file.arrayBuffer());

        await getClient().send(new PutObjectCommand({
            Bucket: R2.bucket,
            Key: key,
            Body: buf,
            ContentType: file.type,
            CacheControl: publicId ? "public, max-age=3600" : "public, max-age=31536000",
        }));

        const url = `${R2.publicUrl.replace(/\/$/, "")}/${key}`;

        return NextResponse.json({
            url,
            publicId: key,
            width: 0,
            height: 0,
        });
    } catch (error) {
        console.error("[Upload API]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 },
        );
    }
}
