"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Globe, Mail, Facebook, Twitter, Linkedin, ShieldCheck, Type, Link as LinkIcon, Loader2 } from "lucide-react";
import { getOfficialSettings, updateOfficialSettings, type FirestoreOfficialSettings } from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";

export default function OfficialContactManagerTab() {
    const [settings, setSettings] = useState<FirestoreOfficialSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const st = await getOfficialSettings();
            setSettings(st);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await updateOfficialSettings(settings);
            showToast("✅ Official Contact Settings saved!", "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <div className="space-y-3 mt-8">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse h-40" />
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="space-y-4 mt-8 pb-10">
            {/* Section Divider */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full">
                    <Globe size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Official Links & Contact</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            </div>



            <div className="bg-white dark:bg-[#16181C] rounded-[20px] p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Official TTC Network Card</h3>
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                        <input type="checkbox" checked={settings.isVisible} onChange={e => setSettings({ ...settings, isVisible: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Card Visible</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Header Text */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Section Title</label>
                            <input value={settings.title} onChange={e => setSettings({ ...settings, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Tagline / Short Line</label>
                            <input value={settings.tagline} onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><ShieldCheck size={12}/> Trust Line (Badge Text)</label>
                            <input value={settings.trustLine} onChange={e => setSettings({ ...settings, trustLine: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Mail size={12}/> Official Email</label>
                            <input value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                    </div>

                    {/* Links */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Globe size={12}/> Website URL</label>
                            <input value={settings.websiteUrl} onChange={e => setSettings({ ...settings, websiteUrl: e.target.value })} placeholder="https://..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Facebook size={12}/> Facebook Page URL</label>
                            <input value={settings.facebookUrl} onChange={e => setSettings({ ...settings, facebookUrl: e.target.value })} placeholder="https://facebook.com/..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Twitter size={12}/> X / Twitter URL</label>
                            <input value={settings.twitterUrl} onChange={e => setSettings({ ...settings, twitterUrl: e.target.value })} placeholder="https://twitter.com/..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Linkedin size={12}/> LinkedIn Company URL</label>
                            <input value={settings.linkedinUrl} onChange={e => setSettings({ ...settings, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
