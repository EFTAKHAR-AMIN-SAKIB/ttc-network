/**
 * Normalizes an external URL to ensure it has a valid web protocol.
 * - Trims whitespace.
 * - Returns empty string if url is undefined, null, or empty.
 * - Preserves existing http://, https://, mailto:, tel:
 * - Prepend https:// if it starts with //
 * - Prepend https:// if no protocol is present (e.g., "ttcnetwork.xyz" -> "https://ttcnetwork.xyz")
 */
export function formatExternalUrl(url?: string | null): string {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";

    // Protocol check (http://, https://, mailto:, tel:)
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
        return trimmed;
    }

    // Protocol-relative URL like //domain.com
    if (trimmed.startsWith("//")) {
        return `https:${trimmed}`;
    }

    // Default to https://
    return `https://${trimmed}`;
}
