"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    BookOpen, Video, Calendar, Clock, Loader2, Sparkles,
    FileText, Pencil, ImageIcon, School,
    UploadCloud, Paperclip, Tag, Check, ChevronDown
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
    initialTab?: "material" | "schedule";
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
    const resolvedInitialTab: "material" | "schedule" = initialTab === "schedule" ? "schedule" : "material";
    const [tab, setTab] = useState<"material" | "schedule">(resolvedInitialTab);
    
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
        const query = category.trim().toLowerCase();
        if (!query) return [];
        return availableCustomCategories.filter(cat => cat.toLowerCase().includes(query));
    }, [category, availableCustomCategories]);

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
                
                // Format startTime for the datetime-local input (yyyy-MM-ddThh:mm)
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
            } else {
                setTab(initialTab === "schedule" ? "schedule" : "material");
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
            }
        }
    }, [isOpen, editPost, initialTab]);

    // Link preview effect
    useEffect(() => {
        if (!link || !link.startsWith('http')) {
            setLinkPreview(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsFetchingLink(true);
            try {
                const res = await fetch(`/api/og-preview?url=${encodeURIComponent(link)}`);
                if (res.ok) {
                    const data = await res.json();
                    setLinkPreview(data);
                }
            } catch (err) {
                console.error("Link preview error:", err);
            } finally {
                setIsFetchingLink(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [link]);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast("Please upload a valid image file.", "info");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast("Image size must be less than 5MB.", "info");
                return;
            }
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = "";
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
        const dot = file.name.lastIndexOf(".");
        const ext = dot > 0 ? file.name.substring(dot + 1).toLowerCase() : "";
        const allowedExtensions = new Set(["pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "txt"]);

        if (!allowedTypes.has(file.type) && !allowedExtensions.has(ext)) {
            showToast("Unsupported file type. Allowed: PDF, DOCX, PPTX, XLSX, TXT.", "info");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            showToast("File size must be under 50MB.", "info");
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 1. Upload thumbnail if a new file was selected
            let thumbnailUrl = editPost?.thumbnailUrl || "";
            if (thumbnailFile) {
                const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                thumbnailUrl = resultUrl;
                if (editPost?.thumbnailUrl) {
                    await deleteFromStorage(editPost.thumbnailUrl).catch(e => console.error("Failed to delete old thumbnail:", e));
                }
            } else if (!thumbnailPreview && editPost?.thumbnailUrl) {
                thumbnailUrl = "";
                await deleteFromStorage(editPost.thumbnailUrl).catch(e => console.error("Failed to delete old thumbnail:", e));
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
            }
            if (tab === "schedule") postData.startTime = startTime;

            if (editPost) {
                await updateStudyPost(editPost.id, postData);
                onSuccess?.("✅ Post updated successfully!");
            } else {
                await createStudyPost(postData);
                onSuccess?.("✅ Post submitted for review!");
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-[#161822] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#161822]/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {editPost ? (
                                <Pencil size={20} />
                            ) : tab === "material" ? (
                                <BookOpen size={20} />
                            ) : (
                                <Video size={20} className="text-amber-500" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                {editPost ? "Edit Study Post" : tab === "material" ? "Share Study Material" : "Schedule Live Class"}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {editPost 
                                    ? "Update your published resource or class details" 
                                    : tab === "material" 
                                        ? "Contribute notes, suggestions, or books with TTC students" 
                                        : "Host an online study session or exam preparation class"
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Top Segmented Control (if not editing) */}
                    {!editPost && (
                        <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800/90 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                            <button
                                type="button"
                                onClick={() => setTab("material")}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    tab === "material"
                                        ? "bg-white dark:bg-gray-700 text-primary dark:text-blue-400 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                }`}
                            >
                                <FileText size={15} />
                                <span>Study Material</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab("schedule")}
                                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    tab === "schedule"
                                        ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                }`}
                            >
                                <Video size={15} />
                                <span>Live Prep Class</span>
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="study-post-form" className="space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {tab === "material" ? "Resource Title" : "Class Topic"} <span className="text-red-500">*</span>
                            </label>
                            <input 
                                required
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={tab === "material" ? "e.g., Educational Psychology - Chapter 3 Summary" : "e.g., Interactive Prep for National University Final"}
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all"
                            />
                        </div>

                        {/* Material Specific Fields */}
                        {tab === "material" ? (
                            <div className="space-y-5">
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
                                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    materialType === type.id 
                                                        ? 'bg-primary/10 border-primary text-primary font-black shadow-2xs' 
                                                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                }`}
                                            >
                                                <type.icon size={15} />
                                                <span>{type.label}</span>
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
                                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
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
                                    
                                    {/* Custom subject input with autocomplete suggestions */}
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

                                            <AnimatePresence>
                                                {isCategoryFocused && category.trim().length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto p-1 space-y-1"
                                                    >
                                                        {matchingCustomCategories.length > 0 ? (
                                                            <>
                                                                <div className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                                    Existing Subjects
                                                                </div>
                                                                {matchingCustomCategories.map((suggestion) => (
                                                                    <button
                                                                        key={suggestion}
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setCategory(suggestion);
                                                                            setIsCategoryFocused(false);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between cursor-pointer"
                                                                    >
                                                                        <span className="capitalize">{suggestion}</span>
                                                                        <Check size={13} className="text-primary" />
                                                                    </button>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                                                                <Sparkles size={14} className="shrink-0 text-amber-500" />
                                                                <span>Create subject: &quot;{category.trim()}&quot;</span>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                {/* Target Programme */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Academic Programme</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'all', label: '🌐 All Programmes' },
                                            { id: 'bed_hons', label: '🎓 B.Ed Honours' },
                                            { id: 'bed', label: '📖 B.Ed General' },
                                            { id: 'med', label: '🏛️ M.Ed' }
                                        ].map((prog) => (
                                            <button
                                                key={prog.id}
                                                type="button"
                                                onClick={() => setProgramme(prog.id)}
                                                className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
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

                                {/* File Upload vs Link for Documents */}
                                {materialType === "doc" ? (
                                    <div className="space-y-3">
                                        <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                                            <button 
                                                type="button"
                                                onClick={() => setUploadType("file")}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    uploadType === "file" 
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" 
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                                                }`}
                                            >
                                                <UploadCloud size={14} /> Upload File
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setUploadType("link")}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    uploadType === "link" 
                                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs" 
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                                                }`}
                                            >
                                                <LinkIcon size={14} /> Web Link
                                            </button>
                                        </div>

                                        {uploadType === "file" ? (
                                            <div 
                                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                                onDragLeave={() => setDragActive(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setDragActive(false);
                                                    const file = e.dataTransfer.files?.[0];
                                                    if (file) handleFileSelect(file);
                                                }}
                                                className={`relative border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center transition-all ${
                                                    dragActive 
                                                        ? 'border-primary bg-primary/5' 
                                                        : selectedFile || editPost?.fileUrl
                                                            ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10' 
                                                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 hover:border-primary/50'
                                                }`}
                                            >
                                                <input 
                                                    type="file"
                                                    accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileSelect(file);
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    id="study-file-input"
                                                />
                                                
                                                {selectedFile || (editPost?.fileUrl && !selectedFile) ? (
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                                {selectedFile ? selectedFile.name : editPost?.fileName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                                                {selectedFile 
                                                                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
                                                                    : editPost?.fileSize 
                                                                        ? `${(editPost.fileSize / (1024 * 1024)).toFixed(2)} MB` 
                                                                        : 'Ready file'
                                                                }
                                                            </p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                setSelectedFile(null);
                                                                if (editPost) editPost.fileUrl = "";
                                                            }}
                                                            className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center pointer-events-none py-2">
                                                        <UploadCloud size={28} className="mx-auto text-gray-400 mb-2" />
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            Drag & drop document here, or <span className="text-primary underline">browse</span>
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            Supported: PDF, DOCX, PPTX, XLSX, TXT (up to 50MB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input 
                                                    required={materialType === 'doc' && uploadType === 'link'}
                                                    type="url"
                                                    value={link}
                                                    onChange={(e) => setLink(e.target.value)}
                                                    placeholder="https://drive.google.com/... or https://..."
                                                    className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {materialType === 'video' ? 'Video URL (YouTube, Vimeo, Google Drive)' : 'Web Link URL'} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                required
                                                type="url"
                                                value={link}
                                                onChange={(e) => setLink(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono outline-none transition-all"
                                            />
                                            {isFetchingLink && (
                                                <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Live Class Specific Fields */
                            <div className="space-y-5">
                                {/* Date & Time */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Session Date & Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input 
                                            required={tab === 'schedule'}
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Meeting Link */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Meeting Link (Google Meet, Zoom, MS Teams) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            required={tab === 'schedule'}
                                            type="url"
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                            placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                                            className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Target Programme */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Academic Programme</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'all', label: '🌐 All Programmes' },
                                            { id: 'bed_hons', label: '🎓 B.Ed Honours' },
                                            { id: 'bed', label: '📖 B.Ed General' },
                                            { id: 'med', label: '🏛️ M.Ed' }
                                        ].map((prog) => (
                                            <button
                                                key={prog.id}
                                                type="button"
                                                onClick={() => setProgramme(prog.id)}
                                                className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
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
                            </div>
                        )}

                        {/* Description / Agenda */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {tab === "material" ? "Description & Topics (Optional)" : "Session Agenda & Outline (Optional)"}
                            </label>
                            <textarea 
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={tab === "material" ? "Highlight key topics, semester relevance, or important chapters covered..." : "List the topics you'll cover and what attendees should prepare..."}
                                className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 focus:border-primary focus:bg-white dark:focus:bg-gray-900 rounded-xl px-4 py-2.5 text-xs font-medium outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Thumbnail Image (Optional) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Cover / Preview Image (Optional)</label>
                            <input 
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="hidden"
                                id="study-thumbnail-input"
                            />
                            {thumbnailPreview ? (
                                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-32 flex items-center justify-center">
                                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
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
                                    <ImageIcon size={15} />
                                    <span>Upload Cover Thumbnail</span>
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
                                    <div>
                                        <p className="text-xs font-bold">All TTCs (Public)</p>
                                        <p className="text-[10px] text-gray-400 font-normal">Available to all colleges</p>
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
                                    <div>
                                        <p className="text-xs font-bold">My College Only</p>
                                        <p className="text-[10px] text-gray-400 font-normal truncate max-w-[130px]">
                                            {profile?.collegeName || "Campus only"}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-[#161822]/50">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
                            isSubmitting
                        }
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <><span>Saving...</span> <Loader2 size={15} className="animate-spin" /></>
                        ) : (
                            <>
                                <span>{editPost ? 'Update Post' : (tab === 'material' ? 'Publish Material' : 'Schedule Class')}</span> 
                                <Send size={14} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
