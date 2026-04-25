"use client";

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
    GraduationCap,
    Settings,
    Coins,
    Monitor,
    Trophy,
    FileCheck,
    BookOpen,
    ClipboardCheck,
    Clock,
    Award,
    Clipboard,
    Pencil,
    School,
    UserCheck,
    FileText,
    CheckSquare,
    Landmark,
    HelpCircle,
    type LucideIcon,
} from "lucide-react";
import {
    getAllAdmissionSteps,
    createAdmissionStep,
    updateAdmissionStep,
    deleteAdmissionStep,
    reorderAdmissionSteps,
    getAllAdmissionCosts,
    createAdmissionCost,
    updateAdmissionCost,
    deleteAdmissionCost,
    reorderAdmissionCosts,
    getAdmissionSettings,
    updateAdmissionSettings,
    type FirestoreAdmissionStep,
    type FirestoreAdmissionCostItem,
    type FirestoreAdmissionSettings,
} from "@/lib/firestore";

/* ─── Available Icons for dropdown ─── */
const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
    { name: "Monitor", icon: Monitor },
    { name: "Trophy", icon: Trophy },
    { name: "FileCheck", icon: FileCheck },
    { name: "GraduationCap", icon: GraduationCap },
    { name: "BookOpen", icon: BookOpen },
    { name: "ClipboardCheck", icon: ClipboardCheck },
    { name: "Clock", icon: Clock },
    { name: "Award", icon: Award },
    { name: "Clipboard", icon: Clipboard },
    { name: "Pencil", icon: Pencil },
    { name: "School", icon: School },
    { name: "UserCheck", icon: UserCheck },
    { name: "FileText", icon: FileText },
    { name: "CheckSquare", icon: CheckSquare },
    { name: "Landmark", icon: Landmark },
    { name: "Coins", icon: Coins },
    { name: "HelpCircle", icon: HelpCircle },
];

const getIconByName = (name: string): LucideIcon => {
    return ICON_OPTIONS.find(o => o.name === name)?.icon || GraduationCap;
};

import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";

export default function AdmissionGuideManagerTab() {
    const [steps, setSteps] = useState<(FirestoreAdmissionStep & { id: string })[]>([]);
    const [costs, setCosts] = useState<(FirestoreAdmissionCostItem & { id: string })[]>([]);
    const [settings, setSettings] = useState<FirestoreAdmissionSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Step editing
    const [editStepId, setEditStepId] = useState<string | null>(null);
    const [showNewStep, setShowNewStep] = useState(false);
    const [newStep, setNewStep] = useState({ title: "", subtitle: "", description: "", iconName: "Monitor" });
    const [editStep, setEditStep] = useState({ title: "", subtitle: "", description: "", iconName: "Monitor" });

    // Cost editing
    const [editCostId, setEditCostId] = useState<string | null>(null);
    const [showNewCost, setShowNewCost] = useState(false);
    const [newCost, setNewCost] = useState({ label: "", amount: "", isHighlighted: false });
    const [editCost, setEditCost] = useState({ label: "", amount: "", isHighlighted: false });
    const { confirm, setIsLoading, close } = useConfirm();

    // Settings editing
    const [showSettings, setShowSettings] = useState(false);
    const [editSettings, setEditSettings] = useState<FirestoreAdmissionSettings>({
        sectionTitle: "", sectionSubtitle: "", costTitle: "", isVisible: true
    });



    const loadData = async () => {
        setLoading(true);
        try {
            const [s, c, st] = await Promise.all([
                getAllAdmissionSteps(),
                getAllAdmissionCosts(),
                getAdmissionSettings(),
            ]);
            setSteps(s);
            setCosts(c);
            setSettings(st);
            setEditSettings(st);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // ─── Step Handlers ───
    const handleCreateStep = async () => {
        if (!newStep.title.trim() || !newStep.description.trim()) return;
        try {
            await createAdmissionStep({
                ...newStep,
                stepNumber: steps.length + 1,
                isVisible: true,
                order: steps.length + 1,
            });
            setShowNewStep(false);
            setNewStep({ title: "", subtitle: "", description: "", iconName: "Monitor" });
            showToast("✅ Step created!", "success");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleUpdateStep = async () => {
        if (!editStepId) return;
        try {
            await updateAdmissionStep(editStepId, editStep);
            setEditStepId(null);
            showToast("✅ Step updated!", "success");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleToggleStepVisibility = async (id: string, current: boolean) => {
        try { await updateAdmissionStep(id, { isVisible: !current }); loadData(); }
        catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleDeleteStep = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Step?",
            message: "This action cannot be undone. The step will be permanently removed.",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteAdmissionStep(id);
            showToast("Step deleted.", "info");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
        finally { close(); }
    };

    const handleMoveStep = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === steps.length - 1) return;
        const swap = direction === "up" ? index - 1 : index + 1;
        const newSteps = [...steps];
        [newSteps[index], newSteps[swap]] = [newSteps[swap], newSteps[index]];
        try {
            await reorderAdmissionSteps(newSteps.map((s, i) => ({ id: s.id, order: i + 1 })));
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    // ─── Cost Handlers ───
    const handleCreateCost = async () => {
        if (!newCost.label.trim() || !newCost.amount.trim()) return;
        try {
            await createAdmissionCost({
                ...newCost,
                isVisible: true,
                order: costs.length + 1,
            });
            setShowNewCost(false);
            setNewCost({ label: "", amount: "", isHighlighted: false });
            showToast("✅ Cost item created!", "success");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleUpdateCost = async () => {
        if (!editCostId) return;
        try {
            await updateAdmissionCost(editCostId, editCost);
            setEditCostId(null);
            showToast("✅ Cost updated!", "success");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleToggleCostVisibility = async (id: string, current: boolean) => {
        try { await updateAdmissionCost(id, { isVisible: !current }); loadData(); }
        catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    const handleDeleteCost = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Cost Item?",
            message: "This action cannot be undone. The item will be permanently removed.",
            variant: "danger"
        });

        if (!confirmed) return;

        setIsLoading(true);
        try {
            await deleteAdmissionCost(id);
            showToast("Cost item deleted.", "info");
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
        finally { close(); }
    };

    const handleMoveCost = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === costs.length - 1) return;
        const swap = direction === "up" ? index - 1 : index + 1;
        const newCosts = [...costs];
        [newCosts[index], newCosts[swap]] = [newCosts[swap], newCosts[index]];
        try {
            await reorderAdmissionCosts(newCosts.map((c, i) => ({ id: c.id, order: i + 1 })));
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    // ─── Settings Handler ───
    const handleSaveSettings = async () => {
        try {
            await updateAdmissionSettings(editSettings);
            showToast("✅ Settings saved!", "success");
            setShowSettings(false);
            loadData();
        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error"); }
    };

    if (loading) {
        return (
            <div className="space-y-3 mt-8">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 mt-8">
            {/* Section Divider */}
            <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full">
                    <GraduationCap size={14} className="text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Admission Guide</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>



            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                    <Settings size={14} /> Section Settings
                </button>
                <button onClick={() => setShowNewStep(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md">
                    <Plus size={16} /> Add Step
                </button>
                <button onClick={() => setShowNewCost(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-md">
                    <Coins size={14} /> Add Cost Item
                </button>
            </div>

            {/* ─── Settings Panel ─── */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-primary/30 shadow-sm overflow-hidden">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Section Settings</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Section Title (Bangla)</label>
                                <input value={editSettings.sectionTitle} onChange={e => setEditSettings({ ...editSettings, sectionTitle: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Section Subtitle</label>
                                <input value={editSettings.sectionSubtitle} onChange={e => setEditSettings({ ...editSettings, sectionSubtitle: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Cost Section Title</label>
                                <input value={editSettings.costTitle} onChange={e => setEditSettings({ ...editSettings, costTitle: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editSettings.isVisible} onChange={e => setEditSettings({ ...editSettings, isVisible: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Section Visible on Homepage</span>
                            </label>
                            <div className="flex gap-2">
                                <button onClick={handleSaveSettings} className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Save size={14} /> Save Settings</button>
                                <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold"><X size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── New Step Form ─── */}
            <AnimatePresence>
                {showNewStep && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-primary/30 shadow-sm overflow-hidden">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">New Admission Step</h3>
                        <div className="space-y-3">
                            <input value={newStep.title} onChange={e => setNewStep({ ...newStep, title: e.target.value })} placeholder="Title (Bangla)..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            <input value={newStep.subtitle} onChange={e => setNewStep({ ...newStep, subtitle: e.target.value })} placeholder="Subtitle (English)..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            <textarea value={newStep.description} onChange={e => setNewStep({ ...newStep, description: e.target.value })} rows={3} placeholder="Description (Bangla)..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map(opt => {
                                        const I = opt.icon;
                                        return (
                                            <button key={opt.name} onClick={() => setNewStep({ ...newStep, iconName: opt.name })}
                                                className={`p-2 rounded-lg border transition-all ${newStep.iconName === opt.name ? "bg-primary/10 border-primary text-primary" : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300"}`}>
                                                <I size={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCreateStep} className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"><Save size={14} /> Create</button>
                                <button onClick={() => setShowNewStep(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold"><X size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Steps List ─── */}
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-2">Admission Steps ({steps.length})</h4>
            {steps.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 text-center">
                    <GraduationCap size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 dark:text-gray-400">No admission steps yet. Use &quot;Seed Data&quot; or add manually.</p>
                </div>
            ) : (
                steps.map((step, index) => (
                    <div key={step.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                        {editStepId === step.id ? (
                            <div className="space-y-3">
                                <input value={editStep.title} onChange={e => setEditStep({ ...editStep, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                <input value={editStep.subtitle} onChange={e => setEditStep({ ...editStep, subtitle: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                <textarea value={editStep.description} onChange={e => setEditStep({ ...editStep, description: e.target.value })} rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map(opt => {
                                        const I = opt.icon;
                                        return (
                                            <button key={opt.name} onClick={() => setEditStep({ ...editStep, iconName: opt.name })}
                                                className={`p-2 rounded-lg border transition-all ${editStep.iconName === opt.name ? "bg-primary/10 border-primary text-primary" : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300"}`}>
                                                <I size={14} />
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleUpdateStep} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold"><Save size={12} /> Save</button>
                                    <button onClick={() => setEditStepId(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <div className="flex flex-col gap-1 pt-1">
                                    <button onClick={() => handleMoveStep(index, "up")} disabled={index === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30"><GripVertical size={14} /></button>
                                    <button onClick={() => handleMoveStep(index, "down")} disabled={index === steps.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 rotate-180"><GripVertical size={14} /></button>
                                </div>
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {step.stepNumber}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${step.isVisible ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                            {step.isVisible ? "Visible" : "Hidden"}
                                        </span>
                                        {(() => { const I = getIconByName(step.iconName); return <I size={12} className="text-gray-400" />; })()}
                                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase">{step.iconName}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</h3>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">{step.subtitle}</p>
                                    <p className="text-xs text-gray-700 dark:text-gray-400 mt-1 line-clamp-2">{step.description}</p>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={() => { setEditStepId(step.id); setEditStep({ title: step.title, subtitle: step.subtitle, description: step.description, iconName: step.iconName }); }}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit3 size={14} /></button>
                                    <button onClick={() => handleToggleStepVisibility(step.id, step.isVisible)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors">
                                        {step.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button onClick={() => handleDeleteStep(step.id)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* ─── Cost Items ─── */}
            <div className="flex items-center gap-3 mt-6 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 rounded-full">
                    <Coins size={14} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Cost Breakdown</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            </div>

            {/* New Cost Form */}
            <AnimatePresence>
                {showNewCost && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-amber-500/30 shadow-sm overflow-hidden">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">New Cost Item</h3>
                        <div className="space-y-3">
                            <input value={newCost.label} onChange={e => setNewCost({ ...newCost, label: e.target.value })} placeholder="Label (e.g. প্রাথমিক আবেদন ফি)..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                            <input value={newCost.amount} onChange={e => setNewCost({ ...newCost, amount: e.target.value })} placeholder="Amount (e.g. ৩০০ - ৫০০ টাকা)..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={newCost.isHighlighted} onChange={e => setNewCost({ ...newCost, isHighlighted: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Highlight (total row)</span>
                            </label>
                            <div className="flex gap-2">
                                <button onClick={handleCreateCost} className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold"><Save size={14} /> Create</button>
                                <button onClick={() => setShowNewCost(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold"><X size={14} /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cost Items List */}
            {costs.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 text-center">
                    <Coins size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 dark:text-gray-400">No cost items yet.</p>
                </div>
            ) : (
                costs.map((cost, index) => (
                    <div key={cost.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border shadow-sm ${cost.isHighlighted ? "border-amber-200 dark:border-amber-800" : "border-gray-100 dark:border-gray-700"}`}>
                        {editCostId === cost.id ? (
                            <div className="space-y-3">
                                <input value={editCost.label} onChange={e => setEditCost({ ...editCost, label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                <input value={editCost.amount} onChange={e => setEditCost({ ...editCost, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={editCost.isHighlighted} onChange={e => setEditCost({ ...editCost, isHighlighted: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Highlight</span>
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={handleUpdateCost} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold"><Save size={12} /> Save</button>
                                    <button onClick={() => setEditCostId(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => handleMoveCost(index, "up")} disabled={index === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30"><GripVertical size={14} /></button>
                                    <button onClick={() => handleMoveCost(index, "down")} disabled={index === costs.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 rotate-180"><GripVertical size={14} /></button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cost.isVisible ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                                            {cost.isVisible ? "Visible" : "Hidden"}
                                        </span>
                                        {cost.isHighlighted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Highlighted</span>}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{cost.label}</span>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{cost.amount}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={() => { setEditCostId(cost.id); setEditCost({ label: cost.label, amount: cost.amount, isHighlighted: cost.isHighlighted }); }}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit3 size={14} /></button>
                                    <button onClick={() => handleToggleCostVisibility(cost.id, cost.isVisible)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors">
                                        {cost.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button onClick={() => handleDeleteCost(cost.id)}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}

        </div>
    );
}
