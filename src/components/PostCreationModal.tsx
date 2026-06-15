/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, Link as LinkIcon, Globe, Lock, 
    Sparkles, AlertTriangle, Loader2, ImageIcon, School
} from "lucide-react";
import { createPost, getMyClubs, type FirestoreClub } from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { colleges } from "@/data/colleges";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

interface PostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
}

export default function PostCreationModal({ isOpen, onClose, profile }: PostCreationModalProps) {
    const [eventName, setEventName] = useState("");
    const [description, setDescription] = useState("");
    const [shareLink, setShareLink] = useState("");
    const [visibility, setVisibility] = useState<"public" | "campus" | "private">("public");
    const [type, setType] = useState<"event" | "club">("event");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    useEffect(() => {
        if (isOpen) {
            const verified = requireVerification("share updates");
            if (!verified) {
                onClose();
            }
        }
    }, [isOpen]);
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [isFetchingLink, setIsFetchingLink] = useState(false);

    const [attachClub, setAttachClub] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState("");
    const [selectedClubName, setSelectedClubName] = useState("");
    const [myClubs, setMyClubs] = useState<(FirestoreClub & {id: string})[]>([]);

    // Thumbnail state
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!profile?.uid || !profile?.collegeId) return;
        getMyClubs(profile.uid, profile.collegeId).then(setMyClubs).catch(console.error);
    }, [profile]);

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
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setEventName("");
            setDescription("");
            setShareLink("");
            setVisibility("public");
            setType("event");
            setSelectedClubId("");
            setSelectedClubName("");
            setAttachClub(false);
            setLinkPreview(null);
            setThumbnailFile(null);
            setThumbnailPreview(null);
            if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Upload thumbnail if selected
            let thumbnailUrl = "";
            if (thumbnailFile) {
                const resultUrl = await uploadFile("thumbnails", thumbnailFile);
                thumbnailUrl = resultUrl;
            }

            const hasClub = type === "club" || (type === "event" && attachClub);
            const clubMeta = hasClub && selectedClubId 
                ? { clubId: selectedClubId, clubName: selectedClubName } 
                : {};

            await createPost({
                type,
                eventName: eventName.trim(),
                description: description.trim(),
                ...(shareLink.trim() ? { shareLink: shareLink.trim() } : {}),
                visibility,
                ...(linkPreview ? { linkPreview } : {}),
                collegeId: profile?.collegeId,
                ...(thumbnailUrl ? { thumbnailUrl } : {}),
                ...clubMeta
            } as any);
            
            // Reset and close
            setEventName("");
            setDescription("");
            setShareLink("");
            removeThumbnail();
            showToast("Update shared successfully!", "success");
            onClose();
        } catch (err) {
            console.error(err);
            showToast("Failed to share update. Please try again.", "error");
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
                                <Sparkles className="text-primary" /> Share Update
                            </h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Post to your campus community</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Post Type & Club Selection */}
                        <div className="space-y-4 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Post Category</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setType("event"); setSelectedClubId(""); setSelectedClubName(""); setAttachClub(false); }} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border ${type === 'event' ? 'bg-white dark:bg-gray-800 text-primary border-primary/20 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Global Update</button>
                                <button type="button" onClick={() => { setType("club"); setAttachClub(false); }} className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border ${type === 'club' ? 'bg-white dark:bg-gray-800 text-primary border-primary/20 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Club Update</button>
                            </div>

                            {type === 'event' && myClubs.length > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100/50 dark:border-gray-850/30">
                                    <span className="text-xs font-bold text-gray-750 dark:text-gray-300">Arrange by a Club?</span>
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
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            attachClub
                                                ? "bg-primary text-white border-primary shadow-sm"
                                                : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        {attachClub ? "Yes, Attached" : "No, Individual"}
                                    </button>
                                </div>
                            )}

                            <AnimatePresence>
                                {(type === 'club' || (type === 'event' && attachClub)) && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                                        <select 
                                            required
                                            value={selectedClubId}
                                            onChange={(e) => {
                                                setSelectedClubId(e.target.value);
                                                setSelectedClubName(e.target.options[e.target.selectedIndex].text);
                                            }}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all dark:text-white"
                                        >
                                            <option value="" disabled>Select your club...</option>
                                            {myClubs.map(club => (
                                                <option key={club.id} value={club.id}>{club.name}</option>
                                            ))}
                                        </select>
                                        {myClubs.length === 0 && type === 'club' && (
                                            <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest">You have not joined any clubs.</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Title / Event Name</label>
                            <input 
                                required
                                type="text"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                placeholder="What's the highlight?"
                                className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl px-6 py-4 text-base font-bold outline-none transition-all shadow-inner"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Description</label>
                            <textarea 
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Tell us more about it..."
                                className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl px-6 py-4 text-base font-medium outline-none transition-all shadow-inner resize-none"
                            />
                        </div>

                        {/* Link */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Link (Optional)</label>
                            <div className="relative">
                                <LinkIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="url"
                                    value={shareLink}
                                    onChange={(e) => setShareLink(e.target.value)}
                                    placeholder="https://facebook.com/share/..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-900 rounded-2xl pl-14 pr-6 py-4 text-sm font-mono outline-none transition-all shadow-inner"
                                />
                                {isFetchingLink && (
                                    <Loader2 size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* Link Preview (Small) */}
                        <AnimatePresence>
                            {linkPreview && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-gray-50 dark:bg-black/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4 overflow-hidden"
                                >
                                    {linkPreview.thumbnail && (
                                        <img src={linkPreview.thumbnail} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-200" alt="" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{linkPreview.title}</h4>
                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{linkPreview.domain}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShareLink("")}
                                        className="p-1.5 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Thumbnail Upload */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Add Thumbnail(Optional)</label>
                            <input 
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="hidden"
                                id="post-thumbnail-input"
                            />
                            {thumbnailPreview ? (
                                <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20">
                                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-40 object-cover" />
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
                                    className="w-full flex items-center justify-center gap-3 py-6 bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary/30 rounded-2xl transition-all text-gray-400 hover:text-primary"
                                >
                                    <ImageIcon size={20} />
                                    <span className="text-xs font-black uppercase tracking-widest">Click to add a thumbnail</span>
                                </button>
                            )}
                        </div>

                        {/* Visibility Section */}
                        <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <Lock size={10} className="text-primary" /> Who can see this?
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "public" as const, icon: <Globe size={18} />, label: "Global", desc: "Everyone", color: "text-blue-500" },
                                    { id: "campus" as const, icon: <School size={18} />, label: "Campus", desc: "Your college", color: "text-amber-500" },
                                    { id: "private" as const, icon: <Lock size={18} />, label: "Private", desc: "Only you", color: "text-rose-500" },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setVisibility(opt.id)}
                                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 group
                                            ${visibility === opt.id
                                                ? "bg-white dark:bg-gray-800 border-primary/30 shadow-md shadow-primary/5 scale-[1.02]"
                                                : "border-transparent hover:bg-white/60 dark:hover:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700"
                                            }`}
                                    >
                                        <div className={`transition-colors ${visibility === opt.id ? opt.color : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`}>
                                            {opt.icon}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${visibility === opt.id ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                                            {opt.label}
                                        </span>
                                        <span className={`text-[8px] font-bold transition-colors ${visibility === opt.id ? "text-gray-500" : "text-gray-300 dark:text-gray-600"}`}>
                                            {opt.desc}
                                        </span>
                                        {visibility === opt.id && (
                                            <motion.div layoutId="vis-indicator" className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                                                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </motion.div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <button 
                                type="submit"
                                disabled={!eventName.trim() || isSubmitting}
                                className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-primary text-white rounded-[1.25rem] text-sm font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isSubmitting ? (
                                    <>Posting... <Loader2 size={18} className="animate-spin" /></>
                                ) : (
                                    <>Share Update <Send size={18} /></>
                                )}
                            </button>
                        </div>
                    </form>
                    
                    {profile?.role !== 'admin' && profile?.role !== 'super_manager' && profile?.role !== 'manager' && (
                        <div className={`mt-6 p-4 border rounded-2xl flex items-start gap-3 ${
                            visibility === 'private' 
                                ? 'bg-rose-500/5 border-rose-500/10' 
                                : visibility === 'campus' 
                                    ? 'bg-blue-500/5 border-blue-500/10' 
                                    : 'bg-amber-500/5 border-amber-500/10'
                        }`}>
                            <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                                visibility === 'private' ? 'text-rose-500' : visibility === 'campus' ? 'text-blue-500' : 'text-amber-500'
                            }`} />
                            <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${
                                visibility === 'private' 
                                    ? 'text-rose-600 dark:text-rose-400' 
                                    : visibility === 'campus' 
                                        ? 'text-blue-600 dark:text-blue-400' 
                                        : 'text-amber-600 dark:text-amber-400'
                            }`}>
                                {visibility === 'private' 
                                    ? 'Note: This post will only be visible to you. No one else can see it.'
                                    : visibility === 'campus'
                                        ? 'Note: Your post will be visible only to your campus community after it is reviewed by moderators.'
                                        : 'Note: Your post will be visible to everyone across all campuses after it is reviewed by our community moderators.'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
