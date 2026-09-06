"use client";

import { useEffect, useRef, useCallback } from "react";

export interface SwipeGestureOptions {
    onSwipeLeft?: () => void; // Finger swiped right-to-left (navigate next tab)
    onSwipeRight?: () => void; // Finger swiped left-to-right (navigate prev tab)
    minDistance?: number; // Minimum horizontal distance in px (default: 45)
    maxPerpendicularDistance?: number; // Max vertical deviation before disqualifying (default: 100)
    minVelocity?: number; // Min velocity in px/ms (default: 0.2)
    disabled?: boolean;
    enableHaptics?: boolean;
}

export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(
    options: SwipeGestureOptions
) {
    const {
        onSwipeLeft,
        onSwipeRight,
        minDistance = 45,
        maxPerpendicularDistance = 100,
        minVelocity = 0.2,
        disabled = false,
        enableHaptics = true,
    } = options;

    const elementRef = useRef<T | null>(null);
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const isVerticalScrollRef = useRef(false);
    const isSwipingRef = useRef(false);

    // Keep callbacks in refs so event listeners don't re-bind continuously
    const onSwipeLeftRef = useRef(onSwipeLeft);
    const onSwipeRightRef = useRef(onSwipeRight);
    useEffect(() => {
        onSwipeLeftRef.current = onSwipeLeft;
        onSwipeRightRef.current = onSwipeRight;
    }, [onSwipeLeft, onSwipeRight]);

    // Haptic feedback helper
    const triggerHaptic = useCallback(() => {
        if (!enableHaptics) return;
        try {
            if (typeof window !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(10);
            }
        } catch {
            // Ignore if blocked by browser policy
        }
    }, [enableHaptics]);

    // Check if touch target should be ignored
    const shouldIgnoreTouch = (target: EventTarget | null): boolean => {
        if (!target || !(target instanceof HTMLElement)) return false;

        // Ignore inside inputs, textareas, buttons, links, or elements with no-swipe attributes
        if (
            target.closest("input, textarea, select, button, a, [data-no-swipe], .no-swipe, .location-filter-strip")
        ) {
            return true;
        }

        return false;
    };

    const handleTouchStart = useCallback(
        (e: TouchEvent) => {
            if (disabled || e.touches.length !== 1) return;

            if (shouldIgnoreTouch(e.target)) {
                touchStartRef.current = null;
                return;
            }

            const touch = e.touches[0];
            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            };
            isVerticalScrollRef.current = false;
            isSwipingRef.current = false;
        },
        [disabled]
    );

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (disabled || !touchStartRef.current || e.touches.length !== 1) return;

            if (isVerticalScrollRef.current) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = touch.clientY - touchStartRef.current.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // If vertical movement dominates and exceeds initial threshold (12px),
            // this is vertical feed scroll: cancel horizontal swipe detection immediately!
            if (absY > 12 && absY > absX) {
                isVerticalScrollRef.current = true;
                return;
            }

            // If horizontal movement dominates and exceeds threshold
            if (absX > 10 && absX > absY) {
                isSwipingRef.current = true;
            }
        },
        [disabled]
    );

    const handleTouchEnd = useCallback(
        (e: TouchEvent) => {
            if (disabled || !touchStartRef.current) return;

            const start = touchStartRef.current;
            touchStartRef.current = null;

            if (isVerticalScrollRef.current) {
                isVerticalScrollRef.current = false;
                return;
            }

            const touch = e.changedTouches[0];
            if (!touch) return;

            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            const deltaTime = Date.now() - start.time;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            const velocity = absX / (deltaTime || 1);

            // Ensure gesture was primarily horizontal
            const isHorizontal = absX > absY * 1.25 && absY < maxPerpendicularDistance;
            const meetsDistance = absX >= minDistance;
            const meetsVelocity = velocity >= minVelocity && absX >= 25;
            const validTime = deltaTime <= 800; // Not a long stationary drag

            if (isHorizontal && (meetsDistance || meetsVelocity) && validTime) {
                if (deltaX < 0) {
                    // Swiped Right-to-Left (user dragged finger leftwards -> next tab)
                    triggerHaptic();
                    onSwipeLeftRef.current?.();
                } else if (deltaX > 0) {
                    // Swiped Left-to-Right (user dragged finger rightwards -> prev tab)
                    triggerHaptic();
                    onSwipeRightRef.current?.();
                }
            }
        },
        [disabled, maxPerpendicularDistance, minDistance, minVelocity, triggerHaptic]
    );

    useEffect(() => {
        const el = elementRef.current;
        if (!el) return;

        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: true });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return elementRef;
}
