import { useState, useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

const mapRelatedTypeToCollection = (relatedType: string): string | null => {
    switch (relatedType) {
        case "post": return "posts";
        case "story": return "stories";
        case "comment": return "comments";
        case "study":
        case "studyPost":
            return "studyPosts";
        case "groupPost": return "groupPosts";
        case "notice": return "notices";
        case "club": return "clubs";
        case "user": return "users";
        case "group": return "groups";
        case "gift": return "gifts";
        default: return null;
    }
};

const getCommentIdFromUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url, "http://dummy.com");
        return parsed.searchParams.get("comment");
    } catch {
        const match = url.match(/[?&]comment=([^&]+)/);
        return match ? match[1] : null;
    }
};

export function useNotificationValidity(notifications: any[]) {
    const [validityMap, setValidityMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let active = true;

        const checkAll = async () => {
            const newValidityMap: Record<string, boolean> = { ...validityMap };
            const cache: Record<string, boolean> = {}; // key is "collection/id"
            
            // Identify which notifications actually need checking
            const toCheck = notifications.filter(notif => {
                if (newValidityMap[notif.id] !== undefined) {
                    return false;
                }
                
                const commentId = getCommentIdFromUrl(notif.targetUrl);
                const relatedCol = notif.relatedId && notif.relatedType ? mapRelatedTypeToCollection(notif.relatedType) : null;
                
                if (!commentId && !relatedCol) {
                    newValidityMap[notif.id] = true;
                    return false;
                }
                return true;
            });

            if (toCheck.length === 0) {
                if (active) setValidityMap(newValidityMap);
                return;
            }

            const db = getDb();

            await Promise.all(toCheck.map(async (notif) => {
                const commentId = getCommentIdFromUrl(notif.targetUrl);
                const relatedCol = notif.relatedId && notif.relatedType ? mapRelatedTypeToCollection(notif.relatedType) : null;
                
                let isCommentValid = true;
                let isRelatedValid = true;

                if (commentId) {
                    const cacheKey = `comments/${commentId}`;
                    if (cache[cacheKey] !== undefined) {
                        isCommentValid = cache[cacheKey];
                    } else {
                        try {
                            const commentRef = doc(db, "comments", commentId);
                            const commentSnap = await getDoc(commentRef);
                            const exists = commentSnap.exists();
                            cache[cacheKey] = exists;
                            isCommentValid = exists;
                        } catch (e) {
                            console.error("Error checking comment validity:", e);
                            isCommentValid = true;
                        }
                    }
                }

                if (isCommentValid && relatedCol && notif.relatedId) {
                    const cacheKey = `${relatedCol}/${notif.relatedId}`;
                    if (cache[cacheKey] !== undefined) {
                        isRelatedValid = cache[cacheKey];
                    } else {
                        try {
                            const docRef = doc(db, relatedCol, notif.relatedId);
                            const docSnap = await getDoc(docRef);
                            const exists = docSnap.exists();
                            cache[cacheKey] = exists;
                            isRelatedValid = exists;
                        } catch (e) {
                            console.error("Error checking related doc validity:", e);
                            isRelatedValid = true;
                        }
                    }
                }

                newValidityMap[notif.id] = isCommentValid && isRelatedValid;
            }));

            if (active) {
                setValidityMap(newValidityMap);
            }
        };

        checkAll();

        return () => {
            active = false;
        };
    }, [notifications]);

    return validityMap;
}
