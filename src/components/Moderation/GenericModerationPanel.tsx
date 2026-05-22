/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Shield, Clock, CheckCircle2, XCircle, 
    ChevronDown, ChevronUp, ExternalLink, User, 
    MapPin, Loader2, AlertTriangle,
    Eye, Download, Video, Calendar, Sparkles, BookOpen, Globe, FileText
} from "lucide-react";
import { 
    subscribeModerationQueueGeneric, 
    subscribeReviewedQueueGeneric,
    approveModerationItem,
    rejectModerationItem
} from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";

interface GenericModerationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    type: 'posts' | 'stories' | 'notices' | 'studyPosts';
}

export default function GenericModerationPanel({ isOpen, onClose, profile, type }: GenericModerationPanelProps) {
    const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [reviewedItems, setReviewedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const { showToast } = useToast();

    const [selectedPreviewItem, setSelectedPreviewItem] = useState<any | null>(null);
    const [modalRejectReason, setModalRejectReason] = useState("");
    const [modalShowRejectInput, setModalShowRejectInput] = useState(false);

    const openPreview = (item: any) => {
        setSelectedPreviewItem(item);
        setModalRejectReason("");
        setModalShowRejectInput(false);
    };

    const closePreview = () => {
        setSelectedPreviewItem(null);
        setModalRejectReason("");
        setModalShowRejectInput(false);
    };

    const safeDate = (val: any): Date => {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        if (typeof val.toDate === 'function') return val.toDate();
        if (typeof val.toMillis === 'function') return new Date(val.toMillis());
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const handleApproveWithClose = async (id: string) => {
        setIsProcessing(id);
        try {
            await approveModerationItem(type, id);
            showToast("Approved successfully!", "success");
            closePreview();
        } catch (err) {
            console.error(err);
            showToast("Approval failed.", "error");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRejectWithClose = async (id: string) => {
        const reason = modalRejectReason;
        setIsProcessing(id);
        try {
            await rejectModerationItem(type, id, reason);
            showToast("Rejected successfully!", "success");
            closePreview();
        } catch (err) {
            console.error(err);
            showToast("Rejection failed.", "error");
        } finally {
            setIsProcessing(null);
            setRejectReason(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const renderPreviewContent = () => {
        if (!selectedPreviewItem) return null;

        switch (type) {
            case 'posts': {
                const item = selectedPreviewItem;
                return (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-black rounded-full uppercase tracking-wider">
                                {item.type === 'club' ? 'Club Activity' : 'Event Update'}
                            </span>
                            {item.clubName && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-black rounded-full uppercase tracking-wider">
                                    Club: {item.clubName}
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                            {item.eventName}
                        </h2>

                        <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                            {item.description || "No description provided."}
                        </p>

                        {item.thumbnailUrl && (
                            <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                                <img src={item.thumbnailUrl} alt="Post cover" className="w-full object-cover max-h-[350px]" />
                            </div>
                        )}

                        {item.linkPreview && (
                            <div className="mt-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Attached Link Preview</p>
                                <a 
                                    href={item.shareLink || "#"} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="block p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/80 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {item.linkPreview.thumbnail && (
                                            <div className="w-full sm:w-32 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0 border border-gray-100 dark:border-gray-850">
                                                <img src={item.linkPreview.thumbnail} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Globe size={10} /> {item.linkPreview.domain || "External Link"}
                                            </p>
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white mt-1 group-hover:text-primary transition-colors truncate">
                                                {item.linkPreview.title || "No Title"}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                                {item.linkPreview.description || "No description available."}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        )}

                        {!item.linkPreview && item.shareLink && (
                            <div className="pt-2">
                                <a 
                                    href={item.shareLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-black uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-750 transition-all"
                                >
                                    <ExternalLink size={12} /> Visit Share Link
                                </a>
                            </div>
                        )}
                    </div>
                );
            }

            case 'stories': {
                const item = selectedPreviewItem;
                return (
                    <div className="space-y-6 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                                Mood: {item.coverMood || "Story"}
                            </span>
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> {item.readingTimeMinutes || 3} min read
                            </span>
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-black rounded-full uppercase tracking-wider">
                                Visibility: {item.visibility || 'public'}
                            </span>
                        </div>

                        <h2 className="text-3xl font-black text-navy-900 dark:text-white leading-tight tracking-tight">
                            {item.title}
                        </h2>

                        {item.thumbnailUrl && (
                            <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                                <img src={item.thumbnailUrl} alt="Story cover" className="w-full object-cover max-h-[350px]" />
                            </div>
                        )}

                        <div className="text-base text-slate-800 dark:text-gray-100 leading-relaxed whitespace-pre-line font-medium space-y-4">
                            {item.fullStory}
                        </div>

                        {item.futureGoals && (
                            <div className="p-6 rounded-[2rem] bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30">
                                <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" /> Future Aspirations & Goals
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-semibold">
                                    {item.futureGoals}
                                </p>
                            </div>
                        )}

                        {item.oneAdvice && (
                            <div className="p-6 rounded-[2rem] bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 relative overflow-hidden">
                                <div className="absolute right-4 bottom-2 text-emerald-200/20 dark:text-emerald-900/20 font-serif text-9xl pointer-events-none select-none">“</div>
                                <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" /> One Piece of Advice
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-gray-300 italic leading-relaxed whitespace-pre-line font-black relative z-10">
                                    &ldquo;{item.oneAdvice}&rdquo;
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'notices': {
                const item = selectedPreviewItem;
                return (
                    <div className="space-y-5 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                            {item.isUrgent && (
                                <span className="px-3 py-1 bg-red-100 dark:bg-red-955 text-red-650 dark:text-red-400 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle size={12} /> Urgent Notice
                                </span>
                            )}
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-650 dark:text-gray-350 text-xs font-black rounded-full uppercase tracking-wider">
                                Programme: {item.programme || "All"}
                            </span>
                            {item.collegeColor && (
                                <span 
                                    className="px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider"
                                    style={{ backgroundColor: `${item.collegeColor}15`, color: item.collegeColor }}
                                >
                                    {item.college}
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                            {item.title}
                        </h2>

                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                            {item.body}
                        </div>

                        {item.thumbnailUrl && (
                            <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                                <img src={item.thumbnailUrl} alt="Notice cover" className="w-full object-cover max-h-[350px]" />
                            </div>
                        )}

                        {item.attachmentUrl && (
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 dark:text-white">Notice Attachment (PDF)</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Official Document attached</p>
                                    </div>
                                </div>
                                <a 
                                    href={item.attachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto px-5 py-3 bg-red-500 hover:bg-red-605 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Download size={12} /> View Document
                                </a>
                            </div>
                        )}
                    </div>
                );
            }

            case 'studyPosts': {
                const item = selectedPreviewItem;
                const isSchedule = item.type === 'schedule';

                if (isSchedule) {
                    const startDate = safeDate(item.startTime);
                    return (
                        <div className="space-y-6 text-left">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400 text-xs font-black rounded-full uppercase tracking-[0.15em] flex items-center gap-1.5">
                                    <Clock size={12} /> Prep Class Schedule
                                </span>
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-black rounded-full uppercase tracking-wider">
                                    {item.visibility || item.privacy || 'public'}
                                </span>
                            </div>

                            <h2 className="text-2xl font-black text-navy-900 dark:text-white leading-tight tracking-tight">
                                {item.title}
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-150/80 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <Calendar size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <Clock size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">{format(startDate, "hh:mm a")}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Agenda / Details</h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                                    {item.content || "No agenda provided."}
                                </p>
                            </div>

                            {item.link && (
                                <div className="p-4 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Video size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-gray-950 dark:text-white">Class Join Link</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Online Session Link</p>
                                        </div>
                                    </div>
                                    <a 
                                        href={item.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full sm:w-auto px-6 py-3 bg-indigo-605 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <ExternalLink size={12} /> View Join Link
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                } else {
                    const materialIcons = {
                        doc: { icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", label: "Document" },
                        video: { icon: Video, color: "text-red-500 bg-red-50 dark:bg-red-900/20", label: "Video" },
                        link: { icon: ExternalLink, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20", label: "Link" }
                    };
                    const matType = item.materialType || 'link';
                    const iconConfig = materialIcons[matType as keyof typeof materialIcons] || materialIcons.link;
                    const IconComp = iconConfig.icon;

                    return (
                        <div className="space-y-6 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${iconConfig.color}`}>
                                    <IconComp size={12} /> {iconConfig.label}
                                </span>
                                {(item.yearRelevance || item.semesterRelevance) && (
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 text-xs font-black rounded-full uppercase tracking-wider">
                                        {item.yearRelevance} - {item.semesterRelevance}
                                    </span>
                                )}
                                {item.tags && item.tags.length > 0 && item.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-black rounded-full uppercase tracking-wider">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <h2 className="text-2xl font-black text-navy-900 dark:text-white leading-tight tracking-tight">
                                {item.title}
                            </h2>

                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-medium">
                                {item.content}
                            </p>

                            {item.thumbnailUrl && (
                                <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md">
                                    <img src={item.thumbnailUrl} alt="Material cover" className="w-full object-cover max-h-[350px]" />
                                </div>
                            )}

                            {item.fileUrl && (
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-855 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{item.fileName || "Study Resource"}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                {item.fileSize ? `${(item.fileSize / (1024 * 1024)).toFixed(2)} MB` : ""} • {item.fileType || "File"}
                                            </p>
                                        </div>
                                    </div>
                                    <a 
                                        href={item.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full sm:w-auto px-5 py-3 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Download size={12} /> Download File
                                    </a>
                                </div>
                            )}

                            {!item.fileUrl && (item.link || item.resourceLink) && (
                                <div className="pt-2">
                                    <a 
                                        href={item.link || item.resourceLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-150 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-black uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                    >
                                        <ExternalLink size={12} /> Visit External Resource
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                }
            }

            default:
                return <p className="text-sm text-gray-500">Preview not available for this type.</p>;
        }
    };

    const isAdminOrSuper = profile?.role === "admin" || profile?.role === "super_manager";

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        const unsubPending = subscribeModerationQueueGeneric(
            type,
            profile?.collegeId, 
            isAdminOrSuper, 
            (data) => {
                setPendingItems(data);
                setLoading(false);
            }
        );

        const unsubReviewed = subscribeReviewedQueueGeneric(
            type,
            profile?.collegeId, 
            isAdminOrSuper, 
            (data) => setReviewedItems(data)
        );

        return () => {
            unsubPending();
            unsubReviewed();
        };
    }, [isOpen, profile, isAdminOrSuper, type]);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleApprove = async (id: string) => {
        setIsProcessing(id);
        try {
            await approveModerationItem(type, id);
        } catch (err) {
            console.error(err);
            showToast("Approval failed.", "error");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = rejectReason[id];
        setIsProcessing(id);
        try {
            await rejectModerationItem(type, id, reason);
        } catch (err) {
            console.error(err);
            showToast("Rejection failed.", "error");
        } finally {
            setIsProcessing(null);
            setRejectReason(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const getItemData = (item: any) => {
        switch (type) {
            case 'posts':
                return {
                    author: item.createdBy?.name || "Anonymous",
                    avatar: item.createdBy?.avatar,
                    college: item.collegeName,
                    time: item.timestamp,
                    title: item.eventName,
                    content: item.description,
                };
            case 'stories':
                return {
                    author: item.name || "Anonymous",
                    avatar: item.authorPhoto,
                    college: item.college,
                    time: item.timestamp,
                    title: item.title,
                    content: item.shortDescription || item.fullStory,
                };
            case 'notices':
                return {
                    author: item.postedBy || "Anonymous",
                    avatar: null,
                    college: item.college,
                    time: item.date,
                    title: item.title,
                    content: item.body,
                    isUrgent: item.isUrgent
                };
            case 'studyPosts':
                return {
                    author: item.authorName || "Anonymous",
                    avatar: item.authorPhoto,
                    college: item.collegeName,
                    time: item.createdAt,
                    title: item.title,
                    content: item.content,
                };
            default:
                return {};
        }
    };

    const formatTime = (ts: any) => {
        if (!ts) return 'Now';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return d.toLocaleDateString();
    };

    const typeLabels = {
        posts: "Post",
        stories: "Story",
        notices: "Notice",
        studyPosts: "Study Resource"
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[2px]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 z-[120] h-full w-full sm:w-[380px] bg-white dark:bg-[#0f1117] shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#1a1b23] shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Shield size={20} className="text-primary" /> {typeLabels[type]} Review
                                </h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Community Moderation</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-3 bg-gray-50 dark:bg-black/20 shrink-0">
                            <div className="flex w-full p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl">
                                <button 
                                    onClick={() => setActiveTab("pending")}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                                >
                                    Pending ({pendingItems.length})
                                </button>
                                <button 
                                    onClick={() => setActiveTab("reviewed")}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'reviewed' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                                >
                                    Reviewed
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-24">
                            {loading && activeTab === 'pending' ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                                    <Loader2 size={40} className="animate-spin mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Hydrating data...</p>
                                </div>
                            ) : (
                                <>
                                    {(activeTab === 'pending' ? pendingItems : reviewedItems).map((item) => {
                                        const data = getItemData(item);
                                        return (
                                            <div key={item.id} className="bg-white dark:bg-[#1a1b23] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm post-card-mod">
                                                {/* Meta */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#0f1117] flex items-center justify-center text-xs font-black text-gray-400 border border-gray-50 dark:border-gray-800 shrink-0">
                                                        {data.avatar && data.avatar.length > 2 ? <img src={data.avatar} className="w-full h-full object-cover rounded-xl" /> : (data.author ? data.author[0] : "?")}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{data.author}</h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                            <span className="flex items-center gap-1"><MapPin size={8} /> {data.college || item.collegeName || item.college}</span>
                                                            <span>•</span>
                                                            <span>{formatTime(data.time)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                                        {activeTab === 'reviewed' && (
                                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${item.status === 'approved' || item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {item.status}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => openPreview(item)}
                                                            className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-805 rounded-lg text-gray-400 hover:text-primary transition-all"
                                                            title="Full Preview"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Body */}
                                                <div className="space-y-2">
                                                    {data.isUrgent && (
                                                        <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase bg-red-100 w-fit px-1.5 py-0.5 rounded-full mb-1">
                                                            <AlertTriangle size={8} /> URGENT
                                                        </div>
                                                    )}
                                                    {data.title && <h5 className="text-xs font-black text-gray-800 dark:text-gray-100 leading-tight">{data.title}</h5>}
                                                    <p className={`text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed ${expandedItems.includes(item.id) ? '' : 'line-clamp-3'}`}>
                                                        {data.content || "No content provided."}
                                                    </p>
                                                    {data.content && data.content.length > 120 && (
                                                        <button 
                                                            onClick={() => toggleExpand(item.id)}
                                                            className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1"
                                                        >
                                                            {expandedItems.includes(item.id) ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {activeTab === 'pending' && (
                                                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 space-y-3">
                                                        <button 
                                                            onClick={() => openPreview(item)}
                                                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800/70 border border-gray-100 dark:border-gray-700/80 text-gray-650 dark:text-gray-350 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                                        >
                                                            <Eye size={12} /> Full Preview
                                                        </button>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                disabled={isProcessing === item.id}
                                                                onClick={() => handleApprove(item.id)}
                                                                className="flex-1 py-2 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {isProcessing === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} APPROVE
                                                            </button>
                                                            <button 
                                                                disabled={isProcessing === item.id}
                                                                onClick={() => {
                                                                    if (typeof rejectReason[item.id] === 'string') {
                                                                        handleReject(item.id);
                                                                    } else {
                                                                        setRejectReason(prev => ({ ...prev, [item.id]: "" }));
                                                                    }
                                                                }}
                                                                className="flex-1 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {isProcessing === item.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} REJECT
                                                            </button>
                                                        </div>

                                                        {/* Reject Input (Optional) */}
                                                        <AnimatePresence>
                                                            {typeof rejectReason[item.id] === 'string' && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="space-y-2 overflow-hidden"
                                                                >
                                                                    <input 
                                                                        type="text"
                                                                        autoFocus
                                                                        value={rejectReason[item.id]}
                                                                        onChange={(e) => setRejectReason(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                        placeholder="Reason (optional)"
                                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-red-500/30"
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleReject(item.id)}
                                                                        className="w-full py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                                                                    >
                                                                        Confirm Reject
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {activeTab === 'reviewed' && (
                                                    <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 space-y-2">
                                                        <button 
                                                            onClick={() => openPreview(item)}
                                                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800/70 border border-gray-100 dark:border-gray-700/80 text-gray-650 dark:text-gray-350 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                                        >
                                                            <Eye size={12} /> View Details
                                                        </button>
                                                        {item.rejectReason && (
                                                            <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                                                                <p className="text-[10px] font-bold text-red-600/70 italic leading-snug">
                                                                    Rejected: {item.rejectReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {(activeTab === 'pending' ? pendingItems : reviewedItems).length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center text-gray-200 dark:text-gray-800">
                                            <CheckCircle2 size={60} strokeWidth={1} />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] mt-4">All Clear</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">No {activeTab} {typeLabels[type]}s to show</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Preview Modal Overlay */}
                    <AnimatePresence>
                        {selectedPreviewItem && (
                            <>
                                {/* Preview Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={closePreview}
                                    className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md"
                                />

                                {/* Preview Centered Panel */}
                                <div className="fixed inset-0 z-[160] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                        className="w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-[#12141c] rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                                    >
                                        {/* Modal Header */}
                                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#1a1b23] shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                        Previewing {typeLabels[type]}
                                                    </h3>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                        Item ID: {selectedPreviewItem.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={closePreview}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Modal Scrollable Body */}
                                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar">
                                            {/* Author Metadata Card */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-250 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0 border border-gray-150 dark:border-gray-650">
                                                        {getItemData(selectedPreviewItem).avatar ? (
                                                            <img src={getItemData(selectedPreviewItem).avatar} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <User size={20} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                                                            {getItemData(selectedPreviewItem).author}
                                                        </h4>
                                                        <p className="text-xs font-bold text-gray-405 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                            {selectedPreviewItem.authorRole || selectedPreviewItem.role || "Contributor"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1">
                                                        <MapPin size={10} /> {getItemData(selectedPreviewItem).college || selectedPreviewItem.collegeName || selectedPreviewItem.college}
                                                    </span>
                                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1">
                                                        <Clock size={10} /> {formatTime(getItemData(selectedPreviewItem).time)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content Rendering */}
                                            {renderPreviewContent()}
                                        </div>

                                        {/* Modal Action Footer */}
                                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1b23] shrink-0">
                                            {selectedPreviewItem.status === 'pending' || activeTab === 'pending' ? (
                                                <div className="space-y-4">
                                                    {!modalShowRejectInput ? (
                                                        <div className="flex flex-col sm:flex-row gap-3">
                                                            <button
                                                                disabled={isProcessing === selectedPreviewItem.id}
                                                                onClick={() => handleApproveWithClose(selectedPreviewItem.id)}
                                                                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-green-500/20"
                                                            >
                                                                {isProcessing === selectedPreviewItem.id ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 size={14} />
                                                                )} 
                                                                Approve Submission
                                                            </button>
                                                            <button
                                                                disabled={isProcessing === selectedPreviewItem.id}
                                                                onClick={() => setModalShowRejectInput(true)}
                                                                className="flex-1 py-4 bg-red-500 hover:bg-red-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-500/20"
                                                            >
                                                                <XCircle size={14} /> Reject Submission
                                                            </button>
                                                            <button
                                                                onClick={closePreview}
                                                                className="px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="space-y-3"
                                                        >
                                                            <div className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-wider">
                                                                <AlertTriangle size={14} /> Provide Rejection Reason
                                                            </div>
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={modalRejectReason}
                                                                onChange={(e) => setModalRejectReason(e.target.value)}
                                                                placeholder="Specify rejection reason (e.g. Inappropriate content, typo in title, wrong category)..."
                                                                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500/30 dark:text-white"
                                                            />
                                                            <div className="flex gap-3">
                                                                <button
                                                                    disabled={isProcessing === selectedPreviewItem.id}
                                                                    onClick={() => {
                                                                        setRejectReason(prev => ({ ...prev, [selectedPreviewItem.id]: modalRejectReason }));
                                                                        handleRejectWithClose(selectedPreviewItem.id);
                                                                    }}
                                                                    className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-red-600/20"
                                                                >
                                                                    {isProcessing === selectedPreviewItem.id ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <XCircle size={12} />
                                                                    )}
                                                                    Confirm Rejection
                                                                </button>
                                                                <button
                                                                    onClick={() => setModalShowRejectInput(false)}
                                                                    className="px-5 py-3 bg-gray-250 dark:bg-gray-800 text-gray-700 dark:text-gray-305 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
                                                                >
                                                                    Back
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center">
                                                    <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                                                        Status: 
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                            selectedPreviewItem.status === 'approved' || selectedPreviewItem.status === 'published'
                                                                ? 'bg-green-150 text-green-700' 
                                                                : 'bg-red-150 text-red-700'
                                                        }`}>
                                                            {selectedPreviewItem.status}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={closePreview}
                                                        className="px-6 py-3 bg-white dark:bg-gray-850 hover:bg-gray-50 border border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-350 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                                    >
                                                        Close Preview
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
