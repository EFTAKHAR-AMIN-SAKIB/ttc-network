/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    Sparkles, AlertTriangle, Loader2, ImageIcon, School,
    Check, ChevronDown, Building2, ShieldCheck,
    Trash2, ExternalLink, Pencil, Calendar, BarChart2,
    Clock, MapPin, Plus, Video, Ticket, Tag, CheckSquare,
    Radio, Info
} from "lucide-react";
import { 
    createPost, updatePost, getMyClubs, 
    type FirestoreClub, type EventDetails, type PollDetails 
} from "@/lib/firestore";
import { uploadFile, deleteFromCloudinary } from "@/lib/storage";
import { colleges } from "@/data/colleges";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";
import { useMentionAutosuggest, MentionDropdown } from "@/components/Social/MentionDropdown";
import { formatExternalUrl } from "@/lib/url-utils";

export type ComposerMode = "post" | "event" | "poll";

interface PostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    defaultType?: "event" | "club";
    initialMode?: ComposerMode;
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

export const PRESET_EVENT_BANNERS = [
    {
        id: "tech",
        title: "Tech & Innovation",
        category: "Tech",
        url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80"
    },
    {
        id: "academic",
        title: "Seminar & Lecture",
        category: "Academic",
        url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80"
    },
    {
        id: "sports",
        title: "Sports & Athletics",
        category: "Sports",
        url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80"
    },
    {
        id: "cultural",
        title: "Cultural & Arts",
        category: "Cultural",
        url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80"
    },
    {
        id: "social",
        title: "Social & Charity",
        category: "Social",
        url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&auto=format&fit=crop&q=80"
    },
    {
        id: "career",
        title: "Career & Networking",
        category: "Career",
        url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80"
    }
];

export const EVENT_CATEGORIES = [
    { id: "Academic", label: "Academic / Seminar", icon: "🎓" },
    { id: "Tech", label: "Tech & Workshop", icon: "💻" },
    { id: "Sports", label: "Sports & Tournament", icon: "🏆" },
    { id: "Cultural", label: "Cultural & Arts", icon: "🎭" },
    { id: "Social", label: "Social & Charity", icon: "🩸" },
    { id: "Career", label: "Career & Job Fair", icon: "💼" },
    { id: "Meetup", label: "Campus Meetup", icon: "🤝" },
    { id: "Other", label: "Announcement", icon: "📣" }
];

export const POLL_DURATIONS = [
    { id: "1_day", label: "1 Day", hours: 24 },
    { id: "3_days", label: "3 Days", hours: 72 },
    { id: "7_days", label: "1 Week", hours: 168 },
    { id: "14_days", label: "2 Weeks", hours: 336 },
    { id: "no_limit", label: "No Deadline", hours: 0 }
];

function getDefaultDateTime(hoursFromNow: number = 24): string {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0);
    d.setSeconds(0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function PostCreationModal({ 
    isOpen, 
    onClose, 
    profile, 
    defaultType = "event", 
    initialMode = "post", 
    editPost, 
    onPostUpdated 
}: PostCreationModalProps) {
    const [mode, setMode] = useState<ComposerMode>(initialMode);
    const [eventName, setEventName] = useState("");
    const [description, setDescription] = useState("");
    const [shareLink, setShareLink] = useState("");
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [visibility, setVisibility] = useState<"public" | "campus" | "private">("public");
    const [isAudienceOpen, setIsAudienceOpen] = useState(false);
    const [type, setType] = useState<"event" | "club">(defaultType);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Event specific fields
    const [eventCategory, setEventCategory] = useState<string>("Academic");
    const [eventFormat, setEventFormat] = useState<"in_person" | "online" | "hybrid">("in_person");
    const [eventLocation, setEventLocation] = useState("");
    const [eventOnlineLink, setEventOnlineLink] = useState("");
    const [eventStartDate, setEventStartDate] = useState(getDefaultDateTime(24));
    const [eventEndDate, setEventEndDate] = useState(getDefaultDateTime(30));
    const [eventRegLink, setEventRegLink] = useState("");
    const [eventEntryFee, setEventEntryFee] = useState("");
    const [selectedPresetBanner, setSelectedPresetBanner] = useState<string | null>(null);

    // Poll specific fields
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
    const [pollDuration, setPollDuration] = useState<string>("3_days");
    const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);
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
        const formattedUrl = formatExternalUrl(shareLink);
        if (!formattedUrl || !formattedUrl.startsWith('http')) {
            setLinkPreview(null);
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetchingLink(true);
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(formattedUrl)}`);
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
        setSelectedPresetBanner(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    const handleSelectPresetBanner = (presetUrl: string) => {
        setThumbnailFile(null);
        setExistingThumbnailUrl(null);
        setSelectedPresetBanner(presetUrl);
        setThumbnailPreview(presetUrl);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    // Poll options helpers
    const handleAddPollOption = () => {
        if (pollOptions.length < 6) {
            setPollOptions(prev => [...prev, ""]);
        }
    };

    const handleRemovePollOption = (idx: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(prev => prev.filter((_, i) => i !== idx));
        }
    };

    const handlePollOptionChange = (idx: number, val: string) => {
        setPollOptions(prev => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
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
            setSelectedPresetBanner(null);
            setMode(initialMode || "post");
            setEventCategory("Academic");
            setEventFormat("in_person");
            setEventLocation("");
            setEventOnlineLink("");
            setEventStartDate(getDefaultDateTime(24));
            setEventEndDate(getDefaultDateTime(30));
            setEventRegLink("");
            setEventEntryFee("");
            setPollQuestion("");
            setPollOptions(["", ""]);
            setPollDuration("3_days");
            setPollAllowsMultiple(false);
            if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
        } else if (editPost) {
            const postMode: ComposerMode = 
                editPost.postType ? editPost.postType :
                editPost.poll ? "poll" :
                editPost.eventDetails ? "event" : "post";
            setMode(postMode);

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

            // Populate event details if present
            if (editPost.eventDetails) {
                const ed = editPost.eventDetails;
                setEventCategory(ed.category || "Academic");
                setEventFormat(ed.isOnline && ed.location !== "Online" ? "hybrid" : ed.isOnline ? "online" : "in_person");
                setEventLocation(ed.location || "");
                setEventOnlineLink(ed.onlineLink || "");
                setEventStartDate(ed.startDate || getDefaultDateTime(24));
                setEventEndDate(ed.endDate || getDefaultDateTime(30));
                setEventRegLink(ed.registrationLink || "");
                setEventEntryFee(ed.entryFee || "");
            }

            // Populate poll details if present
            if (editPost.poll) {
                const p = editPost.poll;
                setPollQuestion(p.question || editPost.eventName || "");
                setPollOptions(Array.isArray(p.options) && p.options.length >= 2 ? p.options.map((o: any) => o.text) : ["", ""]);
                setPollAllowsMultiple(!!p.allowsMultiple);
            }

            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
        } else {
            setMode(initialMode || "post");
            if (defaultType) setType(defaultType);
            setExistingThumbnailUrl(null);
            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, defaultType, initialMode, editPost]);

    // Form validity check
    const isFormValid = (): boolean => {
        if (isSubmitting) return false;
        if (mode === "post") {
            return !!(eventName.trim() || description.trim());
        }
        if (mode === "event") {
            return !!(eventName.trim() && eventStartDate);
        }
        if (mode === "poll") {
            const filledOptions = pollOptions.filter(o => o.trim().length > 0);
            return !!(pollQuestion.trim() && filledOptions.length >= 2);
        }
        return false;
    };

    // Handle Cmd/Ctrl + Enter submission
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if (isFormValid()) {
                handleSubmit(e as any);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;

        setIsSubmitting(true);
        try {
            const hasClub = type === "club" || (type === "event" && attachClub);
            const clubMeta = hasClub && selectedClubId 
                ? { clubId: selectedClubId, clubName: selectedClubName } 
                : { clubId: null, clubName: null };

            let finalThumbnailUrl: string | null = selectedPresetBanner || existingThumbnailUrl || null;
            if (thumbnailFile) {
                const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                finalThumbnailUrl = resultUrl;
                if (existingThumbnailUrl && existingThumbnailUrl !== resultUrl && !existingThumbnailUrl.includes("unsplash.com")) {
                    deleteFromCloudinary(existingThumbnailUrl).catch(console.warn);
                }
            } else if (!thumbnailPreview && existingThumbnailUrl && !existingThumbnailUrl.includes("unsplash.com")) {
                deleteFromCloudinary(existingThumbnailUrl).catch(console.warn);
                finalThumbnailUrl = null;
            }

            let postTypePayload: Partial<any> = {};

            if (mode === "post") {
                const trimmedTitle = eventName.trim();
                const trimmedDesc = description.trim();
                const finalTitle = trimmedTitle || (trimmedDesc.length > 60 ? `${trimmedDesc.slice(0, 57)}...` : trimmedDesc);
                const normalizedShareLink = shareLink.trim() ? formatExternalUrl(shareLink) : "";

                postTypePayload = {
                    postType: "post",
                    eventName: finalTitle,
                    description: trimmedDesc,
                    thumbnailUrl: finalThumbnailUrl || "",
                    shareLink: normalizedShareLink,
                    linkPreview: normalizedShareLink ? (linkPreview || null) : null,
                };
            } else if (mode === "event") {
                const isOnlineMode = eventFormat === "online" || eventFormat === "hybrid";
                const locationString = eventFormat === "online" ? "Online" : eventLocation.trim() || "Campus";
                const normalizedRegLink = eventRegLink.trim() ? formatExternalUrl(eventRegLink) : undefined;
                const normalizedOnlineLink = (isOnlineMode && eventOnlineLink.trim()) ? formatExternalUrl(eventOnlineLink) : "";
                const normalizedShareLink = shareLink.trim() ? formatExternalUrl(shareLink) : "";

                const eventDetails: EventDetails = {
                    startDate: eventStartDate,
                    endDate: eventEndDate.trim() || undefined,
                    location: locationString,
                    isOnline: isOnlineMode,
                    onlineLink: normalizedOnlineLink,
                    category: eventCategory,
                    registrationLink: normalizedRegLink,
                    entryFee: eventEntryFee.trim() || undefined,
                    going: editPost?.eventDetails?.going || [],
                    interested: editPost?.eventDetails?.interested || [],
                };

                postTypePayload = {
                    postType: "event",
                    eventName: eventName.trim(),
                    description: description.trim(),
                    thumbnailUrl: finalThumbnailUrl || "",
                    shareLink: normalizedRegLink || normalizedShareLink,
                    eventDetails,
                };
            } else if (mode === "poll") {
                const durationObj = POLL_DURATIONS.find(d => d.id === pollDuration) || POLL_DURATIONS[1];
                let expiresAt: any = null;
                if (durationObj.hours > 0) {
                    const expMs = Date.now() + durationObj.hours * 3600 * 1000;
                    expiresAt = new Date(expMs);
                }

                const validOptions = pollOptions
                    .map((opt, idx) => ({
                        id: `opt_${idx + 1}`,
                        text: opt.trim(),
                        votes: editPost?.poll?.options?.[idx]?.votes || []
                    }))
                    .filter(o => o.text.length > 0);

                const pollDetails: PollDetails = {
                    question: pollQuestion.trim(),
                    options: validOptions,
                    allowsMultiple: pollAllowsMultiple,
                    expiresAt: expiresAt,
                    createdAt: editPost?.poll?.createdAt || new Date(),
                    totalVotes: editPost?.poll?.totalVotes || 0,
                };

                postTypePayload = {
                    postType: "poll",
                    eventName: pollQuestion.trim(),
                    description: description.trim(),
                    thumbnailUrl: finalThumbnailUrl || "",
                    poll: pollDetails,
                };
            }

            if (editPost) {
                // EDIT MODE
                const updatedData: any = {
                    ...postTypePayload,
                    visibility,
                    type,
                    ...clubMeta
                };

                await updatePost(editPost.id, updatedData);
                showToast("Post updated successfully!", "success");
                onPostUpdated?.({ id: editPost.id, ...updatedData });
                onClose();
            } else {
                // CREATE MODE
                await createPost({
                    type,
                    collegeId: profile?.collegeId,
                    visibility,
                    ...postTypePayload,
                    ...(hasClub && selectedClubId ? { clubId: selectedClubId, clubName: selectedClubName } : {})
                } as any);
                
                showToast(
                    mode === "event" ? (type === "club" ? "Club event published successfully!" : "Campus event published successfully!") :
                    mode === "poll" ? (type === "club" ? "Club poll created successfully!" : "Campus poll created successfully!") :
                    (type === "club" ? "Club update shared successfully!" : "Update shared successfully!"), 
                    "success"
                );
                onClose();
            }
        } catch (err) {
            console.error("Submit post error:", err);
            showToast(editPost ? "Failed to update post." : "Failed to share post. Please try again.", "error");
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
                                        <Pencil size={18} className="text-primary" /> Edit {mode === "event" ? "Event" : mode === "poll" ? "Poll" : "Post"}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-primary" /> 
                                        <span>
                                            {mode === "event" 
                                                ? (type === "club" ? "Organize Club Event" : "Organize Campus Event") 
                                                : mode === "poll" 
                                                    ? (type === "club" ? "Create Club Poll" : "Create Campus Poll") 
                                                    : (type === "club" ? "Create Club Post" : "Create Post")}
                                        </span>
                                    </>
                                )}
                            </h2>
                        </div>
                    </div>

                    {/* Top Action Button (Mobile Only) */}
                    <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isFormValid()}
                        className="sm:hidden flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

                {/* ─── Mode Switcher Bar ─── */}
                {!editPost && (
                    <div className="px-5 sm:px-6 pt-3 pb-1 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] shrink-0">
                        <div className="flex items-center gap-1 p-1 bg-gray-150/70 dark:bg-white/[0.05] rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setMode("post")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    mode === "post"
                                        ? "bg-white dark:bg-[#1a1b24] text-primary shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                <Sparkles size={14} className={mode === "post" ? "text-primary" : "text-gray-400"} />
                                <span>{type === "club" ? "Club Post" : "Regular Post"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("event")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    mode === "event"
                                        ? "bg-white dark:bg-[#1a1b24] text-blue-500 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                <Calendar size={14} className={mode === "event" ? "text-blue-500" : "text-blue-400/80"} />
                                <span>{type === "club" ? "Club Event" : "Campus Event"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("poll")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    mode === "poll"
                                        ? "bg-white dark:bg-[#1a1b24] text-violet-500 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                <BarChart2 size={14} className={mode === "poll" ? "text-violet-500" : "text-violet-400/80"} />
                                <span>{type === "club" ? "Club Poll" : "Poll"}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Scrollable Body */}
                <div className="flex-1 flex flex-col overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                    {/* Author & Audience Meta Bar */}
                    <div className="flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
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

                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {profile?.displayName || "Campus Student"}
                                </p>

                                <div className="relative inline-block mt-0.5" ref={audienceMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAudienceOpen(!isAudienceOpen)}
                                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${currentVis.badgeStyle}`}
                                    >
                                        <VisIcon size={12} className={currentVis.color} />
                                        <span>{currentVis.shortLabel}</span>
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isAudienceOpen ? "rotate-180" : ""}`} />
                                    </button>

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
                                                            className={`w-full text-left p-2.5 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                                                                isSelected 
                                                                    ? "bg-primary/10 text-primary dark:text-white" 
                                                                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
                                                            }`}
                                                        >
                                                            <OptionIcon size={16} className={`mt-0.5 shrink-0 ${opt.color}`} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold leading-tight">{opt.label}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{opt.desc}</p>
                                                            </div>
                                                            {isSelected && <Check size={14} className="text-primary mt-0.5 shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Associated Club Pill if active */}
                        {myClubs.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setAttachClub(!attachClub)}
                                className={`text-[11px] font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    attachClub || type === "club"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                        : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-amber-500"
                                }`}
                                title="Tag an associated club"
                            >
                                <Building2 size={12} />
                                <span>{selectedClubName ? selectedClubName.slice(0, 14) + "..." : "Club"}</span>
                            </button>
                        )}
                    </div>

                    {/* Club Selector Row */}
                    <AnimatePresence>
                        {(attachClub || type === "club") && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: "auto", opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden shrink-0"
                            >
                                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                            <Building2 size={13} /> Associated Club
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachClub(false);
                                                setSelectedClubId("");
                                                setSelectedClubName("");
                                            }}
                                            className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase cursor-pointer"
                                        >
                                            Remove Tag
                                        </button>
                                    </div>
                                    <select 
                                        value={selectedClubId}
                                        onChange={(e) => {
                                            setSelectedClubId(e.target.value);
                                            setSelectedClubName(e.target.options[e.target.selectedIndex].text);
                                        }}
                                        className="w-full bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all dark:text-white"
                                    >
                                        <option value="" disabled>Select your club...</option>
                                        {myClubs.map(club => (
                                            <option key={club.id} value={club.id}>{club.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ════════════════════════════════════════════════
                        MODE 1: REGULAR POST
                       ════════════════════════════════════════════════ */}
                    {mode === "post" && (
                        <>
                            {/* Headline / Title Input */}
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
                                    placeholder="What's the highlight? (Optional title / headline)"
                                    className="w-full bg-transparent text-base sm:text-lg font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border-b border-gray-100 dark:border-white/5 pb-2 focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            {/* Description Textarea */}
                            <div className="relative flex-1 flex flex-col min-h-[140px] z-10">
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
                                    placeholder="Share what's happening on campus... Use @mentions or #hashtags to connect with students"
                                    className="w-full flex-1 bg-transparent text-sm sm:text-base font-normal text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none resize-none leading-relaxed min-h-[120px]"
                                />
                            </div>
                        </>
                    )}

                    {/* ════════════════════════════════════════════════
                        MODE 2: FACEBOOK-STYLE CAMPUS EVENT
                       ════════════════════════════════════════════════ */}
                    {mode === "event" && (
                        <div className="space-y-4">
                            {/* Event Title */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-blue-500" /> Event Name / Title *
                                </label>
                                <input 
                                    ref={titleInputRef}
                                    type="text"
                                    required
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder="e.g. TTC Annual Tech Fest 2026, Blood Donation Camp..."
                                    className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            {/* Category & Format Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Category Dropdown */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <Tag size={13} className="text-primary" /> Category
                                    </label>
                                    <select 
                                        value={eventCategory}
                                        onChange={(e) => setEventCategory(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all text-gray-800 dark:text-gray-200"
                                    >
                                        {EVENT_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Format Toggle (In-Person / Online / Hybrid) */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <MapPin size={13} className="text-emerald-500" /> Event Format
                                    </label>
                                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setEventFormat("in_person")}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                eventFormat === "in_person" 
                                                    ? "bg-white dark:bg-[#1a1b24] text-emerald-600 shadow-xs" 
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            In-Person
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEventFormat("online")}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                eventFormat === "online" 
                                                    ? "bg-white dark:bg-[#1a1b24] text-blue-600 shadow-xs" 
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            Online
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEventFormat("hybrid")}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                eventFormat === "hybrid" 
                                                    ? "bg-white dark:bg-[#1a1b24] text-purple-600 shadow-xs" 
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            Hybrid
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Venue / Location or Meeting URL */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(eventFormat === "in_person" || eventFormat === "hybrid") && (
                                    <div className={eventFormat === "hybrid" ? "col-span-1" : "col-span-2"}>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                            <MapPin size={13} className="text-red-500" /> Venue / Room Location *
                                        </label>
                                        <input 
                                            type="text"
                                            value={eventLocation}
                                            onChange={(e) => setEventLocation(e.target.value)}
                                            placeholder="e.g. Auditorium Hall, Ground Floor, Central Field"
                                            className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                )}

                                {(eventFormat === "online" || eventFormat === "hybrid") && (
                                    <div className={eventFormat === "hybrid" ? "col-span-1" : "col-span-2"}>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                            <Video size={13} className="text-blue-500" /> Online Meeting URL
                                        </label>
                                        <input 
                                            type="text"
                                            value={eventOnlineLink}
                                            onChange={(e) => setEventOnlineLink(e.target.value)}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val && !/^https?:\/\//i.test(val)) {
                                                    setEventOnlineLink(formatExternalUrl(val));
                                                }
                                            }}
                                            placeholder="e.g. Google Meet, Zoom, YouTube Live URL"
                                            className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all placeholder:text-gray-400"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Date & Time Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <Clock size={13} className="text-emerald-500" /> Start Date & Time *
                                    </label>
                                    <input 
                                        type="datetime-local"
                                        required
                                        value={eventStartDate}
                                        onChange={(e) => setEventStartDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-bold outline-none transition-all text-gray-800 dark:text-gray-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <Clock size={13} className="text-amber-500" /> End Date & Time (Optional)
                                    </label>
                                    <input 
                                        type="datetime-local"
                                        value={eventEndDate}
                                        onChange={(e) => setEventEndDate(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-bold outline-none transition-all text-gray-800 dark:text-gray-200"
                                    />
                                </div>
                            </div>

                            {/* Event Description & Agenda */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-primary" /> Event Details, Schedule & Rules
                                </label>
                                <textarea 
                                    ref={descInputRef}
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Write a clear overview of the event, itinerary, guest speakers, eligibility, and rules..."
                                    className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-normal outline-none transition-all placeholder:text-gray-400 resize-none min-h-[90px]"
                                />
                            </div>

                            {/* Preset Cover Banners Quick Selector */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <ImageIcon size={13} className="text-blue-500" /> Event Cover Banner (16:9)
                                    </label>
                                    <span className="text-[10px] text-gray-400 font-semibold">Click a preset or upload custom</span>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {PRESET_EVENT_BANNERS.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => handleSelectPresetBanner(b.url)}
                                            className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                                                selectedPresetBanner === b.url || thumbnailPreview === b.url
                                                    ? "border-blue-500 ring-2 ring-blue-500/30 scale-95"
                                                    : "border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100"
                                            }`}
                                        >
                                            <img src={b.url} alt={b.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                                                <span className="text-[8px] font-black text-white truncate leading-tight">{b.title}</span>
                                            </div>
                                            {(selectedPresetBanner === b.url || thumbnailPreview === b.url) && (
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                                    <Check size={10} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Registration Link & Fee */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                                        <Ticket size={13} className="text-violet-500" /> Registration / Google Form Link
                                    </label>
                                    <input 
                                        type="text"
                                        value={eventRegLink}
                                        onChange={(e) => setEventRegLink(e.target.value)}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            if (val && !/^https?:\/\//i.test(val)) {
                                                setEventRegLink(formatExternalUrl(val));
                                            }
                                        }}
                                        placeholder="https://forms.gle/... or website.com"
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs font-bold outline-none transition-all placeholder:text-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                                        <Info size={13} className="text-gray-400" /> Entry Details / Cost
                                    </label>
                                    <input 
                                        type="text"
                                        value={eventEntryFee}
                                        onChange={(e) => setEventEntryFee(e.target.value)}
                                        placeholder="e.g. Free for Students, Free Entry"
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2 text-xs font-bold outline-none transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════
                        MODE 3: INTERACTIVE CAMPUS POLL
                       ════════════════════════════════════════════════ */}
                    {mode === "poll" && (
                        <div className="space-y-4">
                            {/* Poll Question */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                    <BarChart2 size={13} className="text-violet-500" /> Poll Question *
                                </label>
                                <input 
                                    ref={titleInputRef}
                                    type="text"
                                    required
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    placeholder="Ask a question or start a campus debate..."
                                    className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            {/* Poll Options List */}
                            <div className="space-y-2.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Radio size={13} className="text-primary" /> Poll Options (Min 2, Max 6)
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-semibold">{pollOptions.length}/6 options</span>
                                </label>

                                {pollOptions.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <input 
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                                            placeholder={`Option ${idx + 1}...`}
                                            className="flex-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                        {pollOptions.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePollOption(idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                                title="Delete option"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {pollOptions.length < 6 && (
                                    <button
                                        type="button"
                                        onClick={handleAddPollOption}
                                        className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-primary/40 text-gray-500 dark:text-gray-400 hover:text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Plus size={14} /> Add Option
                                    </button>
                                )}
                            </div>

                            {/* Poll Settings Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {/* Poll Duration */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <Clock size={13} className="text-amber-500" /> Poll Duration
                                    </label>
                                    <select 
                                        value={pollDuration}
                                        onChange={(e) => setPollDuration(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all text-gray-800 dark:text-gray-200"
                                    >
                                        {POLL_DURATIONS.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Multiple Choices Checkbox */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                                        <CheckSquare size={13} className="text-violet-500" /> Voting Mode
                                    </label>
                                    <label className="flex items-center gap-2.5 p-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={pollAllowsMultiple}
                                            onChange={(e) => setPollAllowsMultiple(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                            Allow multiple choices
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Additional Context Description */}
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-primary" /> Context / Background Note (Optional)
                                </label>
                                <textarea 
                                    ref={descInputRef}
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add any extra background context or instructions for voters..."
                                    className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-primary rounded-xl px-3.5 py-2 text-xs sm:text-sm font-normal outline-none transition-all placeholder:text-gray-400 resize-none min-h-[60px]"
                                />
                            </div>
                        </div>
                    )}

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
                                
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
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

                    {/* Link Input Row (Expandable for Regular Post) */}
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
                                        type="text"
                                        value={shareLink}
                                        onChange={(e) => setShareLink(e.target.value)}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            if (val && !/^https?:\/\//i.test(val)) {
                                                setShareLink(formatExternalUrl(val));
                                            }
                                        }}
                                        placeholder="Paste a link (e.g. https://... or youtube.com)"
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
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
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
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                    title="Remove link"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hidden File Input for Custom Media / Banner */}
                <input 
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="post-thumbnail-file-input"
                />

                {/* Bottom Native Action Toolbar */}
                <div className="border-t border-gray-100 dark:border-white/5 px-4 sm:px-6 pt-3 pb-6 sm:pb-3.5 bg-gray-50/70 dark:bg-white/[0.02] shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        {/* Media Action Buttons */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    thumbnailPreview 
                                        ? "bg-primary/10 text-primary border border-primary/20" 
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                }`}
                                title={mode === "event" ? "Upload custom event cover" : "Attach photo"}
                            >
                                <ImageIcon size={18} className={thumbnailPreview ? "text-primary" : "text-emerald-500"} />
                                <span className="hidden sm:inline">
                                    {mode === "event" ? "Custom Banner" : "Photo"}
                                </span>
                            </button>

                            {mode !== "event" && (
                                <button
                                    type="button"
                                    onClick={() => setShowLinkInput(!showLinkInput)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        showLinkInput || shareLink
                                            ? "bg-primary/10 text-primary border border-primary/20" 
                                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                    title="Attach link"
                                >
                                    <LinkIcon size={18} className={shareLink ? "text-primary" : "text-blue-500"} />
                                    <span className="hidden sm:inline">Link</span>
                                </button>
                            )}

                            {mode !== "event" && (
                                <button
                                    type="button"
                                    onClick={() => setMode("event")}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    title="Switch to Campus Event"
                                >
                                    <Calendar size={18} className="text-blue-500" />
                                    <span className="hidden sm:inline">Event</span>
                                </button>
                            )}

                            {mode !== "poll" && (
                                <button
                                    type="button"
                                    onClick={() => setMode("poll")}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                    title="Switch to Campus Poll"
                                >
                                    <BarChart2 size={18} className="text-violet-500" />
                                    <span className="hidden sm:inline">Poll</span>
                                </button>
                            )}
                        </div>

                        {/* Right: Keyboard Shortcut & Submit CTA */}
                        <div className="flex items-center gap-3">
                            <span className="hidden md:inline text-[11px] text-gray-400 font-medium">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-150 dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-150 dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">Enter</kbd> to {editPost ? "save" : "post"}
                            </span>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!isFormValid()}
                                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span>{editPost ? "Saving..." : "Posting..."}</span>
                                        <Loader2 size={14} className="animate-spin" />
                                    </>
                                ) : (
                                    <>
                                        <span>
                                            {editPost ? "Save Changes" : mode === "event" ? "Publish Event" : mode === "poll" ? "Launch Poll" : "Post"}
                                        </span>
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
                                {visibility === "private" 
                                    ? "Private post: Only you will be able to see this." 
                                    : visibility === "campus"
                                        ? "Campus post: Reviewed by campus moderators before going live."
                                        : "Global post: Reviewed by community moderators before going live."
                                }
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
