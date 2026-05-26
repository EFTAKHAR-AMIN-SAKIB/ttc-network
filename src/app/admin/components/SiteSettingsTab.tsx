"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    Upload,
    Save,
    Check,
    AlertTriangle,
    Image as ImageIcon,
    Type,
    Eye,
    Loader2,
    Sparkles,
    RefreshCw,
    BookText,
} from "lucide-react";
import Image from "next/image";
import { updateSiteSettings, getSiteSettingsDoc } from "@/lib/firestore";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/storage";

/* ═══════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════ */
const DEFAULT_PRIVACY = `# Privacy Policy for TTC Network

**Last Updated: May 26, 2026**

Welcome to **TTC Network**, a unified, community-driven web platform serving all Government Teachers' Training Colleges (TTCs) of Bangladesh. Your privacy and the security of your personal data are extremely important to us. This Privacy Policy explains how we collect, use, share, and protect your information when you use our platform.

---

## 1. Information We Collect

We collect information to provide a secure, collaborative, and verifying academic network for students, faculty, and administrators.

### A. Account & Profile Information
* **Registration details**: Full name, custom username, email address, password (securely authenticated by Google Firebase Authentication), and college selection (with College ID).
* **Profile Customization**: Academic program (e.g. B.Ed Honours or M.Ed), current year/semester, bios, goals, achievements, and social links (Facebook, LinkedIn, GitHub, X/Twitter, or personal website).
* **Uploaded Images**: Profile pictures and profile header covers, hosted and optimized via Cloudinary.

### B. User-Generated Content & Social Interaction
* **Posts & Stories**: Text, pictures, and other media shared with the community.
* **Study Resources**: Shared notes, syllabus PDFs, test prep, and class materials uploaded and securely stored on AWS S3 storage.
* **Interactions**: Comments, replies, and reactions (Love, Fire, Insightful, Clap, Wow) on other users' posts.

### C. Financial & Supporter Information
* **Voluntary Donations**: When you support TTC Network to help keep the student-run platform alive, contribution amounts are registered to issue custom Supporter Badges. Raw payment card details are never stored or processed on our servers; they are managed securely by approved local payment gateways.

---

## 2. How We Use Your Information

We process and utilize your information to maintain a safe, high-quality network:
* **Academic Verification**: Confirming roles (Student vs. Teacher vs. Manager) to ensure notice board and course resource integrity.
* **Dynamic Feeds & Search**: Populating search filters by college, program, and role.
* **Notification Alerts**: Pushing alerts (for post approvals, comments, and mentions) to your profile.
* **Ecosystem Safety**: Enforcing community guidelines through manager moderation tools (suspending or banning guidelines violators).

---

## 3. Data Storage & Third-Party Service Providers

To provide state-of-the-art web performance, we partner with industry-leading secure infrastructure providers:
* **Google Firebase**: Used as our primary database (Cloud Firestore) and authentication platform. All access is controlled strictly via server-side security rules.
* **AWS S3**: Houses shared study resources and documents in encrypted storage.
* **Cloudinary**: Delivers optimized CDN delivery for profile images, covers, and post images.

**We do NOT sell, lease, or distribute your personal data to third-party advertisers or commercial entities.**

---

## 4. Your Rights & Data Controls

You retain full control over your academic digital footprint:
* **Edit Profile**: You can update your bio, social handles, achievements, and photos at any time.
* **Content Deletion**: You can edit or delete your posts, comments, stories, and shared study documents directly. Deleting a document removes the file from our storage servers immediately.
* **Account Deletion**: You may request complete account closure, which deletes your user document and anonymizes all public interactions.

---

## 5. Security & Protection

We enforce rigorous security protocols, including Firestore role validation, HTTPS transit encryption, secure token authentication, and regular server configuration checks to protect your data from unauthorized access or alteration.

---

## 6. Contact Us

If you have any questions, feedback, or requests regarding this Privacy Policy, please contact our support team at:
* **Email**: ttcnetwork.xyz@gmail.com`;

const DEFAULTS = {
    siteName: "TTC Network",
    siteTagline: "One Platform. All Colleges. Every Story.",
    logoUrl: "/logos/ttc network.png",
    privacyPolicy: DEFAULT_PRIVACY,
};

/* ═══════════════════════════════════════════════════
   SITE SETTINGS TAB COMPONENT
   ═══════════════════════════════════════════════════ */
import { UserProfile } from "@/contexts/AuthContext";

export default function SiteSettingsTab({ profile }: { profile: UserProfile }) {
    // Form state
    const [siteName, setSiteName] = useState(DEFAULTS.siteName);
    const [siteTagline, setSiteTagline] = useState(DEFAULTS.siteTagline);
    const [logoUrl, setLogoUrl] = useState(DEFAULTS.logoUrl);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState("");
    const [privacyPolicy, setPrivacyPolicy] = useState("");

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // Original state for comparison
    const [original, setOriginal] = useState({ siteName: "", siteTagline: "", logoUrl: "", privacyPolicy: "" });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ═══ Load current settings ═══
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await getSiteSettingsDoc();
            if (data) {
                setSiteName(data.siteName || DEFAULTS.siteName);
                setSiteTagline(data.siteTagline || DEFAULTS.siteTagline);
                setLogoUrl(data.logoUrl || DEFAULTS.logoUrl);
                setPrivacyPolicy(data.privacyPolicy || DEFAULTS.privacyPolicy);
                setOriginal({
                    siteName: data.siteName || DEFAULTS.siteName,
                    siteTagline: data.siteTagline || DEFAULTS.siteTagline,
                    logoUrl: data.logoUrl || DEFAULTS.logoUrl,
                    privacyPolicy: data.privacyPolicy || DEFAULTS.privacyPolicy,
                });
            } else {
                setOriginal({ ...DEFAULTS });
            }
        } catch (err) {
            console.error("[SiteSettings] Load failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // ═══ Track changes ═══
    useEffect(() => {
        const changed =
            siteName !== original.siteName ||
            siteTagline !== original.siteTagline ||
            logoUrl !== original.logoUrl ||
            privacyPolicy !== original.privacyPolicy ||
            logoFile !== null;
        setHasChanges(changed);
    }, [siteName, siteTagline, logoUrl, privacyPolicy, logoFile, original]);

    // ═══ Logo file selection ═══
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file (PNG, JPG, SVG, WebP)");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("Logo must be under 5MB");
            return;
        }

        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setError("");
    };

    // ═══ Save settings ═══
    const handleSave = async () => {
        if (!siteName.trim()) {
            setError("Site name cannot be empty");
            return;
        }

        setSaving(true);
        setError("");

        try {
            let finalLogoUrl = logoUrl;

            // Upload new logo if selected
            if (logoFile) {
                setUploading(true);
                if (logoUrl && logoUrl !== DEFAULTS.logoUrl && !logoUrl.startsWith('/')) {
                    try {
                        await deleteFromCloudinary(logoUrl);
                    } catch (e) {
                        console.warn("Failed to delete old logo", e);
                    }
                }

                const uniqueId = `site-logo-${Date.now()}`;
                const result = await uploadToCloudinary(
                    logoFile,
                    "logos",
                    "site-branding",
                    uniqueId
                );
                finalLogoUrl = result.url;
                setUploading(false);
            }

            // Save to Firestore
            await updateSiteSettings({
                siteName: siteName.trim(),
                siteTagline: siteTagline.trim(),
                logoUrl: finalLogoUrl,
                privacyPolicy: privacyPolicy.trim(),
            });

            // Update local state
            setLogoUrl(finalLogoUrl);
            setLogoFile(null);
            setLogoPreview("");
            setOriginal({
                siteName: siteName.trim(),
                siteTagline: siteTagline.trim(),
                logoUrl: finalLogoUrl,
                privacyPolicy: privacyPolicy.trim(),
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error("[SiteSettings] Save failed:", err);
            setError("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    // ═══ Reset to defaults ═══
    const handleReset = () => {
        setSiteName(DEFAULTS.siteName);
        setSiteTagline(DEFAULTS.siteTagline);
        setLogoUrl(DEFAULTS.logoUrl);
        setPrivacyPolicy(DEFAULTS.privacyPolicy);
        setLogoFile(null);
        setLogoPreview("");
    };

    const currentLogoSrc = logoPreview || logoUrl;

    // ═══ LOADING STATE ═══
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading site settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Settings size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Website Settings</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage your site name, tagline, and logo</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
                >
                    <RefreshCw size={12} />
                    Reset
                </button>
            </div>

            {/* ═══ Settings Card ═══ */}
            <div className="bg-white dark:bg-[#16181C] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-6 space-y-8">

                    {/* ─── Logo Section ─── */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-4">
                            <ImageIcon size={16} className="text-purple-500" />
                            Website Logo
                        </label>

                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            {/* Logo Preview */}
                            <div className="relative group">
                                <div
                                    className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center cursor-pointer group-hover:border-purple-400 dark:group-hover:border-purple-500 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {currentLogoSrc ? (
                                        <Image
                                            src={currentLogoSrc}
                                            alt="Site Logo"
                                            width={100}
                                            height={100}
                                            className="object-contain w-full h-full p-2"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <Upload size={24} className="text-gray-300 mx-auto mb-1" />
                                            <p className="text-[10px] text-gray-400">Upload</p>
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                        <Upload size={20} className="text-white" />
                                    </div>
                                </div>
                                {logoFile && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[#16181C]"
                                    >
                                        <Check size={10} className="text-white" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Upload info */}
                            <div className="flex-1 min-w-0">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-2 border border-purple-100 dark:border-purple-800/30"
                                >
                                    <Upload size={14} />
                                    {logoFile ? "Change Logo" : "Upload New Logo"}
                                </button>
                                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                    Recommended: Square PNG or SVG, at least 200×200px.
                                    <br /> Max file size: 5MB. The logo appears in the navbar, login page, and footer.
                                </p>
                                {logoFile && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-semibold flex items-center gap-1"
                                    >
                                        <Check size={12} />
                                        {logoFile.name} ({(logoFile.size / 1024).toFixed(1)}KB) — ready to upload
                                    </motion.p>
                                )}
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoSelect}
                        />
                    </div>

                    {/* ─── Divider ─── */}
                    <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />

                    {/* ─── Site Name ─── */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
                            <Type size={16} className="text-blue-500" />
                            Site Name
                        </label>
                        <input
                            type="text"
                            value={siteName}
                            onChange={(e) => setSiteName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                            placeholder="TTC Network"
                            maxLength={50}
                        />
                        <p className="text-[11px] text-gray-400 mt-1.5">
                            Displayed in the navbar, browser tab, and across the platform. {siteName.length}/50
                        </p>
                    </div>

                    {/* ─── Tagline ─── */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
                            <Sparkles size={16} className="text-amber-500" />
                            Tagline
                        </label>
                        <input
                            type="text"
                            value={siteTagline}
                            onChange={(e) => setSiteTagline(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                            placeholder="One Platform. All Colleges. Every Story."
                            maxLength={100}
                        />
                        <p className="text-[11px] text-gray-400 mt-1.5">
                            Appears in the browser tab title after the site name. {siteTagline.length}/100
                        </p>
                    </div>

                    {/* ─── Divider ─── */}
                    <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />

                    {/* ─── Privacy Policy ─── */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-3">
                            <BookText size={16} className="text-emerald-500" />
                            Privacy Policy Document (Markdown Supported)
                        </label>
                        <textarea
                            value={privacyPolicy}
                            onChange={(e) => setPrivacyPolicy(e.target.value)}
                            rows={12}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all resize-y"
                            placeholder="Type your privacy policy here in markdown..."
                        />
                        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                            Use standard markdown formatting: <code># Heading 1</code>, <code>## Heading 2</code>, <code>### Heading 3</code>, <code>**bold**</code>, and <code>- bullets</code> to structure the content beautifully.
                        </p>
                    </div>
                </div>

                {/* ─── Divider ─── */}
                <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />

                {/* ═══ Live Preview ═══ */}
                <div className="p-6">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white mb-4">
                        <Eye size={16} className="text-emerald-500" />
                        Live Preview
                    </label>

                    {/* Navbar Preview */}
                    <div className="bg-gray-50 dark:bg-[#0C0C10] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Navbar Preview</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
                                {currentLogoSrc ? (
                                    <Image
                                        src={currentLogoSrc}
                                        alt="Preview"
                                        width={36}
                                        height={36}
                                        className="object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                                    {siteName.split(" ")[0] || "TTC"}
                                </span>
                                <span
                                    className="text-base font-black tracking-tight"
                                    style={{
                                        background: "linear-gradient(135deg, var(--primary), var(--accent))",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    {siteName.split(" ").slice(1).join(" ") || "Network"}
                                </span>
                            </div>
                        </div>

                        {/* Tab Title Preview */}
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Browser Tab</p>
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 max-w-sm">
                                <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0">
                                    {currentLogoSrc ? (
                                        <Image
                                            src={currentLogoSrc}
                                            alt="Favicon"
                                            width={16}
                                            height={16}
                                            className="object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary to-accent rounded-sm" />
                                    )}
                                </div>
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                    {siteName} — {siteTagline}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Error / Success ─── */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-6"
                        >
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        </motion.div>
                    )}
                    {saved && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-6"
                        >
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Check size={14} />
                                Settings saved! Changes are now live across the entire site.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Actions ─── */}
                <div className="p-6 pt-4 flex items-center justify-between">
                    <p className="text-[11px] text-gray-400">
                        {hasChanges ? "You have unsaved changes" : "All changes saved"}
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                        style={{
                            background: hasChanges
                                ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
                                : "linear-gradient(135deg, #6b7280, #4b5563)",
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {uploading ? "Uploading Logo..." : "Saving..."}
                            </>
                        ) : saved ? (
                            <>
                                <Check size={16} />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ═══ Info Note ═══ */}
            <div className="bg-violet-50/50 dark:bg-violet-500/10 rounded-2xl p-5 border border-violet-100/50 dark:border-violet-500/20">
                <div className="flex items-start gap-3">
                    <Sparkles size={16} className="text-violet-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-violet-700 dark:text-violet-300 mb-1">Real-time Updates</p>
                        <p className="text-xs text-violet-600/80 dark:text-violet-400/80 leading-relaxed">
                            Changes saved here are reflected{" "}
                            <strong>instantly</strong> across the entire website — navbar, login page,
                            browser tab, and all pages that display the site name or logo. No rebuild needed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
