"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
    Shield, 
    Lock, 
    Database, 
    FileText, 
    ArrowLeft, 
    Printer, 
    CheckCircle2, 
    CloudLightning,
    FileCheck,
    Calendar,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { getSiteSettingsDoc, type SiteSettingsDoc } from "@/lib/firestore";

/* ═══════════════════════════════════════════════════
   DEFAULT PRIVACY POLICY (Fallback)
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

/* ═══════════════════════════════════════════════════
   Markdown → React (Formal Legal Document Rendering)
   ═══════════════════════════════════════════════════ */
function parseMarkdownToReact(markdown: string) {
    if (!markdown) return null;
    const lines = markdown.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        if (trimmed === "") {
            elements.push(<div key={`space-${i}`} className="h-3" />);
            return;
        }

        if (trimmed === "---") {
            elements.push(
                <hr key={`hr-${i}`} className="my-8 border-t border-gray-200 dark:border-white/10" />
            );
            return;
        }

        if (trimmed.startsWith("# ")) {
            elements.push(
                <h1 key={`h1-${i}`} className="privacy-heading-1">
                    {trimmed.slice(2)}
                </h1>
            );
            return;
        }

        if (trimmed.startsWith("## ")) {
            const title = trimmed.slice(3);
            const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            elements.push(
                <h2 key={`h2-${i}`} id={id} className="privacy-heading-2 scroll-mt-24">
                    {title}
                </h2>
            );
            return;
        }

        if (trimmed.startsWith("### ")) {
            elements.push(
                <h3 key={`h3-${i}`} className="privacy-heading-3">
                    {trimmed.slice(4)}
                </h3>
            );
            return;
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const content = trimmed.slice(2);
            elements.push(
                <li key={`li-${i}`} className="privacy-list-item">
                    {parseInlineBold(content)}
                </li>
            );
            return;
        }

        elements.push(
            <p key={`p-${i}`} className="privacy-paragraph">
                {parseInlineBold(trimmed)}
            </p>
        );
    });

    return elements;
}

function parseInlineBold(text: string) {
    const parts = text.split("**");
    if (parts.length <= 1) return text;
    return parts.map((part, index) => 
        index % 2 === 1 ? <strong key={index} className="font-bold text-gray-900 dark:text-white">{part}</strong> : part
    );
}

/* ═══════════════════════════════════════════════════
   Markdown → HTML String (for Print PDF)
   ═══════════════════════════════════════════════════ */
function markdownToFormalHtml(markdown: string): string {
    if (!markdown) return "";
    
    const lines = markdown.split("\n");
    const htmlParts: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === "") {
            htmlParts.push('<div style="height:6px"></div>');
            continue;
        }

        if (trimmed === "---") {
            htmlParts.push('<hr style="border:none;border-top:1px solid #bbb;margin:24px 0;" />');
            continue;
        }

        if (trimmed.startsWith("# ")) {
            // Skip H1 — we use the formal header block instead
            continue;
        }

        if (trimmed.startsWith("## ")) {
            const title = trimmed.slice(3);
            htmlParts.push(`<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:14pt;font-weight:700;color:#111;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid #ddd;">${boldify(title)}</h2>`);
            continue;
        }

        if (trimmed.startsWith("### ")) {
            const title = trimmed.slice(4);
            htmlParts.push(`<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:12pt;font-weight:600;color:#222;margin:18px 0 6px;">${boldify(title)}</h3>`);
            continue;
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            const content = trimmed.slice(2);
            htmlParts.push(`<li style="margin:3px 0 3px 28px;font-size:11pt;line-height:1.7;">${boldify(content)}</li>`);
            continue;
        }

        // Regular paragraph
        htmlParts.push(`<p style="font-size:11pt;line-height:1.8;color:#222;margin:5px 0;text-align:justify;">${boldify(trimmed)}</p>`);
    }

    return htmlParts.join("\n");
}

function boldify(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#000;">$1</strong>');
}

/* ═══════════════════════════════════════════════════
   PRIVACY PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function PrivacyPage() {
    const [settings, setSettings] = useState<SiteSettingsDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("");

    useEffect(() => {
        getSiteSettingsDoc()
            .then(setSettings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Use Firestore content OR fallback to built-in default
    const privacyContent = settings?.privacyPolicy || DEFAULT_PRIVACY;

    // Generate Table of Contents from Markdown headers
    const toc = (() => {
        const lines = privacyContent.split("\n");
        return lines
            .filter(line => line.startsWith("## "))
            .map(line => {
                const title = line.slice(3).trim();
                return {
                    title,
                    id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                };
            });
    })();

    /* ─── Print / Save as PDF Handler ─── */
    const handlePrint = () => {
        const formalHtml = markdownToFormalHtml(privacyContent);
        const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

        const printDoc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Privacy Policy — TTC Network</title>
    <style>
        @page {
            size: A4;
            margin: 2cm 2.2cm 2.5cm 2.2cm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Georgia, 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #1a1a1a;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .doc-header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2.5px solid #111;
            margin-bottom: 28px;
        }
        .doc-header .org-name {
            font-size: 20pt;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #000;
            margin-bottom: 2px;
        }
        .doc-header .doc-type {
            font-size: 14pt;
            font-weight: 400;
            color: #444;
            letter-spacing: 1.5px;
            margin-bottom: 6px;
        }
        .doc-header .doc-date {
            font-size: 9pt;
            color: #777;
        }
        .doc-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #aaa;
            padding: 8px 0;
            border-top: 0.5px solid #ddd;
        }
        .content {
            padding-bottom: 40px;
        }
        h2 { page-break-after: avoid; }
        h3 { page-break-after: avoid; }
        li { page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="doc-header">
        <div class="org-name">TTC Network</div>
        <div class="doc-type">Privacy Policy</div>
        <div class="doc-date">Document generated on ${today}</div>
    </div>
    <div class="doc-footer">
        TTC Network &mdash; Privacy Policy &nbsp;&bull;&nbsp; Confidential
    </div>
    <div class="content">
        ${formalHtml}
    </div>
</body>
</html>`;

        // Use a hidden iframe for reliable cross-browser print
        let iframe = document.getElementById('privacy-print-frame') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'privacy-print-frame';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.style.opacity = '0';
            document.body.appendChild(iframe);
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(printDoc);
            iframeDoc.close();

            // Wait for content to render then print
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            }, 350);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0C0C10] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Shield size={40} className="animate-pulse text-primary mx-auto" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Loading Privacy Terms...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0C0C10] transition-colors duration-300 font-sans pb-16">
            {/* ═══ Top Premium Hero Section ═══ */}
            <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-transparent to-transparent py-16 sm:py-24 border-b border-gray-100 dark:border-white/5">
                <div className="absolute inset-0 noise-bg opacity-[0.03] dark:opacity-[0.07]" />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <Link 
                            href="/"
                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-emerald-400 transition-colors mb-6 group"
                        >
                            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                            Return Home
                        </Link>
                        
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-emerald-500/10 border border-primary/20 dark:border-emerald-500/25 flex items-center justify-center mb-6 shadow-sm shadow-primary/5"
                        >
                            <Shield size={32} className="text-primary dark:text-emerald-400 animate-pulse-breathe" />
                        </motion.div>

                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                            className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white font-sora leading-tight"
                        >
                            Privacy Policy
                        </motion.h1>

                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl font-medium font-hind-siliguri leading-relaxed"
                        >
                            We are committed to protecting your academic digital footprint. Understand how your profile, notice posts, and study resources are handled securely.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-4 mt-8 flex-wrap justify-center"
                        >
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                <Calendar size={12} className="text-primary dark:text-emerald-400" />
                                Updated May 2026
                            </div>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-100 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 font-bold transition-all shadow-sm active:scale-95"
                            >
                                <Printer size={12} />
                                Print / Save PDF
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ═══ Main Content Area ═══ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* ─── Left Sticky Sidebar (TOC) ─── */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white dark:bg-[#16181C] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                    <FileText size={12} />
                                    Sections
                                </h3>
                                <div className="space-y-2">
                                    {toc.map((item, index) => (
                                        <a
                                            key={index}
                                            href={`#${item.id}`}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`block text-xs font-bold transition-all truncate hover:translate-x-1 ${
                                                activeSection === item.id 
                                                    ? "text-primary dark:text-emerald-400 translate-x-1" 
                                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            }`}
                                        >
                                            {item.title}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Secure Data Badge Card */}
                            <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 dark:from-emerald-500/10 dark:to-blue-500/10 rounded-2xl p-5 border border-emerald-500/10 dark:border-emerald-500/20 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                                
                                <div className="flex items-center gap-2 mb-3">
                                    <Lock size={16} className="text-emerald-500" />
                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Ecosystem Status</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Firebase Auth ACTIVE</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">AWS S3 Encrypted Uploads</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Cloudinary CDN Optimized</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right Main Policy Content ─── */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Status Grid Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <motion.div 
                                whileHover={{ y: -4 }}
                                className="bg-white dark:bg-[#16181C] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-500 flex-shrink-0">
                                    <Database size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Firestore Database</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Core data is securely structured in Google Cloud, safeguarded with server-side role validation.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div 
                                whileHover={{ y: -4 }}
                                className="bg-white dark:bg-[#16181C] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 flex-shrink-0">
                                    <CloudLightning size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">AWS & Cloud CDN</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Documents and media assets are optimized through Cloudinary CDN and encrypted inside AWS S3 buckets.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div 
                                whileHover={{ y: -4 }}
                                className="bg-white dark:bg-[#16181C] p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-500 flex-shrink-0">
                                    <FileCheck size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Verified Roles Only</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Notice posting and study assets uploads require vetted college verification, keeping our community safe.
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        {/* ═══ Formal Privacy Policy Document Card ═══ */}
                        <div className="privacy-document-card">
                            <div className="privacy-document-body">
                                {parseMarkdownToReact(privacyContent)}
                            </div>
                        </div>

                        {/* Acknowledge Banner */}
                        <div className="bg-white dark:bg-[#16181C] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <Lock size={18} className="text-emerald-500" />
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">Active Data Protection Enforced</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">By using TTC Network, you agree to the conditions stated in this policy.</p>
                                </div>
                            </div>
                            <Link
                                href="/"
                                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all shadow-md shadow-primary/10 active:scale-95 whitespace-nowrap"
                            >
                                Acknowledge & Return
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
