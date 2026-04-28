"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, X, Shield, Sparkles, Loader2, Trash2
} from "lucide-react";
import { colleges } from "@/data/colleges";
import { LocationFilterButton } from "@/components/LocationIcons";
import { 
    subscribePosts, subscribeModerationCount, deletePost, updatePost,
    type FirestorePost 
} from "@/lib/firestore";
import { uploadFile, deleteFromCloudinary } from "@/lib/storage";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import SearchBar from "./components/SearchBar";
import PostCreationModal from "@/components/PostCreationModal";

/* ─── Post type alias for Firestore data ─── */
type Post = FirestorePost & { id: string };

/* ─── MAIN PAGE ─── */
function NewsFeedInner() {
    const searchParams = useSearchParams();
    const { profile, loading: loadingAuth } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeTab, setActiveTab] = useState<"event" | "club" | any>("event");
    const [selectedFilter, setSelectedFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    
    // New States
    const [searchQuery, setSearchQuery] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const [showModeration, setShowModeration] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editEventName, setEditEventName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editShareLink, setEditShareLink] = useState("");
    const [editType, setEditType] = useState<string>("event");
    const [editVisibility, setEditVisibility] = useState<string>("public");
    const [editThumbnailUrl, setEditThumbnailUrl] = useState<string | null>(null);
    const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
    const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { confirm, setIsLoading, close } = useConfirm();
    const { showToast } = useToast();

    const [targetPostId, setTargetPostId] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const hasScrolledRef = useRef<string | null>(null);

    // Moved useEffect down below handleEditStart

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

        return () => {
            unsubPosts();
            unsubCount();
        };
    }, [profile]);

    const filterOptions = useMemo(
        () => [
            { id: "all", label: "All Colleges" },
            ...colleges.map((c) => ({ id: c.id, label: c.city })),
        ],
        []
    );

    const counts = useMemo(() => {
        const eventCount = posts.filter(p => (p.type || "event") === "event").length;
        const clubCount = posts.filter(p => p.type === "club").length;
        return { event: eventCount, club: clubCount };
    }, [posts]);

    const handleDeletePost = async (id: string) => {
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

    const handleEditStart = (post: Post) => {
        setEditingPostId(post.id);
        setEditEventName(post.eventName || "");
        setEditDescription(post.description || "");
        setEditShareLink(post.shareLink || "");
        setEditType(post.type || "event");
        setEditVisibility(post.visibility || "public");
        setEditThumbnailUrl(post.thumbnailUrl || null);
        setEditThumbnailFile(null);
        setEditThumbnailPreview(post.thumbnailUrl || null);
    };

    // Deep-link: read ?post= and ?edit= query params
    useEffect(() => {
        const postParam = searchParams.get('post');
        const editParam = searchParams.get('edit');
        if (postParam && posts.length > 0) {
            setTargetPostId(postParam);
            
            // Check if post exists in current list
            const postExists = posts.some(p => p.id === postParam);
            if (postExists && hasScrolledRef.current !== postParam) {
                hasScrolledRef.current = postParam;
                setTimeout(() => {
                    const el = document.getElementById(`post-${postParam}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
                
                if (editParam === 'true' && !editingPostId) {
                    const postToEdit = posts.find(p => p.id === postParam);
                    if (postToEdit) {
                        setTimeout(() => handleEditStart(postToEdit), 200);
                    }
                }
            }
        }
    }, [searchParams, posts, editingPostId]);

    const handleCancelEdit = () => {
        setEditingPostId(null);
        setEditThumbnailFile(null);
        setEditThumbnailPreview(null);
    };

    const handleSaveEdit = async () => {
        if (!editingPostId || !editEventName.trim()) return;
        setIsSaving(true);
        try {
            let finalThumbnailUrl = editThumbnailUrl || "";

            // 1. Handle Thumbnail Update
            if (editThumbnailFile) {
                const newUrl = await uploadFile("thumbnails", editThumbnailFile);
                finalThumbnailUrl = newUrl;
                
                // Delete old image if it existed
                if (editThumbnailUrl) {
                    await deleteFromCloudinary(editThumbnailUrl);
                }
            } else if (!editThumbnailPreview && editThumbnailUrl) {
                // Image removed
                await deleteFromCloudinary(editThumbnailUrl);
                finalThumbnailUrl = "";
            }

            // 2. Update Firestore
            await updatePost(editingPostId, {
                eventName: editEventName.trim(),
                description: editDescription.trim(),
                shareLink: editShareLink.trim(),
                type: editType as any,
                visibility: editVisibility as any,
                thumbnailUrl: finalThumbnailUrl
            });

            handleCancelEdit();
        } catch (err) {
            console.error("Save edit failed:", err);
            showToast("Failed to save changes.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPosts = useMemo(() => {
        return posts.filter((p) => {
            if ((p.type || "event") !== activeTab) return false;
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
    }, [selectedFilter, posts, activeTab, searchQuery, selectedTag, profile?.collegeId, profile?.uid]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117]">
            {/* Redesigned Header */}
            <header className="bg-white dark:bg-[#1a1b23] border-b border-gray-100 dark:border-gray-800 pt-10 pb-8">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Live Campus Network</span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">News Feed</h1>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="hidden sm:block">
                                <SearchBar onSearch={setSearchQuery} />
                            </div>
                            <div className="flex flex-col items-stretch gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => setIsSharing(true)}
                                    className="px-6 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Share Update
                                </button>
                                {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                                    <button 
                                        onClick={() => setShowModeration(true)}
                                        className="relative flex items-center justify-center gap-2 px-6 py-2 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm shadow-sm"
                                    >
                                        <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Review Queue</span>
                                        <AnimatePresence>
                                            {pendingCount > 0 && (
                                                <motion.span 
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1c24] shadow-lg"
                                                >
                                                    {pendingCount}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed max-w-lg mb-8 opacity-70">
                        Every college has a story worth sharing. Post your events, achievements, and activities — and inspire every TTC across Bangladesh to do the same.
                    </p>

                    {/* Deterministic Daily Prompt */}
                    <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="overflow-hidden h-5 flex-1 relative">
                            <AnimatePresence mode="wait">
                                <motion.p 
                                    key={new Date().getDay()}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-xs font-bold text-gray-600 dark:text-gray-400 italic"
                                >
                                    {[
                                        "What's one thing your students taught you today? 🍎",
                                        "Share a small win that made your campus life better this week. ✨",
                                        "If your college had a theme song, what would it be? 🎵",
                                        "Shoutout to the colleague who always has your back! 🤝",
                                        "What's the best teaching advice you've ever received? 📖",
                                        "Describe your college campus in exactly three words. 🏫",
                                        "What are you building for your students this semester? 🛠️",
                                        "Share a photo that captures the soul of your campus. 📸",
                                        "Who was the most inspiring person you met today? 🌟",
                                        "What's one feature you wish we had on TTC Network? 💡"
                                    ][(Math.floor(Date.now() / (1000 * 60 * 60 * 24))) % 10]}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation & Filters */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#1a1b23]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 location-filter-strip snap-x no-scrollbar">
                        {filterOptions.map((opt) => (
                            <LocationFilterButton
                                key={opt.id}
                                locationId={opt.id}
                                label={opt.label}
                                isActive={selectedFilter === opt.id}
                                onClick={() => setSelectedFilter(opt.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-10">
                {/* Tab Switcher & Activity Pill */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
                        {["event", "club"].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === tab ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xl" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                            >
                                {tab === "event" ? "Global Feed" : "College Clubs"}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {selectedTag && (
                            <button 
                                onClick={() => setSelectedTag(null)}
                                className="px-4 py-2 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-left-4"
                            >
                                #{selectedTag} <X size={12} />
                            </button>
                        )}
                        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20 shadow-sm">
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {counts[activeTab as keyof typeof counts]} Active {activeTab === "event" ? "Updates" : "Threads"}
                        </div>
                    </div>
                </div>

                {/* Feed Content */}
                {loading ? (
                    <div className="space-y-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#1a1b23] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-100 dark:bg-gray-800 w-1/3 rounded-full" />
                                        <div className="h-3 bg-gray-50 dark:bg-gray-900 w-1/4 rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-4 bg-gray-100 dark:bg-gray-800 w-3/4 rounded-full" />
                                    <div className="h-40 bg-gray-50 dark:bg-gray-900 rounded-2xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-12 pb-32">
                        {filteredPosts.map(post => (
                            <div key={post.id} id={`post-${post.id}`} className={targetPostId === post.id ? 'ring-2 ring-primary/50 rounded-3xl transition-all' : ''}>
                            <PostCard
                                post={post}
                                profile={profile}
                                onEdit={handleEditStart}
                                onDelete={handleDeletePost}
                                onApprove={() => {}}
                                onReject={() => {}}
                                editingId={editingPostId}
                                isSaving={isSaving}
                                autoFocus={targetPostId === post.id}
                                onTagClick={(tag: string) => setSelectedTag(tag)}
                                editEventName={editEventName}
                                setEditEventName={setEditEventName}
                                editDescription={editDescription}
                                setEditDescription={setEditDescription}
                                editShareLink={editShareLink}
                                setEditShareLink={setEditShareLink}
                                editType={editType}
                                setEditType={setEditType}
                                editVisibility={editVisibility}
                                setEditVisibility={setEditVisibility}
                                editThumbnailUrl={editThumbnailUrl}
                                setEditThumbnailUrl={setEditThumbnailUrl}
                                editThumbnailFile={editThumbnailFile}
                                setEditThumbnailFile={setEditThumbnailFile}
                                editThumbnailPreview={editThumbnailPreview}
                                setEditThumbnailPreview={setEditThumbnailPreview}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={handleCancelEdit}
                            />
                            </div>
                        ))}
                        {filteredPosts.length === 0 && (
                            <div className="text-center py-24 bg-white dark:bg-[#1a1b23] rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center">
                                <span className="text-6xl mb-6">{searchQuery ? "🔍" : "🏜️"}</span>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                    {searchQuery ? `No results for "${searchQuery}"` : "Quiet on the front"}
                                </h3>
                                <p className="text-gray-500 font-bold max-w-xs mx-auto mt-2">
                                    {searchQuery ? "Try searching for something else or clear the filter." : "No updates yet from this campus. Why not start the conversation?"}
                                </p>
                                <button 
                                    onClick={() => searchQuery ? setSearchQuery("") : window.scrollTo({ top: 0, behavior: 'smooth' })}
                                    className="mt-8 px-8 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                >
                                    {searchQuery ? "Clear Search" : "Back to top"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <PostCreationModal
                isOpen={isSharing}
                onClose={() => setIsSharing(false)}
                profile={profile}
            />
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
