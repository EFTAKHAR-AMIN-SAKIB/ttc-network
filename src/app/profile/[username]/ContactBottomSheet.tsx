"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, CheckCircle, Lock, Mail, Phone, MessageCircle, 
    Facebook, Globe, ExternalLink, Check, Copy, Pencil 
} from "lucide-react";
import type { UserProfile } from "@/contexts/AuthContext";
import type { ProfilePermissions } from "@/lib/profilePrivacy";
import { useToast } from "@/contexts/ToastContext";

interface ContactBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    profileData: UserProfile | null;
    profilePermissions: ProfilePermissions;
    isViewingAsOwner: boolean;
    onEditContact?: () => void;
}

export function ContactBottomSheet({
    isOpen,
    onClose,
    profileData,
    profilePermissions,
    isViewingAsOwner,
    onEditContact
}: ContactBottomSheetProps) {
    const { showToast } = useToast();
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopyField = (text: string, fieldKey: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        showToast(`${label} copied to clipboard!`, "success");
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Lock body scroll on mobile only while drawer is open
    useEffect(() => {
        if (!isOpen) return;
        if (typeof window === "undefined" || window.innerWidth >= 768) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!profileData) return null;

    const hasAnyContact = Boolean(
        profileData.publicEmail || 
        profileData.phone || 
        profileData.whatsapp || 
        profileData.facebook || 
        profileData.website
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="md:hidden">
                    {/* Mobile Backdrop */}
                    <motion.div
                        key="contact-mobile-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
                        aria-hidden="true"
                    />

                    {/* Mobile Bottom Sheet Drawer */}
                    <motion.div
                        key="contact-mobile-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 80 || info.velocity.y > 400) {
                                onClose();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed bottom-0 inset-x-0 z-[120] bg-white dark:bg-[#111118] border-t border-slate-200/80 dark:border-gray-800 rounded-t-[2.5rem] shadow-2xl max-h-[85vh] overflow-y-auto p-5 pt-3 pb-8"
                    >
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing" />

                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-primary/10 border-2 border-primary/20 overflow-hidden relative shrink-0">
                                    {profileData.photoURL ? (
                                        <Image 
                                            src={profileData.photoURL} 
                                            alt={profileData.displayName || "Avatar"} 
                                            fill 
                                            className="object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-primary text-base">
                                            {profileData.displayName?.[0] || "?"}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-sm font-black text-navy-900 dark:text-white tracking-tight truncate">
                                            {profileData.displayName}
                                        </h3>
                                        {profileData.roleVerified && (
                                            <CheckCircle size={13} className="text-primary fill-primary/20 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-400 truncate">
                                        Contact & Connectivity
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-full bg-slate-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Contact Items List */}
                        {!profilePermissions.canViewContact ? (
                            <div className="py-12 px-4 text-center">
                                <div className="w-14 h-14 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                    <Lock size={24} />
                                </div>
                                <h4 className="text-sm font-black text-navy-950 dark:text-white">
                                    Contact Info is Protected
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                    {profilePermissions.isLockedForEveryone
                                        ? "Contact information is private and hidden from everyone."
                                        : `Contact information is locked. Follow ${profileData.displayName || "this user"} to view contact details.`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Email */}
                                {profileData.publicEmail && (
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Mail size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">Email</div>
                                                <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate select-all">{profileData.publicEmail}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={`mailto:${profileData.publicEmail}`}
                                                className="px-3 py-1.5 bg-blue-600 text-white font-bold text-[11px] rounded-xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all inline-flex items-center gap-1"
                                            >
                                                <ExternalLink size={12} />
                                                Mail
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyField(profileData.publicEmail!, "email", "Email")}
                                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-xl hover:text-primary active:scale-95 transition-all"
                                                title="Copy Email"
                                            >
                                                {copiedField === "email" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Phone */}
                                {profileData.phone && (
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <Phone size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">Phone Number</div>
                                                <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate select-all">{profileData.phone}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={`tel:${profileData.phone.replace(/\s+/g, '')}`}
                                                className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-[11px] rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 transition-all inline-flex items-center gap-1"
                                            >
                                                <Phone size={12} />
                                                Call
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyField(profileData.phone!, "phone", "Phone number")}
                                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-xl hover:text-emerald-500 active:scale-95 transition-all"
                                                title="Copy Phone Number"
                                            >
                                                {copiedField === "phone" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* WhatsApp */}
                                {profileData.whatsapp && (
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                                <MessageCircle size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">WhatsApp</div>
                                                <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate select-all">{profileData.whatsapp}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={`https://wa.me/${profileData.whatsapp.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-green-600 text-white font-bold text-[11px] rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all inline-flex items-center gap-1"
                                            >
                                                <MessageCircle size={12} />
                                                Chat
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyField(profileData.whatsapp!, "whatsapp", "WhatsApp number")}
                                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-xl hover:text-green-500 active:scale-95 transition-all"
                                                title="Copy WhatsApp Number"
                                            >
                                                {copiedField === "whatsapp" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Facebook */}
                                {profileData.facebook && (
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Facebook size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">Facebook</div>
                                                <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">
                                                    {profileData.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, '')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={profileData.facebook.startsWith('http') ? profileData.facebook : `https://${profileData.facebook}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-[#1877F2] text-white font-bold text-[11px] rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1"
                                            >
                                                <ExternalLink size={12} />
                                                Visit
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyField(profileData.facebook!, "facebook", "Facebook link")}
                                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-xl hover:text-[#1877F2] active:scale-95 transition-all"
                                                title="Copy Facebook Link"
                                            >
                                                {copiedField === "facebook" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Website / Portfolio */}
                                {profileData.website && (
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                <Globe size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">Portfolio / Website</div>
                                                <div className="text-xs font-bold text-navy-900 dark:text-gray-200 truncate">
                                                    {profileData.website.replace(/^https?:\/\/(www\.)?/, '')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-purple-600 text-white font-bold text-[11px] rounded-xl shadow-sm hover:bg-purple-700 active:scale-95 transition-all inline-flex items-center gap-1"
                                            >
                                                <ExternalLink size={12} />
                                                Visit
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyField(profileData.website!, "website", "Website link")}
                                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded-xl hover:text-purple-600 active:scale-95 transition-all"
                                                title="Copy Website Link"
                                            >
                                                {copiedField === "website" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!hasAnyContact && (
                                    <div className="py-10 px-4 text-center space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
                                            <MessageCircle size={26} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-navy-900 dark:text-white">No Contact Details Available</h4>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                                                This user hasn&apos;t added any public contact or connectivity details yet.
                                            </p>
                                        </div>
                                        {isViewingAsOwner && onEditContact && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onEditContact();
                                                }}
                                                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                            >
                                                <Pencil size={13} />
                                                Add Contact Info
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {hasAnyContact && (
                            <p className="text-[10px] text-center font-medium text-gray-400 dark:text-gray-500 mt-5">
                                Tap action buttons to connect directly or copy details to clipboard.
                            </p>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
