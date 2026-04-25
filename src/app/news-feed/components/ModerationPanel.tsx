"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Shield, Clock, CheckCircle2, XCircle, 
    ChevronDown, ChevronUp, ExternalLink, User, 
    MapPin, Loader2, MessageCircle
} from "lucide-react";
import { 
    subscribeModerationQueue, 
    subscribeReviewedPosts,
    approvePost,
    rejectPost,
    type FirestorePost
} from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";

interface ModerationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
}

export default function ModerationPanel({ isOpen, onClose, profile }: ModerationPanelProps) {
    const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
    const [pendingPosts, setPendingPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [reviewedPosts, setReviewedPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const { showToast } = useToast();

    const isAdminOrSuper = profile?.role === "admin" || profile?.role === "super_manager";

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        const unsubPending = subscribeModerationQueue(
            profile?.collegeId, 
            isAdminOrSuper, 
            (data) => {
                setPendingPosts(data);
                setLoading(false);
            }
        );

        const unsubReviewed = subscribeReviewedPosts(
            profile?.collegeId, 
            isAdminOrSuper, 
            (data) => setReviewedPosts(data)
        );

        return () => {
            unsubPending();
            unsubReviewed();
        };
    }, [isOpen, profile, isAdminOrSuper]);

    const toggleExpand = (id: string) => {
        setExpandedPosts(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleApprove = async (id: string) => {
        setIsProcessing(id);
        try {
            await approvePost(id);
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
            await rejectPost(id, reason);
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
                                    <Shield size={20} className="text-primary" /> Post Review Queue
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
                                    Pending ({pendingPosts.length})
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
                                    {(activeTab === 'pending' ? pendingPosts : reviewedPosts).map((post) => (
                                        <div key={post.id} className="bg-white dark:bg-[#1a1b23] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm post-card-mod">
                                            {/* Post Author / Meta */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#0f1117] flex items-center justify-center text-xs font-black text-gray-400 border border-gray-50 dark:border-gray-800 shrink-0">
                                                    {post.createdBy.avatar && post.createdBy.avatar.length > 2 ? <img src={post.createdBy.avatar} className="w-full h-full object-cover rounded-xl" /> : post.createdBy.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{post.createdBy.name}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                        <span className="flex items-center gap-1"><MapPin size={8} /> {post.collegeName}</span>
                                                        <span>•</span>
                                                        <span>{post.timestamp ? new Date(post.timestamp.seconds * 1000).toLocaleDateString() : 'Now'}</span>
                                                    </div>
                                                </div>
                                                {activeTab === 'reviewed' && (
                                                    <div className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${post.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {post.status}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Body */}
                                            <div className="space-y-2">
                                                {post.eventName && <h5 className="text-xs font-black text-gray-800 dark:text-gray-100 leading-tight">{post.eventName}</h5>}
                                                <p className={`text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed ${expandedPosts.includes(post.id) ? '' : 'line-clamp-3'}`}>
                                                    {post.description || "No description provided."}
                                                </p>
                                                {post.description && post.description.length > 120 && (
                                                    <button 
                                                        onClick={() => toggleExpand(post.id)}
                                                        className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        {expandedPosts.includes(post.id) ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                                                    </button>
                                                )}
                                                
                                                {post.linkPreview?.domain && (
                                                    <div className="flex items-center gap-1.5 p-1.5 px-2.5 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-800 w-fit">
                                                        <ExternalLink size={10} className="text-gray-400" />
                                                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{post.linkPreview.domain}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {activeTab === 'pending' && (
                                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 space-y-3">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            disabled={isProcessing === post.id}
                                                            onClick={() => handleApprove(post.id)}
                                                            className="flex-1 py-2 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            {isProcessing === post.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} APPROVE
                                                        </button>
                                                        <button 
                                                            disabled={isProcessing === post.id}
                                                            onClick={() => {
                                                                if (typeof rejectReason[post.id] === 'string') {
                                                                    handleReject(post.id);
                                                                } else {
                                                                    setRejectReason(prev => ({ ...prev, [post.id]: "" }));
                                                                }
                                                            }}
                                                            className="flex-1 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            {isProcessing === post.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} REJECT
                                                        </button>
                                                    </div>

                                                    {/* Reject Input (Optional) */}
                                                    <AnimatePresence>
                                                        {typeof rejectReason[post.id] === 'string' && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="space-y-2 overflow-hidden"
                                                            >
                                                                <input 
                                                                    type="text"
                                                                    autoFocus
                                                                    value={rejectReason[post.id]}
                                                                    onChange={(e) => setRejectReason(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                    placeholder="Reason (optional)"
                                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-red-500/30"
                                                                />
                                                                <button 
                                                                    onClick={() => handleReject(post.id)}
                                                                    className="w-full py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                                                                >
                                                                    Confirm Reject
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {activeTab === 'reviewed' && post.rejectReason && (
                                                <div className="mt-3 p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                                                    <p className="text-[10px] font-bold text-red-600/70 italic leading-snug">
                                                        Rejected: {post.rejectReason}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {(activeTab === 'pending' ? pendingPosts : reviewedPosts).length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center text-gray-200 dark:text-gray-800">
                                            <CheckCircle2 size={60} strokeWidth={1} />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] mt-4">All Clear</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">No {activeTab} posts to show</p>
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
