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

export interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}

export type OnUploadProgressCallback = (progress: UploadProgress) => void;

// Backward-compatible alias
export type CloudinaryUploadResult = StorageUploadResult;

// ═══════════════════════════════════════════════════
//  UPLOAD — Full Result (replaces uploadToCloudinary)
// ═══════════════════════════════════════════════════

/**
 * Upload a file via the API route.
 * Returns the full result object with URL, publicId, and dimensions.
 * Supports real-time upload progress tracking for large media (up to 300MB).
 *
 * This is a **drop-in replacement** for `uploadToCloudinary()`.
 *
 * @param file - The File to upload
 * @param folder - Top-level folder category (e.g., "avatars", "thumbnails", "videos")
 * @param subPath - Optional sub-path (e.g., user ID, college ID)
 * @param publicId - Optional publicId for overwriting (same image slot)
 * @param onProgress - Optional callback for byte-level upload progress tracking
 */
export async function uploadToStorage(
    file: File,
    folder: UploadFolder | string,
    subPath?: string,
    publicId?: string,
    onProgress?: OnUploadProgressCallback,
): Promise<StorageUploadResult> {
    // 1. Validate file (videos up to 300MB, images up to 50MB)
    const validationError = validateFile(file);
    if (validationError) {
        throw new Error(validationError);
    }

    // 2. Compress images client-side (skip videos, PDFs, documents)
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

    // 4. Retrieve Firebase ID token for bulletproof auth
    let idToken: string | null = null;
    try {
        const { getAuth } = await import("firebase/auth");
        const currentUser = getAuth().currentUser;
        if (currentUser) {
            idToken = await currentUser.getIdToken();
        }
    } catch {
        // Fall back to cookie-only authentication
    }

    const targetFolder = subPath ? `${folder}/${subPath}` : folder;

    // 5. Try Direct Presigned Upload to Cloudflare R2 (Bypasses Vercel 4.5MB limit entirely!)
    try {
        const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
                filename: fileToUpload.name,
                contentType: fileToUpload.type,
                size: fileToUpload.size,
                folder: targetFolder,
                publicId: publicId || null,
            }),
        });

        if (presignRes.ok) {
            const presignData = await presignRes.json();
            if (presignData.uploadUrl && presignData.publicUrl) {
                return await new Promise<StorageUploadResult>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("PUT", presignData.uploadUrl);

                    // Set Content-Type matching what was signed
                    if (presignData.effectiveMime || fileToUpload.type) {
                        xhr.setRequestHeader("Content-Type", presignData.effectiveMime || fileToUpload.type);
                    }

                    if (xhr.upload) {
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable && onProgress) {
                                const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                                onProgress({
                                    loaded: event.loaded,
                                    total: event.total,
                                    percent,
                                });
                            }
                        };
                    }

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            onProgress?.({ loaded: fileToUpload.size, total: fileToUpload.size, percent: 100 });
                            resolve({
                                url: presignData.publicUrl,
                                publicId: presignData.key || "",
                                width: 0,
                                height: 0,
                            });
                        } else {
                            reject(new Error(`Direct storage upload failed with status ${xhr.status}. Cloudflare R2 bucket may require CORS configuration.`));
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error("Direct upload failed due to network or CORS. Please ensure Cloudflare R2 CORS policy is configured in your Cloudflare dashboard."));
                    };

                    xhr.ontimeout = () => {
                        reject(new Error("Direct upload timed out. Please check your internet connection."));
                    };

                    xhr.timeout = 600000; // 10 minutes for large video uploads up to 300MB
                    xhr.send(fileToUpload);
                });
            }
        } else if (fileToUpload.size > 4.2 * 1024 * 1024) {
            const errData = await presignRes.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to initiate direct large file upload.");
        }
    } catch (presignErr: any) {
        // If file is > 4.2MB, Vercel proxy will 413, so surface error immediately
        if (fileToUpload.size > 4.2 * 1024 * 1024) {
            throw presignErr;
        }
        console.warn("[Presign Upload Fallback to Proxy]:", presignErr);
    }

    // 6. Fallback for smaller files (< 4.2MB): Upload via /api/upload proxy
    return new Promise<StorageUploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.withCredentials = true;

        if (idToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);
        }

        if (xhr.upload) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                    onProgress({
                        loaded: event.loaded,
                        total: event.total,
                        percent,
                    });
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    // Emit 100% on complete
                    onProgress?.({ loaded: fileToUpload.size, total: fileToUpload.size, percent: 100 });
                    resolve({
                        url: result.url,
                        publicId: result.publicId || "",
                        width: result.width || 0,
                        height: result.height || 0,
                    });
                } catch {
                    reject(new Error("Invalid response received from upload server"));
                }
            } else if (xhr.status === 413) {
                reject(new Error("File exceeds Vercel proxy limit (4.5MB). Direct storage upload is required."));
            } else {
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    reject(new Error(errorData.error || `Upload failed: ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status code ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network connection error during file upload. Please check your internet connection."));
        };

        xhr.ontimeout = () => {
            reject(new Error("Upload timed out. Please try again with a smaller file or faster connection."));
        };

        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);
    });
}

// Backward-compatible alias
export const uploadToCloudinary = uploadToStorage;

// ═══════════════════════════════════════════════════
//  UPLOAD — URL Only (replaces uploadFile)
// ═══════════════════════════════════════════════════

/**
 * Upload a file and return just the URL string.
 * Drop-in replacement for the old `uploadFile()` from cloudinary.ts with optional progress tracking.
 *
 * @param path - Slash-separated path string (e.g., "videos", "thumbnails", "avatars/userId")
 * @param file - The File to upload
 * @param onProgress - Optional progress tracking callback
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
    path: string,
    file: File,
    onProgress?: OnUploadProgressCallback,
): Promise<string> {
    const parts = path.split("/");
    const folder = parts[0] as UploadFolder;
    const subPath = parts.length > 1 ? parts.slice(1).join("/") : undefined;

    const result = await uploadToStorage(file, folder, subPath, undefined, onProgress);
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

        let idToken: string | null = null;
        try {
            const { getAuth } = await import("firebase/auth");
            idToken = await getAuth().currentUser?.getIdToken() || null;
        } catch {
            // fallback to cookie-only
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

        const payload = uniqueUrls.length === 1 ? { url: uniqueUrls[0] } : { urls: uniqueUrls };

        await fetch("/api/upload/delete", {
            method: "POST",
            headers,
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
