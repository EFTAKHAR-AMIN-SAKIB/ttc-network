"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Helper to render hashtags and @mentions inside any text chunk
 */
function renderTagsAndMentions(str: string, keyPrefix: string, onTagClick?: (tag: string) => void) {
    if (!str) return null;
    const parts = str.split(/((?:^|\s)(?:#|@)[\w\u0980-\u09FF]+)/g);
    
    return parts.map((part, i) => {
        const isTag = part.trim().startsWith("#");
        const isMention = part.trim().startsWith("@");
        const key = `${keyPrefix}-${i}`;
        
        if (isTag) {
            return (
                <button
                    key={key}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTagClick?.(part.trim().slice(1));
                    }}
                    className="text-primary font-bold hover:underline cursor-pointer"
                >
                    {part}
                </button>
            );
        }
        
        if (isMention) {
            const username = part.trim().slice(1);
            return (
                <Link
                    key={key}
                    href={`/profile/${username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary font-bold hover:underline"
                >
                    {part}
                </Link>
            );
        }
        
        return <span key={key}>{part}</span>;
    });
}

/**
 * RichText Component
 * Highlights hashtags (#tag), @mentions, and markdown **bold** text.
 */
export function RichText({ text, onTagClick }: { text: string; onTagClick?: (tag: string) => void }) {
    if (!text) return null;
    
    // Split text by **bold** or __bold__ tokens
    const boldTokens = text.split(/(\*\*[\s\S]+?\*\*|__[\s\S]+?__)/g);
    
    return (
        <>
            {boldTokens.map((segment, idx) => {
                const isDoubleAsterisk = segment.startsWith("**") && segment.endsWith("**") && segment.length >= 4;
                const isDoubleUnderscore = segment.startsWith("__") && segment.endsWith("__") && segment.length >= 4;

                if (isDoubleAsterisk || isDoubleUnderscore) {
                    const innerText = segment.slice(2, -2);
                    return (
                        <strong key={`b-${idx}`} className="font-extrabold text-gray-950 dark:text-white">
                            {renderTagsAndMentions(innerText, `b-${idx}`, onTagClick)}
                        </strong>
                    );
                }

                return renderTagsAndMentions(segment, `p-${idx}`, onTagClick);
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
    
    let displayText = expanded ? text : text.slice(0, limit);
    // If truncated midway through a bold segment, balance it so formatting is clean
    if (shouldTruncate && !expanded) {
        const asteriskCount = (displayText.match(/\*\*/g) || []).length;
        if (asteriskCount % 2 !== 0) {
            displayText += "**";
        }
    }

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
                    className="text-primary font-bold hover:underline ml-1 text-sm inline-block cursor-pointer"
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
