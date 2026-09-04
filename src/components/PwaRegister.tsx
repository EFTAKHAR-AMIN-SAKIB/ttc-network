"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __ttcInstallPrompt?: any;
    __ttcAppInstalled?: boolean;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      document.title = "TTC NETWORK";
    }

    // 1. If prompt was already captured by early head script, re-emit for components mounted after
    if (window.__ttcInstallPrompt) {
      window.dispatchEvent(new CustomEvent("ttc-install-prompt-ready", { detail: window.__ttcInstallPrompt }));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__ttcInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("ttc-install-prompt-ready", { detail: e }));
      console.log("[PWA] beforeinstallprompt captured and ready for automatic install");
    };

    const handleAppInstalled = () => {
      window.__ttcAppInstalled = true;
      window.__ttcInstallPrompt = null;
      window.dispatchEvent(new CustomEvent("ttc-app-installed"));
      console.log("[PWA] TTC NETWORK was installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 2. Register Service Worker on all pages for all users (guests & authenticated)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered globally with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker global registration:", err);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
