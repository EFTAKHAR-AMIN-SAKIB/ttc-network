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

    const socialLinks = [
        { icon: Globe, url: settings.websiteUrl, label: "Website", color: "hover:text-blue-500" },
        { icon: Mail, url: `mailto:${settings.email}`, label: "Email", color: "hover:text-red-500" },
        { icon: Facebook, url: settings.facebookUrl, label: "Facebook", color: "hover:text-blue-600" },
        { icon: Twitter, url: settings.twitterUrl, label: "Twitter", color: "hover:text-sky-400" },
        { icon: Linkedin, url: settings.linkedinUrl, label: "LinkedIn", color: "hover:text-blue-700" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-8 max-w-2xl mx-auto"
        >
            <div className="relative group">
                {/* Background Glass Effect */}
                <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/5" />

                <div className="relative p-6 sm:p-8 flex flex-col items-center text-center">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Globe size={16} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white font-english">
                            {settings.title}
                        </h3>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                        {settings.tagline}
                    </p>

                    {/* Social Icons Row */}
                    <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
                        {socialLinks.map((link, i) => (
                            <motion.a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.15, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={`p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-400 ${link.color} transition-all duration-300 shadow-sm hover:shadow-md hover:border-current/20`}
                                title={link.label}
                            >
                                <link.icon size={20} />
                            </motion.a>
                        ))}
                    </div>

                    {/* Email Display */}
                    <a 
                        href={`mailto:${settings.email}`}
                        className="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors mb-4 block"
                    >
                        {settings.email}
                    </a>

                    {/* Trust Line */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            {settings.trustLine}
                        </span>
                    </div>

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
