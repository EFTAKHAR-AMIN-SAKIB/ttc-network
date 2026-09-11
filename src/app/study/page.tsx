"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Video, Plus, Search, Filter, 
    ChevronRight, ExternalLink, Lock, ShieldAlert,
    LayoutGrid, List, MessageSquare, BookText, Shield,
    ChevronDown, Check
} from "lucide-react";
import StudyHero from "./components/StudyHero";
import StudyNoteCard from "./components/StudyNoteCard";
import StudyScheduleCard from "./components/StudyScheduleCard";
import StudyPostCreationModal from "./components/StudyPostCreationModal";
import { 
    subscribeStudyPosts, getStudyHeroSettings, 
    deleteStudyPost, subscribeModerationCount,
    toggleSaveStudyPost, subscribeSavedStudyPosts,
    type FirestoreStudyPost, type StudyHeroSettings 
} from "@/lib/firestore";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import { canEditStudyPost } from "@/lib/permissions";
import { Save, Trash2, Pencil, CheckCircle2, Bookmark, Share2 } from "lucide-react";
import Link from "next/link";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import ShareModal from "@/components/ShareModal";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const safeDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val.toMillis === 'function') return new Date(val.toMillis());
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

function StudyPageContent() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const { isScrollingDown } = useScrollDirection();
    const [activeTab, setActiveTab] = useState<"materials" | "schedule">("materials");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
    const [campusScope, setCampusScope] = useState<"all" | "campus">("all");
    const [sortBy, setSortBy] = useState<"latest" | "views" | "comments">("latest");
    const [scheduleSubTab, setScheduleSubTab] = useState<"upcoming" | "past">("upcoming");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialTab, setModalInitialTab] = useState<"material" | "schedule">("material");
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [categorySearchQuery, setCategorySearchQuery] = useState("");
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const [posts, setPosts] = useState<(FirestoreStudyPost & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModeration, setShowModeration] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [heroSettings, setHeroSettings] = useState<StudyHeroSettings | null>(null);
    const [editingPost, setEditingPost] = useState<(FirestoreStudyPost & { id: string }) | null>(null);
    const { confirm, setIsLoading, close } = useConfirm();

    // Save and share state
    const [savedStudyPostIds, setSavedStudyPostIds] = useState<string[]>([]);
    const [sharingPost, setSharingPost] = useState<(FirestoreStudyPost & { id: string }) | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [targetStudyPostId, setTargetStudyPostId] = useState<string | null>(null);
    const [temporaryHighlightId, setTemporaryHighlightId] = useState<string | null>(null);
    const hasScrolledRef = useRef<string | null>(null);

    // Close category dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleShareClick = (tab?: unknown) => {
        if (requireVerification("share study resources")) {
            setEditingPost(null);
            const resolvedTab: "material" | "schedule" = tab === "schedule" ? "schedule" : "material";
            setModalInitialTab(resolvedTab);
            setIsModalOpen(true);
        }
    };

    useEffect(() => {
        const unsubPosts = subscribeStudyPosts((data) => {
            setPosts(data);
            setLoading(false);
        });

        const unsubCount = subscribeModerationCount(
            "studyPosts",
            profile?.collegeId,
            profile?.role === "admin" || profile?.role === "super_manager",
            (count) => setPendingCount(count)
        );

        const fetchSettings = async () => {
            try {
                const settings = await getStudyHeroSettings();
                setHeroSettings(settings);
            } catch (err) {
                console.error("Failed to fetch study hero settings:", err);
            }
        };

        fetchSettings();
        return () => {
            unsubPosts();
            unsubCount();
        };
    }, [profile]);

    useEffect(() => {
        if (!user?.uid) {
            setSavedStudyPostIds([]);
            return;
        }
        const unsubSaved = subscribeSavedStudyPosts(user.uid, (ids) => {
            setSavedStudyPostIds(ids);
        });
        return () => unsubSaved();
    }, [user?.uid]);

    const [hashStudyId, setHashStudyId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleHashChange = () => {
                const hash = window.location.hash;
                if (hash.startsWith("#study-")) {
                    setHashStudyId(hash.substring(7));
                }
            };
            handleHashChange();
            window.addEventListener("hashchange", handleHashChange);
            return () => window.removeEventListener("hashchange", handleHashChange);
        }
    }, []);

    // Scroll to & highlight study deep link
    useEffect(() => {
        const effectiveStudyId = searchParams.get('study') || searchParams.get('commentPostId') || hashStudyId;
        if (effectiveStudyId && posts.length > 0) {
            setTargetStudyPostId(effectiveStudyId);
            const postExists = posts.find(p => p.id === effectiveStudyId);
            if (postExists && hasScrolledRef.current !== effectiveStudyId) {
                // Ensure correct tab is activated depending on post type
                if (postExists.type === "schedule") {
                    setActiveTab("schedule");
                } else {
                    setActiveTab("materials");
                }
                hasScrolledRef.current = effectiveStudyId;
                
                // Highlight temporary for 3 seconds
                setTemporaryHighlightId(effectiveStudyId);
                const timer = setTimeout(() => {
                    setTemporaryHighlightId(null);
                }, 3000);

                setTimeout(() => {
                    const el = document.getElementById(`study-${effectiveStudyId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);

                return () => clearTimeout(timer);
            }
        }
    }, [searchParams, posts, hashStudyId]);

    const handleSaveStudyPost = async (id: string) => {
        if (!requireVerification("bookmark study resources")) return;
        if (!user?.uid) {
            showToast("Please log in to save resources.", "error");
            router.push("/login");
            return;
        }
        try {
            const isSaved = await toggleSaveStudyPost(user.uid, id);
            if (isSaved) {
                showToast("Resource bookmarked successfully", "success");
            } else {
                showToast("Resource removed from bookmarks", "success");
            }
        } catch (err) {
            console.error("Error toggling save:", err);
            showToast("Failed to save resource", "error");
        }
    };

    const handleShareStudyPost = (post: any) => {
        setSharingPost(post);
        setIsShareModalOpen(true);
    };


    const filteredPosts = posts.filter(p => {
        const isAuthor = user?.uid === p.authorId;
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
        if (isAdmin || isAuthor) return true;
        if (p.status !== 'approved') return false;
        if (p.privacy === 'campus' || p.privacy === 'college_only' || p.visibility === 'campus' || p.visibility === 'college_only') {
            return p.collegeId === profile?.collegeId;
        }
        return true;
    });

    const uniqueCategories = useMemo(() => {
        const cats = filteredPosts
            .filter(p => p.type === 'material' && p.category)
            .map(p => p.category!.trim().toLowerCase());
        
        // Start with default list to maintain structure and order
        const defaults = ["notes", "suggestion", "books", "question", "other"];
        
        // Deduplicate but keep defaults first
        const uniqueSet = new Set(defaults);
        cats.forEach(c => uniqueSet.add(c));
        
        return Array.from(uniqueSet);
    }, [filteredPosts]);

    const getCategoryLabel = (cat: string) => {
        if (cat === "all") return "All Categories";
        if (cat === "notes") return "Notes";
        if (cat === "suggestion") return "Suggestions";
        if (cat === "books") return "Books";
        if (cat === "question") return "Questions";
        if (cat === "other") return "Other";
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    const getCategoryEmoji = (cat: string) => {
        if (cat === "all") return "📁";
        if (cat === "notes") return "📝";
        if (cat === "suggestion") return "💡";
        if (cat === "books") return "📚";
        if (cat === "question") return "❓";
        if (cat === "other") return "📁";
        return "🏷️";
    };

    const standardCategories = useMemo(() => ["notes", "suggestion", "books", "question", "other"], []);
    
    const customSubjects = useMemo(() => {
        const standardSet = new Set(standardCategories);
        return uniqueCategories.filter(c => !standardSet.has(c.toLowerCase()));
    }, [uniqueCategories, standardCategories]);

    const activeCategoryCount = useMemo(() => {
        if (activeCategory === "all") {
            return filteredPosts.filter(p => p.type === 'material').length;
        }
        return filteredPosts.filter(p => p.type === 'material' && (p.category || 'notes').toLowerCase() === activeCategory.toLowerCase()).length;
    }, [filteredPosts, activeCategory]);

    const filteredMaterials = useMemo(() => {
        return filteredPosts
            .filter(p => {
                if (p.type !== 'material') return false;

                // Category filter
                if (activeCategory !== 'all' && (p.category || 'notes').toLowerCase() !== activeCategory.toLowerCase()) {
                    return false;
                }

                // Programme filter
                if (selectedProgramme !== 'all') {
                    const progMatch = p.yearRelevance === selectedProgramme || 
                        p.tags?.includes(selectedProgramme) || 
                        (selectedProgramme === 'bed_hons' && /hons|honours/i.test(p.title + ' ' + (p.content || ''))) ||
                        (selectedProgramme === 'bed' && /\bb\.?ed\b/i.test(p.title + ' ' + (p.content || ''))) ||
                        (selectedProgramme === 'med' && /\bm\.?ed\b/i.test(p.title + ' ' + (p.content || '')));
                    if (!progMatch) return false;
                }

                // Campus scope
                if (campusScope === 'campus' && profile?.collegeId) {
                    if (p.collegeId !== profile.collegeId) return false;
                }

                // Search term
                if (searchTerm.trim()) {
                    const term = searchTerm.toLowerCase();
                    const titleMatch = p.title.toLowerCase().includes(term);
                    const contentMatch = p.content?.toLowerCase().includes(term);
                    const authorMatch = p.authorName?.toLowerCase().includes(term);
                    const categoryMatch = p.category?.toLowerCase().includes(term);
                    if (!titleMatch && !contentMatch && !authorMatch && !categoryMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'views') {
                    return (b.viewCount || 0) - (a.viewCount || 0);
                }
                if (sortBy === 'comments') {
                    return (b.commentsCount || 0) - (a.commentsCount || 0);
                }
                // Default latest
                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });
    }, [filteredPosts, activeCategory, selectedProgramme, campusScope, searchTerm, sortBy, profile?.collegeId]);

    const filteredSchedule = useMemo(() => {
        const now = new Date();
        return filteredPosts
            .filter(p => {
                if (p.type !== 'schedule') return false;

                // Campus scope
                if (campusScope === 'campus' && profile?.collegeId) {
                    if (p.collegeId !== profile.collegeId) return false;
                }

                // Programme filter
                if (selectedProgramme !== 'all') {
                    const progMatch = p.yearRelevance === selectedProgramme || 
                        p.tags?.includes(selectedProgramme) ||
                        (selectedProgramme === 'bed_hons' && /hons|honours/i.test(p.title + ' ' + (p.content || ''))) ||
                        (selectedProgramme === 'bed' && /\bb\.?ed\b/i.test(p.title + ' ' + (p.content || ''))) ||
                        (selectedProgramme === 'med' && /\bm\.?ed\b/i.test(p.title + ' ' + (p.content || '')));
                    if (!progMatch) return false;
                }

                // Search term
                if (searchTerm.trim()) {
                    const term = searchTerm.toLowerCase();
                    const titleMatch = p.title.toLowerCase().includes(term);
                    const contentMatch = p.content?.toLowerCase().includes(term);
                    const authorMatch = p.authorName?.toLowerCase().includes(term);
                    if (!titleMatch && !contentMatch && !authorMatch) return false;
                }

                // Upcoming vs Past filter
                if (p.startTime) {
                    const start = safeDate(p.startTime);
                    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
                    const isEnded = now.getTime() > end.getTime();
                    if (scheduleSubTab === 'upcoming' && isEnded) return false;
                    if (scheduleSubTab === 'past' && !isEnded) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (scheduleSubTab === 'past') {
                    return (b.startTime || "").localeCompare(a.startTime || "");
                }
                return (a.startTime || "").localeCompare(b.startTime || "");
            });
    }, [filteredPosts, campusScope, selectedProgramme, searchTerm, scheduleSubTab, profile?.collegeId]);

    const handleDeleteStudyPost = async (id: string) => {
        if (!requireVerification("delete study resources")) return;
        const confirmed = await confirm({
            title: "Delete Study Post?",
            message: "Are you sure you want to delete this resource? This will remove it from the library for everyone.",
            confirmText: "Delete Post",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteStudyPost(id);
            showToast("Post deleted successfully", "success");
        } catch (err) {
            console.error("Delete study post failed:", err);
            showToast("Failed to delete post.", "error");
        } finally {
            close();
        }
    };

    const stats = {
        materials: heroSettings?.autoCount 
            ? posts.filter(p => p.type === 'material').length 
            : (heroSettings?.materialsCount || 124),
        liveSessions: heroSettings?.autoCount 
            ? posts.filter(p => p.type === 'schedule').length 
            : (heroSettings?.schedulesCount || 8),
        members: heroSettings?.membersCount || 1400
    };

    const effectiveStudyId = searchParams.get('study') || searchParams.get('commentPostId') || hashStudyId;
    const isStudyPostMissing = !loading && effectiveStudyId && !posts.some(p => p.id === effectiveStudyId);

    if (isStudyPostMissing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50/50 dark:bg-[#0c0c10]">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <BookOpen size={28} />
                </div>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">This content is no longer available</h1>
                <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">The study resource or discussion you are trying to view has been deleted or is not accessible.</p>
                <button onClick={() => router.push('/study')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Back to Study Portal</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] pb-32">
            <StudyHero 
                stats={stats} 
                isVisible={heroSettings?.isVisible ?? false}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm} 
                onShareClick={() => handleShareClick("material")} 
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Moderation / Admin Action Row */}
                {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                    <div className="flex items-center justify-start mb-6">
                        <button 
                            onClick={() => setShowModeration(true)}
                            className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm shadow-sm"
                        >
                            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Review Queue</span>
                            <AnimatePresence>
                                {pendingCount > 0 && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#FDF8F3] dark:border-[#0c0c10] shadow-lg"
                                    >
                                        {pendingCount}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                )}

                {/* Tab Switcher — Segmented Control matching news-feed native style */}
                <div className="bg-white dark:bg-[#161822] p-1.5 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 shadow-xs mb-6 max-w-xl mx-auto sm:mx-0">
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => setActiveTab("materials")}
                            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer select-none ${
                                activeTab === 'materials' 
                                    ? 'text-white' 
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                            }`}
                        >
                            {activeTab === 'materials' && (
                                <motion.div 
                                    layoutId="activeStudyTabPill" 
                                    className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25" 
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2 truncate">
                                <BookOpen size={16} className={activeTab === 'materials' ? "text-white" : "text-gray-400"} />
                                <span>Resource Library</span>
                                <span className={`min-w-4 h-4 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    activeTab === 'materials' ? 'bg-white text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {filteredPosts.filter(p => p.type === 'material').length}
                                </span>
                            </span>
                        </button>
                        <button 
                            onClick={() => setActiveTab("schedule")}
                            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer select-none ${
                                activeTab === 'schedule' 
                                    ? 'text-white' 
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                            }`}
                        >
                            {activeTab === 'schedule' && (
                                <motion.div 
                                    layoutId="activeStudyTabPill" 
                                    className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25" 
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2 truncate">
                                <Video size={16} className={activeTab === 'schedule' ? "text-white" : "text-gray-400"} />
                                <span>Live Prep Classes</span>
                                <span className={`min-w-4 h-4 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    activeTab === 'schedule' ? 'bg-white text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {filteredPosts.filter(p => p.type === 'schedule').length}
                                </span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Active Filter Tags Ribbon */}
                {(searchTerm || activeCategory !== "all" || selectedProgramme !== "all" || campusScope !== "all") && (
                    <div className="flex items-center gap-2 mb-6 text-xs font-bold text-gray-500 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active Filters:</span>
                        {searchTerm && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px]">
                                Search: &quot;{searchTerm}&quot;
                                <button onClick={() => setSearchTerm("")} className="hover:text-red-500 text-xs font-black">×</button>
                            </span>
                        )}
                        {activeCategory !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px] capitalize">
                                Category: {activeCategory}
                                <button onClick={() => setActiveCategory("all")} className="hover:text-red-500 text-xs font-black">×</button>
                            </span>
                        )}
                        {selectedProgramme !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px]">
                                Programme: {selectedProgramme === 'bed_hons' ? 'B.Ed Honours' : selectedProgramme === 'bed' ? 'B.Ed General' : 'M.Ed'}
                                <button onClick={() => setSelectedProgramme("all")} className="hover:text-red-500 text-xs font-black">×</button>
                            </span>
                        )}
                        {campusScope === "campus" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-bold text-[11px]">
                                My College Only
                                <button onClick={() => setCampusScope("all")} className="hover:text-red-500 text-xs font-black">×</button>
                            </span>
                        )}
                        <button 
                            onClick={() => {
                                setSearchTerm("");
                                setActiveCategory("all");
                                setSelectedProgramme("all");
                                setCampusScope("all");
                            }}
                            className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:underline ml-1 cursor-pointer"
                        >
                            Reset All
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="relative">
                    <div>
                        <AnimatePresence mode="wait">
                            {activeTab === "materials" ? (
                                <motion.div
                                    key="materials-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    {/* Unified Filter Toolbar */}
                                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#161822] p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-2xs">
                                        {/* Left Group: Category Dropdown & Programme Selector */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Category Dropdown */}
                                            <div className="relative" ref={categoryDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                                                    className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer min-w-[190px] sm:min-w-[210px] ${
                                                        activeCategory !== "all"
                                                            ? "bg-primary/10 border-primary text-primary font-black shadow-2xs"
                                                            : "bg-gray-50 dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 truncate">
                                                        <span className="text-base leading-none">{getCategoryEmoji(activeCategory)}</span>
                                                        <span className="truncate">{getCategoryLabel(activeCategory)}</span>
                                                    </span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                                            activeCategory !== "all" 
                                                                ? "bg-primary text-white" 
                                                                : "bg-gray-200/80 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                        }`}>
                                                            {activeCategoryCount}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {isCategoryDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-80"
                                                        >
                                                            {/* Search Input inside Dropdown if multiple categories */}
                                                            <div className="p-2 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50">
                                                                <div className="relative flex items-center">
                                                                    <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Filter categories or subjects..."
                                                                        value={categorySearchQuery}
                                                                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                                                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-7 py-1.5 text-xs font-semibold outline-none focus:border-primary text-gray-900 dark:text-gray-100"
                                                                    />
                                                                    {categorySearchQuery && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setCategorySearchQuery("")}
                                                                            className="absolute right-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Options List */}
                                                            <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
                                                                {/* All Types option */}
                                                                {(!categorySearchQuery || "all categories all types".includes(categorySearchQuery.toLowerCase())) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveCategory("all");
                                                                            setIsCategoryDropdownOpen(false);
                                                                            setCategorySearchQuery("");
                                                                        }}
                                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                                            activeCategory === "all"
                                                                                ? "bg-primary/10 text-primary font-black"
                                                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                        }`}
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <span>📁</span>
                                                                            <span>All Categories</span>
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                                {filteredPosts.filter(p => p.type === 'material').length}
                                                                            </span>
                                                                            {activeCategory === "all" && <Check size={14} className="text-primary" />}
                                                                        </div>
                                                                    </button>
                                                                )}

                                                                {/* Standard Types Section */}
                                                                <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                                    Standard Types
                                                                </div>
                                                                {standardCategories
                                                                    .filter(cat => !categorySearchQuery || getCategoryLabel(cat).toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                                                    .map(cat => {
                                                                        const count = filteredPosts.filter(p => p.type === 'material' && (p.category || 'notes').toLowerCase() === cat.toLowerCase()).length;
                                                                        const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
                                                                        return (
                                                                            <button
                                                                                key={cat}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveCategory(cat);
                                                                                    setIsCategoryDropdownOpen(false);
                                                                                    setCategorySearchQuery("");
                                                                                }}
                                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                                                    isSelected
                                                                                        ? "bg-primary/10 text-primary font-black"
                                                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                                }`}
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <span>{getCategoryEmoji(cat)}</span>
                                                                                    <span>{getCategoryLabel(cat)}</span>
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                                        {count}
                                                                                    </span>
                                                                                    {isSelected && <Check size={14} className="text-primary" />}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}

                                                                {/* Custom Subjects Section */}
                                                                {customSubjects.length > 0 && (
                                                                    <>
                                                                        <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                                            Subjects & Tags
                                                                        </div>
                                                                        {customSubjects
                                                                            .filter(cat => !categorySearchQuery || cat.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                                                            .map(cat => {
                                                                                const count = filteredPosts.filter(p => p.type === 'material' && (p.category || '').toLowerCase() === cat.toLowerCase()).length;
                                                                                const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
                                                                                return (
                                                                                    <button
                                                                                        key={cat}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveCategory(cat);
                                                                                            setIsCategoryDropdownOpen(false);
                                                                                            setCategorySearchQuery("");
                                                                                        }}
                                                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                                                            isSelected
                                                                                                ? "bg-primary/10 text-primary font-black"
                                                                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                                        }`}
                                                                                    >
                                                                                        <span className="flex items-center gap-2">
                                                                                            <span>🏷️</span>
                                                                                            <span className="capitalize">{cat}</span>
                                                                                        </span>
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                                                {count}
                                                                                            </span>
                                                                                            {isSelected && <Check size={14} className="text-primary" />}
                                                                                        </div>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Programme Filters */}
                                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                                                {[
                                                    { id: 'all', label: 'All' },
                                                    { id: 'bed_hons', label: '🎓 B.Ed Honours' },
                                                    { id: 'bed', label: '📖 B.Ed General' },
                                                    { id: 'med', label: '🏛️ M.Ed' }
                                                ].map((prog) => (
                                                    <button
                                                        key={prog.id}
                                                        type="button"
                                                        onClick={() => setSelectedProgramme(prog.id)}
                                                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                                                            selectedProgramme === prog.id
                                                                ? "bg-primary/10 text-primary font-black border border-primary/25 shadow-2xs"
                                                                : "bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200/50 dark:border-gray-700/50"
                                                        }`}
                                                    >
                                                        {prog.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Group: Campus Scope Toggle & Sort Dropdown */}
                                        <div className="flex items-center gap-2 justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
                                            {profile?.collegeId && (
                                                <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCampusScope("all")}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                            campusScope === "all" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" : "text-gray-400"
                                                        }`}
                                                    >
                                                        All TTCs
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCampusScope("campus")}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                            campusScope === "campus" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" : "text-gray-400"
                                                        }`}
                                                    >
                                                        My College
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 hidden xs:inline">Sort:</span>
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as any)}
                                                    className="bg-gray-50 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                                                >
                                                    <option value="latest">⚡ Latest</option>
                                                    <option value="views">👁️ Most Viewed</option>
                                                    <option value="comments">💬 Most Discussed</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shared Materials Grid */}
                                    <section>
                                        {loading ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : filteredMaterials.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                                {filteredMaterials.map(post => {
                                                    const isAuthor = user?.uid === post.authorId;
                                                    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
                                                    const isManagerSameCollege = profile?.role === 'manager' && profile?.collegeId === post.collegeId;
                                                    const canEdit = isAuthor || isAdmin;
                                                    const canDelete = isAuthor || isAdmin || isManagerSameCollege;
                                                    return (
                                                        <div 
                                                            key={post.id} 
                                                            id={`study-${post.id}`}
                                                            className={`rounded-2xl transition-all duration-300 ${
                                                                temporaryHighlightId === post.id 
                                                                    ? "ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-[#0c0c10] shadow-xl scale-[1.01]" 
                                                                    : targetStudyPostId === post.id 
                                                                        ? "ring-4 ring-primary ring-offset-4 dark:ring-offset-[#0c0c10]" 
                                                                        : ""
                                                            }`}
                                                        >
                                                            <StudyNoteCard 
                                                                post={post} 
                                                                currentUserId={user?.uid} 
                                                                isAdmin={isAdmin}
                                                                isSaved={savedStudyPostIds.includes(post.id)}
                                                                onSave={handleSaveStudyPost}
                                                                onShare={handleShareStudyPost}
                                                                onEdit={(p) => {
                                                                    if (requireVerification("edit study resources")) {
                                                                        setEditingPost(p);
                                                                        setIsModalOpen(true);
                                                                    }
                                                                }}
                                                                onDelete={handleDeleteStudyPost}
                                                                canEdit={canEdit}
                                                                canDelete={canDelete}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 max-w-lg mx-auto">
                                                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                                                    <Search size={22} />
                                                </div>
                                                <h3 className="text-lg font-black mb-1.5 text-gray-900 dark:text-white">No materials found</h3>
                                                <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                                                    {searchTerm || activeCategory !== "all" || selectedProgramme !== "all" || campusScope !== "all"
                                                        ? "No resources match your active filters. Try clearing some filters to explore more."
                                                        : "No resources have been shared in this category yet. Be the first to help your fellow students!"}
                                                </p>
                                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                                    {(searchTerm || activeCategory !== "all" || selectedProgramme !== "all" || campusScope !== "all") && (
                                                        <button
                                                            onClick={() => {
                                                                setSearchTerm("");
                                                                setActiveCategory("all");
                                                                setSelectedProgramme("all");
                                                                setCampusScope("all");
                                                            }}
                                                            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                                        >
                                                            Clear Filters
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleShareClick("material")}
                                                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:brightness-105 transition-all cursor-pointer"
                                                    >
                                                        + Share Resource
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="schedule-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    {/* Schedule Sub-tab Switcher: Upcoming vs Past */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 bg-white dark:bg-[#161822] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <button
                                                onClick={() => setScheduleSubTab("upcoming")}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                                    scheduleSubTab === "upcoming"
                                                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                                <span>Upcoming & Live</span>
                                            </button>
                                            <button
                                                onClick={() => setScheduleSubTab("past")}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    scheduleSubTab === "past"
                                                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}
                                            >
                                                <span>Past Sessions</span>
                                            </button>
                                        </div>

                                        {profile?.collegeId && (
                                            <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                                <button
                                                    onClick={() => setCampusScope("all")}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        campusScope === "all" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" : "text-gray-400"
                                                    }`}
                                                >
                                                    All TTCs
                                                </button>
                                                <button
                                                    onClick={() => setCampusScope("campus")}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        campusScope === "campus" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" : "text-gray-400"
                                                    }`}
                                                >
                                                    My College
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Schedule Grid */}
                                    <section>
                                        {loading ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                {[...Array(2)].map((_, i) => (
                                                    <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : filteredSchedule.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                {filteredSchedule.map(post => {
                                                    const isAuthor = user?.uid === post.authorId;
                                                    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
                                                    const isManagerSameCollege = profile?.role === 'manager' && profile?.collegeId === post.collegeId;
                                                    const canEdit = isAuthor || isAdmin;
                                                    const canDelete = isAuthor || isAdmin || isManagerSameCollege;
                                                    return (
                                                        <div 
                                                            key={post.id} 
                                                            id={`study-${post.id}`}
                                                            className={`rounded-2xl transition-all duration-300 ${
                                                                temporaryHighlightId === post.id 
                                                                    ? "ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-[#0c0c10] shadow-xl scale-[1.01]" 
                                                                    : targetStudyPostId === post.id 
                                                                        ? "ring-4 ring-primary ring-offset-4 dark:ring-offset-[#0c0c10]" 
                                                                        : ""
                                                            }`}
                                                        >
                                                            <StudyScheduleCard 
                                                                post={post} 
                                                                currentUserId={user?.uid} 
                                                                isAdmin={isAdmin}
                                                                isSaved={savedStudyPostIds.includes(post.id)}
                                                                onSave={handleSaveStudyPost}
                                                                onShare={handleShareStudyPost}
                                                                onEdit={(p) => {
                                                                    if (requireVerification("edit study resources")) {
                                                                        setEditingPost(p);
                                                                        setIsModalOpen(true);
                                                                    }
                                                                }}
                                                                onDelete={handleDeleteStudyPost}
                                                                canEdit={canEdit}
                                                                canDelete={canDelete}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 max-w-lg mx-auto">
                                                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                                                    <Video size={22} />
                                                </div>
                                                <h3 className="text-lg font-black mb-1.5 text-gray-900 dark:text-white">
                                                    {scheduleSubTab === "upcoming" ? "No upcoming live sessions" : "No past sessions found"}
                                                </h3>
                                                <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                                                    {scheduleSubTab === "upcoming"
                                                        ? "There are no live prep classes scheduled right now. Host a study session or group review class!"
                                                        : "No past recorded sessions found matching your filters."}
                                                </p>
                                                <button
                                                    onClick={() => handleShareClick("schedule")}
                                                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:brightness-105 transition-all cursor-pointer"
                                                >
                                                    + Schedule a Class
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Mobile Floating Action Button */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleShareClick("material")}
                style={{
                    bottom: isScrollingDown 
                        ? "max(16px, env(safe-area-inset-bottom, 16px))" 
                        : "calc(76px + env(safe-area-inset-bottom, 8px))"
                }}
                className="fixed right-4 z-40 sm:hidden flex items-center gap-1.5 px-4 py-3 bg-primary text-white rounded-full shadow-lg shadow-primary/30 border-2 border-white dark:border-[#1a1b23] text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-300 ease-out active:shadow-inner select-none"
                title="Share Resource"
            >
                <Plus size={16} strokeWidth={2.6} />
                <span>Share</span>
            </motion.button>

            {/* Creation Modal */}
            {user && (
                <StudyPostCreationModal 
                    isOpen={isModalOpen} 
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPost(null);
                    }} 
                    profile={profile} 
                    editPost={editingPost}
                    existingCategories={uniqueCategories}
                    initialTab={modalInitialTab}
                    onSuccess={(msg) => {
                        showToast(msg, "success");
                    }}
                />
            )}




            <GenericModerationPanel 
                isOpen={showModeration}
                onClose={() => setShowModeration(false)}
                profile={profile}
                type="studyPosts"
            />

            {/* Generic Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && sharingPost && (
                    <ShareModal 
                        isOpen={isShareModalOpen} 
                        onClose={() => {
                            setIsShareModalOpen(false);
                            setSharingPost(null);
                        }} 
                        type="study"
                        post={{
                            id: sharingPost.id,
                            title: sharingPost.title,
                            content: sharingPost.content,
                            collegeName: sharingPost.collegeName || "TTC Community",
                            thumbnailUrl: sharingPost.thumbnailUrl
                        }} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function StudyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
        }>
            <StudyPageContent />
        </Suspense>
    );
}
