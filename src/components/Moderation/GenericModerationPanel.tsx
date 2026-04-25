"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Shield, Clock, CheckCircle2, XCircle, 
    ChevronDown, ChevronUp, ExternalLink, User, 
    MapPin, Loader2, MessageCircle, AlertTriangle
} from "lucide-react";
import { 
    subscribeModerationQueueGeneric, 
    subscribeReviewedQueueGeneric,
    approveModerationItem,
    rejectModerationItem
} from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";

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
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{data.author}</h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                            <span className="flex items-center gap-1"><MapPin size={8} /> {data.college || item.collegeName || item.college}</span>
                                                            <span>•</span>
                                                            <span>{formatTime(data.time)}</span>
                                                        </div>
                                                    </div>
                                                    {activeTab === 'reviewed' && (
                                                        <div className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${item.status === 'approved' || item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.status}
                                                        </div>
                                                    )}
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

                                                {activeTab === 'reviewed' && item.rejectReason && (
                                                    <div className="mt-3 p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                                                        <p className="text-[10px] font-bold text-red-600/70 italic leading-snug">
                                                            Rejected: {item.rejectReason}
                                                        </p>
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
                </>
            )}
        </AnimatePresence>
    );
}
