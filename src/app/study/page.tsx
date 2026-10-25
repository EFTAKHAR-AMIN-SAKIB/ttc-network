"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Video, Plus, Search, Shield, ChevronDown, Check,
    ShoppingBag, User
} from "lucide-react";
import StudyHero from "./components/StudyHero";
import StudyNoteCard from "./components/StudyNoteCard";
import StudyScheduleCard from "./components/StudyScheduleCard";
import StudyMarketplaceCard from "./components/StudyMarketplaceCard";
import StudyMarketplaceDetailModal from "./components/StudyMarketplaceDetailModal";
import StudyPostCreationModal from "./components/StudyPostCreationModal";
import ImageLightbox from "@/components/ImageLightbox";
import { 
    subscribeStudyPosts, getStudyHeroSettings, 
    deleteStudyPost, subscribeModerationCount,
    toggleSaveStudyPost, subscribeSavedStudyPosts,
    toggleStudyPostSold,
    type FirestoreStudyPost, type StudyHeroSettings 
} from "@/lib/firestore";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import ShareModal from "@/components/ShareModal";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

const safeDate = (val: unknown): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof (val as { toDate?: () => Date }).toDate === 'function') return (val as { toDate: () => Date }).toDate();
    if (typeof (val as { toMillis?: () => number }).toMillis === 'function') return new Date((val as { toMillis: () => number }).toMillis());
    const d = new Date(val as string | number);
    return isNaN(d.getTime()) ? new Date() : d;
};

function StudyPageContent() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();
    const [activeTab, setActiveTab] = useState<"materials" | "schedule" | "marketplace">("materials");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
    const [campusScope, setCampusScope] = useState<"all" | "campus">("all");
    const [sortBy, setSortBy] = useState<"latest" | "views" | "comments">("latest");
    const [scheduleSubTab, setScheduleSubTab] = useState<"upcoming" | "past">("upcoming");
    
    // Marketplace filters
    const [marketplaceCategory, setMarketplaceCategory] = useState<string>("all");
    const [marketplaceCondition, setMarketplaceCondition] = useState<string>("all");
    const [marketplaceAvailability, setMarketplaceAvailability] = useState<"available" | "all" | "free">("available");
    const [marketplaceSort, setMarketplaceSort] = useState<"latest" | "price_asc" | "price_desc">("latest");
    const [showMyListingsOnly, setShowMyListingsOnly] = useState(false);
    const [selectedMarketplacePost, setSelectedMarketplacePost] = useState<(FirestoreStudyPost & { id: string }) | null>(null);
    const [selectedImageForLightbox, setSelectedImageForLightbox] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialTab, setModalInitialTab] = useState<"material" | "schedule" | "marketplace">("material");
    
    // Category dropdown for materials
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [categorySearchQuery, setCategorySearchQuery] = useState("");
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    // Category dropdown for marketplace
    const [isMarketplaceCategoryDropdownOpen, setIsMarketplaceCategoryDropdownOpen] = useState(false);
    const [marketplaceCategorySearchQuery, setMarketplaceCategorySearchQuery] = useState("");
    const marketplaceCategoryDropdownRef = useRef<HTMLDivElement>(null);

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

    // Close category dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
            if (marketplaceCategoryDropdownRef.current && !marketplaceCategoryDropdownRef.current.contains(e.target as Node)) {
                setIsMarketplaceCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleShareClick = (tab?: "material" | "schedule" | "marketplace" | unknown) => {
        if (requireVerification("share study resources")) {
            setEditingPost(null);
            let resolvedTab: "material" | "schedule" | "marketplace" = "material";
            if (tab === "schedule" || tab === "marketplace" || tab === "material") {
                resolvedTab = tab;
            } else if (activeTab === "schedule") {
                resolvedTab = "schedule";
            } else if (activeTab === "marketplace") {
                resolvedTab = "marketplace";
            }
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

    // Keep selectedMarketplacePost fresh if posts update
    useEffect(() => {
        if (selectedMarketplacePost) {
            const fresh = posts.find(p => p.id === selectedMarketplacePost.id);
            if (fresh && (fresh.isSold !== selectedMarketplacePost.isSold || fresh.updatedAt !== selectedMarketplacePost.updatedAt)) {
                setSelectedMarketplacePost(fresh);
            }
        }
    }, [posts, selectedMarketplacePost]);

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
                } else if (postExists.type === "marketplace") {
                    setActiveTab("marketplace");
                    setSelectedMarketplacePost(postExists);
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

    const handleShareStudyPost = (post: FirestoreStudyPost & { id: string }) => {
        setSharingPost(post);
        setIsShareModalOpen(true);
    };

    const handleToggleSold = async (id: string, isSold: boolean) => {
        try {
            await toggleStudyPostSold(id, isSold);
            setSelectedMarketplacePost(prev => prev && prev.id === id ? { ...prev, isSold } : prev);
            showToast(isSold ? "Listing marked as Sold Out" : "Listing reopened as Available", "success");
        } catch (err) {
            console.error("Failed to toggle sold status:", err);
            showToast("Failed to update listing status", "error");
        }
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

    // ─────────────────────────────────────────────────────────────
    // Resource Library Categories
    // ─────────────────────────────────────────────────────────────
    const uniqueCategories = useMemo(() => {
        const cats = filteredPosts
            .filter(p => p.type === 'material' && p.category)
            .map(p => p.category!.trim().toLowerCase());
        
        const defaults = ["notes", "suggestion", "books", "question", "other"];
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
                    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
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

    // ─────────────────────────────────────────────────────────────
    // Buy & Sell / Marketplace Categories & Listing Logic
    // ─────────────────────────────────────────────────────────────
    const marketplaceStandardCategories = useMemo(() => [
        { id: "all", label: "All Categories", emoji: "🛍️" },
        { id: "textbook", label: "Textbooks", emoji: "📚" },
        { id: "guide", label: "Guides & Suggestions", emoji: "📖" },
        { id: "notes", label: "Handmade Notes", emoji: "📝" },
        { id: "practice", label: "Teaching Practice", emoji: "🎨" },
        { id: "tools", label: "Study Tools & Kit", emoji: "📐" },
        { id: "other", label: "Other Material", emoji: "📦" }
    ], []);

    const uniqueMarketplaceCategories = useMemo(() => {
        const cats = filteredPosts
            .filter(p => p.type === 'marketplace' && (p.itemCategory || p.category))
            .map(p => (p.itemCategory || p.category)!.trim().toLowerCase());
        
        const standardIds = new Set(['all', 'textbook', 'guide', 'notes', 'practice', 'tools', 'other']);
        const customSet = new Set<string>();
        cats.forEach(c => {
            if (!standardIds.has(c)) {
                customSet.add(c);
            }
        });
        return Array.from(customSet);
    }, [filteredPosts]);

    const getMarketplaceCategoryLabel = (cat: string) => {
        if (cat === "all") return "All Categories";
        const found = marketplaceStandardCategories.find(c => c.id === cat.toLowerCase());
        if (found) return found.label;
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    const getMarketplaceCategoryEmoji = (cat: string) => {
        if (cat === "all") return "🛍️";
        const found = marketplaceStandardCategories.find(c => c.id === cat.toLowerCase());
        if (found) return found.emoji;
        return "🏷️";
    };

    const activeMarketplaceCategoryCount = useMemo(() => {
        if (marketplaceCategory === "all") {
            return filteredPosts.filter(p => p.type === 'marketplace').length;
        }
        return filteredPosts.filter(p => p.type === 'marketplace' && (p.itemCategory || p.category || 'textbook').toLowerCase() === marketplaceCategory.toLowerCase()).length;
    }, [filteredPosts, marketplaceCategory]);

    // Count of current user's listings
    const myListingsCount = useMemo(() => {
        if (!user?.uid) return 0;
        return posts.filter(p => p.type === 'marketplace' && p.authorId === user.uid).length;
    }, [posts, user?.uid]);

    const filteredMarketplace = useMemo(() => {
        return filteredPosts
            .filter(p => {
                if (p.type !== 'marketplace') return false;

                // "My Listings" filter
                if (showMyListingsOnly) {
                    if (p.authorId !== user?.uid) return false;
                    // In My Listings view, show both available and sold so author can manage
                    return true;
                }

                // Availability filter (when not exclusively viewing My Listings)
                if (marketplaceAvailability === 'available' && p.isSold) return false;
                if (marketplaceAvailability === 'free') {
                    const isFree = p.pricingType === 'free' || p.price === 0;
                    if (!isFree) return false;
                }

                // Category filter
                if (marketplaceCategory !== 'all') {
                    const postCat = (p.itemCategory || p.category || '').toLowerCase();
                    if (postCat !== marketplaceCategory.toLowerCase()) return false;
                }

                // Condition filter
                if (marketplaceCondition !== 'all') {
                    if (p.condition !== marketplaceCondition) return false;
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
                    const descMatch = p.content?.toLowerCase().includes(term);
                    const editionMatch = p.edition?.toLowerCase().includes(term);
                    const locationMatch = p.location?.toLowerCase().includes(term);
                    const authorMatch = p.authorName?.toLowerCase().includes(term);
                    const collegeMatch = p.collegeName?.toLowerCase().includes(term);
                    if (!titleMatch && !descMatch && !editionMatch && !locationMatch && !authorMatch && !collegeMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (marketplaceSort === 'price_asc') {
                    return (a.price || 0) - (b.price || 0);
                }
                if (marketplaceSort === 'price_desc') {
                    return (b.price || 0) - (a.price || 0);
                }
                const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return timeB - timeA;
            });
    }, [filteredPosts, showMyListingsOnly, user?.uid, marketplaceAvailability, marketplaceCategory, marketplaceCondition, selectedProgramme, campusScope, searchTerm, marketplaceSort, profile?.collegeId]);

    const handleDeleteStudyPost = async (id: string) => {
        if (!requireVerification("delete study resources")) return;
        const target = posts.find(p => p.id === id);
        const isMarketplace = target?.type === "marketplace";
        const confirmed = await confirm({
            title: isMarketplace ? "Permanently Delete Listing?" : "Permanently Delete Study Post?",
            message: isMarketplace
                ? "Are you sure you want to delete this listing? It will be permanently removed from the server and storage and cannot be recovered."
                : "Are you sure you want to delete this resource? It will be permanently removed from the server for everyone.",
            confirmText: "Delete Permanently",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteStudyPost(id);
            if (selectedMarketplacePost?.id === id) {
                setSelectedMarketplacePost(null);
            }
            showToast("Item permanently deleted from server", "success");
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
                onShareClick={() => handleShareClick(activeTab === "marketplace" ? "marketplace" : activeTab === "schedule" ? "schedule" : "material")} 
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
                <div className="bg-white dark:bg-[#161822] p-1 sm:p-1.5 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 shadow-xs mb-4 sm:mb-6 max-w-2xl mx-auto sm:mx-0 overflow-hidden">
                    <div className="flex items-center gap-1 sm:gap-1.5 w-full">
                        <button 
                            onClick={() => setActiveTab("materials")}
                            className={`relative flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-tight sm:tracking-wider transition-colors cursor-pointer select-none ${
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
                            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 max-w-full">
                                <BookOpen size={14} className={`shrink-0 sm:w-[15px] sm:h-[15px] ${activeTab === 'materials' ? "text-white" : "text-gray-400"}`} />
                                <span className="truncate">
                                    <span className="inline sm:hidden">Library</span>
                                    <span className="hidden sm:inline">Resource Library</span>
                                </span>
                                <span className={`min-w-4 h-4 px-1 rounded-full text-[8.5px] sm:text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    activeTab === 'materials' ? 'bg-white text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {filteredPosts.filter(p => p.type === 'material').length}
                                </span>
                            </span>
                        </button>

                        <button 
                            onClick={() => setActiveTab("schedule")}
                            className={`relative flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-tight sm:tracking-wider transition-colors cursor-pointer select-none ${
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
                            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 max-w-full">
                                <Video size={14} className={`shrink-0 sm:w-[15px] sm:h-[15px] ${activeTab === 'schedule' ? "text-white" : "text-gray-400"}`} />
                                <span className="truncate">
                                    <span className="inline sm:hidden">Live Class</span>
                                    <span className="hidden sm:inline">Live Prep Classes</span>
                                </span>
                                <span className={`min-w-4 h-4 px-1 rounded-full text-[8.5px] sm:text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    activeTab === 'schedule' ? 'bg-white text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {filteredPosts.filter(p => p.type === 'schedule').length}
                                </span>
                            </span>
                        </button>

                        <button 
                            onClick={() => setActiveTab("marketplace")}
                            className={`relative flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-tight sm:tracking-wider transition-colors cursor-pointer select-none ${
                                activeTab === 'marketplace' 
                                    ? 'text-white' 
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                            }`}
                        >
                            {activeTab === 'marketplace' && (
                                <motion.div 
                                    layoutId="activeStudyTabPill" 
                                    className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25" 
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 max-w-full">
                                <ShoppingBag size={14} className={`shrink-0 sm:w-[15px] sm:h-[15px] ${activeTab === 'marketplace' ? "text-white" : "text-gray-400"}`} />
                                <span className="truncate">
                                    <span className="inline sm:hidden">Buy & Sell</span>
                                    <span className="hidden sm:inline">Buy & Sell Books</span>
                                </span>
                                <span className={`min-w-4 h-4 px-1 rounded-full text-[8.5px] sm:text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    activeTab === 'marketplace' ? 'bg-white text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {filteredPosts.filter(p => p.type === 'marketplace').length}
                                </span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Active Filter Tags Ribbon */}
                {(searchTerm || (activeTab === "materials" && activeCategory !== "all") || (activeTab === "marketplace" && (marketplaceCategory !== "all" || marketplaceCondition !== "all" || marketplaceAvailability !== "available" || showMyListingsOnly)) || selectedProgramme !== "all" || campusScope !== "all") && (
                    <div className="flex items-center gap-2 mb-4 sm:mb-6 text-xs font-bold text-gray-500 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active Filters:</span>
                        {searchTerm && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px]">
                                Search: &quot;{searchTerm}&quot;
                                <button onClick={() => setSearchTerm("")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {activeTab === "materials" && activeCategory !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px] capitalize">
                                Category: {activeCategory}
                                <button onClick={() => setActiveCategory("all")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {activeTab === "marketplace" && showMyListingsOnly && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px]">
                                👤 My Listings Only ({myListingsCount})
                                <button onClick={() => setShowMyListingsOnly(false)} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {activeTab === "marketplace" && marketplaceCategory !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px] capitalize">
                                Category: {getMarketplaceCategoryLabel(marketplaceCategory)}
                                <button onClick={() => setMarketplaceCategory("all")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {activeTab === "marketplace" && marketplaceCondition !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-bold text-[11px] capitalize">
                                Condition: {marketplaceCondition.replace('_', ' ')}
                                <button onClick={() => setMarketplaceCondition("all")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {activeTab === "marketplace" && !showMyListingsOnly && marketplaceAvailability !== "available" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold text-[11px]">
                                {marketplaceAvailability === "free" ? "Free Gifts Only" : "All (inc. Sold)"}
                                <button onClick={() => setMarketplaceAvailability("available")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {selectedProgramme !== "all" && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 font-bold text-[11px]">
                                Programme: {selectedProgramme === 'bed_hons' ? 'B.Ed Honours' : selectedProgramme === 'bed' ? 'B.Ed General' : 'M.Ed'}
                                <button onClick={() => setSelectedProgramme("all")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        {campusScope === "campus" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-bold text-[11px]">
                                My College Only
                                <button onClick={() => setCampusScope("all")} className="hover:text-red-500 text-xs font-black cursor-pointer">×</button>
                            </span>
                        )}
                        <button 
                            onClick={() => {
                                setSearchTerm("");
                                setActiveCategory("all");
                                setMarketplaceCategory("all");
                                setMarketplaceCondition("all");
                                setMarketplaceAvailability("available");
                                setShowMyListingsOnly(false);
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
                                    className="space-y-6 sm:space-y-8"
                                >
                                    {/* Unified Filter Toolbar for Materials */}
                                    <div className="bg-white dark:bg-[#161822] p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-2xs space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-3">
                                        {/* Mobile Row 1 / Desktop Left Group */}
                                        <div className="flex items-center gap-2 justify-between lg:justify-start flex-1 min-w-0">
                                            {/* Category Dropdown */}
                                            <div className="relative flex-1 lg:flex-initial" ref={categoryDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                                                    className={`w-full lg:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer lg:min-w-[190px] ${
                                                        activeCategory !== "all"
                                                            ? "bg-primary/10 border-primary text-primary font-black shadow-2xs"
                                                            : "bg-gray-50 dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                        <span className="text-base leading-none shrink-0">{getCategoryEmoji(activeCategory)}</span>
                                                        <span className="truncate">{getCategoryLabel(activeCategory)}</span>
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0 ml-1">
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
                                                            {/* Search Input inside Dropdown */}
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

                                            {/* Mobile Sort Selector */}
                                            <div className="flex lg:hidden items-center gap-1 shrink-0">
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as "latest" | "views" | "comments")}
                                                    className="bg-gray-50 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                                                >
                                                    <option value="latest">⚡ Latest</option>
                                                    <option value="views">👁️ Views</option>
                                                    <option value="comments">💬 Discussed</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Programme Filters & Campus Scope */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5 lg:mx-0 lg:px-0">
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
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                                                        selectedProgramme === prog.id
                                                            ? "bg-primary/10 text-primary font-black border border-primary/25 shadow-2xs"
                                                            : "bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200/50 dark:border-gray-700/50"
                                                    }`}
                                                >
                                                    {prog.label}
                                                </button>
                                            ))}

                                            {profile?.collegeId && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCampusScope(campusScope === "campus" ? "all" : "campus")}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                                                        campusScope === "campus"
                                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black shadow-2xs"
                                                            : "bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50"
                                                    }`}
                                                >
                                                    <span>🏫</span>
                                                    <span>My College</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Desktop Sort Selector */}
                                        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sort:</span>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as "latest" | "views" | "comments")}
                                                className="bg-gray-50 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                                            >
                                                <option value="latest">⚡ Latest</option>
                                                <option value="views">👁️ Most Viewed</option>
                                                <option value="comments">💬 Most Discussed</option>
                                            </select>
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
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
                                                            className={`h-full flex flex-col rounded-2xl transition-all duration-300 ${
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
                            ) : activeTab === "schedule" ? (
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch">
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
                                                            className={`h-full flex flex-col rounded-2xl transition-all duration-300 ${
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
                            ) : (
                                <motion.div
                                    key="marketplace-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6 sm:space-y-8"
                                >
                                    {/* Unified Responsive Filter Toolbar for Buy & Sell */}
                                    <div className="bg-white dark:bg-[#161822] p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-2xs space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-3">
                                        {/* Left Controls: Category & Filters */}
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-2 flex-1 min-w-0">
                                            {/* Tier 1 on Mobile: Category Dropdown (full width/flex-1) + Mobile Sort Selector */}
                                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                                {/* Marketplace Category Dropdown */}
                                                <div className="relative flex-1 lg:flex-initial" ref={marketplaceCategoryDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsMarketplaceCategoryDropdownOpen(prev => !prev)}
                                                        className={`w-full lg:w-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer lg:min-w-[190px] shrink-0 ${
                                                            marketplaceCategory !== "all"
                                                                ? "bg-primary/10 border-primary text-primary font-black shadow-2xs"
                                                                : "bg-gray-50 dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <span className="text-base leading-none shrink-0">{getMarketplaceCategoryEmoji(marketplaceCategory)}</span>
                                                            <span className="truncate">{getMarketplaceCategoryLabel(marketplaceCategory)}</span>
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                                                marketplaceCategory !== "all" 
                                                                    ? "bg-primary text-white" 
                                                                    : "bg-gray-200/80 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                            }`}>
                                                                {activeMarketplaceCategoryCount}
                                                            </span>
                                                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isMarketplaceCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    <AnimatePresence>
                                                        {isMarketplaceCategoryDropdownOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-80"
                                                            >
                                                                {/* Search Input inside Dropdown */}
                                                                <div className="p-2 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50">
                                                                    <div className="relative flex items-center">
                                                                        <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Filter categories or subjects..."
                                                                            value={marketplaceCategorySearchQuery}
                                                                            onChange={(e) => setMarketplaceCategorySearchQuery(e.target.value)}
                                                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-7 py-1.5 text-xs font-semibold outline-none focus:border-primary text-gray-900 dark:text-gray-100"
                                                                        />
                                                                        {marketplaceCategorySearchQuery && (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={() => setMarketplaceCategorySearchQuery("")}
                                                                                className="absolute right-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Options List */}
                                                                <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
                                                                    {/* All Items Option */}
                                                                    {(!marketplaceCategorySearchQuery || "all categories all items".includes(marketplaceCategorySearchQuery.toLowerCase())) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setMarketplaceCategory("all");
                                                                                setIsMarketplaceCategoryDropdownOpen(false);
                                                                                setMarketplaceCategorySearchQuery("");
                                                                            }}
                                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                                                marketplaceCategory === "all"
                                                                                    ? "bg-primary/10 text-primary font-black"
                                                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                            }`}
                                                                        >
                                                                            <span className="flex items-center gap-2">
                                                                                <span>🛍️</span>
                                                                                <span>All Categories</span>
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                                                    {filteredPosts.filter(p => p.type === 'marketplace').length}
                                                                                </span>
                                                                                {marketplaceCategory === "all" && <Check size={14} className="text-primary" />}
                                                                            </div>
                                                                        </button>
                                                                    )}

                                                                    {/* Standard Categories */}
                                                                    <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                                        Standard Categories
                                                                    </div>
                                                                    {marketplaceStandardCategories
                                                                        .filter(cat => cat.id !== "all" && (!marketplaceCategorySearchQuery || cat.label.toLowerCase().includes(marketplaceCategorySearchQuery.toLowerCase())))
                                                                        .map(cat => {
                                                                            const count = filteredPosts.filter(p => p.type === 'marketplace' && (p.itemCategory || p.category || 'textbook').toLowerCase() === cat.id).length;
                                                                            const isSelected = marketplaceCategory.toLowerCase() === cat.id;
                                                                            return (
                                                                                <button
                                                                                    key={cat.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setMarketplaceCategory(cat.id);
                                                                                        setIsMarketplaceCategoryDropdownOpen(false);
                                                                                        setMarketplaceCategorySearchQuery("");
                                                                                    }}
                                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                                                        isSelected
                                                                                            ? "bg-primary/10 text-primary font-black"
                                                                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                                    }`}
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <span>{cat.emoji}</span>
                                                                                        <span>{cat.label}</span>
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

                                                                    {/* Custom Subjects if any */}
                                                                    {uniqueMarketplaceCategories.length > 0 && (
                                                                        <>
                                                                            <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                                                Subjects & Tags
                                                                            </div>
                                                                            {uniqueMarketplaceCategories
                                                                                .filter(cat => !marketplaceCategorySearchQuery || cat.toLowerCase().includes(marketplaceCategorySearchQuery.toLowerCase()))
                                                                                .map(cat => {
                                                                                    const count = filteredPosts.filter(p => p.type === 'marketplace' && (p.itemCategory || p.category || '').toLowerCase() === cat.toLowerCase()).length;
                                                                                    const isSelected = marketplaceCategory.toLowerCase() === cat.toLowerCase();
                                                                                    return (
                                                                                        <button
                                                                                            key={cat}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setMarketplaceCategory(cat);
                                                                                                setIsMarketplaceCategoryDropdownOpen(false);
                                                                                                setMarketplaceCategorySearchQuery("");
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

                                                {/* Mobile Sort Selector */}
                                                <div className="flex lg:hidden items-center shrink-0">
                                                    <select
                                                        value={marketplaceSort}
                                                        onChange={(e) => setMarketplaceSort(e.target.value as "latest" | "price_asc" | "price_desc")}
                                                        className="h-9 bg-gray-50 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/80 rounded-xl px-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                                                    >
                                                        <option value="latest">⚡ Latest</option>
                                                        <option value="price_asc">💰 Price: Low</option>
                                                        <option value="price_desc">💎 Price: High</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Tier 2: Filter Chips & Dropdowns (Smooth horizontal scroll on mobile, flex-wrap on desktop) */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 -mx-0.5 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
                                                {/* My Listings Button */}
                                                {user && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMyListingsOnly(prev => !prev)}
                                                        className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                                                            showMyListingsOnly
                                                                ? "bg-primary text-white border-primary shadow-xs font-black"
                                                                : "bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                                                        }`}
                                                        title="View only books and study materials you posted"
                                                    >
                                                        <User size={13} className="shrink-0" />
                                                        <span className="whitespace-nowrap">My Listings</span>
                                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                                                            showMyListingsOnly 
                                                                ? "bg-white text-primary" 
                                                                : "bg-gray-200/80 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                                        }`}>
                                                            {myListingsCount}
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Availability Selector Dropdown (Hidden in My Listings mode) */}
                                                {!showMyListingsOnly && (
                                                    <select
                                                        value={marketplaceAvailability}
                                                        onChange={(e) => setMarketplaceAvailability(e.target.value as "available" | "all" | "free")}
                                                        className={`h-9 bg-gray-50 dark:bg-gray-800/90 border rounded-xl px-2.5 text-xs font-bold outline-none cursor-pointer shrink-0 transition-all ${
                                                            marketplaceAvailability !== "available"
                                                                ? "border-primary/50 text-primary font-black bg-primary/5"
                                                                : "border-gray-200/70 dark:border-gray-700/80 text-gray-700 dark:text-gray-300"
                                                        }`}
                                                    >
                                                        <option value="available">🟢 Available Only</option>
                                                        <option value="all">📋 All Listings</option>
                                                        <option value="free">🎁 Free Gifts</option>
                                                    </select>
                                                )}

                                                {/* Condition Dropdown */}
                                                <select
                                                    value={marketplaceCondition}
                                                    onChange={(e) => setMarketplaceCondition(e.target.value)}
                                                    className={`h-9 bg-gray-50 dark:bg-gray-800/90 border rounded-xl px-2.5 text-xs font-bold outline-none cursor-pointer shrink-0 transition-all ${
                                                        marketplaceCondition !== "all"
                                                            ? "border-primary/50 text-primary font-black bg-primary/5"
                                                            : "border-gray-200/70 dark:border-gray-700/80 text-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    <option value="all">🏷️ Any Condition</option>
                                                    <option value="new">✨ Brand New</option>
                                                    <option value="like_new">👌 Like New</option>
                                                    <option value="good">👍 Good Condition</option>
                                                    <option value="fair">📖 Acceptable</option>
                                                </select>

                                                {/* Programme Filter Dropdown */}
                                                <select
                                                    value={selectedProgramme}
                                                    onChange={(e) => setSelectedProgramme(e.target.value)}
                                                    className={`h-9 bg-gray-50 dark:bg-gray-800/90 border rounded-xl px-2.5 text-xs font-bold outline-none cursor-pointer shrink-0 transition-all ${
                                                        selectedProgramme !== "all"
                                                            ? "border-primary/50 text-primary font-black bg-primary/5"
                                                            : "border-gray-200/70 dark:border-gray-700/80 text-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    <option value="all">🎓 All Programmes</option>
                                                    <option value="bed_hons">🎓 B.Ed Honours</option>
                                                    <option value="bed">📖 B.Ed General</option>
                                                    <option value="med">🏛️ M.Ed</option>
                                                </select>

                                                {/* Campus Scope */}
                                                {profile?.collegeId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCampusScope(campusScope === "campus" ? "all" : "campus")}
                                                        className={`h-9 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 border ${
                                                            campusScope === "campus"
                                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-black shadow-2xs"
                                                                : "bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/50"
                                                        }`}
                                                    >
                                                        <span>🏫</span>
                                                        <span>My College</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Desktop Right Group: Sort & + Sell CTA */}
                                        <div className="hidden lg:flex items-center gap-2 shrink-0 ml-auto">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sort:</span>
                                                <select
                                                    value={marketplaceSort}
                                                    onChange={(e) => setMarketplaceSort(e.target.value as "latest" | "price_asc" | "price_desc")}
                                                    className="h-9 bg-gray-50 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/80 rounded-xl px-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                                                >
                                                    <option value="latest">⚡ Latest</option>
                                                    <option value="price_asc">💰 Price: Low to High</option>
                                                    <option value="price_desc">💎 Price: High to Low</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleShareClick("marketplace")}
                                                className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shadow-primary/20 hover:brightness-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                                            >
                                                <Plus size={14} strokeWidth={2.5} />
                                                <span>Sell Book</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Marketplace Items Grid */}
                                    <section>
                                        {loading ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : filteredMarketplace.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
                                                {filteredMarketplace.map(post => {
                                                    const isAuthor = user?.uid === post.authorId;
                                                    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_manager';
                                                    const isManagerSameCollege = profile?.role === 'manager' && profile?.collegeId === post.collegeId;
                                                    const canEdit = isAuthor || isAdmin;
                                                    const canDelete = isAuthor || isAdmin || isManagerSameCollege;
                                                    return (
                                                        <div 
                                                            key={post.id} 
                                                            id={`study-${post.id}`}
                                                            className={`h-full flex flex-col rounded-2xl transition-all duration-300 ${
                                                                temporaryHighlightId === post.id 
                                                                    ? "ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-[#0c0c10] shadow-xl scale-[1.01]" 
                                                                    : targetStudyPostId === post.id 
                                                                        ? "ring-4 ring-primary ring-offset-4 dark:ring-offset-[#0c0c10]" 
                                                                        : ""
                                                            }`}
                                                        >
                                                            <StudyMarketplaceCard 
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
                                                                onViewDetails={(p) => setSelectedMarketplacePost(p)}
                                                                onToggleSold={handleToggleSold}
                                                                canEdit={canEdit}
                                                                canDelete={canDelete}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : showMyListingsOnly ? (
                                            /* Empty state when filtering "My Listings" */
                                            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 max-w-lg mx-auto">
                                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                                                    <User size={28} />
                                                </div>
                                                <h3 className="text-lg font-black mb-1.5 text-gray-900 dark:text-white">You have no active listings yet</h3>
                                                <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                                                    Have old textbooks, guides, or study tools to sell or gift? Post your first item to reach TTC students across Bangladesh!
                                                </p>
                                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                                    <button
                                                        onClick={() => setShowMyListingsOnly(false)}
                                                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                                    >
                                                        View All Books
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareClick("marketplace")}
                                                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <Plus size={14} strokeWidth={2.5} />
                                                        <span>Post Book For Sale</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* General Empty State */
                                            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 max-w-lg mx-auto">
                                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                                                    <ShoppingBag size={28} />
                                                </div>
                                                <h3 className="text-lg font-black mb-1.5 text-gray-900 dark:text-white">বই বা স্টাডি মেটেরিয়াল কেনাবেচা</h3>
                                                <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                                                    {searchTerm || marketplaceCategory !== "all" || marketplaceCondition !== "all" || selectedProgramme !== "all" || campusScope !== "all" || marketplaceAvailability !== "available"
                                                        ? "No listings match your active filters. Try adjusting or clearing your filters."
                                                        : "No study materials or books are currently posted for sale. Have old textbooks or notes? Sell them to your peers!"}
                                                </p>
                                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                                    {(searchTerm || marketplaceCategory !== "all" || marketplaceCondition !== "all" || selectedProgramme !== "all" || campusScope !== "all" || marketplaceAvailability !== "available") && (
                                                        <button
                                                            onClick={() => {
                                                                setSearchTerm("");
                                                                setMarketplaceCategory("all");
                                                                setMarketplaceCondition("all");
                                                                setMarketplaceAvailability("available");
                                                                setShowMyListingsOnly(false);
                                                                setSelectedProgramme("all");
                                                                setCampusScope("all");
                                                            }}
                                                            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                                        >
                                                            Clear Filters
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleShareClick("marketplace")}
                                                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <Plus size={14} strokeWidth={2.5} />
                                                        <span>Post For Sale</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) matching news-feed / native app standard */}
            <div 
                className={`sm:hidden fixed right-4 z-40 transition-all duration-300 ease-out ${
                    isModalOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
                } bottom-[74px]`}
            >
                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleShareClick(activeTab === "marketplace" ? "marketplace" : activeTab === "schedule" ? "schedule" : "material")}
                    className="w-14 h-14 rounded-full bg-primary text-white shadow-[0_8px_25px_rgba(26,86,219,0.35)] flex items-center justify-center border-2 border-white dark:border-[#161822] cursor-pointer select-none active:shadow-inner"
                    aria-label={activeTab === "marketplace" ? "Sell Study Material" : activeTab === "schedule" ? "Schedule Class" : "Share Resource"}
                    title={activeTab === "marketplace" ? "Sell Study Material" : activeTab === "schedule" ? "Schedule Class" : "Share Resource"}
                >
                    {activeTab === "marketplace" ? (
                        <ShoppingBag size={24} strokeWidth={2.4} className="text-white" />
                    ) : (
                        <Plus size={26} strokeWidth={2.6} className="text-white" />
                    )}
                </motion.button>
            </div>

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

            {/* Study Marketplace Detail Modal */}
            <StudyMarketplaceDetailModal
                isOpen={!!selectedMarketplacePost}
                onClose={() => setSelectedMarketplacePost(null)}
                post={selectedMarketplacePost}
                currentUserId={user?.uid}
                isAdmin={profile?.role === 'admin' || profile?.role === 'super_manager'}
                isSaved={selectedMarketplacePost ? savedStudyPostIds.includes(selectedMarketplacePost.id) : false}
                onSave={handleSaveStudyPost}
                onShare={handleShareStudyPost}
                onToggleSold={handleToggleSold}
                onOpenLightbox={(src) => setSelectedImageForLightbox(src)}
                onEdit={(p) => {
                    if (requireVerification("edit study resources")) {
                        setEditingPost(p);
                        setIsModalOpen(true);
                    }
                }}
                onDelete={handleDeleteStudyPost}
                canEdit={!!selectedMarketplacePost && (user?.uid === selectedMarketplacePost.authorId || profile?.role === 'admin' || profile?.role === 'super_manager')}
                canDelete={!!selectedMarketplacePost && (user?.uid === selectedMarketplacePost.authorId || profile?.role === 'admin' || profile?.role === 'super_manager' || (profile?.role === 'manager' && profile?.collegeId === selectedMarketplacePost.collegeId))}
            />

            {/* Marketplace Photo Lightbox */}
            <ImageLightbox
                isOpen={!!selectedImageForLightbox}
                src={selectedImageForLightbox}
                alt="Item Photo"
                onClose={() => setSelectedImageForLightbox(null)}
            />

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
