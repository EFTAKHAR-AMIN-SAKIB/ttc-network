"use client";

import AdmissionGuideManagerTab from "./AdmissionGuideManagerTab";
import BuilderManagerTab from "./BuilderManagerTab";
import OfficialContactManagerTab from "./OfficialContactManagerTab";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Edit3,
    Save,
    X,
    GripVertical,
    HelpCircle,
    Heart,
} from "lucide-react";
import {
    getQACards,
    createQACard,
    updateQACard,
    deleteQACard,
    reorderQACards,
    getOriginStorySettings,
    updateOriginStorySettings,
    type FirestoreQACard,
    type FirestoreOriginStorySettings,
} from "@/lib/firestore";

type QALanguage = "bengali" | "english" | "both";

import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function QAManagerTab({ profile }: { profile: UserProfile }) {
    const [cards, setCards] = useState<(FirestoreQACard & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [editId, setEditId] = useState<string | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [newCard, setNewCard] = useState<{ question: string; answer: string; language: QALanguage }>({ question: "", answer: "", language: "bengali" });
    const [editCard, setEditCard] = useState<{ question: string; answer: string; language: QALanguage }>({ question: "", answer: "", language: "bengali" });
    const { confirm, setIsLoading, close } = useConfirm();

    const loadCards = async () => {
        setLoading(true);
        try { setCards(await getQACards()); } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { loadCards(); }, []);

    /* ─── Origin Story Settings ─── */
    const [originStorySettings, setOriginStorySettings] = useState<FirestoreOriginStorySettings | null>(null);
    const [savingOriginStory, setSavingOriginStory] = useState(false);

    useEffect(() => {
        getOriginStorySettings().then(setOriginStorySettings).catch(console.error);
    }, []);

    const handleToggleOriginStory = async () => {
        if (!originStorySettings) return;
        const newValue = !originStorySettings.isVisible;
        setSavingOriginStory(true);
        try {
            await updateOriginStorySettings({ isVisible: newValue });
            setOriginStorySettings({ isVisible: newValue });
            showToast(newValue ? "✅ Origin Story section is now visible." : "Origin Story section is now hidden.", newValue ? "success" : "info");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            setSavingOriginStory(false);
        }
    };

    const handleCreate = async () => {
        if (!newCard.question.trim() || !newCard.answer.trim()) return;
        try {
            await createQACard({ ...newCard, order: cards.length + 1, isVisible: true });
            setShowNew(false);
            setNewCard({ question: "", answer: "", language: "bengali" });
            showToast("✅ Card created!", "success");
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleUpdate = async () => {
        if (!editId) return;
        try {
            await updateQACard(editId, editCard);
            setEditId(null);
            showToast("✅ Card updated!", "success");
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleToggleVisibility = async (id: string, current: boolean) => {
        try {
            await updateQACard(id, { isVisible: !current });
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Card?",
            message: "This action cannot be undone. The question and answer will be permanently removed from the database.",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteQACard(id);
            showToast("Card deleted.", "info");
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            close();
        }
    };

    const handleMoveUp = async (index: number) => {
        if (index === 0) return;
        const newCards = [...cards];
        [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
        const reordered = newCards.map((c, i) => ({ id: c.id, order: i + 1 }));
        try {
            await reorderQACards(reordered);
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleMoveDown = async (index: number) => {
        if (index === cards.length - 1) return;
        const newCards = [...cards];
        [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
        const reordered = newCards.map((c, i) => ({ id: c.id, order: i + 1 }));
        try {
            await reorderQACards(reordered);
            loadCards();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-12">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white font-english flex items-center gap-2">
                        <HelpCircle size={24} className="text-primary" />
                        Homepage Sections
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage FAQs, Admission Guide, and Builder settings for the homepage.</p>
                </div>
            </div>


            {/* Add New Button */}
            <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md"
            ><Plus size={16} /> Add New Card</button>

            {/* New Card Form */}
            <AnimatePresence>
                {showNew && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-primary/30 shadow-sm overflow-hidden"
                    >
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">New Q&A Card</h3>
                        <div className="space-y-3">
                            <input value={newCard.question} onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                                placeholder="Question..." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            <textarea value={newCard.answer} onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                                rows={3} placeholder="Answer..." className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                            <select value={newCard.language} onChange={(e) => setNewCard({ ...newCard, language: e.target.value as "bengali" | "english" | "both" })}
                                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white">
                                <option value="bengali">Bengali</option>
                                <option value="english">English</option>
                                <option value="both">Both</option>
                            </select>
                            <div className="flex gap-2">
                                <button onClick={handleCreate} className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Save size={14} /> Create</button>
                                <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold"><X size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cards List */}
            {cards.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                    <HelpCircle size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Q&A Cards</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">Create Q&A cards to help users understand the platform.</p>
                </div>
            ) : (
                cards.map((card, index) => (
                    <div key={card.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                        {editId === card.id ? (
                            <div className="space-y-3">
                                <input value={editCard.question} onChange={(e) => setEditCard({ ...editCard, question: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                <textarea value={editCard.answer} onChange={(e) => setEditCard({ ...editCard, answer: e.target.value })}
                                    rows={3} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                                <div className="flex gap-2">
                                    <button onClick={handleUpdate} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold"><Save size={12} /> Save</button>
                                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <div className="flex flex-col gap-1 pt-1">
                                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-gray-300 hover:text-gray-500 dark:text-gray-400 disabled:opacity-30"><GripVertical size={14} /></button>
                                    <button onClick={() => handleMoveDown(index)} disabled={index === cards.length - 1} className="text-gray-300 hover:text-gray-500 dark:text-gray-400 disabled:opacity-30 rotate-180"><GripVertical size={14} /></button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">#{card.order}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isVisible ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                            {card.isVisible ? "Visible" : "Hidden"}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest">{card.language}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{card.question}</h3>
                                    <p className="text-xs text-gray-700 dark:text-gray-400 mt-1 line-clamp-2">{card.answer}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={() => { setEditId(card.id); setEditCard({ question: card.question, answer: card.answer, language: card.language }); }}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-[#161620] text-gray-400 dark:bg-gray-700 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit3 size={14} /></button>
                                    <button onClick={() => handleToggleVisibility(card.id, card.isVisible)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-[#161620] text-gray-400 dark:bg-gray-700 hover:bg-amber-50 hover:text-amber-500 transition-colors">
                                        {card.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button onClick={() => handleDelete(card.id!)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-[#161620] text-gray-400 dark:bg-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}


            {/* ─── Origin Story Section Toggle ─── */}
            <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 rounded-full">
                        <Heart size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Origin Story</span>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white">
                                <Heart size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">"Why TTC Network Exists" Section</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toggle the Origin Story section visibility on the homepage.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleOriginStory}
                            disabled={savingOriginStory || !originStorySettings}
                            className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                                originStorySettings?.isVisible
                                    ? "bg-red-500 shadow-md shadow-red-500/20"
                                    : "bg-gray-300 dark:bg-gray-600"
                            } ${savingOriginStory ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-lg"}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                                originStorySettings?.isVisible ? "left-[30px]" : "left-0.5"
                            }`} />
                        </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            originStorySettings?.isVisible
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                            {originStorySettings?.isVisible ? "Visible on Homepage" : "Hidden from Homepage"}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Admission Guide Manager ─── */}
            <AdmissionGuideManagerTab />

            {/* ─── Official Contact Manager ─── */}
            <OfficialContactManagerTab />
            
            {/* ─── Builder Section Manager ─── */}
            <BuilderManagerTab />
        </div>
    );
}
