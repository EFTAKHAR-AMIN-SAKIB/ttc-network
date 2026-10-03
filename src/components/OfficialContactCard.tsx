"use client";

import { motion } from "framer-motion";
import { Globe, Mail, Facebook, Twitter, Linkedin, ShieldCheck } from "lucide-react";
import type { FirestoreOfficialSettings } from "@/lib/firestore";
import Link from "next/link";

interface OfficialContactCardProps {
    settings: FirestoreOfficialSettings;
}

export default function OfficialContactCard({ settings }: OfficialContactCardProps) {
    if (!settings?.isVisible) return null;

    const rawSocialLinks = [
        { icon: Globe, url: settings.websiteUrl?.trim(), label: "Website", color: "hover:text-blue-500" },
        { icon: Mail, url: settings.email?.trim() ? `mailto:${settings.email.trim()}` : undefined, label: "Email", color: "hover:text-red-500" },
        { icon: Facebook, url: settings.facebookUrl?.trim(), label: "Facebook", color: "hover:text-blue-600" },
        { icon: Twitter, url: settings.twitterUrl?.trim(), label: "Twitter", color: "hover:text-sky-400" },
        { icon: Linkedin, url: settings.linkedinUrl?.trim(), label: "LinkedIn", color: "hover:text-blue-700" },
    ];

    // Filter out options that have no input or are empty so only active channels are displayed
    const socialLinks = rawSocialLinks.filter(
        (link): link is typeof link & { url: string } => Boolean(link.url && link.url.length > 0)
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-8 max-w-2xl mx-auto w-full"
        >
            <div className="relative group">
                {/* Background Glass Effect */}
                <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/5" />

                <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
                    {/* Header */}
                    {settings.title?.trim() && (
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Globe size={16} className="text-primary" />
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white font-english">
                                {settings.title.trim()}
                            </h3>
                        </div>
                    )}
                    
                    {settings.tagline?.trim() && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                            {settings.tagline.trim()}
                        </p>
                    )}

                    {/* Social Icons Row - Only shown when at least one active channel exists */}
                    {socialLinks.length > 0 && (
                        <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 mb-6">
                            {socialLinks.map((link, i) => (
                                <motion.a
                                    key={i}
                                    href={link.url}
                                    target={!link.url.startsWith("mailto:") ? "_blank" : undefined}
                                    rel={!link.url.startsWith("mailto:") ? "noopener noreferrer" : undefined}
                                    whileHover={{ scale: 1.15, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-300 ${link.color} transition-all duration-300 shadow-sm hover:shadow-md hover:border-current/20`}
                                    title={link.label}
                                >
                                    <link.icon size={20} />
                                </motion.a>
                            ))}
                        </div>
                    )}

                    {/* Email Display */}
                    {settings.email?.trim() && (
                        <a 
                            href={`mailto:${settings.email.trim()}`}
                            className="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors mb-4 block"
                        >
                            {settings.email.trim()}
                        </a>
                    )}

                    {/* Trust Line */}
                    {settings.trustLine?.trim() && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                {settings.trustLine.trim()}
                            </span>
                        </div>
                    )}

                    {/* Privacy Policy Link */}
                    <Link 
                        href="/privacy" 
                        className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-emerald-400 transition-colors flex items-center gap-1 select-none cursor-pointer"
                    >
                        <ShieldCheck size={12} className="text-gray-400 dark:text-gray-500" />
                        Privacy Policy
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
