"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Send, ImageIcon, BarChart2, UserCheck, UserX, 
    AlertCircle, Plus, Trash2, Loader2, Sparkles, ShieldAlert,
    Check, Video, Play
} from "lucide-react";
import { 
    createGroupPost, subscribeGroupDetails, subscribeGroupMember, reportGroupPost,
    updateGroupPost, type GroupPostDoc, type PostMediaItem
} from "@/lib/firestore";
import { uploadFile, deleteFromStorage } from "@/lib/storage";
import { validateFile, isVideoFile } from "@/lib/image-utils";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { deleteField } from "firebase/firestore";
import { useMentionAutosuggest, MentionDropdown } from "@/components/Social/MentionDropdown";

export interface PendingMediaItem {
    id: string;
    file?: File;
    url: string;
    type: "image" | "video";
    name?: string;
    size?: number;
}

interface GroupPostCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    editPost?: (GroupPostDoc & { id: string }) | null;
}

const BAD_WORDS = [
    "bastard", "bitch", "fuck", "shit", "asshole", "crap", "dick",
    "সালা", "কুত্তা", "কামিন", "হারামজাদা", "চোতমারানি", "খানকি"
];

export default function GroupPostCreationModal({ isOpen, onClose, groupId, groupName, editPost }: GroupPostCreationModalProps) {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [content, setContent] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const mention = useMentionAutosuggest({
        value: content,
        setValue: setContent,
        inputRef: contentTextareaRef,
        groupId,
    });

    // Group & Membership context
    const [group, setGroup] = useState<any>(null);
    const [myMemberRecord, setMyMemberRecord] = useState<any>(null);

    // Multi-media state (photos, videos up to 50MB, Facebook style)
    const [mediaList, setMediaList] = useState<PendingMediaItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleMediaFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newItems: PendingMediaItem[] = [];
        for (const file of files) {
            const error = validateFile(file);
            if (error) {
                showToast(`${file.name}: ${error}`, "error");
                continue;
            }
            const isVid = isVideoFile(file);
            const objUrl = URL.createObjectURL(file);
            newItems.push({
                id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                file,
                url: objUrl,
                type: isVid ? "video" : "image",
                name: file.name,
                size: file.size,
            });
        }

        if (newItems.length > 0) {
            setMediaList(prev => [...prev, ...newItems]);
        }
        if (e.target) e.target.value = "";
    };

    const handleRemoveMediaItem = (id: string) => {
        setMediaList(prev => {
            const itemToRemove = prev.find(item => item.id === id);
            if (itemToRemove?.url && itemToRemove.url.startsWith("blob:")) {
                try { URL.revokeObjectURL(itemToRemove.url); } catch (_) {}
            }
            return prev.filter(item => item.id !== id);
        });
    };

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

    // Sync with editPost when opening, reset when closing
    useEffect(() => {
        if (isOpen) {
            if (editPost) {
                setContent(editPost.content || "");
                setIsAnonymous(editPost.isAnonymous || false);
                if (Array.isArray(editPost.media) && editPost.media.length > 0) {
                    const loadedMedia: PendingMediaItem[] = editPost.media.map((m: any, idx: number) => {
                        const url = typeof m === "string" ? m : m.url;
                        const type = typeof m === "object" && m.type 
                            ? m.type 
                            : (/\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(url) || url?.includes("/video/upload/")) ? "video" : "image";
                        return {
                            id: `edit-media-${idx}-${Date.now()}`,
                            url,
                            type,
                            name: typeof m === "object" ? m.name : undefined
                        };
                    });
                    setMediaList(loadedMedia);
                } else if (editPost.imageUrl) {
                    const isVid = /\.(mp4|webm|mov|mkv|3gp|ogg)(\?.*)?$/i.test(editPost.imageUrl) || editPost.imageUrl.includes("/video/upload/");
                    setMediaList([{
                        id: `edit-media-0`,
                        url: editPost.imageUrl,
                        type: isVid ? "video" : "image"
                    }]);
                } else {
                    setMediaList([]);
                }
                if (editPost.poll) {
                    setShowPoll(true);
                    setPollQuestion(editPost.poll.question || "");
                    setPollOptions(editPost.poll.options?.map(opt => opt.text) || ["", ""]);
                } else {
                    setShowPoll(false);
                    setPollQuestion("");
                    setPollOptions(["", ""]);
                }
            } else {
                setContent("");
                setIsAnonymous(false);
                setMediaList([]);
                setShowPoll(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
            }
        } else {
            setContent("");
            setIsAnonymous(false);
            mediaList.forEach(item => {
                if (item.url?.startsWith("blob:")) {
                    try { URL.revokeObjectURL(item.url); } catch (_) {}
                }
            });
            setMediaList([]);
            setShowPoll(false);
            setPollQuestion("");
            setPollOptions(["", ""]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [isOpen, editPost]);

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

        if (!content.trim() && mediaList.length === 0 && (!showPoll || !pollQuestion.trim())) {
            showToast("Please add some text, photo/video, or a poll question", "info");
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

            // 3. Block New Members (only on creation)
            if (!editPost && rules.blockNewMembersEnabled && myMemberRecord?.joinedAt) {
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
            let finalMedia: PostMediaItem[] = [];

            if (mediaList.length > 0) {
                for (const item of mediaList) {
                    if (item.file) {
                        const folder = item.type === "video" ? "videos" : "group-posts";
                        const uploadedUrl = await uploadFile(folder, item.file);
                        finalMedia.push({
                            url: uploadedUrl,
                            type: item.type,
                            name: item.name
                        });
                    } else if (item.url) {
                        finalMedia.push({
                            url: item.url,
                            type: item.type,
                            name: item.name
                        });
                    }
                }
            }

            const firstImageUrl = finalMedia.find(m => m.type === "image")?.url || finalMedia[0]?.url || "";

            const pollData = showPoll && pollQuestion.trim()
                ? { 
                    question: pollQuestion.trim(), 
                    options: pollOptions.filter(o => o.trim() !== "").map((opt, index) => {
                        const existingOpt = editPost?.poll?.options?.[index];
                        if (existingOpt && existingOpt.text === opt.trim()) {
                            return existingOpt;
                        }
                        const matchedOpt = editPost?.poll?.options?.find(o => o.text === opt.trim());
                        if (matchedOpt) {
                            return matchedOpt;
                        }
                        return {
                            id: `opt-${index}-${Date.now()}`,
                            text: opt.trim(),
                            votes: []
                        };
                    })
                  }
                : null;

            let postId = "";
            if (editPost) {
                postId = editPost.id;
                // Collect old media URLs to delete any removed items
                const oldUrls: string[] = [];
                if (editPost.imageUrl) oldUrls.push(editPost.imageUrl);
                if (Array.isArray(editPost.media)) {
                    editPost.media.forEach((m: any) => {
                        const u = typeof m === "string" ? m : m?.url;
                        if (u) oldUrls.push(u);
                        if (typeof m === "object" && m?.thumbnail) oldUrls.push(m.thumbnail);
                    });
                }
                const newUrls = new Set([
                    firstImageUrl,
                    ...finalMedia.map(m => m.url),
                    ...finalMedia.map(m => m.thumbnail).filter(Boolean) as string[],
                ]);
                const removedUrls = oldUrls.filter(u => u && !newUrls.has(u));
                if (removedUrls.length > 0) {
                    deleteFromStorage(removedUrls).catch(console.warn);
                }

                const updates: any = {
                    content: content.trim(),
                    imageUrl: firstImageUrl,
                    media: finalMedia,
                    isAnonymous,
                };
                if (pollData) {
                    updates.poll = pollData;
                } else {
                    updates.poll = deleteField();
                }
                await updateGroupPost(editPost.id, updates);
            } else {
                const pollDataForCreation = showPoll && pollQuestion.trim()
                    ? { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim() !== "") }
                    : undefined;

                postId = await createGroupPost(
                    groupId,
                    groupName,
                    content,
                    firstImageUrl,
                    isAnonymous,
                    pollDataForCreation,
                    finalMedia
                );
            }

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
                    `Flagged by AI${editPost ? " (On Edit)" : ""}: Potential bullying/hate/spam term matching (${matchedToxicity.join(", ")})`
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
                        `Keyword Alert${editPost ? " (On Edit)" : ""}: Matched admin keyword(s) (${matchedKeywords.join(", ")})`
                    ).catch(console.error);
                }
            }

            showToast(editPost ? "Post updated successfully!" : "Post published inside the group!", "success");
            onClose();
        } catch (err) {
            console.error("Error submitting group post:", err);
            showToast(editPost ? "Failed to update post." : "Failed to create post.", "error");
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
                                    {editPost ? `Edit Post in ${groupName}` : `Create Post in ${groupName}`}
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
                            {/* Text Input with Group Mention Support */}
                            <div className="relative">
                                <MentionDropdown
                                    isOpen={mention.isOpen}
                                    query={mention.query}
                                    suggestions={mention.suggestions}
                                    selectedIndex={mention.selectedIndex}
                                    setSelectedIndex={mention.setSelectedIndex}
                                    onSelect={mention.insertMention}
                                    onClose={() => mention.setIsOpen(false)}
                                    position="bottom"
                                    isGroup={true}
                                />
                                <textarea
                                    ref={contentTextareaRef}
                                    value={content}
                                    onChange={(e) => {
                                        setContent(e.target.value);
                                        mention.checkMention();
                                    }}
                                    onKeyUp={(e) => {
                                        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Tab') {
                                            mention.checkMention();
                                        }
                                    }}
                                    onClick={() => mention.checkMention()}
                                    onFocus={() => mention.checkMention()}
                                    onBlur={() => {
                                        setTimeout(() => mention.setIsOpen(false), 200);
                                    }}
                                    onKeyDown={(e) => {
                                        mention.handleKeyDown(e);
                                    }}
                                    placeholder="What's on your mind? Share updates, ask questions, or announce events... (Type @ to mention group members)"
                                    className="w-full min-h-[120px] bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none resize-none placeholder-gray-400 font-medium"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Facebook-Style Multi-Media Preview Gallery */}
                            <AnimatePresence>
                                {mediaList.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <ImageIcon size={13} className="text-emerald-500" />
                                                Attached Media ({mediaList.length})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus size={12} /> Add more
                                            </button>
                                        </div>

                                        <div className={`grid gap-2.5 ${
                                            mediaList.length === 1 
                                                ? "grid-cols-1" 
                                                : mediaList.length === 2 
                                                    ? "grid-cols-2" 
                                                    : "grid-cols-2 sm:grid-cols-3"
                                        }`}>
                                            {mediaList.map((item) => (
                                                <motion.div 
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className={`relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 group bg-black/5 dark:bg-black/30 shadow-xs ${
                                                        mediaList.length === 1 ? "max-h-64 sm:max-h-72" : "aspect-video"
                                                    } flex items-center justify-center`}
                                                >
                                                    {item.type === "video" ? (
                                                        <div className="relative w-full h-full bg-black flex items-center justify-center">
                                                            <video 
                                                                src={item.url} 
                                                                className="w-full h-full object-cover" 
                                                                preload="metadata"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                                                <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg">
                                                                    <Play size={18} className="fill-white translate-x-0.5" />
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                <Video size={10} className="text-red-400" /> Video
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img 
                                                            src={item.url} 
                                                            alt="Group post media" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    )}

                                                    {/* Top-Right Delete Action */}
                                                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMediaItem(item.id)}
                                                            className="p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer"
                                                            title="Remove file"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>

                                                    {/* File Size Badge */}
                                                    {item.size && (
                                                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-semibold">
                                                            {(item.size / (1024 * 1024)).toFixed(1)} MB
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}

                                            {/* Add more tile */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-2xl transition-all flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-primary cursor-pointer ${
                                                    mediaList.length === 1 ? "h-24" : "aspect-video"
                                                }`}
                                            >
                                                <Plus size={18} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Add Photo/Video</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

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

                        {/* Hidden File Input for Multi-Media (Photos & Videos up to 50MB, Facebook style) */}
                        <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            ref={fileInputRef}
                            onChange={handleMediaFilesChange}
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
                                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${
                                        mediaList.length > 0 
                                            ? "bg-primary/10 text-primary border border-primary/20" 
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                    title="Add Photos or Videos (up to 50MB)"
                                >
                                    <ImageIcon size={16} /> <span className="hidden sm:inline">{mediaList.length > 0 ? `Photo/Video (${mediaList.length})` : "Photo/Video"}</span>
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
                                        <Loader2 size={14} className="animate-spin" /> {editPost ? "Saving..." : "Publishing..."}
                                    </>
                                ) : (
                                    <>
                                        {editPost ? <Check size={14} /> : <Send size={14} />} {editPost ? "Save Changes" : "Post"}
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
