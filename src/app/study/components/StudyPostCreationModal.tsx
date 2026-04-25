"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    BookOpen, Video, Calendar, Clock, Loader2, Sparkles,
    AlertTriangle, ChevronRight, FileText, Pencil, ImageIcon, School
} from "lucide-react";
import { createStudyPost, updateStudyPost, type FirestoreStudyPost } from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";

interface StudyPostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    editPost?: (FirestoreStudyPost & { id: string }) | null;
    onSuccess?: (message: string) => void;
}

export default function StudyPostCreationModal({ isOpen, onClose, profile, editPost, onSuccess }: StudyPostCreationModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [tab, setTab] = useState<"material" | "schedule">("material");
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");
    const [materialType, setMaterialType] = useState<"doc" | "video" | "link">("doc");
    const [startTime, setStartTime] = useState("");
    const [privacy, setPrivacy] = useState<"public" | "campus">("public");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [isFetchingLink, setIsFetchingLink] = useState(false);

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    // Sync with editPost or Reset on close
    useEffect(() => {
        if (isOpen) {
            if (editPost) {
                setTab(editPost.type);
                setStep(2);
                setTitle(editPost.title);
                setDescription(editPost.content);
                setLink(editPost.link || "");
                setMaterialType((editPost.materialType as any) || "doc");
                
                // Format startTime for the datetime-local input (yyyy-MM-ddThh:mm)
                let dateValue = "";
                if (editPost.startTime) {
                    const d = typeof (editPost.startTime as any).toDate === 'function' 
                        ? (editPost.startTime as any).toDate() 
                        : new Date(editPost.startTime);
                    if (!isNaN(d.getTime())) {
                        dateValue = format(d, "yyyy-MM-dd'T'HH:mm");
                    }
                }
                setStartTime(dateValue);

                // Map legacy values
                const vis = editPost.privacy || (editPost.visibility as any) || "public";
                setPrivacy(vis === "college_only" ? "campus" : vis === "public" ? "public" : "campus");
                // Restore existing thumbnail
                if (editPost.thumbnailUrl) {
                    setThumbnailPreview(editPost.thumbnailUrl);
                }
            } else {
                setTab("material");
                setStep(1);
                setTitle("");
                setDescription("");
                setLink("");
                setStartTime("");
                setMaterialType("doc");
                setPrivacy("public");
                setLinkPreview(null);
                removeThumbnail();
            }
        }
    }, [isOpen, editPost]);

    // Link preview effect
    useEffect(() => {
        if (!link || !link.startsWith('http')) {
            setLinkPreview(null);
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetchingLink(true);
            try {
                const res = await fetch(`/api/link-preview?url=${encodeURIComponent(link)}`);
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
    }, [link]);

    // Thumbnail file handler
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be under 5MB", "info");
            return;
        }
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    const handleTypeSelect = (type: "material" | "schedule") => {
        setTab(type);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Upload thumbnail if a new file was selected
            let thumbnailUrl = editPost?.thumbnailUrl || "";
            if (thumbnailFile) {
                const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                thumbnailUrl = resultUrl;
            } else if (!thumbnailPreview && editPost?.thumbnailUrl) {
                // User removed the thumbnail
                thumbnailUrl = "";
            }

            const postData: any = {
                type: tab,
                title: title.trim(),
                content: description.trim(),
                link: link.trim(),
                privacy,
                collegeId: profile?.collegeId,
                collegeName: profile?.collegeName,
                thumbnailUrl: thumbnailUrl,
                linkPreview: linkPreview || { 
                    title, 
                    description: description.slice(0, 100), 
                    thumbnail: "", 
                    domain: link ? (link.startsWith('http') ? new URL(link).hostname : "ttcnetwork.com") : "ttcnetwork.com" 
                }
            };

            if (tab === "material") postData.materialType = materialType;
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
            showToast("Failed to share study post. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-[#1a1b23] w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                {editPost ? (
                                    <><Pencil className="text-primary" size={24} /> Edit Your Post</>
                                ) : step === 1 ? (
                                    <><Sparkles className="text-primary" /> What's your impact?</>
                                ) : (
                                    <>{tab === 'material' ? <BookOpen className="text-primary" /> : <Video className="text-primary" />} {tab === 'material' ? 'Share Resource' : 'Schedule Class'}</>
                                )}
                            </h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {step === 1 ? 'Choose how you want to help today' : 'Fill in the details below'}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4"
                            >
                                <button
                                    onClick={() => handleTypeSelect("material")}
                                    className="group relative flex flex-col items-center text-center p-8 bg-gray-50 dark:bg-black/20 hover:bg-primary/5 border-2 border-transparent hover:border-primary/20 rounded-[2.5rem] transition-all"
                                >
                                    <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm group-hover:rotate-6 transition-transform">
                                        <FileText className="text-blue-500" size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-navy-900 dark:text-white uppercase tracking-tight">Study Material</h3>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-wider">Notes, PDFs, Books</p>
                                    <div className="mt-8 w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-100 dark:border-gray-700">
                                        <ChevronRight size={24} className="text-primary" />
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleTypeSelect("schedule")}
                                    className="group relative flex flex-col items-center text-center p-8 bg-gray-50 dark:bg-black/20 hover:bg-primary/5 border-2 border-transparent hover:border-primary/20 rounded-[2.5rem] transition-all"
                                >
                                    <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm group-hover:rotate-6 transition-transform">
                                        <Video className="text-amber-500" size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-navy-900 dark:text-white uppercase tracking-tight">Live Class</h3>
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-wider">Zoom, Meet sessions</p>
                                    <div className="mt-8 w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-100 dark:border-gray-700">
                                        <ChevronRight size={24} className="text-primary" />
                                    </div>
                                </button>
                            </motion.div>
                        ) : (
                            <motion.form 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSubmit} 
                                className="space-y-6"
                            >
                                {/* Back Button */}
                                <button 
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="inline-flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors mb-2"
                                >
                                    ← Back
                                </button>

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                                        {tab === 'material' ? 'Resource Title' : 'Class Topic'}
                                    </label>
                                    <input 
                                        required
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={tab === 'material' ? "e.g., Educational Psychology Notes" : "e.g., Zoom Class on Child Development"}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl px-6 py-4 text-base font-bold outline-none transition-all shadow-inner"
                                    />
                                </div>

                                {/* Specific Fields per Tab */}
                                {tab === 'material' ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'doc', icon: BookOpen, label: 'Document' },
                                            { id: 'video', icon: Video, label: 'Video' },
                                            { id: 'link', icon: LinkIcon, label: 'Web Link' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setMaterialType(type.id as any)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${materialType === type.id ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-gray-50 dark:bg-black/20 border-transparent text-gray-400 hover:bg-gray-100'}`}
                                            >
                                                <type.icon size={20} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Start Date & Time</label>
                                        <div className="relative">
                                            <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                required={tab === 'schedule'}
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Description (Optional)</label>
                                    <textarea 
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Explain what this resource is about..."
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl px-6 py-4 text-base font-medium outline-none transition-all shadow-inner resize-none"
                                    />
                                </div>

                                {/* Link */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                                        {tab === 'material' ? 'Resource Link' : 'Meeting Link (Zoom/Google Meet)'}
                                    </label>
                                    <div className="relative">
                                        <LinkIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            required={tab === 'material'}
                                            type="url"
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl pl-14 pr-6 py-4 text-sm font-mono outline-none transition-all shadow-inner"
                                        />
                                        {isFetchingLink && (
                                            <Loader2 size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                                        )}
                                    </div>
                                </div>

                                {/* Thumbnail Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Add Media / Image (Optional)</label>
                                    <input 
                                        ref={thumbnailInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailChange}
                                        className="hidden"
                                        id="study-thumbnail-input"
                                    />
                                    {thumbnailPreview ? (
                                        <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 bg-gray-50 dark:bg-black/20">
                                            <img src={thumbnailPreview} alt="Study preview" className="w-full h-48 sm:h-64 object-contain" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={removeThumbnail}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full shadow-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => thumbnailInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-3 py-5 bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary/30 rounded-2xl transition-all text-gray-400 hover:text-primary"
                                        >
                                            <ImageIcon size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Add Media / Image</span>
                                        </button>
                                    )}
                                </div>

                                {/* Visibility & Submit */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <button 
                                            type="button"
                                            onClick={() => setPrivacy("public")}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${privacy === "public" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"}`}
                                        >
                                            <Globe size={14} /> Global
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setPrivacy("campus")}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${privacy === "campus" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"}`}
                                        >
                                            <School size={14} /> Campus
                                        </button>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={!title.trim() || (tab === 'material' && !link.trim()) || isSubmitting}
                                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-primary text-white rounded-[1.25rem] text-sm font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {isSubmitting ? (
                                            <>Saving... <Loader2 size={18} className="animate-spin" /></>
                                        ) : (
                                            <>{editPost ? 'Update Post' : (tab === 'material' ? 'Share Resource' : 'Schedule Class')} <Send size={18} /></>
                                        )}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
