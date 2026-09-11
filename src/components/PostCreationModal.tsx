/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    Sparkles, AlertTriangle, Loader2, ImageIcon, School,
    Check, ChevronDown, Building2, ShieldCheck,
    Trash2, ExternalLink, Pencil
} from "lucide-react";
import { createPost, updatePost, getMyClubs, type FirestoreClub } from "@/lib/firestore";
import { uploadFile, deleteFromCloudinary } from "@/lib/storage";
import { colleges } from "@/data/colleges";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useMentionAutosuggest, MentionDropdown } from "@/components/Social/MentionDropdown";

interface PostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    defaultType?: "event" | "club";
    editPost?: any;
    onPostUpdated?: (updatedPost: any) => void;
}

const VISIBILITY_OPTIONS = [
    {
        id: "public" as const,
        label: "Global",
        shortLabel: "Anyone / Global",
        desc: "Visible to all colleges & public feed",
        icon: Globe,
        color: "text-blue-500 dark:text-blue-400",
        badgeStyle: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
    },
    {
        id: "campus" as const,
        label: "Campus",
        shortLabel: "Campus Only",
        desc: "Only students from your college",
        icon: School,
        color: "text-amber-500 dark:text-amber-400",
        badgeStyle: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
    },
    {
        id: "private" as const,
        label: "Private",
        shortLabel: "Only Me",
        desc: "Only visible in your private feed",
        icon: Lock,
        color: "text-rose-500 dark:text-rose-400",
        badgeStyle: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
    }
];

export default function PostCreationModal({ isOpen, onClose, profile, defaultType = "event", editPost, onPostUpdated }: PostCreationModalProps) {
    const [eventName, setEventName] = useState("");
    const [description, setDescription] = useState("");
    const [shareLink, setShareLink] = useState("");
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [visibility, setVisibility] = useState<"public" | "campus" | "private">("public");
    const [isAudienceOpen, setIsAudienceOpen] = useState(false);
    const [type, setType] = useState<"event" | "club">(defaultType);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    const descInputRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const audienceMenuRef = useRef<HTMLDivElement>(null);

    const titleMention = useMentionAutosuggest({
        value: eventName,
        setValue: setEventName,
        inputRef: titleInputRef,
    });

    const descMention = useMentionAutosuggest({
        value: description,
        setValue: setDescription,
        inputRef: descInputRef,
    });

    useEffect(() => {
        if (isOpen) {
            const verified = requireVerification(editPost ? "edit posts" : "share updates");
            if (!verified) {
                onClose();
                return;
            }
            window.dispatchEvent(new CustomEvent("ttc-composer-toggle", { detail: { open: true } }));
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                window.dispatchEvent(new CustomEvent("ttc-composer-toggle", { detail: { open: false } }));
                document.body.style.overflow = originalOverflow;
            };
        } else {
            window.dispatchEvent(new CustomEvent("ttc-composer-toggle", { detail: { open: false } }));
        }
    }, [isOpen, editPost]);

    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [isFetchingLink, setIsFetchingLink] = useState(false);

    const [attachClub, setAttachClub] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState("");
    const [selectedClubName, setSelectedClubName] = useState("");
    const [myClubs, setMyClubs] = useState<(FirestoreClub & {id: string})[]>([]);

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    // Fetch user's clubs
    useEffect(() => {
        if (!profile?.uid || !profile?.collegeId) return;
        getMyClubs(profile.uid, profile.collegeId).then(setMyClubs).catch(console.error);
    }, [profile]);

    // Close audience menu when clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (audienceMenuRef.current && !audienceMenuRef.current.contains(e.target as Node)) {
                setIsAudienceOpen(false);
            }
        };
        if (isAudienceOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isAudienceOpen]);

    // Link preview effect
    useEffect(() => {
        if (!shareLink || !shareLink.startsWith('http')) {
            setLinkPreview(null);
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetchingLink(true);
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(shareLink)}`);
                if (res.ok) {
                    const data = await res.json();
                    setLinkPreview(data);
                }
            } catch (err) {
                console.error("Link preview failed:", err);
            } finally {
                setIsFetchingLink(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [shareLink]);

    // Thumbnail file handler
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be under 5MB", "error");
            return;
        }
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setExistingThumbnailUrl(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    // Reset or populate state when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            setEventName("");
            setDescription("");
            setShareLink("");
            setShowLinkInput(false);
            setVisibility("public");
            setIsAudienceOpen(false);
            setType(defaultType || "event");
            setSelectedClubId("");
            setSelectedClubName("");
            setAttachClub(false);
            setLinkPreview(null);
            setThumbnailFile(null);
            setThumbnailPreview(null);
            setExistingThumbnailUrl(null);
            if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
        } else if (editPost) {
            setEventName(editPost.eventName || editPost.title || "");
            setDescription(editPost.description || editPost.content || "");
            const link = editPost.shareLink || editPost.linkUrl || "";
            setShareLink(link);
            setShowLinkInput(!!link);
            setVisibility(editPost.visibility || "public");
            setType(editPost.type || "event");
            setSelectedClubId(editPost.clubId || "");
            setSelectedClubName(editPost.clubName || "");
            setAttachClub(!!editPost.clubId && editPost.type === "event");
            setLinkPreview(editPost.linkPreview || null);
            setThumbnailFile(null);
            setThumbnailPreview(editPost.thumbnailUrl || null);
            setExistingThumbnailUrl(editPost.thumbnailUrl || null);
            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
        } else {
            if (defaultType) setType(defaultType);
            setExistingThumbnailUrl(null);
            // Autofocus title on desktop after a brief delay
            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, defaultType, editPost]);

    // Handle Cmd/Ctrl + Enter submission
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if ((eventName.trim() || description.trim()) && !isSubmitting) {
                handleSubmit(e as any);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEventName = eventName.trim();
        const trimmedDescription = description.trim();
        if ((!trimmedEventName && !trimmedDescription) || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const hasClub = type === "club" || (type === "event" && attachClub);
            const clubMeta = hasClub && selectedClubId 
                ? { clubId: selectedClubId, clubName: selectedClubName } 
                : { clubId: null, clubName: null };

            const finalTitle = trimmedEventName || (trimmedDescription.length > 60 ? `${trimmedDescription.slice(0, 57)}...` : trimmedDescription);
            const finalDesc = trimmedDescription;

            if (editPost) {
                // EDIT MODE
                let finalThumbnailUrl: string | null = existingThumbnailUrl || null;

                if (thumbnailFile) {
                    const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                    finalThumbnailUrl = resultUrl;
                    if (existingThumbnailUrl && existingThumbnailUrl !== resultUrl) {
                        deleteFromCloudinary(existingThumbnailUrl).catch(console.warn);
                    }
                } else if (!thumbnailPreview && existingThumbnailUrl) {
                    deleteFromCloudinary(existingThumbnailUrl).catch(console.warn);
                    finalThumbnailUrl = null;
                }

                const updatedData: any = {
                    eventName: finalTitle,
                    description: finalDesc,
                    shareLink: shareLink.trim() || "",
                    visibility,
                    type,
                    thumbnailUrl: finalThumbnailUrl,
                    linkPreview: shareLink.trim() ? (linkPreview || null) : null,
                    ...clubMeta
                };

                await updatePost(editPost.id, updatedData);
                showToast("Post updated successfully!", "success");
                onPostUpdated?.({ id: editPost.id, ...updatedData });
                onClose();
            } else {
                // CREATE MODE
                let thumbnailUrl = "";
                if (thumbnailFile) {
                    const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                    thumbnailUrl = resultUrl;
                }

                await createPost({
                    type,
                    eventName: finalTitle,
                    description: finalDesc,
                    ...(shareLink.trim() ? { shareLink: shareLink.trim() } : {}),
                    visibility,
                    ...(linkPreview ? { linkPreview } : {}),
                    collegeId: profile?.collegeId,
                    ...(thumbnailUrl ? { thumbnailUrl } : {}),
                    ...(hasClub && selectedClubId ? { clubId: selectedClubId, clubName: selectedClubName } : {})
                } as any);
                
                // Reset and close
                setEventName("");
                setDescription("");
                setShareLink("");
                removeThumbnail();
                showToast("Update shared successfully!", "success");
                onClose();
            }
        } catch (err) {
            console.error(err);
            showToast(editPost ? "Failed to update post." : "Failed to share update. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const currentVis = VISIBILITY_OPTIONS.find(v => v.id === visibility) || VISIBILITY_OPTIONS[0];
    const VisIcon = currentVis.icon;
    const collegeName = colleges.find(c => c.id === profile?.collegeId)?.name || "Campus Community";
    const userInitials = profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : "U";

    const isNonAdmin = profile?.role !== 'admin' && profile?.role !== 'super_manager' && profile?.role !== 'manager';

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Card - Raised higher on mobile (h-[82dvh] / min-h-[72dvh]) */}
            <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="bg-white dark:bg-[#12141a] w-full sm:max-w-xl md:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border-t sm:border border-gray-150 dark:border-white/10 flex flex-col h-[82dvh] sm:h-auto min-h-[70dvh] sm:min-h-0 max-h-[94dvh] sm:max-h-[88vh] overflow-hidden text-gray-900 dark:text-white"
                onKeyDown={handleKeyDown}
            >
                {/* Mobile Drawer Grabber */}
                <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0" />

                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                                {editPost ? (
                                    <>
                                        <Pencil size={18} className="text-primary" /> Edit Post
                                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-1">
                                            Editing
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-primary" /> Create Update
                                    </>
                                )}
                            </h2>
                        </div>
                    </div>

                    {/* Top Action Button (Primary CTA on mobile ONLY - hidden on desktop) */}
                    <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={(!eventName.trim() && !description.trim()) || isSubmitting}
                        className="sm:hidden flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        {isSubmitting ? (
                            <>
                                <span>{editPost ? "Saving" : "Posting"}</span>
                                <Loader2 size={14} className="animate-spin" />
                            </>
                        ) : (
                            <>
                                <span>{editPost ? "Save" : "Post"}</span>
                                {editPost ? <Check size={14} /> : <Send size={14} />}
                            </>
                        )}
                    </button>
                </div>

                {/* Modal Scrollable Body (flex-1 to naturally fill height) */}
                <div className="flex-1 flex flex-col overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                    {/* Author & Audience Meta Bar */}
                    <div className="flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            {profile?.photoURL ? (
                                <img 
                                    src={profile.photoURL} 
                                    alt={profile.displayName} 
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0" 
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                                    {userInitials}
                                </div>
                            )}

                            {/* Name & Audience Selector */}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {profile?.displayName || "Campus Student"}
                                </p>

                                {/* Audience Selector Dropdown Pill */}
                                <div className="relative inline-block mt-0.5" ref={audienceMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAudienceOpen(!isAudienceOpen)}
                                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${currentVis.badgeStyle}`}
                                    >
                                        <VisIcon size={12} className={currentVis.color} />
                                        <span>{currentVis.shortLabel}</span>
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isAudienceOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Audience Dropdown Menu */}
                                    <AnimatePresence>
                                        {isAudienceOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute left-0 top-full mt-2 w-64 p-2 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 space-y-1"
                                            >
                                                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Choose Audience</p>
                                                </div>
                                                {VISIBILITY_OPTIONS.map((opt) => {
                                                    const OptionIcon = opt.icon;
                                                    const isSelected = visibility === opt.id;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setVisibility(opt.id);
                                                                setIsAudienceOpen(false);
                                                            }}
                                                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                                                                isSelected 
                                                                    ? "bg-primary/10 text-primary" 
                                                                    : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                                                            }`}
                                                        >
                                                            <OptionIcon size={16} className={`mt-0.5 shrink-0 ${opt.color}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold leading-none flex items-center justify-between">
                                                                    <span>{opt.label}</span>
                                                                    {isSelected && <Check size={14} className="text-primary" />}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1 leading-tight">{opt.desc}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Segmented Category Pill (Global vs Club) */}
                        <div className="inline-flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
                            <button
                                type="button"
                                onClick={() => { setType("event"); setSelectedClubId(""); setSelectedClubName(""); setAttachClub(false); }}
                                className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                    type === "event"
                                        ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                Global
                            </button>
                            <button
                                type="button"
                                onClick={() => { setType("club"); setAttachClub(false); }}
                                className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                    type === "club"
                                        ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                Club
                            </button>
                        </div>
                    </div>

                    {/* Club Selector Bar (Smooth expansion when club type is active or attached) */}
                    <AnimatePresence>
                        {(type === 'club' || (type === 'event' && attachClub)) && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden shrink-0"
                            >
                                <div className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                            <Building2 size={13} className="text-primary" /> Associated Club
                                        </span>
                                        {type === 'event' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAttachClub(false);
                                                    setSelectedClubId("");
                                                    setSelectedClubName("");
                                                }}
                                                className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase"
                                            >
                                                Detach
                                            </button>
                                        )}
                                    </div>
                                    <select 
                                        required
                                        value={selectedClubId}
                                        onChange={(e) => {
                                            setSelectedClubId(e.target.value);
                                            setSelectedClubName(e.target.options[e.target.selectedIndex].text);
                                        }}
                                        className="w-full bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all dark:text-white"
                                    >
                                        <option value="" disabled>Select your club...</option>
                                        {myClubs.map(club => (
                                            <option key={club.id} value={club.id}>{club.name}</option>
                                        ))}
                                    </select>
                                    {myClubs.length === 0 && (
                                        <p className="text-[10px] text-amber-500 font-semibold">
                                            You haven&apos;t joined any clubs yet. Join a club first to post updates for it.
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Headline / Title Input with Mention Support */}
                    <div className="relative shrink-0 z-20">
                        <MentionDropdown
                            isOpen={titleMention.isOpen}
                            query={titleMention.query}
                            suggestions={titleMention.suggestions}
                            selectedIndex={titleMention.selectedIndex}
                            setSelectedIndex={titleMention.setSelectedIndex}
                            onSelect={titleMention.insertMention}
                            onClose={() => titleMention.setIsOpen(false)}
                            position="bottom"
                        />
                        <input 
                            ref={titleInputRef}
                            type="text"
                            value={eventName}
                            onChange={(e) => {
                                setEventName(e.target.value);
                                titleMention.checkMention();
                            }}
                            onKeyUp={(e) => {
                                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Tab') {
                                    titleMention.checkMention();
                                }
                            }}
                            onClick={() => titleMention.checkMention()}
                            onFocus={() => titleMention.checkMention()}
                            onBlur={() => {
                                setTimeout(() => titleMention.setIsOpen(false), 200);
                            }}
                            onKeyDown={(e) => {
                                if (titleMention.isOpen && titleMention.handleKeyDown(e)) {
                                    return;
                                }
                                handleKeyDown(e);
                            }}
                            placeholder="What's the highlight? (Title / Event name)"
                            className="w-full bg-transparent text-base sm:text-lg font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border-b border-gray-100 dark:border-white/5 pb-2 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {/* Description Textarea with Mention Support (Flex-1 to provide generous typing height) */}
                    <div className="relative flex-1 flex flex-col min-h-[140px] sm:min-h-[110px] z-10">
                        <MentionDropdown
                            isOpen={descMention.isOpen}
                            query={descMention.query}
                            suggestions={descMention.suggestions}
                            selectedIndex={descMention.selectedIndex}
                            setSelectedIndex={descMention.setSelectedIndex}
                            onSelect={descMention.insertMention}
                            onClose={() => descMention.setIsOpen(false)}
                            position="top"
                        />
                        <textarea 
                            ref={descInputRef}
                            rows={5}
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                descMention.checkMention();
                            }}
                            onKeyUp={(e) => {
                                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Tab') {
                                    descMention.checkMention();
                                }
                            }}
                            onClick={() => descMention.checkMention()}
                            onFocus={() => descMention.checkMention()}
                            onBlur={() => {
                                setTimeout(() => descMention.setIsOpen(false), 200);
                            }}
                            onKeyDown={(e) => {
                                if (descMention.isOpen && descMention.handleKeyDown(e)) {
                                    return;
                                }
                                handleKeyDown(e);
                            }}
                            placeholder="Share what's happening... Use @mentions or #hashtags to connect with students"
                            className="w-full flex-1 bg-transparent text-sm sm:text-base font-normal text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none resize-none leading-relaxed min-h-[130px]"
                        />
                    </div>

                    {/* Photo / Image Preview Card */}
                    <AnimatePresence>
                        {thumbnailPreview && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 group max-h-64 sm:max-h-80 bg-black/5 shrink-0"
                            >
                                <img 
                                    src={thumbnailPreview} 
                                    alt="Post attachment" 
                                    className="w-full h-auto max-h-64 sm:max-h-80 object-cover"
                                />
                                
                                {/* Overlay Top Controls */}
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-md active:scale-95"
                                        title="Remove photo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {thumbnailFile && (
                                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[10px] font-semibold">
                                        {(thumbnailFile.size / (1024 * 1024)).toFixed(1)} MB
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Link Input Row (Expandable) */}
                    <AnimatePresence>
                        {showLinkInput && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden shrink-0"
                            >
                                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl">
                                    <LinkIcon size={16} className="text-gray-400 shrink-0" />
                                    <input 
                                        type="url"
                                        value={shareLink}
                                        onChange={(e) => setShareLink(e.target.value)}
                                        placeholder="Paste a link (e.g. https://...)"
                                        className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                                    />
                                    {isFetchingLink && (
                                        <Loader2 size={16} className="text-primary animate-spin shrink-0" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShareLink("");
                                            setShowLinkInput(false);
                                            setLinkPreview(null);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Rich Link Preview Card */}
                    <AnimatePresence>
                        {linkPreview && (
                            <motion.div 
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-gray-200 dark:border-white/10 flex items-center gap-3 overflow-hidden group shrink-0"
                            >
                                {linkPreview.thumbnail && (
                                    <img 
                                        src={linkPreview.thumbnail} 
                                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-200 dark:bg-gray-800" 
                                        alt="" 
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{linkPreview.title}</h4>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                        <ExternalLink size={10} /> {linkPreview.domain}
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShareLink("");
                                        setLinkPreview(null);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                    title="Remove link"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hidden File Input for Thumbnail */}
                <input 
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="post-thumbnail-file-input"
                />

                {/* Bottom Native Action Toolbar (pb-6 for safe-area padding) */}
                <div className="border-t border-gray-100 dark:border-white/5 px-4 sm:px-6 pt-3 pb-6 sm:pb-3.5 bg-gray-50/70 dark:bg-white/[0.02] shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        {/* Media Action Buttons */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Photo / Image Button */}
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    thumbnailPreview 
                                        ? "bg-primary/10 text-primary border border-primary/20" 
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                                title="Attach photo"
                            >
                                <ImageIcon size={18} className={thumbnailPreview ? "text-primary" : "text-primary/80"} />
                                <span className="hidden sm:inline">Photo</span>
                            </button>

                            {/* Link Attachment Button */}
                            <button
                                type="button"
                                onClick={() => setShowLinkInput(!showLinkInput)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    showLinkInput || shareLink
                                        ? "bg-primary/10 text-primary border border-primary/20" 
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                                title="Attach link"
                            >
                                <LinkIcon size={18} className={shareLink ? "text-primary" : "text-blue-500"} />
                                <span className="hidden sm:inline">Link</span>
                            </button>

                            {/* Club Attachment Button (if not already club update) */}
                            {type === 'event' && myClubs.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newAttach = !attachClub;
                                        setAttachClub(newAttach);
                                        if (!newAttach) {
                                            setSelectedClubId("");
                                            setSelectedClubName("");
                                        }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                        attachClub 
                                            ? "bg-primary text-white shadow-sm" 
                                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                    title="Arrange with a club"
                                >
                                    <Building2 size={18} className={attachClub ? "text-white" : "text-amber-500"} />
                                    <span className="hidden sm:inline">Club Tag</span>
                                </button>
                            )}
                        </div>

                        {/* Right: Keyboard Shortcut Hint on Desktop & Char / Action */}
                        <div className="flex items-center gap-3">
                            <span className="hidden md:inline text-[11px] text-gray-400 font-medium">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-150 dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-150 dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">Enter</kbd> to {editPost ? "save" : "post"}
                            </span>

                            {/* Share button on bottom (visible on desktop) */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={(!eventName.trim() && !description.trim()) || isSubmitting}
                                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span>{editPost ? "Saving Changes..." : "Posting..."}</span>
                                        <Loader2 size={14} className="animate-spin" />
                                    </>
                                ) : (
                                    <>
                                        <span>{editPost ? "Save Changes" : "Post"}</span>
                                        {editPost ? <Check size={14} /> : <Send size={14} />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Moderation Advisory Note */}
                    {isNonAdmin && (
                        <div className="mt-2 pt-2 border-t border-gray-150/60 dark:border-white/5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-400">
                            <ShieldCheck size={14} className="text-primary shrink-0" />
                            <span className="truncate">
                                {visibility === 'private' 
                                    ? "Private post: Only you will be able to see this update." 
                                    : visibility === 'campus'
                                        ? "Campus update: Reviewed by campus moderators before going live."
                                        : "Global update: Reviewed by community moderators before going live."
                                }
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
