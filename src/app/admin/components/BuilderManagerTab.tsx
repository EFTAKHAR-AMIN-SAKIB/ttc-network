"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, Code, Image as ImageIcon, Type, Link as LinkIcon, Loader2 } from "lucide-react";
import { getBuilderSettings, updateBuilderSettings, type FirestoreBuilderSettings } from "@/lib/firestore";
import { uploadToCloudinary } from "@/lib/storage";
import { useToast } from "@/contexts/ToastContext";

export default function BuilderManagerTab() {
    const [settings, setSettings] = useState<FirestoreBuilderSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const st = await getBuilderSettings();
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
            await updateBuilderSettings(settings);
            showToast("✅ Builder Settings saved!", "success");
        } catch (err) {
            showToast(`❌ ${err instanceof Error ? err.message : "Error"}`, "error");
        }
        setIsSaving(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !settings) return;
        const file = e.target.files[0];
        setUploadingImage(true);
        try {
            const result = await uploadToCloudinary(file, "avatars", "builder", "builder_profile");
            setSettings({ ...settings, imageUrl: result.url, imageMode: "image" });
            showToast("✅ Image uploaded. Don't forget to save!", "success");
        } catch (error) {
            console.error("Upload error:", error);
            showToast(`❌ Image upload failed: ${error instanceof Error ? error.message : "Error"}`, "error");
        }
        setUploadingImage(false);
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
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 rounded-full">
                    <Code size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Builder Section</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            </div>



            <div className="bg-white dark:bg-[#16181C] rounded-[20px] p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Homepage Builder Card</h3>
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                        <input type="checkbox" checked={settings.isVisible} onChange={e => setSettings({ ...settings, isVisible: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Section Visible</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Header Text */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Title Prefix</label>
                            <input value={settings.titlePrefix} onChange={e => setSettings({ ...settings, titlePrefix: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Title Accent (Colored text)</label>
                            <input value={settings.titleAccent} onChange={e => setSettings({ ...settings, titleAccent: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        
                        <div className="pt-2">
                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Description (Paragraph 1)</label>
                             <textarea value={settings.descriptionPara1} onChange={e => setSettings({ ...settings, descriptionPara1: e.target.value })} rows={4}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Description (Paragraph 2)</label>
                             <textarea value={settings.descriptionPara2} onChange={e => setSettings({ ...settings, descriptionPara2: e.target.value })} rows={2}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
                        </div>
                    </div>

                    {/* Builder Info & Picture */}
                    <div className="space-y-4">
                        {/* Image Mode */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3"><ImageIcon size={12}/> Avatar Picture Mode</label>
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={settings.imageMode === "text"} onChange={() => setSettings({ ...settings, imageMode: "text" })} name="imageMode" />
                                    <span className="text-sm font-medium dark:text-gray-300">Text Letter</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={settings.imageMode === "image"} onChange={() => setSettings({ ...settings, imageMode: "image" })} name="imageMode" />
                                    <span className="text-sm font-medium dark:text-gray-300">Upload Image</span>
                                </label>
                            </div>
                            
                            {settings.imageMode === "text" ? (
                                <div>
                                    <input value={settings.imageText} onChange={e => setSettings({ ...settings, imageText: e.target.value })} maxLength={2} placeholder="S"
                                        className="w-16 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white text-center font-bold" />
                                    <p className="text-xs text-gray-500 mt-1">1-2 letters inside the gradient box.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {settings.imageUrl && (
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={settings.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div>
                                       <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold cursor-pointer w-max hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                            {uploadingImage ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ImageIcon size={16} className="text-blue-500" />}
                                            {uploadingImage ? "Uploading..." : "Upload New Photo"}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Builder Name</label>
                            <input value={settings.builderName} onChange={e => setSettings({ ...settings, builderName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Builder Job Title</label>
                            <input value={settings.builderTitle} onChange={e => setSettings({ ...settings, builderTitle: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        
                        <div className="pt-2 flex gap-3">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Button Text</label>
                                <input value={settings.buttonText} onChange={e => setSettings({ ...settings, buttonText: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><LinkIcon size={12}/> Button URL</label>
                                <input value={settings.buttonUrl} onChange={e => setSettings({ ...settings, buttonUrl: e.target.value })} placeholder="https://..."
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Popup Details Row */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Code size={16} className="text-primary" />
                        Popup Modal Specific Details
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">These details will show up in the modal when someone clicks the connect button (if 'Button URL' is left empty).</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><Type size={12}/> Popup Location Line</label>
                            <input value={settings.popupLocation} onChange={e => setSettings({ ...settings, popupLocation: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><LinkIcon size={12}/> LinkedIn URL</label>
                            <input value={settings.popupLinkedinUrl} onChange={e => setSettings({ ...settings, popupLinkedinUrl: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><LinkIcon size={12}/> Portfolio URL</label>
                            <input value={settings.popupPortfolioUrl} onChange={e => setSettings({ ...settings, popupPortfolioUrl: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><LinkIcon size={12}/> Contact Email (mailto:)</label>
                            <input value={settings.popupContactEmail} onChange={e => setSettings({ ...settings, popupContactEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1"><LinkIcon size={12}/> WhatsApp Number</label>
                            <input value={settings.popupWhatsappNumber || ""} onChange={e => setSettings({ ...settings, popupWhatsappNumber: e.target.value })} placeholder="+880..."
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
