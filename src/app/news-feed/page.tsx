"use client";

import { useState, useMemo, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
    Plus, X, Shield, Loader2, Image as ImageIcon, Calendar,
    Award, Globe, Users, Bookmark, Sparkles, Filter,
    CheckCircle2, Compass, School, ChevronRight, MessageSquare,
    ChevronLeft, ArrowRight, ExternalLink, BarChart2,
    Menu, Bell, BookOpen, ChevronDown, Check
} from "lucide-react";
import NewsFeedLeftSidebar from "./components/NewsFeedLeftSidebar";
import { colleges } from "@/data/colleges";
import { 
    subscribePosts, subscribeModerationCount, deletePost,
    toggleSavePost, subscribeSavedPosts,
    subscribeMyGroups, subscribeMyGroupFeed,
    type FirestorePost,
    getDocById
} from "@/lib/firestore";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import PostCard from "@/components/PostCard";
import GroupPostCard from "@/components/GroupPostCard";
import GroupCreationModal from "@/components/GroupCreationModal";
import GroupPostCreationModal from "@/components/GroupPostCreationModal";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import SearchBar from "./components/SearchBar";
import PostCreationModal from "@/components/PostCreationModal";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

/* ─── Post type alias for Firestore data ─── */
type Post = FirestorePost & { id: string };

const FEED_TABS = ["event", "club", "group"] as const;
type FeedTab = (typeof FEED_TABS)[number];

/* ─── Directional Slide Variants for Butter-Smooth Tab Switching ─── */
const slideVariants: Variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: {
            x: { type: "spring", stiffness: 350, damping: 30 },
            opacity: { duration: 0.2 }
        }
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
        transition: {
            x: { type: "spring", stiffness: 350, damping: 30 },
            opacity: { duration: 0.15 }
        }
    })
};

/* ─── MAIN PAGE ─── */
function NewsFeedInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { profile, loading: loadingAuth } = useAuth();
    const { requireVerification } = useVerifiedAccess();
    const { isScrollingDown } = useScrollDirection();
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeTab, setActiveTab] = useState<FeedTab>("event");
    const [tabDirection, setTabDirection] = useState<number>(0);
    const [selectedFilter, setSelectedFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [isMobileLeftMenuOpen, setIsMobileLeftMenuOpen] = useState(false);
    const [isMobileCampusDropdownOpen, setIsMobileCampusDropdownOpen] = useState(false);

    // Auto-close mobile campus dropdown on scroll
    useEffect(() => {
        if (!isMobileCampusDropdownOpen) return;
        const handleScroll = () => {
            setIsMobileCampusDropdownOpen(false);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isMobileCampusDropdownOpen]);

    // Sync tab param with activeTab state
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "event" || tabParam === "club" || tabParam === "group") {
            const currentIdx = FEED_TABS.indexOf(activeTab);
            const targetIdx = FEED_TABS.indexOf(tabParam);
            setTabDirection(targetIdx > currentIdx ? 1 : targetIdx < currentIdx ? -1 : 0);
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Timestamps and group states for tab badges
    const getMs = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts.toDate === "function") return ts.toDate().getTime();
        if (typeof ts.seconds === "number") return ts.seconds * 1000;
        if (typeof ts._seconds === "number") return ts._seconds * 1000;
        return new Date(ts).getTime();
    };

    const [lastSeenEvent, setLastSeenEvent] = useState<number>(0);
    const [lastSeenClub, setLastSeenClub] = useState<number>(0);
    const [lastSeenGroup, setLastSeenGroup] = useState<number>(0);
    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [groupPosts, setGroupPosts] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const now = Date.now();
            const storedEvent = localStorage.getItem("ttc_last_seen_event");
            const storedClub = localStorage.getItem("ttc_last_seen_club");
            const storedGroup = localStorage.getItem("ttc_last_seen_group");

            if (!storedEvent) localStorage.setItem("ttc_last_seen_event", now.toString());
            if (!storedClub) localStorage.setItem("ttc_last_seen_club", now.toString());
            if (!storedGroup) localStorage.setItem("ttc_last_seen_group", now.toString());

            setLastSeenEvent(Number(storedEvent || now));
            setLastSeenClub(Number(storedClub || now));
            setLastSeenGroup(Number(storedGroup || now));
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && activeTab) {
            const now = Date.now();
            localStorage.setItem(`ttc_last_seen_${activeTab}`, now.toString());
            if (activeTab === "event") setLastSeenEvent(now);
            if (activeTab === "club") setLastSeenClub(now);
            if (activeTab === "group") setLastSeenGroup(now);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!profile?.uid) return;
        const unsubGroups = subscribeMyGroups(profile.uid, (groups) => {
            setMyGroups(groups);
        });
        return () => unsubGroups();
    }, [profile]);

    useEffect(() => {
        if (myGroups.length === 0) {
            setGroupPosts([]);
            return;
        }
        const groupIds = myGroups.map(g => g.id);
        const unsubGroupPosts = subscribeMyGroupFeed(groupIds, (posts) => {
            setGroupPosts(posts);
        });
        return () => unsubGroupPosts();
    }, [myGroups]);

    const unseenCounts = useMemo(() => {
        const eventCount = posts.filter(p => (p.type || "event") === "event" && getMs(p.timestamp) > lastSeenEvent).length;
        const clubCount = posts.filter(p => p.type === "club" && getMs(p.timestamp) > lastSeenClub).length;
        const groupCount = groupPosts.filter(gp => getMs(gp.createdAt) > lastSeenGroup).length;
        return {
            event: activeTab === "event" ? 0 : eventCount,
            club: activeTab === "club" ? 0 : clubCount,
            group: activeTab === "group" ? 0 : groupCount
        };
    }, [posts, groupPosts, lastSeenEvent, lastSeenClub, lastSeenGroup, activeTab]);

    // States
    const [searchQuery, setSearchQuery] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const [composerDefaultType, setComposerDefaultType] = useState<"event" | "club">("event");
    const [showOnlySaved, setShowOnlySaved] = useState(false);
    const [showModeration, setShowModeration] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

    // Group Modals
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isGroupPostModalOpen, setIsGroupPostModalOpen] = useState(false);
    const [selectedComposerGroup, setSelectedComposerGroup] = useState<any>(null);
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
    const [expandedImageModal, setExpandedImageModal] = useState<string | null>(null);

    /* ─── Unified Tab Switching with Direction Tracking ─── */
    const handleTabSwitch = useCallback((nextTab: FeedTab, explicitDirection?: number) => {
        if (nextTab === activeTab && !showOnlySaved) return;

        const currentIdx = FEED_TABS.indexOf(activeTab);
        const targetIdx = FEED_TABS.indexOf(nextTab);
        const dir = explicitDirection ?? (targetIdx > currentIdx ? 1 : -1);

        setTabDirection(dir);
        setActiveTab(nextTab);
        setShowOnlySaved(false);

        if (typeof window !== "undefined") {
            const now = Date.now();
            localStorage.setItem(`ttc_last_seen_${nextTab}`, now.toString());
            if (nextTab === "event") setLastSeenEvent(now);
            if (nextTab === "club") setLastSeenClub(now);
            if (nextTab === "group") setLastSeenGroup(now);

            // Shallow URL query parameter update without page reload
            const url = new URL(window.location.href);
            url.searchParams.set("tab", nextTab);
            window.history.replaceState({}, "", url.toString());
        }
    }, [activeTab, showOnlySaved]);

    // Swipe handlers:
    // Swiping right-to-left (finger moves left) -> advance to NEXT tab
    const onSwipeLeft = useCallback(() => {
        if (showOnlySaved) return;
        if (activeTab === "event") {
            handleTabSwitch("club", 1);
        } else if (activeTab === "club") {
            handleTabSwitch("group", 1);
        }
    }, [activeTab, handleTabSwitch, showOnlySaved]);

    // Swiping left-to-right (finger moves right) -> retreat to PREVIOUS tab
    const onSwipeRight = useCallback(() => {
        if (showOnlySaved) return;
        if (activeTab === "group") {
            handleTabSwitch("club", -1);
        } else if (activeTab === "club") {
            handleTabSwitch("event", -1);
        }
    }, [activeTab, handleTabSwitch, showOnlySaved]);

    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const { confirm, setIsLoading, close } = useConfirm();
    const { showToast } = useToast();

    // Attach horizontal swipe gesture
    const swipeContainerRef = useSwipeGesture<HTMLDivElement>({
        onSwipeLeft,
        onSwipeRight,
        minDistance: 45,
        minVelocity: 0.22,
        disabled: isSharing || !!editingPost || showModeration || isCreateGroupOpen || isGroupPostModalOpen || isGroupSelectorOpen || !!expandedImageModal,
        enableHaptics: true
    });

    // Keyboard Shortcuts (Alt + Left/Right arrow to switch tabs)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSharing || !!editingPost || showModeration) return;
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea") return;

            if (e.altKey && e.key === "ArrowRight") {
                e.preventDefault();
                onSwipeLeft();
            } else if (e.altKey && e.key === "ArrowLeft") {
                e.preventDefault();
                onSwipeRight();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSharing, editingPost, showModeration, onSwipeLeft, onSwipeRight]);

    const [targetPostId, setTargetPostId] = useState<string | null>(null);
    const [temporaryHighlightId, setTemporaryHighlightId] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const hasScrolledRef = useRef<string | null>(null);

    useEffect(() => {
        const unsubPosts = subscribePosts((data) => {
            setPosts(data as (FirestorePost & { id: string })[]);
            setLoading(false);
        });

        const unsubCount = subscribeModerationCount(
            "posts",
            profile?.collegeId,
            profile?.role === "admin" || profile?.role === "super_manager",
            (count) => setPendingCount(count)
        );

        let unsubSaved = () => {};
        if (profile?.uid) {
            unsubSaved = subscribeSavedPosts(profile.uid, (ids) => {
                setSavedPostIds(ids);
            });
        } else {
            setSavedPostIds([]);
        }

        return () => {
            unsubPosts();
            unsubCount();
            unsubSaved();
        };
    }, [profile]);

    const userCollege = useMemo(() => {
        if (!profile?.collegeId) return null;
        return colleges.find(c => c.id === profile.collegeId) || null;
    }, [profile?.collegeId]);

    const selectedCollege = useMemo(() => colleges.find(c => c.id === selectedFilter), [selectedFilter]);
    const currentFilterLabel = useMemo(() => {
        if (selectedFilter === "all") return "All Colleges";
        if (selectedFilter === profile?.collegeId) {
            return `My Campus (${userCollege?.shortName || userCollege?.city || selectedCollege?.shortName || selectedCollege?.city || "Campus"})`;
        }
        return selectedCollege?.shortName || `${selectedCollege?.city || "Campus"} TTC`;
    }, [selectedFilter, profile?.collegeId, userCollege, selectedCollege]);

    const userName = profile?.displayName || "";
    const rawFirstName = userName ? userName.split(" ")[0] : "";
    const firstName = rawFirstName 
        ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) 
        : "";

    const openComposer = (type: "event" | "club" = "event") => {
        if (requireVerification("share updates")) {
            setComposerDefaultType(type);
            setIsSharing(true);
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!requireVerification("delete posts")) return;
        const confirmed = await confirm({
            title: "Delete Post?",
            message: "Are you sure you want to delete this post? This action is permanent and cannot be undone.",
            confirmText: "Delete Post",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deletePost(id);
        } catch (err) {
            console.error("Delete post failed:", err);
            showToast("Failed to delete post.", "error");
        } finally {
            close();
        }
    };

    const handleSavePost = async (postId: string) => {
        if (!requireVerification("bookmark posts")) return;
        if (!profile?.uid) {
            showToast("Please log in to bookmark posts.", "error");
            return;
        }
        try {
            const isSaved = await toggleSavePost(profile.uid, postId);
            if (isSaved) {
                showToast("Post bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
            }
        } catch (err) {
            console.error("Error bookmarking post:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    const handleEditStart = (post: Post) => {
        if (!requireVerification("edit posts")) return;
        setEditingPost(post);
    };

    const [hashPostId, setHashPostId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleHashChange = () => {
                const hash = window.location.hash;
                if (hash.startsWith("#post-")) {
                    setHashPostId(hash.substring(6));
                }
            };
            handleHashChange();
            window.addEventListener("hashchange", handleHashChange);
            return () => window.removeEventListener("hashchange", handleHashChange);
        }
    }, []);

    const [fetchedTargetPostId, setFetchedTargetPostId] = useState<string | null>(null);

    useEffect(() => {
        const effectivePostId = searchParams.get('post') || searchParams.get('commentPostId') || hashPostId;
        if (!effectivePostId || loading) return;

        const existsInPosts = posts.some(p => p.id === effectivePostId);
        if (!existsInPosts && fetchedTargetPostId !== effectivePostId) {
            getDocById("posts", effectivePostId).then((fetchedPost) => {
                if (fetchedPost) {
                    setPosts(prev => {
                        if (prev.some(p => p.id === fetchedPost.id)) return prev;
                        return [fetchedPost as Post, ...prev];
                    });
                    setFetchedTargetPostId(effectivePostId);
                }
            }).catch(console.error);
        }
    }, [searchParams, posts, loading, hashPostId, fetchedTargetPostId]);

    useEffect(() => {
        const effectivePostId = searchParams.get('post') || searchParams.get('commentPostId') || hashPostId;
        if (!effectivePostId || posts.length === 0) return;

        const targetPost = posts.find(p => p.id === effectivePostId);
        if (targetPost) {
            const requiredTab = targetPost.type === "club" ? "club" : "event";
            if (activeTab !== requiredTab) {
                setActiveTab(requiredTab);
            }
            if (searchParams.get("edit") === "true") {
                setEditingPost(targetPost);
            }
        }

        if (hasScrolledRef.current === effectivePostId) return;

        const timer = setTimeout(() => {
            const targetElement = document.getElementById(`post-${effectivePostId}`);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTargetPostId(effectivePostId);
                setTemporaryHighlightId(effectivePostId);
                hasScrolledRef.current = effectivePostId;
                setTimeout(() => setTemporaryHighlightId(null), 3000);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [searchParams, posts, editingPost, hashPostId]);

    // Filtered regular posts (Global & Club)
    const filteredPosts = useMemo(() => {
        return posts.filter((p) => {
            if (showOnlySaved) {
                if (!savedPostIds.includes(p.id)) return false;
            } else {
                if ((p.type || "event") !== activeTab) return false;
            }
            if (selectedFilter !== "all" && p.collegeId !== selectedFilter) return false;
            
            const vis = p.visibility || "public";
            if (vis === "campus" || vis === "private") {
                if (profile?.uid === p.creatorId) { /* pass */ }
                else if (!profile?.collegeId || profile.collegeId !== p.collegeId) return false;
            }
            
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    p.eventName?.toLowerCase().includes(q) || 
                    p.description?.toLowerCase().includes(q) ||
                    p.createdBy.name.toLowerCase().includes(q)
                );
            }

            if (selectedTag && !p.description?.toLowerCase().includes(`#${selectedTag.toLowerCase()}`)) return false;
            return true;
        });
    }, [selectedFilter, posts, activeTab, searchQuery, selectedTag, profile?.collegeId, profile?.uid, showOnlySaved, savedPostIds]);

    // Filtered group posts (Campus Groups Feed)
    const filteredGroupPosts = useMemo(() => {
        return groupPosts.filter((gp) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    gp.content?.toLowerCase().includes(q) ||
                    gp.authorName?.toLowerCase().includes(q) ||
                    gp.groupName?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [groupPosts, searchQuery]);

    const handleOpenGroupComposer = () => {
        if (!requireVerification("post in groups")) return;
        if (myGroups.length === 0) {
            showToast("Join a group first to post in campus groups.", "info");
            router.push("/groups?tab=discover");
            return;
        }
        if (myGroups.length === 1) {
            setSelectedComposerGroup(myGroups[0]);
            setIsGroupPostModalOpen(true);
        } else {
            setIsGroupSelectorOpen(true);
        }
    };

    const effectivePostId = searchParams.get('post') || searchParams.get('commentPostId') || hashPostId;
    const isPostMissing = !loading && effectivePostId && !posts.some(p => p.id === effectivePostId);

    if (isPostMissing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50/50 dark:bg-[#0c0c10]">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <X size={28} />
                </div>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">This content is no longer available</h1>
                <p className="text-gray-500 max-w-sm mb-6 leading-relaxed text-sm">The post or conversation you are trying to view has been deleted or is not accessible.</p>
                <button onClick={() => router.push('/news-feed')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Back to Feed</button>
            </div>
        );
    }

    const selectedCollegeName = colleges.find(c => c.id === selectedFilter)?.shortName || colleges.find(c => c.id === selectedFilter)?.city;
    const hasActiveFilters = selectedFilter !== "all" || searchQuery.trim() !== "" || selectedTag !== null || showOnlySaved;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0c10] text-gray-900 dark:text-gray-100 transition-colors">
            
            {/* ─── Sleek Sticky Control Bar ─── */}
            <header className={`sticky top-0 md:top-16 z-30 bg-white/95 dark:bg-[#121319]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 shadow-xs transition-transform duration-300 ease-in-out ${(isScrollingDown || isSharing) && !isMobileCampusDropdownOpen ? "max-md:-translate-y-full max-md:pointer-events-none" : "max-md:translate-y-0"}`}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-4">
                    
                    {/* Left: Live Status & Feed Title */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Mobile Menu Drawer Toggle Button */}
                        <button
                            onClick={() => setIsMobileLeftMenuOpen(true)}
                            className="lg:hidden p-2 -ml-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Open Profile & Menu"
                            aria-label="Navigation Menu"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="relative flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white truncate">
                                News Feed
                            </h1>
                            {selectedCollegeName && (
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                    <School size={12} /> {selectedCollegeName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Search */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SearchBar onSearch={setSearchQuery} />
                    </div>
                </div>

                {/* Mobile Campus Filter Dropdown (Matches Desktop/Drawer 'Select Campus' Dropdown) */}
                <div className="lg:hidden border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/70 dark:bg-[#151720]/70 px-4 sm:px-6 py-2 relative">
                    <div className="max-w-md mx-auto relative">
                        <button
                            type="button"
                            onClick={() => setIsMobileCampusDropdownOpen(prev => !prev)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left group cursor-pointer border shadow-xs ${
                                selectedFilter !== "all"
                                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30"
                                    : "bg-white dark:bg-[#161822] text-gray-700 dark:text-gray-200 border-gray-200/80 dark:border-gray-800/80 hover:bg-gray-100/80 dark:hover:bg-gray-800/70"
                            }`}
                        >
                            <span className="flex items-center gap-2.5 min-w-0 flex-1">
                                <School size={16} className="text-amber-500 shrink-0" />
                                <span className="truncate">Select Campus</span>
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full truncate max-w-[140px] ${
                                    selectedFilter !== "all"
                                        ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                }`}>
                                    {currentFilterLabel}
                                </span>
                                <ChevronDown 
                                    size={14} 
                                    className={`text-gray-400 transition-transform duration-200 ${isMobileCampusDropdownOpen ? "rotate-180 text-primary" : ""}`} 
                                />
                            </div>
                        </button>

                        {/* Expandable Dropdown List */}
                        <AnimatePresence>
                            {isMobileCampusDropdownOpen && (
                                <>
                                    {/* Backdrop for click outside dismissal */}
                                    <div 
                                        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[1px]"
                                        onClick={() => setIsMobileCampusDropdownOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-2xl overflow-hidden"
                                    >
                                        <div className="py-1.5 px-1 space-y-1 max-h-64 overflow-y-auto no-scrollbar shadow-inner">
                                            {/* All Colleges Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowOnlySaved(false);
                                                    setSelectedFilter("all");
                                                    setIsMobileCampusDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                    selectedFilter === "all"
                                                        ? "bg-primary text-white shadow-xs font-black"
                                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Globe size={13} className={selectedFilter === "all" ? "text-white" : "text-gray-400"} />
                                                    <span>All Colleges</span>
                                                </span>
                                                {selectedFilter === "all" && <Check size={14} className="shrink-0" />}
                                            </button>

                                            {/* My Campus (Pinned if available) */}
                                            {profile?.collegeId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowOnlySaved(false);
                                                        setSelectedFilter(profile.collegeId);
                                                        setIsMobileCampusDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                        selectedFilter === profile.collegeId
                                                            ? "bg-amber-500 text-white shadow-xs font-black"
                                                            : "text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 truncate">
                                                        <School size={13} className={selectedFilter === profile.collegeId ? "text-white" : "text-amber-500"} />
                                                        <span className="truncate">My Campus ({userCollege?.shortName || userCollege?.city || "Campus"})</span>
                                                    </span>
                                                    {selectedFilter === profile.collegeId && <Check size={14} className="shrink-0" />}
                                                </button>
                                            )}

                                            {/* Divider */}
                                            <div className="border-t border-gray-200/60 dark:border-gray-800 my-1 mx-2" />

                                            {/* All 15 TTC Colleges */}
                                            {colleges.map((col) => {
                                                const isSelected = selectedFilter === col.id;
                                                const isMyCollege = profile?.collegeId === col.id;
                                                return (
                                                    <button
                                                        key={col.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setShowOnlySaved(false);
                                                            setSelectedFilter(col.id);
                                                            setIsMobileCampusDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                                            isSelected
                                                                ? "bg-primary text-white shadow-xs font-black"
                                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                                                        }`}
                                                    >
                                                        <span className="truncate flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-gray-400"}`} />
                                                            <span className="truncate">{col.shortName || `${col.city} TTC`}</span>
                                                            {col.gender === "women" && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                                    isSelected ? "bg-white/25 text-white" : "bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                                                                }`}>
                                                                    Women
                                                                </span>
                                                            )}
                                                            {col.gender === "men" && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                                    isSelected ? "bg-white/25 text-white" : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                                }`}>
                                                                    Men
                                                                </span>
                                                            )}
                                                            {isMyCollege && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                                                    isSelected ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                                }`}>
                                                                    My
                                                                </span>
                                                            )}
                                                        </span>
                                                        {isSelected && <Check size={14} className="shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* ─── Main Content Container (3-column on Desktop, 1-column on Mobile) ─── */}
            <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-7">
                <div className="lg:grid lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_310px] gap-6 items-start">
                    
                    {/* ─── Left Desktop Sidebar (Sticky Hub) ─── */}
                    <aside className="hidden lg:block space-y-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto no-scrollbar pb-10">
                        <NewsFeedLeftSidebar
                            profile={profile}
                            userCollege={userCollege}
                            activeTab={activeTab}
                            onTabSwitch={(tab) => handleTabSwitch(tab)}
                            showOnlySaved={showOnlySaved}
                            onToggleSaved={(saved) => setShowOnlySaved(saved)}
                            savedCount={savedPostIds.length}
                            selectedFilter={selectedFilter}
                            onSelectFilter={(collegeId) => setSelectedFilter(collegeId)}
                            myGroups={myGroups}
                            onCreateGroup={() => setIsCreateGroupOpen(true)}
                            onOpenModeration={() => setShowModeration(true)}
                            pendingCount={pendingCount}
                            unseenClubCount={unseenCounts.club}
                            unseenGroupCount={unseenCounts.group}
                        />
                    </aside>

                    {/* ─── Center Feed Column (Swipeable Container) ─── */}
                    <div 
                        ref={swipeContainerRef}
                        className="w-full max-w-[660px] mx-auto space-y-5 touch-pan-y min-w-0"
                    >
                        
                        {/* Feed Navigation Tabs (Segmented Control with Animated Pill) */}
                        <div className="bg-white dark:bg-[#161822] p-1.5 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 flex-1">
                                    {(
                                        [
                                            { id: "event" as const, shortLabel: "Global", label: "Global Feed", icon: Globe, count: unseenCounts.event },
                                            { id: "club" as const, shortLabel: "Clubs", label: "College Clubs", icon: Sparkles, count: unseenCounts.club },
                                            { id: "group" as const, shortLabel: "Groups", label: "Groups", icon: Users, count: unseenCounts.group }
                                        ]
                                    ).map((tab) => {
                                        const isActive = !showOnlySaved && activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => handleTabSwitch(tab.id)}
                                                className={`relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer select-none ${
                                                    isActive 
                                                        ? "text-white" 
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60"
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeFeedTabIndicator"
                                                        className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
                                                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                                    />
                                                )}
                                                <span className="relative z-10 flex items-center gap-1.5 sm:gap-2 truncate">
                                                    <Icon size={14} className={isActive ? "text-white" : "text-gray-400"} />
                                                    <span className="sm:hidden">{tab.shortLabel}</span>
                                                    <span className="hidden sm:inline truncate">{tab.label}</span>
                                                    {tab.count > 0 && (
                                                        <span className={`min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                                                            isActive ? "bg-white text-primary" : "bg-red-500 text-white animate-pulse"
                                                        }`}>
                                                            {tab.count}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Saved Posts Quick Toggle */}
                                {profile?.uid && (
                                    <button
                                        onClick={() => setShowOnlySaved(!showOnlySaved)}
                                        title={showOnlySaved ? "Show All Posts" : "Show Bookmarked Posts"}
                                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 ${
                                            showOnlySaved
                                                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                                : "border-gray-200/80 dark:border-gray-700/80 text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                        }`}
                                    >
                                        <Bookmark size={15} className={showOnlySaved ? "fill-white" : ""} />
                                        <span className="hidden sm:inline text-[11px] font-bold">
                                            {showOnlySaved ? "Saved" : savedPostIds.length > 0 ? savedPostIds.length : ""}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Mobile Swipe Guidance Indicator */}
                            <div className="md:hidden mt-1 pt-1 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between px-2 text-[10px] text-gray-400 dark:text-gray-500 font-semibold select-none">
                                <span className="flex items-center gap-1">
                                    <ChevronLeft size={12} /> Swipe
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {FEED_TABS.map((tabKey) => (
                                        <span
                                            key={tabKey}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                activeTab === tabKey && !showOnlySaved
                                                    ? "w-4 bg-primary"
                                                    : "w-1.5 bg-gray-300 dark:bg-gray-700"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="flex items-center gap-1">
                                    Switch <ChevronRight size={12} />
                                </span>
                            </div>
                        </div>

                        {/* ─── ANIMATED FEED SWITCHER ─── */}
                        <AnimatePresence mode="wait" custom={tabDirection}>
                            <motion.div
                                key={showOnlySaved ? "saved" : activeTab}
                                custom={tabDirection}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="space-y-6"
                            >
                                {/* ════════════════════════════════════════════════
                                    TAB 1 & 2: GLOBAL OR CLUB FEED
                                   ════════════════════════════════════════════════ */}
                                {!showOnlySaved && (activeTab === "event" || activeTab === "club") && (
                                    <>
                                        {/* Inline Post Composer Card */}
                                        <div className="bg-white dark:bg-[#161822] rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3">
                                                <Link 
                                                    href={profile?.uid ? `/profile/${profile.uid}` : "#"} 
                                                    className="flex-shrink-0 group/avatar"
                                                    title={userName ? `View ${userName}'s Profile` : "Profile"}
                                                >
                                                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-black text-primary text-sm sm:text-base overflow-hidden shadow-inner group-hover/avatar:ring-2 ring-primary/40 transition-all">
                                                        {profile?.photoURL ? (
                                                            <img src={profile.photoURL} alt={userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            (userName || "U").charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                </Link>

                                                <button
                                                    onClick={() => openComposer(activeTab)}
                                                    className="flex-1 text-left px-4 sm:px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-gray-700/60 text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-semibold transition-all group/btn cursor-pointer"
                                                >
                                                    <span className="group-hover/btn:text-gray-700 dark:group-hover/btn:text-gray-200 transition-colors">
                                                        {firstName 
                                                            ? activeTab === "club" 
                                                                ? `Share a club announcement or project, ${firstName}?`
                                                                : `What's happening on campus, ${firstName}?` 
                                                            : "Share an update, event, or announcement..."}
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Quick Action Chips */}
                                            <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/70 flex items-center justify-between gap-1.5 sm:gap-2">
                                                <button
                                                    onClick={() => openComposer(activeTab)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1.5 sm:px-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] sm:text-xs font-bold transition-all group/action"
                                                >
                                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center group-hover/action:scale-110 transition-transform flex-shrink-0">
                                                        <ImageIcon size={15} className="text-emerald-500" />
                                                    </div>
                                                    <span className="truncate">
                                                        <span className="sm:hidden">Photo</span>
                                                        <span className="hidden sm:inline">Photo / Media</span>
                                                    </span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => openComposer("event")}
                                                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1.5 sm:px-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] sm:text-xs font-bold transition-all group/action"
                                                >
                                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center group-hover/action:scale-110 transition-transform flex-shrink-0">
                                                        <Calendar size={15} className="text-blue-500" />
                                                    </div>
                                                    <span className="truncate">
                                                        <span className="sm:hidden">Event</span>
                                                        <span className="hidden sm:inline">Campus Event</span>
                                                    </span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => openComposer("club")}
                                                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-1.5 sm:px-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 text-[11px] sm:text-xs font-bold transition-all group/action"
                                                >
                                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center group-hover/action:scale-110 transition-transform flex-shrink-0">
                                                        <Award size={15} className="text-amber-500" />
                                                    </div>
                                                    <span className="truncate">
                                                        <span className="sm:hidden">Club</span>
                                                        <span className="hidden sm:inline">Club Activity</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Active Filter Pill Strip */}
                                        {hasActiveFilters && (
                                            <div className="flex flex-wrap items-center gap-2 px-1 py-1">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                    <Filter size={12} /> Filters:
                                                </span>

                                                {selectedFilter !== "all" && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold">
                                                        <School size={11} /> {selectedCollegeName}
                                                        <button onClick={() => setSelectedFilter("all")} className="hover:opacity-75 ml-0.5">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                )}

                                                {selectedTag && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-full text-xs font-bold shadow-xs">
                                                        #{selectedTag}
                                                        <button onClick={() => setSelectedTag(null)} className="hover:opacity-75 ml-0.5">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                )}

                                                {searchQuery && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold">
                                                        "{searchQuery}"
                                                        <button onClick={() => setSearchQuery("")} className="hover:opacity-75 ml-0.5">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        setSelectedFilter("all");
                                                        setSelectedTag(null);
                                                        setSearchQuery("");
                                                        setShowOnlySaved(false);
                                                    }}
                                                    className="text-[11px] font-bold text-gray-500 hover:text-red-500 underline underline-offset-2 ml-auto"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                        )}

                                        {/* Feed Posts List */}
                                        {loading ? (
                                            <div className="space-y-6">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="bg-white dark:bg-[#161822] rounded-3xl p-6 border border-gray-200/60 dark:border-gray-800 animate-pulse space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="h-4 bg-gray-100 dark:bg-gray-800 w-1/3 rounded-full" />
                                                                <div className="h-3 bg-gray-50 dark:bg-gray-900 w-1/4 rounded-full" />
                                                            </div>
                                                        </div>
                                                        <div className="h-4 bg-gray-100 dark:bg-gray-800 w-3/4 rounded-full" />
                                                        <div className="h-44 bg-gray-50 dark:bg-gray-900/60 rounded-2xl" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-6 pb-24">
                                                {filteredPosts.map(post => (
                                                    <div 
                                                        key={post.id} 
                                                        id={`post-${post.id}`} 
                                                        className={`rounded-[2.5rem] transition-all duration-500 ${
                                                            temporaryHighlightId === post.id 
                                                                ? 'ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-[#0f1117] shadow-xl' 
                                                                : targetPostId === post.id 
                                                                    ? 'ring-2 ring-primary/50' 
                                                                    : ''
                                                        }`}
                                                    >
                                                        <PostCard
                                                            post={post}
                                                            profile={profile}
                                                            onEdit={handleEditStart}
                                                            onDelete={handleDeletePost}
                                                            onApprove={() => {}}
                                                            onReject={() => {}}
                                                            isSaved={savedPostIds.includes(post.id)}
                                                            onSave={handleSavePost}
                                                            autoFocus={targetPostId === post.id}
                                                            onTagClick={(tag: string) => setSelectedTag(tag)}
                                                        />
                                                    </div>
                                                ))}

                                                {filteredPosts.length === 0 && (
                                                    <div className="text-center py-16 px-6 bg-white dark:bg-[#161822] rounded-3xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col items-center">
                                                        <span className="text-5xl mb-4">{searchQuery ? "🔍" : activeTab === "club" ? "🏛️" : "🏜️"}</span>
                                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                            {searchQuery 
                                                                ? `No results for "${searchQuery}"` 
                                                                : activeTab === "club"
                                                                    ? "No club activities posted yet"
                                                                    : "Quiet on this campus feed"}
                                                        </h3>
                                                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                                            {searchQuery 
                                                                ? "Try searching for a different keyword or campus name." 
                                                                : activeTab === "club"
                                                                    ? "Connect your college clubs and post updates, workshops, and achievements here!"
                                                                    : "Be the first to share an update, event, or announcement from this campus!"}
                                                        </p>
                                                        <div className="mt-6 flex flex-wrap gap-3 justify-center">
                                                            {hasActiveFilters && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setSearchQuery("");
                                                                        setSelectedTag(null);
                                                                        setSelectedFilter("all");
                                                                    }}
                                                                    className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    Clear Filters
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => openComposer(activeTab)}
                                                                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
                                                            >
                                                                <Plus size={14} /> Create Post
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ════════════════════════════════════════════════
                                    TAB 3: CAMPUS GROUPS FEED (Directly in NewsFeed!)
                                   ════════════════════════════════════════════════ */}
                                {!showOnlySaved && activeTab === "group" && (
                                    <>
                                        {/* Groups Hub Quick Header Banner */}
                                        <div className="bg-white dark:bg-[#161822] rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-[#1877F2] flex items-center justify-center font-black shrink-0 shadow-inner">
                                                    <Users size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white">
                                                            Campus Groups
                                                        </h2>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1877F2]/10 text-[#1877F2]">
                                                            {myGroups.length} {myGroups.length === 1 ? "Group" : "Groups"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        Updates from study circles, tech hubs, and student batches
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        if (requireVerification("create groups")) {
                                                            setIsCreateGroupOpen(true);
                                                        }
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} /> New Group
                                                </button>
                                                <Link
                                                    href="/groups"
                                                    className="px-3.5 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5"
                                                >
                                                    Groups Hub <ExternalLink size={13} />
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Group Post Composer Trigger */}
                                        {profile?.uid && myGroups.length > 0 && (
                                            <div className="bg-white dark:bg-[#161822] rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-black text-[#1877F2] text-sm sm:text-base overflow-hidden shadow-inner shrink-0">
                                                        {profile?.photoURL ? (
                                                            <img src={profile.photoURL} alt={userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            (userName || "U").charAt(0).toUpperCase()
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={handleOpenGroupComposer}
                                                        className="flex-1 text-left px-4 sm:px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-800 border border-gray-200/70 dark:border-gray-700/60 text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-semibold transition-all group/btn cursor-pointer"
                                                    >
                                                        <span className="group-hover/btn:text-gray-700 dark:group-hover/btn:text-gray-200 transition-colors">
                                                            {firstName ? `Write something in your campus groups, ${firstName}?` : "Share a note, question, or update in your groups..."}
                                                        </span>
                                                    </button>
                                                </div>

                                                <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/70 flex items-center justify-between gap-2">
                                                    <button
                                                        onClick={handleOpenGroupComposer}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition-all"
                                                    >
                                                        <ImageIcon size={16} className="text-emerald-500" />
                                                        <span>Photo / Media</span>
                                                    </button>
                                                    <button
                                                        onClick={handleOpenGroupComposer}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold transition-all"
                                                    >
                                                        <BarChart2 size={16} className="text-blue-500" />
                                                        <span>Group Poll</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Group Feed Stream */}
                                        <div className="space-y-6 pb-24">
                                            {filteredGroupPosts.map((gp) => (
                                                <GroupPostCard
                                                    key={gp.id}
                                                    post={gp}
                                                    userRole={profile?.role === "admin" ? "admin" : "member"}
                                                    isGroupMember={myGroups.some(g => g.id === gp.groupId)}
                                                />
                                            ))}

                                            {/* Empty State when no group posts exist */}
                                            {filteredGroupPosts.length === 0 && (
                                                <div className="text-center py-16 px-6 bg-white dark:bg-[#161822] rounded-3xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-[#1877F2] flex items-center justify-center mb-4 ring-8 ring-blue-500/5">
                                                        <Users size={32} />
                                                    </div>
                                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                        {myGroups.length === 0 ? "Join Campus Groups to See Posts" : "No group posts yet"}
                                                    </h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                                        {myGroups.length === 0 
                                                            ? "Discover study circles, tech clubs, departmental batches, and cultural societies across all TTC colleges."
                                                            : "Your joined groups are quiet right now. Share the first discussion or announcement!"}
                                                    </p>
                                                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                                                        {myGroups.length === 0 ? (
                                                            <Link
                                                                href="/groups"
                                                                className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                                                            >
                                                                Explore Campus Groups <ArrowRight size={14} />
                                                            </Link>
                                                        ) : (
                                                            <button
                                                                onClick={handleOpenGroupComposer}
                                                                className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                                                            >
                                                                <Plus size={14} /> Write in Group
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* ════════════════════════════════════════════════
                                    SAVED POSTS VIEW
                                   ════════════════════════════════════════════════ */}
                                {showOnlySaved && (
                                    <div className="space-y-6 pb-24">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                                                <Bookmark size={18} className="fill-amber-500 text-amber-500" />
                                                <span>Bookmarked Posts ({savedPostIds.length})</span>
                                            </div>
                                            <button
                                                onClick={() => setShowOnlySaved(false)}
                                                className="text-xs font-bold text-gray-500 hover:text-primary underline"
                                            >
                                                Back to Feed
                                            </button>
                                        </div>

                                        {filteredPosts.map(post => (
                                            <div key={post.id} id={`post-${post.id}`} className="rounded-[2.5rem]">
                                                <PostCard
                                                    post={post}
                                                    profile={profile}
                                                    onEdit={handleEditStart}
                                                    onDelete={handleDeletePost}
                                                    onApprove={() => {}}
                                                    onReject={() => {}}
                                                    isSaved={true}
                                                    onSave={handleSavePost}
                                                    autoFocus={false}
                                                    onTagClick={(tag: string) => setSelectedTag(tag)}
                                                />
                                            </div>
                                        ))}

                                        {filteredPosts.length === 0 && (
                                            <div className="text-center py-16 px-6 bg-white dark:bg-[#161822] rounded-3xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col items-center">
                                                <Bookmark size={40} className="text-amber-400 mb-3" />
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    No Saved Posts
                                                </h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                                    Bookmark important campus posts and club notices to review them anytime in this tab.
                                                </p>
                                                <button
                                                    onClick={() => setShowOnlySaved(false)}
                                                    className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20"
                                                >
                                                    Return to Feed
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ─── Right Desktop Sidebar (Sticky Hub) ─── */}
                    <aside className="hidden xl:block space-y-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto no-scrollbar pb-10">
                        
                        {/* 1. Moderation Desk (for Admins / Managers) */}
                        {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                            <div className="bg-white dark:bg-[#161822] rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                                <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Shield size={16} />
                                    </div>
                                    <span>Moderation Desk</span>
                                </div>

                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {pendingCount > 0 
                                        ? `${pendingCount} post${pendingCount > 1 ? "s" : ""} pending review in the queue.`
                                        : "Moderation queue is all caught up! No pending posts."}
                                </p>

                                <button
                                    onClick={() => setShowModeration(true)}
                                    className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Shield size={15} /> Open Review Queue
                                </button>
                            </div>
                        )}

                        {/* 2. Campus Guidelines */}
                        <div className="bg-white dark:bg-[#161822] rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
                                <Sparkles size={16} /> Campus Guidelines
                            </div>

                            <ul className="space-y-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Share official campus events, workshops, and sports updates.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Showcase college club achievements & extracurricular activities.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Maintain academic integrity and respectful discussions.</span>
                                </li>
                            </ul>
                        </div>

                        {/* 3. Explore Network */}
                        <div className="bg-white dark:bg-[#161822] rounded-3xl p-5 border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                Explore Network
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href="/notice"
                                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 transition-all group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                            <Bell size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                Notice Board
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                Official circulars & notices
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </Link>

                                <Link
                                    href="/study"
                                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 transition-all group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                Study Resources
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                Lesson plans, notes & guides
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </Link>
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <School size={13} className="text-primary" /> 14 TTC Campuses
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                            </div>
                        </div>

                        {/* 4. Footer Links */}
                        <div className="px-2 text-[11px] text-gray-400 dark:text-gray-600 space-y-1">
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <Link href="/notice" className="hover:underline">Notices</Link>
                                <Link href="/story" className="hover:underline">Stories</Link>
                                <Link href="/support" className="hover:underline">Support</Link>
                                <Link href="/settings" className="hover:underline">Settings</Link>
                            </div>
                            <p>© {new Date().getFullYear()} TTC Connect • Bangladesh</p>
                        </div>
                    </aside>

                </div>
            </div>

            {/* ─── Mobile Floating Action Button (FAB) like X (Twitter) ─── */}
            <div className={`lg:hidden fixed right-4 sm:right-6 z-40 transition-all duration-300 ease-out ${
                (isSharing || isCreateGroupOpen || isGroupPostModalOpen || isGroupSelectorOpen) ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
            } ${
                isScrollingDown ? "bottom-6" : "bottom-[76px]"
            }`}>
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                        if (activeTab === "group") {
                            handleOpenGroupComposer();
                        } else {
                            openComposer(activeTab);
                        }
                    }}
                    className="w-14 h-14 rounded-full bg-[#1D9BF0] hover:bg-[#1A8CD8] active:bg-[#177CC0] text-white shadow-[0_8px_25px_rgba(29,155,240,0.4)] hover:shadow-[0_12px_32px_rgba(29,155,240,0.55)] flex items-center justify-center border border-white/20 active:shadow-inner cursor-pointer"
                    aria-label="Create Post"
                    title={activeTab === "group" ? "Create Group Post" : "Create Post"}
                >
                    <Plus size={28} strokeWidth={2.6} className="text-white" />
                </motion.button>
            </div>

            {/* Group Selector Modal (when writing a post and member of >1 group) */}
            <AnimatePresence>
                {isGroupSelectorOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-white dark:bg-[#181920] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Choose Group to Post In
                                </h3>
                                <button
                                    onClick={() => setIsGroupSelectorOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {myGroups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            setSelectedComposerGroup(g);
                                            setIsGroupSelectorOpen(false);
                                            setIsGroupPostModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 text-left transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#1877F2] font-black flex items-center justify-center shrink-0">
                                            {g.coverUrl ? (
                                                <img src={g.coverUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                g.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {g.name}
                                            </p>
                                            <p className="text-xs text-gray-400 capitalize">
                                                {g.privacyType || "Public"} Group • {g.memberCount || 1} members
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expanded Image Viewer Modal for Group Posts */}
            <AnimatePresence>
                {expandedImageModal && (
                    <div 
                        onClick={() => setExpandedImageModal(null)}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                    >
                        <button 
                            onClick={() => setExpandedImageModal(null)}
                            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <img 
                            src={expandedImageModal} 
                            alt="" 
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </AnimatePresence>
 
            {/* Mobile Slide-Out Navigation Drawer */}
            <AnimatePresence>
                {isMobileLeftMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileLeftMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 280 }}
                            className="relative w-[320px] max-w-[85vw] h-full bg-[#f8fafc] dark:bg-[#0b0c10] p-4 overflow-y-auto z-10 space-y-4 shadow-2xl border-r border-gray-200 dark:border-gray-800"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Navigation & Shortcuts</span>
                                <button
                                    onClick={() => setIsMobileLeftMenuOpen(false)}
                                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <NewsFeedLeftSidebar
                                profile={profile}
                                userCollege={userCollege}
                                activeTab={activeTab}
                                onTabSwitch={(t) => {
                                    handleTabSwitch(t);
                                    setIsMobileLeftMenuOpen(false);
                                }}
                                showOnlySaved={showOnlySaved}
                                onToggleSaved={(s) => {
                                    setShowOnlySaved(s);
                                    setIsMobileLeftMenuOpen(false);
                                }}
                                savedCount={savedPostIds.length}
                                selectedFilter={selectedFilter}
                                onSelectFilter={(c) => {
                                    setSelectedFilter(c);
                                    setIsMobileLeftMenuOpen(false);
                                }}
                                myGroups={myGroups}
                                onCreateGroup={() => {
                                    setIsMobileLeftMenuOpen(false);
                                    setIsCreateGroupOpen(true);
                                }}
                                onOpenModeration={() => {
                                    setIsMobileLeftMenuOpen(false);
                                    setShowModeration(true);
                                }}
                                pendingCount={pendingCount}
                                unseenClubCount={unseenCounts.club}
                                unseenGroupCount={unseenCounts.group}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Post Creation / Edit Modal (Global & Club) */}
            <PostCreationModal
                isOpen={isSharing || !!editingPost}
                onClose={() => {
                    setIsSharing(false);
                    setEditingPost(null);
                }}
                profile={profile}
                defaultType={composerDefaultType}
                editPost={editingPost}
                onPostUpdated={(updatedPost) => {
                    setEditingPost(null);
                    setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
                }}
            />

            {/* Group Post Creation Modal */}
            {isGroupPostModalOpen && selectedComposerGroup && (
                <GroupPostCreationModal
                    isOpen={isGroupPostModalOpen}
                    onClose={() => {
                        setIsGroupPostModalOpen(false);
                        setSelectedComposerGroup(null);
                    }}
                    groupId={selectedComposerGroup.id}
                    groupName={selectedComposerGroup.name}
                />
            )}

            {/* Group Creation Modal */}
            {isCreateGroupOpen && (
                <GroupCreationModal
                    isOpen={isCreateGroupOpen}
                    onClose={() => setIsCreateGroupOpen(false)}
                    onSuccess={(groupId) => {
                        setIsCreateGroupOpen(false);
                        showToast("Group created successfully!", "success");
                    }}
                />
            )}

            {/* Moderation Panel */}
            <GenericModerationPanel 
                isOpen={showModeration}
                onClose={() => setShowModeration(false)}
                profile={profile}
                type="posts"
            />

        </div>
    );
}

export default function NewsFeedPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        }>
            <NewsFeedInner />
        </Suspense>
    );
}
