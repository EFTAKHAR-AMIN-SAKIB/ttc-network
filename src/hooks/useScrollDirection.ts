"use client";

import { useState, useEffect, useRef } from "react";

export function useScrollDirection(threshold: number = 10) {
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const [isAtTop, setIsAtTop] = useState(true);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const updateScrollDir = () => {
            const currentScrollY = window.scrollY;

            // Near top of page: always consider as not scrolling down and at top
            if (currentScrollY <= 40) {
                setIsAtTop(true);
                setIsScrollingDown(false);
                lastScrollY.current = currentScrollY;
                ticking.current = false;
                return;
            }

            setIsAtTop(false);

            const diff = currentScrollY - lastScrollY.current;

            // Only update state if change exceeds threshold
            if (Math.abs(diff) >= threshold) {
                if (diff > 0 && currentScrollY > 60) {
                    setIsScrollingDown(true);
                } else if (diff < 0) {
                    setIsScrollingDown(false);
                }
                lastScrollY.current = currentScrollY;
            }

            ticking.current = false;
        };

        const onScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(updateScrollDir);
                ticking.current = true;
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    return { isScrollingDown, isAtTop };
}
