"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, History, Loader2, User, ArrowRight, Sparkles, MapPin, BookOpen, Clock, ShieldAlert, School, GraduationCap, Users, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PostCard from "@/components/PostCard";
import StoryCard from "@/components/StoryCard";
import { TimeAgo } from "@/components/Social/SocialUtils";
import { getItemNumber } from "@/lib/itemNumberUtils";
import { useAuth } from "@/contexts/AuthContext";
import { getDb } from "@/lib/firebase";
import { 
    getAllUsers, 
    getApprovedPosts, 
    getApprovedStories, 
    getNotices,
    getApprovedStudyPosts,
    FirestoreUser,
    FirestorePost,
    FirestoreStory,
    FirestoreNotice,
    FirestoreStudyPost,
    GroupDoc
} from "@/lib/firestore";
import { collection, query as fsQuery, where, getDocs } from "firebase/firestore";

type TabType = "all" | "people" | "posts" | "stories" | "notices" | "study" | "groups";

function SearchContent() {
    const searchParams = useSearchParams();
    const q = searchParams.get("q") || "";
    const router = useRouter();
    const { profile } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [posts, setPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [stories, setStories] = useState<(FirestoreStory & { id: string })[]>([]);
    const [notices, setNotices] = useState<(FirestoreNotice & { id: string })[]>([]);
    const [studyMaterials, setStudyMaterials] = useState<(FirestoreStudyPost & { id: string })[]>([]);
    const [groups, setGroups] = useState<(GroupDoc & { id: string })[]>([]);

    useEffect(() => {
        if (!q.trim()) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const fetchGroups = async () => {
            try {
                const db = getDb();
                const qG = fsQuery(collection(db, "groups"), where("privacyType", "in", ["public", "private"]));
                const snap = await getDocs(qG);
                return snap.docs.map(d => ({ id: d.id, ...(d.data() as GroupDoc) }));
            } catch (e) {
                return [];
            }
        };

        Promise.all([
            getAllUsers().catch(() => []),
            getApprovedPosts().catch(() => []),
            getApprovedStories().catch(() => []),
            getNotices().catch(() => []),
            getApprovedStudyPosts().catch(() => []),
            fetchGroups()
        ]).then(([u, p, s, n, sm, g]) => {
            setUsers(u as any);
            // Apply privacy filter: remove private items
            setPosts((p as any[]).filter(post => post.visibility !== "private"));
            setStories((s as any[]).filter(story => story.visibility !== "private"));
            setNotices((n as any[]).filter(notice => notice.visibility !== "private"));
            setStudyMaterials((sm as any[]).filter(study => study.visibility !== "private"));
            setGroups(g as any);
        }).finally(() => {
            setLoading(false);
        });
    }, [q]);

    const queryStr = q.trim().toLowerCase();

    // Filters (Matching content text + author/creator names in true social media fashion)
    const filteredUsers = queryStr ? users.filter(user => 
        user.displayName?.toLowerCase().includes(queryStr) ||
        user.username?.toLowerCase().includes(queryStr) ||
        user.college?.toLowerCase().includes(queryStr) ||
        (user as any).bio?.toLowerCase().includes(queryStr)
    ) : [];

    const filteredPosts = queryStr ? posts.filter(post => 
        post.eventName?.toLowerCase().includes(queryStr) ||
        post.description?.toLowerCase().includes(queryStr) ||
        post.collegeName?.toLowerCase().includes(queryStr) ||
        post.createdBy?.name?.toLowerCase().includes(queryStr)
    ) : [];

    const filteredStories = queryStr ? stories.filter(story => 
        story.title?.toLowerCase().includes(queryStr) ||
        story.preview?.toLowerCase().includes(queryStr) ||
        story.fullStory?.toLowerCase().includes(queryStr) ||
        story.name?.toLowerCase().includes(queryStr) ||
        story.college?.toLowerCase().includes(queryStr)
    ) : [];

    const filteredNotices = queryStr ? notices.filter(notice => 
        notice.title?.toLowerCase().includes(queryStr) ||
        notice.body?.toLowerCase().includes(queryStr) ||
        notice.college?.toLowerCase().includes(queryStr) ||
        notice.postedBy?.toLowerCase().includes(queryStr)
    ) : [];

    const filteredStudyMaterials = queryStr ? studyMaterials.filter(study => 
        study.title?.toLowerCase().includes(queryStr) ||
        study.content?.toLowerCase().includes(queryStr) ||
        study.authorName?.toLowerCase().includes(queryStr) ||
        study.category?.toLowerCase().includes(queryStr) ||
        study.subType?.toLowerCase().includes(queryStr) ||
        study.collegeName?.toLowerCase().includes(queryStr) ||
        study.tags?.some((t: string) => t.toLowerCase().includes(queryStr))
    ) : [];

    const filteredGroups = queryStr ? groups.filter(group => 
        group.name?.toLowerCase().includes(queryStr) ||
        group.description?.toLowerCase().includes(queryStr) ||
        group.creatorName?.toLowerCase().includes(queryStr)
    ) : [];

    const counts = {
        people: filteredUsers.length,
        posts: filteredPosts.length,
        stories: filteredStories.length,
        notices: filteredNotices.length,
        study: filteredStudyMaterials.length,
        groups: filteredGroups.length,
    };
    
    const totalResults = counts.people + counts.posts + counts.stories + counts.notices + counts.study + counts.groups;

    // Highlight Helper
    const highlight = (text: string = "") => {
        if (!queryStr) return text;
        const parts = text.split(new RegExp(`(${queryStr})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => 
                    part.toLowerCase() === queryStr.toLowerCase() ? (
                        <span key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    // Renderers for specific types
    const renderUserCard = (user: FirestoreUser & {id: string}) => (
        <Link
            key={user.id}
            href={`/profile/${user.id}`}
            className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-colors group"
        >
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName} width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                    user.displayName?.charAt(0).toUpperCase() || "?"
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {highlight(user.displayName)}
                    </h4>
                    {user.username && (
                        <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md truncate hidden sm:inline-block">
                            @{highlight(user.username)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    <span className="capitalize text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{user.role}</span>
                    {user.college && (
                        <>
                            <span>•</span>
                            <span className="truncate">{user.college}</span>
                        </>
                    )}
                </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
        </Link>
    );

    const renderNoticeCard = (notice: FirestoreNotice & {id: string}) => (
        <Link
            key={notice.id}
            href={`/notice?id=${notice.id}`}
            className="flex items-start gap-4 p-4 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-colors group"
        >
            <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 relative">
                {notice.isUrgent ? <ShieldAlert size={24} /> : <School size={24} />}
                {notice.isPinned && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-[#1a1b23]"></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                    {highlight(notice.title)}
                </h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {highlight(notice.body)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <span className="text-gray-600 dark:text-gray-300 font-bold">{highlight(notice.postedBy)}</span>
                    {notice.college && (
                        <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{highlight(notice.college)}</span>
                        </>
                    )}
                    <span>•</span>
                    <span><TimeAgo ts={notice.date} /></span>
                </div>
            </div>
        </Link>
    );

    const renderStudyCard = (study: FirestoreStudyPost & {id: string}) => (
        <Link
            key={study.id}
            href={`/study?study=${getItemNumber(study)}`}
            className="flex items-start gap-4 p-4 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-colors group"
        >
            <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                <GraduationCap size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        {study.category || study.type || "Resource"}
                    </span>
                    {study.yearRelevance && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {study.yearRelevance}
                        </span>
                    )}
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                    {highlight(study.title)}
                </h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {highlight(study.content)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <span className="text-gray-600 dark:text-gray-300 font-bold">{highlight(study.authorName || "Anonymous")}</span>
                    {study.collegeName && (
                        <>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">{highlight(study.collegeName)}</span>
                        </>
                    )}
                    {study.createdAt && (
                        <>
                            <span>•</span>
                            <span><TimeAgo ts={study.createdAt} /></span>
                        </>
                    )}
                </div>
            </div>
        </Link>
    );

    const renderGroupCard = (group: GroupDoc & {id: string}) => (
        <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-colors group"
        >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold relative">
                {group.coverUrl ? (
                    <Image src={group.coverUrl} alt={group.name} width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                    <Users size={24} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {highlight(group.name)}
                    </h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        group.privacyType === "public"
                            ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    }`}>
                        {group.privacyType === "public" ? <Globe size={10} /> : <Lock size={10} />}
                        {group.privacyType}
                    </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
                    {highlight(group.description)}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <span>Created by <strong className="text-gray-700 dark:text-gray-300">{highlight(group.creatorName)}</strong></span>
                    <span>•</span>
                    <span>{group.memberCount || 0} members</span>
                </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
        </Link>
    );

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center">
                <Loader2 size={40} className="animate-spin text-primary mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Searching Network...</p>
            </div>
        );
    }

    if (!q) {
        return (
            <div className="min-h-screen pt-24 pb-12">
                <div className="max-w-4xl mx-auto px-4 text-center py-20">
                    <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <Search size={32} className="text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Search TTC Network</h1>
                    <p className="text-gray-500 dark:text-gray-400">Enter a query above to discover people, posts, stories, notices, study materials, and groups.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 sm:pt-28 pb-12">
            <div className="max-w-4xl mx-auto px-4">
                
                {/* Search Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                            Search Results
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Showing results for <span className="font-bold text-gray-900 dark:text-white">"{q}"</span>
                        </p>
                    </div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm inline-block w-max border border-gray-100 dark:border-gray-800">
                        {totalResults} Matches
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto scrollbar-none pb-4 mb-8 gap-2 border-b border-gray-200 dark:border-gray-800 sticky top-16 z-20 bg-gray-50/90 dark:bg-[#111116]/90 backdrop-blur-xl pt-2">
                    {[
                        { id: "all", label: "All Results", count: totalResults },
                        { id: "people", label: "People", count: counts.people },
                        { id: "posts", label: "Posts", count: counts.posts },
                        { id: "stories", label: "Stories", count: counts.stories },
                        { id: "study", label: "Study Materials", count: counts.study },
                        { id: "notices", label: "Notices", count: counts.notices },
                        { id: "groups", label: "Groups", count: counts.groups }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.id 
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md" 
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700"
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-2 rounded-full ${
                                    activeTab === tab.id 
                                    ? "bg-white/20 dark:bg-black/20" 
                                    : "bg-gray-100 dark:bg-gray-700"
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Empty State */}
                {totalResults === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-[#1a1b23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search size={32} className="text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No results found</h2>
                        <p className="text-gray-500 dark:text-gray-400">We couldn't find any matches across the network for "{q}".<br/>Try using different keywords or checking for typos.</p>
                    </div>
                )}

                {/* Results Grid */}
                <div className="space-y-12">
                    
                    {/* PEOPLE */}
                    {(activeTab === "all" || activeTab === "people") && filteredUsers.length > 0 && (
                        <section className="animate-fade-in-up">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <User size={16} /> People
                                </h3>
                                {activeTab === "all" && filteredUsers.length > 6 && (
                                    <button onClick={() => setActiveTab("people")} className="text-sm font-bold text-primary hover:underline">See All {filteredUsers.length} →</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(activeTab === "all" ? filteredUsers.slice(0, 6) : filteredUsers).map(renderUserCard)}
                            </div>
                        </section>
                    )}

                    {/* STUDY MATERIALS */}
                    {(activeTab === "all" || activeTab === "study") && filteredStudyMaterials.length > 0 && (
                        <section className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <GraduationCap size={16} /> Study Materials & Resources
                                </h3>
                                {activeTab === "all" && filteredStudyMaterials.length > 4 && (
                                    <button onClick={() => setActiveTab("study")} className="text-sm font-bold text-primary hover:underline">See All {filteredStudyMaterials.length} →</button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {(activeTab === "all" ? filteredStudyMaterials.slice(0, 4) : filteredStudyMaterials).map(renderStudyCard)}
                            </div>
                        </section>
                    )}

                    {/* POSTS */}
                    {(activeTab === "all" || activeTab === "posts") && filteredPosts.length > 0 && (
                        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Sparkles size={16} /> Posts & Events
                                </h3>
                                {activeTab === "all" && filteredPosts.length > 3 && (
                                    <button onClick={() => setActiveTab("posts")} className="text-sm font-bold text-primary hover:underline">See All {filteredPosts.length} →</button>
                                )}
                            </div>
                            <div className="space-y-6">
                                {(activeTab === "all" ? filteredPosts.slice(0, 3) : filteredPosts).map(post => (
                                    <PostCard key={post.id} post={post} profile={profile} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* STORIES */}
                    {(activeTab === "all" || activeTab === "stories") && filteredStories.length > 0 && (
                        <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <BookOpen size={16} /> Stories
                                </h3>
                                {activeTab === "all" && filteredStories.length > 4 && (
                                    <button onClick={() => setActiveTab("stories")} className="text-sm font-bold text-primary hover:underline">See All {filteredStories.length} →</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(activeTab === "all" ? filteredStories.slice(0, 4) : filteredStories).map(story => (
                                    <StoryCard key={story.id} story={story} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* NOTICES */}
                    {(activeTab === "all" || activeTab === "notices") && filteredNotices.length > 0 && (
                        <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <ShieldAlert size={16} /> Notices
                                </h3>
                                {activeTab === "all" && filteredNotices.length > 4 && (
                                    <button onClick={() => setActiveTab("notices")} className="text-sm font-bold text-primary hover:underline">See All {filteredNotices.length} →</button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {(activeTab === "all" ? filteredNotices.slice(0, 4) : filteredNotices).map(renderNoticeCard)}
                            </div>
                        </section>
                    )}

                    {/* GROUPS */}
                    {(activeTab === "all" || activeTab === "groups") && filteredGroups.length > 0 && (
                        <section className="animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <Users size={16} /> Groups & Communities
                                </h3>
                                {activeTab === "all" && filteredGroups.length > 4 && (
                                    <button onClick={() => setActiveTab("groups")} className="text-sm font-bold text-primary hover:underline">See All {filteredGroups.length} →</button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(activeTab === "all" ? filteredGroups.slice(0, 4) : filteredGroups).map(renderGroupCard)}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-[#111116]">
            <Suspense fallback={
                <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-primary mb-4" />
                </div>
            }>
                <SearchContent />
            </Suspense>
        </main>
    );
}
