"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ArrowLeft, Clock, Sparkles, Footprints, MessageSquare, GraduationCap, School, Share2, Bookmark, User } from "lucide-react";
import { getDocById, type FirestoreStory, reactToStory, subscribeStories, toggleSaveStory, subscribeSavedStories, subscribeStory, getProfilesByIds, type FirestoreUser } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import StoryCard from "@/components/StoryCard";
import { ReactionBtn } from "@/components/Social/ReactionSystem";
import { CommentSystem } from "@/components/Social/CommentSystem";
import ShareModal from "@/components/ShareModal";

export default function StoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user, profile } = useAuth();
    const { showToast } = useToast();

    const [story, setStory] = useState<FirestoreStory & { id: string } | null>(null);
    const [moreStories, setMoreStories] = useState<(FirestoreStory & { id: string })[]>([]);
    const [reactingUsers, setReactingUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        
        setLoading(true);
        const unsubscribeStory = subscribeStory(id, (data) => {
            if (data) {
                setStory(data);
                setError(null);
            } else {
                setError("Story not found.");
            }
            setLoading(false);
        });

        return () => unsubscribeStory();
    }, [id]);

    useEffect(() => {
        if (!story?.collegeId) return;
        
        const unsubscribeMore = subscribeStories((all) => {
            const filtered = all.filter(s => s.collegeId === story.collegeId && s.id !== id).slice(0, 3);
            setMoreStories(filtered);
        });
        
        return () => unsubscribeMore();
    }, [story?.collegeId, id]);

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

    const handleSaveStory = async () => {
        if (!profile?.uid) {
            showToast("Please log in to bookmark stories.", "error");
            return;
        }
        try {
            const isSaved = await toggleSaveStory(profile.uid, id);
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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6">{error || "We couldn't find that story."}</p>
            <button onClick={() => router.push('/story')} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Back to Feed</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] pt-20 sm:pt-24 pb-12 sm:pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between mb-6 sm:mb-12">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-navy-900 dark:hover:text-gray-200 transition-colors font-black uppercase tracking-widest text-[10px]">
                        <ArrowLeft size={16} /> Back to Stories
                    </button>
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={handleSaveStory}
                            className={`p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border hover:scale-110 active:scale-95 transition-all duration-200 ${
                                savedStoryIds.includes(id) 
                                    ? "text-primary border-primary/20 bg-primary/5" 
                                    : "text-gray-400 hover:text-primary border-gray-100 dark:border-gray-700"
                            }`}
                            title={savedStoryIds.includes(id) ? "Remove Bookmark" : "Bookmark Story"}
                        >
                            <Bookmark size={18} className={savedStoryIds.includes(id) ? "fill-primary" : ""} />
                        </button>
                        <button 
                            onClick={() => setIsShareOpen(true)}
                            className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-xl shadow-navy-900/5 border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-primary"
                            title="Share Story"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>

                <article className="bg-white dark:bg-gray-900 rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl shadow-navy-900/5 overflow-hidden border border-gray-100 dark:border-gray-800">
                    {/* Hero Header */}
                    <header className="p-5 sm:p-14 border-b border-gray-50 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-800/20">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 flex-wrap">
                            <span className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-primary/10 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                                {story.authorRole} Journey
                            </span>
                            <span className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <Clock size={14} className="text-primary" /> {story.readingTimeMinutes} MIN READ
                            </span>
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

                    {/* Content Section */}
                    <div className="p-5 sm:p-14">
                        <div className="prose prose-base sm:prose-xl dark:prose-invert max-w-none">
                            <h2 className="text-xl sm:text-3xl font-black mb-6 sm:mb-10 flex items-center gap-3 sm:gap-4 tracking-tight">
                                <div className="p-2.5 sm:p-3 rounded-2xl bg-primary/10 text-primary">
                                    <Footprints className="w-5 h-5 sm:w-7 sm:h-7" />
                                </div>
                                Their Journey
                            </h2>
                            <div className="text-gray-800 dark:text-gray-200 font-bengali leading-[1.8] text-lg sm:text-2xl whitespace-pre-wrap mb-10 sm:mb-20">
                                {story.fullStory}
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
                                            &ldquo;{story.oneAdvice}&rdquo;
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
                </article>

                {/* Comments Section */}
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
                            id: story.id,
                            title: story.title,
                            fullStory: story.fullStory,
                            authorName: story.name,
                            college: story.college
                        }} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
