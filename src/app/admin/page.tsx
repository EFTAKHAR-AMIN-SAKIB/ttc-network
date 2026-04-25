"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Save,
    Upload,
    ChevronDown,
    Settings,
    Building2,
    Users,
    GraduationCap,
    Shield,
    CheckCircle2,
    AlertTriangle,
    ImageIcon,
    Gift,
    Star,
    BookOpen,
    Bell,
    HelpCircle,
    Plus,
    Trash2,
    Database,
    X,
    Loader2,
    Pencil,
    BookText
} from "lucide-react";
import Image from "next/image";
import { getColleges, updateCollege, uploadFile, subscribeClubs, getAdminPendingCounts, type FirestoreCollege, type FirestoreClub, type FacultyEntry, type AdminPendingCounts } from "@/lib/firestore";
import { seedDatabaseAction, createClubAction, deleteClubAction, updateClubAction } from "@/lib/actions";
import PostsTab from "./components/PostsTab";
import StoriesTab from "./components/StoriesTab";
import StudyTab from "./components/StudyTab";
import NoticesTab from "./components/NoticesTab";
import QAManagerTab from "./components/QAManagerTab";
import GiftsTab from "./components/GiftsTab";
import UsersTab from "./components/UsersTab";
import ManagementTab from "./components/ManagementTab";
import SiteSettingsTab from "./components/SiteSettingsTab";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { deleteFromCloudinary } from "@/lib/storage";

/* ─── Form Input Component ─── */
function FormInput({ label, value, onChange, type = "text", placeholder = "" }: {
    label: string; value: string | number; onChange: (val: string) => void; type?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </div>
    );
}

/* ─── Club Categories for Admin ─── */
const CLUB_CATEGORIES = ["Sports", "Academic", "Cultural", "Social", "Other"] as const;

/* ─── College Editor Card ─── */
function CollegeEditor({ college, onSave, onMessage, userProfile }: {
    college: FirestoreCollege & { id: string };
    onSave: () => void;
    onMessage: (msg: string, type?: "success" | "error") => void;
    userProfile: any;
}) {
    const [expanded, setExpanded] = useState(false);
    const [data, setData] = useState(college);
    const [saving, setSaving] = useState(false);
    const [facultyInput, setFacultyInput] = useState<FacultyEntry>({ name: "", designation: "", department: "", email: "", phone: "", photo: "", bio: "", yearsOfService: "" });
    const [achievementInput, setAchievementInput] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Club management state
    const [clubs, setClubs] = useState<(FirestoreClub & { id: string })[]>([]);
    const [showClubSection, setShowClubSection] = useState(false);
    const [showCreateClub, setShowCreateClub] = useState(false);
    const [newClubName, setNewClubName] = useState("");
    const [newClubCategory, setNewClubCategory] = useState<string>("Other");
    const [newClubTagline, setNewClubTagline] = useState("");
    const [newClubDescription, setNewClubDescription] = useState("");
    const [newClubIcon, setNewClubIcon] = useState("🎯");
    const [newClubAdvisor, setNewClubAdvisor] = useState("");
    const [newClubSchedule, setNewClubSchedule] = useState("");
    const [newClubLocation, setNewClubLocation] = useState("");
    const [creatingClub, setCreatingClub] = useState(false);
    const [editingClubId, setEditingClubId] = useState<string | null>(null);
    const [editClubData, setEditClubData] = useState<any>({});
    const [savingClubEdit, setSavingClubEdit] = useState(false);
    const [deletingClubId, setDeletingClubId] = useState<string | null>(null);
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    // Subscribe to clubs for this college
    useEffect(() => {
        if (!expanded) return;
        const unsub = subscribeClubs(college.id, (data) => setClubs(data));
        return () => unsub();
    }, [college.id, expanded]);

    const update = (partial: Partial<FirestoreCollege>) => setData((d) => ({ ...d, ...partial }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCollege(college.id, data);
            onMessage(`✅ ${data.shortName || data.city} saved!`, "success");
            onSave();
        } catch (err) {
            onMessage(`❌ ${err instanceof Error ? err.message : "Save failed"}`, "error");
        }
        setSaving(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            // Delete old logo if it exists to keep storage clean
            if (data.logo) {
                await deleteFromCloudinary(data.logo);
            }
            const url = await uploadFile(`logos/${college.id}.png`, file);
            update({ logo: url, hasLogo: true });
            onMessage("✅ Logo uploaded!", "success");
        } catch (err) {
            onMessage(`❌ Upload failed: ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const addFaculty = () => {
        if (!facultyInput.name) return;
        update({ faculty: [...(data.faculty || []), facultyInput] });
        setFacultyInput({ name: "", designation: "", department: "", email: "", phone: "", photo: "", bio: "", yearsOfService: "" });
    };

    const removeFaculty = (i: number) => {
        update({ faculty: (data.faculty || []).filter((_, idx: number) => idx !== i) });
    };

    const addAchievement = () => {
        if (!achievementInput.trim()) return;
        update({ achievements: [...(data.achievements || []), achievementInput] });
        setAchievementInput("");
    };

    const removeAchievement = (i: number) => {
        update({ achievements: (data.achievements || []).filter((_, idx) => idx !== i) });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-black/20 overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-0.5">
                    {data.hasLogo && data.logo ? (
                        <Image src={data.logo} alt={data.name} width={32} height={32} className="object-contain rounded-lg" />
                    ) : (
                        <div className="w-full h-full rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: data.color }}>{data.city?.slice(0, 2).toUpperCase()}</div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{data.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-700 dark:text-gray-400">
                        <span>Est. {data.established}</span><span>·</span><span>{data.city}</span>
                        {!data.hasLogo && (<><span>·</span><span className="text-amber-600 dark:text-amber-500 font-bold flex items-center gap-0.5"><ImageIcon size={8} /> No logo</span></>)}
                    </div>
                </div>
                <ChevronDown size={16} className={`text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-4 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormInput label="College Name (English)" value={data.name} onChange={(v) => update({ name: v })} />
                                <FormInput label="College Name (Bangla)" value={data.nameBn} onChange={(v) => update({ nameBn: v })} />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <FormInput label="City" value={data.city} onChange={(v) => update({ city: v })} />
                                <FormInput label="Established" value={data.established} onChange={(v) => update({ established: parseInt(v) || 0 })} type="number" />
                                <FormInput label="Theme Color" value={data.color} onChange={(v) => update({ color: v })} />
                                <div>
                                    <label className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide block mb-1">Hostel</label>
                                    <select value={data.hostel ? "yes" : "no"} onChange={(e) => update({ hostel: e.target.value === "yes" })}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="yes">Available</option><option value="no">N/A</option>
                                    </select>
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide block mb-1">College Logo</label>
                                <div className="flex items-center gap-3">
                                    {data.hasLogo && data.logo ? (
                                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 p-1">
                                            <Image src={data.logo} alt="" width={48} height={48} className="object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                            <ImageIcon size={20} className="text-gray-300" />
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors">
                                        <Upload size={13} /> Upload
                                    </button>
                                </div>
                            </div>

                            {/* Principal & Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormInput label="Principal Name" value={data.principal?.name || ""} onChange={(v) => update({ principal: { ...data.principal, name: v } })} />
                                <FormInput label="Contact Number" value={data.principal?.contact || ""} onChange={(v) => update({ principal: { ...data.principal, contact: v } })} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <FormInput label="Students" value={data.students} onChange={(v) => update({ students: parseInt(v) || 0 })} type="number" />
                                <FormInput label="Teachers" value={data.teachers} onChange={(v) => update({ teachers: parseInt(v) || 0 })} type="number" />
                                <FormInput label="Classrooms" value={data.classrooms} onChange={(v) => update({ classrooms: parseInt(v) || 0 })} type="number" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-1">Description</label>
                                <textarea value={data.description} onChange={(e) => update({ description: e.target.value })} rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormInput label="Facebook URL" value={data.social?.facebook || ""} onChange={(v) => update({ social: { ...data.social, facebook: v, website: data.social?.website || "" } })} />
                                <FormInput label="Website URL" value={data.social?.website || ""} onChange={(v) => update({ social: { ...data.social, website: v, facebook: data.social?.facebook || "" } })} />
                            </div>

                            {/* Achievements */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">Achievements ({(data.achievements || []).length})</label>
                                <div className="space-y-1.5 mb-2">
                                    {(data.achievements || []).map((a, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <Star size={10} className="text-amber-400 flex-shrink-0" />
                                            <span className="flex-1 text-gray-700 dark:text-gray-300">{a}</span>
                                            <button onClick={() => removeAchievement(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input value={achievementInput} onChange={(e) => setAchievementInput(e.target.value)} placeholder="New achievement..."
                                        className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                    <button onClick={addAchievement} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100"><Plus size={12} /></button>
                                </div>
                            </div>

                            {/* Faculty List */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">Faculty ({(data.faculty || []).length})</label>
                                <div className="space-y-2 mb-3">
                                    {(data.faculty || []).map((t, i: number) => (
                                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-xs">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-gray-900 dark:text-white">{t.name}</span>
                                                <span className="text-gray-600 dark:text-gray-400 ml-2">{t.designation} · {t.department}</span>
                                            </div>
                                            <button onClick={() => removeFaculty(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <input value={facultyInput.name} onChange={(e) => setFacultyInput({ ...facultyInput, name: e.target.value })} placeholder="Name"
                                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                    <input value={facultyInput.designation} onChange={(e) => setFacultyInput({ ...facultyInput, designation: e.target.value })} placeholder="Designation"
                                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                    <input value={facultyInput.department} onChange={(e) => setFacultyInput({ ...facultyInput, department: e.target.value })} placeholder="Department"
                                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                    <input value={facultyInput.email} onChange={(e) => setFacultyInput({ ...facultyInput, email: e.target.value })} placeholder="Email"
                                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                    <button onClick={addFaculty} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1"><Plus size={12} /> Add</button>
                                </div>
                            </div>


                            {/* ═══ CLUB MANAGEMENT SECTION ═══ */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
                                <button
                                    onClick={() => setShowClubSection(!showClubSection)}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 cursor-pointer">
                                        <Users size={12} className="text-primary" /> Active Clubs ({clubs.length})
                                    </label>
                                    <ChevronDown size={14} className={`text-gray-300 transition-transform ${showClubSection ? 'rotate-180' : ''}`} />
                                </button>

                                {showClubSection && (
                                    <div className="mt-4 space-y-3">
                                        {/* Existing Clubs List */}
                                        {clubs.length > 0 ? (
                                            <div className="space-y-2">
                                                {clubs.map(club => (
                                                    <div key={club.id} className="bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 group hover:border-primary/30 transition-all overflow-hidden">
                                                        {/* Club Header Row */}
                                                        <div className="flex items-center gap-3 p-3">
                                                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                                                {club.icon || "🎯"}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{club.name}</p>
                                                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                        club.category === 'Sports' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                        club.category === 'Academic' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                        club.category === 'Cultural' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                        'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                                    }`}>{club.category || 'Other'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    <span>{club.membersCount} members</span>
                                                                    {club.advisorName && <><span>·</span><span>{club.advisorName}</span></>}
                                                                    {club.tagline && <><span>·</span><span className="truncate italic">"{club.tagline}"</span></>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button
                                                                    onClick={() => {
                                                                        if (editingClubId === club.id) {
                                                                            setEditingClubId(null);
                                                                        } else {
                                                                            setEditingClubId(club.id);
                                                                            setEditClubData({
                                                                                name: club.name || "",
                                                                                category: club.category || "Other",
                                                                                icon: club.icon || "🎯",
                                                                                tagline: club.tagline || "",
                                                                                description: club.description || "",
                                                                                advisorName: club.advisorName || "",
                                                                                schedule: club.schedule || "",
                                                                                location: club.location || "",
                                                                                isActive: club.isActive !== false,
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-300 hover:text-primary rounded-lg hover:bg-primary/5 transition-all"
                                                                    title="Edit club"
                                                                >
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button
                                                                    disabled={deletingClubId === club.id}
                                                                    onClick={async () => {
                                                                        const confirmed = await confirm({
                                                                            title: "Delete Club",
                                                                            message: `Delete "${club.name}"? This will permanently delete the club and its connected data. This action cannot be undone.`,
                                                                            variant: "danger"
                                                                        });
                                                                        
                                                                        if (confirmed) {
                                                                            if (!userProfile?.uid) return onMessage("❌ Sign in required", "error");
                                                                            setConfirmLoading(true);
                                                                            setDeletingClubId(club.id);
                                                                            try {
                                                                                const res = await deleteClubAction(userProfile.uid, club.id);
                                                                                if (res?.error) throw new Error(res.error);
                                                                                onMessage(`✅ "${club.name}" deleted`, "success");
                                                                            } catch (err: any) {
                                                                                onMessage(`❌ ${err.message}`, "error");
                                                                            } finally {
                                                                                setConfirmLoading(false);
                                                                                setDeletingClubId(null);
                                                                                closeConfirm();
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                                    title="Delete club"
                                                                >
                                                                    {deletingClubId === club.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Inline Edit Panel */}
                                                        {editingClubId === club.id && (
                                                            <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    <div className="col-span-2">
                                                                        <input value={editClubData.name} onChange={e => setEditClubData({...editClubData, name: e.target.value})} placeholder="Club Name *"
                                                                            className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                                                    </div>
                                                                    <select value={editClubData.category} onChange={e => setEditClubData({...editClubData, category: e.target.value})}
                                                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white">
                                                                        {CLUB_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                                    </select>
                                                                    <input value={editClubData.icon} onChange={e => setEditClubData({...editClubData, icon: e.target.value})} placeholder="Emoji"
                                                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white text-center" />
                                                                </div>
                                                                <input value={editClubData.tagline} onChange={e => setEditClubData({...editClubData, tagline: e.target.value})} placeholder="Tagline"
                                                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                                                <textarea value={editClubData.description} onChange={e => setEditClubData({...editClubData, description: e.target.value})} placeholder="Description" rows={2}
                                                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white resize-none" />
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                    <input value={editClubData.advisorName} onChange={e => setEditClubData({...editClubData, advisorName: e.target.value})} placeholder="Advisor Name"
                                                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                                                    <input value={editClubData.schedule} onChange={e => setEditClubData({...editClubData, schedule: e.target.value})} placeholder="Schedule"
                                                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                                                    <input value={editClubData.location} onChange={e => setEditClubData({...editClubData, location: e.target.value})} placeholder="Location"
                                                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 dark:text-white" />
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                                        <input type="checkbox" checked={editClubData.isActive !== false} onChange={e => setEditClubData({...editClubData, isActive: e.target.checked})}
                                                                            className="rounded border-gray-300" />
                                                                        Active
                                                                    </label>
                                                                    <div className="flex-1" />
                                                                    <button onClick={() => setEditingClubId(null)}
                                                                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        disabled={savingClubEdit || !editClubData.name?.trim()}
                                                                        onClick={async () => {
                                                                            if (!userProfile?.uid) return onMessage("❌ Sign in required", "error");
                                                                            setSavingClubEdit(true);
                                                                            try {
                                                                                await updateClubAction(userProfile.uid, club.id, editClubData);
                                                                                onMessage(`✅ "${editClubData.name}" updated!`, "success");
                                                                                setEditingClubId(null);
                                                                            } catch (err: any) {
                                                                                onMessage(`❌ ${err.message}`, "error");
                                                                            }
                                                                            setSavingClubEdit(false);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-4 py-1.5 text-white text-xs font-bold rounded-lg active:scale-[0.98] transition-all disabled:opacity-50"
                                                                        style={{ background: "linear-gradient(135deg, #1a5276, #0e6655)" }}
                                                                    >
                                                                        {savingClubEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                        {savingClubEdit ? "Saving..." : "Save"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-6 text-center bg-gray-50 dark:bg-gray-750 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <Users size={24} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-xs text-gray-500">No clubs registered for this college yet.</p>
                                            </div>
                                        )}

                                        {/* Create New Club Form */}
                                        {showCreateClub ? (
                                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide">New Club</h4>
                                                    <button onClick={() => setShowCreateClub(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <div className="col-span-2">
                                                        <input value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Club Name *"
                                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" />
                                                    </div>
                                                    <select value={newClubCategory} onChange={e => setNewClubCategory(e.target.value)}
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white">
                                                        {CLUB_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                    <input value={newClubIcon} onChange={e => setNewClubIcon(e.target.value)} placeholder="Icon emoji"
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white text-center" />
                                                </div>
                                                <input value={newClubTagline} onChange={e => setNewClubTagline(e.target.value)} placeholder='Tagline (e.g. "Sharpen your voice & logic")'
                                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" />
                                                <textarea value={newClubDescription} onChange={e => setNewClubDescription(e.target.value)} placeholder="Description (what the club does)" rows={2}
                                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white resize-none" />
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <input value={newClubAdvisor} onChange={e => setNewClubAdvisor(e.target.value)} placeholder="Advisor Name"
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" />
                                                    <input value={newClubSchedule} onChange={e => setNewClubSchedule(e.target.value)} placeholder="Schedule (e.g. Fri 3PM)"
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" />
                                                    <input value={newClubLocation} onChange={e => setNewClubLocation(e.target.value)} placeholder="Location / Room"
                                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" />
                                                </div>
                                                <button
                                                    disabled={creatingClub || !newClubName.trim()}
                                                    onClick={async () => {
                                                        if (!userProfile?.uid) return onMessage("❌ Sign in required", "error");
                                                        if (!newClubName.trim()) return onMessage("❌ Club name is required", "error");
                                                        setCreatingClub(true);
                                                        try {
                                                            await createClubAction(userProfile.uid, {
                                                                collegeId: college.id,
                                                                name: newClubName.trim(),
                                                                category: newClubCategory,
                                                                description: newClubDescription.trim(),
                                                                tagline: newClubTagline.trim(),
                                                                icon: newClubIcon || "🎯",
                                                                advisorName: newClubAdvisor.trim(),
                                                                schedule: newClubSchedule.trim(),
                                                                location: newClubLocation.trim(),
                                                                socialLinks: {},
                                                            });
                                                            onMessage(`✅ "${newClubName}" created!`, "success");
                                                            setNewClubName(""); setNewClubCategory("Other"); setNewClubTagline("");
                                                            setNewClubDescription(""); setNewClubIcon("🎯"); setNewClubAdvisor("");
                                                            setNewClubSchedule(""); setNewClubLocation("");
                                                            setShowCreateClub(false);
                                                        } catch (err: any) {
                                                            onMessage(`❌ ${err.message || "Failed to create club"}`, "error");
                                                        }
                                                        setCreatingClub(false);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                                                    style={{ background: "linear-gradient(135deg, #1a5276, #0e6655)" }}
                                                >
                                                    {creatingClub ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                    {creatingClub ? "Creating..." : "Create Club"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowCreateClub(true)}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-colors"
                                            >
                                                <Plus size={14} /> Add Club
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <button onClick={handleSave} disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg, #1a5276, #0e6655)" }}>
                                    <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Tab Config ─── */
type TabId = "management" | "colleges" | "posts" | "stories" | "study" | "notices" | "qa" | "gifts" | "users" | "settings";
const tabs: { id: TabId; label: string; icon: typeof Building2 }[] = [
    { id: "management", label: "Management", icon: Shield },
    { id: "colleges", label: "Colleges", icon: Building2 },
    { id: "posts", label: "Posts", icon: GraduationCap },
    { id: "stories", label: "Stories", icon: BookOpen },
    { id: "study", label: "Study", icon: BookText },
    { id: "notices", label: "Notices", icon: Bell },
    { id: "qa", label: "Homepage", icon: HelpCircle },
    { id: "gifts", label: "Supporters", icon: Gift },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
];

/* ─── MAIN ADMIN PAGE ─── */
export default function AdminPage() {
    const { profile } = useAuth();
    const [colleges, setColleges] = useState<(FirestoreCollege & { id: string })[]>([]);
    const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);
    const [activeSection, setActiveSection] = useState<TabId>("management");
    const [loadingColleges, setLoadingColleges] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [showSeedModal, setShowSeedModal] = useState(false);
    const [pendingCounts, setPendingCounts] = useState<AdminPendingCounts>({ posts: 0, stories: 0, notices: 0, studyPosts: 0, gifts: 0 });

    const loadColleges = async () => {
        setLoadingColleges(true);
        try { setColleges(await getColleges()); } catch (err) { console.error(err); }
        setLoadingColleges(false);
    };

    const loadPendingCounts = async () => {
        try {
            const counts = await getAdminPendingCounts();
            setPendingCounts(counts);
        } catch (err) {
            console.error("Failed to load pending counts:", err);
        }
    };

    useEffect(() => { 
        loadColleges(); 
        loadPendingCounts();
        
        // Refresh counts every 30 seconds
        const interval = setInterval(loadPendingCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    // Refresh counts when switching tabs
    useEffect(() => {
        loadPendingCounts();
    }, [activeSection]);

    const showMessage = (msg: string, type: "success" | "error" = "success") => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleConfirmSeed = async () => {
        if (!profile?.uid) return showMessage("❌ Sign in required", "error");
        setSeeding(true);
        try {
            const result = await seedDatabaseAction(profile.uid);
            showMessage("✅ Database seeding started via secure link!", "success");
            loadColleges();
            setShowSeedModal(false);
        } catch (err: any) {
            showMessage(`❌ ${err.message || "Seed failed"}`, "error");
        }
        setSeeding(false);
    };

    const handleSeedData = () => {
        setShowSeedModal(true);
    };

    if (!profile) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0C0C10] flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 rounded-[2rem] bg-primary/10 animate-ping" />
                        <div className="relative bg-white dark:bg-[#16161D] rounded-[2rem] w-full h-full border border-gray-100 dark:border-white/5 shadow-2xl flex items-center justify-center">
                            <Shield className="text-primary animate-pulse" size={40} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Authenticating...</h2>
                        <p className="text-sm text-gray-500 font-medium mt-2">Checking administrative credentials</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    const collegesWithLogo = colleges.filter((c) => c.hasLogo);
    const collegesWithoutLogo = colleges.filter((c) => !c.hasLogo);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a5276, #0e6655)" }}>
                                <Settings size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-english">Admin Panel</h1>
                                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5">Manage all TTC Network data</p>
                            </div>
                        </div>
                        <button onClick={handleSeedData} disabled={seeding}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-800 disabled:opacity-50">
                            <Database size={14} /> {seeding ? "Seeding..." : "Seed Data"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-5xl mx-auto px-4 mt-6">
                <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-black/20 overflow-x-auto">
                    {tabs
                        .filter((tab) => {
                            // Strictly restrict Supporters tab to admin ONLY
                            if (tab.id === "gifts" && profile?.role !== "admin") return false;
                            // Strictly restrict Settings tab to admin ONLY
                            if (tab.id === "settings" && profile?.role !== "admin") return false;

                            if (profile?.role === "manager") {
                                return ["management", "colleges", "posts", "stories", "notices", "users"].includes(tab.id);
                            }
                            return true; // Admin sees all valid remaining tabs
                        })
                        .map((tab) => {
                            const countMap: Record<string, number> = {
                                posts: pendingCounts.posts,
                                stories: pendingCounts.stories,
                                study: pendingCounts.studyPosts, // study tab badge for studyPosts
                                notices: pendingCounts.notices,
                                gifts: pendingCounts.gifts
                            };
                            const count = countMap[tab.id] || 0;

                            return (
                                <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap px-2 ${activeSection === tab.id ? "bg-primary text-white shadow-sm dark:shadow-black/20" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"}`}>
                                    <tab.icon size={14} />
                                    {tab.label}
                                    {count > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 animate-in fade-in zoom-in duration-300">
                                            {count > 99 ? "99+" : count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 mt-6 pb-20">
                <AnimatePresence>
                    {message && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className={`mb-6 p-4 border rounded-2xl text-sm font-semibold flex items-center gap-3 shadow-lg ${
                                message.type === "success" 
                                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                            }`}
                        >
                            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeSection === "colleges" && (
                    <div className="space-y-6">
                        {loadingColleges ? (
                            <div className="space-y-3">{[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" /><div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /></div></div>
                                </div>
                            ))}</div>
                        ) : colleges.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                                <Building2 size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No College Data</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click &quot;Seed Data&quot; to populate colleges from the template.</p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Shield size={12} className="text-emerald-500" /> With Logo ({collegesWithLogo.length})
                                    </h2>
                                    <div className="space-y-3">{collegesWithLogo.filter(c => profile?.role !== 'manager' || profile?.collegeId === c.id).map((c) => (
                                        <CollegeEditor key={c.id} college={c} onSave={loadColleges} onMessage={showMessage} userProfile={profile} />
                                    ))}</div>
                                </div>
                                {collegesWithoutLogo.length > 0 && (
                                    <div>
                                        <h2 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <AlertTriangle size={12} className="text-amber-500" /> Needs Logo ({collegesWithoutLogo.length})
                                        </h2>
                                        <div className="space-y-3">{collegesWithoutLogo.filter(c => profile?.role !== 'manager' || profile?.collegeId === c.id).map((c) => (
                                            <CollegeEditor key={c.id} college={c} onSave={loadColleges} onMessage={showMessage} userProfile={profile} />
                                        ))}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeSection === "management" && <ManagementTab profile={profile as any} />}
                {activeSection === "posts" && <PostsTab profile={profile as any} />}
                {activeSection === "stories" && <StoriesTab profile={profile as any} onCountRefresh={loadPendingCounts} />}
                {activeSection === "study" && <StudyTab profile={profile as any} onCountRefresh={loadPendingCounts} />}
                {activeSection === "notices" && <NoticesTab profile={profile as any} />}
                {activeSection === "qa" && <QAManagerTab profile={profile as any} />}
                {activeSection === "gifts" && <GiftsTab profile={profile as any} />}
                {activeSection === "users" && <UsersTab profile={profile as any} />}
                {activeSection === "settings" && <SiteSettingsTab profile={profile as any} />}
            </div>

            {/* Seed Data Modal */}
            <AnimatePresence>
                {showSeedModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Initialize Database</h3>
                                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest">Seed Master Data</p>
                                    </div>
                                </div>
                                <button onClick={() => !seeding && setShowSeedModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl">
                                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                                        This action will populate your database with the core platform template. Matching institutional records will be updated to ensure consistency.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Components to be seeded</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { icon: Building2, label: "14 Colleges Profiles", desc: "Names, Principals, & Campus Stats" },
                                            { icon: HelpCircle, label: "Homepage Sections", desc: "Manage Q&A, Admission Guide, Builder" },
                                            { icon: GraduationCap, label: "Vision Roadmap", desc: "Public Milestone Phases" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-primary shadow-sm mt-0.5">
                                                    <item.icon size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{item.label}</p>
                                                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        disabled={seeding}
                                        onClick={() => setShowSeedModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={seeding}
                                        onClick={handleConfirmSeed}
                                        style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
                                        className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-3 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {seeding ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Initialising...
                                            </>
                                        ) : (
                                            <>
                                                <Database size={14} />
                                                Initialize Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
