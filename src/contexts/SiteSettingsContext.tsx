/**
 * Site Settings Context
 * ======================
 * Provides dynamic site branding (name, tagline, logo) to all components.
 * Subscribes to Firestore `settings/site` document in real time via onSnapshot.
 * Falls back to defaults if the document doesn't exist yet.
 *
 * Usage: const { siteName, siteTagline, logoUrl } = useSiteSettings();
 */

"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

export interface SiteSettings {
    siteName: string;
    siteTagline: string;
    logoUrl: string;
}

interface SiteSettingsContextType extends SiteSettings {
    /** True while the initial fetch is in progress */
    loading: boolean;
}

// ═══════════════════════════════════════════════════
//  DEFAULTS
// ═══════════════════════════════════════════════════

const DEFAULTS: SiteSettings = {
    siteName: "TTC Network",
    siteTagline: "One Platform. All Colleges. Every Story.",
    logoUrl: "/logos/ttc network.png",
};

// ═══════════════════════════════════════════════════
//  CONTEXT
// ═══════════════════════════════════════════════════

const SiteSettingsContext = createContext<SiteSettingsContextType>({
    ...DEFAULTS,
    loading: true,
});

// ═══════════════════════════════════════════════════
//  PROVIDER
// ═══════════════════════════════════════════════════

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        try {
            const db = getDb();
            const ref = doc(db, "settings", "site");

            unsubscribe = onSnapshot(
                ref,
                (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setSettings({
                            siteName: data.siteName || DEFAULTS.siteName,
                            siteTagline: data.siteTagline || DEFAULTS.siteTagline,
                            logoUrl: data.logoUrl || DEFAULTS.logoUrl,
                        });
                    }
                    // If doc doesn't exist, keep defaults
                    setLoading(false);
                },
                (error) => {
                    console.warn("[SiteSettings] Firestore subscription error:", error);
                    setLoading(false);
                }
            );
        } catch (error) {
            console.warn("[SiteSettings] Failed to initialize:", error);
            setLoading(false);
        }

        return () => unsubscribe?.();
    }, []);

    // Dynamically update the browser tab title
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.title = `${settings.siteName} — ${settings.siteTagline}`;
        }
    }, [settings.siteName, settings.siteTagline]);

    return (
        <SiteSettingsContext.Provider value={{ ...settings, loading }}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

// ═══════════════════════════════════════════════════
//  HOOK
// ═══════════════════════════════════════════════════

export function useSiteSettings() {
    const ctx = useContext(SiteSettingsContext);
    if (!ctx) throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
    return ctx;
}
