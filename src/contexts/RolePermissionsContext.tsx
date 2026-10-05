"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import {
    type RolePermissionsConfig,
    type PermissionKey,
    type ConfigurableRole,
    DEFAULT_ROLE_PERMISSIONS,
    _setCachedConfig,
    hasPermission as _hasPermission,
} from "@/lib/rolePermissions";

// ═══════════════════════════════════════════════════
//  CONTEXT TYPE
// ═══════════════════════════════════════════════════

interface RolePermissionsContextType {
    /** The full merged permissions config (dynamic overrides + defaults) */
    config: RolePermissionsConfig;
    /** True while the initial Firestore load is in progress */
    loading: boolean;
    /** Check if a role has a specific permission */
    hasPermission: (role: string | undefined, key: PermissionKey) => boolean;
    /** Save the full config to Firestore (admin only) */
    saveConfig: (config: RolePermissionsConfig) => Promise<void>;
    /** Timestamp of last successful save */
    lastSaved: Date | null;
}

const RolePermissionsContext = createContext<RolePermissionsContextType>({
    config: DEFAULT_ROLE_PERMISSIONS,
    loading: true,
    hasPermission: _hasPermission,
    saveConfig: async () => {},
    lastSaved: null,
});

// ═══════════════════════════════════════════════════
//  HOOK
// ═══════════════════════════════════════════════════

export function useRolePermissions(): RolePermissionsContextType {
    return useContext(RolePermissionsContext);
}

// ═══════════════════════════════════════════════════
//  FIRESTORE DOC PATH
// ═══════════════════════════════════════════════════

const SETTINGS_DOC_PATH = "settings/rolePermissions";

// ═══════════════════════════════════════════════════
//  PROVIDER
// ═══════════════════════════════════════════════════

export function RolePermissionsProvider({ children }: { children: ReactNode }) {
    const { user, profile } = useAuth();
    const [config, setConfig] = useState<RolePermissionsConfig>(DEFAULT_ROLE_PERMISSIONS);
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);

    // Subscribe to the Firestore document for real-time updates
    useEffect(() => {
        let cancelled = false;

        try {
            const db = getDb();
            const docRef = doc(db, SETTINGS_DOC_PATH);

            // Set up real-time listener
            const unsub = onSnapshot(
                docRef,
                (snap) => {
                    if (cancelled) return;

                    if (snap.exists()) {
                        const data = snap.data() as Partial<RolePermissionsConfig>;
                        // Merge with defaults: dynamic overrides take precedence
                        const merged: RolePermissionsConfig = {
                            student: { ...DEFAULT_ROLE_PERMISSIONS.student, ...data.student },
                            teacher: { ...DEFAULT_ROLE_PERMISSIONS.teacher, ...data.teacher },
                            manager: { ...DEFAULT_ROLE_PERMISSIONS.manager, ...data.manager },
                            super_manager: { ...DEFAULT_ROLE_PERMISSIONS.super_manager, ...data.super_manager },
                        };
                        setConfig(merged);
                        _setCachedConfig(merged);
                    } else {
                        // No document yet — use defaults
                        setConfig(DEFAULT_ROLE_PERMISSIONS);
                        _setCachedConfig(null);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error("[RolePermissions] Snapshot error:", error);
                    if (!cancelled) {
                        setConfig(DEFAULT_ROLE_PERMISSIONS);
                        _setCachedConfig(null);
                        setLoading(false);
                    }
                }
            );

            unsubRef.current = unsub;
        } catch (err) {
            console.error("[RolePermissions] Failed to subscribe:", err);
            if (!cancelled) {
                setConfig(DEFAULT_ROLE_PERMISSIONS);
                _setCachedConfig(null);
                setLoading(false);
            }
        }

        return () => {
            cancelled = true;
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, []); // Subscribe once on mount — onSnapshot handles real-time updates

    // Save config to Firestore (admin only)
    const saveConfig = async (newConfig: RolePermissionsConfig) => {
        if (profile?.role !== "admin") {
            throw new Error("Unauthorized: Only Platform Administrators can modify role permissions.");
        }

        try {
            const db = getDb();
            const docRef = doc(db, SETTINGS_DOC_PATH);

            // Save to Firestore — the onSnapshot listener will pick up the change
            // and update the local state automatically and immediately across all clients
            await setDoc(docRef, {
                student: newConfig.student,
                teacher: newConfig.teacher,
                manager: newConfig.manager,
                super_manager: newConfig.super_manager,
                _updatedAt: new Date().toISOString(),
                _updatedBy: user?.uid || "unknown",
            });

            setLastSaved(new Date());
        } catch (err) {
            console.error("[RolePermissions] Failed to save:", err);
            throw err;
        }
    };

    return (
        <RolePermissionsContext.Provider
            value={{
                config,
                loading,
                hasPermission: _hasPermission,
                saveConfig,
                lastSaved,
            }}
        >
            {children}
        </RolePermissionsContext.Provider>
    );
}
