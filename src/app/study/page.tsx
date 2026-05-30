"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Video, Plus, Search, Filter, 
    ChevronRight, ExternalLink, Lock, ShieldAlert,
    LayoutGrid, List, MessageSquare, BookText, Shield
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

export default function StudyPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<"materials" | "schedule">("materials");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
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
    const hasScrolledRef = useRef<string | null>(null);

    const handleShareClick = () => {
        if (!user) {
            showToast("Please log in to share study resources.", "error");
            router.push("/login");
            return;
        }
        setEditingPost(null);
        setIsModalOpen(true);
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

    // Scroll to & highlight study deep link
    useEffect(() => {
        const studyParam = searchParams.get('study');
        if (studyParam && posts.length > 0) {
            setTargetStudyPostId(studyParam);
            const postExists = posts.find(p => p.id === studyParam);
            if (postExists && hasScrolledRef.current !== studyParam) {
                // Ensure correct tab is activated depending on post type
                if (postExists.type === "schedule") {
                    setActiveTab("schedule");
                } else {
                    setActiveTab("materials");
                }
                hasScrolledRef.current = studyParam;
                setTimeout(() => {
                    const el = document.getElementById(`study-${studyParam}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        }
    }, [searchParams, posts]);

    const handleSaveStudyPost = async (id: string) => {
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

    const filteredMaterials = filteredPosts.filter(p => 
        p.type === 'material' && 
        (p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.content?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredSchedule = filteredPosts.filter(p => 
        p.type === 'schedule' && 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => (a.startTime || "").localeCompare(b.startTime || ""));

    const handleDeleteStudyPost = async (id: string) => {
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

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] pb-20">
            <StudyHero 
                stats={stats} 
                isVisible={heroSettings?.isVisible}
                onSearchChange={setSearchTerm} 
                onShareClick={handleShareClick} 
            />

            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between mb-12 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex gap-10">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <button 
                                onClick={handleShareClick}
                                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                <span>Share Resource</span>
                            </button>
                            {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
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
                            )}
                        </div>
                        <button 
                            onClick={() => setActiveTab("materials")}
                            className={`pb-4 text-sm font-black uppercase tracking-widest relative transition-colors ${activeTab === 'materials' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span className="flex items-center gap-2">
                                <BookOpen size={18} /> Resource Library
                            </span>
                            {activeTab === 'materials' && (
                                <motion.div layoutId="activeTabStudy" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab("schedule")}
                            className={`pb-4 text-sm font-black uppercase tracking-widest relative transition-colors ${activeTab === 'schedule' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span className="flex items-center gap-2">
                                <Video size={18} /> Live Prep Classes
                            </span>
                            {activeTab === 'schedule' && (
                                <motion.div layoutId="activeTabStudy" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative">
                    <div className={!user ? "blur-md select-none pointer-events-none transition-all" : ""}>
                        <AnimatePresence mode="wait">
                            {activeTab === "materials" ? (
                                <motion.div
                                    key="materials-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-16"
                                >

                                    {/* Shared Materials Grid */}
                                    <section>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                    <LayoutGrid size={20} />
                                                </div>
                                                <h2 className="text-2xl font-black text-navy-900 dark:text-gray-100 tracking-tight">Shared Resources</h2>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sort by:</span>
                                                <select className="bg-transparent text-[10px] font-black uppercase tracking-widest text-primary outline-none cursor-pointer">
                                                    <option>Latest</option>
                                                    <option>Popular</option>
                                                </select>
                                            </div>
                                        </div>

                                        {loading ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="h-80 rounded-[2.5rem] bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : filteredMaterials.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                                            className={`rounded-[2.5rem] transition-all duration-500 ${
                                                                targetStudyPostId === post.id 
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
                                                                    setEditingPost(p);
                                                                    setIsModalOpen(true);
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
                                            <div className="bg-white dark:bg-[#1a1b23] rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                                    <Search size={24} className="text-gray-300" />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">No materials found</h3>
                                                <p className="text-gray-400 text-sm">Try adjusting your search or share the first resource!</p>
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
                                    className="space-y-12"
                                >
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                            <Video size={20} />
                                        </div>
                                        <h2 className="text-2xl font-black text-navy-900 dark:text-gray-100 tracking-tight">UPCOMING LIVE PREP</h2>
                                    </div>
 
                                    {loading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {[...Array(2)].map((_, i) => (
                                                <div key={i} className="h-64 rounded-[3rem] bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredSchedule.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                                        className={`rounded-[3rem] transition-all duration-500 ${
                                                            targetStudyPostId === post.id 
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
                                                                setEditingPost(p);
                                                                setIsModalOpen(true);
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
                                        <div className="bg-white dark:bg-[#1a1b23] rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                                <Video size={24} className="text-gray-300" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">No live classes scheduled</h3>
                                            <p className="text-gray-400 text-sm">Check back later or host a session yourself!</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {!user && (
                        <div className="absolute inset-0 z-50 flex items-start justify-center pt-16 pb-20 px-6 bg-gradient-to-b from-transparent via-[#FDF8F3]/70 to-[#FDF8F3] dark:via-[#0c0c10]/70 dark:to-[#0c0c10] backdrop-blur-[2px] pointer-events-auto">
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="max-w-md w-full bg-white/95 dark:bg-[#1a1b23]/95 backdrop-blur-md p-8 sm:p-10 rounded-[2.5rem] border border-gray-200/60 dark:border-gray-800/80 shadow-2xl text-center space-y-6"
                            >
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                    <Lock size={30} className="animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl sm:text-3xl font-black text-navy-900 dark:text-white tracking-tight leading-tight">
                                        Join to Access Resources
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm leading-relaxed">
                                        Log in or create a free account to unlock all B.Ed & M.Ed study materials, class schedules, and community shared notes.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Link 
                                        href="/login" 
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 text-center shadow-lg shadow-indigo-600/20"
                                    >
                                        Log In
                                    </Link>
                                    <Link 
                                        href="/register" 
                                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 text-center border border-gray-200/50 dark:border-gray-700/50"
                                    >
                                        Register
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
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
