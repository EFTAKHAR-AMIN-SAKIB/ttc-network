"use client";

import { useState } from "react";
import { X, Globe, Lock, EyeOff, Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createGroup } from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";
import { useVerifiedAccess } from "@/contexts/VerificationContext";

interface GroupCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (groupId: string) => void;
}

export default function GroupCreationModal({ isOpen, onClose, onSuccess }: GroupCreationModalProps) {
    const { showToast } = useToast();
    const { requireVerification } = useVerifiedAccess();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [privacyType, setPrivacyType] = useState<"public" | "private" | "secret">("public");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("Cover image must be under 5MB", "error");
            return;
        }
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!requireVerification("create groups")) return;

        setIsCreating(true);
        try {
            let coverUrl = "";
            if (coverFile) {
                coverUrl = await uploadFile("group-covers", coverFile);
            }

            const groupId = await createGroup({
                name: name.trim(),
                description: description.trim(),
                coverUrl,
                privacyType
            });

            showToast("Group created successfully!", "success");
            setName("");
            setDescription("");
            setCoverFile(null);
            setCoverPreview(null);
            onClose();
            if (onSuccess) {
                onSuccess(groupId);
            } else {
                // Default redirect
                window.location.href = `/groups/${groupId}`;
            }
        } catch (err) {
            console.error("Create group failed:", err);
            showToast("Failed to create group.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-800/40 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Create Campus Group</h2>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Build a community for debating, studying, or sports</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                    Group Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Dhaka TTC Study Circle, Debate Society..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-1 focus:ring-primary text-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                                    Group Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this group about? Share guidelines or goals..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-xs outline-none focus:ring-1 focus:ring-primary h-28 resize-none text-gray-800 dark:text-gray-200 font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Privacy Selector */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
                                        Privacy Setting
                                    </label>
                                    <div className="space-y-2">
                                        {[
                                            { id: "public", label: "Public Group", desc: "Anyone can join, post, and view content.", icon: Globe },
                                            { id: "private", label: "Private Group", desc: "Anyone can request, approval required.", icon: Lock },
                                            { id: "secret", label: "Secret Group", desc: "Hidden, join only via invite token link.", icon: EyeOff },
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            const isSelected = privacyType === item.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={item.id}
                                                    onClick={() => setPrivacyType(item.id as any)}
                                                    className={`w-full text-left p-3 rounded-2xl border flex items-start gap-3 transition-all ${
                                                        isSelected
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                                    }`}
                                                >
                                                    <Icon size={16} className="shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-tight">{item.label}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 normal-case">{item.desc}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Cover Image Uploader */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
                                        Cover Photo (Optional)
                                    </label>
                                    <div className="relative rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/10 h-[155px] flex flex-col items-center justify-center p-4 overflow-hidden group">
                                        {coverPreview ? (
                                            <>
                                                <img src={coverPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                <ImageIcon size={28} className="text-gray-400 dark:text-gray-500 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Upload Cover Image</span>
                                                <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 mt-1 uppercase tracking-widest">Supports JPG, PNG</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleCoverChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating || !name.trim()}
                                className="w-full py-4 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Creating Group...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} /> Complete Registration
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
