import { doc, getDoc, writeBatch, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// ═══════════════════════════════════════════════════
//  USERNAME VALIDATION
// ═══════════════════════════════════════════════════

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const RESERVED_USERNAMES = new Set([
    "admin", "administrator", "mod", "moderator", "system",
    "support", "help", "root", "null", "undefined",
    "ttc", "ttcconnect", "ttc_connect",
]);

export interface UsernameValidation {
    valid: boolean;
    error?: string;
}

/**
 * Validate a username string against formatting rules.
 */
export function validateUsername(username: string): UsernameValidation {
    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < USERNAME_MIN) {
        return { valid: false, error: `Must be at least ${USERNAME_MIN} characters` };
    }
    if (trimmed.length > USERNAME_MAX) {
        return { valid: false, error: `Must be ${USERNAME_MAX} characters or less` };
    }
    if (!USERNAME_REGEX.test(trimmed)) {
        return { valid: false, error: "Letters, numbers & underscores only. Must start with a letter" };
    }
    if (trimmed.includes("__")) {
        return { valid: false, error: "No consecutive underscores allowed" };
    }
    if (RESERVED_USERNAMES.has(trimmed)) {
        return { valid: false, error: "This username is reserved" };
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════
//  FIRESTORE OPERATIONS
// ═══════════════════════════════════════════════════

/**
 * Check if a username is available in Firestore.
 * Uses the `usernames` collection where doc ID = username.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
    const trimmed = username.trim().toLowerCase();
    const db = getDb();
    const usernameDoc = await getDoc(doc(db, "usernames", trimmed));
    return !usernameDoc.exists();
}

/**
 * Claim a username for a user using a Firestore transaction.
 * This ensures atomicity — no two users can claim the same username
 * simultaneously (prevents TOCTOU race condition).
 *
 * 1. Inside a transaction, reads `usernames/{username}` to check availability.
 * 2. If available, atomically creates the username doc and updates the user doc.
 * 3. If the user already has a username, the old one is released.
 */
export async function claimUsername(
    uid: string,
    newUsername: string,
    oldUsername?: string
): Promise<{ success: boolean; error?: string }> {
    const trimmed = newUsername.trim().toLowerCase();

    // Validate format
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        const db = getDb();

        await runTransaction(db, async (txn) => {
            // Check availability inside the transaction (atomic read)
            const usernameRef = doc(db, "usernames", trimmed);
            const existing = await txn.get(usernameRef);

            if (existing.exists()) {
                throw new Error("Username is already taken");
            }

            // Release old username if present
            if (oldUsername && oldUsername !== trimmed) {
                txn.delete(doc(db, "usernames", oldUsername.toLowerCase()));
            }

            // Claim new username
            txn.set(usernameRef, { uid });
            txn.update(doc(db, "users", uid), { username: trimmed });
        });

        return { success: true };
    } catch (err: any) {
        console.error("[username] Failed to claim username:", err);
        const message = err?.message?.includes("already taken")
            ? "Username is already taken"
            : "Failed to save username. Please try again.";
        return { success: false, error: message };
    }
}

