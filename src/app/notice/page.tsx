"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
    Share2,
    Megaphone,
    MoreVertical,
    ExternalLink,
    LayoutGrid,
    List,
    Check,
    Copy,
    Maximize2,
    Building2,
    Sparkles,
    RotateCcw,
    ChevronRight,
    ChevronDown,
    ChevronUp,
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
import { useVerifiedAccess } from "@/contexts/VerificationContext";

type Notice = FirestoreNotice & { id: string };

interface CollegeFilterItem {
    id: string;
    name: string;
    shortName: string;
    city: string;
    color: string;
}

const collegeList: CollegeFilterItem[] = [
    { id: "All", name: "All Colleges", shortName: "All 15 Govt. TTCs", city: "All", color: "#1e3a8a" },
    { id: "dhaka", name: "Govt. Teachers' Training College, Dhaka", shortName: "Dhaka TTC", city: "Dhaka", color: "#1a1a1a" },
    { id: "feni", name: "Govt. Teachers' Training College, Feni", shortName: "Feni TTC", city: "Feni", color: "#15803d" },
    { id: "rajshahi", name: "Govt. Teachers' Training College, Rajshahi", shortName: "Rajshahi TTC", city: "Rajshahi", color: "#b91c1c" },
    { id: "cumilla", name: "Govt. Teachers' Training College, Cumilla", shortName: "Cumilla TTC", city: "Cumilla", color: "#0369a1" },
    { id: "sylhet", name: "Govt. Teachers' Training College, Sylhet", shortName: "Sylhet TTC", city: "Sylhet", color: "#047857" },
    { id: "chattagram", name: "Govt. Teachers' Training College, Chattagram", shortName: "Chattagram TTC", city: "Chattagram", color: "#c2410c" },
    { id: "rangpur", name: "Govt. Teachers' Training College, Rangpur", shortName: "Rangpur TTC", city: "Rangpur", color: "#6d28d9" },
    { id: "khulna", name: "Govt. Teachers' Training College, Khulna", shortName: "Khulna TTC", city: "Khulna", color: "#0e7490" },
    { id: "mymensingh", name: "Govt. Women's Teachers' Training College, Mymensingh", shortName: "Mymensingh TTC (Women)", city: "Mymensingh", color: "#db2777" },
    { id: "mymensingh_coed", name: "Govt. Teachers' Training College (Men), Mymensingh", shortName: "Mymensingh TTC (Men)", city: "Mymensingh", color: "#2563eb" },
    { id: "jashore", name: "Govt. Teachers' Training College, Jashore", shortName: "Jashore TTC", city: "Jashore", color: "#4d7c0f" },
    { id: "barishal", name: "Govt. Teachers' Training College, Barishal", shortName: "Barishal TTC", city: "Barishal", color: "#1d4ed8" },
    { id: "faridpur", name: "Govt. Teachers' Training College, Faridpur", shortName: "Faridpur TTC", city: "Faridpur", color: "#9333ea" },
    { id: "pabna", name: "Govt. Teachers' Training College, Pabna", shortName: "Pabna TTC", city: "Pabna", color: "#0f766e" },
    { id: "bogura", name: "Govt. Teachers' Training College, Bogura", shortName: "Bogura TTC", city: "Bogura", color: "#854d0e" },
];

const collegeFilter = collegeList.map((c) => c.id);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                className="relative w-full max-w-xl rounded-2xl border shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden"
                style={{
                    background: "var(--card-bg, #fff)",
                    borderColor: "var(--card-border, #e5e7eb)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                                Post Official Notice
                            </h2>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                Publish an announcement to the TTC Network bulletin
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Close"
                    >
                        <X size={18} style={{ color: "var(--text-muted)" }} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle size={15} className="flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Scrollable Form Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* College Selection */}
                    <div>
                        <label className="text-xs font-bold block mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                            <Building2 size={13} className="text-primary" />
                            Target College
                        </label>
                        {isAdmin ? (
                            <select
                                value={selectedCollegeId}
                                onChange={(e) => setSelectedCollegeId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
                                style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            >
                                {colleges.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold bg-slate-50 dark:bg-white/5"
                                style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            >
                                <School size={15} className="text-primary flex-shrink-0" />
                                <span>{collegeName || "Your College Campus"}</span>
                            </div>
                        )}
                    </div>

                    {/* Notice Title */}
                    <div>
                        <label className="text-xs font-bold block mb-1.5 flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                            <span>Notice Title <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-normal text-gray-400">Bangla or English</span>
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="e.g., পরীক্ষার সময়সূচি পরিবর্তন / Class Routine Announcement"
                        />
                    </div>

                    {/* Notice Body */}
                    <div>
                        <label className="text-xs font-bold block mb-1.5 flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                            <span>Notice Details & Content <span className="text-red-500">*</span></span>
                            <span className="text-[10px] font-normal text-gray-400">Supports paragraphs</span>
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30 transition-all leading-relaxed"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="Write the complete announcement or instructions here..."
                        />
                    </div>

                    {/* Programme & Privacy (2-column on desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Programme */}
                        <div>
                            <label className="text-xs font-bold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                Applicable Programme
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {([
                                    { value: "All", label: "All" },
                                    { value: "BEdHonours", label: "B.Ed (Hons)" },
                                    { value: "MEd", label: "M.Ed" },
                                ] as const).map((p) => (
                                    <button
                                        type="button"
                                        key={p.value}
                                        onClick={() => setProgramme(p.value)}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                                            programme === p.value
                                                ? "bg-primary text-white border-primary shadow-xs"
                                                : "border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-600 dark:text-gray-300"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Privacy */}
                        <div>
                            <label className="text-xs font-bold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                Audience Visibility
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setVisibility("public")}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                        visibility === "public"
                                            ? "bg-primary text-white border-primary shadow-xs"
                                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-600 dark:text-gray-300"
                                    }`}
                                >
                                    <Globe size={13} /> Global (All)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVisibility("campus")}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                        visibility === "campus"
                                            ? "bg-primary text-white border-primary shadow-xs"
                                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-600 dark:text-gray-300"
                                    }`}
                                >
                                    <School size={13} /> Campus Only
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Urgent Alert Switch */}
                    <div className="p-3.5 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Mark as Urgent Notice</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Highlights notice in red and signals priority</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsUrgent(!isUrgent)}
                            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${isUrgent ? "bg-red-500 shadow-sm" : "bg-gray-300 dark:bg-gray-700"}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-xs ${isUrgent ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
                        </button>
                    </div>

                    {/* Attachments: Image / Routine scan */}
                    <div>
                        <label className="text-xs font-bold block mb-1.5 flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                            <span className="flex items-center gap-1.5">
                                <ImageIcon size={13} className="text-primary" />
                                Notice Document / Routine Scan (Optional)
                            </span>
                            <span className="text-[10px] font-normal text-gray-400">PNG, JPG up to 5MB</span>
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
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-black/30 p-2">
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-44 sm:h-56 object-contain rounded-lg" />
                                <button
                                    type="button"
                                    onClick={removeThumbnail}
                                    className="absolute top-3 right-3 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                                    title="Remove document"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/40 rounded-xl transition-all text-gray-400 hover:text-primary group bg-slate-50/50 dark:bg-white/[0.02]"
                            >
                                <div className="w-9 h-9 rounded-full bg-primary/5 group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
                                    <ImageIcon size={18} />
                                </div>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Click to attach routine or notice image</span>
                                <span className="text-[11px] text-gray-400">Will be shown in full uncropped view</span>
                            </button>
                        )}
                    </div>

                    {/* PDF Document Link */}
                    <div>
                        <label className="text-xs font-bold block mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                            <LinkIcon size={13} className="text-primary" />
                            Official PDF Document Link (Optional)
                        </label>
                        <input
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                            style={{ background: "var(--bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                            placeholder="https://nu.ac.bd/notices/circular.pdf"
                        />
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="px-6 py-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5 bg-slate-50/80 dark:bg-black/40 backdrop-blur-md flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
                        style={{ background: "var(--btn-primary)" }}
                    >
                        <Plus size={15} />
                        {submitting ? "Publishing..." : "Post Notice"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   NOTICE PAGE
   ═══════════════════════════════════════════════════ */
function NoticePageContent() {
    const { profile } = useAuth();
    const { requireVerification } = useVerifiedAccess();
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
    const [temporaryHighlightId, setTemporaryHighlightId] = useState<string | null>(null);
    const hasScrolledRef = useRef<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    // UI View & Interactive state
    const [viewMode, setViewMode] = useState<"card" | "compact">("card");
    const [activeDropdownNoticeId, setActiveDropdownNoticeId] = useState<string | null>(null);
    const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);
    const [expandedNoticeIds, setExpandedNoticeIds] = useState<Record<string, boolean>>({});
    const [isCollegeMenuOpen, setIsCollegeMenuOpen] = useState(false);
    const [collegeSearchQuery, setCollegeSearchQuery] = useState("");

    const filteredCollegeList = useMemo(() => {
        if (!collegeSearchQuery.trim()) return collegeList;
        const q = collegeSearchQuery.toLowerCase().trim();
        return collegeList.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.shortName.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q)
        );
    }, [collegeSearchQuery]);

    // Close 3-dot dropdown menu & college menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-notice-menu]")) {
                setActiveDropdownNoticeId(null);
            }
            if (!target.closest("[data-college-menu]")) {
                setIsCollegeMenuOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

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

    const [hashNoticeId, setHashNoticeId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleHashChange = () => {
                const hash = window.location.hash;
                if (hash.startsWith("#notice-")) {
                    setHashNoticeId(hash.substring(8));
                }
            };
            handleHashChange();
            window.addEventListener("hashchange", handleHashChange);
            return () => window.removeEventListener("hashchange", handleHashChange);
        }
    }, []);

    // Handle URL parameters (deep-linking)
    useEffect(() => {
        const effectiveNoticeId = searchParams.get("notice") || hashNoticeId;
        if (effectiveNoticeId && notices.length > 0) {
            setTargetNoticeId(effectiveNoticeId);
            const exists = notices.some((n) => n.id === effectiveNoticeId);
            if (exists && hasScrolledRef.current !== effectiveNoticeId) {
                hasScrolledRef.current = effectiveNoticeId;

                // Highlight temporary for 3 seconds
                setTemporaryHighlightId(effectiveNoticeId);
                const timer = setTimeout(() => {
                    setTemporaryHighlightId(null);
                }, 3000);

                setTimeout(() => {
                    const element = document.getElementById(`notice-${effectiveNoticeId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 400);

                return () => clearTimeout(timer);
            }
        }
    }, [searchParams, notices, hashNoticeId]);

    const handleSaveNotice = async (noticeId: string) => {
        if (!requireVerification("bookmark notices")) return;
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

            if (selectedCollege !== "All") {
                if (selectedCollege === "mymensingh") {
                    const isWomen = n.collegeId === "mymensingh" || n.college.toLowerCase().includes("women");
                    if (!isWomen) return false;
                } else if (selectedCollege === "mymensingh_coed") {
                    const isMen = n.collegeId === "mymensingh_coed" || (n.college.toLowerCase().includes("mymensingh") && !n.college.toLowerCase().includes("women"));
                    if (!isMen) return false;
                } else {
                    const matchesId = n.collegeId?.toLowerCase() === selectedCollege.toLowerCase();
                    const matchesName = n.college.toLowerCase().includes(selectedCollege.toLowerCase());
                    if (!matchesId && !matchesName) return false;
                }
            }
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

    // Dynamic counts for College filters
    const collegeCounts = useMemo(() => {
        const counts: Record<string, number> = { All: notices.length };
        for (const n of notices) {
            for (const c of collegeFilter) {
                if (c !== "All" && n.college && n.college.toLowerCase().includes(c.toLowerCase())) {
                    counts[c] = (counts[c] || 0) + 1;
                }
            }
        }
        return counts;
    }, [notices]);

    // Dynamic counts for Programme filters
    const programmeCounts = useMemo(() => {
        const counts: Record<string, number> = { All: notices.length };
        for (const n of notices) {
            const prog = n.programme || "All";
            if (prog === "BEdHonours" || prog === "Both" || prog === "All") {
                counts["BEdHonours"] = (counts["BEdHonours"] || 0) + 1;
            }
            if (prog === "MEd" || prog === "Both" || prog === "All") {
                counts["MEd"] = (counts["MEd"] || 0) + 1;
            }
        }
        return counts;
    }, [notices]);

    const handleCopyLink = (noticeId: string) => {
        if (typeof window !== "undefined") {
            const url = `${window.location.origin}/notice?notice=${noticeId}`;
            navigator.clipboard.writeText(url);
            setCopiedNoticeId(noticeId);
            showToast("Notice link copied to clipboard!", "success");
            setTimeout(() => setCopiedNoticeId(null), 2500);
        }
    };

    const toggleExpandNotice = (id: string) => {
        setExpandedNoticeIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleResetFilters = () => {
        setSelectedCollege("All");
        setSelectedProgramme("All");
        setSearchQuery("");
    };

    const hasActiveFilters = selectedCollege !== "All" || selectedProgramme !== "All" || searchQuery.trim().length > 0;

    const handleEditStart = (notice: Notice) => {
        if (!requireVerification("edit notices")) return;
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
        if (!requireVerification("delete notices")) return;
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

    const effectiveNoticeId = searchParams.get("notice") || hashNoticeId;
    const isNoticeMissing = !loading && effectiveNoticeId && !notices.some(n => n.id === effectiveNoticeId);

    if (isNoticeMissing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50/50 dark:bg-[#0c0c10]">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <Megaphone size={28} />
                </div>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900 dark:text-white">This content is no longer available</h1>
                <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">The notice you are trying to view has been deleted or is no longer available.</p>
                <button onClick={() => router.push('/notice')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Back to Notice Board</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--bg)" }}>
            {/* Header */}
            <div
                className="border-b transition-colors"
                style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                }}
            >
                <div className="max-w-5xl mx-auto px-4 py-7 sm:py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                    <Megaphone size={12} className="animate-pulse" />
                                    Official Circulars & Routines
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    • {filteredNotices.length} {filteredNotices.length === 1 ? "Notice" : "Notices"}
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-english text-gray-900 dark:text-white">
                                Notice Board
                            </h1>
                            <p className="text-xs sm:text-sm mt-1 text-gray-500 dark:text-gray-400 max-w-xl">
                                Official notices, class routines, and academic circulars across all 14 Government TTCs
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
                            {/* View Mode Toggle */}
                            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("card")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "card"
                                            ? "bg-white dark:bg-white/15 text-primary shadow-xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                    title="Card Feed View"
                                >
                                    <LayoutGrid size={14} />
                                    <span className="hidden xs:inline">Cards</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("compact")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === "compact"
                                            ? "bg-white dark:bg-white/15 text-primary shadow-xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                    title="Compact List View"
                                >
                                    <List size={14} />
                                    <span className="hidden xs:inline">Compact</span>
                                </button>
                            </div>

                            {profile && (profile.role === "admin" || profile.role === "manager" || profile.role === "super_manager") && (
                                <button 
                                    onClick={() => setShowModeration(true)}
                                    className="relative flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group backdrop-blur-sm shadow-xs"
                                >
                                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Review</span>
                                    <AnimatePresence>
                                        {pendingCount > 0 && (
                                            <motion.span 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-black"
                                            >
                                                {pendingCount}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </button>
                            )}

                            {canPost && (
                                <button
                                    onClick={() => {
                                        if (requireVerification("post notices")) {
                                            setShowPostModal(true);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-95 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: "var(--btn-primary)" }}
                                >
                                    <Plus size={15} />
                                    <span>Post Notice</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Search & Filter Container */}
                <div
                    className="rounded-2xl p-4 sm:p-5 border shadow-sm mb-6 space-y-3.5 transition-colors"
                    style={{
                        background: "var(--card-bg)",
                        borderColor: "var(--card-border)",
                    }}
                >
                    {/* Top Row: Search & Quick College Dropdown */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search notices by title, routine, or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm outline-none border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                style={{
                                    background: "var(--bg)",
                                    borderColor: "var(--card-border)",
                                    color: "var(--text-primary)",
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Custom College Dropdown Selector */}
                        <div className={`relative w-full sm:w-64 flex-shrink-0 ${isCollegeMenuOpen ? "z-50" : "z-20"}`} data-college-menu>
                            <button
                                type="button"
                                onClick={() => setIsCollegeMenuOpen(!isCollegeMenuOpen)}
                                className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border flex items-center justify-between gap-2 transition-all outline-none ${
                                    isCollegeMenuOpen
                                        ? "ring-2 ring-primary/20 border-primary shadow-xs"
                                        : "hover:border-primary/40"
                                }`}
                                style={{
                                    background: "var(--bg)",
                                    borderColor: isCollegeMenuOpen ? undefined : "var(--card-border)",
                                    color: "var(--text-primary)",
                                }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span 
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ 
                                            backgroundColor: collegeList.find(c => c.id === selectedCollege)?.color || "#1e3a8a" 
                                        }}
                                    />
                                    <span className="truncate font-bold">
                                        {selectedCollege === "All" ? "All TTC Colleges" : `TTC ${selectedCollege}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary">
                                        {collegeCounts[selectedCollege] || 0}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`text-gray-400 transition-transform duration-200 ${
                                            isCollegeMenuOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </div>
                            </button>

                            {/* Dropdown Popover: Dedicated Desktop Popover & Mobile Bottom Sheet */}
                            <AnimatePresence>
                                {isCollegeMenuOpen && (
                                    <>
                                        {/* 1. DESKTOP POPOVER (hidden on mobile, visible on sm and up) */}
                                        <div className="hidden sm:block">
                                            <motion.div
                                                key="desktop-popover"
                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                className="absolute right-0 top-full mt-2 w-80 sm:w-[360px] rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#151722] p-3 shadow-2xl z-50 flex flex-col max-h-[460px] overflow-hidden"
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10 mb-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                                        <Building2 size={14} className="text-primary" />
                                                        Select TTC Campus
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        14 Colleges
                                                    </span>
                                                </div>

                                                {/* Search inside Dropdown */}
                                                <div className="relative mb-2">
                                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search college name, city..."
                                                        value={collegeSearchQuery}
                                                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                                                        className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs outline-none border border-gray-200 dark:border-white/10 focus:border-primary bg-slate-50 dark:bg-black/20 text-gray-800 dark:text-gray-200"
                                                        autoFocus
                                                    />
                                                    {collegeSearchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCollegeSearchQuery("")}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* College Options List */}
                                                <div className="overflow-y-auto space-y-1 pr-1 max-h-72 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                                                    {filteredCollegeList.map((col) => {
                                                        const isSelected = selectedCollege === col.id;
                                                        const count = collegeCounts[col.id] || 0;
                                                        return (
                                                            <button
                                                                key={col.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCollege(col.id);
                                                                    setIsCollegeMenuOpen(false);
                                                                    setCollegeSearchQuery("");
                                                                }}
                                                                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2.5 transition-colors ${
                                                                    isSelected
                                                                        ? "bg-primary/10 text-primary font-bold shadow-xs"
                                                                        : "text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <span
                                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: col.color }}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <span className="truncate block font-bold text-xs">{col.shortName}</span>
                                                                        {col.id !== "All" && (
                                                                            <span className="text-[10px] text-gray-400 block truncate font-normal">{col.name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <span
                                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            count > 0
                                                                                ? "bg-primary text-white"
                                                                                : "bg-gray-100 dark:bg-white/10 text-gray-400"
                                                                        }`}
                                                                    >
                                                                        {count}
                                                                    </span>
                                                                    {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* 2. MOBILE BOTTOM SHEET DRAWER (visible on mobile, hidden on sm and up) */}
                                        <div key="mobile-sheet-container" className="sm:hidden">
                                            {/* Mobile Backdrop Overlay */}
                                            <motion.div
                                                key="mobile-sheet-backdrop"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setIsCollegeMenuOpen(false)}
                                                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
                                            />

                                            <motion.div
                                                key="mobile-sheet-drawer"
                                                initial={{ opacity: 0, y: "100%" }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: "100%" }}
                                                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                                                className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#151722] p-4 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden"
                                            >
                                                {/* Mobile drag handle bar */}
                                                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-3" />

                                                {/* Popover Header */}
                                                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-white/10 mb-2.5">
                                                    <div>
                                                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                                            <Building2 size={14} className="text-primary" />
                                                            Select TTC Campus
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block">
                                                            Showing all 14 Teachers Training Colleges
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCollegeMenuOpen(false)}
                                                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Search inside Dropdown */}
                                                <div className="relative mb-2.5">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search college name, city..."
                                                        value={collegeSearchQuery}
                                                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                                                        className="w-full pl-8 pr-7 py-2 rounded-xl text-xs outline-none border border-gray-200 dark:border-white/10 focus:border-primary bg-slate-50 dark:bg-black/20 text-gray-800 dark:text-gray-200"
                                                        autoFocus
                                                    />
                                                    {collegeSearchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCollegeSearchQuery("")}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* College Options List */}
                                                <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[58vh] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                                                    {filteredCollegeList.map((col) => {
                                                        const isSelected = selectedCollege === col.id;
                                                        const count = collegeCounts[col.id] || 0;
                                                        return (
                                                            <button
                                                                key={col.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCollege(col.id);
                                                                    setIsCollegeMenuOpen(false);
                                                                    setCollegeSearchQuery("");
                                                                }}
                                                                className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2.5 transition-colors ${
                                                                    isSelected
                                                                        ? "bg-primary/10 text-primary font-bold shadow-xs"
                                                                        : "text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                                        style={{ backgroundColor: col.color }}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <span className="truncate block font-bold text-xs">{col.shortName}</span>
                                                                        {col.id !== "All" && (
                                                                            <span className="text-[10px] text-gray-400 block truncate font-normal">{col.name}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span
                                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            count > 0
                                                                                ? "bg-primary text-white"
                                                                                : "bg-gray-100 dark:bg-white/10 text-gray-400"
                                                                        }`}
                                                                    >
                                                                        {count}
                                                                    </span>
                                                                    {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        </div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Programme Filter & Active Filter Chips */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                            <span className="text-[11px] font-bold text-gray-400 mr-1 uppercase tracking-wider inline-flex items-center gap-1">
                                <Filter size={11} className="text-primary" />
                                Programme:
                            </span>
                            {programmeFilter.map((p) => {
                                const isSelected = selectedProgramme === p.value;
                                const count = programmeCounts[p.value] ?? (p.value === "All" ? notices.length : 0);
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setSelectedProgramme(p.value)}
                                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                            isSelected
                                                ? "bg-primary text-white shadow-xs font-bold"
                                                : "bg-slate-100/70 dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.06]"
                                        }`}
                                    >
                                        <span>{p.label}</span>
                                        {p.value !== "All" && (
                                            <span className={`text-[10px] px-1 py-0.2 rounded-full ${
                                                isSelected ? "bg-white/25 text-white" : "bg-gray-200/60 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Reset filters pill if active */}
                        {hasActiveFilters && (
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-rose-200/60 dark:border-rose-900/40"
                                >
                                    <RotateCcw size={11} />
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notice Feed */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl p-6 border animate-pulse"
                                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-16 h-7 rounded-lg bg-gray-200 dark:bg-gray-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-5 rounded w-1/3 bg-gray-200 dark:bg-gray-800" />
                                        <div className="h-4 rounded w-full bg-gray-200 dark:bg-gray-800" />
                                        <div className="h-4 rounded w-4/5 bg-gray-200 dark:bg-gray-800" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredNotices.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border bg-slate-50/50 dark:bg-white/[0.01]" style={{ borderColor: "var(--card-border)" }}>
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">No notices found</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                            There are no circulars matching your current search or filter combination.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                                style={{ background: "var(--btn-primary)" }}
                            >
                                <RotateCcw size={12} />
                                Reset all filters
                            </button>
                        )}
                    </div>
                ) : viewMode === "compact" ? (
                    /* Compact List View */
                    <div className="space-y-2.5">
                        {filteredNotices.map((notice, index) => {
                            const permissions = canEditNotice(profile, notice);
                            return (
                                <motion.div
                                    key={notice.id}
                                    id={`notice-${notice.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                    className={`rounded-xl p-3.5 sm:p-4 border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        temporaryHighlightId === notice.id
                                            ? "ring-2 ring-primary border-primary bg-primary/5"
                                            : notice.isUrgent
                                                ? "border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10"
                                                : notice.isPinned
                                                    ? "border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10"
                                                    : ""
                                    }`}
                                    style={{
                                        background: temporaryHighlightId === notice.id || notice.isUrgent || notice.isPinned ? undefined : "var(--card-bg)",
                                        borderColor: "var(--card-border)",
                                    }}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Date Box */}
                                        <div className="flex-shrink-0 w-12 text-center py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/5">
                                            <span className="block text-[10px] uppercase font-bold tracking-wider">
                                                {formatDate(notice.date).split(" ")[0]?.slice(0, 3)}
                                            </span>
                                            <span className="block text-sm font-black text-gray-800 dark:text-gray-200">
                                                {formatDate(notice.date).split(" ")[1]?.replace(",", "")}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                <span
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                                    style={{ backgroundColor: notice.collegeColor || "#1e3a8a" }}
                                                >
                                                    {notice.college.split(", ").pop()}
                                                </span>
                                                <span className="badge badge-primary text-[9px] font-semibold">
                                                    {notice.programme === "BEdHonours" ? "B.Ed Honours" : notice.programme === "MEd" ? "M.Ed" : "All"}
                                                </span>
                                                {notice.isUrgent && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                                                        <AlertTriangle size={10} /> Urgent
                                                    </span>
                                                )}
                                                {notice.isPinned && !notice.isUrgent && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                                                        <Pin size={10} /> Pinned
                                                    </span>
                                                )}
                                                {notice.thumbnailUrl && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                                                        <ImageIcon size={10} /> Routine/Image
                                                    </span>
                                                )}
                                                {notice.attachmentUrl && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                                                        <FileText size={10} /> PDF
                                                    </span>
                                                )}
                                            </div>

                                            <h4 
                                                onClick={() => {
                                                    if (notice.thumbnailUrl) {
                                                        setSelectedImageForLightbox(notice.thumbnailUrl);
                                                    }
                                                }}
                                                className={`text-sm sm:text-base font-bold text-gray-900 dark:text-white font-bangla truncate ${
                                                    notice.thumbnailUrl ? "cursor-pointer hover:text-primary transition-colors" : ""
                                                }`}
                                            >
                                                {notice.title}
                                            </h4>

                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-bangla">
                                                {notice.body}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions on Compact Row */}
                                    <div className="flex items-center gap-1 self-end sm:self-center flex-shrink-0">
                                        {notice.thumbnailUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedImageForLightbox(notice.thumbnailUrl || null)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                                                title="Preview Full Routine"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleSaveNotice(notice.id)}
                                            className={`p-1.5 rounded-lg transition-all ${
                                                savedNoticeIds.includes(notice.id)
                                                    ? "text-primary bg-primary/10"
                                                    : "text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10"
                                            }`}
                                            title="Bookmark"
                                        >
                                            <Bookmark size={14} className={savedNoticeIds.includes(notice.id) ? "fill-primary" : ""} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleShareNotice(notice)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                                            title="Share"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLink(notice.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                                            title="Copy Link"
                                        >
                                            {copiedNoticeId === notice.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    /* Card Feed View */
                    <div className="space-y-5">
                        {filteredNotices.map((notice, index) => {
                            const permissions = canEditNotice(profile, notice);
                            return (
                                <motion.div
                                    key={notice.id}
                                    id={`notice-${notice.id}`}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                                    className={`relative rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
                                        temporaryHighlightId === notice.id
                                            ? "ring-4 ring-primary ring-offset-4 dark:ring-offset-[#12131a] shadow-xl scale-[1.005]"
                                            : targetNoticeId === notice.id
                                                ? "ring-2 ring-primary border-primary/50"
                                                : notice.isUrgent
                                                    ? "border-red-300 dark:border-red-900/50 shadow-red-500/5"
                                                    : notice.isPinned
                                                        ? "border-indigo-300 dark:border-indigo-900/50"
                                                        : "hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                    style={{
                                        background: "var(--card-bg)",
                                        borderColor: temporaryHighlightId === notice.id ? undefined : targetNoticeId === notice.id ? undefined : notice.isUrgent ? undefined : notice.isPinned ? undefined : "var(--card-border)",
                                    }}
                                >
                                    {/* Top Alert Banner */}
                                    {notice.isUrgent && (
                                        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold shadow-xs">
                                            <span className="flex items-center gap-1.5">
                                                <AlertTriangle size={13} className="animate-pulse" />
                                                URGENT NOTICE
                                            </span>
                                            <span className="text-[10px] tracking-wider uppercase font-semibold text-white/90">Priority Circular</span>
                                        </div>
                                    )}

                                    {notice.isPinned && !notice.isUrgent && (
                                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold shadow-xs">
                                            <span className="flex items-center gap-1.5">
                                                <Pin size={13} />
                                                PINNED TO TOP
                                            </span>
                                            <span className="text-[10px] tracking-wider uppercase font-semibold text-white/90">Important</span>
                                        </div>
                                    )}

                                    <div className="p-5 sm:p-6">
                                        {/* Card Header Row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* College Badge */}
                                                <div
                                                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-white text-xs font-bold shadow-xs"
                                                    style={{ backgroundColor: notice.collegeColor || "#1e3a8a" }}
                                                >
                                                    <Building2 size={12} />
                                                    <span>{notice.college.split(", ").pop()}</span>
                                                </div>

                                                <span className="badge badge-primary text-[10px] font-bold">
                                                    {notice.programme === "BEdHonours" ? "B.Ed Honours" : notice.programme === "MEd" ? "M.Ed" : notice.programme === "BEd" ? "B.Ed" : "All Programmes"}
                                                </span>

                                                {(notice.visibility === "campus" || notice.visibility === "private") && (
                                                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                                                        <School size={10} /> Campus Only
                                                    </span>
                                                )}

                                                {notice.status === "pending" && (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                                                        Pending Approval
                                                    </span>
                                                )}

                                                {notice.status === "rejected" && (
                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                                                        Rejected
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 hidden xs:flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(notice.date)}
                                                </span>

                                                {/* 3-Dot Action Menu */}
                                                <div className="relative" data-notice-menu>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownNoticeId(activeDropdownNoticeId === notice.id ? null : notice.id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                                                        title="More options"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdownNoticeId === notice.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            className="absolute right-0 mt-1 w-44 rounded-xl shadow-xl border bg-white dark:bg-[#161720] border-gray-100 dark:border-white/10 py-1.5 z-40"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleCopyLink(notice.id);
                                                                    setActiveDropdownNoticeId(null);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                                                            >
                                                                {copiedNoticeId === notice.id ? (
                                                                    <Check size={14} className="text-green-500" />
                                                                ) : (
                                                                    <Copy size={14} className="text-gray-400" />
                                                                )}
                                                                <span>{copiedNoticeId === notice.id ? "Link Copied!" : "Copy Link"}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleShareNotice(notice);
                                                                    setActiveDropdownNoticeId(null);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Share2 size={14} className="text-gray-400" />
                                                                <span>Share Notice</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleSaveNotice(notice.id);
                                                                    setActiveDropdownNoticeId(null);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Bookmark size={14} className={`text-gray-400 ${savedNoticeIds.includes(notice.id) ? "fill-primary text-primary" : ""}`} />
                                                                <span>{savedNoticeIds.includes(notice.id) ? "Remove Bookmark" : "Bookmark Notice"}</span>
                                                            </button>

                                                            {permissions.canEdit && editingNoticeId !== notice.id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleEditStart(notice);
                                                                        setActiveDropdownNoticeId(null);
                                                                    }}
                                                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2 transition-colors border-t border-gray-100 dark:border-white/5"
                                                                >
                                                                    <Edit2 size={14} />
                                                                    <span>Edit Notice</span>
                                                                </button>
                                                            )}

                                                            {permissions.canDelete && editingNoticeId !== notice.id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleDelete(notice.id);
                                                                        setActiveDropdownNoticeId(null);
                                                                    }}
                                                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors border-t border-gray-100 dark:border-white/5"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    <span>Delete Notice</span>
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {editingNoticeId === notice.id ? (
                                            <div className="mt-4 space-y-4 pr-0 block relative z-30">
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
                                                        className="w-full px-4 py-3 border rounded-2xl text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed font-bangla"
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
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Thumbnail (Optional)</label>
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
                                                        <div className="relative group/thumb rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-2">
                                                            <img 
                                                                src={editThumbnailPreview} 
                                                                alt="Preview" 
                                                                className="w-full h-auto max-h-[220px] object-contain rounded-lg"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    setEditThumbnailFile(null);
                                                                    setEditThumbnailPreview(null);
                                                                }}
                                                                className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
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
                                            /* Normal Notice Display (Harmonious, Content-Adaptive Layout for Desktop & Mobile) */
                                            <div className="mt-3">
                                                {/* Notice Title */}
                                                <h3 className="text-lg sm:text-xl font-bold font-bangla text-gray-900 dark:text-white tracking-tight leading-snug">
                                                    {notice.title}
                                                </h3>

                                                {/* Notice Body with Expand/Collapse */}
                                                <div className="text-xs sm:text-sm mt-2 text-gray-600 dark:text-gray-300 font-bangla leading-relaxed whitespace-pre-line">
                                                    {notice.body.length > 280 && !expandedNoticeIds[notice.id] ? (
                                                        <>
                                                            {notice.body.slice(0, 280)}...
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpandNotice(notice.id)}
                                                                className="ml-1.5 text-primary font-bold hover:underline inline-flex items-center gap-0.5 text-xs"
                                                            >
                                                                Read more <ChevronDown size={12} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {notice.body}
                                                            {notice.body.length > 280 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandNotice(notice.id)}
                                                                    className="ml-2 text-primary font-bold hover:underline inline-flex items-center gap-0.5 text-xs"
                                                                >
                                                                    Show less <ChevronUp size={12} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Routine / Document Attachment Showcase (Framed & Proportioned) */}
                                                {notice.thumbnailUrl && (
                                                    <div className="mt-4 flex justify-center">
                                                        <div className="w-full max-w-xl rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 shadow-xs hover:shadow-md transition-all">
                                                            {/* Top Inspection Header */}
                                                            <div className="px-3.5 py-2 bg-slate-100/90 dark:bg-white/[0.03] border-b border-gray-200/70 dark:border-white/10 flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                                                                    <ImageIcon size={14} className="text-primary" />
                                                                    <span className="text-[11px] sm:text-xs">Official Routine / Circular Document</span>
                                                                </div>
                                                                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                    <Maximize2 size={11} /> Click to expand
                                                                </span>
                                                            </div>

                                                            {/* Document Preview Frame */}
                                                            <div 
                                                                onClick={() => setSelectedImageForLightbox(notice.thumbnailUrl || null)}
                                                                className="relative w-full cursor-zoom-in group flex items-center justify-center p-2.5 sm:p-4 bg-gradient-to-b from-slate-100/50 to-slate-200/20 dark:from-white/[0.01] dark:to-white/[0.02]"
                                                            >
                                                                <img 
                                                                    src={notice.thumbnailUrl} 
                                                                    alt={notice.title} 
                                                                    className="w-auto h-auto max-h-[380px] sm:max-h-[440px] max-w-full object-contain rounded-lg shadow-xs group-hover:scale-[1.01] transition-transform duration-200" 
                                                                    loading="lazy"
                                                                />
                                                                {/* Hover lens */}
                                                                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                                                                    <div className="px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-md text-white flex items-center gap-2 text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                                                                        <Maximize2 size={13} />
                                                                        Click to open full resolution
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Action Bar */}
                                                            <div className="px-3.5 py-2 bg-slate-100/90 dark:bg-white/[0.03] border-t border-gray-200/80 dark:border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
                                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">Uncropped high-res scan</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedImageForLightbox(notice.thumbnailUrl || null)}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all text-xs font-semibold shadow-xs"
                                                                    >
                                                                        <Maximize2 size={12} />
                                                                        Zoom Lightbox
                                                                    </button>
                                                                    <a
                                                                        href={notice.thumbnailUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-all text-xs"
                                                                        title="Open original file in new tab"
                                                                    >
                                                                        <ExternalLink size={12} />
                                                                        Open File
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PDF Attachment Card if present */}
                                                {notice.attachmentUrl && (
                                                    <a 
                                                        href={notice.attachmentUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="group flex items-center gap-3 mt-4 p-3 rounded-xl border bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all border-dashed max-w-md"
                                                        style={{ borderColor: "var(--card-border)" }}
                                                    >
                                                        <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform flex-shrink-0">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                Official PDF Attachment
                                                                <ExternalLink size={11} className="text-gray-400 group-hover:text-primary transition-colors" />
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                                {notice.attachmentUrl}
                                                            </p>
                                                        </div>
                                                    </a>
                                                )}

                                                {/* Card Footer: Metadata & Quick Actions */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
                                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                        <span className="flex items-center gap-1.5">
                                                            <User size={12} className="text-gray-400" />
                                                            {notice.authorId ? (
                                                                <Link href={`/profile/${notice.authorId}`} className="hover:underline hover:text-primary transition-colors font-medium text-gray-600 dark:text-gray-300">
                                                                    {notice.postedBy}
                                                                </Link>
                                                            ) : (
                                                                <span className="font-medium text-gray-600 dark:text-gray-300">{notice.postedBy}</span>
                                                            )}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {formatDate(notice.date)}
                                                        </span>
                                                        {notice.approvedByName && (
                                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                                <Shield size={12} />
                                                                Approved
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveNotice(notice.id)}
                                                            className={`p-2 rounded-lg border transition-all ${
                                                                savedNoticeIds.includes(notice.id)
                                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                                    : "bg-slate-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 border-transparent"
                                                            }`}
                                                            title={savedNoticeIds.includes(notice.id) ? "Remove Bookmark" : "Bookmark Notice"}
                                                        >
                                                            <Bookmark size={14} className={savedNoticeIds.includes(notice.id) ? "fill-primary" : ""} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleShareNotice(notice)}
                                                            className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 border border-transparent transition-all"
                                                            title="Share Notice"
                                                        >
                                                            <Share2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyLink(notice.id)}
                                                            className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-gray-400 hover:text-primary hover:bg-primary/10 border border-transparent transition-all"
                                                            title="Copy Link"
                                                        >
                                                            {copiedNoticeId === notice.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
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
