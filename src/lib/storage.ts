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

import { getAuthInstance } from "./firebase";
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
    | "faculty";

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
 * Delete a file by its URL.
 * Sends the URL to the delete API route which extracts the
 * Cloudinary public_id and deletes the asset.
 *
 * Silently fails if deletion doesn't work (non-critical for UX).
 *
 * @param url - The full public URL of the file to delete
 */
export async function deleteFromStorage(url: string): Promise<void> {
    if (!url) return;

    // Only attempt deletion for known storage providers
    const isKnown = url.includes("cloudinary.com") || url.includes("r2.dev") || url.includes("r2.cloudflarestorage.com");
    if (!isKnown) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        await fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
    } catch (err) {
        console.warn("[Storage] Failed to delete file:", err);
    }
}

// Backward-compatible alias
export const deleteFromCloudinary = deleteFromStorage;
