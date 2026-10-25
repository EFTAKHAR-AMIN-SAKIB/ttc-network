"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    BookOpen, Video, Calendar, Clock, Loader2, Sparkles,
    FileText, Pencil, ImageIcon, School, ShoppingBag,
    UploadCloud, Paperclip, Tag, Check, ChevronDown, Phone,
    MessageCircle, MapPin, CheckCircle2, DollarSign
} from "lucide-react";
import { createStudyPost, updateStudyPost, type FirestoreStudyPost } from "@/lib/firestore";
import { uploadFile, deleteFromStorage } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

interface StudyPostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    editPost?: (FirestoreStudyPost & { id: string }) | null;
    existingCategories?: string[];
    initialTab?: "material" | "schedule" | "marketplace";
    onSuccess?: (message: string) => void;
}

export default function StudyPostCreationModal({ 
    isOpen, 
    onClose, 
    profile, 
    editPost, 
    existingCategories = [], 
    initialTab = "material",
    onSuccess 
}: StudyPostCreationModalProps) {
    const resolvedInitialTab: "material" | "schedule" | "marketplace" = 
        initialTab === "schedule" ? "schedule" : initialTab === "marketplace" ? "marketplace" : "material";
    const [tab, setTab] = useState<"material" | "schedule" | "marketplace">(resolvedInitialTab);
    
    // Core fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");
    const [materialType, setMaterialType] = useState<"doc" | "video" | "link">("doc");
    const [category, setCategory] = useState<string>("notes");
    const [programme, setProgramme] = useState<string>("all");
    const [startTime, setStartTime] = useState("");
    const [privacy, setPrivacy] = useState<"public" | "campus">("public");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCategoryFocused, setIsCategoryFocused] = useState(false);
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    // Marketplace specific fields
    const [price, setPrice] = useState<number | "">("");
    const [originalPrice, setOriginalPrice] = useState<number | "">("");
    const [pricingType, setPricingType] = useState<"fixed" | "negotiable" | "free">("negotiable");
    const [condition, setCondition] = useState<"new" | "like_new" | "good" | "fair">("good");
    const [itemCategory, setItemCategory] = useState<string>("textbook");
    const [edition, setEdition] = useState<string>("");
    const [contactPhone, setContactPhone] = useState<string>("");
    const [contactWhatsapp, setContactWhatsapp] = useState<string>("");
    const [location, setLocation] = useState<string>("");

    // Lock body scroll & trigger mobile dock/navbar hide while modal is open
    useEffect(() => {
        if (isOpen) {
            window.dispatchEvent(new CustomEvent("ttc-composer-toggle", { detail: { open: true } }));
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                window.dispatchEvent(new CustomEvent("ttc-composer-toggle", { detail: { open: false } }));
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSubmitting && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    // Compute unique existing custom categories
    const availableCustomCategories = useMemo(() => {
        const standard = new Set(['notes', 'suggestion', 'books', 'question', 'other']);
        const customList = (existingCategories || []).filter(c => c && !standard.has(c.trim().toLowerCase()));
        const seen = new Set<string>();
        const result: string[] = [];
        for (const item of customList) {
            const lower = item.trim().toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                result.push(item.trim());
            }
        }
        return result;
    }, [existingCategories]);

    // Matching custom categories based ONLY on what the user enters (keyword search)
    const matchingCustomCategories = useMemo(() => {
        const query = (tab === "marketplace" ? itemCategory : category).trim().toLowerCase();
        if (!query) return [];
        return availableCustomCategories.filter(cat => cat.toLowerCase().includes(query));
    }, [tab, itemCategory, category, availableCustomCategories]);

    useEffect(() => {
        if (isOpen) {
            const verified = requireVerification("share study resources");
            if (!verified) {
                onClose();
            }
        }
    }, [isOpen]);
    
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [isFetchingLink, setIsFetchingLink] = useState(false);

    // Document R2 upload states
    const [uploadType, setUploadType] = useState<"file" | "link">("file");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    // Sync with editPost or Reset on close
    useEffect(() => {
        if (isOpen) {
            if (editPost) {
                setTab(editPost.type);
                setTitle(editPost.title);
                setDescription(editPost.content);
                setLink(editPost.link || "");
                setMaterialType((editPost.materialType as any) || "doc");
                setCategory(editPost.category || "notes");
                setProgramme(editPost.yearRelevance || "all");
                
                // Format startTime for datetime-local input
                let dateValue = "";
                if (editPost.startTime) {
                    const d = typeof (editPost.startTime as any).toDate === 'function' 
                        ? (editPost.startTime as any).toDate() 
                        : new Date(editPost.startTime);
                    if (!isNaN(d.getTime())) {
                        const tzoffset = d.getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
                        dateValue = localISOTime;
                    }
                }
                setStartTime(dateValue);
                if (editPost.fileUrl) {
                    setUploadType("file");
                } else if (editPost.link) {
                    setUploadType("link");
                }
                setPrivacy((editPost.privacy || "public") as any);
                if (editPost.thumbnailUrl) {
                    setThumbnailPreview(editPost.thumbnailUrl);
                } else {
                    setThumbnailPreview(null);
                }
                setSelectedFile(null);

                // Marketplace fields if editing a marketplace post
                if (editPost.type === "marketplace") {
                    setPrice(editPost.price !== undefined ? editPost.price : "");
                    setOriginalPrice(editPost.originalPrice !== undefined ? editPost.originalPrice : "");
                    setPricingType(editPost.pricingType || "negotiable");
                    setCondition(editPost.condition || "good");
                    setItemCategory(editPost.itemCategory || editPost.category || "textbook");
                    setEdition(editPost.edition || "");
                    setContactPhone(editPost.contactPhone || "");
                    setContactWhatsapp(editPost.contactWhatsapp || "");
                    setLocation(editPost.location || "");
                }
            } else {
                setTab(resolvedInitialTab);
                setTitle("");
                setDescription("");
                setLink("");
                setStartTime("");
                setMaterialType("doc");
                setCategory("notes");
                setProgramme("all");
                setPrivacy("public");
                setLinkPreview(null);
                removeThumbnail();
                setUploadType("file");
                setSelectedFile(null);

                // Default marketplace state
                setPrice("");
                setOriginalPrice("");
                setPricingType("negotiable");
                setCondition("good");
                setItemCategory("textbook");
                setEdition("");
                setContactPhone(profile?.phone || "");
                setContactWhatsapp(profile?.phone || "");
                setLocation(profile?.collegeName ? `${profile.collegeName} Campus` : "");
            }
        }
    }, [isOpen, editPost, resolvedInitialTab]);

    // Handle thumbnail selection
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast("Please upload a valid image file.", "info");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast("Thumbnail must be smaller than 5MB", "info");
                return;
            }
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    // Handle document drag & drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleFileSelect = (file: File) => {
        const allowedTypes = new Set([
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/plain"
        ]);
        const allowedExtensions = new Set(["pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "txt"]);
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        if (!allowedTypes.has(file.type) && !allowedExtensions.has(ext)) {
            showToast("Unsupported file type. Allowed: PDF, DOCX, PPTX, XLSX, TXT.", "info");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            showToast("File size exceeds 50MB limit.", "info");
            return;
        }

        setSelectedFile(file);
        if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(cleanName);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast("Title is required", "error");
            return;
        }

        if (tab === "marketplace") {
            if (pricingType !== "free" && (price === "" || Number(price) < 0)) {
                showToast("Please enter a valid selling price.", "error");
                return;
            }
            if (!contactPhone.trim()) {
                showToast("Please enter a contact phone number for buyers.", "error");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // 1. Upload thumbnail if new one provided
            let thumbnailUrl = editPost?.thumbnailUrl || "";
            if (thumbnailFile) {
                thumbnailUrl = await uploadFile("study_thumbnails", thumbnailFile);
            }

            // 2. Upload study file if upload type is file
            let finalLink = link.trim();
            let fileUrl = editPost?.fileUrl || "";
            let fileName = editPost?.fileName || "";
            let fileSize = editPost?.fileSize || 0;
            let fileType = editPost?.fileType || "";

            if (tab === "material") {
                if (uploadType === "file") {
                    if (selectedFile) {
                        const fileFormData = new FormData();
                        fileFormData.append("file", selectedFile);
                        const uploadRes = await fetch("/api/study/upload", {
                            method: "POST",
                            body: fileFormData,
                        });
                        if (!uploadRes.ok) {
                            const errorData = await uploadRes.json().catch(() => ({}));
                            throw new Error(errorData.error || "File upload failed");
                        }
                        const uploadResult = await uploadRes.json();
                        fileUrl = uploadResult.url;
                        fileName = uploadResult.name || selectedFile.name;
                        fileSize = uploadResult.size || selectedFile.size;
                        fileType = uploadResult.type || selectedFile.type;
                        finalLink = fileUrl;
                        
                        if (editPost?.fileUrl) {
                            await deleteFromStorage(editPost.fileUrl).catch(e => console.error("Failed to delete old study file:", e));
                        }
                    } else if (!editPost?.fileUrl) {
                        throw new Error("Please select a file to upload.");
                    }
                } else {
                    fileUrl = "";
                    fileName = "";
                    fileSize = 0;
                    fileType = "";
                    
                    if (editPost?.fileUrl) {
                        await deleteFromStorage(editPost.fileUrl).catch(e => console.error("Failed to delete old study file:", e));
                    }
                }
            }

            const postData: any = {
                type: tab,
                title: title.trim(),
                content: description.trim(),
                link: finalLink,
                privacy,
                collegeId: profile?.collegeId,
                collegeName: profile?.collegeName,
                thumbnailUrl: thumbnailUrl,
                linkPreview: linkPreview || { 
                    title, 
                    description: description.slice(0, 100), 
                    thumbnail: "", 
                    domain: finalLink ? (finalLink.startsWith('http') ? new URL(finalLink).hostname : "ttcnetwork.com") : "ttcnetwork.com" 
                },
                fileUrl,
                fileName,
                fileSize,
                fileType,
                yearRelevance: programme,
            };

            if (tab === "material") {
                postData.materialType = materialType;
                postData.category = category.trim().toLowerCase() || "notes";
            } else if (tab === "schedule") {
                postData.startTime = startTime;
            } else if (tab === "marketplace") {
                postData.price = pricingType === "free" ? 0 : Number(price);
                if (originalPrice !== "" && Number(originalPrice) > 0) {
                    postData.originalPrice = Number(originalPrice);
                }
                postData.pricingType = pricingType;
                postData.condition = condition;
                postData.itemCategory = itemCategory;
                postData.category = itemCategory;
                postData.edition = edition.trim();
                postData.contactPhone = contactPhone.trim();
                postData.contactWhatsapp = (contactWhatsapp || contactPhone).trim();
                postData.location = location.trim();
                postData.isSold = editPost?.isSold || false;
            }

            if (editPost) {
                await updateStudyPost(editPost.id, postData);
                onSuccess?.("✅ Post updated successfully!");
            } else {
                await createStudyPost(postData);
                onSuccess?.(tab === "marketplace" ? "✅ Listing posted for review!" : "✅ Post submitted for review!");
            }
            
            onClose();
        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Failed to share study post. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.98 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="bg-white dark:bg-[#161822] w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-3xl shadow-2xl border-t sm:border border-gray-200/80 dark:border-gray-800 flex flex-col max-h-[90vh] sm:max-h-[85vh] h-[90vh] sm:h-auto overflow-hidden"
            >
                {/* Mobile Drawer Grabber */}
                <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#161822]/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {editPost ? (
                                <Pencil size={18} />
                            ) : tab === "material" ? (
                                <BookOpen size={18} />
                            ) : tab === "schedule" ? (
                                <Video size={18} className="text-amber-500" />
                            ) : (
                                <ShoppingBag size={18} className="text-emerald-500" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                                {editPost 
                                    ? "Edit Study Post" 
                                    : tab === "material" 
                                        ? "Share Study Material" 
                                        : tab === "schedule" 
                                            ? "Schedule Live Class" 
                                            : "Post Book / Material for Sale"}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 sm:line-clamp-none">
                                {editPost 
                                    ? "Update your published resource or class details" 
                                    : tab === "material" 
                                        ? "Contribute notes, suggestions, or books with TTC students" 
                                        : tab === "schedule"
                                            ? "Host an online study session or exam preparation class"
                                            : "Sell or gift books & study materials to TTC peers"
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
                    {/* Top Segmented Control (if not editing) */}
                    {!editPost && (
                        <div className="grid grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800/90 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                            <button
                                type="button"
                                onClick={() => setTab("material")}
                                className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all cursor-pointer truncate ${
                                    tab === "material"
                                        ? "bg-white dark:bg-gray-700 text-primary dark:text-blue-400 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                }`}
                            >
                                <FileText size={14} className="shrink-0" />
                                <span className="truncate">Resource</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab("schedule")}
                                className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all cursor-pointer truncate ${
                                    tab === "schedule"
                                        ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                }`}
                            >
                                <Video size={14} className="shrink-0" />
                                <span className="truncate">Live Class</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab("marketplace")}
                                className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all cursor-pointer truncate ${
                                    tab === "marketplace"
                                        ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                }`}
                            >
                                <ShoppingBag size={14} className="shrink-0" />
                                <span className="truncate">Buy & Sell</span>
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="study-post-form" className="space-y-4 sm:space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {tab === "material" 
                                    ? "Resource Title" 
                                    : tab === "schedule" 
                                        ? "Class Topic" 
                                        : "Book or Material Name"} <span className="text-red-500">*</span>
                            </label>
                            <input 
                                required
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={
                                    tab === "material" 
                                        ? "e.g., Educational Psychology - Chapter 3 Summary" 
                                        : tab === "schedule" 
                                            ? "e.g., Interactive Prep for National University Final"
                                            : "e.g., B.Ed (Hons) 1st Year Complete Books Set / ড. মুজিবুর রহমান"
                                }
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold outline-none transition-all placeholder:text-gray-400 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* ══════════════════════════════════════
                            1. MATERIAL SPECIFIC FIELDS
                           ══════════════════════════════════════ */}
                        {tab === "material" && (
                            <div className="space-y-4 sm:space-y-5">
                                {/* Material Format */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Format</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'doc', icon: BookOpen, label: 'Document / PDF' },
                                            { id: 'video', icon: Video, label: 'Video Lesson' },
                                            { id: 'link', icon: LinkIcon, label: 'Web Link' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setMaterialType(type.id as any)}
                                                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    materialType === type.id 
                                                        ? 'bg-primary/10 border-primary text-primary font-black shadow-2xs' 
                                                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                }`}
                                            >
                                                <type.icon size={14} />
                                                <span className="truncate">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category & Subject */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Category & Subject</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'notes', label: '📝 Notes' },
                                            { id: 'suggestion', label: '💡 Suggestion' },
                                            { id: 'books', label: '📚 Books' },
                                            { id: 'question', label: '❓ Questions' },
                                            { id: 'other', label: '📁 Other' },
                                            { id: 'custom', label: '✏️ Custom Subject' }
                                        ].map((cat) => {
                                            const isSelected = cat.id === 'custom' 
                                                ? !['notes', 'suggestion', 'books', 'question', 'other'].includes(category.toLowerCase()) 
                                                : category.toLowerCase() === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (cat.id === 'custom') {
                                                            setCategory("");
                                                        } else {
                                                            setCategory(cat.id);
                                                        }
                                                    }}
                                                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                        isSelected 
                                                            ? 'bg-primary/10 border-primary text-primary font-black' 
                                                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {!['notes', 'suggestion', 'books', 'question', 'other'].includes(category.toLowerCase()) && (
                                        <div className="relative mt-2">
                                            <div className="relative flex items-center">
                                                <Tag size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                                                <input 
                                                    type="text"
                                                    required
                                                    placeholder="Type subject name (e.g. Bangla, English, Psychology, History)..."
                                                    value={category}
                                                    onFocus={() => setIsCategoryFocused(true)}
                                                    onBlur={() => setTimeout(() => setIsCategoryFocused(false), 200)}
                                                    onChange={(e) => {
                                                        setCategory(e.target.value);
                                                        setIsCategoryFocused(true);
                                                    }}
                                                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none transition-all"
                                                />
                                            </div>

                                            {isCategoryFocused && matchingCustomCategories.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto">
                                                    {matchingCustomCategories.map((item) => (
                                                        <button
                                                            key={item}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setCategory(item);
                                                                setIsCategoryFocused(false);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-primary/5 hover:text-primary transition-colors flex items-center justify-between"
                                                        >
                                                            <span>{item}</span>
                                                            <Check size={12} className="opacity-40" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Upload Type for Document */}
                                {materialType === "doc" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setUploadType("file")}
                                                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    uploadType === "file"
                                                        ? "bg-primary text-white border-primary shadow-xs"
                                                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/75 dark:border-gray-700/75 text-gray-600 dark:text-gray-400"
                                                }`}
                                            >
                                                <UploadCloud size={14} />
                                                <span>Upload File</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUploadType("link")}
                                                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    uploadType === "link"
                                                        ? "bg-primary text-white border-primary shadow-xs"
                                                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/75 dark:border-gray-700/75 text-gray-600 dark:text-gray-400"
                                                }`}
                                            >
                                                <LinkIcon size={14} />
                                                <span>External URL</span>
                                            </button>
                                        </div>

                                        {uploadType === "file" ? (
                                            <div>
                                                <div
                                                    onDragEnter={handleDrag}
                                                    onDragLeave={handleDrag}
                                                    onDragOver={handleDrag}
                                                    onDrop={handleDrop}
                                                    onClick={() => document.getElementById("study-file-input")?.click()}
                                                    className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all ${
                                                        dragActive
                                                            ? "border-primary bg-primary/5"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50 bg-gray-50/50 dark:bg-gray-800/20"
                                                    }`}
                                                >
                                                    <input
                                                        id="study-file-input"
                                                        type="file"
                                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                                        accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt"
                                                        className="hidden"
                                                    />
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                                                        <Paperclip size={18} />
                                                    </div>
                                                    {selectedFile ? (
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-xs mx-auto">
                                                                {selectedFile.name}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                                                            </p>
                                                        </div>
                                                    ) : editPost?.fileUrl ? (
                                                        <div>
                                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate max-w-xs mx-auto">
                                                                Existing: {editPost.fileName || "Uploaded document"}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">Click to upload replacement file</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                Drag & drop or browse study file
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                                PDF, DOCX, PPTX, XLSX (Max 50MB)
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <input
                                                    type="url"
                                                    value={link}
                                                    onChange={(e) => setLink(e.target.value)}
                                                    placeholder="https://drive.google.com/file/... or website URL"
                                                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(materialType === "video" || materialType === "link") && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {materialType === "video" ? "Video URL (YouTube/Vimeo)" : "Resource URL"} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="url"
                                            required
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                            placeholder="https://youtube.com/watch?v=... or website URL"
                                            className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════
                            2. SCHEDULE SPECIFIC FIELDS
                           ══════════════════════════════════════ */}
                        {tab === "schedule" && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Session Date & Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        required={tab === 'schedule'}
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Meeting Room Link (Google Meet / Zoom) <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        required={tab === 'schedule'}
                                        type="url"
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        placeholder="https://meet.google.com/abc-defg-hij or Zoom URL"
                                        className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════
                            3. MARKETPLACE / BUY & SELL FIELDS
                           ══════════════════════════════════════ */}
                        {tab === "marketplace" && (
                            <div className="space-y-4 pt-1">
                                {/* Item Category & Subject (Matching Resource Tab with Custom Subjects) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Item Category & Subject <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {[
                                            { id: 'textbook', label: '📚 Textbook' },
                                            { id: 'guide', label: '📖 Guide & Questions' },
                                            { id: 'notes', label: '📝 Hand Notes' },
                                            { id: 'practice', label: '🎨 Teaching Practice' },
                                            { id: 'tools', label: '📐 Study Tools' },
                                            { id: 'other', label: '📁 Other' },
                                            { id: 'custom', label: '✏️ Custom Subject' }
                                        ].map((cat) => {
                                            const standard = ['textbook', 'guide', 'notes', 'practice', 'tools', 'other'];
                                            const isSelected = cat.id === 'custom'
                                                ? !standard.includes(itemCategory.toLowerCase())
                                                : itemCategory.toLowerCase() === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (cat.id === 'custom') {
                                                            setItemCategory("");
                                                        } else {
                                                            setItemCategory(cat.id);
                                                        }
                                                    }}
                                                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary/10 border-primary text-primary font-black shadow-2xs'
                                                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <span className="truncate">{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {!['textbook', 'guide', 'notes', 'practice', 'tools', 'other'].includes(itemCategory.toLowerCase()) && (
                                        <div className="relative mt-2">
                                            <div className="relative flex items-center">
                                                <Tag size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Type subject or book category (e.g. Bangla, English, Mathematics, Pedagogy)..."
                                                    value={itemCategory}
                                                    onFocus={() => setIsCategoryFocused(true)}
                                                    onBlur={() => setTimeout(() => setIsCategoryFocused(false), 200)}
                                                    onChange={(e) => {
                                                        setItemCategory(e.target.value);
                                                        setIsCategoryFocused(true);
                                                    }}
                                                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none transition-all"
                                                />
                                            </div>
                                            {/* Auto-suggestions from community */}
                                            {isCategoryFocused && matchingCustomCategories.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-xl z-30 max-h-40 overflow-y-auto p-1 space-y-0.5">
                                                    {matchingCustomCategories.map(s => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setItemCategory(s);
                                                                setIsCategoryFocused(false);
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span>🏷️ {s}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Condition */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Item Condition
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { id: 'new', label: '✨ Brand New' },
                                            { id: 'like_new', label: '⭐ Like New' },
                                            { id: 'good', label: '👍 Good' },
                                            { id: 'fair', label: '📖 Acceptable' }
                                        ].map((cond) => (
                                            <button
                                                key={cond.id}
                                                type="button"
                                                onClick={() => setCondition(cond.id as any)}
                                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                                                    condition === cond.id
                                                        ? "bg-primary text-white border-primary shadow-xs font-black"
                                                        : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                                                }`}
                                            >
                                                <span>{cond.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price & Pricing Type */}
                                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                            Pricing Flexibility
                                        </label>
                                        <div className="flex items-center gap-1 bg-white/80 dark:bg-black/30 p-0.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                                            {[
                                                { id: 'negotiable', label: 'Negotiable' },
                                                { id: 'fixed', label: 'Fixed Price' },
                                                { id: 'free', label: 'Free Gift' }
                                            ].map((pt) => (
                                                <button
                                                    key={pt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPricingType(pt.id as any);
                                                        if (pt.id === 'free') setPrice(0);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                        pricingType === pt.id
                                                            ? "bg-emerald-600 text-white shadow-xs"
                                                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                                                    }`}
                                                >
                                                    {pt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {pricingType !== "free" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                                    Selling Price (BDT ৳) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600">৳</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        required
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                                        placeholder="e.g. 250"
                                                        className="w-full bg-white dark:bg-gray-900 border border-emerald-300/60 dark:border-emerald-800/60 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                                    Original / MRP Price (Optional)
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={originalPrice}
                                                        onChange={(e) => setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                                        placeholder="e.g. 450"
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Edition & Location */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                            Edition / Publisher (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={edition}
                                            onChange={(e) => setEdition(e.target.value)}
                                            placeholder="e.g. 2023 Edition / ড. মোহাম্মদ আলী"
                                            className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                            Handover / Pickup Location
                                        </label>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                placeholder="e.g. Dhaka TTC Campus Gate / Courier"
                                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary rounded-xl pl-8 pr-3.5 py-2 text-xs font-medium outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Phone & WhatsApp */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-gray-200/70 dark:border-gray-800">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1.5">
                                            <Phone size={13} className="text-primary" />
                                            <span>Contact Phone Number <span className="text-red-500">*</span></span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            placeholder="017XXXXXXXX"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-primary rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1.5">
                                            <MessageCircle size={13} className="text-emerald-500" />
                                            <span>WhatsApp Number (Optional)</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={contactWhatsapp}
                                            onChange={(e) => setContactWhatsapp(e.target.value)}
                                            placeholder="017XXXXXXXX (for 1-click chat)"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Target Academic Programme */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Academic Programme</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                {[
                                    { id: 'all', label: '🌐 All Programmes' },
                                    { id: 'BEdHonours', label: '🎓 B.Ed Honours' },
                                    { id: 'BEdGeneral', label: '📖 B.Ed General' },
                                    { id: 'MEd', label: '🏛️ M.Ed' }
                                ].map((prog) => (
                                    <button
                                        key={prog.id}
                                        type="button"
                                        onClick={() => setProgramme(prog.id)}
                                        className={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer truncate ${
                                            programme === prog.id 
                                                ? 'bg-primary/10 border-primary text-primary font-black shadow-2xs' 
                                                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        {prog.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description / Highlights */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {tab === "material" 
                                    ? "Description & Topics (Optional)" 
                                    : tab === "schedule" 
                                        ? "Session Agenda & Outline (Optional)"
                                        : "Item Description & Details (Optional)"}
                            </label>
                            <textarea 
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={
                                    tab === "material" 
                                        ? "Highlight key topics, semester relevance, or important chapters covered..." 
                                        : tab === "schedule" 
                                            ? "List the topics you'll cover and what attendees should prepare..."
                                            : "Mention condition, whether highlighted or marked, reason for selling, courier options..."
                                }
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl px-4 py-2.5 text-xs font-medium outline-none transition-all resize-none text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Thumbnail / Book Photo */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                <span>{tab === "marketplace" ? "Book / Material Photo" : "Cover Image"} (Optional)</span>
                                <span className="text-[10px] text-gray-400 font-normal">PNG, JPG up to 5MB</span>
                            </label>
                            <input 
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="hidden"
                                id="study-thumbnail-input"
                            />
                            {thumbnailPreview ? (
                                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-36 flex items-center justify-center p-2">
                                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                                        title="Remove photo"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 rounded-xl transition-all text-xs font-bold text-gray-500 hover:text-primary cursor-pointer"
                                >
                                    <ImageIcon size={16} />
                                    <span>{tab === "marketplace" ? "Upload Real Photo of the Book" : "Upload Cover Thumbnail"}</span>
                                </button>
                            )}
                        </div>

                        {/* Campus Visibility Selection */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Audience Scope</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setPrivacy("public")}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        privacy === "public" 
                                            ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs" 
                                            : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                                    }`}
                                >
                                    <Globe size={18} className="shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">All TTCs (Public)</p>
                                        <p className="text-[10px] text-gray-400 font-normal truncate">Visible to entire community</p>
                                    </div>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPrivacy("campus")}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        privacy === "campus" 
                                            ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs" 
                                            : "bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                                    }`}
                                >
                                    <School size={18} className="shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">My College Only</p>
                                        <p className="text-[10px] text-gray-400 font-normal truncate">
                                            {profile?.collegeName || "Campus only"}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Sticky Action Footer */}
                <div 
                    className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between sm:justify-end gap-3 shrink-0 bg-white/95 dark:bg-[#161822]/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20"
                    style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))" }}
                >
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="study-post-form"
                        disabled={
                            !title.trim() || 
                            (tab === 'material' && materialType === 'doc' && uploadType === 'file' && !selectedFile && !editPost?.fileUrl) ||
                            (tab === 'material' && materialType === 'doc' && uploadType === 'link' && !link.trim()) ||
                            (tab === 'material' && (materialType === 'video' || materialType === 'link') && !link.trim()) ||
                            (tab === 'schedule' && (!startTime.trim() || !link.trim())) ||
                            (tab === 'marketplace' && ((pricingType !== 'free' && (price === '' || Number(price) < 0)) || !contactPhone.trim())) ||
                            isSubmitting
                        }
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <span>
                                    {editPost 
                                        ? 'Update Post' 
                                        : tab === 'material' 
                                            ? 'Publish Material' 
                                            : tab === 'schedule' 
                                                ? 'Schedule Class' 
                                                : 'Post for Sale'}
                                </span> 
                                <Send size={14} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
