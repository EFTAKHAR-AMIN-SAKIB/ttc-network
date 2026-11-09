/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminAuth } from "@/lib/firebase-admin";

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

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/svg+xml", "application/pdf",
    "video/mp4", "video/webm", "video/quicktime", "video/ogg",
    "video/x-matroska", "video/x-msvideo", "video/3gpp",
    "video/x-m4v", "video/m4v", "video/avi", "video/mpeg", "video/mp2t",
]);

const MAX_IMAGE = 50 * 1024 * 1024;   // 50MB
const MAX_DOC = 20 * 1024 * 1024;     // 20MB
const MAX_VIDEO = 300 * 1024 * 1024;  // 300MB

const EXT_TO_MIME: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    "3gp": "video/3gpp",
    m4v: "video/x-m4v",
    ogv: "video/ogg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
};

function resolveMime(mime: string, name: string): string {
    if (ALLOWED_TYPES.has(mime)) return mime;
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
        const ext = name.substring(dot + 1).toLowerCase();
        if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
    }
    return mime;
}

function getExt(mime: string, name: string): string {
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
        const ext = name.substring(dot + 1).toLowerCase();
        if (ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
    }
    const map: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf",
        "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
        "video/ogg": "ogv", "video/x-matroska": "mkv", "video/x-msvideo": "avi",
        "video/3gpp": "3gp", "video/x-m4v": "m4v", "video/m4v": "m4v",
        "video/avi": "avi", "video/mpeg": "mpg", "video/mp2t": "ts",
    };
    return map[mime] || "bin";
}

function randomId(len = 8): string {
    const c = "abcdefghijklmnopqrstuvwxyz0123456789";
    const b = new Uint8Array(len);
    crypto.getRandomValues(b);
    return Array.from(b, v => c[v % c.length]).join("");
}

export async function POST(request: NextRequest) {
    try {
        // Auth check
        const sessionCookie = request.cookies.get("ttc_session")?.value;
        const authHeader = request.headers.get("authorization");
        const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

        if (!sessionCookie && !bearerToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let authenticated = false;
        if (sessionCookie && adminAuth) {
            try {
                await adminAuth.verifySessionCookie(sessionCookie, true);
                authenticated = true;
            } catch {
                // Try bearer
            }
        }

        if (!authenticated && bearerToken && adminAuth) {
            try {
                await adminAuth.verifyIdToken(bearerToken);
                authenticated = true;
            } catch {
                // Invalid token
            }
        }

        if (!authenticated) {
            return NextResponse.json({ error: "Invalid or expired session. Please log in again." }, { status: 401 });
        }

        if (!isConfigured) {
            return NextResponse.json({ error: "Cloudflare R2 storage is not configured on server." }, { status: 503 });
        }

        const body = await request.json();
        const filename = (body.filename as string) || "file.bin";
        const rawMime = (body.contentType as string) || "application/octet-stream";
        const size = (body.size as number) || 0;
        const rawFolder = (body.folder as string) || "uploads";
        const publicId = (body.publicId as string) || null;

        const effectiveMime = resolveMime(rawMime, filename);

        if (!ALLOWED_TYPES.has(effectiveMime)) {
            return NextResponse.json(
                { error: `Unsupported file type: "${rawMime}". Allowed: Images (JPEG, PNG, WebP, GIF), Videos (MP4, WebM, MOV, MKV up to 300MB), Documents (PDF).` },
                { status: 400 },
            );
        }

        const isPdf = effectiveMime === "application/pdf";
        const isVideo = effectiveMime.startsWith("video/") || ALLOWED_TYPES.has(effectiveMime) && effectiveMime.startsWith("video");
        const limit = isVideo ? MAX_VIDEO : isPdf ? MAX_DOC : MAX_IMAGE;
        const limitLabel = isVideo ? "300MB" : isPdf ? "20MB" : "50MB";

        if (size > limit) {
            return NextResponse.json(
                { error: `File too large (${(size / 1048576).toFixed(1)}MB). Max: ${limitLabel}.` },
                { status: 400 },
            );
        }

        const folder = rawFolder
            .replace(/\.\./g, "")
            .split("/")
            .map(seg => seg.replace(/[^a-zA-Z0-9_-]/g, ""))
            .filter(Boolean)
            .join("/") || "uploads";

        const ext = getExt(effectiveMime, filename);
        const key = publicId
            ? `${folder}/${publicId}.${ext}`
            : `${folder}/${Date.now()}-${randomId()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: R2.bucket,
            Key: key,
            ContentType: effectiveMime,
        });

        const uploadUrl = await getSignedUrl(getClient() as any, command as any, { expiresIn: 3600 });
        const publicUrl = `${R2.publicUrl.replace(/\/$/, "")}/${key}`;

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            key,
            effectiveMime,
        });
    } catch (err: any) {
        console.error("[Presign Route Error]:", err);
        return NextResponse.json({ error: err.message || "Failed to generate presigned upload URL" }, { status: 500 });
    }
}
