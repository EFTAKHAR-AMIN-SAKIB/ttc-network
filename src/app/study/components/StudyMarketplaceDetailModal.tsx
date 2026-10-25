"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, ShoppingBag, Phone, MessageCircle, Copy, Check, 
    MapPin, School, Tag, Sparkles, Share2, Bookmark, CheckCircle2,
    User, ExternalLink, BookOpen, Edit2, Trash2
} from "lucide-react";
import { type FirestoreStudyPost } from "@/lib/firestore";
import SafeAvatar from "@/components/SafeAvatar";
import { useToast } from "@/contexts/ToastContext";

interface StudyMarketplaceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: (FirestoreStudyPost & { id: string }) | null;
    currentUserId?: string;
    isSaved?: boolean;
    onSave?: (id: string) => void;
    onShare?: (post: FirestoreStudyPost & { id: string }) => void;
    onToggleSold?: (id: string, isSold: boolean) => void;
    isAdmin?: boolean;
    onOpenLightbox?: (src: string) => void;
    onEdit?: (post: FirestoreStudyPost & { id: string }) => void;
    onDelete?: (id: string) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function StudyMarketplaceDetailModal({
    isOpen,
    onClose,
    post,
    currentUserId,
    isSaved,
    onSave,
    onShare,
    onToggleSold,
    isAdmin,
    onOpenLightbox,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
}: StudyMarketplaceDetailModalProps) {
    const { showToast } = useToast();
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [isTogglingSold, setIsTogglingSold] = useState(false);

    if (!isOpen || !post) return null;

    const isAuthor = currentUserId === post.authorId;
    const canManageSold = isAuthor || isAdmin;

    const isFree = post.pricingType === "free" || post.price === 0;
    const hasDiscount = !isFree && post.originalPrice && post.price && post.originalPrice > post.price;
    const discountPercent = hasDiscount ? Math.round(((post.originalPrice! - post.price!) / post.originalPrice!) * 100) : 0;
    const savingsAmount = hasDiscount ? post.originalPrice! - post.price! : 0;

    const rawPhone = post.contactPhone || "";
    // Clean phone number for WhatsApp wa.me link
    const cleanPhone = (post.contactWhatsapp || rawPhone).replace(/[^0-9]/g, "");
    const formattedWaPhone = cleanPhone.startsWith("88") 
        ? cleanPhone 
        : cleanPhone.startsWith("0") 
            ? `88${cleanPhone}` 
            : cleanPhone ? `880${cleanPhone}` : "";

    const conditionData = {
        new: { label: "Brand New", desc: "Never used, in perfect original condition", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
        like_new: { label: "Like New", desc: "Minimal signs of use, no marks or highlights", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
        good: { label: "Good Condition", desc: "Normal wear, minor notes or highlights, fully readable", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
        fair: { label: "Acceptable", desc: "Used condition with visible wear, complete pages", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
    }[post.condition || "good"] || { label: "Good Condition", desc: "Normal wear", color: "text-blue-600 bg-blue-50" };

    const waMessage = encodeURIComponent(
        `Assalamu Alaikum ${post.authorName}! I saw your listing for "${post.title}" (${isFree ? "Free" : `৳${post.price}`}) on TTC Connect Study Material Marketplace. Is it still available?`
    );

    const handleCopyPhone = () => {
        if (!rawPhone) return;
        navigator.clipboard.writeText(rawPhone);
        setCopiedPhone(true);
        showToast("Phone number copied to clipboard!", "success");
        setTimeout(() => setCopiedPhone(false), 2500);
    };

    const handleToggleSold = async () => {
        if (!onToggleSold || isTogglingSold) return;
        setIsTogglingSold(true);
        try {
            await onToggleSold(post.id, !post.isSold);
            showToast(post.isSold ? "Listing marked as Available" : "Listing marked as Sold Out!", "success");
        } finally {
            setIsTogglingSold(false);
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return "Recently";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-3xl border-t sm:border border-gray-150 dark:border-gray-800 shadow-2xl flex flex-col h-[92dvh] sm:h-auto max-h-[92dvh] sm:max-h-[88vh] overflow-hidden bg-white dark:bg-[#12141a]"
            >
                {/* Mobile Drawer Grabber */}
                <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ShoppingBag size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                                Study Material Marketplace
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                TTC Student-to-Student Book Exchange
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {onShare && (
                            <button
                                type="button"
                                onClick={() => onShare(post)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                title="Share listing"
                            >
                                <Share2 size={16} />
                            </button>
                        )}
                        {onSave && (
                            <button
                                type="button"
                                onClick={() => onSave(post.id)}
                                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                    isSaved 
                                        ? "text-primary bg-primary/10" 
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                                title={isSaved ? "Saved" : "Save item"}
                            >
                                <Bookmark size={16} className={isSaved ? "fill-primary" : ""} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
                    {/* Media & Price Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                        {/* Photo Display */}
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/30 border border-gray-150 dark:border-gray-800 group/img">
                            {post.thumbnailUrl ? (
                                <>
                                    <img
                                        src={post.thumbnailUrl}
                                        alt={post.title}
                                        className={`w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300 ${
                                            post.isSold ? "grayscale" : ""
                                        }`}
                                        onClick={() => onOpenLightbox?.(post.thumbnailUrl!)}
                                    />
                                    {onOpenLightbox && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenLightbox(post.thumbnailUrl!)}
                                            className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold backdrop-blur-md opacity-90 sm:opacity-0 group-hover/img:opacity-100 transition-all cursor-pointer flex items-center gap-1 shadow-lg"
                                            title="Click to view full photo"
                                        >
                                            <Sparkles size={12} className="text-amber-400" />
                                            <span>Enlarge</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-blue-500/5 to-amber-500/5">
                                    <BookOpen size={36} className="text-primary/70 mb-2" />
                                    <span className="text-xs font-bold text-gray-400">No Photo Attached</span>
                                </div>
                            )}

                            {post.isSold && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 z-10">
                                    <div className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-xl border-2 border-white/30 transform -rotate-6 flex items-center gap-2">
                                        <CheckCircle2 size={16} />
                                        <span>Sold Out (বিক্রি সম্পন্ন)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Price & Primary Details Card */}
                        <div className="space-y-3.5">
                            {/* Price Block */}
                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-gray-200/70 dark:border-gray-800/80 space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                    Selling Price
                                </span>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    {isFree ? (
                                        <span className="text-2xl sm:text-3xl font-black text-emerald-500 flex items-center gap-1.5">
                                            <Sparkles size={20} className="animate-pulse" />
                                            FREE GIFT
                                        </span>
                                    ) : (
                                        <>
                                            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                                                ৳{post.price}
                                            </span>
                                            {post.pricingType === "negotiable" && (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Negotiable
                                                </span>
                                            )}
                                        </>
                                    )}

                                    {hasDiscount && (
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <span className="line-through text-gray-400">৳{post.originalPrice}</span>
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white">
                                                {discountPercent}% OFF
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {hasDiscount && (
                                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        ✨ Save ৳{savingsAmount} compared to original bookstore price!
                                    </p>
                                )}
                            </div>

                            {/* Condition Card */}
                            <div className={`p-3 rounded-xl border text-xs ${conditionData.color} space-y-0.5`}>
                                <div className="flex items-center justify-between font-black uppercase tracking-wider text-[11px]">
                                    <span>Condition: {conditionData.label}</span>
                                </div>
                                <p className="text-[11px] font-normal opacity-90">
                                    {conditionData.desc}
                                </p>
                            </div>

                            {/* Author / Seller Toggle Sold & Actions (for owner) */}
                            {canManageSold && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleSold}
                                        disabled={isTogglingSold}
                                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                                            post.isSold
                                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                                : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-300 dark:border-rose-800"
                                        }`}
                                    >
                                        <CheckCircle2 size={15} />
                                        <span>{post.isSold ? "Reactivate (Available)" : "Mark Sold"}</span>
                                    </button>
                                    {canEdit && onEdit && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onEdit(post);
                                            }}
                                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                                            title="Edit listing"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                    )}
                                    {canDelete && onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onDelete(post.id);
                                            }}
                                            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                            title="Delete listing"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title & Academic Metadata */}
                    <div className="space-y-2">
                        <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white leading-snug">
                            {post.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Programme */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold">
                                <School size={13} />
                                {post.yearRelevance === "BEdHonours" ? "B.Ed Honours" :
                                 post.yearRelevance === "BEdGeneral" ? "B.Ed General" :
                                 post.yearRelevance === "MEd" ? "M.Ed" : "All Programmes"}
                            </span>

                            {/* Category */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold">
                                <Tag size={12} className="text-primary" />
                                {post.itemCategory || post.category || "Study Material"}
                            </span>

                            {/* Edition */}
                            {post.edition && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                                    Edition: {post.edition}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {post.content && (
                        <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-gray-200/60 dark:border-gray-800/60 space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Item Description & Highlights
                            </span>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {post.content}
                            </p>
                        </div>
                    )}

                    {/* Handover & Campus Location */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                        <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block">Handover & Pickup Location</span>
                            <span className="text-blue-700 dark:text-blue-300">
                                {post.location || post.collegeName || "Your College Campus / Hand delivery available"}
                            </span>
                        </div>
                    </div>

                    {/* Seller Profile Card (Click redirects to user profile) */}
                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider px-0.5">
                            <span>Seller / Publisher</span>
                            <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                                View Profile →
                            </span>
                        </div>
                        <Link
                            href={`/profile/${post.authorId}`}
                            className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/5 hover:border-primary/40 hover:shadow-sm flex items-center justify-between gap-3 group/seller transition-all cursor-pointer"
                            title={`View ${post.authorName}'s Profile`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 min-w-[44px] max-w-[44px] h-[44px] max-h-[44px] rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20 group-hover/seller:ring-primary/50 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <SafeAvatar
                                        src={post.authorPhoto}
                                        alt={post.authorName}
                                        sizeClassName="w-full h-full"
                                        textClassName="text-sm font-black"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate group-hover/seller:text-primary transition-colors">
                                            {post.authorName}
                                        </p>
                                        {isAuthor && (
                                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase bg-primary/10 text-primary">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                        {post.collegeName || "TTC Student"} • Listed {formatTimestamp(post.createdAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 size={11} />
                                    Verified
                                </span>
                                <div className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 group-hover/seller:bg-primary group-hover/seller:text-white text-gray-400 transition-all">
                                    <ExternalLink size={14} />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div 
                    className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2.5 sm:gap-3 bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-md shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
                    style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
                >
                    {isAuthor ? (
                        <div className="w-full flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                                    Your Listing ({post.isSold ? "Sold Out" : "Active"})
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={handleToggleSold}
                                    disabled={isTogglingSold}
                                    className={`flex-1 sm:flex-initial py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                        post.isSold
                                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-300 dark:border-rose-800"
                                    }`}
                                >
                                    <CheckCircle2 size={14} />
                                    <span>{post.isSold ? "Mark Available" : "Mark Sold"}</span>
                                </button>
                                {canEdit && onEdit && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            onEdit(post);
                                        }}
                                        className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Edit2 size={13} />
                                        <span>Edit</span>
                                    </button>
                                )}
                                {canDelete && onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            onDelete(post.id);
                                        }}
                                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                        title="Delete listing"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Direct WhatsApp Chat Button */}
                            {cleanPhone ? (
                                <a
                                    href={`https://wa.me/${formattedWaPhone}?text=${waMessage}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
                                >
                                    <MessageCircle size={16} className="fill-white" />
                                    <span>Chat on WhatsApp</span>
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-400 bg-gray-100 dark:bg-white/5 text-center cursor-not-allowed"
                                >
                                    No WhatsApp Available
                                </button>
                            )}

                            {/* Direct Call / Copy Button */}
                            {rawPhone ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                    <a
                                        href={`tel:${rawPhone}`}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-gray-800 dark:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-center cursor-pointer"
                                    >
                                        <Phone size={14} className="text-primary" />
                                        <span>Call Seller</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleCopyPhone}
                                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                        title="Copy number"
                                    >
                                        {copiedPhone ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
