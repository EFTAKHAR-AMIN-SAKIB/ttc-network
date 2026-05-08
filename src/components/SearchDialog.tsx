"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, User, ArrowRight, Sparkles, BookOpen, Clock, MapPin, School, History, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
    getAllUsers, 
    getApprovedPosts, 
    getApprovedStories, 
    FirestoreUser, 
    FirestorePost, 
    FirestoreStory, 
} from "@/lib/firestore";
import { timeAgo } from "@/components/Social/SocialUtils";

interface SearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
    const [query, setQuery] = useState("");
    const router = useRouter();
    
    // Data states for quick preview
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [posts, setPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [stories, setStories] = useState<(FirestoreStory & { id: string })[]>([]);
    
    // Recent searches
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    // Load recent searches on mount
    useEffect(() => {
        const saved = localStorage.getItem("ttc_recent_searches");
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            } catch (e) {
                // ignore
            }
        }
    }, []);

    const saveRecentSearch = (q: string) => {
        if (!q.trim()) return;
        const newSearches = [q.trim(), ...recentSearches.filter(s => s.toLowerCase() !== q.trim().toLowerCase())].slice(0, 5);
        setRecentSearches(newSearches);
        localStorage.setItem("ttc_recent_searches", JSON.stringify(newSearches));
    };

    const removeRecentSearch = (e: React.MouseEvent, q: string) => {
        e.stopPropagation();
        const newSearches = recentSearches.filter(s => s !== q);
        setRecentSearches(newSearches);
        localStorage.setItem("ttc_recent_searches", JSON.stringify(newSearches));
    };

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            
            // Fetch basic data in background for quick preview (no need for notices here to keep it light)
            Promise.all([
                getAllUsers().catch(() => []),
                getApprovedPosts().catch(() => []),
                getApprovedStories().catch(() => [])
            ]).then(([u, p, s]) => {
                setUsers(u as any);
                setPosts(p as any);
                setStories(s as any);
            });
                
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const performSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        saveRecentSearch(searchQuery);
        onClose();
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    // Handle Search Submit / Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && query.trim()) {
            performSearch(query);
        }
    };

    // Quick Preview Filters
    const q = query.trim().toLowerCase();
    
    // STRICTLY NAME AND USERNAME for quick preview
    const filteredUsers = q ? users.filter(user => 
        user.displayName?.toLowerCase().includes(q) ||
        user.username?.toLowerCase().includes(q)
    ) : [];

    const filteredPosts = q ? posts.filter(post => 
        post.eventName?.toLowerCase().includes(q) ||
        post.description?.toLowerCase().includes(q) ||
        post.collegeName?.toLowerCase().includes(q)
    ) : [];

    const filteredStories = q ? stories.filter(story => 
        story.title?.toLowerCase().includes(q) ||
        story.preview?.toLowerCase().includes(q) ||
        story.name?.toLowerCase().includes(q)
    ) : [];

    // Highlight helper
    const highlight = (text: string = "") => {
        if (!q) return text;
        const parts = text.split(new RegExp(`(${q})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => 
                    part.toLowerCase() === q.toLowerCase() ? (
                        <span key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    const hasResults = filteredUsers.length > 0 || filteredPosts.length > 0 || filteredStories.length > 0;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-start justify-center pt-0 sm:pt-[6vh] sm:px-4 bg-white sm:bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white dark:bg-[#1a1b23] sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border border-gray-100 dark:border-gray-800 flex flex-col relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header & Input */}
                    <div className="flex items-center p-3 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0 sticky top-0 bg-white dark:bg-[#1a1b23] z-20">
                        <Search size={22} className="text-primary ml-2" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search people, posts, stories..."
                            className="flex-1 bg-transparent border-none px-4 py-2 sm:text-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 placeholder-gray-400 font-bold"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 ml-1 sm:ml-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest px-2">ESC</span>
                            <X size={20} className="sm:hidden" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 bg-white dark:bg-[#1a1b23]">
                        
                        {/* RECENT SEARCHES */}
                        {!query && recentSearches.length > 0 && (
                            <div className="p-3 sm:p-5">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                                    <History size={14} /> Recent Searches
                                </h3>
                                <div className="space-y-1">
                                    {recentSearches.map((search, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => performSearch(search)}
                                            className="flex items-center justify-between p-3 sm:px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Search size={16} className="text-gray-300 dark:text-gray-600" />
                                                <span className="text-base font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">{search}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => removeRecentSearch(e, search)}
                                                className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EMPTY STATE */}
                        {!query && recentSearches.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-4 text-gray-400 shadow-inner">
                                    <Search size={28} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Find Anything</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm font-medium">
                                    Search for your friends, upcoming events, insightful stories, and official notices.
                                </p>
                            </div>
                        )}

                        {/* NO RESULTS PREVIEW */}
                        {query && !hasResults && (
                            <div className="p-5 text-center">
                                <button
                                    onClick={() => performSearch(query)}
                                    className="w-full flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-2xl text-primary transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <Search size={20} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold">Search all of TTC Network for</span>
                                            <span className="block text-base font-black truncate max-w-[200px] sm:max-w-xs">"{query}"</span>
                                        </div>
                                    </div>
                                    <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {/* QUICK PREVIEW RESULTS */}
                        {query && hasResults && (
                            <div className="p-3 sm:p-5 space-y-6">
                                
                                {/* SEE ALL BUTTON */}
                                <button
                                    onClick={() => performSearch(query)}
                                    className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-2xl hover:bg-primary-hover shadow-md hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Search size={20} />
                                        <span className="font-bold">See all results for "{query}"</span>
                                    </div>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* PEOPLE PREVIEW (Max 3) */}
                                {filteredUsers.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                                            <User size={12} /> People matches
                                        </h3>
                                        <div className="space-y-1">
                                            {filteredUsers.slice(0, 3).map(user => (
                                                <Link
                                                    key={user.id}
                                                    href={`/profile/${user.id}`}
                                                    onClick={() => { saveRecentSearch(query); onClose(); }}
                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-base font-bold shadow-sm">
                                                        {user.photoURL ? (
                                                            <Image src={user.photoURL} alt={user.displayName} width={40} height={40} className="object-cover w-full h-full" />
                                                        ) : (
                                                            user.displayName?.charAt(0).toUpperCase() || "?"
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                {highlight(user.displayName)}
                                                            </h4>
                                                            {user.username && (
                                                                <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md truncate">
                                                                    @{highlight(user.username)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                                                            {user.college}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* POSTS PREVIEW (Max 2) */}
                                {filteredPosts.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                                            <Sparkles size={12} /> Post matches
                                        </h3>
                                        <div className="space-y-1">
                                            {filteredPosts.slice(0, 2).map(post => (
                                                <Link
                                                    key={post.id}
                                                    href={`/news-feed?post=${post.id}`}
                                                    onClick={() => { saveRecentSearch(query); onClose(); }}
                                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                                        {post.type === "club" ? <Sparkles size={18} /> : <MapPin size={18} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                                                            {highlight(post.eventName)}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                                            <span className="truncate max-w-[120px]">{highlight(post.collegeName)}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* STORIES PREVIEW (Max 2) */}
                                {filteredStories.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                                            <BookOpen size={12} /> Story matches
                                        </h3>
                                        <div className="space-y-1">
                                            {filteredStories.slice(0, 2).map(story => (
                                                <Link
                                                    key={story.id}
                                                    href={`/story/${story.id}`}
                                                    onClick={() => { saveRecentSearch(query); onClose(); }}
                                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                                >
                                                    <div className="w-10 h-10 rounded-xl flex-shrink-0 border-2 border-amber-200 dark:border-amber-900 overflow-hidden relative">
                                                        {story.authorPhoto ? (
                                                            <Image src={story.authorPhoto} alt={story.name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500">
                                                                <BookOpen size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                                                            {highlight(story.title)}
                                                        </h4>
                                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                                            <span className="font-bold">{highlight(story.name)}</span> — {highlight(story.preview)}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
