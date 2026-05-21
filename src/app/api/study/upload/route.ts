import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { adminAuth } from "@/lib/firebase-admin";

// ═══════════════════════════════════════════════════
//  STUDY R2 CLIENT CONFIG
// ═══════════════════════════════════════════════════

const STUDY_R2 = {
    accessKeyId: process.env.STUDY_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.STUDY_R2_SECRET_ACCESS_KEY || "",
    endpoint: process.env.STUDY_R2_ENDPOINT || "",
    bucket: process.env.STUDY_R2_BUCKET_NAME || "",
    publicUrl: process.env.STUDY_R2_PUBLIC_URL || "",
};

const isConfigured =
    STUDY_R2.accessKeyId &&
    STUDY_R2.secretAccessKey &&
    STUDY_R2.endpoint &&
    STUDY_R2.bucket &&
    STUDY_R2.publicUrl;

let _client: S3Client | null = null;

function getClient(): S3Client {
    if (_client) return _client;

    let endpoint = STUDY_R2.endpoint;
    try {
        const urlObj = new URL(endpoint);
        endpoint = `${urlObj.protocol}//${urlObj.host}`;
    } catch (err) {
        console.warn("Invalid R2 endpoint URL, using as is:", endpoint);
    }

    _client = new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
            accessKeyId: STUDY_R2.accessKeyId,
            secretAccessKey: STUDY_R2.secretAccessKey,
        },
        forcePathStyle: true,
    });
    return _client;
}

// ═══════════════════════════════════════════════════
//  HELPERS & VALIDATIONS
// ═══════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "application/vnd.ms-excel", // xls
    "text/plain" // txt
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "txt"]);

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function getExt(mime: string, name: string): string {
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
        const ext = name.substring(dot + 1).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) return ext;
    }
    const map: Record<string, string> = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.ms-excel": "xls",
        "text/plain": "txt"
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
//  POST HANDLER
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
                { error: "Study R2 is not configured. Check environment variables." },
                { status: 500 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate MIME type or file extension
        const isAllowedMime = ALLOWED_MIME_TYPES.has(file.type);
        const ext = getExt(file.type, file.name);
        const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);

        if (!isAllowedMime && !isAllowedExt) {
            return NextResponse.json(
                { error: `Unsupported file type: "${file.type}". Allowed: PDF, DOCX, PPTX, XLSX, TXT.` },
                { status: 400 },
            );
        }

        // Validate Size (50MB)
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size: 50MB.` },
                { status: 400 },
            );
        }

        // Build unique object key
        const key = `materials/${Date.now()}-${randomId()}.${ext}`;

        // Upload raw binary buffer to R2
        const buf = Buffer.from(await file.arrayBuffer());

        await getClient().send(new PutObjectCommand({
            Bucket: STUDY_R2.bucket,
            Key: key,
            Body: buf,
            ContentType: file.type || "application/octet-stream",
            CacheControl: "public, max-age=31536000",
        }));

        const url = `${STUDY_R2.publicUrl.replace(/\/$/, "")}/${key}`;

        return NextResponse.json({
            url,
            key,
            name: file.name,
            size: file.size,
            type: file.type,
        });
    } catch (error) {
        console.error("[Study Upload API Error]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 },
        );
    }
}
