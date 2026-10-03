/**
 * Unified Storage Module
 * =======================
 * Client-side upload/delete utility with image compression.
 * Currently uploads via the Cloudinary API route.
 * When R2 is properly configured, API routes can be swapped
 * without any changes to this module or its callers.
 *
 * Features:
 * - Client-side image compression (WebP, max 1920px)
 * - File validation (type + size)
 * - Drop-in replacement for old cloudinary.ts exports
 *
 * ⚠️ Client-side only — uses fetch() to call API routes.
 *    NEVER import this in server components or API routes.
 */

import { compressImage, validateFile, isImageFile } from "./image-utils";

// ═══════════════════════════════════════════════════
//  TYPES (mirrors CloudinaryUploadResult exactly)
// ═══════════════════════════════════════════════════

export type UploadFolder =
    | "logos"
    | "covers"
    | "gallery"
    | "avatars"
    | "userCovers"
    | "attachments"
    | "profile-photos"
    | "banners"
    | "thumbnails"
    | "clubs"
    | "colleges"
    | "users"
    | "branding"
    | "faculty"
    | "posts"
    | "group-posts"
    | "videos";

export interface StorageUploadResult {
    /** Public URL of the uploaded file */
    url: string;
    /** Cloudinary public_id (used for overwrite/delete) */
    publicId: string;
    /** Image width in pixels (0 for non-image files) */
    width: number;
    /** Image height in pixels (0 for non-image files) */
    height: number;
}

// Backward-compatible alias
export type CloudinaryUploadResult = StorageUploadResult;

// ═══════════════════════════════════════════════════
//  UPLOAD — Full Result (replaces uploadToCloudinary)
// ═══════════════════════════════════════════════════

/**
 * Upload a file via the API route.
 * Returns the full result object with URL, publicId, and dimensions.
 *
 * This is a **drop-in replacement** for `uploadToCloudinary()`.
 * Same parameters, same return type.
 *
 * @param file - The File to upload
 * @param folder - Top-level folder category (e.g., "avatars", "thumbnails")
 * @param subPath - Optional sub-path (e.g., user ID, college ID)
 * @param publicId - Optional publicId for overwriting (same image slot)
 *
 * @example
 * ```ts
 * // Avatar upload
 * const result = await uploadToStorage(photoFile, "avatars", user.uid);
 * const photoURL = result.url;
 *
 * // Site logo with fixed publicId (always overwrites same file)
 * const result = await uploadToStorage(logoFile, "branding", "site", "site-logo");
 * ```
 */
export async function uploadToStorage(
    file: File,
    folder: UploadFolder | string,
    subPath?: string,
    publicId?: string,
): Promise<StorageUploadResult> {
    // 1. Validate file
    const validationError = validateFile(file);
    if (validationError) {
        throw new Error(validationError);
    }

    // 2. Compress images client-side (skip PDFs, documents, etc.)
    let fileToUpload = file;
    if (isImageFile(file)) {
        const compressed = await compressImage(file);
        fileToUpload = compressed.file;

        if (compressed.wasCompressed) {
            console.log(
                `[Storage] Compressed: ${(compressed.originalSize / 1024).toFixed(0)}KB → ${(compressed.finalSize / 1024).toFixed(0)}KB (${Math.round((1 - compressed.ratio) * 100)}% smaller)`,
            );
        }
    }

    // 3. Build form data
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append(
        "folder",
        subPath ? `${folder}/${subPath}` : folder,
    );
    if (publicId) {
        formData.append("publicId", publicId);
    }

    // 4. Upload via API route
    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${res.status}`);
    }

    const result = await res.json();

    return {
        url: result.url,
        publicId: result.publicId || "",
        width: result.width || 0,
        height: result.height || 0,
    };
}

// Backward-compatible alias
export const uploadToCloudinary = uploadToStorage;

// ═══════════════════════════════════════════════════
//  UPLOAD — URL Only (replaces uploadFile)
// ═══════════════════════════════════════════════════

/**
 * Upload a file and return just the URL string.
 * Drop-in replacement for the old `uploadFile()` from cloudinary.ts.
 *
 * @param path - Slash-separated path string (e.g., "thumbnails", "avatars/userId")
 * @param file - The File to upload
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
    path: string,
    file: File,
): Promise<string> {
    const parts = path.split("/");
    const folder = parts[0] as UploadFolder;
    const subPath = parts.length > 1 ? parts.slice(1).join("/") : undefined;

    const result = await uploadToStorage(file, folder, subPath);
    return result.url;
}

// ═══════════════════════════════════════════════════
//  DELETE (replaces deleteFromCloudinary)
// ═══════════════════════════════════════════════════

/**
 * Delete a file or multiple files by URL.
 * Sends the URL(s) to the delete API route which identifies the
 * storage provider (R2 / Cloudinary) and deletes the asset(s).
 *
 * Silently fails if deletion doesn't work (non-critical for UX).
 *
 * @param target - A single URL string or an array of URLs to delete
 */
export async function deleteFromStorage(
    target: string | (string | undefined | null)[]
): Promise<void> {
    if (!target) return;

    const rawList = Array.isArray(target) ? target : [target];
    const urls = rawList
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .filter((u) => {
            // Skip data:, blob: URLs
            if (u.startsWith("data:") || u.startsWith("blob:")) return false;
            // Skip external third party providers like Unsplash, YouTube, Google
            if (u.includes("unsplash.com") || u.includes("youtube.com") || u.includes("youtu.be") || u.includes("google.com")) return false;
            // Only attempt deletion for known storage providers
            return (
                u.includes("cloudinary.com") ||
                u.includes("r2.dev") ||
                u.includes("r2.cloudflarestorage.com") ||
                u.startsWith("https://pub-")
            );
        });

    if (urls.length === 0) return;

    // Deduplicate
    const uniqueUrls = Array.from(new Set(urls));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const payload = uniqueUrls.length === 1 ? { url: uniqueUrls[0] } : { urls: uniqueUrls };

        await fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
    } catch (err) {
        console.warn("[Storage] Failed to delete file(s):", err);
    }
}

// Backward-compatible alias
export const deleteFromCloudinary = deleteFromStorage;
