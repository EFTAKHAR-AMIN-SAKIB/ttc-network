/**
 * Image Utilities — Client-Side Compression
 * ==========================================
 * Compresses images in the browser before upload to minimize
 * storage costs and bandwidth usage on Cloudflare R2.
 *
 * Features:
 * - Resizes to max 1920px width/height (preserves aspect ratio)
 * - Converts to WebP format (with JPEG fallback)
 * - Targets ~200KB output for typical photos
 * - Skips non-image files (PDFs, documents)
 * - Skips SVGs and animated GIFs (lossy compression would damage them)
 *
 * ⚠️ Client-side only — uses Canvas API (browser).
 *    NEVER import this in server components or API routes.
 */

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

export interface CompressionOptions {
    /** Maximum width or height in pixels. Default: 1920 */
    maxDimension?: number;
    /** Output quality (0–1). Default: 0.85 */
    quality?: number;
    /** Preferred output format. Default: "webp" (falls back to "jpeg") */
    format?: "webp" | "jpeg" | "png";
    /** Maximum file size in bytes BEFORE compression is applied.
     *  Files already smaller than this are returned as-is. Default: 500KB */
    skipBelowBytes?: number;
}

export interface CompressionResult {
    /** The compressed file (or the original if compression was skipped) */
    file: File;
    /** Whether the file was actually compressed or returned as-is */
    wasCompressed: boolean;
    /** Original file size in bytes */
    originalSize: number;
    /** Final file size in bytes */
    finalSize: number;
    /** Compression ratio (e.g., 0.25 = 75% smaller) */
    ratio: number;
}

// ═══════════════════════════════════════════════════
//  DEFAULTS
// ═══════════════════════════════════════════════════

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxDimension: 1920,
    quality: 0.85,
    format: "webp",
    skipBelowBytes: 500 * 1024, // 500KB
};

// MIME types that should NOT be compressed (lossy would damage them)
const SKIP_MIME_TYPES = new Set([
    "image/svg+xml",
    "image/gif",       // Animated GIFs lose animation
    "application/pdf",
]);

// ═══════════════════════════════════════════════════
//  CORE COMPRESSION
// ═══════════════════════════════════════════════════

/**
 * Check if the browser supports WebP encoding via Canvas.
 * Cached after first call for performance.
 */
let _webpSupported: boolean | null = null;

function supportsWebP(): boolean {
    if (_webpSupported !== null) return _webpSupported;

    try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        _webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
        _webpSupported = false;
    }

    return _webpSupported;
}

/**
 * Get the actual MIME type string for canvas export.
 */
function getOutputMime(format: "webp" | "jpeg" | "png"): string {
    if (format === "webp" && supportsWebP()) return "image/webp";
    if (format === "webp") return "image/jpeg"; // Fallback
    return `image/${format}`;
}

/**
 * Get the file extension for the output format.
 */
function getOutputExtension(mime: string): string {
    if (mime === "image/webp") return "webp";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    return "jpg";
}

/**
 * Load an image file into an HTMLImageElement.
 * Returns a promise that resolves when the image is fully loaded.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${file.name}`));
        };

        img.src = url;
    });
}

/**
 * Calculate the target dimensions for resizing, preserving aspect ratio.
 */
function calculateDimensions(
    width: number,
    height: number,
    maxDimension: number,
): { width: number; height: number } {
    // If already within bounds, no resize needed
    if (width <= maxDimension && height <= maxDimension) {
        return { width, height };
    }

    const aspectRatio = width / height;

    if (width > height) {
        return {
            width: maxDimension,
            height: Math.round(maxDimension / aspectRatio),
        };
    } else {
        return {
            width: Math.round(maxDimension * aspectRatio),
            height: maxDimension,
        };
    }
}

/**
 * Compress an image file using the browser's Canvas API.
 *
 * @param file - The image File to compress
 * @param options - Compression options (all optional, sensible defaults used)
 * @returns A CompressionResult with the compressed file and metadata
 *
 * @example
 * ```ts
 * const result = await compressImage(rawFile);
 * console.log(`Compressed: ${result.originalSize} → ${result.finalSize} (${Math.round(result.ratio * 100)}%)`);
 * // Use result.file for upload
 * ```
 */
export async function compressImage(
    file: File,
    options?: CompressionOptions,
): Promise<CompressionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // Skip non-image files entirely
    if (!file.type.startsWith("image/")) {
        return {
            file,
            wasCompressed: false,
            originalSize,
            finalSize: originalSize,
            ratio: 1,
        };
    }

    // Skip types that shouldn't be compressed
    if (SKIP_MIME_TYPES.has(file.type)) {
        return {
            file,
            wasCompressed: false,
            originalSize,
            finalSize: originalSize,
            ratio: 1,
        };
    }

    // Skip files already small enough
    if (originalSize <= opts.skipBelowBytes) {
        return {
            file,
            wasCompressed: false,
            originalSize,
            finalSize: originalSize,
            ratio: 1,
        };
    }

    try {
        // Load image into memory
        const img = await loadImage(file);

        // Calculate target dimensions
        const dims = calculateDimensions(img.width, img.height, opts.maxDimension);

        // Draw to canvas at target dimensions
        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to get canvas 2D context");
        }

        // Use high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, dims.width, dims.height);

        // Export to blob
        const outputMime = getOutputMime(opts.format);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => {
                    if (b) resolve(b);
                    else reject(new Error("Canvas toBlob returned null"));
                },
                outputMime,
                opts.quality,
            );
        });

        // Build the output filename
        const ext = getOutputExtension(outputMime);
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const outputName = `${baseName}.${ext}`;

        // Create a new File from the blob
        const compressedFile = new File([blob], outputName, {
            type: outputMime,
            lastModified: Date.now(),
        });

        const finalSize = compressedFile.size;

        // If compression actually made the file LARGER, return original
        if (finalSize >= originalSize) {
            return {
                file,
                wasCompressed: false,
                originalSize,
                finalSize: originalSize,
                ratio: 1,
            };
        }

        return {
            file: compressedFile,
            wasCompressed: true,
            originalSize,
            finalSize,
            ratio: finalSize / originalSize,
        };
    } catch (err) {
        // If compression fails for any reason, return the original file
        // This ensures uploads never break due to compression issues
        console.warn("[ImageUtils] Compression failed, using original:", err);
        return {
            file,
            wasCompressed: false,
            originalSize,
            finalSize: originalSize,
            ratio: 1,
        };
    }
}

// ═══════════════════════════════════════════════════
//  VALIDATION HELPERS
// ═══════════════════════════════════════════════════

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
]);

/** Allowed video MIME types */
export const ALLOWED_VIDEO_TYPES = new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/ogg",
    "video/x-matroska",
    "video/3gpp",
    "video/x-m4v",
    "video/m4v",
    "video/avi",
    "video/mpeg",
    "video/mp2t",
]);

/** Allowed document MIME types */
export const ALLOWED_DOCUMENT_TYPES = new Set([
    "application/pdf",
]);

/** All allowed upload MIME types */
export const ALLOWED_UPLOAD_TYPES = new Set([
    ...Array.from(ALLOWED_IMAGE_TYPES),
    ...Array.from(ALLOWED_VIDEO_TYPES),
    ...Array.from(ALLOWED_DOCUMENT_TYPES),
]);

/** Max file size for images: 50MB (compressed client-side) */
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

/** Max file size for videos: 300MB */
export const MAX_VIDEO_SIZE = 300 * 1024 * 1024;

/** Max file size for documents: 20MB */
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

/**
 * Validate a file before upload.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateFile(file: File): string | null {
    if (!file || file.size === 0) {
        return "No file selected or file is empty.";
    }

    const isVideo = isVideoFile(file);
    const isDoc = isDocumentFile(file);
    const isImg = isImageFile(file);

    if (!isVideo && !isDoc && !isImg) {
        return `File type "${file.type || "unknown"}" is not supported. Allowed: Images (JPEG, PNG, WebP, GIF), Videos (MP4, WebM, MOV, MKV up to 300MB), PDF.`;
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : isDoc ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? "300MB" : isDoc ? "20MB" : "50MB";

    if (file.size > maxSize) {
        return `File is too large (${formatFileSize(file.size)}). Maximum allowed size for ${isVideo ? "videos" : isDoc ? "documents" : "images"} is ${maxLabel}.`;
    }

    return null;
}

/**
 * Format bytes into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a file is an image (vs a document like PDF or video).
 */
export function isImageFile(file: File): boolean {
    if (file.type && file.type.startsWith("image/")) return true;
    const ext = file.name ? file.name.split(".").pop()?.toLowerCase() : "";
    return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "");
}

/**
 * Check if a file is a video.
 */
export function isVideoFile(file: File): boolean {
    if (file.type && (file.type.startsWith("video/") || ALLOWED_VIDEO_TYPES.has(file.type))) {
        return true;
    }
    const ext = file.name ? file.name.split(".").pop()?.toLowerCase() : "";
    return ["mp4", "webm", "mov", "mkv", "avi", "3gp", "m4v", "ogv", "wmv", "ts"].includes(ext || "");
}

/**
 * Check if a file is a document.
 */
export function isDocumentFile(file: File): boolean {
    if (file.type === "application/pdf") return true;
    const ext = file.name ? file.name.split(".").pop()?.toLowerCase() : "";
    return ext === "pdf";
}

export interface VideoThumbnailResult {
    blob: Blob;
    width: number;
    height: number;
    aspectRatio: number;
    isPortrait: boolean;
}

/**
 * Extract an ultra-lightweight WebP/JPEG thumbnail from a video file (frame at ~0.5s),
 * along with intrinsic video dimensions and aspect ratio.
 * Used for instant feed poster frames, eliminating black boxes and buffering delays.
 */
export function extractVideoThumbnail(file: File): Promise<VideoThumbnailResult | null> {
    return new Promise((resolve) => {
        if (typeof document === "undefined" || !isVideoFile(file)) {
            resolve(null);
            return;
        }

        try {
            const video = document.createElement("video");
            const url = URL.createObjectURL(file);
            video.preload = "metadata";
            video.src = url;
            video.muted = true;
            video.playsInline = true;

            const cleanup = () => {
                try { URL.revokeObjectURL(url); } catch (_) {}
                video.remove();
            };

            const timer = setTimeout(() => {
                cleanup();
                resolve(null);
            }, 6000);

            video.onloadedmetadata = () => {
                const targetTime = Math.min(0.5, video.duration > 0.6 ? 0.5 : 0.1);
                video.currentTime = targetTime;
            };

            video.onseeked = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement("canvas");
                    const maxW = 960;
                    const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
                    canvas.width = Math.round(video.videoWidth * scale) || 640;
                    canvas.height = Math.round(video.videoHeight * scale) || 360;

                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const format = supportsWebP() ? "image/webp" : "image/jpeg";
                        canvas.toBlob(
                            (blob) => {
                                const w = video.videoWidth || 640;
                                const h = video.videoHeight || 360;
                                cleanup();
                                if (!blob) {
                                    resolve(null);
                                    return;
                                }
                                resolve({
                                    blob,
                                    width: w,
                                    height: h,
                                    aspectRatio: w / h,
                                    isPortrait: h > w,
                                });
                            },
                            format,
                            0.82
                        );
                        return;
                    }
                } catch {
                    // ignore
                }
                cleanup();
                resolve(null);
            };

            video.onerror = () => {
                clearTimeout(timer);
                cleanup();
                resolve(null);
            };
        } catch {
            resolve(null);
        }
    });
}

