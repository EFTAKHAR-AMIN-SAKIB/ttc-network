"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Save, User, GraduationCap, Briefcase, Award, Globe, 
    AtSign, MapPin, Target, Sparkles, Plus, Trash2, Camera,
    Loader2, Check, Building, Info, Mail, Phone, MessageCircle, Facebook, Shield
} from "lucide-react";
import { useAuth, type UserProfile, type WorkExperienceEntry, type EducationEntry, type PositionEntry } from "@/contexts/AuthContext";
import { colleges } from "@/data/colleges";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { checkUsernameAvailability, syncUserProfileUpdates } from "@/lib/firestore";
import { 
    CollapsibleSection, 
    FormInput, 
    FormSelect, 
    ArrayEditor 
} from "./ProfileEditFields";

interface ProfileEditDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    focusField?: string | null;
    onFocusFieldHandled?: () => void;
}

// Maps field keys from ProfileCompletionCard to drawer section IDs
const FIELD_TO_SECTION: Record<string, string> = {
    displayName: "basic-identity",
    username: "basic-identity",
    bio: "basic-identity",
    favoriteQuote: "basic-identity",
    collegeId: "academic-context",
    academicYear: "academic-context",
    industry: "professional-details",
    publicEmail: "contact-connectivity",
    phone: "contact-connectivity",
    facebook: "contact-connectivity",
    website: "contact-connectivity",
    skills: "skills",
    positions: "positions-roles",
    goals: "narrative-ambition",
};

export function ProfileEditDrawer({ isOpen, onClose, profile, focusField, onFocusFieldHandled }: ProfileEditDrawerProps) {
    const { refreshProfile } = useAuth();
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<UserProfile>(profile);

    // Username availability state
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const usernameTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Determine which section to focus based on focusField
    const focusSectionId = useMemo(() => {
        if (!focusField) return null;
        return FIELD_TO_SECTION[focusField] || null;
    }, [focusField]);

    // Clear focusField after it has been handled (once drawer is open and animation plays)
    useEffect(() => {
        if (isOpen && focusField && onFocusFieldHandled) {
            const timer = setTimeout(() => {
                onFocusFieldHandled();
            }, 3000); // Clear after highlight animation finishes
            return () => clearTimeout(timer);
        }
    }, [isOpen, focusField, onFocusFieldHandled]);

    // Sync formData when profile changes (e.g., initial load)
    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    // Debounced username availability check
    const checkUsername = useCallback((username: string) => {
        if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
        
        const cleaned = username.trim().toLowerCase();
        
        if (!cleaned || cleaned.length < 3) {
            setUsernameStatus("idle");
            return;
        }
        
        // If it's the same as the current profile username, it's fine
        if (cleaned === profile.username?.trim()?.toLowerCase()) {
            setUsernameStatus("available");
            return;
        }
        
        setUsernameStatus("checking");
        usernameTimerRef.current = setTimeout(async () => {
            try {
                const result = await checkUsernameAvailability(cleaned, profile.uid);
                setUsernameStatus(result.available ? "available" : "taken");
            } catch (err) {
                console.error("Username check failed:", err);
                setUsernameStatus("idle");
            }
        }, 500);
    }, [profile.uid, profile.username]);

    const handleSave = async () => {
        if (usernameStatus === "taken") {
            showToast("That username is already taken. Please choose another.", "error");
            return;
        }
        setSaving(true);
        try {
            const db = getDb();
            const userRef = doc(db, "users", profile.uid);
            // Normalize username to lowercase
            const saveData = {
                ...formData,
                username: formData.username?.trim()?.toLowerCase() || "",
                updatedAt: serverTimestamp(),
            };
            await updateDoc(userRef, saveData);
            await refreshProfile();
            showToast("Profile updated successfully!", "success");
            onClose();

            // Propagate name/photo/role changes to all denormalized content (posts, stories, gifts, comments, etc.)
            // Runs in background so the UI doesn't block
            syncUserProfileUpdates(
                profile.uid,
                saveData.displayName || profile.displayName,
                formData.photoURL || profile.photoURL || "",
                formData.role || profile.role || "student"
            ).catch(err => console.error("[ProfileSync] Background sync failed:", err));
        } catch (err) {
            console.error("Failed to update profile:", err);
            showToast("Failed to save changes.", "error");
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key: keyof UserProfile, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (key === "username") {
            checkUsername(value);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#FAFAF8] dark:bg-[#0c0c10] shadow-2xl z-[70] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-[#FAFAF8]/80 dark:bg-[#0c0c10]/80 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-xl font-black text-navy-900 dark:text-gray-100 uppercase tracking-tight">Edit Your Narrative</h2>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">Refine how the community sees you</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            
                            {/* 1. Basic Identity */}
                            <CollapsibleSection title="Basic Identity" icon={User} defaultOpen sectionId="basic-identity" forceOpen={focusSectionId === "basic-identity"} highlighted={focusSectionId === "basic-identity"}>
                                <div className="space-y-4">
                                    <FormInput 
                                        label="Display Name" 
                                        value={formData.displayName} 
                                        onChange={(v: string) => updateField("displayName", v)} 
                                        placeholder="Your full name"
                                    />
                                    <FormInput 
                                        label="Headline" 
                                        value={formData.headline} 
                                        onChange={(v: string) => updateField("headline", v)} 
                                        placeholder="e.g. Passionate Science Teacher | B.Ed Honours"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Username with availability check */}
                                        <div className="mb-4 last:mb-0">
                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                                <AtSign size={14} className="inline mr-1 text-gray-400" />
                                                Username
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.username || ""}
                                                    onChange={(e) => updateField("username", e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())}
                                                    placeholder="unique_handle"
                                                    className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
                                                        usernameStatus === "taken" 
                                                            ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                                                            : usernameStatus === "available" 
                                                                ? "border-green-400 focus:ring-green-200 focus:border-green-500" 
                                                                : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                                                    }`}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {usernameStatus === "checking" && (
                                                        <Loader2 size={14} className="animate-spin text-gray-400" />
                                                    )}
                                                    {usernameStatus === "available" && (
                                                        <Check size={14} className="text-green-500" />
                                                    )}
                                                    {usernameStatus === "taken" && (
                                                        <X size={14} className="text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                            {usernameStatus === "taken" && (
                                                <p className="text-[10px] font-bold text-red-500 mt-1">This username is already taken</p>
                                            )}
                                            {usernameStatus === "available" && formData.username && formData.username.length >= 3 && (
                                                <p className="text-[10px] font-bold text-green-500 mt-1">Username available ✓</p>
                                            )}
                                        </div>
                                        <FormInput 
                                            label="Location" 
                                            value={formData.location} 
                                            onChange={(v: string) => updateField("location", v)} 
                                            placeholder="City, Bangladesh"
                                            icon={MapPin}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">Long Bio</label>
                                        <textarea 
                                            value={formData.bio || ""}
                                            onChange={(e) => updateField("bio", e.target.value)}
                                            rows={4}
                                            placeholder="Tell your story..."
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormSelect
                                            label="Bio Font Style"
                                            value={formData.bioStyle || "serif"}
                                            onChange={(v: string) => updateField("bioStyle", v)}
                                            options={[
                                                { label: "Classic Serif / শেরিফ", value: "serif" },
                                                { label: "Modern Sans / সান্স", value: "sans" },
                                                { label: "Handwritten Journal / হস্তাক্ষর", value: "writer" },
                                                { label: "Glassmorphism Cyber / নিয়ন গ্লো", value: "glow" },
                                                { label: "Minimalist Card / মিনিমাল কার্ড", value: "minimal" }
                                            ]}
                                        />
                                        <FormSelect
                                            label="Bio Font Size"
                                            value={formData.bioFontSize || "xl"}
                                            onChange={(v: string) => updateField("bioFontSize", v)}
                                            options={[
                                                { label: "Small / ছোট", value: "sm" },
                                                { label: "Regular / সাধারণ", value: "base" },
                                                { label: "Medium / মাঝারি", value: "lg" },
                                                { label: "Large / বড়", value: "xl" },
                                                { label: "Extra Large / বিশাল", value: "2xl" }
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Favorite Quote & Attribution</h4>
                                        <FormInput 
                                            label="Favorite Quote" 
                                            value={formData.favoriteQuote} 
                                            onChange={(v: string) => updateField("favoriteQuote", v)} 
                                            placeholder="e.g. Education is the most powerful weapon..."
                                        />
                                        <FormInput 
                                            label="Quote Author / Source" 
                                            value={formData.favoriteQuoteAuthor} 
                                            onChange={(v: string) => updateField("favoriteQuoteAuthor", v)} 
                                            placeholder="e.g. Nelson Mandela"
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* 2. Academic Context */}
                            <CollapsibleSection title="Academic Context" icon={GraduationCap} sectionId="academic-context" forceOpen={focusSectionId === "academic-context"} highlighted={focusSectionId === "academic-context"}>
                                <div className="space-y-4">
                                    <FormSelect 
                                        label="College" 
                                        value={formData.collegeId} 
                                        onChange={(v: string) => updateField("collegeId", v)}
                                        options={colleges.map(c => ({ label: c.name, value: c.id }))}
                                        icon={Building}
                                    />
                                    {formData.role === "student" && (
                                        <>
                                            <FormSelect 
                                                label="Programme" 
                                                value={formData.programme || "BEdHonours"} 
                                                onChange={(v: string) => {
                                                    updateField("programme", v);
                                                    // Reset year/semester when switching programmes
                                                    if (v === "MEd") {
                                                        if (!["1st Year", "2nd Year"].includes(formData.year || "")) {
                                                            updateField("year", "1st Year");
                                                        }
                                                        if (!["Semester 1", "Semester 2", "Semester 3", "Semester 4"].includes(formData.semester || "")) {
                                                            updateField("semester", "Semester 1");
                                                        }
                                                    }
                                                }}
                                                options={[
                                                    { label: "B.Ed Honours (4-year)", value: "BEdHonours" },
                                                    { label: "M.Ed (1-2 year)", value: "MEd" },
                                                ]}
                                                icon={GraduationCap}
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormSelect 
                                                    label="Academic Year" 
                                                    value={formData.year} 
                                                    onChange={(v: string) => updateField("year", v)}
                                                    options={
                                                        (formData.programme || "BEdHonours") === "MEd"
                                                            ? ["1st Year", "2nd Year", "Graduate"]
                                                            : ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"]
                                                    }
                                                />
                                                <FormSelect 
                                                    label="Semester" 
                                                    value={formData.semester} 
                                                    onChange={(v: string) => updateField("semester", v)}
                                                    options={
                                                        (formData.programme || "BEdHonours") === "MEd"
                                                            ? ["Semester 1", "Semester 2", "Semester 3", "Semester 4"]
                                                            : ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"]
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-4 flex items-center gap-1">
                                    <Info size={10} /> Role-Specific fields update automatically
                                </p>
                            </CollapsibleSection>

                            {/* 3. Professional Details */}
                            <CollapsibleSection title="Professional Details" icon={Briefcase} sectionId="professional-details" forceOpen={focusSectionId === "professional-details"} highlighted={focusSectionId === "professional-details"}>
                                <div className="space-y-4">
                                    <FormInput 
                                        label="Professional Status" 
                                        value={formData.professionalStatus} 
                                        onChange={(v: string) => updateField("professionalStatus", v)} 
                                        placeholder="e.g. Registered Teacher, Gov. Employee"
                                    />
                                    <FormInput 
                                        label="Specialization / Industry" 
                                        value={formData.industry} 
                                        onChange={(v: string) => updateField("industry", v)} 
                                        placeholder="e.g. Science, Mathematics, Primary Ed"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormSelect 
                                            label="Work Type" 
                                            value={formData.workType} 
                                            onChange={(v: string) => updateField("workType", v)} 
                                            options={["In-Person", "Remote", "Hybrid"]}
                                        />
                                        <FormSelect 
                                            label="Availability" 
                                            value={formData.availability} 
                                            onChange={(v: string) => updateField("availability", v)} 
                                            options={["Full-time", "Part-time", "Freelance", "Looking for Roles"]}
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* 3.5 Positions & Roles */}
                            <ArrayEditor<PositionEntry>
                                title="Positions & Roles"
                                icon={Shield}
                                items={formData.positions || []}
                                onChange={(items) => updateField("positions", items)}
                                itemTitleKey="title"
                                itemSubtitleKey="organization"
                                fields={[
                                    { key: "title", label: "Position Title", type: "text", placeholder: "e.g. Owner, Moderator", required: true },
                                    { key: "organization", label: "Organization / Company", type: "text", placeholder: "e.g. TTC NETWORK", required: true },
                                    { key: "link", label: "Link / Website", type: "url", placeholder: "https://..." },
                                    { key: "type", label: "Status", type: "select", options: [{label: "Current Role", value: "current"}, {label: "Past Role", value: "past"}], required: true },
                                    { key: "startDate", label: "Start Date", type: "text", placeholder: "e.g. Jan 2024" },
                                    { key: "endDate", label: "End Date", type: "text", placeholder: "e.g. Present, or Dec 2025" },
                                ]}
                            />

                            {/* 4. Narrative Sections */}
                            <CollapsibleSection title="Narrative & Ambition" icon={Target} sectionId="narrative-ambition" forceOpen={focusSectionId === "narrative-ambition"} highlighted={focusSectionId === "narrative-ambition"}>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">Future Ambitions</label>
                                        <textarea 
                                            value={formData.goals || ""}
                                            onChange={(e) => updateField("goals", e.target.value)}
                                            rows={3}
                                            placeholder="What are your big dreams in education?"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">Key Achievements</label>
                                        <textarea 
                                            value={formData.achievements || ""}
                                            onChange={(e) => updateField("achievements", e.target.value)}
                                            rows={3}
                                            placeholder="Share your proudest moments..."
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* 5. Career & Education History */}
                            <ArrayEditor<WorkExperienceEntry>
                                title="Experience History"
                                icon={Briefcase}
                                items={formData.workHistory || []}
                                onChange={(items) => updateField("workHistory", items)}
                                itemTitleKey="company"
                                itemSubtitleKey="role"
                                fields={[
                                    { key: "company", label: "College / Institution", type: "text", required: true },
                                    { key: "role", label: "Role / Designation", type: "text", required: true },
                                    { key: "startDate", label: "Start Date", type: "date", required: true },
                                    { key: "endDate", label: "End Date", type: "date" },
                                    { key: "description", label: "Description", type: "textarea" },
                                ]}
                            />

                            <ArrayEditor<EducationEntry>
                                title="Education Timeline"
                                icon={Award}
                                items={formData.educationHistory || []}
                                onChange={(items) => updateField("educationHistory", items)}
                                itemTitleKey="institution"
                                itemSubtitleKey="degree"
                                fields={[
                                    { key: "institution", label: "Institution Name", type: "text", required: true },
                                    { key: "degree", label: "Degree / Certificate", type: "text", required: true },
                                    { key: "startDate", label: "Start Year", type: "text" },
                                    { key: "endDate", label: "End Year", type: "text" },
                                ]}
                            />

                            {/* 6. Contact & Socials */}
                            <CollapsibleSection title="Contact & Connectivity" icon={Globe} sectionId="contact-connectivity" forceOpen={focusSectionId === "contact-connectivity"} highlighted={focusSectionId === "contact-connectivity"}>
                                <div className="space-y-4">
                                    <FormInput 
                                        label="Public Contact Email" 
                                        value={formData.publicEmail} 
                                        onChange={(v: string) => updateField("publicEmail", v)} 
                                        placeholder="email@example.com"
                                        icon={Mail}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput 
                                            label="Phone Number" 
                                            value={formData.phone} 
                                            onChange={(v: string) => updateField("phone", v)} 
                                            placeholder="+880 1XXXXXXXXX"
                                            icon={Phone}
                                        />
                                        <FormInput 
                                            label="WhatsApp Number" 
                                            value={formData.whatsapp} 
                                            onChange={(v: string) => updateField("whatsapp", v)} 
                                            placeholder="+880 1XXXXXXXXX"
                                            icon={MessageCircle}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormInput 
                                            label="Facebook Profile" 
                                            value={formData.facebook} 
                                            onChange={(v: string) => updateField("facebook", v)} 
                                            placeholder="https://facebook.com/..."
                                            icon={Facebook}
                                        />
                                        <FormInput 
                                            label="Portfolio / Website" 
                                            value={formData.website} 
                                            onChange={(v: string) => updateField("website", v)} 
                                            placeholder="https://..."
                                            icon={Globe}
                                        />
                                    </div>
                                </div>
                            </CollapsibleSection>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-gray-800 bg-[#FAFAF8]/95 dark:bg-[#0c0c10]/95 backdrop-blur-md sticky bottom-0 z-10">
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-4 bg-navy-900 dark:bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                {saving ? "Saving Changes..." : "Publish Updates"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
