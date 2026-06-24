"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, ImageIcon, BarChart2, UserCheck, UserX, 
    AlertCircle, Plus, Trash2, Loader2, Sparkles, ShieldAlert
} from "lucide-react";
import { 
    createGroupPost, subscribeGroupDetails, subscribeGroupMember, reportGroupPost 
} from "@/lib/firestore";
import { uploadFile } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";

interface GroupPostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
}

const BAD_WORDS = [
    "bastard", "bitch", "fuck", "shit", "asshole", "crap", "dick",
    "সালা", "কুত্তা", "কামিন", "হারামজাদা", "চোতমারানি", "খানকি"
];

export default function GroupPostCreationModal({ isOpen, onClose, groupId, groupName }: GroupPostCreationModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Group & Membership context
    const [group, setGroup] = useState<any>(null);
    const [myMemberRecord, setMyMemberRecord] = useState<any>(null);

    // Image state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Poll state
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

    // Bad words matches
    const [containsBadWords, setContainsBadWords] = useState(false);

    // Run bad word filter check
    useEffect(() => {
        const textToCheck = (content + " " + pollQuestion + " " + pollOptions.join(" ")).toLowerCase();
        const matches = BAD_WORDS.some(word => textToCheck.includes(word));
        setContainsBadWords(matches);
    }, [content, pollQuestion, pollOptions]);

    // Subscriptions
    useEffect(() => {
        if (!isOpen || !groupId) return;
        
        const unsubDetails = subscribeGroupDetails(groupId, (data) => {
            setGroup(data);
        });

        let unsubMember = () => {};
        if (user?.uid) {
            unsubMember = subscribeGroupMember(groupId, user.uid, (data) => {
                setMyMemberRecord(data);
            });
        }

        return () => {
            unsubDetails();
            unsubMember();
        };
    }, [isOpen, groupId, user?.uid]);

    // Check if muted
    const isMuted = useMemo(() => {
        if (!myMemberRecord?.mutedUntil) return false;
        const until = myMemberRecord.mutedUntil.toDate();
        return until.getTime() > Date.now();
    }, [myMemberRecord]);

    const muteDurationString = useMemo(() => {
        if (!myMemberRecord?.mutedUntil) return "";
        const until = myMemberRecord.mutedUntil.toDate();
        return until.toLocaleString();
    }, [myMemberRecord]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setContent("");
            setIsAnonymous(false);
            setImageFile(null);
            setImagePreview(null);
            setShowPoll(false);
            setPollQuestion("");
            setPollOptions(["", ""]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be under 5MB", "error");
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAddPollOption = () => {
        if (pollOptions.length >= 8) {
            showToast("Maximum 8 options allowed", "info");
            return;
        }
        setPollOptions([...pollOptions, ""]);
    };

    const handleRemovePollOption = (index: number) => {
        if (pollOptions.length <= 2) {
            showToast("Minimum 2 options required", "info");
            return;
        }
        const next = [...pollOptions];
        next.splice(index, 1);
        setPollOptions(next);
    };

    const handleOptionChange = (index: number, val: string) => {
        const next = [...pollOptions];
        next[index] = val;
        setPollOptions(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isMuted) {
            showToast(`You are muted from posting until ${muteDurationString}`, "error");
            return;
        }

        if (!content.trim() && !imageFile && (!showPoll || !pollQuestion.trim())) {
            showToast("Please add some text, an image, or a poll question", "info");
            return;
        }

        setIsSubmitting(true);

        // Admin Assist Checks
        if (group?.adminAssistRules) {
            const rules = group.adminAssistRules;
            
            // 1. Min words
            if (rules.minWordsEnabled) {
                const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                if (wordCount < (rules.minWordsCount || 10)) {
                    showToast(`Admin Assist: Post must contain at least ${rules.minWordsCount || 10} words.`, "error");
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Block Links
            if (rules.blockLinksEnabled) {
                const hasLink = /https?:\/\/[^\s]+|www\.[^\s]+/i.test(content);
                if (hasLink) {
                    showToast("Admin Assist: Links are not allowed in this group.", "error");
                    setIsSubmitting(false);
                    return;
                }
            }

            // 3. Block New Members
            if (rules.blockNewMembersEnabled && myMemberRecord?.joinedAt) {
                const hoursJoined = (Date.now() - myMemberRecord.joinedAt.toDate().getTime()) / (1000 * 60 * 60);
                if (hoursJoined < (rules.newMemberHours || 24)) {
                    const remainingHours = Math.ceil((rules.newMemberHours || 24) - hoursJoined);
                    showToast(`Admin Assist: New members cannot post. Please wait another ${remainingHours} hour(s).`, "error");
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        try {
            let imageUrl = "";
            if (imageFile) {
                imageUrl = await uploadFile("group-posts", imageFile);
            }

            const pollData = showPoll && pollQuestion.trim()
                ? { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim() !== "") }
                : undefined;

            const postId = await createGroupPost(
                groupId,
                groupName,
                content,
                imageUrl,
                isAnonymous,
                pollData
            );

            // AI Toxicity Scan (Bullying, hate speech, spam)
            const textToScan = (content + " " + pollQuestion + " " + pollOptions.join(" ")).toLowerCase();
            const toxicityKeywords = ["bully", "kill", "scam", "cheat", "threat", "hate", "leak", "money"];
            const matchedToxicity = toxicityKeywords.filter(word => textToScan.includes(word));
            
            if (matchedToxicity.length > 0) {
                await reportGroupPost(
                    groupId,
                    postId,
                    content,
                    user?.uid || "unknown",
                    `Flagged by AI: Potential bullying/hate/spam term matching (${matchedToxicity.join(", ")})`
                ).catch(console.error);
            }

            // Keyword Alerts Scan
            if (group?.keywordAlerts && group.keywordAlerts.length > 0) {
                const matchedKeywords = group.keywordAlerts.filter((kw: string) => textToScan.includes(kw.toLowerCase()));
                if (matchedKeywords.length > 0) {
                    await reportGroupPost(
                        groupId,
                        postId,
                        content,
                        user?.uid || "unknown",
                        `Keyword Alert: Matched admin keyword(s) (${matchedKeywords.join(", ")})`
                    ).catch(console.error);
                }
            }

            showToast("Post published inside the group!", "success");
            onClose();
        } catch (err) {
            console.error("Error creating group post:", err);
            showToast("Failed to create post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Backdrop click close */}
                    <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] z-10"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50 flex items-center justify-between bg-gray-50/50 dark:bg-black/10">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-primary" />
                                <h2 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                    Create Post in {groupName}
                                </h2>
                            </div>
                            <button 
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {/* Text Input */}
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind? Share updates, ask questions, or announce events..."
                                className="w-full min-h-[120px] bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none resize-none placeholder-gray-400 font-medium"
                                disabled={isSubmitting}
                            />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 max-h-[220px] flex items-center justify-center bg-gray-50 dark:bg-black/15">
                                    <img src={imagePreview} alt="Upload preview" className="object-contain max-h-[220px] w-full" />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Poll Creator */}
                            {showPoll && (
                                <div className="bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                            Poll Question
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPoll(false)}
                                            className="text-[10px] font-black uppercase tracking-wide text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Remove Poll
                                        </button>
                                    </div>
                                    <input 
                                        type="text"
                                        required
                                        value={pollQuestion}
                                        onChange={(e) => setPollQuestion(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none text-gray-800 dark:text-gray-200"
                                    />
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                                            Options
                                        </label>
                                        {pollOptions.map((opt, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    required
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                                    placeholder={`Option ${index + 1}`}
                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none text-gray-800 dark:text-gray-200 font-semibold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePollOption(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={handleAddPollOption}
                                        className="w-full py-2 border border-dashed border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={14} /> Add Option
                                    </button>
                                </div>
                            )}

                            {/* Warnings / Notices */}
                            {containsBadWords && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 text-amber-600 dark:text-amber-400">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold leading-normal uppercase tracking-wide">
                                        Your post contains words that may violate guidelines. Please ensure discussions are respectful and peer-friendly.
                                    </p>
                                </div>
                            )}

                            {isAnonymous && (
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2 text-indigo-600 dark:text-indigo-400">
                                    <UserX size={16} className="shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold leading-normal uppercase tracking-wide">
                                        Anonymous Post: Other students won't see your name, but group admins/moderators can identify you if guidelines are violated.
                                    </p>
                                </div>
                            )}
                        </form>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden"
                        />

                        {/* Footer / Controls Row */}
                        <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-black/10 flex flex-wrap items-center justify-between gap-4">
                            {/* Insert Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSubmitting}
                                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-1 text-[11px] font-black uppercase tracking-wider"
                                    title="Add Photo"
                                >
                                    <ImageIcon size={16} /> <span className="hidden sm:inline">Photo</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setShowPoll(true)}
                                    disabled={isSubmitting || showPoll}
                                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-1 text-[11px] font-black uppercase tracking-wider"
                                    title="Create Poll"
                                >
                                    <BarChart2 size={16} /> <span className="hidden sm:inline">Poll</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsAnonymous(!isAnonymous)}
                                    disabled={isSubmitting}
                                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                                        isAnonymous 
                                            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-500"
                                    }`}
                                    title="Post Anonymously"
                                >
                                    {isAnonymous ? <UserX size={16} /> : <UserCheck size={16} />}
                                    <span className="hidden sm:inline">{isAnonymous ? "Anonymous" : "Reveal Name"}</span>
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ml-auto"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} /> Post
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
