"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    XCircle,
    Gift,
    Star,
    Wallet,
    Hammer,
    Megaphone,
    Heart,
    Plus,
    UserPlus,
    Users,
    Trash2,
    Pencil,
    Loader2,
    Save,
    Palette,
    Server,
    Smartphone,
    Globe,
    Layers,
    Search,
} from "lucide-react";
import {
    getPendingGifts,
    getApprovedGifts,
    approveGift,
    rejectGift,
    updateGift,
    deleteGift,
    addManualContributor,
    getSupportPhases,
    createSupportPhase,
    updateSupportPhase,
    deleteSupportPhase,
    updateSupportSettings,
    getSupportSettings,
    seedRoadmapPhases,
    type FirestoreGift,
    type SupportPhase,
    type SupportSettings,
} from "@/lib/firestore";

/* ═══════════════════════════════════════════════════
   ROLE CONFIG — matches Support page roles
   ═══════════════════════════════════════════════════ */
const ROLES = [
    { value: "founder",   label: "Founder",   desc: "Project founder/creator",        color: "#e11d48", bg: "#ffe4e6", icon: <Star size={12} /> },
    { value: "patron",    label: "Patron",    desc: "Contributed by funding",         color: "#d97706", bg: "#fef3c7", icon: <Wallet size={12} /> },
    { value: "builder",   label: "Builder",   desc: "Contributed by building/coding", color: "#059669", bg: "#d1fae5", icon: <Hammer size={12} /> },
    { value: "advocate",  label: "Advocate",  desc: "Helped spread the word",         color: "#7c3aed", bg: "#ede9fe", icon: <Megaphone size={12} /> },
    { value: "supporter", label: "Supporter", desc: "General support",                color: "#2563eb", bg: "#dbeafe", icon: <Heart size={12} /> },
];



import { UserProfile } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";

export default function GiftsTab({ profile }: { profile: UserProfile }) {
    const [gifts, setGifts] = useState<(FirestoreGift & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Verifications state
    const [selectedPhases, setSelectedPhases] = useState<Record<string, string>>({});
    const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

    // Add Contributor state
    const [manualUserId, setManualUserId] = useState("");
    const [manualMessage, setManualMessage] = useState("");
    const [manualAmount, setManualAmount] = useState("");
    const [manualPhase, setManualPhase] = useState("");
    const [manualRole, setManualRole] = useState("patron");
    const [addingManual, setAddingManual] = useState(false);

    // ROADMAP & SETTINGS
    const [subTab, setSubTab] = useState<"verifications" | "manage_supporters" | "add_contributor" | "roadmap">("verifications");
    const [phases, setPhases] = useState<(SupportPhase & { id: string })[]>([]);
    const [settings, setSettings] = useState<SupportSettings>({ fundingOpen: true, fundingMessage: "", supportPageActive: true });
    const [editingPhase, setEditingPhase] = useState<Partial<SupportPhase> | null>(null);
    const [seeding, setSeeding] = useState(false);
    const { confirm, setIsLoading, close } = useConfirm();

    // MANAGE SUPPORTERS
    const [approvedGifts, setApprovedGifts] = useState<(FirestoreGift & { id: string })[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingGift, setEditingGift] = useState<(FirestoreGift & { id: string }) | null>(null);
    const [savingGift, setSavingGift] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pending, approved, p, s] = await Promise.all([
                getPendingGifts(),
                getApprovedGifts(),
                getSupportPhases(),
                getSupportSettings()
            ]);
            setGifts(pending);
            setApprovedGifts(approved);
            setPhases(p);
            setSettings(s || { fundingOpen: true, fundingMessage: "", supportPageActive: true });
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);



    // ───────────────────────────────────────────────────
    // VERIFICATIONS
    // ───────────────────────────────────────────────────
    const handleApprove = async (id: string) => {
        try {
            const phaseId = selectedPhases[id] || undefined;
            const role = selectedRoles[id] || "patron";
            await approveGift(id, phaseId, role);
            showToast("✅ Supporter approved! Badge issued.", "success");
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectGift(id);
            showToast("Supporter rejected.", "info");
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    // ───────────────────────────────────────────────────
    // ADD CONTRIBUTOR
    // ───────────────────────────────────────────────────
    const handleAddContributor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualUserId) return showToast("❌ User ID is required.", "error");
        
        setAddingManual(true);
        try {
            await addManualContributor({
                userId: manualUserId,
                message: manualMessage,
                amount: manualAmount ? Number(manualAmount) : 0,
                phaseId: manualPhase || undefined,
                role: manualRole
            });
            showToast("✅ Contributor added successfully! They are now live on the Support page.", "success");
            setManualUserId("");
            setManualMessage("");
            setManualAmount("");
            setManualPhase("");
            setManualRole("patron");
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
        setAddingManual(false);
    };

    // ───────────────────────────────────────────────────
    // ROADMAP EDITOR
    // ───────────────────────────────────────────────────
    const handleSaveSettings = async () => {
        try {
            await updateSupportSettings(settings);
            showToast("✅ Settings saved!", "success");
        } catch (err) { showToast(`❌ ${err}`, "error"); }
    };

    const handleSavePhase = async () => {
        if (!editingPhase || !editingPhase.title) return showToast("❌ Title is required", "error");
        try {
            if (editingPhase.id) {
                await updateSupportPhase(editingPhase.id, editingPhase);
                showToast("✅ Phase updated!", "success");
            } else {
                await createSupportPhase({ 
                    ...editingPhase, 
                    order: phases.length,
                    status: editingPhase.status || "Upcoming",
                    icon: editingPhase.icon || "Star",
                    color: editingPhase.color || "emerald",
                    description: editingPhase.description || "",
                    title: editingPhase.title,
                    personalNote: editingPhase.personalNote || editingPhase.founderNote || "",
                    currentAmount: editingPhase.currentAmount || 0,
                    targetAmount: editingPhase.targetAmount || 0,
                    tractionLevel: editingPhase.tractionLevel || 0
                } as SupportPhase);
                showToast("✅ Phase created!", "success");
            }
            setEditingPhase(null);
            loadData();
        } catch (err) { showToast(`❌ ${err}`, "error"); }
    };

    const handleDeletePhase = async (id: string) => {
        if (!await confirm({
            title: "Delete Phase?",
            message: "Are you sure you want to remove this roadmap phase? This will permanently delete the phase data.",
            variant: "danger"
        })) return;

        try {
            await deleteSupportPhase(id);
            showToast("✅ Phase deleted!", "success");
            loadData();
        } catch (err) { showToast(`❌ ${err}`, "error"); }
    };

    const handleRestoreRoadmap = async () => {
        if (!await confirm({
            title: "Restore Roadmap?",
            message: "Restore all default roadmap phases? This will add them to your current list.",
            variant: "warning"
        })) return;

        setSeeding(true);
        try {
            await seedRoadmapPhases();
            showToast("✅ Default roadmap restored!", "success");
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
        setSeeding(false);
    };

    // ───────────────────────────────────────────────────
    // MANAGE SUPPORTERS
    // ───────────────────────────────────────────────────
    const handleUpdateGift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGift) return;
        setSavingGift(true);
        try {
            await updateGift(editingGift.id, editingGift);
            showToast("✅ Supporter updated!", "success");
            setEditingGift(null);
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
        setSavingGift(false);
    };

    const handleDeleteGift = async (id: string) => {
        const confirmed = await confirm({
            title: "Remove Supporter?",
            message: "Are you sure you want to remove this supporter? This action will permanently delete their contribution record.",
            confirmText: "Remove Now",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteGift(id);
            showToast("🗑️ Supporter removed.", "success");
            loadData();
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        } finally {
            close();
        }
    };

    const filteredSupporters = approvedGifts.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.txId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* Sub-tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
                <button
                    onClick={() => setSubTab("verifications")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === "verifications" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Verifications ({gifts.length})
                </button>
                <button
                    onClick={() => setSubTab("manage_supporters")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === "manage_supporters" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Manage Supporters ({approvedGifts.length})
                </button>
                <button
                    onClick={() => setSubTab("add_contributor")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === "add_contributor" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Add Contributor
                </button>
                <button
                    onClick={() => setSubTab("roadmap")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === "roadmap" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Roadmap Editor
                </button>
            </div>

            {subTab === "verifications" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Star size={12} className="text-amber-400" />
                        <h2 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">
                            Pending Supporters ({gifts.length})
                        </h2>
                    </div>

                    {gifts.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-[#161620] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <Gift size={48} className="text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Pending Verifications</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-400">All gifts have been processed. Great job!</p>
                        </div>
                    ) : (
                        gifts.map((gift) => (
                            <div key={gift.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                                {/* Top: Identity + Amount */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-inner">
                                        <span className="text-white font-bold text-sm">{gift.name[0]}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{gift.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] truncate">{gift.txId}</span>
                                            <span>·</span>
                                            <span>{gift.method}</span>
                                        </div>
                                    </div>
                                    <div className="text-xl font-extrabold pr-2 shrink-0" style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                        ৳{gift.amount}
                                    </div>
                                </div>

                                {/* Assignment Row: Phase + Role */}
                                <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-gray-50 dark:bg-[#15161d] rounded-xl border border-gray-200 dark:border-gray-800/60">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                                            Assign to Phase
                                        </label>
                                        <select
                                            value={selectedPhases[gift.id] || ""}
                                            onChange={(e) => setSelectedPhases(p => ({...p, [gift.id]: e.target.value}))}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium text-gray-900 dark:text-white"
                                        >
                                            <option value="">General (No Phase)</option>
                                            {phases.map(p => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                                            Contribution Role
                                        </label>
                                        <select
                                            value={selectedRoles[gift.id] || "patron"}
                                            onChange={(e) => setSelectedRoles(r => ({...r, [gift.id]: e.target.value}))}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
                                        >
                                            {ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const role = ROLES.find(r => r.value === (selectedRoles[gift.id] || "patron"));
                                            if (!role) return null;
                                            return (
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                                    style={{ background: role.bg, color: role.color }}
                                                >
                                                    {role.icon}
                                                    {role.label}
                                                </span>
                                            );
                                        })()}
                                        {selectedPhases[gift.id] && (
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">
                                                → {phases.find(p => p.id === selectedPhases[gift.id])?.title || "Unknown Phase"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(gift.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-100 dark:border-emerald-800 shadow-sm"
                                        ><CheckCircle2 size={14} /> Approve</button>
                                        <button onClick={() => handleReject(gift.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors border border-red-100 dark:border-red-800 shadow-sm"
                                        ><XCircle size={14} /> Reject</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {subTab === "manage_supporters" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-blue-500" />
                            <h2 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">
                                All Approved Supporters ({filteredSupporters.length})
                            </h2>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                            <input 
                                type="text"
                                placeholder="Search by name, ID, or TxID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {filteredSupporters.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-[#16181C] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Search size={48} className="text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Supporters Found</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Try adjusting your search or add a manual contributor.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredSupporters.map((gift) => (
                                <div key={gift.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5">
                                            {gift.photoURL ? (
                                                <img src={gift.photoURL} alt="" className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-lg rounded-lg">
                                                    {gift.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{gift.name}</p>
                                                {(() => {
                                                    const role = ROLES.find(r => r.value === (gift.role || "patron"));
                                                    if (!role) return null;
                                                    return (
                                                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider" style={{ background: role.bg, color: role.color }}>
                                                            {role.label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                                <span className="font-mono text-blue-500 dark:text-blue-400">{gift.userId}</span>
                                                <span>·</span>
                                                <span className="text-amber-500 font-bold uppercase tracking-tighter">৳{gift.amount}</span>
                                                {gift.phaseId && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="truncate">Phase: {phases.find(p => p.id === gift.phaseId)?.title || "Unknown"}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setEditingGift(gift)}
                                                className="p-2 bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-700 transition-all"
                                                title="Edit Details"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteGift(gift.id)}
                                                className="p-2 bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-gray-100 dark:border-gray-700 transition-all"
                                                title="Delete Supporter"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}



                    {/* Edit Supporter Modal */}
                    <AnimatePresence>
                        {editingGift && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                                >
                                    <form onSubmit={handleUpdateGift}>
                                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                    <Pencil className="text-blue-500" size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Supporter</h3>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">UID: {editingGift.userId}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setEditingGift(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                                                <XCircle size={20} />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        value={editingGift.name}
                                                        onChange={e => setEditingGift({...editingGift, name: e.target.value})}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Contribution Amount (৳)</label>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        value={editingGift.amount}
                                                        onChange={e => setEditingGift({...editingGift, amount: Number(e.target.value)})}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Contribution Role</label>
                                                    <select
                                                        value={editingGift.role || "patron"}
                                                        onChange={e => setEditingGift({...editingGift, role: e.target.value as any})}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                                    >
                                                        {ROLES.map(r => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Support Phase</label>
                                                    <select
                                                        value={editingGift.phaseId || ""}
                                                        onChange={e => setEditingGift({...editingGift, phaseId: e.target.value})}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                                    >
                                                        <option value="">General Support</option>
                                                        {phases.map(p => (
                                                            <option key={p.id} value={p.id}>{p.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Personal Quote / Message</label>
                                                    <textarea 
                                                        value={editingGift.message || ""}
                                                        onChange={e => setEditingGift({...editingGift, message: e.target.value})}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all min-h-[80px] resize-none"
                                                        placeholder="Leave a message..."
                                                    />
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Custom Badge Label</label>
                                                        <input 
                                                            type="text" 
                                                            value={editingGift.supporterBadgeLabel || ""}
                                                            onChange={e => setEditingGift({...editingGift, supporterBadgeLabel: e.target.value})}
                                                            placeholder="e.g. Pioneer, Friend"
                                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Verified Status</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setEditingGift({...editingGift, isVerifiedSupporter: !editingGift.isVerifiedSupporter})}
                                                            className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingGift.isVerifiedSupporter ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400"}`}
                                                        >
                                                            {editingGift.isVerifiedSupporter ? (
                                                                <><CheckCircle2 size={14} /> Verified</>
                                                            ) : (
                                                                "Not Verified"
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Profile Link URL (Override)</label>
                                                    <input 
                                                        type="text" 
                                                        value={editingGift.supporterProfileUrl || ""}
                                                        onChange={e => setEditingGift({...editingGift, supporterProfileUrl: e.target.value})}
                                                        placeholder="e.g. /profile/username"
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 flex justify-end gap-3 border-t border-gray-50 dark:border-gray-700">
                                            <button 
                                                type="button" 
                                                onClick={() => setEditingGift(null)} 
                                                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >Cancel</button>
                                            <button 
                                                type="submit" 
                                                disabled={savingGift}
                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                            >
                                                {savingGift ? <Loader2 size={16} className="animate-spin" /> : <Save className="hidden" />}
                                                {savingGift ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {subTab === "add_contributor" && (
                <form onSubmit={handleAddContributor} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <UserPlus className="text-amber-500" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Contributor Manually</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">Directly inject an approved supporter pulling their profile data via ID.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Supporter User ID</label>
                            <input 
                                type="text" 
                                required 
                                value={manualUserId} 
                                onChange={e => setManualUserId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
                                placeholder="e.g. jf8s2j4n..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Contribution Amount (৳) — Optional</label>
                            <input 
                                type="number" 
                                min="0"
                                value={manualAmount} 
                                onChange={e => setManualAmount(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
                                placeholder="e.g. 5000"
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Short Message (Optional)</label>
                            <textarea 
                                value={manualMessage} 
                                onChange={e => setManualMessage(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium min-h-[80px]"
                                placeholder="A short message from the contributor to display publicly."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Phase Assignment</label>
                            <select
                                value={manualPhase}
                                onChange={e => setManualPhase(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
                            >
                                <option value="">General Supporter (No Phase)</option>
                                {phases.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Contribution Role</label>
                            <select
                                value={manualRole}
                                onChange={e => setManualRole(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
                            >
                                {ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button 
                            type="submit" 
                            disabled={addingManual}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {addingManual ? "Adding..." : <><Plus size={16} /> Add to Support Page</>}
                        </button>
                    </div>
                </form>
            )}

            {subTab === "roadmap" && (
                <div className="space-y-6">
                    {/* Settings card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Support Page Settings</h3>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Funding Toggle</label>
                                <select value={settings.fundingOpen ? "true" : "false"} onChange={e => setSettings({...settings, fundingOpen: e.target.value === "true"})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
                                    <option value="true">Open - Accepting Contributions</option>
                                    <option value="false">Closed - Goal Reached</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Public Page Toggle</label>
                                <select value={settings.supportPageActive ? "true" : "false"} onChange={e => setSettings({...settings, supportPageActive: e.target.value === "true"})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
                                    <option value="true">Active - Support Page is Visible</option>
                                    <option value="false">Hidden - Support Page is Disabled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Short Description / Subtitle</label>
                                <textarea value={settings.fundingMessage} onChange={e => setSettings({...settings, fundingMessage: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm min-h-[60px]" placeholder="Help us build the ultimate university platform." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Emotional Note (Personal Journey)</label>
                                <textarea 
                                    value={settings.supportPageNote || ""} 
                                    onChange={e => setSettings({...settings, supportPageNote: e.target.value})} 
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm min-h-[120px]" 
                                    placeholder="Tell your story... (Use \n for paragraph breaks)" 
                                />
                                <p className="text-[10px] text-gray-500 mt-1 font-medium italic">This note appears as a warm, human message above the bKash card.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Emotional Subtext (Call to Action)</label>
                                <input 
                                    type="text"
                                    value={settings.supportPageSubtext || ""} 
                                    onChange={e => setSettings({...settings, supportPageSubtext: e.target.value})} 
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm" 
                                    placeholder="e.g. Your support keeps this dream alive" 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveSettings} 
                            className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all shadow-sm"
                        >
                            Save Settings
                        </button>
                    </div>

                    {/* Phase Editor */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Vision Roadmap Phases</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleRestoreRoadmap} 
                                    disabled={seeding}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                >
                                    {seeding ? "Restoring..." : "🌱 Restore Defaults"}
                                </button>
                                <button 
                                    onClick={() => setEditingPhase({ title: "New Phase", status: "Upcoming", color: "blue", icon: "Star" })} 
                                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:shadow-md transition-all"
                                ><Plus size={14} /> Add Phase</button>
                            </div>
                        </div>
                        
                        {editingPhase && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input value={editingPhase.title || ""} onChange={e => setEditingPhase({...editingPhase, title: e.target.value})} placeholder="Phase Title" className="px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm w-full" />
                                    <select value={editingPhase.status || "Upcoming"} onChange={e => setEditingPhase({...editingPhase, status: e.target.value as "In Progress" | "Complete" | "Upcoming"})} className="px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm w-full">
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Complete">Complete</option>
                                    </select>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400 whitespace-nowrap">Traction Level (%):</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={editingPhase.tractionLevel || 0}
                                            onChange={e => {
                                                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                                setEditingPhase({
                                                    ...editingPhase, 
                                                    tractionLevel: val,
                                                    status: val === 100 
                                                        ? "Complete" 
                                                        : editingPhase.status === "Complete" && val < 100 
                                                            ? "In Progress" 
                                                            : editingPhase.status
                                                });
                                            }}
                                            className="bg-transparent text-sm w-full outline-none text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400 whitespace-nowrap">Current (৳):</span>
                                        <input 
                                            type="number" 
                                            value={editingPhase.currentAmount ?? 0} 
                                            onChange={e => setEditingPhase({...editingPhase, currentAmount: Number(e.target.value)})} 
                                            className="bg-transparent text-sm w-full outline-none text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400 whitespace-nowrap">Target (৳):</span>
                                        <input 
                                            type="number" 
                                            value={editingPhase.targetAmount ?? 0} 
                                            onChange={e => setEditingPhase({...editingPhase, targetAmount: Number(e.target.value)})} 
                                            className="bg-transparent text-sm w-full outline-none text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400 whitespace-nowrap">Color:</span>
                                        <select 
                                            value={editingPhase.color || "emerald"} 
                                            onChange={e => setEditingPhase({...editingPhase, color: e.target.value})} 
                                            className="bg-transparent text-sm w-full outline-none text-gray-900 dark:text-white"
                                        >
                                            <option value="emerald">Emerald</option>
                                            <option value="purple">Purple</option>
                                            <option value="blue">Blue</option>
                                            <option value="orange">Orange</option>
                                            <option value="teal">Teal</option>
                                            <option value="rose">Rose</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400 whitespace-nowrap">Icon:</span>
                                        <select 
                                            value={editingPhase.icon || "Layers"} 
                                            onChange={e => setEditingPhase({...editingPhase, icon: e.target.value})} 
                                            className="bg-transparent text-sm w-full outline-none text-gray-900 dark:text-white"
                                        >
                                            <option value="Layers">Layers</option>
                                            <option value="Palette">Palette</option>
                                            <option value="Server">Server</option>
                                            <option value="Smartphone">Smartphone</option>
                                            <option value="Globe">Globe</option>
                                            <option value="Users">Users</option>
                                            <option value="Hammer">Hammer</option>
                                            <option value="Megaphone">Megaphone</option>
                                        </select>
                                    </div>
                                </div>
                                <textarea value={editingPhase.description || ""} onChange={e => setEditingPhase({...editingPhase, description: e.target.value})} placeholder="Phase Description" className="px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm w-full min-h-[60px]" />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-400">Personal Note (shown on support page)</label>
                                    <textarea value={editingPhase.personalNote || editingPhase.founderNote || ""} onChange={e => setEditingPhase({...editingPhase, personalNote: e.target.value})} placeholder="A personal note about this phase..." className="px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm w-full min-h-[60px] italic font-serif" />
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button 
                                        onClick={() => setEditingPhase(null)} 
                                        className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSavePhase} 
                                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Save Phase
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {[...phases].sort((a, b) => (a.order || 0) - (b.order || 0)).map(p => (
                                <div key={p.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center group bg-white dark:bg-gray-800">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">{p.order ?? 0}</span>
                                            {p.title} 
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] text-gray-500 uppercase">{p.status}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 truncate max-w-md mt-1">{p.description}</div>
                                        {typeof p.progress === "number" && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-200 dark:border-gray-800">
                                                    <div 
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${p.progress}%` }} 
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400">{p.progress}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 transition-opacity">
                                        <button onClick={() => setEditingPhase(p)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">Edit</button>
                                        <button onClick={() => handleDeletePhase(p.id)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
