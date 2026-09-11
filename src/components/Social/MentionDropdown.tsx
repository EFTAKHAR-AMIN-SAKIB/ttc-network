"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, User as UserIcon } from "lucide-react";
import { getAllUsers, getFollowingUserIds, getGroupMemberUserIds, type FirestoreUser } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

export interface MentionableUser extends FirestoreUser {
    id: string;
}

// Module-level in-memory cache to guarantee 0ms typing response across components
let usersCache: MentionableUser[] | null = null;
let usersCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchCachedUsers(): Promise<MentionableUser[]> {
    const now = Date.now();
    if (usersCache && now - usersCacheTimestamp < CACHE_TTL_MS) {
        return usersCache;
    }
    try {
        const users = await getAllUsers();
        // Filter out records without username
        const validUsers = (users as MentionableUser[]).filter(u => u && u.username);
        usersCache = validUsers;
        usersCacheTimestamp = now;
        return validUsers;
    } catch (err) {
        console.warn("[Mention] Failed to fetch users for autocomplete:", err);
        return usersCache || [];
    }
}

/**
 * Hook for @mention autocomplete on any textarea or input
 */
export function useMentionAutosuggest({
    value,
    setValue,
    inputRef,
    groupId,
}: {
    value: string;
    setValue: (val: string | ((prev: string) => string)) => void;
    inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
    groupId?: string;
}) {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const [allUsers, setAllUsers] = useState<MentionableUser[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [groupMemberIds, setGroupMemberIds] = useState<Set<string> | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Preload users, following IDs, and group member IDs
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        const loadData = async () => {
            try {
                const [users, following, groupMembers] = await Promise.all([
                    fetchCachedUsers(),
                    user?.uid ? getFollowingUserIds(user.uid).catch(() => []) : Promise.resolve([]),
                    groupId ? getGroupMemberUserIds(groupId).catch(() => []) : Promise.resolve([]),
                ]);
                if (isMounted) {
                    setAllUsers(users);
                    setFollowingIds(new Set(following));
                    if (groupId) {
                        setGroupMemberIds(new Set(groupMembers));
                    } else {
                        setGroupMemberIds(null);
                    }
                }
            } catch (e) {
                console.error("[Mention] Data load error:", e);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();
        return () => {
            isMounted = false;
        };
    }, [user?.uid, groupId]);

    // Check mention trigger at current caret position
    const checkMention = useCallback(() => {
        const el = inputRef.current;
        if (!el) {
            setIsOpen(false);
            return;
        }

        const cursorPos = el.selectionStart ?? value.length;
        const textBeforeCursor = value.slice(0, cursorPos);

        // Match @ followed by letters/numbers/underscore/dots, preceded by start of line or whitespace
        const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.]*)$/);

        if (match) {
            const matchedQuery = match[1];
            const atIndex = textBeforeCursor.lastIndexOf("@" + matchedQuery);
            setQuery(matchedQuery);
            setMentionRange({
                start: atIndex,
                end: cursorPos,
            });
            setSelectedIndex(0);
            setIsOpen(true);
        } else {
            setIsOpen(false);
            setMentionRange(null);
        }
    }, [value, inputRef]);

    // Compute ranked suggestions
    const suggestions = useMemo(() => {
        if (!isOpen) return [];

        const currentUid = user?.uid;
        const myCollegeId = profile?.collegeId;
        const q = query.trim().toLowerCase();

        // Exclude current logged in user (cannot mention yourself)
        let candidates = allUsers.filter(u => u.id !== currentUid && u.username);

        // Strict group filtering: when in a group, only suggest members of that group!
        if (groupMemberIds) {
            candidates = candidates.filter(u => groupMemberIds.has(u.id));
        }

        if (!q) {
            // Empty query right after typing "@" -> recommend followed, same college, verified
            return candidates
                .map(u => {
                    let score = 0;
                    if (followingIds.has(u.id)) score += 50;
                    if (myCollegeId && u.collegeId === myCollegeId) score += 30;
                    if (u.roleVerified) score += 20;
                    if (u.role === "teacher" || u.role === "manager" || u.role === "admin") score += 10;
                    return { user: u, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map(item => item.user);
        }

        // Active query scoring
        const scored = candidates
            .map(u => {
                const uName = (u.username || "").toLowerCase();
                const dName = (u.displayName || "").toLowerCase();

                const uMatch = uName.includes(q);
                const dMatch = dName.includes(q);

                if (!uMatch && !dMatch) return null;

                let score = 0;
                // Exact matches
                if (uName === q) score += 120;
                if (dName === q) score += 100;

                // Prefix matches
                if (uName.startsWith(q)) score += 60;
                if (dName.startsWith(q)) score += 50;

                // Word boundary matches in display name (e.g. "Shuvo Ahmed", typing "ahm")
                const words = dName.split(/\s+/);
                if (words.some(w => w.startsWith(q))) score += 40;

                // Substring matches
                if (uMatch) score += 20;
                if (dMatch) score += 15;

                // Relationship / credibility bonuses
                if (followingIds.has(u.id)) score += 25;
                if (myCollegeId && u.collegeId === myCollegeId) score += 15;
                if (u.roleVerified) score += 10;
                if (u.role === "teacher" || u.role === "manager" || u.role === "admin") score += 10;

                return { user: u, score };
            })
            .filter((item): item is { user: MentionableUser; score: number } => item !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(item => item.user);

        return scored;
    }, [isOpen, allUsers, followingIds, query, user?.uid, profile?.collegeId, groupMemberIds]);

    // Insert selected user as @username
    const insertMention = useCallback(
        (targetUser: MentionableUser) => {
            if (!mentionRange) return;

            const handle = `@${targetUser.username} `;
            const before = value.slice(0, mentionRange.start);
            const after = value.slice(mentionRange.end);

            const nextValue = `${before}${handle}${after}`;
            setValue(nextValue);

            const nextCursorPos = before.length + handle.length;
            setIsOpen(false);
            setMentionRange(null);

            // Re-focus and update cursor
            setTimeout(() => {
                const el = inputRef.current;
                if (el) {
                    el.focus();
                    el.setSelectionRange(nextCursorPos, nextCursorPos);
                }
            }, 10);
        },
        [mentionRange, value, setValue, inputRef]
    );

    // Keyboard interception for textarea
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent): boolean => {
            if (!isOpen) return false;

            if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                return true;
            }

            if (suggestions.length === 0) return false;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
                return true;
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return true;
            }

            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                e.stopPropagation();
                const selected = suggestions[selectedIndex];
                if (selected) {
                    insertMention(selected);
                }
                return true;
            }

            return false;
        },
        [isOpen, suggestions, selectedIndex, insertMention]
    );

    return {
        isOpen,
        setIsOpen,
        query,
        suggestions,
        selectedIndex,
        setSelectedIndex,
        isLoading,
        checkMention,
        handleKeyDown,
        insertMention,
    };
}

/**
 * Modern floating MentionDropdown UI
 */
export function MentionDropdown({
    isOpen,
    query,
    suggestions,
    selectedIndex,
    setSelectedIndex,
    onSelect,
    onClose,
    position = "top",
    isGroup = false,
}: {
    isOpen: boolean;
    query: string;
    suggestions: MentionableUser[];
    selectedIndex: number;
    setSelectedIndex: (idx: number) => void;
    onSelect: (user: MentionableUser) => void;
    onClose: () => void;
    position?: "top" | "bottom";
    isGroup?: boolean;
}) {
    const listRef = useRef<HTMLDivElement>(null);

    // Ensure active element is scrolled into view
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const activeItem = listRef.current.children[selectedIndex] as HTMLElement | undefined;
        if (activeItem) {
            activeItem.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex, isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: position === "top" ? 8 : -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position === "top" ? 8 : -8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`absolute ${
                    position === "top" ? "bottom-full mb-2" : "top-full mt-2"
                } left-0 right-0 z-[100] bg-white/95 dark:bg-[#181924]/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-700/80 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden font-sans`}
            >
                {/* Header */}
                <div className="px-3.5 py-2 bg-gray-50/90 dark:bg-gray-850/70 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            @
                        </span>
                        <span>
                            {query 
                                ? (isGroup ? `Matching "${query}" in Group` : `Matching "${query}"`) 
                                : (isGroup ? "Suggested Group Members" : "Suggested People")}
                        </span>
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 hidden sm:inline">
                        ↑↓ Navigate • ↵ / Tab Select
                    </span>
                </div>

                {/* Suggestions List */}
                <div
                    ref={listRef}
                    className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50 p-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700"
                >
                    {suggestions.length === 0 ? (
                        <div className="py-6 text-center">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-1.5 text-gray-400">
                                <UserIcon size={16} />
                            </div>
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                                {isGroup
                                    ? `No group member found matching "${query}"`
                                    : `No profile found matching "${query}"`}
                            </p>
                        </div>
                    ) : (
                        suggestions.map((u, index) => {
                            const isSelected = index === selectedIndex;
                            return (
                                <div
                                    key={u.id}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onMouseDown={(e) => {
                                        // prevent blur so textarea keeps focus
                                        e.preventDefault();
                                        onSelect(u);
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                                        isSelected
                                            ? "bg-primary/10 dark:bg-primary/20 text-primary ring-1 ring-primary/20"
                                            : "hover:bg-gray-100/70 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200"
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        {u.photoURL ? (
                                            <img
                                                src={u.photoURL}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-750">
                                                {u.displayName?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs sm:text-sm font-black truncate">
                                                {u.displayName || u.username}
                                            </span>
                                            {u.roleVerified && (
                                                <CheckCircle2
                                                    size={13}
                                                    className="text-blue-500 shrink-0"
                                                />
                                            )}
                                            <span
                                                className={`text-[8.5px] uppercase tracking-wider font-black px-1.5 py-0.2 rounded shrink-0 ${
                                                    u.role === "admin" || u.role === "super_manager"
                                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                                        : u.role === "manager"
                                                        ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                                                        : u.role === "teacher"
                                                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                }`}
                                            >
                                                {u.role || "student"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                            <span className="font-semibold text-primary/80 dark:text-primary/70">
                                                @{u.username}
                                            </span>
                                            {u.college && (
                                                <>
                                                    <span>•</span>
                                                    <span className="truncate">{u.college}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
