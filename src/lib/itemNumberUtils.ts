/**
 * Item Number Utilities
 * =====================
 * Utilities to generate, format, and resolve clean numeric IDs (e.g. "01", "02", "09", "10")
 * for Study Resources, Stories, and Notices with 100% backward compatibility for old doc IDs.
 */

/**
 * Formats a 1-based index or item number into a 2-digit (or N-digit) string.
 * Example: 1 -> "01", 9 -> "09", 10 -> "10", 105 -> "105"
 */
export function formatItemNumber(num: number): string {
    if (!num || isNaN(num) || num <= 0) return "01";
    return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Gets timestamp in milliseconds for consistent sorting.
 */
function getTimestampMs(item: any): number {
    if (!item) return 0;
    const ts = item.createdAt || item.timestamp;
    if (!ts) return 0;
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return new Date(ts).getTime();
    if (typeof ts === "number") return ts;
    return 0;
}

/**
 * Returns the clean numeric ID string (e.g. "01", "02") for a given item.
 * If item has explicit itemNumber stored, formats it.
 * Otherwise computes its 1-based chronological index (sorted by creation date ascending).
 */
export function getItemNumber<T extends { id: string; createdAt?: any; timestamp?: any; itemNumber?: number }>(
    item?: T | null,
    allItems?: T[]
): string {
    if (!item) return "01";

    if (typeof item.itemNumber === "number" && item.itemNumber > 0) {
        return formatItemNumber(item.itemNumber);
    }

    if (allItems && allItems.length > 0) {
        const sorted = [...allItems].sort((a, b) => getTimestampMs(a) - getTimestampMs(b));
        const index = sorted.findIndex((i) => i.id === item.id);
        if (index !== -1) {
            return formatItemNumber(index + 1);
        }
    }

    return "01";
}

/**
 * Finds an item from a list by matching EITHER its numeric ID ("01", "1", "02")
 * OR its original Firestore doc ID.
 * This guarantees 100% backward compatibility with old links.
 */
export function findItemByNumericOrDocId<T extends { id: string; createdAt?: any; timestamp?: any; itemNumber?: number }>(
    queryOrId: string | null | undefined,
    items: T[]
): T | undefined {
    if (!queryOrId || !items || items.length === 0) return undefined;

    const trimmed = queryOrId.trim();

    // 1. Direct doc.id match (for backward compatibility)
    const exactDocMatch = items.find((i) => i.id === trimmed);
    if (exactDocMatch) return exactDocMatch;

    // 2. Numeric ID match (e.g. "01", "1", "02", "15")
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
        const sorted = [...items].sort((a, b) => getTimestampMs(a) - getTimestampMs(b));

        // Check if any item has explicit itemNumber matching parsed
        const storedMatch = sorted.find((i) => i.itemNumber === parsed);
        if (storedMatch) return storedMatch;

        // Otherwise match 1-based index (parsed - 1)
        if (parsed <= sorted.length) {
            return sorted[parsed - 1];
        }
    }

    return undefined;
}
