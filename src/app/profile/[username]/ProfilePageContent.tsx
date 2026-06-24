"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AtSign, Globe, Briefcase, Plus, CheckCircle, Info, AlertTriangle, ChevronRight, Share2, MapPin, 
    Target, Pencil, Save, X, Camera, Loader2, ImageIcon, Trash2, Search,
    Heart, Clock, Shield, Activity, GraduationCap, Building, Quote, BookOpen, BookText, User, Award,
    Sparkles, Sparkle, Mail, ExternalLink, Calendar, Copy, Check, ChevronDown, MessageSquare, ThumbsUp,
    Phone, MessageCircle, UserCheck, UserPlus, Eye, EyeOff, Facebook, Bookmark
} from "lucide-react";
import Image from "next/image";
import {
    doc, getDoc, updateDoc, serverTimestamp,
    collection, query, where, onSnapshot, orderBy, limit, getDocs
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth, type UserProfile } from "@/contexts/AuthContext";
import { colleges } from "@/data/colleges";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { 
    subscribeUserStories, 
    getUserActivity, 
    checkIsFollowing, 
    toggleFollowUser, 
    deleteOwnStory, 
    deleteOwnPost, 
    getUserFeedContent,
    addAchievement,
    removeAchievement,
    deleteComment,
    syncUserProfileUpdates,
    getSavedPostsFull,
    toggleSavePost,
    toggleSaveStory,
    getSavedStoriesFull,
    toggleSaveNotice,
    getSavedNoticesFull,
    toggleSaveStudyPost,
    getSavedStudyPostsFull
} from "@/lib/firestore";
import { uploadFile, deleteFromStorage } from "@/lib/storage";
import { ProfileEditDrawer } from "./ProfileEditDrawer";
import { ProfileCompletionCard, ProfileCompletionBar } from "./ProfileCompletionCard";
import StoryCard from "@/components/StoryCard";
import PostCard from "@/components/PostCard";
import StudyNoteCard from "@/app/study/components/StudyNoteCard";
import StudyScheduleCard from "@/app/study/components/StudyScheduleCard";
import ImageLightbox from "@/components/ImageLightbox";

// ═══════════════════════════════════════════════════
//  SUB-COMPONENTS & HELPERS
// ═══════════════════════════════════════════════════

const BadgeDot = ({ role }: { role: string }) => {
    const colors: Record<string, string> = {
        student: "bg-amber-400",
        teacher: "bg-blue-500",
        admin: "bg-purple-500",
        manager: "bg-rose-500",
    };
    return <div className={`w-3 h-3 rounded-full border-2 border-white ${colors[role] || "bg-gray-400"}`} />;
};

const RoleTag = ({ role }: { role: string }) => {
    const styles: Record<string, string> = {
        student: "bg-amber-50 text-amber-700 border-amber-100",
        teacher: "bg-blue-50 text-blue-700 border-blue-100",
        admin: "bg-purple-50 text-purple-700 border-purple-100",
        manager: "bg-rose-50 text-rose-700 border-rose-100",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${styles[role] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
            {role}
        </span>
    );
};

const ActivityItem = ({ act, isOwn, onDelete, onNavigate }: { act: any; isOwn?: boolean; onDelete?: (id: string, type: string) => void; onNavigate?: () => void }) => {
    const icons: Record<string, any> = {
        post: Globe,
        story: BookText,
        comment: MessageSquare,
        reaction: Heart
    };
    const Icon = icons[act.activityType] || Activity;
    const statusColors: Record<string, string> = {
        pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    
    return (
        <div 
            onClick={onNavigate}
            className={`flex gap-3 sm:gap-4 p-4 sm:p-5 bg-white dark:bg-gray-900 border-2 border-slate-50 dark:border-gray-800 rounded-2xl sm:rounded-3xl group hover:border-primary/20 transition-all ${onNavigate ? 'cursor-pointer active:scale-[0.98]' : ''}`}
        >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                        {act.activityType === 'story' && "Shared a new story"}
                        {act.activityType === 'post' && "Posted an update"}
                        {act.activityType === 'comment' && "Commented on a post"}
                        {act.activityType === 'reaction' && "Inspired by a story"}
                    </div>
                    {isOwn && act.status && act.status !== 'approved' && act.status !== 'published' && (
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[act.status] || ''}`}>
                            {act.status}
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-1">{act.caption || act.content || act.title || act.text || act.eventName || "Social activity..."}</div>
                <div className="flex items-center gap-2 mt-2 text-[9px] font-black uppercase text-gray-300 tracking-widest">
                    <Clock size={10} />
                    {act.timestamp?.seconds ? new Date(act.timestamp.seconds * 1000).toLocaleDateString() : act.createdAt?.seconds ? new Date(act.createdAt.seconds * 1000).toLocaleDateString() : "Recently"}
                    {onNavigate && <ChevronRight size={10} className="ml-auto text-gray-300 group-hover:text-primary transition-colors" />}
                </div>
            </div>
            {isOwn && onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(act.id, act.activityType); }}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0 self-center"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
};

function AchievementModal({ isOpen, onClose, onUpload, isUploading }: { isOpen: boolean; onClose: () => void; onUpload: (data: any) => Promise<void>; isUploading: boolean }) {
    const [title, setTitle] = useState("");
    const [issuer, setIssuer] = useState("");
    const [date, setDate] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !file) return;
        await onUpload({ title, issuer, date, file });
        setTitle(""); setIssuer(""); setDate(""); setFile(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >
                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-navy-900 dark:text-white">Add Achievement</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Best Student Award" className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Issuer / Organization</label>
                        <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Dhaka University" className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Date</label>
                        <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. Jan 2024" className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Certificate File (Image or PDF)</label>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                    </div>
                    <button type="submit" disabled={isUploading} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : "Upload Achievement"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
//  TAB COMPONENTS
// ═══════════════════════════════════════════════════

function AboutTab({ profile, isTeacher }: { profile: UserProfile; isTeacher: boolean }) {
    const college = colleges.find(c => c.id === profile.collegeId);
    
    const bioStyle = profile.bioStyle || "serif";
    const bioFontSize = profile.bioFontSize || "xl";

    const fontSizes: Record<string, string> = {
        sm: "text-sm sm:text-base",
        base: "text-base sm:text-lg",
        lg: "text-lg sm:text-xl",
        xl: "text-xl sm:text-2xl",
        "2xl": "text-2xl sm:text-3xl font-bold"
    };

    const sizeClass = fontSizes[bioFontSize] || fontSizes.xl;

    const renderClassicBio = () => (
        <div className="relative p-6 sm:p-8 bg-white dark:bg-gray-900 border-l-4 border-primary rounded-r-3xl rounded-l-md shadow-sm border border-slate-100 dark:border-gray-800/80 overflow-hidden">
            <Quote className="absolute top-4 right-4 w-20 h-20 text-primary/5 pointer-events-none -rotate-6" />
            <p className={`${sizeClass} font-serif text-navy-900 dark:text-gray-100 leading-relaxed font-bengali break-words`}>
                {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
            </p>
        </div>
    );

    const renderModernBio = () => (
        <div className="relative p-6 sm:p-8 bg-gradient-to-tr from-slate-50 to-slate-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-slate-200/60 dark:border-gray-800 rounded-[2rem] shadow-sm overflow-hidden">
            <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary/40 font-black text-xs">A</div>
            <p className={`${sizeClass} font-sans text-slate-800 dark:text-slate-200 leading-relaxed tracking-tight font-bengali break-words pt-4`}>
                {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
            </p>
        </div>
    );

    const renderHandwrittenBio = () => (
        <div className="relative p-6 sm:p-8 notebook-paper border-2 border-slate-200 dark:border-gray-800 rounded-3xl shadow-md min-h-[160px] overflow-hidden noise-bg">
            <div className="absolute left-[30px] top-0 bottom-0 w-0.5 bg-red-400/25 pointer-events-none" />
            <p className={`${sizeClass} font-handwritten text-blue-800 dark:text-amber-100 leading-loose tracking-wide break-words pl-[25px]`}>
                {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
            </p>
        </div>
    );

    const renderCyberBio = () => (
        <div className="relative p-6 sm:p-8 bg-white/40 dark:bg-gray-950/40 backdrop-blur-md border border-primary/20 dark:border-primary/30 rounded-[2.5rem] shadow-xl overflow-hidden shadow-primary/5">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-accent/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="flex gap-2 items-center mb-4">
                <Sparkles size={16} className="text-primary animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Interactive Narrative</span>
            </div>
            <p className={`${sizeClass} font-sans text-navy-900 dark:text-white leading-relaxed tracking-wide font-medium font-bengali break-words`}>
                {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
            </p>
        </div>
    );

    const renderMinimalBio = () => (
        <div className="relative py-6 px-8 border border-dashed border-slate-200 dark:border-gray-800 rounded-2xl bg-slate-50/30 dark:bg-[#0f1117]/30">
            <p className={`${sizeClass} font-sans text-slate-700 dark:text-slate-300 leading-relaxed font-bengali break-words`}>
                {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
            </p>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
        >
            {/* Bio Section */}
            <section className="relative group">
                {bioStyle === "serif" && renderClassicBio()}
                {bioStyle === "sans" && renderModernBio()}
                {bioStyle === "writer" && renderHandwrittenBio()}
                {bioStyle === "glow" && renderCyberBio()}
                {bioStyle === "minimal" && renderMinimalBio()}
            </section>

            {/* Favorite Quote Block */}
            {profile.favoriteQuote && (
                <div className="relative p-6 sm:p-8 bg-gradient-to-br from-amber-500/[0.03] to-amber-600/[0.08] dark:from-amber-500/[0.05] dark:to-transparent border-l-4 border-amber-500 rounded-r-3xl rounded-l-md shadow-sm border border-slate-100 dark:border-gray-800/80 overflow-hidden">
                    <Quote className="absolute top-4 right-4 w-16 h-16 text-amber-500/10 pointer-events-none -rotate-12" />
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl shrink-0 mt-1">
                            <Quote size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base sm:text-lg italic font-medium text-navy-800 dark:text-gray-200 font-bengali leading-relaxed break-words">
                                "{profile.favoriteQuote}"
                            </p>
                            {profile.favoriteQuoteAuthor && (
                                <p className="text-right text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-4 font-handwritten text-lg">
                                    — {profile.favoriteQuoteAuthor}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Academic & Professional Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Academic Context / Institution Details */}
                <div className="p-8 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                    {profile.role === "teacher" ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-primary/5 text-primary rounded-2xl"><Building size={20} /></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                                    {profile.programme ? "Teaching & Academic Status" : "Teaching Status"}
                                </h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Employment Type</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                            {profile.status === "govt" ? "Govt. TTC Teacher" : "Non-Govt. TTC Teacher"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Core Subjects / Department</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.subjects || "General Education"}</div>
                                    </div>
                                    {profile.programme && (
                                        <>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Programme</label>
                                                <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                                    {profile.programme === "MEd" ? "M.Ed (Master of Education)" : "B.Ed (Honours)"}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Year / Session</label>
                                                <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.year || "N/A"}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Semester</label>
                                                <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.semester || "N/A"}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <hr className="border-slate-50 dark:border-gray-800" />
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Primary College</label>
                                    <div className="text-sm font-black text-primary uppercase">{college?.name || "Not Specified"}</div>
                                    <div className="text-[10px] font-bold text-gray-400 mt-0.5">{college?.city || "N/A"}</div>
                                </div>
                            </div>
                        </>
                    ) : profile.role === "admin" || profile.role === "manager" ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-primary/5 text-primary rounded-2xl"><Shield size={20} /></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                                    {profile.programme ? "Institutional Role & Academic Status" : "Institutional Role"}
                                </h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={profile.programme ? "col-span-1" : "col-span-2"}>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Role Type</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                            {profile.role === "admin" ? "Platform Administrator" : "College Manager"}
                                        </div>
                                    </div>
                                    {profile.programme && (
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Programme</label>
                                            <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                                {profile.programme === "MEd" ? "M.Ed (Master of Education)" : "B.Ed (Honours)"}
                                            </div>
                                        </div>
                                    )}
                                    {profile.year && (
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Year / Session</label>
                                            <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.year}</div>
                                        </div>
                                    )}
                                    {profile.semester && (
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Semester</label>
                                            <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.semester}</div>
                                        </div>
                                    )}
                                </div>
                                <hr className="border-slate-50 dark:border-gray-800" />
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Primary College</label>
                                    <div className="text-sm font-black text-primary uppercase">{college?.name || "Not Specified"}</div>
                                    <div className="text-[10px] font-bold text-gray-400 mt-0.5">{college?.city || "N/A"}</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-primary/5 text-primary rounded-2xl"><GraduationCap size={20} /></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Academic Status</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Programme</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                            {profile.programme === "MEd" ? "M.Ed (Master of Education)" : "B.Ed (Honours)"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Year / Session</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.year || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Semester</label>
                                        <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.semester || "N/A"}</div>
                                    </div>
                                </div>
                                <hr className="border-slate-50 dark:border-gray-800" />
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Primary College</label>
                                    <div className="text-sm font-black text-primary uppercase">{college?.name || "Not Specified"}</div>
                                    <div className="text-[10px] font-bold text-gray-400 mt-0.5">{college?.city || "N/A"}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Professional Context */}
                <div className="p-8 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-green-500/5 text-green-600 rounded-2xl"><Briefcase size={20} /></div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Professional Info</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Specialization</label>
                            <div className="text-sm font-bold text-navy-900 dark:text-gray-100">{profile.industry || "General Education"}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Working Model</label>
                                <div className="text-sm font-bold text-navy-900 dark:text-gray-100 px-2 py-0.5 bg-slate-50 dark:bg-gray-800 rounded-lg w-fit">
                                    {profile.workType || "In-Person"}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Availability</label>
                                <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {profile.availability || "Full-time"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Timelines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                {/* Work History */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2">
                        <Activity size={16} className="text-primary" /> Service History
                    </h3>
                    <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-gray-800">
                        {profile.workHistory && profile.workHistory.length > 0 ? profile.workHistory.map((job, i) => (
                            <div key={i} className="relative pl-10">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-[#FAFAF8] bg-primary shadow-sm z-10" />
                                <div className="text-sm font-black text-navy-900 dark:text-gray-100">{job.company}</div>
                                <div className="text-xs font-bold text-primary mt-1">{job.role}</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{job.startDate} — {job.endDate || "Present"}</div>
                                {job.description && <p className="text-[11px] text-gray-500 font-medium mt-3 leading-relaxed">{job.description}</p>}
                            </div>
                        )) : (
                            <p className="text-xs text-gray-300 font-bold italic pl-4">No historical records added yet.</p>
                        )}
                    </div>
                </div>

                {/* Education History */}
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2">
                        <Award size={16} className="text-amber-500" /> Academic Timeline
                    </h3>
                    <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-gray-800">
                        {profile.educationHistory && profile.educationHistory.length > 0 ? profile.educationHistory.map((edu, i) => (
                            <div key={i} className="relative pl-10">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-[#FAFAF8] bg-amber-500 shadow-sm z-10" />
                                <div className="text-sm font-black text-navy-900 dark:text-gray-100">{edu.institution}</div>
                                <div className="text-xs font-bold text-amber-600 mt-1">{edu.degree}</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{edu.startDate} — {edu.endDate || "Ongoing"}</div>
                            </div>
                        )) : (
                            <p className="text-xs text-gray-300 font-bold italic pl-4">Academic journey details are coming soon.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Narrative Sections (Future & Achievements) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {profile.goals && (
                    <div className="bg-navy-900 dark:bg-[#16181C] rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                        <Target className="absolute -top-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><Target className="text-primary" /></div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight">Future Ambitions</h3>
                            <p className="text-white/60 font-medium leading-relaxed font-bengali">{profile.goals}</p>
                        </div>
                    </div>
                )}
                {profile.achievements && (
                    <div className="bg-primary rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                        <Award className="absolute -top-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><Award className="text-white" /></div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight">Key Achievements</h3>
                            <p className="text-white/80 font-medium leading-relaxed font-bengali">{profile.achievements}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Skills Pills */}
            <section>
                <h3 className="text-sm font-black uppercase tracking-[0.25em] text-gray-400 mb-6 px-2">Core Competencies</h3>
                <div className="flex flex-wrap gap-3">
                    {profile.skills && profile.skills.length > 0 ? profile.skills.map((skill, i) => (
                        <span key={i} className="px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-800 rounded-2xl text-[11px] font-black uppercase text-gray-500 hover:border-primary/20 hover:text-primary transition-all cursor-default">
                            {skill}
                        </span>
                    )) : (
                        <div className="text-xs text-gray-300 font-bold italic p-10 border-2 border-dashed border-slate-100 rounded-[2rem] w-full text-center">
                            No skills tagged yet.
                        </div>
                    )}
                </div>
            </section>
        </motion.div>
    );
}

function AllTab({
    profile,
    isTeacher,
    allActivity,
    loadingFeed,
    currentUserProfile,
    isViewingAsOwner,
    handleDeletePost,
    handleEditPost,
    handleDeleteStory,
    handleEditStory,
    handleDeleteComment,
    user,
    router
}: {
    profile: UserProfile;
    isTeacher: boolean;
    allActivity: any[];
    loadingFeed: boolean;
    currentUserProfile: any;
    isViewingAsOwner: boolean;
    handleDeletePost: any;
    handleEditPost: any;
    handleDeleteStory: any;
    handleEditStory: any;
    handleDeleteComment: any;
    user: any;
    router: any;
}) {
    const college = colleges.find(c => c.id === profile.collegeId);
    const bioStyle = profile.bioStyle || "serif";
    const bioFontSize = profile.bioFontSize || "xl";
    const fontSizes: Record<string, string> = {
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl font-bold"
    };
    const sizeClass = fontSizes[bioFontSize] || fontSizes.xl;

    const renderBioContent = () => {
        if (!profile.bio) return null;
        return (
            <div className="relative p-6 sm:p-8 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-slate-200/60 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="flex gap-2 items-center mb-3">
                    <Sparkles size={14} className="text-primary animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">Interactive Narrative</span>
                </div>
                <p className={`${sizeClass} text-navy-900 dark:text-gray-100 leading-relaxed font-sans break-words pt-1`}>
                    {profile.bio}
                </p>
            </div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Bio/Narrative */}
            {profile.bio && (
                <section>
                    {renderBioContent()}
                </section>
            )}

            {/* Academic & Professional Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 sm:p-8 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            {profile.role === "teacher" ? (
                                <div className="p-2.5 bg-primary/5 text-primary rounded-xl"><Building size={16} /></div>
                            ) : profile.role === "admin" || profile.role === "manager" ? (
                                <div className="p-2.5 bg-primary/5 text-primary rounded-xl"><Shield size={16} /></div>
                            ) : (
                                <div className="p-2.5 bg-primary/5 text-primary rounded-xl"><GraduationCap size={16} /></div>
                            )}
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                Academic Status
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Role / Programme</label>
                                <div className="text-xs font-bold text-navy-900 dark:text-gray-100">
                                    {profile.role === "teacher" ? (profile.status === "govt" ? "Govt. Teacher" : "Non-Govt. Teacher") :
                                     profile.role === "admin" ? "Platform Admin" :
                                     profile.role === "manager" ? "College Manager" : 
                                     (profile.programme === "MEd" ? "M.Ed Student" : "B.Ed Student")}
                                </div>
                            </div>
                            {profile.subjects && (
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Subjects</label>
                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-100 truncate">{profile.subjects}</div>
                                </div>
                            )}
                            {profile.year && (
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Year / Session</label>
                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-100">{profile.year}</div>
                                </div>
                            )}
                            {profile.semester && (
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Semester</label>
                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-100">{profile.semester}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-gray-800">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">College</label>
                        <div className="text-xs font-black text-primary uppercase truncate">{college?.name || "Not Specified"}</div>
                        <div className="text-[9px] font-bold text-gray-400">{college?.city || "N/A"}</div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-green-500/5 text-green-600 rounded-xl"><Briefcase size={16} /></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Professional Info</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Specialization</label>
                                <div className="text-xs font-bold text-navy-900 dark:text-gray-100">{profile.industry || "General Education"}</div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Working Model</label>
                                <div className="text-xs font-bold text-navy-900 dark:text-gray-100 px-2 py-0.5 bg-slate-50 dark:bg-gray-800 rounded-lg w-fit">
                                    {profile.workType || "In-Person"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Availability</label>
                            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active & Available</span>
                            </div>
                        </div>
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
                                Website <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Verified Badges Row */}
            {profile.badges && profile.badges.length > 0 && (
                <section className="p-6 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={16} className="text-primary" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Verified Credentials</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {profile.badges.map((badge) => (
                            <div key={badge.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-800/40 border border-slate-100 dark:border-gray-800 rounded-2xl shrink-0">
                                <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
                                    {badge.imageURL ? (
                                        <img src={badge.imageURL} alt={badge.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Award className="w-full h-full text-primary" />
                                    )}
                                </div>
                                <div className="min-w-0 pr-1">
                                    <div className="text-[11px] font-black text-navy-900 dark:text-gray-100 truncate">{badge.name}</div>
                                    <div className="text-[9px] text-gray-400 truncate max-w-[120px]">{badge.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Timeline Activities Feed */}
            <section className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-xl"><Activity size={16} /></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-navy-900 dark:text-white">Recent Activities</h3>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{allActivity.length} items</span>
                </div>

                {loadingFeed ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : allActivity.length > 0 ? (
                    <div className="space-y-6">
                        {allActivity.map((act) => {
                            if (act.activityType === 'post') {
                                return (
                                    <div key={act.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/news-feed?post=${act.id}`); }} className="cursor-pointer group/post transition-transform hover:-translate-y-0.5 relative">
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/post:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                        <PostCard post={act} profile={currentUserProfile} hideManageOptions={!isViewingAsOwner} onDelete={handleDeletePost} onEdit={handleEditPost} />
                                    </div>
                                );
                            } else if (act.activityType === 'story') {
                                return (
                                    <div key={act.id} onClick={() => router.push(`/story/${act.id}`)} className="cursor-pointer">
                                        <StoryCard story={act} onDelete={isViewingAsOwner ? handleDeleteStory : undefined} onEdit={isViewingAsOwner ? handleEditStory : undefined} />
                                    </div>
                                );
                            } else if (act.activityType === 'notice') {
                                return (
                                    <div key={act.id} onClick={() => router.push(`/notice`)} className="cursor-pointer p-5 border-2 border-slate-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 shadow-sm hover:-translate-y-0.5 transition-transform">
                                        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                                            {act.date ? new Date(act.date?.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </div>
                                        <div className="text-base font-black text-navy-900 dark:text-gray-100">{act.title}</div>
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{act.body}</p>
                                    </div>
                                );
                            } else if (act.activityType === 'study') {
                                return (
                                    <div key={act.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/study`); }} className="cursor-pointer group/study transition-transform hover:-translate-y-0.5 relative">
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/study:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                        <StudyNoteCard post={act} currentUserId={user?.uid} isAdmin={false} />
                                    </div>
                                );
                            } else if (act.activityType === 'comment') {
                                return (
                                    <ActivityItem 
                                        key={act.id} 
                                        act={act}
                                        isOwn={isViewingAsOwner}
                                        onDelete={(id) => handleDeleteComment(id, act.postId || id)}
                                        onNavigate={() => {
                                            const postId = act.postId || act.id;
                                            router.push(`/news-feed?post=${postId}`);
                                        }}
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                ) : (
                    <div className="p-8 sm:p-12 bg-white dark:bg-gray-900 border-2 border-slate-50 dark:border-gray-800 rounded-2xl flex items-center gap-4 sm:gap-6 justify-center">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0"><Sparkle size={18} /></div>
                        <div>
                            <div className="text-xs font-black text-navy-900 dark:text-gray-100">No Recent Activities</div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Stay tuned for future updates.</div>
                        </div>
                    </div>
                )}
            </section>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export function ProfilePageContent({ uidOverride }: { uidOverride?: string } = {}) {
    const params = useParams();
    const router = useRouter();
    const urlUid = uidOverride || (params.username as string) || (params.uid as string);
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const resolve = async () => {
            if (!urlUid) return;
            const db = getDb();
            const docSnap = await getDoc(doc(db, "users", urlUid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data?.username) {
                    router.replace(`/profile/${data.username}`);
                    return;
                }
                setUid(urlUid);
            } else {
                const q = query(collection(db, "users"), where("username", "==", urlUid.toLowerCase()), limit(1));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    setUid(qSnap.docs[0].id);
                } else {
                    setUid(urlUid);
                }
            }
        };
        resolve();
    }, [urlUid, router]);
    const { user, profile: currentUserProfile } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [showProfileStrength, setShowProfileStrength] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("ttc_hide_profile_strength");
            return saved !== "true";
        }
        return true;
    });

    const handleDismissProfileStrength = () => {
        setShowProfileStrength(false);
        if (typeof window !== "undefined") {
            localStorage.setItem("ttc_hide_profile_strength", "true");
        }
    };
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editDrawerFocusField, setEditDrawerFocusField] = useState<string | null>(null);
    
    // Tab Data
    const [userStories, setUserStories] = useState<any[]>([]);
    const [userFeed, setUserFeed] = useState<{ posts: any[], stories: any[], notices: any[], studyMaterials: any[], comments: any[] }>({ posts: [], stories: [], notices: [], studyMaterials: [], comments: [] });
    const [loadingFeed, setLoadingFeed] = useState(true);
    const [feedSearchTerm, setFeedSearchTerm] = useState("");
    const [activeActivityTab, setActiveActivityTab] = useState("all");
    const [showAchievementModal, setShowAchievementModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Facebook-style dropdown menus for banner and profile photo
    const [bannerMenuOpen, setBannerMenuOpen] = useState(false);
    const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
    const bannerMenuRef = useRef<HTMLDivElement>(null);
    const photoMenuRef = useRef<HTMLDivElement>(null);

    // Saved/Bookmark states
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [savedSubTab, setSavedSubTab] = useState<"posts" | "stories" | "notices" | "study">("posts");
    const [savedStories, setSavedStories] = useState<any[]>([]);
    const [savedNotices, setSavedNotices] = useState<any[]>([]);
    const [savedStudyPosts, setSavedStudyPosts] = useState<any[]>([]);

    const filteredFeed = useMemo(() => {
        if (!feedSearchTerm.trim()) return userFeed;
        const q = feedSearchTerm.toLowerCase();
        return {
            posts: userFeed.posts.filter(p => p.eventName?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
            stories: userFeed.stories.filter(s => s.content?.toLowerCase().includes(q)),
            notices: userFeed.notices.filter(n => n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)),
            studyMaterials: userFeed.studyMaterials.filter(sm => sm.title?.toLowerCase().includes(q) || sm.description?.toLowerCase().includes(q)),
            comments: userFeed.comments.filter(c => c.content?.toLowerCase().includes(q))
        };
    }, [userFeed, feedSearchTerm]);

    const allActivity = useMemo(() => {
        const interleaved = [
            ...filteredFeed.posts.map(p => ({ ...p, activityType: 'post' })),
            ...filteredFeed.stories.map(s => ({ ...s, activityType: 'story' })),
            ...filteredFeed.notices.map(n => ({ ...n, activityType: 'notice' })),
            ...filteredFeed.studyMaterials.map(sm => ({ ...sm, activityType: 'study' })),
            ...filteredFeed.comments.map(c => ({ ...c, activityType: 'comment' }))
        ];
        return interleaved.sort((a: any, b: any) => {
            const timeA = a.timestamp?.seconds || a.createdAt?.seconds || a.date?.seconds || 0;
            const timeB = b.timestamp?.seconds || b.createdAt?.seconds || b.date?.seconds || 0;
            return timeB - timeA;
        });
    }, [filteredFeed]);
    
    // Follow State
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Contact Popover State
    const [contactOpen, setContactOpen] = useState(false);
    const contactRef = useRef<HTMLDivElement>(null);
    
    // Lightbox State
    const [lightbox, setLightbox] = useState<{ open: boolean; src: string | null; alt: string }>({
        open: false,
        src: null,
        alt: ""
    });

    const openLightbox = (src: string | null, alt: string) => {
        setLightbox({ open: true, src, alt });
    };

    // Tab switching ref for sticky behavior
    const tabsRef = useRef<HTMLDivElement>(null);

    const isOwnProfile = user?.uid === uid;
    const [viewAsGuest, setViewAsGuest] = useState(false);
    const isViewingAsOwner = isOwnProfile && !viewAsGuest;
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!uid) return;
        const db = getDb();
        const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as any;
                setProfileData(data as UserProfile);
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);

                // Auto-update URL if the username changes on own profile
                if (user?.uid === uid && data.username && data.username !== urlUid) {
                    router.replace(`/profile/${data.username}`);
                }
            }
            setLoading(false);
        });

        // Feed Fetching
        const fetchFeed = async () => {
            setLoadingFeed(true);
            try {
                const feed = await getUserFeedContent(uid, isViewingAsOwner);
                setUserFeed(feed);
            } catch (err) {
                console.error("Failed to fetch user feed", err);
            } finally {
                setLoadingFeed(false);
            }
        };
        fetchFeed();

        // Stories Subscription — pass isOwner to filter appropriately
        const unsubStories = subscribeUserStories(uid, (st) => {
            setUserStories(st);
        }, isViewingAsOwner);

        return () => {
            unsubUser();
            unsubStories();
        };
    }, [uid, isOwnProfile, viewAsGuest, user?.uid]);

    // Check follow status on mount
    useEffect(() => {
        if (user?.uid && uid && user.uid !== uid) {
            checkIsFollowing(user.uid, uid).then(setIsFollowing);
        }
    }, [user?.uid, uid]);

    // Load saved posts/stories/notices/study posts when activeTab is "saved"
    useEffect(() => {
        if (activeTab === "saved" && isViewingAsOwner && uid) {
            setLoadingSaved(true);
            const loadData = async () => {
                try {
                    if (savedSubTab === "posts") {
                        const data = await getSavedPostsFull(uid);
                        setSavedPosts(data);
                    } else if (savedSubTab === "stories") {
                        const data = await getSavedStoriesFull(uid);
                        setSavedStories(data);
                    } else if (savedSubTab === "notices") {
                        const data = await getSavedNoticesFull(uid);
                        setSavedNotices(data);
                    } else if (savedSubTab === "study") {
                        const data = await getSavedStudyPostsFull(uid);
                        setSavedStudyPosts(data);
                    }
                } catch (err) {
                    console.error(`Failed to load saved ${savedSubTab}:`, err);
                    showToast(`Failed to load saved items.`, "error");
                } finally {
                    setLoadingSaved(false);
                }
            };
            loadData();
        }
    }, [activeTab, savedSubTab, isViewingAsOwner, uid]);

    const handleSavePost = async (postId: string) => {
        if (!uid) return;
        try {
            const isSaved = await toggleSavePost(uid, postId);
            if (isSaved) {
                showToast("Post bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
                // Instantly remove from local UI list for crisp response
                setSavedPosts(prev => prev.filter(p => p.id !== postId));
            }
        } catch (err) {
            console.error("Error bookmarking post:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    const handleSaveStory = async (storyId: string) => {
        if (!uid) return;
        try {
            const isSaved = await toggleSaveStory(uid, storyId);
            if (isSaved) {
                showToast("Story bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
                setSavedStories(prev => prev.filter(s => s.id !== storyId));
            }
        } catch (err) {
            console.error("Error toggling story bookmark:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    const handleSaveNotice = async (noticeId: string) => {
        if (!uid) return;
        try {
            const isSaved = await toggleSaveNotice(uid, noticeId);
            if (isSaved) {
                showToast("Notice bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
                setSavedNotices(prev => prev.filter(n => n.id !== noticeId));
            }
        } catch (err) {
            console.error("Error toggling notice bookmark:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    const handleSaveStudyPost = async (postId: string) => {
        if (!uid) return;
        try {
            const isSaved = await toggleSaveStudyPost(uid, postId);
            if (isSaved) {
                showToast("Resource bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
                setSavedStudyPosts(prev => prev.filter(sp => sp.id !== postId));
            }
        } catch (err) {
            console.error("Error toggling study bookmark:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    // Close contact popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
                setContactOpen(false);
            }
        };
        if (contactOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [contactOpen]);

    // Close banner/photo dropdown menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bannerMenuRef.current && !bannerMenuRef.current.contains(e.target as Node)) {
                setBannerMenuOpen(false);
            }
            if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
                setPhotoMenuOpen(false);
            }
        };
        if (bannerMenuOpen || photoMenuOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [bannerMenuOpen, photoMenuOpen]);



    const handleDeletePost = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Post?",
            message: "Are you sure you want to delete this post?",
            confirmText: "Delete",
            variant: "danger"
        });
        if (!confirmed) return;
        setConfirmLoading(true);
        try {
            await deleteOwnPost(id);
            showToast("Post deleted", "success");
            setUserFeed(prev => ({ 
                ...prev, 
                posts: prev.posts.filter(p => p.id !== id),
                comments: prev.comments.filter(c => c.postId !== id)
            }));
        } catch (err) {
            console.error(err);
            showToast("Failed to delete", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleEditPost = (post: any) => {
        router.push(`/news-feed?post=${post.id}&edit=true`);
    };

    const handleDeleteStory = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Story?",
            message: "Are you sure you want to delete this story?",
            confirmText: "Delete",
            variant: "danger"
        });
        if (!confirmed) return;
        setConfirmLoading(true);
        try {
            await deleteOwnStory(id);
            showToast("Story deleted", "success");
            setUserFeed(prev => ({ 
                ...prev, 
                stories: prev.stories.filter(s => s.id !== id),
                comments: prev.comments.filter(c => c.postId !== id)
            }));
        } catch (err) {
            console.error(err);
            showToast("Failed to delete", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleEditStory = (story: any) => {
        router.push(`/story?story=${story.id}&edit=true`);
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
        const confirmed = await confirm({
            title: "Delete Comment?",
            message: "Are you sure you want to delete this comment?",
            confirmText: "Delete",
            variant: "danger"
        });
        if (!confirmed) return;
        setConfirmLoading(true);
        try {
            await deleteComment(commentId, postId);
            showToast("Comment deleted", "success");
            setUserFeed(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
        } catch (err) {
            console.error(err);
            showToast("Failed to delete comment", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleFollowToggle = useCallback(async () => {
        if (!user?.uid || !uid || followLoading) return;
        setFollowLoading(true);
        try {
            const nowFollowing = await toggleFollowUser(user.uid, uid);
            setIsFollowing(nowFollowing);
            setFollowersCount(prev => nowFollowing ? prev + 1 : Math.max(0, prev - 1));
            showToast(nowFollowing ? "You are now following this person!" : "Unfollowed successfully.", "success");
        } catch (err: any) {
            console.error("Follow error:", err);
            showToast("Failed to update follow status.", "error");
        } finally {
            setFollowLoading(false);
        }
    }, [user?.uid, uid, followLoading, showToast]);

    const copyEmail = () => {
        if (!profileData?.publicEmail) return;
        navigator.clipboard.writeText(profileData.publicEmail);
        setCopiedEmail(true);
        showToast("Email copied to clipboard!", "success");
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copied to clipboard!`, "success");
    };

    const handleAchievementUpload = async (data: any) => {
        if (!uid) return;
        setIsUploading(true);
        try {
            const fileURL = await uploadFile(`users/${uid}/achievements`, data.file);
            await addAchievement(uid, {
                title: data.title,
                issuer: data.issuer || "",
                date: data.date || "",
                fileURL,
                type: data.file.type.includes('pdf') ? 'pdf' : 'image'
            });
            showToast("Achievement added successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to upload achievement.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleAchievementDelete = async (achievementId: string) => {
        const confirmed = await confirm({
            title: "Delete Achievement?",
            message: "This will permanently remove this record from your profile.",
            confirmText: "Delete",
            variant: "danger",
        });

        if (confirmed && uid) {
            setConfirmLoading(true);
            try {
                await removeAchievement(uid, achievementId);
                showToast("Achievement removed.", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to remove achievement.", "error");
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uid) return;
        setUploadingBanner(true);
        try {
            const oldBannerURL = profileData?.bannerURL;
            const url = await uploadFile(`banners/${uid}`, file);
            const db = getDb();
            await updateDoc(doc(db, "users", uid), { bannerURL: url, updatedAt: serverTimestamp() });
            
            // Delete old banner if it exists and isn't the same
            if (oldBannerURL && oldBannerURL !== url) {
                await deleteFromStorage(oldBannerURL).catch(e => console.error("Failed to delete old banner:", e));
            }
            
            showToast("Banner updated!", "success");
        } catch (err) {
            console.error("Banner upload failed:", err);
            showToast("Failed to update banner.", "error");
        } finally {
            setUploadingBanner(false);
            if (bannerInputRef.current) bannerInputRef.current.value = "";
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uid) return;
        setUploadingPhoto(true);
        try {
            const oldPhotoURL = profileData?.photoURL;
            const url = await uploadFile(`profile-photos/${uid}`, file);
            const db = getDb();
            await updateDoc(doc(db, "users", uid), { photoURL: url, updatedAt: serverTimestamp() });
            
            if (profileData) {
                // Sync to posts, stories, gifts, comments, etc.
                syncUserProfileUpdates(
                    uid,
                    profileData.displayName,
                    url,
                    profileData.role
                ).catch(err => console.error("Photo sync failed:", err));
            }
            
            // Delete old photo if it exists, isn't the same, and isn't a dicebear generated avatar
            if (oldPhotoURL && oldPhotoURL !== url && !oldPhotoURL.includes("dicebear.com")) {
                await deleteFromStorage(oldPhotoURL).catch(e => console.error("Failed to delete old profile photo:", e));
            }
            
            showToast("Profile photo updated!", "success");
        } catch (err) {
            console.error("Photo upload failed:", err);
            showToast("Failed to update profile photo.", "error");
        } finally {
            setUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = "";
        }
    };

    // Remove banner with confirmation
    const handleRemoveBanner = async () => {
        setBannerMenuOpen(false);
        const confirmed = await confirm({
            title: "Remove Cover Photo?",
            message: "Your cover photo will be reset to the default banner.",
            confirmText: "Remove",
            variant: "danger"
        });
        if (!confirmed || !uid) return;
        setConfirmLoading(true);
        try {
            const db = getDb();
            await updateDoc(doc(db, "users", uid), { bannerURL: "", updatedAt: serverTimestamp() });
            showToast("Cover photo removed.", "success");
        } catch (err) {
            console.error("Failed to remove banner:", err);
            showToast("Failed to remove cover photo.", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    // Remove profile photo with confirmation
    const handleRemovePhoto = async () => {
        setPhotoMenuOpen(false);
        const confirmed = await confirm({
            title: "Remove Profile Picture?",
            message: "Your profile picture will be reset to the default avatar.",
            confirmText: "Remove",
            variant: "danger"
        });
        if (!confirmed || !uid) return;
        setConfirmLoading(true);
        try {
            const db = getDb();
            await updateDoc(doc(db, "users", uid), { photoURL: "", updatedAt: serverTimestamp() });
            if (profileData) {
                syncUserProfileUpdates(
                    uid,
                    profileData.displayName,
                    "",
                    profileData.role
                ).catch(err => console.error("Photo sync failed:", err));
            }
            showToast("Profile picture removed.", "success");
        } catch (err) {
            console.error("Failed to remove photo:", err);
            showToast("Failed to remove profile picture.", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    // Smart field navigation from Profile Strength card
    const handleEditFromCompletion = useCallback((fieldKey?: string) => {
        if (fieldKey === 'photoURL') {
            photoInputRef.current?.click();
            return;
        }
        if (fieldKey === 'bannerURL') {
            bannerInputRef.current?.click();
            return;
        }
        setEditDrawerFocusField(fieldKey || null);
        setEditDrawerOpen(true);
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] dark:bg-[#0c0c10]">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    if (!profileData) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] dark:bg-[#0c0c10]">
            <AlertTriangle className="text-primary mb-4" size={48} />
            <h1 className="text-2xl font-black">Profile Not Found</h1>
        </div>
    );

    const college = colleges.find(c => c.id === profileData.collegeId);
    const isTeacher = profileData.role === "teacher";

    return (
        <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0c0c10] pb-32">
            {viewAsGuest && (
                <div className="bg-slate-900 dark:bg-purple-900 text-white py-3 px-4 flex items-center justify-between text-xs sm:text-sm font-bold sticky top-0 z-50 shadow-md backdrop-blur-md bg-opacity-95">
                    <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 animate-pulse text-purple-400" />
                            <span>Previewing Profile: This is how your profile appears to other users.</span>
                        </div>
                        <button 
                            onClick={() => setViewAsGuest(false)}
                            className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-lg text-xs uppercase font-black tracking-wider transition-all"
                        >
                            Exit Preview
                        </button>
                    </div>
                </div>
            )}
            
            {/* 1. HERO SECTION */}
            <div className="relative">
                {/* Banner */}
                <div 
                    className="h-44 sm:h-64 md:h-80 w-full relative group cursor-zoom-in"
                    onClick={() => openLightbox(profileData.bannerURL || "https://images.unsplash.com/photo-1544648151-1823eddfc5e3?auto=format&fit=crop&q=80&w=2071", "Profile Banner")}
                >
                    <Image 
                        src={profileData.bannerURL || "https://images.unsplash.com/photo-1544648151-1823eddfc5e3?auto=format&fit=crop&q=80&w=2071"}
                        alt="Banner"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 via-transparent to-transparent" />
                    
                    {/* Facebook-style Edit Cover Photo button — always visible for own profile */}
                    {isViewingAsOwner && (
                        <div 
                            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20" 
                            ref={bannerMenuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBannerMenuOpen(!bannerMenuOpen);
                                    setPhotoMenuOpen(false);
                                }}
                                disabled={uploadingBanner}
                                className="w-10 h-10 rounded-full flex items-center justify-center sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 sm:rounded-xl sm:gap-2 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 backdrop-blur-md text-navy-900 dark:text-gray-100 border border-white/40 dark:border-gray-700/60 transition-all text-xs font-bold shadow-lg disabled:opacity-70 active:scale-95"
                            >
                                {uploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                <span className="hidden sm:inline">{uploadingBanner ? "Uploading..." : "Edit cover photo"}</span>
                            </button>

                            {/* Banner Dropdown Menu */}
                            <AnimatePresence>
                                {bannerMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBannerMenuOpen(false);
                                                openLightbox(profileData.bannerURL || "https://images.unsplash.com/photo-1544648151-1823eddfc5e3?auto=format&fit=crop&q=80&w=2071", "Profile Banner");
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                        >
                                            <Eye size={16} className="text-gray-400" />
                                            View cover photo
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBannerMenuOpen(false);
                                                bannerInputRef.current?.click();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                        >
                                            <ImageIcon size={16} className="text-gray-400" />
                                            Choose cover photo
                                        </button>
                                        {profileData.bannerURL && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveBanner();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left border-t border-gray-100 dark:border-gray-800"
                                            >
                                                <Trash2 size={16} />
                                                Remove cover photo
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Profile Identity Strip */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6 -mt-14 sm:-mt-16 md:-mt-20 relative z-10">
                        {/* Avatar */}
                        <div className="relative group/avatar">
                            <div 
                                className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3.5rem] bg-white border-[6px] sm:border-[10px] border-[#FAFAF8] dark:border-[#0c0c10] overflow-hidden shadow-2xl relative cursor-zoom-in"
                                onClick={() => openLightbox(profileData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.displayName)}&background=1A56DB&color=fff&size=500`, profileData.displayName)}
                            >
                                <Image 
                                    src={profileData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.displayName)}&background=1A56DB&color=fff&size=500`}
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {/* Camera badge button — Facebook-style, always visible for own profile */}
                            {isViewingAsOwner && (
                                <div className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 z-20" ref={photoMenuRef}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPhotoMenuOpen(!photoMenuOpen);
                                            setBannerMenuOpen(false);
                                        }}
                                        disabled={uploadingPhoto}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-[#FAFAF8] dark:border-[#0c0c10] shadow-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-70"
                                    >
                                        {uploadingPhoto ? <Loader2 size={16} className="animate-spin text-gray-500" /> : <Camera size={16} className="text-gray-600 dark:text-gray-300" />}
                                    </button>

                                    {/* Photo Dropdown Menu */}
                                    <AnimatePresence>
                                        {photoMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPhotoMenuOpen(false);
                                                        openLightbox(profileData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.displayName)}&background=1A56DB&color=fff&size=500`, profileData.displayName);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                                >
                                                    <Eye size={16} className="text-gray-400" />
                                                    See profile picture
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPhotoMenuOpen(false);
                                                        photoInputRef.current?.click();
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                                >
                                                    <Camera size={16} className="text-gray-400" />
                                                    Choose profile picture
                                                </button>
                                                {profileData.photoURL && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemovePhoto();
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left border-t border-gray-100 dark:border-gray-800"
                                                    >
                                                        <Trash2 size={16} />
                                                        Remove profile picture
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-[#FAFAF8] dark:bg-[#0c0c10] p-1.5 rounded-2xl shadow-lg border border-slate-100 dark:border-gray-800">
                                <BadgeDot role={profileData.role} />
                            </div>
                        </div>

                        {/* Name & Basic Info */}
                        <div className="flex-1 text-center md:text-left pb-2">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy-900 dark:text-gray-100 tracking-tight">
                                    {profileData.displayName}
                                </h1>
                                {profileData.roleVerified && (
                                    <div className="p-1 bg-primary/10 text-primary rounded-full" title="Verified Educator">
                                        <CheckCircle size={18} fill="currentColor" stroke="white" strokeWidth={3} />
                                    </div>
                                )}
                                <RoleTag role={profileData.role} />
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                <div className="flex items-center gap-1.5"><AtSign size={14} className="text-primary/40" /> {profileData.username}</div>
                                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-primary/40" /> {profileData.location || "Bangladesh"}</div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 md:pb-3">
                            {isOwnProfile ? (
                                <div className="flex items-center gap-2">
                                    {!viewAsGuest && (
                                        <button 
                                            onClick={() => setEditDrawerOpen(true)}
                                            className="px-6 py-3 bg-primary text-white font-black text-sm uppercase tracking-wider rounded-[1.25rem] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <Pencil size={16} /> Edit Profile
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            if (!viewAsGuest && activeTab === "saved") {
                                                setActiveTab("about");
                                            }
                                            setViewAsGuest(!viewAsGuest);
                                        }}
                                        className={`px-4 py-3 border-2 font-black text-sm uppercase tracking-wider rounded-[1.25rem] transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
                                            viewAsGuest 
                                                ? "bg-slate-900 border-slate-950 text-white dark:bg-primary dark:border-primary" 
                                                : "bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-gray-500 hover:text-primary hover:border-primary/20"
                                        }`}
                                        title={viewAsGuest ? "Exit guest preview mode" : "Preview how others see your profile"}
                                    >
                                        {viewAsGuest ? <EyeOff size={16} /> : <Eye size={16} />}
                                        <span>{viewAsGuest ? "Exit Preview" : "View as Guest"}</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Follow / Following Button */}
                                    <motion.button 
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        whileTap={{ scale: 0.92 }}
                                        className={`px-6 py-3 font-black text-sm uppercase tracking-wider rounded-[1.25rem] transition-all flex items-center gap-2 border-2 ${
                                            isFollowing 
                                                ? "bg-primary/5 border-primary/30 text-primary hover:bg-red-50 hover:border-red-300 hover:text-red-500 group" 
                                                : "bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-navy-900 dark:text-gray-100 hover:border-primary/40 hover:text-primary"
                                        }`}
                                    >
                                        {followLoading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : isFollowing ? (
                                            <>
                                                <UserCheck size={16} className="group-hover:hidden" />
                                                <X size={16} className="hidden group-hover:block" />
                                                <span className="group-hover:hidden">Following</span>
                                                <span className="hidden group-hover:block">Unfollow</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={16} />
                                                Follow
                                            </>
                                        )}
                                    </motion.button>

                                    {/* Contact Dropdown Button */}
                                    <div className="relative" ref={contactRef}>
                                        <motion.button 
                                            onClick={() => setContactOpen(!contactOpen)}
                                            whileTap={{ scale: 0.9 }}
                                            className={`p-3.5 rounded-[1.25rem] shadow-xl transition-all ${
                                                contactOpen 
                                                    ? "bg-primary text-white scale-110" 
                                                    : "bg-navy-900 text-white hover:scale-110"
                                            }`}
                                        >
                                            <MessageCircle size={18} />
                                        </motion.button>

                                        {/* Contact Popover */}
                                        <AnimatePresence>
                                            {contactOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-full right-0 mt-3 w-72 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[1.5rem] shadow-2xl overflow-hidden z-50"
                                                >
                                                    <div className="p-4 border-b border-slate-50 dark:border-gray-800">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Contact Info</div>
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        {profileData?.publicEmail && (
                                                            <button
                                                                onClick={() => copyText(profileData.publicEmail!, "Email")}
                                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group text-left"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                                    <Mail size={16} className="text-blue-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email</div>
                                                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">{profileData.publicEmail}</div>
                                                                </div>
                                                                <Copy size={12} className="text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                                                            </button>
                                                        )}
                                                        {profileData?.phone && (
                                                            <a
                                                                href={`tel:${profileData.phone}`}
                                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group text-left"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                                                    <Phone size={16} className="text-emerald-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Phone</div>
                                                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">{profileData.phone}</div>
                                                                </div>
                                                                <ExternalLink size={12} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                                                            </a>
                                                        )}
                                                        {profileData?.whatsapp && (
                                                            <a
                                                                href={`https://wa.me/${profileData.whatsapp.replace(/[^0-9]/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group text-left"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                                                    <MessageCircle size={16} className="text-green-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">WhatsApp</div>
                                                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">{profileData.whatsapp}</div>
                                                                </div>
                                                                <ExternalLink size={12} className="text-gray-300 group-hover:text-green-500 transition-colors shrink-0" />
                                                            </a>
                                                        )}
                                                        {profileData?.facebook && (
                                                            <a
                                                                href={profileData.facebook.startsWith('http') ? profileData.facebook : `https://${profileData.facebook}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group text-left"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                                    <Facebook size={16} className="text-blue-600 dark:text-blue-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Facebook</div>
                                                                    <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">{profileData.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, '')}</div>
                                                                </div>
                                                                <ExternalLink size={12} className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0" />
                                                            </a>
                                                        )}
                                                        {!profileData?.publicEmail && !profileData?.phone && !profileData?.whatsapp && !profileData?.facebook && (
                                                            <div className="px-4 py-6 text-center">
                                                                <MessageCircle className="mx-auto text-gray-200 mb-2" size={28} />
                                                                <p className="text-xs font-bold text-gray-400">No contact info available</p>
                                                                <p className="text-[10px] text-gray-300 mt-1">This user hasn't shared their contact details yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE PROFILE COMPLETION BAR — shown only on own profile, mobile only */}
            {isViewingAsOwner && profileData && showProfileStrength && (
                <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 relative">
                    <button 
                        onClick={handleDismissProfileStrength} 
                        className="absolute top-3 right-6 z-20 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shadow-sm"
                        title="Dismiss Strength Bar"
                    >
                        <X size={12} />
                    </button>
                    <ProfileCompletionBar
                        profile={profileData}
                        onEditProfile={handleEditFromCompletion}
                    />
                </div>
            )}

            {/* 2. STATS STRIP & TABS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 items-start">
                
                {/* LEFT SIDEBAR (L-SIDEBAR) — 3 cols */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Profile Completion Card — Desktop Only */}
                    {isViewingAsOwner && profileData && showProfileStrength && (
                        <div className="hidden lg:block relative">
                            <button 
                                onClick={handleDismissProfileStrength} 
                                className="absolute top-5 right-5 z-20 p-1.5 rounded-full bg-white/85 dark:bg-gray-800/80 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shadow-sm"
                                title="Dismiss Strength Card"
                            >
                                <X size={12} />
                            </button>
                            <ProfileCompletionCard
                                profile={profileData}
                                onEditProfile={handleEditFromCompletion}
                            />
                        </div>
                    )}
                    {/* Positions & Roles Card */}
                    <div className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm">
                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.25em] mb-4">Positions & Roles</div>
                        
                        <div className="space-y-5">
                            {profileData.positions && profileData.positions.length > 0 ? profileData.positions.map((pos: any, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/50 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-700">
                                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 transition-all ${pos.type === 'current' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className={`text-sm font-black truncate ${pos.type === 'current' ? 'text-navy-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {pos.title}
                                            </div>
                                            {pos.link && (
                                                <a href={pos.link.startsWith('http') ? pos.link : `https://${pos.link}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white dark:bg-gray-900 text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0 shadow-sm border border-slate-100 dark:border-gray-800" title="Visit Link">
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 truncate mt-0.5">
                                            {pos.organization}
                                        </div>
                                        {(pos.startDate || pos.endDate) && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">
                                                <Calendar size={10} className="text-gray-300" />
                                                <span>{pos.startDate || "?"} — {pos.endDate || (pos.type === 'current' ? "Present" : "?")}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-xs text-gray-400 font-bold italic text-center py-4">No positions listed yet.</div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 p-6 rounded-[2rem] text-center shadow-sm">
                            <div className="text-2xl font-black text-primary">{followersCount}</div>
                            <div className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Followers</div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 p-6 rounded-[2rem] text-center shadow-sm">
                            <div className="text-2xl font-black text-navy-900 dark:text-gray-100">{followingCount}</div>
                            <div className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Following</div>
                        </div>
                    </div>

                    {/* Socials & Connectivity */}
                    <div className="space-y-4 px-2">
                        {profileData.publicEmail && (
                            <button 
                                onClick={copyEmail}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Mail className="text-primary/40 group-hover:text-primary" size={16} />
                                    <span className="text-xs font-bold text-gray-500 truncate">{profileData.publicEmail}</span>
                                </div>
                                {copiedEmail ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-300" />}
                            </button>
                        )}
                        {profileData.website && (
                             <a href={profileData.website} target="_blank" className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl group transition-all">
                                <div className="flex items-center gap-3">
                                    <Globe className="text-primary/40 group-hover:text-primary" size={16} />
                                    <span className="text-xs font-bold text-gray-500 truncate">Portfolio / Website</span>
                                </div>
                                <ExternalLink size={14} className="text-gray-300" />
                            </a>
                        )}
                    </div>
                </div>

                {/* MAIN CONTENT (M-CONTENT) — 9 cols */}
                <div className="lg:col-span-9 space-y-12 min-h-[600px]">
                    
                    {/* Sticky Tabs Navigation */}
                    <div ref={tabsRef} className="sticky top-16 z-40 bg-[#FAFAF8] dark:bg-[#0c0c10] -mx-4 px-4 py-3 sm:py-4 rounded-b-2xl sm:rounded-b-3xl border-b border-slate-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: "all", label: "All", icon: Sparkles },
                                { id: "about", label: "About", icon: Info },
                                { id: "activity", label: "Activity", icon: Activity },
                                { id: "skills", label: "Credentials", icon: Award },
                                ...(isViewingAsOwner ? [{ id: "saved", label: "Saved", icon: Bookmark }] : [])
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative py-2 flex items-center gap-2 transition-all shrink-0`}
                                >
                                    <tab.icon size={16} className={activeTab === tab.id ? "text-primary" : "text-gray-400"} />
                                    <span className={`text-xs font-black uppercase tracking-[0.1em] ${activeTab === tab.id ? "text-navy-900 dark:text-white" : "text-gray-400"}`}>
                                        {tab.label}
                                    </span>
                                    {activeTab === tab.id && (
                                        <motion.div 
                                            layoutId="profileTabUnderline"
                                            className="absolute -bottom-4 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_4px_12px_rgba(26,86,219,0.3)]"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Panels */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {activeTab === "all" && (
                                <AllTab 
                                    key="all-tab"
                                    profile={profileData} 
                                    isTeacher={isTeacher}
                                    allActivity={allActivity}
                                    loadingFeed={loadingFeed}
                                    currentUserProfile={currentUserProfile}
                                    isViewingAsOwner={isViewingAsOwner}
                                    handleDeletePost={handleDeletePost}
                                    handleEditPost={handleEditPost}
                                    handleDeleteStory={handleDeleteStory}
                                    handleEditStory={handleEditStory}
                                    handleDeleteComment={handleDeleteComment}
                                    user={user}
                                    router={router}
                                />
                            )}
                            {activeTab === "about" && (
                                <AboutTab key="about-tab" profile={profileData} isTeacher={isTeacher} />
                            )}
                            {activeTab === "activity" && (
                                <motion.div 
                                    key="activity-tab"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* LinkedIn-style Filter Pills */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {[
                                            { id: "all", label: "All Activity" },
                                            { id: "posts", label: "Posts" },
                                            { id: "comments", label: "Comments" },
                                            { id: "stories", label: "Stories" },
                                            { id: "notices", label: "Notices" },
                                            { id: "study", label: "Study Materials" }
                                        ].map(pill => (
                                            <button
                                                key={pill.id}
                                                onClick={() => setActiveActivityTab(pill.id)}
                                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                                    activeActivityTab === pill.id 
                                                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                                                    : "bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-slate-100 dark:border-gray-800"
                                                }`}
                                            >
                                                {pill.label}
                                            </button>
                                        ))}
                                    </div>

                                    {loadingFeed ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                                    ) : (
                                        <div className="space-y-6">
                                            {activeActivityTab === "all" && allActivity.length > 0 && (
                                                <div className="grid grid-cols-1 gap-6">
                                                    {allActivity.map((act) => {
                                                        if (act.activityType === 'post') {
                                                            return (
                                                                <div key={act.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/news-feed?post=${act.id}`); }} className="cursor-pointer group/post transition-transform hover:-translate-y-1 relative">
                                                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/post:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                                                    <PostCard post={act} profile={currentUserProfile} hideManageOptions={!isViewingAsOwner} onDelete={handleDeletePost} onEdit={handleEditPost} />
                                                                </div>
                                                            );
                                                        } else if (act.activityType === 'story') {
                                                            return (
                                                                <div key={act.id} onClick={() => router.push(`/story/${act.id}`)} className="cursor-pointer">
                                                                    <StoryCard story={act} onDelete={isViewingAsOwner ? handleDeleteStory : undefined} onEdit={isViewingAsOwner ? handleEditStory : undefined} />
                                                                </div>
                                                            );
                                                        } else if (act.activityType === 'notice') {
                                                            return (
                                                                <div key={act.id} onClick={() => router.push(`/notice`)} className="cursor-pointer p-5 border-2 border-slate-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 shadow-sm hover:-translate-y-1 transition-transform">
                                                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                                                                        {act.date ? new Date(act.date?.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                                    </div>
                                                                    <div className="text-lg font-black text-navy-900 dark:text-gray-100">{act.title}</div>
                                                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{act.body}</p>
                                                                </div>
                                                            );
                                                        } else if (act.activityType === 'study') {
                                                            return (
                                                                <div key={act.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/study`); }} className="cursor-pointer group/study transition-transform hover:-translate-y-1 relative">
                                                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/study:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                                                    <StudyNoteCard post={act} currentUserId={user?.uid} isAdmin={false} />
                                                                </div>
                                                            );
                                                        } else if (act.activityType === 'comment') {
                                                            return (
                                                                <ActivityItem 
                                                                    key={act.id} 
                                                                    act={act}
                                                                    isOwn={isViewingAsOwner}
                                                                    onDelete={(id) => handleDeleteComment(id, act.postId || id)}
                                                                    onNavigate={() => {
                                                                        const postId = act.postId || act.id;
                                                                        router.push(`/news-feed?post=${postId}`);
                                                                    }}
                                                                />
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            )}

                                            {activeActivityTab === "posts" && filteredFeed.posts.length > 0 && (
                                                <div className="grid gap-6">
                                                    {filteredFeed.posts.map(post => (
                                                        <div key={post.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/news-feed?post=${post.id}`); }} className="cursor-pointer group/post transition-transform hover:-translate-y-1 relative">
                                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/post:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                                            <PostCard post={post} profile={currentUserProfile} hideManageOptions={!isViewingAsOwner} onDelete={handleDeletePost} onEdit={handleEditPost} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeActivityTab === "comments" && filteredFeed.comments.length > 0 && (
                                                <div className="grid gap-4">
                                                    {filteredFeed.comments.map(comment => (
                                                        <ActivityItem 
                                                            key={comment.id} 
                                                            act={{ ...comment, activityType: 'comment' }}
                                                            isOwn={isViewingAsOwner}
                                                            onDelete={(id) => handleDeleteComment(id, comment.postId || id)}
                                                            onNavigate={() => {
                                                                const postId = comment.postId || comment.id;
                                                                router.push(`/news-feed?post=${postId}`);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {activeActivityTab === "stories" && filteredFeed.stories.length > 0 && (
                                                <div className="grid gap-6">
                                                    {filteredFeed.stories.map(story => (
                                                        <div key={story.id} onClick={() => router.push(`/story/${story.id}`)} className="cursor-pointer">
                                                            <StoryCard story={story} onDelete={isViewingAsOwner ? handleDeleteStory : undefined} onEdit={isViewingAsOwner ? handleEditStory : undefined} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeActivityTab === "notices" && filteredFeed.notices.length > 0 && (
                                                <div className="grid gap-4">
                                                    {filteredFeed.notices.map(notice => (
                                                        <div key={notice.id} onClick={() => router.push(`/notice`)} className="cursor-pointer p-5 border-2 border-slate-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 shadow-sm hover:-translate-y-1 transition-transform">
                                                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                                                                {notice.date ? new Date(notice.date?.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                            </div>
                                                            <div className="text-lg font-black text-navy-900 dark:text-gray-100">{notice.title}</div>
                                                            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{notice.body}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeActivityTab === "study" && filteredFeed.studyMaterials.length > 0 && (
                                                <div className="grid gap-6">
                                                    {filteredFeed.studyMaterials.map(study => (
                                                        <div key={study.id} onClick={(e) => { const target = e.target as HTMLElement; if (target.closest('button') || target.closest('a')) return; router.push(`/study`); }} className="cursor-pointer group/study transition-transform hover:-translate-y-1 relative">
                                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/study:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                                            <StudyNoteCard post={study} currentUserId={user?.uid} isAdmin={false} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Empty States */}
                                            {activeActivityTab === "all" && allActivity.length === 0 && (
                                                <div className="p-8 sm:p-12 bg-white dark:bg-gray-900 border-2 border-slate-50 dark:border-gray-800 rounded-2xl sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary shrink-0"><Sparkle size={18} /></div>
                                                    <div>
                                                        <div className="text-sm font-black text-navy-900 dark:text-gray-100">Joined TTC Network</div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Founding Member • Spring 2026</div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {activeActivityTab !== "all" && filteredFeed[(activeActivityTab === "study" ? "studyMaterials" : activeActivityTab) as keyof typeof filteredFeed].length === 0 && (
                                                <div className="p-10 sm:p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                    <Activity className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                    <h4 className="text-base sm:text-xl font-black text-gray-300 uppercase tracking-widest">No ${activeActivityTab} Yet</h4>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                            {activeTab === "skills" && (
                                <motion.div 
                                    key="skills-tab"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-12"
                                >
                                    {/* 1. Badges Section */}
                                    <section>
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Verified Badges</h3>
                                            <div className="h-[2px] flex-1 bg-slate-50 dark:bg-gray-800 ml-6" />
                                        </div>
                                        
                                        {profileData.badges && profileData.badges.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                                                {profileData.badges.map((badge) => (
                                                    <div key={badge.id} className="p-6 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2.5rem] group hover:border-primary/20 transition-all text-center">
                                                        <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
                                                            {badge.imageURL ? (
                                                                <img src={badge.imageURL} alt={badge.name} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all" />
                                                            ) : (
                                                                <Award className="w-full h-full text-primary" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-black text-navy-900 dark:text-gray-100 truncate">{badge.name}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">{badge.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-10 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-[2.5rem] text-center">
                                                <Award className="mx-auto text-slate-200 dark:text-gray-800 mb-4" size={32} />
                                                <p className="text-xs font-bold text-gray-300">No badges yet.</p>
                                            </div>
                                        )}
                                    </section>

                                    {/* 2. Achievements Section */}
                                    <section>
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Academic & Digital Achievements</h3>
                                            {isViewingAsOwner && (
                                                <button 
                                                    onClick={() => setShowAchievementModal(true)}
                                                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-4"
                                                >
                                                    <Plus size={14} /> Add New
                                                </button>
                                            )}
                                        </div>

                                        {profileData.achievementsList && profileData.achievementsList.length > 0 ? (
                                            <div className="space-y-4">
                                                {profileData.achievementsList.map((ach) => (
                                                    <div key={ach.id} className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border-2 border-slate-50 dark:border-gray-800 rounded-3xl group hover:border-primary/10 transition-all">
                                                        <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                                                            {ach.type === 'pdf' ? <BookOpen size={20} /> : <ImageIcon size={20} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-black text-navy-900 dark:text-gray-100 truncate">{ach.title}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-bold text-gray-400">{ach.issuer}</span>
                                                                <span className="text-[10px] text-gray-300">·</span>
                                                                <span className="text-[10px] font-bold text-primary">{ach.date}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={ach.fileURL} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary transition-colors"><Eye size={16} /></a>
                                                            {isViewingAsOwner && (
                                                                <button onClick={() => handleAchievementDelete(ach.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                <GraduationCap className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest">No achievements listed</h4>
                                                <p className="text-[10px] text-gray-400 mt-2 max-w-[200px]">Upload your certificates and awards to showcase your expertise.</p>
                                            </div>
                                        )}
                                    </section>
                                </motion.div>
                            )}
                            {activeTab === "saved" && isViewingAsOwner && (
                                <motion.div 
                                    key="saved-tab"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="space-y-8"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-black text-navy-900 dark:text-white uppercase tracking-tighter">Your Saved Bookmarks</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Only you can see this section</p>
                                        </div>
                                        <div className="self-start px-3 py-1.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <Shield size={12} /> Private Tab
                                        </div>
                                    </div>

                                    {/* Sub-tab selection strip */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-gray-800 scrollbar-none">
                                        {[
                                            { id: "posts", label: "Posts" },
                                            { id: "stories", label: "Stories" },
                                            { id: "notices", label: "Notices" },
                                            { id: "study", label: "Study Prep" }
                                        ].map((subTab) => (
                                            <button
                                                key={subTab.id}
                                                onClick={() => setSavedSubTab(subTab.id as any)}
                                                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                                    savedSubTab === subTab.id
                                                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                                                        : "text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-gray-650"
                                                }`}
                                            >
                                                {subTab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {loadingSaved ? (
                                        <div className="flex justify-center py-20">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                        </div>
                                    ) : savedSubTab === "posts" ? (
                                        savedPosts.length > 0 ? (
                                            <div className="grid gap-6">
                                                {savedPosts.map((post) => (
                                                    <div 
                                                        key={post.id} 
                                                        onClick={(e) => { 
                                                            const target = e.target as HTMLElement; 
                                                            if (target.closest('button') || target.closest('a')) return; 
                                                            router.push(`/news-feed?post=${post.id}`); 
                                                        }} 
                                                        className="cursor-pointer group/post transition-transform hover:-translate-y-1 relative"
                                                    >
                                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/post:opacity-100 rounded-[2.5rem] transition-opacity pointer-events-none" />
                                                        <PostCard 
                                                            post={post} 
                                                            profile={currentUserProfile} 
                                                            hideManageOptions={true} 
                                                            isSaved={true}
                                                            onSave={handleSavePost}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                <Bookmark className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                <h4 className="text-base sm:text-xl font-black text-gray-300 uppercase tracking-widest">No Saved Posts Yet</h4>
                                                <p className="text-xs text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                                                    Posts you save/bookmark will appear here so you can easily reference them later.
                                                </p>
                                            </div>
                                        )
                                    ) : savedSubTab === "stories" ? (
                                        savedStories.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {savedStories.map((story) => (
                                                    <StoryCard 
                                                        key={story.id} 
                                                        story={story} 
                                                        isSaved={true}
                                                        onSave={handleSaveStory}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                <Bookmark className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                <h4 className="text-base sm:text-xl font-black text-gray-300 uppercase tracking-widest">No Saved Stories Yet</h4>
                                                <p className="text-xs text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                                                    Stories you save/bookmark will appear here so you can easily reference them later.
                                                </p>
                                            </div>
                                        )
                                    ) : savedSubTab === "notices" ? (
                                        savedNotices.length > 0 ? (
                                            <div className="grid gap-6">
                                                {savedNotices.map((notice) => {
                                                    const formattedDate = notice.date ? (notice.date.toDate ? notice.date.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : new Date(notice.date).toLocaleDateString()) : "";
                                                    return (
                                                        <div 
                                                            key={notice.id}
                                                            onClick={(e) => {
                                                                const target = e.target as HTMLElement;
                                                                if (target.closest('button') || target.closest('a')) return;
                                                                router.push(`/notice?notice=${notice.id}`);
                                                            }}
                                                            className="cursor-pointer group/notice relative rounded-[2.5rem] p-8 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                                        <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                            {notice.college?.split(", ").pop()}
                                                                        </span>
                                                                        {notice.isUrgent && (
                                                                            <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                                                Urgent
                                                                            </span>
                                                                        )}
                                                                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                            {notice.programme === "BEdHonours" ? "B.Ed Honours" : notice.programme === "MEd" ? "M.Ed" : "All"}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-lg font-black text-navy-900 dark:text-white leading-snug group-hover/notice:text-primary transition-colors">
                                                                        {notice.title}
                                                                    </h4>
                                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
                                                                        Posted by {notice.postedBy} • {formattedDate}
                                                                    </p>
                                                                </div>

                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSaveNotice(notice.id);
                                                                    }}
                                                                    className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm shrink-0 self-start"
                                                                    title="Remove Bookmark"
                                                                >
                                                                    <Bookmark size={16} className="fill-primary" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                <Bookmark className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                <h4 className="text-base sm:text-xl font-black text-gray-300 uppercase tracking-widest">No Saved Notices Yet</h4>
                                                <p className="text-xs text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                                                    Notices you save/bookmark will appear here so you can easily reference them later.
                                                </p>
                                            </div>
                                        )
                                    ) : (
                                        savedStudyPosts.length > 0 ? (
                                            <div className="grid gap-8">
                                                {savedStudyPosts.map((post) => (
                                                    <div key={post.id} className="relative group/study">
                                                        {post.type === "schedule" ? (
                                                            <StudyScheduleCard 
                                                                post={post}
                                                                currentUserId={uid}
                                                                isSaved={true}
                                                                onSave={handleSaveStudyPost}
                                                            />
                                                        ) : (
                                                            <StudyNoteCard 
                                                                post={post}
                                                                currentUserId={uid}
                                                                isSaved={true}
                                                                onSave={handleSaveStudyPost}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-16 border-4 border-dashed border-slate-100 dark:border-gray-800 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                                                <Bookmark className="text-slate-200 dark:text-gray-800 mb-6" size={48} />
                                                <h4 className="text-base sm:text-xl font-black text-gray-300 uppercase tracking-widest">No Saved Study Prep Yet</h4>
                                                <p className="text-xs text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                                                    Study materials and class schedules you save/bookmark will appear here so you can easily reference them later.
                                                </p>
                                            </div>
                                        )
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>


            </div>

            {/* Hidden file inputs for banner and profile photo */}
            <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
            />
            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
            />

            {/* Profile Edit Drawer */}
            <ProfileEditDrawer 
                isOpen={editDrawerOpen}
                onClose={() => { setEditDrawerOpen(false); setEditDrawerFocusField(null); }}
                profile={profileData}
                focusField={editDrawerFocusField}
                onFocusFieldHandled={() => setEditDrawerFocusField(null)}
            />

            {/* Image Lightbox */}
            <ImageLightbox 
                isOpen={lightbox.open}
                src={lightbox.src}
                alt={lightbox.alt}
                onClose={() => setLightbox(prev => ({ ...prev, open: false }))}
            />

            {/* Achievement Upload Modal */}
            <AchievementModal 
                isOpen={showAchievementModal}
                onClose={() => setShowAchievementModal(false)}
                onUpload={handleAchievementUpload}
                isUploading={isUploading}
            />
        </div>
    );
}
