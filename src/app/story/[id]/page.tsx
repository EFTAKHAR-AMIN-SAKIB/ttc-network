"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Clock, Footprints, MessageSquare, GraduationCap, School, Share2, Bookmark, User, Lock, LogIn, Hash, Globe, Pencil, Trash2, ChevronDown, Check } from "lucide-react";
import { type FirestoreStory, subscribeStories, toggleSaveStory, subscribeSavedStories, subscribeStory, getProfilesByIds, type FirestoreUser, getStoryByNumber, deleteStory, updateStoryVisibility } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import StoryCard from "@/components/StoryCard";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentSystem } from "@/components/Social/CommentSystem";
import ShareModal from "@/components/ShareModal";
import StoryShareModal from "@/components/StoryShareModal";
import { isContentRestrictedForUser } from "@/lib/permissions";
import { RichText } from "@/components/Social/SocialUtils";

export default function StoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params.id as string;
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const [story, setStory] = useState<FirestoreStory & { id: string } | null>(null);
    const [moreStories, setMoreStories] = useState<(FirestoreStory & { id: string })[]>([]);
    const [reactingUsers, setReactingUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAudienceMenu, setShowAudienceMenu] = useState(false);

    // Determine if the URL param is a numeric storyNumber or a Firestore doc ID
    const isNumericId = /^\d+$/.test(rawId);
    const storyNumber = isNumericId ? parseInt(rawId, 10) : null;

    useEffect(() => {
        if (!rawId) return;
        
        setLoading(true);

        if (isNumericId && storyNumber !== null) {
            // Numeric URL — look up by storyNumber, then subscribe by doc ID
            let unsubStoryDoc: (() => void) | undefined;
            getStoryByNumber(storyNumber).then((found) => {
                if (found) {
                    // Now subscribe to real-time updates on the actual doc
                    unsubStoryDoc = subscribeStory(found.id, (data) => {
                        if (data) {
                            setStory(data);
                            setError(null);
                        } else {
                            setError("Story not found.");
                        }
                        setLoading(false);
                    });
                } else {
                    setError("Story not found.");
                    setLoading(false);
                }
            }).catch(() => {
                setError("Story not found.");
                setLoading(false);
            });

            return () => {
                unsubStoryDoc?.();
            };
        } else {
            // Firestore doc ID — direct subscribe (backward compatible)
            const unsubscribeStory = subscribeStory(rawId, (data) => {
                if (data) {
                    setStory(data);
                    setError(null);
                } else {
                    setError("Story not found.");
                }
                setLoading(false);
            });

            return () => unsubscribeStory();
        }
    }, [rawId, isNumericId, storyNumber]);

    useEffect(() => {
        if (!story?.collegeId) return;
        
        const unsubscribeMore = subscribeStories((all) => {
            const filtered = all.filter(s => {
                if (s.collegeId !== story.collegeId || s.id === story.id) return false;
                const isOwner = user?.uid && s.authorId === user.uid;
                const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";
                if (s.visibility === "private" && !isOwner && !isAdmin) return false;
                if ((s.visibility === "campus" || s.visibility === "college_only") && s.collegeId !== profile?.collegeId && !isAdmin && !isOwner) return false;
                return true;
            }).slice(0, 3);
            setMoreStories(filtered);
        });
        
        return () => unsubscribeMore();
    }, [story?.collegeId, story?.id, user?.uid, profile?.role, profile?.collegeId]);

    useEffect(() => {
        if (!story?.reactedBy) {
            setReactingUsers([]);
            return;
        }
        
        const allUids = Array.from(new Set(Object.values(story.reactedBy).flat())).slice(0, 4);
        if (allUids.length > 0) {
            getProfilesByIds(allUids).then(data => {
                setReactingUsers(data);
            }).catch(err => {
                console.error("Error fetching reacting users' profiles:", err);
            });
        } else {
            setReactingUsers([]);
        }
    }, [story?.reactedBy]);

    useEffect(() => {
        let unsubSaved = () => {};
        if (profile?.uid) {
            unsubSaved = subscribeSavedStories(profile.uid, (ids) => {
                setSavedStoryIds(ids);
            });
        } else {
            setSavedStoryIds([]);
        }
        return () => unsubSaved();
    }, [profile]);

    const isAuthor = !!(user?.uid && story?.authorId === user.uid);
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";
    const canManage = isAuthor || isAdmin;

    const handleVisibilityChange = async (newVis: "public" | "campus" | "private") => {
        if (!story) return;
        setShowAudienceMenu(false);
        if (newVis === story.visibility) return;
        try {
            await updateStoryVisibility(story.id, newVis);
            setStory(prev => prev ? { ...prev, visibility: newVis } : null);
            showToast(
                newVis === "private" 
                    ? "Story set to Private (Only Me)" 
                    : newVis === "campus" 
                    ? "Story set to Campus Only" 
                    : "Story set to Global", 
                "success"
            );
        } catch (e: unknown) {
            showToast("Failed to update story privacy: " + ((e as Error)?.message || ""), "error");
        }
    };

    const handleDeleteStory = async () => {
        if (!story) return;
        const confirmed = await confirm({
            title: "Delete Story?",
            message: "Are you sure you want to delete this story? This action cannot be undone and will remove all associated narrative data.",
            confirmText: "Delete Story",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await deleteStory(story.id);
            showToast("Story deleted successfully.", "info");
            router.push("/story");
        } catch (err) {
            console.error("Delete story failed:", err);
            showToast("Failed to delete story.", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleSaveStory = async () => {
        if (!story) return;
        if (!profile?.uid) {
            showToast("Please log in to bookmark stories.", "error");
            return;
        }
        try {
            const isSaved = await toggleSaveStory(profile.uid, story.id);
            if (isSaved) {
                showToast("Story bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
            }
        } catch (err) {
            console.error("Error bookmarking story:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
    );

    if (error || !story) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50/50 dark:bg-[#0c0c10]">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                <BookOpen size={28} />
            </div>
            <h1 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">This content is no longer available</h1>
            <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">The story you are trying to view has been deleted or is not accessible.</p>
            <button onClick={() => router.push('/story')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Back to Stories</button>
        </div>
    );

    const storyId = story.id;

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] pt-20 sm:pt-24 pb-12 sm:pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between mb-6 sm:mb-12">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-navy-900 dark:hover:text-gray-200 transition-colors font-black uppercase tracking-widest text-[10px]">
                        <ArrowLeft size={16} /> Back to Stories
                    </button>
                    <div className="flex items-center gap-2.5">
                        {/* Story Number Badge */}
                        {story.storyNumber && (
                            <div className="px-3 py-2 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                                <Hash size={14} className="text-primary" />
                                <span className="text-xs font-black text-navy-900 dark:text-gray-100">
                                    {story.storyNumber.toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}
                        {canManage && (
                            <>
                                <button 
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-primary"
                                    title="Edit Story"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={handleDeleteStory}
                                    className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-red-500"
                                    title="Delete Story"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={handleSaveStory}
                            className={`p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border hover:scale-110 active:scale-95 transition-all duration-200 ${
                                savedStoryIds.includes(storyId) 
                                    ? "text-primary border-primary/20 bg-primary/5" 
                                    : "text-gray-400 hover:text-primary border-gray-100 dark:border-gray-700"
                            }`}
                            title={savedStoryIds.includes(storyId) ? "Remove Bookmark" : "Bookmark Story"}
                        >
                            <Bookmark size={18} className={savedStoryIds.includes(storyId) ? "fill-primary" : ""} />
                        </button>
                        {story.visibility !== "private" && (
                            <button 
                                onClick={() => setIsShareOpen(true)}
                                className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-primary"
                                title="Share Story"
                            >
                                <Share2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <article className="bg-white dark:bg-gray-900 rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl shadow-navy-900/5 overflow-hidden border border-gray-100 dark:border-gray-800">
                    {/* ═══ COVER IMAGE HERO (SHOW WHOLE IMAGE BY ADJUSTING) ═══ */}
                    {story.thumbnailUrl && (
                        <div className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                            {/* Ambient blurred backdrop */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
                                style={{ backgroundImage: `url(${story.thumbnailUrl})` }}
                            />
                            <img 
                                src={story.thumbnailUrl} 
                                alt={story.title || "Story Cover"} 
                                className="relative z-10 w-full h-auto max-h-[520px] sm:max-h-[640px] object-contain"
                            />
                        </div>
                    )}

                    {/* Hero Header */}
                    <header className="p-5 sm:p-14 border-b border-gray-50 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-800/20">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 flex-wrap">
                            <span className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-primary/10 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                                {story.authorRole} Journey
                            </span>
                            <span className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <Clock size={14} className="text-primary" /> {story.readingTimeMinutes} MIN READ
                            </span>
                            {story.storyNumber && (
                                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                    <Hash size={11} className="text-primary" /> Story {story.storyNumber.toString().padStart(2, '0')}
                                </span>
                            )}

                            {/* Audience / Privacy Badge with Author Switcher */}
                            <div className="relative">
                                {canManage ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowAudienceMenu(!showAudienceMenu)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                                story.visibility === "private"
                                                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-100"
                                                    : story.visibility === "campus" || story.visibility === "college_only"
                                                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100"
                                                    : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100"
                                            }`}
                                            title="Click to change audience / privacy"
                                        >
                                            {story.visibility === "private" ? (
                                                <Lock size={12} />
                                            ) : story.visibility === "campus" || story.visibility === "college_only" ? (
                                                <School size={12} />
                                            ) : (
                                                <Globe size={12} />
                                            )}
                                            <span>
                                                {story.visibility === "private" ? "Private (Only Me)" : story.visibility === "campus" || story.visibility === "college_only" ? "Campus Only" : "Global"}
                                            </span>
                                            <ChevronDown size={11} className={`transition-transform duration-200 ${showAudienceMenu ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showAudienceMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowAudienceMenu(false)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                                        className="absolute left-0 top-full mt-2 w-52 p-1.5 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 space-y-1"
                                                    >
                                                        <div className="px-3 py-1 border-b border-gray-100 dark:border-white/5">
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Change Audience</p>
                                                        </div>
                                                        {[
                                                            { id: "public" as const, label: "Global", desc: "All campuses", icon: Globe, color: "text-blue-500" },
                                                            { id: "campus" as const, label: "Campus Only", desc: "Your college", icon: School, color: "text-amber-500" },
                                                            { id: "private" as const, label: "Private", desc: "Only visible to you", icon: Lock, color: "text-rose-500" },
                                                        ].map((opt) => {
                                                            const OptIcon = opt.icon;
                                                            const isSelected = story.visibility === opt.id || (opt.id === "campus" && story.visibility === "college_only") || (!story.visibility && opt.id === "public");
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => handleVisibilityChange(opt.id)}
                                                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                                                                        isSelected ? "bg-gray-100 dark:bg-white/10 font-bold" : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <OptIcon size={14} className={opt.color} />
                                                                        <div>
                                                                            <p className="leading-tight">{opt.label}</p>
                                                                            <p className="text-[9px] text-gray-400">{opt.desc}</p>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && <Check size={12} className="text-primary shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${
                                        story.visibility === "private"
                                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                            : story.visibility === "campus" || story.visibility === "college_only"
                                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                                    }`}>
                                        {story.visibility === "private" ? <Lock size={12} /> : story.visibility === "campus" || story.visibility === "college_only" ? <School size={12} /> : <Globe size={12} />}
                                        <span>
                                            {story.visibility === "private" ? "Private" : story.visibility === "campus" || story.visibility === "college_only" ? "Campus Only" : "Global"}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-navy-900 dark:text-gray-100 leading-[1.15] sm:leading-[1.1] mb-6 sm:mb-10 font-bengali tracking-tight">
                            {story.title}
                        </h1>

                        <div className="flex items-center gap-4 sm:gap-5">
                            <Link href={`/profile/${story.authorId}`} className="relative group">
                                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[1.2rem] sm:rounded-[2rem] overflow-hidden border-2 border-primary/20 rotate-3 transition-all duration-500 group-hover:rotate-0 group-hover:scale-105 shadow-lg">
                                    {story.authorPhoto ? (
                                        <img src={story.authorPhoto} alt={story.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl sm:text-2xl font-black text-gray-400">
                                            {story.name?.[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <Link href={`/profile/${story.authorId}`} className="text-lg sm:text-2xl font-black hover:text-primary transition-colors block tracking-tight truncate">
                                    {story.name}
                                </Link>
                                <p className="text-xs sm:text-base font-bold text-gray-500 truncate">{story.college}</p>
                            </div>
                        </div>
                    </header>

                    {/* Private Story Alert Banner (visible to author/admin) */}
                    {story.visibility === "private" && !isContentRestrictedForUser(story, profile, user?.uid) && (
                        <div className="mx-5 sm:mx-14 mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between gap-3 text-rose-700 dark:text-rose-400">
                            <div className="flex items-center gap-2.5 text-xs font-bold">
                                <Lock size={16} className="shrink-0 text-rose-500" />
                                <span>This story is set to <strong>Private</strong>. Only you and network administrators can view this page.</span>
                            </div>
                            {canManage && (
                                <button
                                    onClick={() => handleVisibilityChange("public")}
                                    className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-200 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                                >
                                    Make Public
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content Section */}
                    {isContentRestrictedForUser(story, profile, user?.uid) ? (
                        <div className="p-8 sm:p-16 text-center flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 text-white rounded-[2rem] border border-white/10 shadow-2xl my-8">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
                                <Lock size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                                    {story.visibility === "private" ? "Private Story" : "Campus Restricted Story"}
                                </h2>
                                <p className="text-sm sm:text-base text-gray-300 max-w-lg mt-2 font-medium leading-relaxed">
                                    {story.visibility === "private" 
                                        ? "This story is marked as private by the creator."
                                        : `This story is exclusively available to verified students & faculty of ${story.college}. Log in with your verified college account to read the full journey.`}
                                </p>
                            </div>
                            {!user?.uid && story.visibility !== "private" && (
                                <Link
                                    href="/login"
                                    className="mt-4 px-8 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/25 flex items-center gap-2"
                                >
                                    <LogIn size={16} /> Log In with College Account
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="p-5 sm:p-14">
                                <div className="prose prose-base sm:prose-xl dark:prose-invert max-w-none">
                                    <h2 className="text-xl sm:text-3xl font-black mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4 tracking-tight">
                                        <div className="p-2.5 sm:p-3 rounded-2xl bg-primary/10 text-primary">
                                            <Footprints className="w-5 h-5 sm:w-7 sm:h-7" />
                                        </div>
                                        Their Journey
                                    </h2>
                                    <div className="text-gray-800 dark:text-gray-200 font-bengali leading-[1.8] text-lg sm:text-2xl whitespace-pre-wrap mb-10 sm:mb-20">
                                        <RichText text={story.fullStory} />
                                    </div>

                                    {story.oneAdvice && (
                                        <div className="relative group mb-8 sm:mb-12">
                                            <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-[1.5rem] sm:rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                            <div className="relative bg-white dark:bg-amber-950/10 p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amber-100 dark:border-amber-900/40">
                                                <h3 className="text-amber-900 dark:text-amber-400 text-lg sm:text-2xl font-black mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 tracking-tight">
                                                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                                                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                                                    </div>
                                                    One Piece of Advice
                                                </h3>
                                                <p className="text-amber-800 dark:text-amber-300 font-bengali text-base sm:text-xl leading-relaxed italic">
                                                    &ldquo;<RichText text={story.oneAdvice} />&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reactions Footer */}
                                <div className="mt-10 sm:mt-20 pt-8 sm:pt-12 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-10">
                                    <div className="scale-100 sm:scale-125 origin-center sm:origin-left">
                                        <ReactionBtn 
                                            contentId={story.id} 
                                            contentType="story" 
                                            reactions={story.reactions} 
                                            reactedBy={story.reactedBy} 
                                            currentUserId={user?.uid}
                                        />
                                    </div>

                                    <div className="flex flex-col items-center sm:items-end">
                                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 sm:mb-4">Engage with this journey</p>
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="flex -space-x-3">
                                                {reactingUsers.length > 0 ? (
                                                    reactingUsers.map((u) => (
                                                        <div key={u.id} className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 border-white dark:border-gray-900 overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800" title={u.displayName}>
                                                            {u.photoURL ? (
                                                                <Image src={u.photoURL} alt={u.displayName} fill className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-400 bg-slate-100 dark:bg-gray-850">
                                                                    {u.displayName?.substring(0, 2).toUpperCase() || "?"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    [...Array(3)].map((_, i) => (
                                                        <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-gray-800 border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center">
                                                            <User size={12} className="text-gray-350 dark:text-gray-600" />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-black text-navy-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg sm:rounded-xl">
                                                {(() => {
                                                    const total = Object.values(story.reactions || {}).reduce((a, b) => a + (b as number), 0);
                                                    return total === 0 ? "No reactions yet" : total === 1 ? "1 Reaction" : `${total} Reactions`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </article>

                {/* Comments Section */}
                {!isContentRestrictedForUser(story, profile, user?.uid) && (
                    <div id="comments" className="mt-12 sm:mt-24">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10 px-2 sm:px-4">
                            <div className="p-2.5 sm:p-3 rounded-2xl bg-primary/10 text-primary">
                                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <h2 className="text-xl sm:text-3xl font-black text-navy-900 dark:text-gray-100 tracking-tight">
                                Comments
                            </h2>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl shadow-navy-900/5">
                            <CommentSystem 
                                contentId={story.id} 
                                contentType="story" 
                            />
                        </div>
                    </div>
                )}

                {/* More from College Carousel */}
                {moreStories.length > 0 && (
                    <div className="mt-16 sm:mt-32">
                        <div className="flex items-center justify-between mb-6 sm:mb-10 px-2 sm:px-4">
                            <h2 className="text-xl sm:text-3xl font-black text-navy-900 dark:text-gray-100 flex items-center gap-3 sm:gap-4 tracking-tight">
                                <div className="p-2.5 sm:p-3 rounded-2xl bg-primary/10 text-primary">
                                    <School className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                More from {story.college.split(',')[0]}
                            </h2>
                            <Link href="/story" className="text-xs sm:text-sm font-black text-primary hover:underline uppercase tracking-widest">View all</Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 px-0 sm:px-4">
                            {moreStories.map(s => (
                                <StoryCard key={s.id} story={s} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Generic Share Modal */}
            <AnimatePresence>
                {isShareOpen && story && (
                    <ShareModal 
                        isOpen={isShareOpen} 
                        onClose={() => setIsShareOpen(false)} 
                        type="story"
                        post={{
                            id: story.storyNumber ? story.storyNumber.toString().padStart(2, '0') : story.id,
                            title: story.title,
                            fullStory: story.fullStory,
                            authorName: story.name,
                            college: story.college
                        }} 
                    />
                )}
            </AnimatePresence>

            {/* Story Edit Modal */}
            {story && showEditModal && (
                <StoryShareModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    editStory={story}
                />
            )}
        </div>
    );
}
