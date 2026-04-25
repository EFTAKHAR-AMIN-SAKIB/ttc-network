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

/** Allowed document MIME types */
export const ALLOWED_DOCUMENT_TYPES = new Set([
    "application/pdf",
]);

/** All allowed upload MIME types */
export const ALLOWED_UPLOAD_TYPES = new Set([
    ...Array.from(ALLOWED_IMAGE_TYPES),
    ...Array.from(ALLOWED_DOCUMENT_TYPES),
]);

/** Max file size for images: 10MB */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
        return `File type "${file.type || "unknown"}" is not supported. Allowed: JPEG, PNG, WebP, GIF, SVG, PDF.`;
    }

    const isDocument = ALLOWED_DOCUMENT_TYPES.has(file.type);
    const maxSize = isDocument ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isDocument ? "20MB" : "10MB";

    if (file.size > maxSize) {
        return `File is too large (${formatFileSize(file.size)}). Maximum: ${maxLabel}.`;
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
 * Check if a file is an image (vs a document like PDF).
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith("image/");
}
