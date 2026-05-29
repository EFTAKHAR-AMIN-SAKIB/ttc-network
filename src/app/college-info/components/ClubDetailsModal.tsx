"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
    X, MapPin, Clock, Calendar, Globe, Share2, Users, Star, 
    Award, Shield, UserCheck, UserPlus, Trash2, Camera, 
    Loader2, Check, MessageCircle, MoreVertical, Rss, ExternalLink, Heart,
    ShieldCheck, ShieldX, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FirestoreClub, ClubMember, ClubRequest, ClubActivity, FirestorePost,
    subscribeClubMembers, subscribeClubRequests, subscribeClubActivities, subscribeClubPosts,
    requestJoinClub, approveClubMember, rejectClubMember, removeClubMember,
    addClubActivity, canManageClub, updateClub, approveClubPostShare, rejectClubPostShare
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { ToastNotification, ToastType } from "@/components/ConfirmationDialog";

interface ClubDetailsModalProps {
    club: FirestoreClub & { id: string };
    onClose: () => void;
}

// Toast state type
interface ToastState {
    show: boolean;
    type: ToastType;
    title: string;
    message: string;
}

// Confirmation dialog state type
interface ConfirmState {
    isOpen: boolean;
    variant: "success" | "danger" | "warning" | "info";
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    icon?: React.ReactNode;
}

export default function ClubDetailsModal({ club, onClose }: ClubDetailsModalProps) {
    const { profile } = useAuth();
    const [tab, setTab] = useState<"about" | "feed" | "members" | "activities" | "requests">("feed");
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [requests, setRequests] = useState<ClubRequest[]>([]);
    const [activities, setActivities] = useState<(ClubActivity & { id: string })[]>([]);
    const [feedPosts, setFeedPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [adminAccess, setAdminAccess] = useState<{ allowed: boolean; role: string | null }>({ allowed: false, role: null });
    const [loading, setLoading] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [isMember, setIsMember] = useState(false);

    // Toast notification state
    const [toast, setToast] = useState<ToastState>({ show: false, type: "success", title: "", message: "" });

    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const showToast = (type: ToastType, title: string, message: string) => {
        setToast({ show: true, type, title, message });
    };

    useEffect(() => {
        if (!club.id) return;
        
        const unsubMembers = subscribeClubMembers(club.id, (data) => {
            setMembers(data);
            if (profile) {
                const myId = (profile as any).uid || (profile as any).id;
                setIsMember(data.some(m => m.userId === myId));
            }
        });
        const unsubActivities = subscribeClubActivities(club.id, (data) => setActivities(data));
        
        let unsubPosts = () => {};
        if (club.name) {
            unsubPosts = subscribeClubPosts(club.name, (data) => setFeedPosts(data));
        }
        
        canManageClub(club.id).then(setAdminAccess);

        return () => {
            unsubMembers();
            unsubActivities();
            unsubPosts();
        };
    }, [club.id, club.name, profile]);

    useEffect(() => {
        if (adminAccess.allowed && club.id) {
            const unsubRequests = subscribeClubRequests(club.id, (data) => setRequests(data));
            return () => unsubRequests();
        }
    }, [adminAccess.allowed, club.id]);

    useEffect(() => {
        if (profile && !isMember && club.id) {
            const unsubReqs = subscribeClubRequests(club.id, (data) => {
                const myId = (profile as any).uid || (profile as any).id;
                setHasPendingRequest(data.some(r => r.userId === myId));
            });
            return () => unsubReqs();
        }
    }, [profile, isMember, club.id]);

    const handleJoinClick = async () => {
        if (!profile) {
            showToast("error", "Login Required", "Please log in to join this club.");
            return;
        }
        
        const confirmed = await confirm({
            title: `Join ${club.name}?`,
            message: `Your request will be sent to the club leaders for review. You'll be notified once they respond.`,
            variant: "info"
        });

        if (confirmed) {
            setConfirmLoading(true);
            try {
                await requestJoinClub(club.id!, "I would like to join this club!");
                showToast("success", "Request Sent! 🎉", `Your join request for "${club.name}" has been sent. The club leaders will review it shortly.`);
            } catch (err: any) {
                showToast("error", "Could Not Send Request", err.message);
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    const handleApproveClick = async (req: ClubRequest) => {
        const confirmed = await confirm({
            title: `Approve ${req.displayName}?`,
            message: `This will add ${req.displayName} as a member of ${club.name}. They'll be notified immediately.`,
            variant: "success"
        });

        if (confirmed) {
            setConfirmLoading(true);
            try {
                await approveClubMember(club.id!, req.userId);
                showToast("success", "Member Approved! ✅", `${req.displayName} has been added to ${club.name} as a member.`);
            } catch (err: any) {
                showToast("error", "Approval Failed", err.message);
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    const handleRejectClick = async (req: ClubRequest) => {
        const confirmed = await confirm({
            title: `Reject ${req.displayName}?`,
            message: `This will decline ${req.displayName}'s request to join ${club.name}. They'll be notified.`,
            variant: "danger"
        });

        if (confirmed) {
            setConfirmLoading(true);
            try {
                await rejectClubMember(club.id!, req.userId);
                showToast("info", "Request Declined", `${req.displayName}'s join request has been declined.`);
            } catch (err: any) {
                showToast("error", "Action Failed", err.message);
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    const handleApprovePostShareClick = async (req: any) => {
        const confirmed = await confirm({
            title: `Approve Post Share?`,
            message: `This will display "${req.postEventName}" created by ${req.displayName} directly on your club's feed.`,
            variant: "success"
        });

        if (confirmed) {
            setConfirmLoading(true);
            try {
                await approveClubPostShare(club.id!, req.postId);
                showToast("success", "Post Share Approved! ✅", `"${req.postEventName}" has been added to your club's feed.`);
            } catch (err: any) {
                showToast("error", "Action Failed", err.message);
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    const handleRejectPostShareClick = async (req: any) => {
        const confirmed = await confirm({
            title: `Decline Post Share?`,
            message: `This will decline ${req.displayName}'s request to display "${req.postEventName}" on your club's feed.`,
            variant: "danger"
        });

        if (confirmed) {
            setConfirmLoading(true);
            try {
                await rejectClubPostShare(club.id!, req.postId);
                showToast("info", "Post Share Declined", `Request for "${req.postEventName}" has been declined.`);
            } catch (err: any) {
                showToast("error", "Action Failed", err.message);
            } finally {
                setConfirmLoading(false);
                closeConfirm();
            }
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-[#161620] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Banner */}
                    <div className={`h-48 relative shrink-0 ${!club.bannerUrl ? "bg-gradient-to-br from-primary to-accent" : ""}`}>
                        {club.bannerUrl && (
                            <Image src={club.bannerUrl} alt="Club Banner" fill className="object-cover" />
                        )}
                        {club.bannerUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />}

                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all z-10 border border-white/10">
                            <X size={20} />
                        </button>
                        
                        <div className="absolute -bottom-16 left-12 w-32 h-32 rounded-full bg-white dark:bg-[#161620] p-2 shadow-2xl z-20 border border-gray-100 dark:border-gray-800">
                            <div className="w-full h-full rounded-full bg-gray-50 dark:bg-[#0C0C10] flex items-center justify-center text-5xl overflow-hidden relative">
                                {club.logo ? (
                                    <Image src={club.logo} alt="Logo" fill className="object-cover" />
                                ) : (
                                    <span>{club.icon || "🎯"}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-12 pb-12 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                            <div>
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white items-center gap-4 flex flex-wrap">
                                    {club.name}
                                    <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary rounded-full">
                                        {club.category || "General"}
                                    </span>
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg font-medium italic">
                                    {club.tagline || "Enriching the college experience through collaboration."}
                                </p>
                            </div>
                            
                            <div className="flex gap-3">
                                {!isMember && !hasPendingRequest && (
                                    <button 
                                        onClick={handleJoinClick}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:grayscale"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                        Join Club
                                    </button>
                                )}
                                {hasPendingRequest && (
                                    <div className="px-8 py-3 bg-amber-500/10 text-amber-500 font-extrabold rounded-2xl border border-amber-500/20 flex items-center gap-2">
                                        <Clock size={18} />
                                        Pending Approval
                                    </div>
                                )}
                                {isMember && (
                                    <div className="px-8 py-3 bg-emerald-500/10 text-emerald-500 font-extrabold rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                                        <Check size={18} />
                                        Joined
                                    </div>
                                )}
                                
                                <button className="p-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-gray-50 dark:border-gray-800 mb-8 sticky top-0 bg-white dark:bg-[#161620] z-30 pb-0 overflow-x-auto scrollbar-hide">
                            {[
                                { id: "feed", label: "Feed", icon: Rss },
                                { id: "about", label: "About", icon: Globe },
                                { id: "members", label: "Members", icon: Users },
                                { id: "activities", label: "Activities", icon: Award },
                                ...(adminAccess.allowed ? [{ id: "requests", label: "Requests", icon: MessageCircle }] : [])
                            ].map((t) => (
                                <button 
                                    key={t.id}
                                    onClick={() => setTab(t.id as any)}
                                    className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all relative ${tab === t.id ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <t.icon size={16} />
                                    {t.label}
                                    {t.id === "requests" && requests.length > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center animate-pulse">
                                            {requests.length}
                                        </span>
                                    )}
                                    {tab === t.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="min-h-[300px]">
                            {tab === "feed" && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    {feedPosts.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-50 dark:bg-[#161620]/30 rounded-[2rem] border border-dashed border-gray-100 dark:border-gray-800">
                                            <Rss size={40} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400 font-bold">No updates yet from {club.name}.</p>
                                        </div>
                                    ) : (
                                        feedPosts.map((post) => (
                                            <div key={post.id} className="bg-gray-50 dark:bg-[#0C0C10] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-400">
                                                        {post.createdBy.avatar && post.createdBy.avatar.length > 2 ? (
                                                            <img src={post.createdBy.avatar} alt={post.createdBy.name} className="object-cover h-full w-full" />
                                                        ) : (
                                                            post.createdBy.avatar || "?"
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{post.createdBy.name}</h4>
                                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Shared an update</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                                        {post.eventName}
                                                    </h3>
                                                    {post.description && (
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                            {post.description}
                                                        </p>
                                                    )}
                                                    {post.linkPreview && (
                                                        <a href={post.shareLink} target="_blank" rel="noopener noreferrer" className="block mt-4 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:opacity-90 transition-opacity bg-white dark:bg-[#161620]">
                                                            {post.linkPreview.thumbnail && (
                                                                <div className="h-48 relative w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                                                                    <img src={post.linkPreview.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <div className="p-5">
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider truncate">{post.linkPreview.domain}</span>
                                                                    <ExternalLink size={12} className="text-primary ml-auto flex-shrink-0" />
                                                                </div>
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">{post.linkPreview.title}</h4>
                                                                {post.linkPreview.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{post.linkPreview.description}</p>}
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="mt-5 pt-4 border-t border-gray-200/50 dark:border-gray-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-6 text-xs font-bold text-gray-500">
                                                        <span className="flex items-center gap-2"><Heart size={16} className={Object.values(post.reactions || {}).reduce((a: any, b: any) => a + Number(b), 0) > 0 ? "fill-red-500 text-red-500" : "text-gray-400"} /> {Object.values(post.reactions || {}).reduce((a: any, b: any) => a + Number(b), 0)} Reactions</span>
                                                        <span className="flex items-center gap-2"><MessageCircle size={16} className="text-gray-400" /> {post.commentsCount || 0} Comments</span>
                                                    </div>
                                                    <a href={`/news-feed?post=${post.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 bg-primary/5 px-3.5 py-2 rounded-full hover:bg-primary/10 transition-colors">
                                                        View Post <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {tab === "about" && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Description</h4>
                                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                                                {club.description || "No description provided."}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="p-6 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Clock size={20} /></div>
                                                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Schedule</span>
                                                </div>
                                                <p className="text-gray-900 dark:text-white font-bold">{club.schedule || "To be announced"}</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><MapPin size={20} /></div>
                                                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Location</span>
                                                </div>
                                                <p className="text-gray-900 dark:text-white font-bold">{club.location || "Main Campus"}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            {club.socialLinks?.facebook && (
                                                <a href={club.socialLinks.facebook} target="_blank" className="flex items-center gap-3 px-5 py-3 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl text-sm font-bold hover:bg-[#1877F2]/20 transition-colors">
                                                    <Globe size={18} /> Facebook Page
                                                </a>
                                            )}
                                            {club.socialLinks?.whatsapp && (
                                                <a href={`https://wa.me/${club.socialLinks.whatsapp}`} target="_blank" className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 text-emerald-500 rounded-2xl text-sm font-bold hover:bg-emerald-500/20 transition-colors">
                                                    <MessageCircle size={18} /> WhatsApp Group
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="p-8 bg-black/5 dark:bg-white/5 rounded-3xl relative overflow-hidden backdrop-blur-sm border border-black/5 dark:border-white/5">
                                            <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-6">Advisor In-Charge</h4>
                                            <div className="flex items-center gap-5">
                                                <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white dark:bg-[#161620] relative">
                                                    <UserCheck size={40} className="absolute inset-0 m-auto text-primary/20" />
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{club.advisorName || "Staff Member"}</p>
                                                    <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wide">College Faculty</p>
                                                </div>
                                            </div>
                                            <div className="mt-8 flex gap-3">
                                                <div className="flex-1 p-3 bg-white/50 dark:bg-black/20 rounded-2xl text-center">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{club.membersCount}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Members</p>
                                                </div>
                                                <div className="flex-1 p-3 bg-white/50 dark:bg-black/20 rounded-2xl text-center">
                                                    <p className="text-lg font-black text-gray-900 dark:text-white">{new Date().getFullYear() - parseInt(club.foundedDate || "2024")}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Years Active</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tab === "members" && (
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {members.sort((a,b) => a.role === "President" ? -1 : 1).map((member, i) => (
                                            <Link
                                                key={i}
                                                href={`/profile/${member.userId}`}
                                                target="_blank"
                                                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border border-gray-100 dark:border-gray-800/50 hover:shadow-xl hover:border-primary/30 transition-all group cursor-pointer"
                                            >
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-[#161620] shadow-sm relative ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                    {member.photoURL ? (
                                                        <Image src={member.photoURL} alt={member.displayName} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-primary/60 font-black text-lg bg-primary/5">
                                                            {member.displayName[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{member.displayName}</p>
                                                    <p className={`text-[10px] items-center gap-1 inline-flex font-black uppercase tracking-wider ${member.role.includes("President") ? "text-amber-500" : "text-gray-400"}`}>
                                                        {member.role.includes("President") && <Shield size={10} />}
                                                        {member.role}
                                                    </p>
                                                </div>
                                                {adminAccess.allowed && member.userId !== (profile as any).uid && member.userId !== (profile as any).id && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const confirmed = await confirm({
                                                                title: "Remove Member",
                                                                message: `Are you sure you want to remove ${member.displayName} from the club?`,
                                                                variant: "danger"
                                                            });
                                                            if (confirmed) {
                                                                setConfirmLoading(true);
                                                                try {
                                                                    await removeClubMember(club.id!, member.userId);
                                                                    showToast("info", "Member Removed", `${member.displayName} has been removed from the club.`);
                                                                } finally {
                                                                    setConfirmLoading(false);
                                                                    closeConfirm();
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tab === "activities" && (
                                <div className="space-y-10">
                                    {adminAccess.allowed && (
                                        <button className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl flex items-center justify-center gap-3 text-gray-400 hover:border-primary hover:text-primary transition-all font-bold group">
                                            <PlusIcon className="group-hover:rotate-90 transition-transform" size={20} /> Add Event or Achievement
                                        </button>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {activities.map((activity) => (
                                            <div key={activity.id} className="relative group/act bg-gray-50 dark:bg-[#0C0C10] rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800">
                                                {activity.photoUrl && (
                                                    <div className="h-48 relative overflow-hidden">
                                                        <Image src={activity.photoUrl} alt={activity.title} fill className="object-cover group-hover/act:scale-110 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                        <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                                                            {activity.type}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{activity.date}</p>
                                                        {activity.type === "achievement" && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                                    </div>
                                                    <h5 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">{activity.title}</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{activity.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tab === "requests" && (
                                <div className="space-y-6">
                                    {requests.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-50 dark:bg-[#161620]/30 rounded-[2rem] border border-dashed border-gray-100 dark:border-gray-800">
                                            <Users size={40} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400 font-bold">No pending requests at the moment.</p>
                                        </div>
                                    ) : requests.map((req) => {
                                        const isPostShare = (req as any).type === "post_share";
                                        
                                        if (isPostShare) {
                                            return (
                                                <motion.div
                                                    key={(req as any).postId}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="p-8 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all"
                                                >
                                                    <div className="flex items-start gap-5 min-w-0 flex-1">
                                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 text-3xl font-bold animate-pulse">
                                                            📢
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-md">
                                                                    Post Share Request
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-400">
                                                                    by {req.displayName}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight mt-1.5 truncate">
                                                                {(req as any).postEventName}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 mt-1 italic">
                                                                &ldquo;Wants to share this post on the club feed&rdquo;
                                                            </p>
                                                            <a 
                                                                href={`/news-feed?post=${(req as any).postId}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5 mt-2.5 bg-primary/5 px-3 py-1.5 rounded-full w-fit hover:bg-primary/10 transition-colors"
                                                            >
                                                                Preview Post <ExternalLink size={10} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 shrink-0">
                                                        <button 
                                                            onClick={() => handleApprovePostShareClick(req as any)} 
                                                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <Check size={18} /> Approve Feed
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRejectPostShareClick(req as any)} 
                                                            className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-[#161620] text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-800 transition-all active:scale-95 border border-gray-100 dark:border-gray-800"
                                                        >
                                                            <X size={18} /> Decline
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        }

                                        return (
                                            <motion.div
                                                key={req.userId}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="p-8 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all"
                                            >
                                                <Link
                                                    href={`/profile/${req.userId}`}
                                                    target="_blank"
                                                    className="flex items-center gap-5 group cursor-pointer"
                                                >
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-sm relative ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                                                        {req.photoURL ? <Image src={req.photoURL} alt={req.displayName} fill className="object-cover" /> : <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl">{req.displayName[0]}</div>}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xl font-black text-gray-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{req.displayName}</p>
                                                            <ExternalLink size={14} className="text-gray-300 group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1">&ldquo;{req.message}&rdquo;</p>
                                                        <p className="text-[10px] font-bold text-primary/60 mt-1.5 uppercase tracking-widest">Click to view profile →</p>
                                                    </div>
                                                </Link>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => handleApproveClick(req)} 
                                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <Check size={18} /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectClick(req)} 
                                                        className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-[#161620] text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-800 transition-all active:scale-95 border border-gray-100 dark:border-gray-800"
                                                    >
                                                        <X size={18} /> Reject
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>


            {/* ═══ Toast Notification ═══ */}
            <ToastNotification
                show={toast.show}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
        </AnimatePresence>
    );
}

function PlusIcon({ size, className }: { size: number; className?: string }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
