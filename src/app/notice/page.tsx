"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ImageLightbox from "@/components/ImageLightbox";
import {
    Pin,
    Calendar,
    User,
    FileText,
    Filter,
    Search,
    Plus,
    X,
    AlertTriangle,
    Link as LinkIcon,
    Edit2,
    Trash2,
    Globe,
    School,
    ImageIcon,
    Shield,
    Bookmark,
    Share2
} from "lucide-react";
import { 
    subscribeNotices, createNotice, getColleges, updateNotice, deleteNotice, subscribeModerationCount, type FirestoreNotice,
    toggleSaveNotice, subscribeSavedNotices
} from "@/lib/firestore";
import ShareModal from "@/components/ShareModal";
import { uploadFile, deleteFromCloudinary } from "@/lib/storage";
import GenericModerationPanel from "@/components/Moderation/GenericModerationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { canEditNotice } from "@/lib/permissions";

type Notice = FirestoreNotice & { id: string };

const collegeFilter = [
    "All",
    "Dhaka",
    "Feni",
    "Rajshahi",
    "Cumilla",
    "Sylhet",
    "Chattagram",
    "Rangpur",
    "Khulna",
    "Mymensingh",
    "Jashore",
    "Barishal",
    "Faridpur",
    "Pabna",
    "Bogura",
];

const programmeFilter = [
    { label: "All", value: "All" },
    { label: "B.Ed Honours", value: "BEdHonours" },
    { label: "M.Ed", value: "MEd" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(ts: any) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ═══════════════════════════════════════════════════
   POST NOTICE MODAL
   ═══════════════════════════════════════════════════ */
function PostNoticeModal({
    collegeName,
    isAdmin,
    onClose,
}: {
    collegeName: string;
    isAdmin: boolean;
    onClose: () => void;
}) {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [programme, setProgramme] = useState<"BEd" | "BEdHonours" | "MEd" | "Both" | "All">("All");
    const [isUrgent, setIsUrgent] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [colleges, setColleges] = useState<{ id: string, name: string }[]>([]);
    const [selectedCollegeId, setSelectedCollegeId] = useState("");
    const [visibility, setVisibility] = useState<"public" | "campus">("public");
    const { showToast } = useToast();

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAdmin) {
            getColleges().then(data => {
                setColleges(data.map(c => ({ id: c.id, name: c.shortName || c.name })));
                if (data.length > 0) setSelectedCollegeId(data[0].id);
            });
        }
    }, [isAdmin]);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB", "info"); return; }
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!title.trim()) return setError("Title is required");
        if (!body.trim()) return setError("Notice body is required");
        setError("");
        setSubmitting(true);

        try {
            let thumbnailUrl = "";
            if (thumbnailFile) {
                const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                thumbnailUrl = resultUrl;
            }

            await createNotice({
                title: title.trim(),
                body: body.trim(),
                programme,
                isPinned: false,
                isUrgent,
                attachmentUrl: attachmentUrl.trim(),
                visibility,
                ...(thumbnailUrl ? { thumbnailUrl } : {}),
                ...(isAdmin && selectedCollegeId ? { collegeId: selectedCollegeId } : {})
            });
            showToast("Notice posted successfully! Pending review.", "success");
            onClose();
        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Failed to post notice", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg rounded-2xl border p-6 z-10 max-h-[90vh] overflow-y-auto"
                style={{
                    background: "var(--card-bg, #fff)",
                    borderColor: "var(--card-border, #e5e7eb)",
                }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                        📋 Post Notice
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X size={18} style={{ color: "var(--text-muted)" }} />
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* College (read-only or dropdown) */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>College</label>
                        {isAdmin ? (
                            <select
                                value={selectedCollegeId}
                                onChange={(e) => setSelectedCollegeId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            >
                                {colleges.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div
                                className="w-full px-4 py-2.5 rounded-xl border text-sm opacity-60"
                                style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            >
                                {collegeName || "Your college"}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Notice Title *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="e.g., পরীক্ষার সময়সূচি পরিবর্তন"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Notice Body *</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="Write the full notice content..."
                        />
                    </div>

                    {/* Programme Toggle */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Programme</label>
                        <div className="flex gap-2">
                            {([
                                { value: "BEdHonours", label: "B.Ed Honours" },
                                { value: "MEd", label: "M.Ed" },
                                { value: "All", label: "All Programmes" },
                            ] as const).map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setProgramme(p.value)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${programme === p.value
                                        ? "bg-primary text-white border-primary"
                                        : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                                        }`}
                                    style={programme !== p.value ? { color: "var(--text-secondary)", background: "var(--bg)" } : {}}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Privacy Toggle */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>
                            <Globe size={12} className="inline mr-1" />
                            Privacy
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setVisibility("public")}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${visibility === "public" ? "bg-primary text-white border-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}
                                style={visibility !== "public" ? { color: "var(--text-secondary)", background: "var(--bg)" } : {}}
                            >
                                <Globe size={12} /> Global
                            </button>
                            <button
                                onClick={() => setVisibility("campus")}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${visibility === "campus" ? "bg-primary text-white border-primary" : "border-gray-200 dark:border-gray-700 hover:border-primary/50"}`}
                                style={visibility !== "campus" ? { color: "var(--text-secondary)", background: "var(--bg)" } : {}}
                            >
                                <School size={12} /> Campus
                            </button>
                        </div>
                    </div>

                    {/* Urgent Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Mark as Urgent</span>
                        </div>
                        <button
                            onClick={() => setIsUrgent(!isUrgent)}
                            className={`w-10 h-5 rounded-full transition-all relative ${isUrgent ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isUrgent ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
                        </button>
                    </div>

                    {/* PDF Link */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>
                            <LinkIcon size={12} className="inline mr-1" />
                            PDF Link (optional)
                        </label>
                        <input
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="https://..."
                        />
                    </div>

                    {/* Thumbnail Upload */}
                    <div>
                        <label className="text-xs font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>
                            <ImageIcon size={12} className="inline mr-1" />
                            Add Thumbnail(Optional)
                        </label>
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="hidden"
                            id="notice-thumbnail-input"
                        />
                        {thumbnailPreview ? (
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20">
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-48 sm:h-64 object-contain" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <button onClick={removeThumbnail} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-500 text-white rounded-full shadow-lg">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/30 rounded-xl transition-all text-gray-400 hover:text-primary text-xs font-bold"
                            >
                                <ImageIcon size={16} /> Click to add thumbnail
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full mt-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--btn-primary)" }}
                >
                    {submitting ? "Posting..." : "📋 Post Notice"}
                </button>
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   NOTICE PAGE
   ═══════════════════════════════════════════════════ */
function NoticePageContent() {
    const { profile } = useAuth();
    const [selectedCollege, setSelectedCollege] = useState("All");
    const [selectedProgramme, setSelectedProgramme] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showModeration, setShowModeration] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [selectedImageForLightbox, setSelectedImageForLightbox] = useState<string | null>(null);
    const [savedNoticeIds, setSavedNoticeIds] = useState<string[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareNotice, setShareNotice] = useState<any | null>(null);
    const [targetNoticeId, setTargetNoticeId] = useState<string | null>(null);
    const hasScrolledRef = useRef<string | null>(null);
    const searchParams = useSearchParams();

    // Edit state
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [editProgramme, setEditProgramme] = useState<"BEd" | "BEdHonours" | "MEd" | "Both" | "All">("All");
    const [editVisibility, setEditVisibility] = useState<"public" | "campus" | "private">("public");
    const [editIsUrgent, setEditIsUrgent] = useState(false);
    const [editIsPinned, setEditIsPinned] = useState(false);
    const [editAttachmentUrl, setEditAttachmentUrl] = useState("");
    const [editSelectedCollegeId, setEditSelectedCollegeId] = useState("");
    
    // Media Edit state
    const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
    const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
    const [editExistingThumbnailUrl, setEditExistingThumbnailUrl] = useState<string | null>(null);
    const editThumbnailInputRef = useRef<HTMLInputElement>(null);

    const [allColleges, setAllColleges] = useState<{ id: string, name: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Delete Modal state
    const { confirm, setIsLoading, close } = useConfirm();
    const { showToast } = useToast();

    // Can this user post notices?
    const canPost = !!profile;
    const isAdmin = profile?.role === "admin";

    // Find college name for modal
    const collegeName = profile?.collegeId
        ? notices.find(n => n.collegeId === profile.collegeId)?.college || profile.collegeId
        : "";

    // Real-time listener via onSnapshot
    useEffect(() => {
        const unsubNotices = subscribeNotices((data) => {
            setNotices(data);
            setLoading(false);
        });

        let unsubSaved = () => {};
        if (profile?.uid) {
            unsubSaved = subscribeSavedNotices(profile.uid, (ids) => {
                setSavedNoticeIds(ids);
            });
        } else {
            setSavedNoticeIds([]);
        }

        const unsubCount = subscribeModerationCount(
            "notices",
            profile?.collegeId,
            isAdmin,
            (count: number) => setPendingCount(count)
        );

        if (isAdmin) {
            getColleges().then(data => {
                setAllColleges(data.map(c => ({ id: c.id, name: c.shortName || c.name })));
            });
        }

        return () => {
            unsubNotices();
            unsubSaved();
            unsubCount();
        };
    }, [profile]);

    // Scroll to & highlight notice deep link
    useEffect(() => {
        const noticeParam = searchParams.get('notice');
        if (noticeParam && notices.length > 0) {
            setTargetNoticeId(noticeParam);
            const noticeExists = notices.some(n => n.id === noticeParam);
            if (noticeExists && hasScrolledRef.current !== noticeParam) {
                hasScrolledRef.current = noticeParam;
                setTimeout(() => {
                    const el = document.getElementById(`notice-${noticeParam}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        }
    }, [searchParams, notices]);

    const handleSaveNotice = async (noticeId: string) => {
        if (!profile?.uid) {
            showToast("Please log in to bookmark notices.", "error");
            return;
        }
        try {
            const isSaved = await toggleSaveNotice(profile.uid, noticeId);
            if (isSaved) {
                showToast("Notice bookmarked!", "success");
            } else {
                showToast("Bookmark removed.", "info");
            }
        } catch (err) {
            console.error("Error bookmarking notice:", err);
            showToast("Failed to toggle bookmark.", "error");
        }
    };

    const handleShareNotice = (notice: any) => {
        setShareNotice(notice);
        setIsShareOpen(true);
    };

    const filteredNotices = notices
        .filter((n) => {
            // Visibility check for pending notices
            const isApproved = n.status === "approved" || !n.status;
            if (!isApproved) {
                const isAuthor = profile?.uid === n.authorId;
                const isManagerOfCollege = (profile?.role === "manager" || profile?.role === "teacher") && profile?.collegeId === n.collegeId;
                if (!isAuthor && !isAdmin && !isManagerOfCollege) return false;
            }

            // Campus privacy filter
            const vis = n.visibility || "public";
            if (vis === "campus" || vis === "private") {
                // Authors can always see their own notices
                if (profile?.uid === n.authorId) { /* pass */ }
                else if (!profile?.collegeId || profile.collegeId !== n.collegeId) return false;
            }

            if (selectedCollege !== "All" && !n.college.includes(selectedCollege))
                return false;
            if (selectedProgramme !== "All" && n.programme !== selectedProgramme && n.programme !== "Both" && n.programme !== "All")
                return false;
            if (
                searchQuery &&
                !n.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
                return false;
            return true;
        })
        .sort((a, b) => {
            // Pending notices float to top for approvers
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (b.status === "pending" && a.status !== "pending") return 1;
            return a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1;
        });

    const handleEditStart = (notice: Notice) => {
        setEditingNoticeId(notice.id);
        setEditTitle(notice.title);
        setEditBody(notice.body);
        setEditProgramme(notice.programme || "Both");
        setEditVisibility(notice.visibility || "public");
        setEditIsUrgent(notice.isUrgent || false);
        setEditIsPinned(notice.isPinned || false);
        setEditAttachmentUrl(notice.attachmentUrl || "");
        setEditSelectedCollegeId(notice.collegeId || "");
        setEditThumbnailFile(null);
        setEditThumbnailPreview(notice.thumbnailUrl || null);
        setEditExistingThumbnailUrl(notice.thumbnailUrl || null);
    };

    const handleEditCancel = () => {
        setEditingNoticeId(null);
        setEditThumbnailFile(null);
        setEditThumbnailPreview(null);
    };

    const handleEditSave = async (id: string) => {
        if (!editTitle.trim() || !editBody.trim()) return;
        setIsSaving(true);
        try {
            let finalThumbnailUrl = editExistingThumbnailUrl || "";

            // 1. Handle Thumbnail Update
            if (editThumbnailFile) {
                // Upload new image
                const newUrl = await uploadFile("thumbnails", editThumbnailFile);
                finalThumbnailUrl = newUrl;
                
                // Delete old image from server if it existed
                if (editExistingThumbnailUrl) {
                    await deleteFromCloudinary(editExistingThumbnailUrl);
                }
            } else if (!editThumbnailPreview && editExistingThumbnailUrl) {
                // Image was removed
                await deleteFromCloudinary(editExistingThumbnailUrl);
                finalThumbnailUrl = "";
            }

            // 2. Update Firestore
            await updateNotice(id, { 
                title: editTitle.trim(), 
                body: editBody.trim(),
                programme: editProgramme,
                visibility: editVisibility,
                isUrgent: editIsUrgent,
                isPinned: editIsPinned,
                attachmentUrl: editAttachmentUrl.trim(),
                thumbnailUrl: finalThumbnailUrl,
                ...(isAdmin && editSelectedCollegeId ? { collegeId: editSelectedCollegeId } : {})
            });
            
            setEditingNoticeId(null);
            setEditThumbnailFile(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to save changes.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Notice?",
            message: "Are you sure you want to delete this notice? This action cannot be undone and it will be removed for everyone.",
            confirmText: "Delete Notice",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteNotice(id);
        } catch (err) {
            console.error(err);
            showToast("Failed to delete notice.", "error");
        } finally {
            close();
        }
    };

    return (
        <div className="min-h-screen" style={{ background: "var(--bg)" }}>
            {/* Header */}
            <div
                className="border-b"
                style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                }}
            >
                <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold font-english" style={{ color: "var(--text-primary)" }}>
                            Notice Board
                        </h1>
                        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                            Official notices for B.Ed Honours and M.Ed programmes across all colleges
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                            <button 
                                onClick={() => setShowModeration(true)}
                                className="relative flex items-center justify-center gap-2 px-6 py-2 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm shadow-sm"
                            >
                                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Review Queue</span>
                                <AnimatePresence>
                                    {pendingCount > 0 && (
                                        <motion.span 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1c24] shadow-lg"
                                        >
                                            {pendingCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        )}
                        {canPost && (
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                                style={{ background: "var(--btn-primary)" }}
                            >
                                <Plus size={16} />
                                Post Notice
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Filters */}
                <div
                    className="rounded-2xl p-5 border shadow-sm mb-6 space-y-4"
                    style={{
                        background: "var(--card-bg)",
                        borderColor: "var(--card-border)",
                    }}
                >
                    {/* Search */}
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-muted)" }}
                        />
                        <input
                            type="text"
                            placeholder="Search notices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            style={{
                                background: "var(--bg)",
                                borderColor: "var(--card-border)",
                                color: "var(--text-primary)",
                            }}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* College Filter */}
                        <div className="flex-1">
                            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-muted)" }}>
                                <Filter size={12} className="inline mr-1" />
                                By College
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {collegeFilter.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedCollege(c)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCollege === c
                                            ? "bg-primary text-white"
                                            : "hover:opacity-80"
                                            }`}
                                        style={selectedCollege !== c ? {
                                            background: "var(--bg)",
                                            color: "var(--text-secondary)",
                                        } : {}}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Programme Filter */}
                        <div>
                            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-muted)" }}>
                                Programme
                            </label>
                            <div className="flex gap-1.5">
                                {programmeFilter.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => setSelectedProgramme(p.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedProgramme === p.value
                                            ? "bg-accent text-white"
                                            : "hover:opacity-80"
                                            }`}
                                        style={selectedProgramme !== p.value ? {
                                            background: "var(--bg)",
                                            color: "var(--text-secondary)",
                                        } : {}}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notice Cards */}
                <div className="space-y-4">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl p-5 border animate-pulse"
                                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-16 h-7 rounded-lg" style={{ background: "var(--bg)" }} />
                                    <div className="flex-1">
                                        <div className="h-4 rounded w-2/3 mb-2" style={{ background: "var(--bg)" }} />
                                        <div className="h-3 rounded w-full mb-1" style={{ background: "var(--bg)" }} />
                                        <div className="h-3 rounded w-4/5" style={{ background: "var(--bg)" }} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {filteredNotices.map((notice, index) => {
                                const permissions = canEditNotice(profile, notice);
                                return (
                                    <motion.div
                                        key={notice.id}
                                        id={`notice-${notice.id}`}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`relative rounded-2xl p-6 border shadow-md hover:shadow-xl transition-all duration-300 ${
                                            targetNoticeId === notice.id
                                                ? "ring-2 ring-primary border-primary/50"
                                                : notice.isUrgent
                                                    ? "bg-gradient-to-br from-[var(--card-bg)] to-red-500/[0.01] dark:to-red-500/[0.03] border-l-4 border-l-red-500 border-red-500/20"
                                                    : notice.isPinned
                                                        ? "bg-gradient-to-br from-[var(--card-bg)] to-indigo-500/[0.01] dark:to-indigo-500/[0.03] border-l-4 border-l-accent border-indigo-500/20"
                                                        : "hover:border-slate-300 dark:hover:border-slate-700"
                                        }`}
                                        style={{
                                            background: "var(--card-bg)",
                                            borderColor: targetNoticeId === notice.id ? undefined : notice.isUrgent ? undefined : notice.isPinned ? undefined : "var(--card-border)",
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* College Badge */}
                                            <div
                                                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                                                style={{ backgroundColor: notice.collegeColor }}
                                            >
                                                {notice.college.split(", ").pop()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {notice.status === "pending" && (
                                                        <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/10">
                                                            Pending Approval
                                                        </span>
                                                    )}
                                                    {notice.status === "rejected" && (
                                                        <span className="flex items-center gap-1 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10">
                                                            Rejected
                                                        </span>
                                                    )}
                                                    {notice.isPinned && (
                                                        <span className="flex items-center gap-1 text-accent text-xs font-bold">
                                                            <Pin size={12} />
                                                            Pinned
                                                        </span>
                                                    )}
                                                    {notice.isUrgent && (
                                                        <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                                            <AlertTriangle size={12} />
                                                            Urgent
                                                        </span>
                                                    )}
                                                    <span className="badge badge-primary text-[10px]">
                                                        {notice.programme === "BEdHonours" ? "B.Ed Honours" : notice.programme === "MEd" ? "M.Ed" : notice.programme === "BEd" ? "B.Ed" : "All Programmes"}
                                                    </span>
                                                    {(notice.visibility === "campus" || notice.visibility === "private") && (
                                                        <span className="flex items-center gap-1 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10">
                                                            <School size={10} /> Campus
                                                        </span>
                                                    )}
                                                </div>

                                                {editingNoticeId === notice.id ? (
                                                    <div className="mt-4 space-y-4 pr-16 block relative z-30">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notice Title</label>
                                                            <input
                                                                value={editTitle}
                                                                onChange={e => setEditTitle(e.target.value)}
                                                                className="w-full px-4 py-2.5 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                                                style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notice Content</label>
                                                            <textarea
                                                                value={editBody}
                                                                onChange={e => setEditBody(e.target.value)}
                                                                rows={4}
                                                                className="w-full px-4 py-3 border rounded-2xl text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                                                                style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Programme</label>
                                                                <select 
                                                                    value={editProgramme}
                                                                    onChange={(e) => setEditProgramme(e.target.value as "BEd" | "BEdHonours" | "MEd" | "Both" | "All")}
                                                                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                                                    style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                                >
                                                                    <option value="All">All Programmes</option>
                                                                    <option value="BEdHonours">B.Ed Honours Only</option>
                                                                    <option value="MEd">M.Ed Only</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visibility</label>
                                                                <select 
                                                                    value={editVisibility}
                                                                    onChange={(e) => setEditVisibility(e.target.value as "public" | "campus" | "private")}
                                                                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                                                    style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                                >
                                                                    <option value="public">Public (Everyone)</option>
                                                                    <option value="campus">Campus (Selected College)</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attachment URL (PDF/Link)</label>
                                                            <div className="relative">
                                                                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    value={editAttachmentUrl}
                                                                    onChange={e => setEditAttachmentUrl(e.target.value)}
                                                                    placeholder="https://example.com/notice.pdf"
                                                                    className="w-full pl-9 pr-4 py-2.5 border rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                                    style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {isAdmin && allColleges.length > 0 && (
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target College</label>
                                                                <select 
                                                                    value={editSelectedCollegeId}
                                                                    onChange={(e) => setEditSelectedCollegeId(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                                                    style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                                                                >
                                                                    {allColleges.map(c => (
                                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}

                                                        <div className="space-y-4 pt-2">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Thumbnail(Optional)</label>
                                                                <button 
                                                                    onClick={() => editThumbnailInputRef.current?.click()}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                                                >
                                                                    <ImageIcon size={14} />
                                                                    {editThumbnailPreview ? "Change Image" : "Add Image"}
                                                                </button>
                                                                <input 
                                                                    ref={editThumbnailInputRef}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setEditThumbnailFile(file);
                                                                            setEditThumbnailPreview(URL.createObjectURL(file));
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </div>

                                                            {editThumbnailPreview && (
                                                                <div className="relative group/thumb rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20">
                                                                    <img 
                                                                        src={editThumbnailPreview} 
                                                                        alt="Preview" 
                                                                        className="w-full h-auto max-h-[200px] object-contain"
                                                                    />
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditThumbnailFile(null);
                                                                            setEditThumbnailPreview(null);
                                                                        }}
                                                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 py-2">
                                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                                <div 
                                                                    onClick={() => setEditIsUrgent(!editIsUrgent)}
                                                                    className={`w-10 h-5 rounded-full relative transition-all ${editIsUrgent ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editIsUrgent ? 'right-1' : 'left-1'}`} />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-red-500 transition-colors">Mark Urgent</span>
                                                            </label>

                                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                                <div 
                                                                    onClick={() => setEditIsPinned(!editIsPinned)}
                                                                    className={`w-10 h-5 rounded-full relative transition-all ${editIsPinned ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editIsPinned ? 'right-1' : 'left-1'}`} />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-indigo-500 transition-colors">Pin to Top</span>
                                                            </label>
                                                        </div>

                                                        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                                                            <button 
                                                                onClick={handleEditCancel} 
                                                                className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
                                                                style={{ color: "var(--text-primary)" }}
                                                            >
                                                                Discard
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditSave(notice.id)} 
                                                                disabled={isSaving} 
                                                                className="px-8 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95" 
                                                                style={{ background: "var(--btn-primary)" }}
                                                            >
                                                                {isSaving ? "Updating..." : "Push Changes"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="pr-16">
                                                        <h3 className="text-base font-bold mt-2" style={{ color: "var(--text-primary)" }}>
                                                            {notice.title}
                                                        </h3>
                                                        <p className="text-sm mt-2.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                                            {notice.body}
                                                        </p>
                                                        
                                                        {/* Image Preview Container */}
                                                        {notice.thumbnailUrl && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setSelectedImageForLightbox(notice.thumbnailUrl || null)}
                                                                className="group relative block mt-4 w-full max-w-xl rounded-2xl overflow-hidden border bg-gray-50 dark:bg-black/20 transition-all duration-300 hover:shadow-md hover:scale-[1.005] cursor-zoom-in text-left"
                                                                style={{ borderColor: "var(--card-border)" }}
                                                            >
                                                                <div className="h-56 sm:h-64 w-full relative flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900/50">
                                                                    <img 
                                                                        src={notice.thumbnailUrl} 
                                                                        alt={notice.title} 
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-all duration-300 flex flex-col items-center justify-center">
                                                                        <div className="px-4 py-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                                            <Search size={14} className="animate-pulse" />
                                                                            Click to zoom & read
                                                                        </div>
                                                                    </div>
                                                                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-black tracking-wider text-white/90 uppercase border border-white/10">
                                                                        Notice Document
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )}

                                                        {/* PDF/Link Attachment Block */}
                                                        {notice.attachmentUrl && (
                                                            <a 
                                                                href={notice.attachmentUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="group flex items-center gap-3 mt-4 max-w-md p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/10 hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-all border-dashed"
                                                                style={{ borderColor: "var(--card-border)" }}
                                                            >
                                                                <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>
                                                                        PDF Notice Attachment
                                                                    </h4>
                                                                    <p className="text-[10px] font-bold mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                                                        Open document in new tab
                                                                    </p>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs" style={{ color: "var(--text-muted)" }}>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <span className="flex items-center gap-1.5">
                                                            <User size={12} />
                                                            {notice.authorId ? (
                                                                <Link href={`/profile/${notice.authorId}`} className="hover:underline hover:text-primary transition-colors relative z-20 font-medium">
                                                                    {notice.postedBy}
                                                                </Link>
                                                            ) : (
                                                                <span className="font-medium">{notice.postedBy}</span>
                                                            )}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar size={12} />
                                                            {formatDate(notice.date)}
                                                        </span>
                                                        {notice.approvedByName && (
                                                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                                                <Shield size={12} />
                                                                Approved by {notice.approvedByName}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 relative z-20">
                                                        <button
                                                            onClick={() => handleSaveNotice(notice.id)}
                                                            className={`p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                                                savedNoticeIds.includes(notice.id)
                                                                    ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                                                    : "bg-slate-50 dark:bg-slate-900/50 text-gray-400 hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/10"
                                                            }`}
                                                            title={savedNoticeIds.includes(notice.id) ? "Remove Bookmark" : "Bookmark Notice"}
                                                        >
                                                            <Bookmark size={14} className={savedNoticeIds.includes(notice.id) ? "fill-primary" : ""} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareNotice(notice)}
                                                            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-gray-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10 hover:scale-105 active:scale-95 transition-all duration-200"
                                                            title="Share Notice"
                                                        >
                                                            <Share2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Edit / Delete Tools */}
                                        <div className="absolute top-4 right-4 flex gap-1">
                                            {permissions.canEdit && editingNoticeId !== notice.id && (
                                                <button onClick={() => handleEditStart(notice)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                                                    <Edit2 size={15} />
                                                </button>
                                            )}
                                            {permissions.canDelete && editingNoticeId !== notice.id && (
                                                <button onClick={() => handleDelete(notice.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {filteredNotices.length === 0 && (
                                <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                                    <FileText size={40} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">
                                        No notices found matching your filters.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>



            {/* Post Notice Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <PostNoticeModal
                        collegeName={collegeName}
                        isAdmin={isAdmin}
                        onClose={() => setShowPostModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Moderation Panel */}
            {profile && (
                <GenericModerationPanel
                    isOpen={showModeration}
                    onClose={() => setShowModeration(false)}
                    type="notices"
                    profile={profile}
                />
            )}

            {/* Generic Share Modal */}
            <AnimatePresence>
                {isShareOpen && shareNotice && (
                    <ShareModal 
                        isOpen={isShareOpen} 
                        onClose={() => {
                            setIsShareOpen(false);
                            setShareNotice(null);
                        }} 
                        type="notice"
                        post={{
                            id: shareNotice.id,
                            title: shareNotice.title,
                            body: shareNotice.body,
                            collegeName: shareNotice.college,
                            thumbnailUrl: shareNotice.thumbnailUrl
                        }} 
                    />
                )}
            </AnimatePresence>

            {/* Lightbox Modal */}
            <ImageLightbox
                isOpen={!!selectedImageForLightbox}
                src={selectedImageForLightbox}
                alt="Notice Attachment"
                onClose={() => setSelectedImageForLightbox(null)}
            />
        </div>
    );
}

export default function NoticePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
        }>
            <NoticePageContent />
        </Suspense>
    );
}
