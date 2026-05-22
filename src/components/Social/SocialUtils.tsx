"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * RichText Component
 * Highlight hashtags and @mentions
 */
export function RichText({ text, onTagClick }: { text: string; onTagClick?: (tag: string) => void }) {
    if (!text) return null;
    
    // Regex to find hashtags and @mentions
    const parts = text.split(/((?:^|\s)(?:#|@)[\w\u0980-\u09FF]+)/g);
    
    return (
        <>
            {parts.map((part, i) => {
                const isTag = part.trim().startsWith("#");
                const isMention = part.trim().startsWith("@");
                
                if (isTag) {
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onTagClick?.(part.trim().slice(1));
                            }}
                            className="text-primary font-bold hover:underline"
                        >
                            {part}
                        </button>
                    );
                }
                
                if (isMention) {
                    const username = part.trim().slice(1);
                    return (
                        <Link
                            key={i}
                            href={`/profile/${username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary font-bold hover:underline"
                        >
                            {part}
                        </Link>
                    );
                }
                
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

/**
 * ExpandableText Component
 */
export function ExpandableText({ text, limit = 160, onTagClick }: { text: string; limit?: number; onTagClick?: (tag: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    const shouldTruncate = text.length > limit;
    const displayText = expanded ? text : text.slice(0, limit);

    return (
        <div className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            <RichText text={displayText} onTagClick={onTagClick} />
            {shouldTruncate && !expanded && "... "}
            {shouldTruncate && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="text-primary font-bold hover:underline ml-1 text-sm inline-block"
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}
        </div>
    );
}

/**
 * Relative Time Formatter
 */
export function timeAgo(ts: any) {
    if (!ts) return "";
    let date: Date;
    if (ts && typeof ts.toDate === "function") {
        date = ts.toDate();
    } else if (ts && typeof ts.seconds === "number") {
        date = new Date(ts.seconds * 1000);
    } else if (ts && typeof ts._seconds === "number") {
        date = new Date(ts._seconds * 1000);
    } else {
        date = new Date(ts);
    }

    if (isNaN(date.getTime())) {
        return "";
    }

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const absDiff = Math.abs(diff);

    if (absDiff < 60) return "just now";
    if (absDiff < 3600) return `${Math.floor(absDiff / 60)}m ago`;
    if (absDiff < 86400) return `${Math.floor(absDiff / 3600)}h ago`;
    return `${Math.floor(absDiff / 86400)}d ago`;
}

/**
 * TimeAgo Component
 * Prevents Next.js hydration mismatches by performing relative time calculation 
 * exclusively on the client-side after mounting.
 */
export function TimeAgo({ ts, className }: { ts: any; className?: string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <span className={className}>...</span>;
    }

    return <span className={className}>{timeAgo(ts)}</span>;
}
