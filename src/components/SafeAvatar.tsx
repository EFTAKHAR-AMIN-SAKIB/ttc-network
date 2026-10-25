"use client";

import { useState, useEffect } from "react";

interface SafeAvatarProps {
    src?: string | null;
    alt?: string;
    sizeClassName?: string;
    textClassName?: string;
    fallbackBg?: string;
    fallbackColor?: string;
    roundedClassName?: string;
    className?: string;
}

export default function SafeAvatar({
    src,
    alt = "User",
    sizeClassName = "w-full h-full",
    textClassName = "text-xs font-black",
    fallbackBg = "bg-primary/10",
    fallbackColor = "text-primary",
    roundedClassName = "rounded-full",
    className = ""
}: SafeAvatarProps) {
    const [hasError, setHasError] = useState(false);

    // Reset error state if image src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const initial = (alt?.trim()?.[0] || "U").toUpperCase();
    const hasCustomSize = className.includes("w-") || className.includes("size-") || className.includes("h-");
    const resolvedSizeClass = hasCustomSize ? "" : sizeClassName;

    if (!src || hasError) {
        return (
            <div 
                className={`${resolvedSizeClass} ${roundedClassName} ${fallbackBg} ${fallbackColor} flex items-center justify-center select-none uppercase font-black transition-all ${className}`}
                title={alt}
            >
                <span className={textClassName}>{initial}</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className={`${resolvedSizeClass} ${roundedClassName} object-cover transition-all ${className}`}
        />
    );
}
