/**
 * ⚠️  DEPRECATED — LEGACY FILE
 * ==============================
 * This module has been replaced by `storage.ts` which uses
 * Cloudflare R2 for all new uploads.
 *
 * No files import from this module anymore.
 * Kept for reference and potential rollback only.
 * Safe to delete once R2 migration is fully verified.
 *
 * Original purpose:
 * Cloudinary Upload Utility — handled all file uploads via
 * Cloudinary free tier (25 credits/month = ~25GB bandwidth).
 * All uploads went through a Next.js API route to keep
 * the Cloudinary secret off the client.
 */

export type UploadFolder = "logos" | "covers" | "gallery" | "avatars" | "userCovers" | "attachments" | "profile-photos" | "banners" | "thumbnails";

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
}

/**
 * Upload a file to Cloudinary via our API route.
 * Returns the secure URL to store in Firestore.
 */
export async function uploadToCloudinary(
    file: File,
    folder: UploadFolder,
    /** Optional sub-path, e.g., the college ID or user ID */
    subPath?: string,
    /** Optional public_id for overwriting existing images */
    publicId?: string,
): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", subPath ? `ttc-connect/${folder}/${subPath}` : `ttc-connect/${folder}`);
    if (publicId) {
        formData.append("publicId", publicId);
    }

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${res.status}`);
    }

    return res.json();
}

/**
 * Convenience wrapper: upload and return just the URL string.
 * Drop-in replacement for the old Firebase `uploadFile` function.
 */
export async function uploadFile(
    path: string,
    file: File,
): Promise<string> {
    // Parse the path to determine folder and sub-path
    // e.g., "logos/dhaka.png" → folder="logos", subPath=undefined
    // e.g., "gallery/dhaka/photo1.jpg" → folder="gallery", subPath="dhaka"
    const parts = path.split("/");
    const folder = parts[0] as UploadFolder;
    const subPath = parts.length > 2 ? parts[1] : undefined;

    const result = await uploadToCloudinary(file, folder, subPath);
    return result.url;
}

/**
 * Delete an image from Cloudinary by its URL.
 * Calls the server-side delete API route.
 * Silently fails if deletion doesn't work (non-critical).
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
    if (!url || !url.includes("cloudinary.com")) return;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        await fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
    } catch (err) {
        console.warn("[Cloudinary] Failed to delete old image:", err);
    }
}
