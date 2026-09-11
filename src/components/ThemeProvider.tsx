"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    toggleTheme: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Read from localStorage or system preference
        const stored = localStorage.getItem("ttc-theme") as Theme | null;
        if (stored) {
            setTheme(stored);
            document.documentElement.classList.toggle("dark", stored === "dark");
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "light" ? "dark" : "light";
            localStorage.setItem("ttc-theme", next);
            document.documentElement.classList.toggle("dark", next === "dark");
            return next;
        });
    }, []);

    // Dynamically synchronize the mobile status bar / browser chrome theme-color on theme & route change
    useEffect(() => {
        if (!mounted) return;
        const color = theme === "dark" ? "#0F1117" : "#FFFFFF";
        const metaTags = document.querySelectorAll('meta[name="theme-color"]');
        if (metaTags.length > 0) {
            metaTags.forEach((tag) => tag.setAttribute("content", color));
        } else {
            const meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            meta.setAttribute("content", color);
            document.head.appendChild(meta);
        }

        // Also ensure default static tag is always synchronized
        const defaultTag = document.getElementById("ttc-default-theme-color");
        if (defaultTag) {
            defaultTag.setAttribute("content", color);
        }
    }, [theme, mounted, pathname]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
