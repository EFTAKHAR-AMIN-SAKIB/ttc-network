"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PenLine, Sparkles, School, Users, Trash2, Shield, Plus } from "lucide-react";
import Link from "next/link";
import { 
    subscribeStories, deleteStory, type FirestoreStory,
    subscribeModerationCount, subscribeStoryHeroSettings, getTotalUserCount,
    type StoryHeroSettings 
} from "@/lib/firestore";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import StoryCard from "@/components/StoryCard";
import { useToast } from "@/contexts/ToastContext";
import StoryFilter from "@/components/StoryFilter";
import StorySkeleton from "@/components/StorySkeleton";
import StoryShareModal from "@/components/StoryShareModal";

type Story = FirestoreStory & { id: string };

export default function StoryPage() {
    const { user, profile, loading: loadingAuth } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showModeration, setShowModeration] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const { confirm, setIsLoading, close } = useConfirm();
    const { showToast } = useToast();
    
    // Dynamic Hero Stats
    const [heroData, setHeroData] = useState<StoryHeroSettings | null>(null);
    const [liveUserCount, setLiveUserCount] = useState<number>(0);

    useEffect(() => {
        if (loadingAuth) return;
        const unsubStories = subscribeStories((data) => {
            setStories(data as Story[]);
            setLoading(false);
        });

        const unsubCount = subscribeModerationCount(
            "stories",
            profile?.collegeId,
            profile?.role === "admin" || profile?.role === "super_manager",
            (count) => setPendingCount(count)
        );

        const unsubHero = subscribeStoryHeroSettings(async (settings) => {
            setHeroData(settings);
            if (settings.autoCountCommunity) {
                const count = await getTotalUserCount();
                setLiveUserCount(count);
            }
        });

        return () => {
            unsubStories();
            unsubCount();
            unsubHero();
        };
    }, [loadingAuth, profile]);

    const filteredStories = stories.filter((s) => {
        const isOwner = profile?.uid && s.authorId === profile.uid;
        const isAdmin = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "super_manager";
        
        if (s.visibility === "private" && !isOwner && !isAdmin) return false;
        if ((s.visibility === "campus" || s.visibility === "college_only") && s.collegeId !== profile?.collegeId && !isAdmin && !isOwner) return false;

        if (activeTab === "all") return true;
        if (activeTab === "my-college") return s.collegeId === profile?.collegeId;
        return s.authorRole === activeTab;
    });

    const handleDeleteStory = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Story?",
            message: "Are you sure you want to delete this story? This action cannot be undone and will remove all associated narrative data.",
            confirmText: "Delete Story",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteStory(id);
        } catch (err) {
            console.error("Delete story failed:", err);
            showToast("Failed to delete story.", "error");
        } finally {
            close();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#0c0c10]">
            {/* ═══════════ HERO ═══════════ */}
            <div className="relative overflow-hidden pt-12 pb-20 warm-textured-hero border-b-4 border-primary">
              <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold mb-6 animate-fade-in">
                       <Sparkles className="w-4 h-4" />
                       Community Driven Narratives
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-gray-100 mb-6 leading-tight">
                      One Platform. <br/>
                      All Colleges. <br/>
                      <span className="text-primary italic animate-variable-underline">Every Story.</span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl leading-relaxed">
                      Every TTC journey is a footprint of resilience. Share your struggles, victories, and lessons with the largest community of Bangladeshi educators.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                        <button
                          onClick={() => setShowSubmitModal(true)}
                          className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-95 flex items-center gap-3 animate-pulse-breathe"
                        >
                          <PenLine className="w-6 h-6" />
                          Share My Journey
                        </button>
                        {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                            <button 
                                onClick={() => setShowModeration(true)}
                                className="relative flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm shadow-sm"
                            >
                                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Review Queue</span>
                                <AnimatePresence>
                                    {pendingCount > 0 && (
                                        <motion.span 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1c24] shadow-lg"
                                        >
                                            {pendingCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        )}
                    </div>
                  </div>

                     <div className="flex-1 grid grid-cols-2 gap-4">
                        {[
                          { label: "Colleges", value: heroData?.collegesCount || "14", icon: <School className="w-5 h-5 text-amber-500" /> },
                          { label: "Community", value: heroData?.autoCountCommunity ? `${liveUserCount}+` : (heroData?.communityCount || "1.2k+"), icon: <Users className="w-5 h-5 text-emerald-500" /> },
                          { label: "Stories", value: stories.length || (heroData?.storiesFallback || "85+"), icon: <BookOpen className="w-5 h-5 text-blue-500" /> },
                          { label: "Impact", value: heroData?.impactLevel || "High", icon: <Sparkles className="w-5 h-5 text-purple-500" /> },
                        ].map((stat, i) => (
                          <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl border-2 border-white dark:border-gray-700 shadow-sm animate-slide-in-up" 
                               style={{ animationDelay: `${i * 0.1}s` }}>
                            {!heroData ? (
                                <div className="space-y-2 animate-pulse">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700" />
                                    <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                                    <div className="h-3 bg-gray-50 dark:bg-gray-800 rounded w-1/3" />
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-4">
                                      {stat.icon}
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-gray-100">{stat.value}</div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</div>
                                </>
                            )}
                          </div>
                        ))}
                      </div>
                </div>
              </div>
            </div>

            {/* ═══════════ FEED ═══════════ */}
            <div className="max-w-7xl mx-auto px-6 -mt-10 pb-20">
              <div className="sticky top-4 z-40 mb-10">
                <StoryFilter 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                  showCollegeFilter={!!user} 
                />
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => <StorySkeleton key={i} />)}
                </div>
              ) : filteredStories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStories.map((story) => (
                    <StoryCard 
                        key={story.id} 
                        story={story} 
                        onEdit={(s) => {
                            setEditingStory(s);
                            setShowSubmitModal(true);
                        }}
                        onDelete={handleDeleteStory}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-600">No stories found in this category</h3>
                  <button onClick={() => setActiveTab("all")} className="mt-4 text-primary font-bold hover:underline">View all stories</button>
                </div>
              )}
            </div>

            <StoryShareModal 
              isOpen={showSubmitModal} 
              editStory={editingStory}
              onClose={() => {
                setShowSubmitModal(false);
                setEditingStory(null);
              }} 
            />



            <GenericModerationPanel 
                isOpen={showModeration}
                onClose={() => setShowModeration(false)}
                profile={profile}
                type="stories"
            />
        </div>
    );
}
