import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export function useSectionUpdates() {
    const pathname = usePathname();
    const [lastSeen, setLastSeen] = useState<Record<string, number>>({
        "event": 0,
        "club": 0,
        "group": 0,
        "story": 0,
        "notice": 0,
        "study": 0
    });
    
    const [latestUpdate, setLatestUpdate] = useState<Record<string, number>>({
        "event": 0,
        "club": 0,
        "group": 0,
        "story": 0,
        "notice": 0,
        "study": 0
    });

    // 1. Initialize lastSeen from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const feed = Number(localStorage.getItem("ttc_last_seen_event") || "0");
            const club = Number(localStorage.getItem("ttc_last_seen_club") || "0");
            const group = Number(localStorage.getItem("ttc_last_seen_group") || "0");
            const story = Number(localStorage.getItem("ttc_last_seen_story") || "0");
            const notice = Number(localStorage.getItem("ttc_last_seen_notice") || "0");
            const study = Number(localStorage.getItem("ttc_last_seen_study") || "0");
            
            const now = Date.now();
            if (!localStorage.getItem("ttc_last_seen_event")) localStorage.setItem("ttc_last_seen_event", now.toString());
            if (!localStorage.getItem("ttc_last_seen_club")) localStorage.setItem("ttc_last_seen_club", now.toString());
            if (!localStorage.getItem("ttc_last_seen_group")) localStorage.setItem("ttc_last_seen_group", now.toString());
            if (!localStorage.getItem("ttc_last_seen_story")) localStorage.setItem("ttc_last_seen_story", now.toString());
            if (!localStorage.getItem("ttc_last_seen_notice")) localStorage.setItem("ttc_last_seen_notice", now.toString());
            if (!localStorage.getItem("ttc_last_seen_study")) localStorage.setItem("ttc_last_seen_study", now.toString());

            setLastSeen({
                "event": feed || now,
                "club": club || now,
                "group": group || now,
                "story": story || now,
                "notice": notice || now,
                "study": study || now
            });
        }
    }, []);

    // 2. Subscribe to Firestore latest updates
    useEffect(() => {
        const db = getDb();

        // Posts query (gets latest Global Event or Club posts)
        const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(10));
        const noopErr = () => {};

        const unsubPosts = onSnapshot(qPosts, (snap) => {
            let latestEventTime = 0;
            let latestClubTime = 0;
            snap.forEach((doc) => {
                const data = doc.data();
                const type = data.type || "event";
                const date = data.timestamp?.toMillis?.() || data.timestamp?.seconds * 1000 || 0;
                if (type === "event" && date > latestEventTime) {
                    latestEventTime = date;
                } else if (type === "club" && date > latestClubTime) {
                    latestClubTime = date;
                }
            });
            setLatestUpdate(prev => ({
                ...prev,
                "event": latestEventTime,
                "club": latestClubTime
            }));
        }, noopErr);

        // Latest Group Post
        const qGroupPosts = query(collection(db, "groupPosts"), orderBy("createdAt", "desc"), limit(1));
        const unsubGroupPosts = onSnapshot(qGroupPosts, (snap) => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const date = doc.data().createdAt?.toMillis?.() || doc.data().createdAt?.seconds * 1000 || 0;
                setLatestUpdate(prev => ({ ...prev, "group": date }));
            }
        }, noopErr);

        // Latest Story
        const qStories = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(1));
        const unsubStories = onSnapshot(qStories, (snap) => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const date = doc.data().createdAt?.toMillis?.() || doc.data().createdAt?.seconds * 1000 || 0;
                setLatestUpdate(prev => ({ ...prev, "story": date }));
            }
        }, noopErr);

        // Latest Notice
        const qNotices = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(1));
        const unsubNotices = onSnapshot(qNotices, (snap) => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const date = doc.data().createdAt?.toMillis?.() || doc.data().createdAt?.seconds * 1000 || 0;
                setLatestUpdate(prev => ({ ...prev, "notice": date }));
            }
        }, noopErr);

        // Latest Study Post
        const qStudy = query(collection(db, "studyPosts"), orderBy("createdAt", "desc"), limit(1));
        const unsubStudy = onSnapshot(qStudy, (snap) => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const date = doc.data().createdAt?.toMillis?.() || doc.data().createdAt?.seconds * 1000 || 0;
                setLatestUpdate(prev => ({ ...prev, "study": date }));
            }
        }, noopErr);

        return () => {
            unsubPosts();
            unsubGroupPosts();
            unsubStories();
            unsubNotices();
            unsubStudy();
        };
    }, []);

    // 3. Keep lastSeen state in sync with localStorage updates on a short interval
    useEffect(() => {
        if (typeof window === "undefined") return;
        
        const checkLocalStorage = () => {
            const feed = Number(localStorage.getItem("ttc_last_seen_event") || "0");
            const club = Number(localStorage.getItem("ttc_last_seen_club") || "0");
            const group = Number(localStorage.getItem("ttc_last_seen_group") || "0");
            const story = Number(localStorage.getItem("ttc_last_seen_story") || "0");
            const notice = Number(localStorage.getItem("ttc_last_seen_notice") || "0");
            const study = Number(localStorage.getItem("ttc_last_seen_study") || "0");

            setLastSeen(prev => {
                if (
                    prev.event === feed &&
                    prev.club === club &&
                    prev.group === group &&
                    prev.story === story &&
                    prev.notice === notice &&
                    prev.study === study
                ) {
                    return prev;
                }
                return {
                    event: feed,
                    club: club,
                    group,
                    story,
                    notice,
                    study
                };
            });
        };

        const interval = setInterval(checkLocalStorage, 1000);
        return () => clearInterval(interval);
    }, []);

    // 4. Update lastSeen reactively based on current pathname
    useEffect(() => {
        if (typeof window === "undefined") return;
        const now = Date.now();
        
        if (pathname === "/news-feed") {
            // By default, we mark the current activeTab as seen (which will be updated by page.tsx),
            // but we can also mark event seen here.
            localStorage.setItem("ttc_last_seen_event", now.toString());
            setLastSeen(prev => ({ ...prev, event: now }));
        } else if (pathname.startsWith("/story")) {
            localStorage.setItem("ttc_last_seen_story", now.toString());
            setLastSeen(prev => ({ ...prev, story: now }));
        } else if (pathname === "/notice") {
            localStorage.setItem("ttc_last_seen_notice", now.toString());
            setLastSeen(prev => ({ ...prev, notice: now }));
        } else if (pathname === "/study") {
            localStorage.setItem("ttc_last_seen_study", now.toString());
            setLastSeen(prev => ({ ...prev, study: now }));
        } else if (pathname === "/groups") {
            localStorage.setItem("ttc_last_seen_group", now.toString());
            setLastSeen(prev => ({ ...prev, group: now }));
        }
    }, [pathname]);

    // 5. Manual mark read function when clicked
    const markAsSeen = (section: string) => {
        if (typeof window === "undefined") return;
        const now = Date.now();
        if (section === "news-feed") {
            localStorage.setItem("ttc_last_seen_event", now.toString());
            localStorage.setItem("ttc_last_seen_club", now.toString());
            localStorage.setItem("ttc_last_seen_group", now.toString());
            setLastSeen(prev => ({ ...prev, event: now, club: now, group: now }));
        } else {
            localStorage.setItem(`ttc_last_seen_${section}`, now.toString());
            setLastSeen(prev => ({ ...prev, [section]: now }));
        }
    };

    return { lastSeen, latestUpdate, markAsSeen };
}
