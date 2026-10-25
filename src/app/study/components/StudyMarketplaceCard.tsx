"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CheckCircle2, School, Tag, Sparkles, Bookmark, 
    Edit2, Trash2, MoreVertical, BookOpen, ArrowUpRight
} from "lucide-react";
import { type FirestoreStudyPost } from "@/lib/firestore";
import SafeAvatar from "@/components/SafeAvatar";

interface StudyMarketplaceCardProps {
    post: FirestoreStudyPost & { id: string };
    currentUserId?: string;
    isAdmin?: boolean;
    isSaved?: boolean;
    onSave?: (id: string) => void;
    onShare?: (post: FirestoreStudyPost & { id: string }) => void;
    onEdit?: (post: FirestoreStudyPost & { id: string }) => void;
    onDelete?: (id: string) => void;
    onViewDetails: (post: FirestoreStudyPost & { id: string }) => void;
    onToggleSold?: (id: string, isSold: boolean) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function StudyMarketplaceCard({
    post,
    currentUserId,
    isAdmin,
    isSaved,
    onSave,
    onShare,
    onEdit,
    onDelete,
    onViewDetails,
    onToggleSold,
    canEdit,
    canDelete,
}: StudyMarketplaceCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [togglingSold, setTogglingSold] = useState(false);

    const isAuthor = currentUserId === post.authorId;
    const showOwnerControls = isAuthor || isAdmin;

    const conditionLabel = {
        new: { text: "Brand New", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
        like_new: { text: "Like New", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
        good: { text: "Good", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
        fair: { text: "Acceptable", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    }[post.condition || "good"] || { text: "Good", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };

    const categoryLabels: Record<string, string> = {
        textbook: "Textbook",
        guide: "Guide & Suggestions",
        notes: "Handmade Notes",
        practice: "Teaching Practice",
        tools: "Study Tools",
        other: "Study Material"
    };

    const categoryText = categoryLabels[post.itemCategory || post.category || "textbook"] || post.itemCategory || "Study Material";

    const isFree = post.pricingType === "free" || post.price === 0;
    const hasDiscount = !isFree && post.originalPrice && post.price && post.originalPrice > post.price;
    const discountPercent = hasDiscount ? Math.round(((post.originalPrice! - post.price!) / post.originalPrice!) * 100) : 0;

    const handleSoldToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onToggleSold || togglingSold) return;
        setTogglingSold(true);
        try {
            await onToggleSold(post.id, !post.isSold);
        } finally {
            setTogglingSold(false);
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return "Recently";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div 
            onClick={() => onViewDetails(post)}
            className={`group bg-white dark:bg-[#161822] rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:shadow-xl flex flex-col h-full overflow-hidden cursor-pointer select-none ${
                post.isSold 
                    ? "border-gray-200 dark:border-gray-800 opacity-80" 
                    : "border-gray-200/80 dark:border-gray-800 hover:border-primary/50 shadow-xs"
            }`}
        >
            {/* Top Media Container */}
            <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full bg-slate-100 dark:bg-black/40 overflow-hidden border-b border-gray-100 dark:border-gray-800/80">
                {post.thumbnailUrl ? (
                    <img 
                        src={post.thumbnailUrl} 
                        alt={post.title} 
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            post.isSold ? "grayscale" : ""
                        }`}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-blue-500/5 to-amber-500/5">
                        <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-white/10 shadow-xs flex items-center justify-center text-primary mb-2">
                            <BookOpen size={26} strokeWidth={2.2} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                            {categoryText}
                        </span>
                    </div>
                )}

                {/* Gradient Shadow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Price Pill Badge (Top Left) */}
                <div className="absolute top-3 left-3 flex flex-col items-start gap-1 z-10">
                    {isFree ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                            <Sparkles size={12} className="animate-pulse" />
                            Free Gift
                        </span>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gray-900/90 dark:bg-black/90 text-white backdrop-blur-md shadow-md border border-white/20">
                            <span className="text-emerald-400 font-bold">৳</span>
                            <span className="text-sm tracking-tight">{post.price}</span>
                            {post.pricingType === "negotiable" && (
                                <span className="text-[9px] font-semibold text-gray-300 ml-0.5">
                                    • Neg.
                                </span>
                            )}
                        </div>
                    )}

                    {hasDiscount && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/90 text-white shadow-xs">
                            <span className="line-through opacity-75">৳{post.originalPrice}</span>
                            <span>{discountPercent}% OFF</span>
                        </span>
                    )}
                </div>

                {/* Condition & Status Badges (Top Right) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
                        conditionLabel.color
                    } bg-white/90 dark:bg-black/80 shadow-xs`}>
                        {conditionLabel.text}
                    </span>

                    {/* Bookmark quick button */}
                    {onSave && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSave(post.id);
                            }}
                            className={`p-1.5 rounded-full backdrop-blur-md transition-all shadow-xs ${
                                isSaved 
                                    ? "bg-primary text-white" 
                                    : "bg-white/80 dark:bg-black/70 text-gray-700 dark:text-gray-200 hover:scale-110"
                            }`}
                            title={isSaved ? "Saved" : "Save item"}
                        >
                            <Bookmark size={13} className={isSaved ? "fill-white" : ""} />
                        </button>
                    )}
                </div>

                {/* Bottom Left on Image: Programme pill */}
                <div className="absolute bottom-2.5 left-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/95 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                        <School size={11} className="text-primary shrink-0" />
                        <span className="truncate max-w-[130px]">
                            {post.yearRelevance === "BEdHonours" ? "B.Ed (Hons)" :
                             post.yearRelevance === "BEdGeneral" ? "B.Ed (Gen)" :
                             post.yearRelevance === "MEd" ? "M.Ed" : "All TTCs"}
                        </span>
                    </span>
                </div>

                {/* SOLD OUT Overlay */}
                {post.isSold && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 z-20">
                        <div className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-xl border-2 border-white/30 transform -rotate-6 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            <span>Sold Out • বিক্রি সম্পন্ন</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                    {/* Category Label */}
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <span className="inline-flex items-center gap-1 text-primary">
                            <Tag size={11} />
                            {categoryText}
                        </span>
                        <span>{formatTimestamp(post.createdAt)}</span>
                    </div>

                    {/* Book / Material Title */}
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {post.title}
                    </h3>

                    {/* Edition / Author Details */}
                    {post.edition && (
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 line-clamp-1 flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Edition/Author:</span>
                            <span>{post.edition}</span>
                        </p>
                    )}
                </div>

                {/* Seller & Action Footer */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
                    {/* Seller Profile (Click redirects to user profile) */}
                    <Link
                        href={`/profile/${post.authorId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 min-w-0 group/seller cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                        title={`View ${post.authorName}'s Profile`}
                    >
                        <div className="w-8 h-8 min-w-[32px] max-w-[32px] h-[32px] max-h-[32px] rounded-full overflow-hidden shrink-0 ring-1 ring-gray-200 dark:ring-gray-700 group-hover/seller:ring-2 group-hover/seller:ring-primary/40 transition-all bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <SafeAvatar
                                src={post.authorPhoto}
                                alt={post.authorName}
                                sizeClassName="w-full h-full"
                                textClassName="text-[10px] font-black"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight group-hover/seller:text-primary transition-colors">
                                {post.authorName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                                {post.collegeName || "TTC Student"}
                            </p>
                        </div>
                    </Link>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {showOwnerControls ? (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                                    title="Options"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                <AnimatePresence>
                                    {menuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-1.5 z-30 overflow-hidden"
                                        >
                                            {onToggleSold && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        setMenuOpen(false);
                                                        handleSoldToggle(e);
                                                    }}
                                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/80 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <CheckCircle2 size={14} className={post.isSold ? "text-amber-500" : "text-emerald-500"} />
                                                    <span>{post.isSold ? "Mark as Available" : "Mark as Sold"}</span>
                                                </button>
                                            )}

                                            {canEdit && onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMenuOpen(false);
                                                        onEdit(post);
                                                    }}
                                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/80 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Edit2 size={14} className="text-blue-500" />
                                                    <span>Edit Listing</span>
                                                </button>
                                            )}

                                            {canDelete && onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMenuOpen(false);
                                                        onDelete(post.id);
                                                    }}
                                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Delete</span>
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : null}

                        {/* Direct Buy / Contact Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(post);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white shadow-xs shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <span>Details</span>
                            <ArrowUpRight size={13} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
