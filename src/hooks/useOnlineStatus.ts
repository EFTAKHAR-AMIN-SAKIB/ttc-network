"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Facebook-grade online / offline connectivity detection hook.
 * Handles transient network dropouts, captive portal detection,
 * and tracks "wasOffline" state to trigger smooth reconnection toasts.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [wasOffline, setWasOffline] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(false);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial check & event listeners
    useEffect(() => {
        if (typeof window === "undefined") return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setWasOffline(true);

            // Re-check via small fetch to confirm real internet access (not captive portal)
            checkConnection();

            // Clear any prior timer and auto-clear wasOffline after 4 seconds
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
                setWasOffline(false);
            }, 4000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, []);

    /**
     * Active ping to verify real upstream internet connectivity
     */
    const checkConnection = useCallback(async (): Promise<boolean> => {
        if (typeof window === "undefined") return true;
        setIsChecking(true);
        try {
            // Ping with cache busting and a fast 3.5s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
                method: "HEAD",
                cache: "no-store",
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const online = res.ok || res.type === "opaque";
            setIsOnline(online);
            if (online && !isOnline) {
                setWasOffline(true);
                if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(() => setWasOffline(false), 4000);
            }
            setIsChecking(false);
            return online;
        } catch {
            setIsOnline(false);
            setIsChecking(false);
            return false;
        }
    }, [isOnline]);

    return {
        isOnline,
        wasOffline,
        isChecking,
        checkConnection,
        dismissReconnected: () => setWasOffline(false),
    };
}
