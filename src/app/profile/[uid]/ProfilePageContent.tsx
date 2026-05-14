"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AtSign, Globe, Briefcase, Plus, CheckCircle, Info, AlertTriangle, ChevronRight, Share2, MapPin, 
    Target, Pencil, Save, X, Camera, Loader2, ImageIcon, Trash2, Search,
    Heart, Clock, Shield, Activity, GraduationCap, Building, Quote, BookOpen, BookText, User, Award,
    Sparkles, Sparkle, Mail, ExternalLink, Calendar, Copy, Check, ChevronDown, MessageSquare, ThumbsUp,
    Phone, MessageCircle, UserCheck, UserPlus, Eye, EyeOff, Facebook
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
    syncUserProfileUpdates
} from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { ProfileEditDrawer } from "./ProfileEditDrawer";
import StoryCard from "@/components/StoryCard";
import PostCard from "@/components/PostCard";
import StudyNoteCard from "@/app/study/components/StudyNoteCard";
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
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
        >
            {/* Bio Section */}
            <section className="relative group">
                <Quote className="absolute -top-6 -left-6 w-12 h-12 text-primary/10 rotate-12 transition-transform group-hover:rotate-0" />
                <div className="prose prose-xl max-w-none">
                    <p className="text-2xl font-serif text-navy-900 dark:text-gray-100 leading-relaxed font-bengali">
                        {profile.bio || "Every journey starts with a single step. This educator hasn't written their story yet, but their impact is felt through every action."}
                    </p>
                </div>
            </section>

            {/* Academic & Professional Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Academic Context */}
                <div className="p-8 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary/5 text-primary rounded-2xl"><GraduationCap size={20} /></div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Academic Status</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Programme</label>
                                <div className="text-sm font-bold text-navy-900 dark:text-gray-100">
                                    {profile.programme === "MEd" ? "M.Ed (Master of Education)" : "B.Ed Honours"}
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

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export function ProfilePageContent({ uidOverride }: { uidOverride?: string } = {}) {
    const params = useParams();
    const urlUid = uidOverride || (params.uid as string);
    const [uid, setUid] = useState<string | null>(null);

    useEffect(() => {
        const resolve = async () => {
            if (!urlUid) return;
            const db = getDb();
            const docSnap = await getDoc(doc(db, "users", urlUid));
            if (docSnap.exists()) {
                setUid(urlUid);
            } else {
                const q = query(collection(db, "users"), where("username", "==", urlUid), limit(1));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    setUid(qSnap.docs[0].id);
                } else {
                    setUid(urlUid);
                }
            }
        };
        resolve();
    }, [urlUid]);
    const router = useRouter();
    const { user, profile: currentUserProfile } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("about");
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    
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
            }
            setLoading(false);
        });

        // Feed Fetching
        const fetchFeed = async () => {
            setLoadingFeed(true);
            try {
                const feed = await getUserFeedContent(uid, user?.uid === uid);
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
        }, user?.uid === uid);

        return () => {
            unsubUser();
            unsubStories();
        };
    }, [uid]);

    // Check follow status on mount
    useEffect(() => {
        if (user?.uid && uid && user.uid !== uid) {
            checkIsFollowing(user.uid, uid).then(setIsFollowing);
        }
    }, [user?.uid, uid]);

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
            const url = await uploadFile(`banners/${uid}`, file);
            const db = getDb();
            await updateDoc(doc(db, "users", uid), { bannerURL: url, updatedAt: serverTimestamp() });
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
            
            showToast("Profile photo updated!", "success");
        } catch (err) {
            console.error("Photo upload failed:", err);
            showToast("Failed to update profile photo.", "error");
        } finally {
            setUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = "";
        }
    };

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
                    
                    {isOwnProfile && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                bannerInputRef.current?.click();
                            }}
                            disabled={uploadingBanner}
                            className="absolute bottom-6 right-6 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-2xl border border-white/20 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-xs font-bold shadow-xl z-10 disabled:opacity-70"
                        >
                            {uploadingBanner ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {uploadingBanner ? "Uploading..." : "Edit Banner"}
                        </button>
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
                                {isOwnProfile && (
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            photoInputRef.current?.click();
                                        }}
                                        className="absolute inset-0 bg-navy-900/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        {uploadingPhoto ? <Loader2 className="text-white animate-spin" size={24} /> : <Camera className="text-white" size={24} />}
                                    </div>
                                )}
                            </div>
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
                                <button 
                                    onClick={() => setEditDrawerOpen(true)}
                                    className="px-6 py-3 bg-primary text-white font-black text-sm uppercase tracking-wider rounded-[1.25rem] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Pencil size={16} /> Edit Profile
                                </button>
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

            {/* 2. STATS STRIP & TABS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 items-start">
                
                {/* LEFT SIDEBAR (L-SIDEBAR) — 3 cols */}
                <div className="lg:col-span-3 space-y-8">
                    {/* College Card */}
                    <div className="bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm">
                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.25em] mb-4">Official Base</div>
                        <h3 className="text-xl font-black text-navy-900 dark:text-gray-100 leading-tight mb-1">{college?.name || "TTC Community"}</h3>
                        <p className="text-xs font-bold text-gray-400 mb-6">{college?.city || "National Registry"}</p>
                        
                        {isTeacher && profileData.workHistory && (
                             <div className="pt-6 border-t font-hind-siliguri border-slate-50 dark:border-gray-800 space-y-4">
                                 <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Recent Postings</div>
                                 <div className="space-y-4">
                                     {Array.isArray(profileData.workHistory) && profileData.workHistory.slice(0, 3).map((exp: any, i) => (
                                         <div key={i} className="flex gap-3">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary/20 mt-1.5" />
                                             <div className="flex-1">
                                                 <div className="text-xs font-black text-navy-900 dark:text-gray-200">{exp.company}</div>
                                                 <div className="text-[10px] font-bold text-gray-400">{exp.startDate} • {exp.role}</div>
                                             </div>
                                         </div>
                                     ))}
                                     {Array.isArray(profileData.workHistory) && profileData.workHistory.length > 3 && (
                                         <button className="text-[10px] font-black text-primary uppercase ml-4">+ {profileData.workHistory.length - 3} more</button>
                                     )}
                                 </div>
                             </div>
                        )}
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

                {/* MAIN CONTENT (M-CONTENT) — 6 cols */}
                <div className="lg:col-span-6 space-y-12 min-h-[600px]">
                    
                    {/* Sticky Tabs Navigation */}
                    <div ref={tabsRef} className="sticky top-0 z-40 bg-[#FAFAF8]/80 dark:bg-[#0c0c10]/80 backdrop-blur-xl -mx-4 px-4 py-3 sm:py-4 rounded-b-2xl sm:rounded-b-3xl border-b border-slate-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: "about", label: "About", icon: Info },
                                { id: "activity", label: "Activity", icon: Activity },
                                { id: "skills", label: "Credentials", icon: Award },
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
                                                                    <PostCard post={act} profile={currentUserProfile} hideManageOptions={!isOwnProfile} onDelete={handleDeletePost} onEdit={handleEditPost} />
                                                                </div>
                                                            );
                                                        } else if (act.activityType === 'story') {
                                                            return (
                                                                <div key={act.id} onClick={() => router.push(`/story/${act.id}`)} className="cursor-pointer">
                                                                    <StoryCard story={act} onDelete={isOwnProfile ? handleDeleteStory : undefined} onEdit={isOwnProfile ? handleEditStory : undefined} />
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
                                                                    isOwn={isOwnProfile}
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
                                                            <PostCard post={post} profile={currentUserProfile} hideManageOptions={!isOwnProfile} onDelete={handleDeletePost} onEdit={handleEditPost} />
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
                                                            isOwn={isOwnProfile}
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
                                                            <StoryCard story={story} onDelete={isOwnProfile ? handleDeleteStory : undefined} onEdit={isOwnProfile ? handleEditStory : undefined} />
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
                                            {isOwnProfile && (
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
                                                            {isOwnProfile && (
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
                        </AnimatePresence>
                    </div>
                </div>

                {/* RIGHT SIDEBAR (R-SIDEBAR) — 3 cols (Desktop Only) */}
                <div className="hidden lg:col-span-3 lg:block space-y-8 sticky top-32">
                    {/* Achievement Tracker */}
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Shield size={80} /></div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-white/40">Engagement Impact</h4>
                        <div className="space-y-6">
                            {[
                                { label: "Total Inspired", value: (profileData as any).totalInspired || 0, color: "bg-red-500", percent: 45 },
                                { label: "Stories Told", value: userStories.length, color: "bg-blue-500", percent: userStories.length > 0 ? 80 : 10 },
                                { label: "Network Presence", value: "Founding", color: "bg-emerald-500", percent: 100 }
                            ].map((impact, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                        <span>{impact.label}</span>
                                        <span className="text-white/60">{impact.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${impact.percent}%` }}
                                            className={`h-full ${impact.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
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
                onClose={() => setEditDrawerOpen(false)}
                profile={profileData}
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
