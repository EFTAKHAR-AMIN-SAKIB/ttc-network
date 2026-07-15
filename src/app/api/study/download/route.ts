import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
    "res.cloudinary.com",
    "r2.dev",
    "googleusercontent.com",
    "googleapis.com",
    "unsplash.com",
    "ui-avatars.com",
    "drive.google.com"
];

function isAllowedDomain(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);
        const host = url.hostname.toLowerCase();
        return ALLOWED_DOMAINS.some(domain => host === domain || host.endsWith("." + domain));
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileUrl = searchParams.get("url");
        let filename = searchParams.get("filename") || "download";

        if (!fileUrl) {
            return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
        }

        if (!isAllowedDomain(fileUrl)) {
            return NextResponse.json({ error: "Domain not allowed" }, { status: 400 });
        }

        // Fetch the file from the remote storage (Cloudinary, R2, etc.)
        const response = await fetch(fileUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch file" }, { status: response.status });
        }

        const blob = await response.blob();
        
        // If filename does not have an extension, try to append it based on Content-Type
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(filename);
        if (!hasExtension) {
            const contentType = response.headers.get("Content-Type") || "";
            const mimeToExt: Record<string, string> = {
                "application/pdf": "pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
                "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
                "application/vnd.ms-powerpoint": "ppt",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
                "application/vnd.ms-excel": "xls",
                "text/plain": "txt",
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/jpg": "jpg",
                "image/webp": "webp",
                "image/gif": "gif"
            };
            const ext = mimeToExt[contentType];
            if (ext) {
                filename = `${filename}.${ext}`;
            } else {
                // Try extracting extension from URL
                try {
                    const parsedUrl = new URL(fileUrl);
                    const extMatch = parsedUrl.pathname.match(/\.([a-zA-Z0-9]+)$/);
                    if (extMatch) {
                        filename = `${filename}.${extMatch[0]}`;
                    }
                } catch {}
            }
        }

        const headers = new Headers();
        
        // Force the browser to download the file directly with Content-Disposition
        // Using encodeURIComponent to support non-ASCII characters in filename
        const encodedFilename = encodeURIComponent(filename);
        headers.set("Content-Disposition", `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
        headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
        headers.set("Content-Length", blob.size.toString());
        
        // Cache for 24 hours to optimize performance
        headers.set("Cache-Control", "public, max-age=86400");

        return new NextResponse(blob, {
            status: 200,
            headers
        });
    } catch (error) {
        console.error("[Download Proxy Error]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
