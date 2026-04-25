"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    Plus, Pencil, Trash2, X, Save, Loader2, Search, User, 
    LayoutGrid, Type, AlignLeft, Calendar, MapPin, Globe, MessageCircle,
    Users, Inbox, Settings, Activity, ShieldCheck, Check, Info, AlertCircle,
    ChevronRight, Camera, MoreHorizontal, UserMinus, ImageIcon, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FirestoreClub, createClub, updateClub, deleteClub, uploadFile,
    subscribeClubs, getUsersByCollege, searchUsersForClub, FirestoreUser,
    subscribeClubMembers, subscribeClubRequests, subscribeClubActivities,
    approveClubMember, rejectClubMember, removeClubMember, updateClubMemberRole,
    addDirectMember,
    ClubMember, ClubRequest, ClubActivity
} from "@/lib/firestore";
import { deleteFromCloudinary } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { createClubAction, getClubsAction, deleteClubAction } from "@/lib/actions";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";

interface ClubManagerProps {
    collegeId: string;
    onClose: () => void;
}

type Tab = "dashboard" | "inbound" | "roster" | "settings" | "feed";

const CATEGORIES = ["Sports", "Academic", "Cultural", "Social", "Other"] as const;

const EMOJI_OPTIONS = ["🎯", "🎙️", "⚽", "🎭", "🔬", "📚", "🎵", "🏆", "💻", "🎨", "🧪", "📰", "🤝", "🌍", "♟️", "📷"];

interface NewClubForm {
    name: string;
    category: string;
    description: string;
    tagline: string;
    icon: string;
    advisorName: string;
    schedule: string;
    location: string;
    foundedDate: string;
    facebookLink: string;
    whatsappLink: string;
}

const emptyForm: NewClubForm = {
    name: "",
    category: "Other",
    description: "",
    tagline: "",
    icon: "🎯",
    advisorName: "",
    schedule: "",
    location: "",
    foundedDate: new Date().getFullYear().toString(),
    facebookLink: "",
    whatsappLink: "",
};

export default function ClubManager({ collegeId, onClose }: ClubManagerProps) {
    const { profile } = useAuth();
    const [clubs, setClubs] = useState<(FirestoreClub & { id: string })[]>([]);
    const [selectedClub, setSelectedClub] = useState<(FirestoreClub & { id: string }) | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [loading, setLoading] = useState(false);
    
    // Sub-collection data
    const [members, setMembers] = useState<(ClubMember & { id: string })[]>([]);
    const [requests, setRequests] = useState<(ClubRequest & { id: string })[]>([]);
    const [activities, setActivities] = useState<(ClubActivity & { id: string })[]>([]);
    
    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [loadingClub, setLoadingClub] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [addMemberSearch, setAddMemberSearch] = useState("");
    const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // New Club Form State (React controlled — no DOM hacks)
    const [newClub, setNewClub] = useState<NewClubForm>(emptyForm);
    const [newClubLogoFile, setNewClubLogoFile] = useState<File | null>(null);
    const [newClubBannerFile, setNewClubBannerFile] = useState<File | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();
    const { showToast } = useToast();

    const fileInputRefLogo = useRef<HTMLInputElement>(null);
    const fileInputRefBanner = useRef<HTMLInputElement>(null);

    // Permission check
    const isSuperAdmin = profile?.role === "admin" || profile?.role === "super_manager";
    const isCollegeManager = profile?.role === "manager" && profile?.collegeId === collegeId;
    const isClubPresident = profile?.clubPosition === "President"; 

    useEffect(() => {
        let isMounted = true;
        
        const handlePermissionError = async (err: any) => {
            if (err.code === "permission-denied" || err.message?.includes("permissions")) {
                console.warn("[ClubManager] Falling back to Server Action for clubs fetch due to permission error.");
                try {
                    const data = await getClubsAction(collegeId);
                    if (isMounted) setClubs(data as any);
                } catch (fetchErr) {
                    console.error("[ClubManager] Server Action fallback failed:", fetchErr);
                }
            }
        };

        const unsub = subscribeClubs(collegeId, (data) => {
            if (!isMounted) return;
            setClubs(data);
            
            if (profile?.clubPosition === "President") {
                const myClub = data.find(c => c.advisorUserId === profile.uid || c.createdBy === profile.uid || c.advisorUserId === (profile as any)?.id);
                if (myClub) {
                    setSelectedClub(prev => prev ? prev : myClub);
                }
            }
        }, handlePermissionError);

        getUsersByCollege(collegeId).then(data => {
            if (isMounted) setUsers(data);
        }).catch(() => {});

        return () => {
            isMounted = false;
            unsub();
        };
    }, [collegeId, profile?.uid, profile?.clubPosition]);

    // Listen to sub-collections when a club is selected
    useEffect(() => {
        if (!selectedClub?.id) {
            setMembers([]);
            setRequests([]);
            setActivities([]);
            return;
        }

        setLoadingClub(true);
        const unsubMembers = subscribeClubMembers(selectedClub.id, (data) => {
            setMembers(data);
            setLoadingClub(false);
        });
        const unsubRequests = subscribeClubRequests(selectedClub.id, setRequests);
        const unsubActivities = subscribeClubActivities(selectedClub.id, setActivities);

        return () => {
            unsubMembers();
            unsubRequests();
            unsubActivities();
        };
    }, [selectedClub?.id]);

    const handleSaveSettings = async () => {
        if (!selectedClub || !selectedClub.name) { showToast("Club name is required!", "error"); return; }
        setLoading(true);
        try {
            await updateClub(selectedClub.id, selectedClub);
            showToast("Club settings updated!", "success");
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!newClub.name.trim()) errors.name = "Club name is required";
        if (newClub.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateClub = async () => {
        if (!profile?.uid) { showToast("You must be logged in.", "error"); return; }
        if (!validateForm()) return;

        setLoading(true);
        try {
            const body = {
                collegeId,
                name: newClub.name.trim(),
                category: newClub.category,
                description: newClub.description.trim(),
                tagline: newClub.tagline.trim(),
                icon: newClub.icon,
                advisorName: newClub.advisorName.trim(),
                schedule: newClub.schedule.trim(),
                location: newClub.location.trim(),
                foundedDate: newClub.foundedDate,
                socialLinks: {
                    facebook: newClub.facebookLink.trim(),
                    whatsapp: newClub.whatsappLink.trim(),
                },
            };

            const result = await createClubAction(profile.uid, body);
            if (result?.error) throw new Error(result.error);
            const newClubId = result?.id;

            // Upload files if present
            if (newClubId && (newClubLogoFile || newClubBannerFile)) {
                const updates: any = {};
                if (newClubLogoFile) {
                    updates.logo = await uploadFile(`clubs/${newClubId}/logo`, newClubLogoFile);
                }
                if (newClubBannerFile) {
                    updates.bannerUrl = await uploadFile(`clubs/${newClubId}/bannerUrl`, newClubBannerFile);
                }
                await updateClub(newClubId, updates);
            }

            showToast("Club created successfully!", "success");
            setIsCreating(false);
            setNewClub(emptyForm);
            setNewClubLogoFile(null);
            setNewClubBannerFile(null);
            setFormErrors({});
        } catch (err: any) {
            showToast(err.message || "Failed to create club.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Disband Club",
            message: "Are you sure? This will delete all club data, members, and history permanently. This action cannot be undone.",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            if (!profile?.uid) throw new Error("You must be logged in.");
            const res = await deleteClubAction(profile.uid, id);
            if (res?.error) throw new Error(res.error);
            if (selectedClub?.id === id) setSelectedClub(null);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleToggleActive = async (id: string, currentActiveStatus: boolean) => {
        const newStatus = !currentActiveStatus;
        const confirmed = await confirm({
            title: newStatus ? "Activate Club" : "Pause Club",
            message: newStatus ? "Are you sure you want to activate this club? It will be visible to everyone." : "Are you sure you want to pause this club? It will be hidden from the public directories.",
            variant: newStatus ? "warning" : "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await updateClub(id, { isActive: newStatus });
            if (selectedClub?.id === id) {
                setSelectedClub({ ...selectedClub, isActive: newStatus });
            }
        } catch (err: any) {
            showToast(err.message || "Failed to update club status", "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "bannerUrl") => {
        const file = e.target.files?.[0];
        if (!file || !selectedClub) return;
        
        setLoading(true);
        try {
            // Delete old image from Cloudinary before uploading new one
            const oldUrl = selectedClub[field];
            if (oldUrl) {
                await deleteFromCloudinary(oldUrl);
            }
            
            const url = await uploadFile(`clubs/${selectedClub.id}/${field}`, file);
            await updateClub(selectedClub.id, { [field]: url });
            setSelectedClub({ ...selectedClub, [field]: url });
            showToast("Image uploaded successfully!", "success");
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    const handleAddDirectMember = async (userId: string) => {
        if (!selectedClub) return;
        setAddingMemberId(userId);
        try {
            await addDirectMember(selectedClub.id, userId);
            setAddMemberSearch("");
            setShowAddMember(false);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setAddingMemberId(null);
        }
    };

    const handleOpenAddMember = async () => {
        setShowAddMember(true);
        // Load users if not already loaded
        if (users.length === 0 && selectedClub) {
            setLoadingUsers(true);
            try {
                const data = await searchUsersForClub(selectedClub.id, collegeId);
                setUsers(data);
            } catch (err) {
                console.warn("[ClubManager] Could not load users for member search:", err);
            } finally {
                setLoadingUsers(false);
            }
        }
    };

    const handleApprove = async (userId: string) => {
        if (!selectedClub) return;
        try {
            await approveClubMember(selectedClub.id, userId);
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleReject = async (userId: string) => {
        if (!selectedClub) return;
        try {
            await rejectClubMember(selectedClub.id, userId);
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!selectedClub) return;
        const confirmed = await confirm({
            title: "Remove Member",
            message: "Are you sure you want to remove this member from the club?",
            variant: "danger"
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await removeClubMember(selectedClub.id, userId);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setConfirmLoading(false);
            closeConfirm();
        }
    };

    const filteredUsers = users.filter(u => 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderCreateForm = () => (
        <div className="max-w-3xl mx-auto space-y-8 p-6 sm:p-10 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Create New Club</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">Fill in the details to launch a new organization</p>
                </div>
                <button onClick={() => { setIsCreating(false); setNewClub(emptyForm); setFormErrors({}); }} className="p-3 text-gray-400 hover:text-gray-600 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    <X size={20} />
                </button>
            </div>

            {/* Icon + Name + Category Row */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Icon Picker & Optional Logo */}
                <div className="relative flex flex-col gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Icon</label>
                    <div className="relative group">
                        <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-20 h-20 rounded-[2rem] bg-gray-50 dark:bg-[#0C0C10] border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-3xl hover:border-primary hover:bg-primary/5 transition-all overflow-hidden"
                            title="Choose emoji or upload logo"
                        >
                            {newClubLogoFile ? (
                                <img src={URL.createObjectURL(newClubLogoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                newClub.icon
                            )}
                        </button>
                        <button
                            onClick={() => fileInputRefLogo.current?.click()}
                            className="absolute -right-2 -bottom-2 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-gray-50 transition-colors z-10"
                            title="Upload custom logo"
                        >
                            <ImageIcon size={14} />
                        </button>
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRefLogo} 
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setNewClubLogoFile(file);
                            }}
                            className="hidden" 
                        />
                    </div>
                    {showEmojiPicker && (
                        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-[#1A1A24] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-3 grid grid-cols-4 gap-2 w-52">
                            {EMOJI_OPTIONS.map(emoji => (
                                <button 
                                    key={emoji} 
                                    onClick={() => { setNewClub({ ...newClub, icon: emoji }); setShowEmojiPicker(false); }}
                                    className="w-10 h-10 rounded-xl hover:bg-primary/10 flex items-center justify-center text-xl transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Name, Category, & Banner */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Type size={10} /> Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newClub.name}
                            onChange={e => { setNewClub({ ...newClub, name: e.target.value }); setFormErrors({ ...formErrors, name: "" }); }}
                            className={`w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border ${formErrors.name ? 'border-red-400' : 'border-gray-100 dark:border-gray-800'} rounded-2xl text-sm font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all`}
                            placeholder="e.g. Debate Club"
                        />
                        {formErrors.name && <p className="text-[10px] text-red-500 font-bold">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                        <select
                            value={newClub.category}
                            onChange={e => setNewClub({ ...newClub, category: e.target.value })}
                            className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                        >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    </div>
                    {/* Banner Upload Option */}
                    <div className="w-full space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">Banner Image (Optional)</label>
                        <div 
                            className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary transition-colors flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                            onClick={() => fileInputRefBanner.current?.click()}
                        >
                            {newClubBannerFile ? (
                                <img src={URL.createObjectURL(newClubBannerFile)} className="w-full h-full object-cover" alt="Banner Preview" />
                            ) : (
                                <div className="text-gray-400 font-bold text-xs flex flex-col items-center gap-1">
                                    <Upload size={16} /> Click to upload banner image
                                </div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRefBanner}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setNewClubBannerFile(file);
                                }}
                                className="hidden" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tagline / Motto</label>
                <input
                    type="text"
                    value={newClub.tagline}
                    onChange={e => setNewClub({ ...newClub, tagline: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                    placeholder='e.g. "Sharpen your voice & logic"'
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <AlignLeft size={10} /> Description
                </label>
                <textarea
                    value={newClub.description}
                    onChange={e => setNewClub({ ...newClub, description: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-medium min-h-[100px] leading-relaxed resize-none"
                    placeholder="Describe what the club does, its mission, and activities..."
                />
            </div>

            {/* Advisor + Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={10} /> Advisor Name
                    </label>
                    <input
                        type="text"
                        value={newClub.advisorName}
                        onChange={e => setNewClub({ ...newClub, advisorName: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                        placeholder="e.g. Dr. Kamal Hossain"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={10} /> Schedule
                    </label>
                    <input
                        type="text"
                        value={newClub.schedule}
                        onChange={e => setNewClub({ ...newClub, schedule: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                        placeholder="e.g. Every Friday 3 PM"
                    />
                </div>
            </div>

            {/* Location + Founded */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={10} /> Meeting Location
                    </label>
                    <input
                        type="text"
                        value={newClub.location}
                        onChange={e => setNewClub({ ...newClub, location: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                        placeholder="e.g. Room 203, Main Building"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Founded Year</label>
                    <input
                        type="text"
                        value={newClub.foundedDate}
                        onChange={e => setNewClub({ ...newClub, foundedDate: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold"
                        placeholder="2024"
                    />
                </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={10} /> Social Links
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <Globe size={16} className="text-[#1877F2] shrink-0" />
                        <input
                            type="url"
                            value={newClub.facebookLink}
                            onChange={e => setNewClub({ ...newClub, facebookLink: e.target.value })}
                            className="w-full bg-transparent py-3 text-sm font-bold border-none focus:outline-none"
                            placeholder="Facebook page URL"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <MessageCircle size={16} className="text-emerald-500 shrink-0" />
                        <input
                            type="text"
                            value={newClub.whatsappLink}
                            onChange={e => setNewClub({ ...newClub, whatsappLink: e.target.value })}
                            className="w-full bg-transparent py-3 text-sm font-bold border-none focus:outline-none"
                            placeholder="WhatsApp group invite link"
                        />
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleCreateClub}
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                {loading ? "Creating Club..." : "Create Club"}
            </button>
        </div>
    );

    const renderTabContent = () => {
        if (!selectedClub && !isCreating) return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 mb-6">
                    <LayoutGrid size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Select a Club</h3>
                <p className="text-gray-500 font-medium mt-2 max-w-sm">Choose an organization from the sidebar to manage its members, settings, and activity.</p>
            </div>
        );

        if (isCreating) return renderCreateForm();

        switch (activeTab) {
            case "dashboard":
                return (
                    <div className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2.5rem] relative overflow-hidden group">
                                <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/10 group-hover:scale-110 transition-transform" />
                                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Total Roster</p>
                                <h4 className="text-4xl font-black text-gray-900 dark:text-white">{members.length}</h4>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">Active members in club</p>
                            </div>
                            <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] relative overflow-hidden group">
                                <Inbox className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 group-hover:scale-110 transition-transform" />
                                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Pending Sync</p>
                                <h4 className="text-4xl font-black text-gray-900 dark:text-white">{requests.length}</h4>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">Applicants awaiting review</p>
                            </div>
                            <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] relative overflow-hidden group">
                                <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/10 group-hover:scale-110 transition-transform" />
                                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Recent Flow</p>
                                <h4 className="text-4xl font-black text-gray-900 dark:text-white">{activities.length}</h4>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">Logged activities this term</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h5 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <ShieldCheck className="text-primary" size={20} /> Management Insights
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <h6 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Latest Inbound</h6>
                                    {requests.length > 0 ? (
                                        <div className="space-y-3">
                                            {requests.slice(0, 3).map(r => (
                                                <div key={r.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                                            {r.photoURL ? <Image src={r.photoURL} alt="" width={32} height={32} /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{r.displayName[0]}</div>}
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{r.displayName}</p>
                                                    </div>
                                                    <button onClick={() => setActiveTab("inbound")} className="text-[10px] font-black text-primary uppercase tracking-wider">Review</button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-gray-400 font-medium italic">No pending requests</p>}
                                </div>
                                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-gray-800">
                                    <h6 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Quick Links</h6>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setActiveTab("settings")} className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 hover:text-primary transition-colors text-left flex items-center gap-2"><Settings size={14} /> Settings</button>
                                        <button onClick={() => setActiveTab("roster")} className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 hover:text-primary transition-colors text-left flex items-center gap-2"><Users size={14} /> Roster</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "inbound":
                return (
                    <div className="p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Inbound Requests</h3>
                            <div className="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">{requests.length} Pending</div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {requests.map(req => (
                                <div key={req.id} className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative border-2 border-primary/20 p-1">
                                            {req.photoURL ? <Image src={req.photoURL} alt="" fill className="object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-primary/10 text-primary">{req.displayName[0]}</div>}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{req.displayName}</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Applied via Connect</p>
                                        </div>
                                    </div>
                                    {req.message && (
                                        <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-100/50 dark:border-gray-800/50">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">&quot;{req.message}&quot;</p>
                                        </div>
                                    )}
                                    <div className="flex gap-3 mt-auto">
                                        <button onClick={() => handleApprove(req.userId)} className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform">
                                            <Check size={16} /> Approve
                                        </button>
                                        <button onClick={() => handleReject(req.userId)} className="px-6 py-3 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {requests.length === 0 && (
                                <div className="col-span-full py-20 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                    <Inbox size={40} className="text-gray-300 mb-4" />
                                    <p className="text-sm font-bold text-gray-400">All caught up! No pending requests.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case "roster": {
                const memberUserIds = new Set(members.map(m => m.userId));
                const addMemberResults = addMemberSearch.trim().length >= 2 
                    ? users.filter(u => 
                        !memberUserIds.has(u.id) && (
                            (u.displayName || "").toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                            (u.username || "").toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                            (u.email || "").toLowerCase().includes(addMemberSearch.toLowerCase())
                        )
                    ).slice(0, 8)
                    : [];

                return (
                    <div className="p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Club Roster</h3>
                            <button 
                                onClick={() => showAddMember ? setShowAddMember(false) : handleOpenAddMember()}
                                className={`flex items-center gap-2 px-6 py-3 text-xs font-black rounded-2xl shadow-lg transition-all ${
                                    showAddMember 
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-none' 
                                        : 'bg-primary text-white shadow-primary/20'
                                }`}
                            >
                                {showAddMember ? <X size={16} /> : <Plus size={16} />}
                                {showAddMember ? 'Cancel' : 'Add Member'}
                            </button>
                        </div>

                        {/* Add Member Search Panel */}
                        <AnimatePresence>
                            {showAddMember && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-[2rem] space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Search size={18} className="text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white">Find & Add Member</h4>
                                                <p className="text-[10px] text-gray-400 font-medium">Search by name, username, or email</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={addMemberSearch}
                                                onChange={e => setAddMemberSearch(e.target.value)}
                                                placeholder="Type at least 2 characters to search..."
                                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-black/20 rounded-2xl text-sm font-bold border border-gray-200 dark:border-gray-700 focus:border-primary focus:outline-none transition-all"
                                                autoFocus
                                            />
                                        </div>

                                        {loadingUsers && (
                                            <div className="flex items-center justify-center py-6 text-primary gap-2">
                                                <Loader2 size={16} className="animate-spin" />
                                                <p className="text-xs font-bold">Loading users...</p>
                                            </div>
                                        )}

                                        {!loadingUsers && addMemberSearch.trim().length >= 2 && (
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {addMemberResults.length > 0 ? addMemberResults.map(user => (
                                                    <div key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1A1A24] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/30 transition-all">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 relative">
                                                                {user.photoURL ? <Image src={user.photoURL} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">{user.displayName[0]}</div>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium truncate">@{user.username} · {user.role}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddDirectMember(user.id)}
                                                            disabled={addingMemberId === user.id}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[10px] font-black rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                        >
                                                            {addingMemberId === user.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                            Add
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <User size={24} className="mx-auto mb-2 opacity-40" />
                                                        <p className="text-xs font-bold">No users found matching "{addMemberSearch}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {members.map(member => (
                                <div key={member.id} className="p-6 bg-white dark:bg-[#1A1A24] rounded-3xl border border-gray-100 dark:border-gray-800 group hover:border-primary transition-all">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            {member.photoURL ? <Image src={member.photoURL} alt="" width={48} height={48} /> : <div className="w-full h-full flex items-center justify-center text-sm font-black">{member.displayName[0]}</div>}
                                        </div>
                                        <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">{member.role}</div>
                                    </div>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{member.displayName}</p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Member since {member.joinedAt?.toDate?.()?.toLocaleDateString?.() || "N/A"}</p>
                                    
                                    <div className="mt-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <select 
                                            value={member.role}
                                            onChange={e => updateClubMemberRole(selectedClub!.id, member.userId, e.target.value as any)}
                                            className="bg-transparent text-[10px] font-black text-primary border-none outline-none cursor-pointer"
                                        >
                                            <option value="President">President</option>
                                            <option value="Vice President">Vice President</option>
                                            <option value="General Secretary">Gen. Secretary</option>
                                            <option value="Member">Member</option>
                                        </select>
                                        <button onClick={() => handleRemoveMember(member.userId)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                            <UserMinus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {members.length === 0 && !showAddMember && (
                                <div className="col-span-full py-20 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                    <Users size={40} className="text-gray-300 mb-4" />
                                    <p className="text-sm font-bold text-gray-400">No members yet. Use the "Add Member" button to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            case "settings":
                return (
                    <div className="p-10 max-w-3xl mx-auto space-y-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Club Settings</h3>
                            <button onClick={handleSaveSettings} disabled={loading} className="px-8 py-3 bg-primary text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                            </button>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-4xl border-4 border-white dark:border-[#161620] shadow-xl overflow-hidden relative">
                                    {selectedClub!.logo ? <Image src={selectedClub!.logo} alt="" fill className="object-cover" /> : selectedClub!.icon || "🎯"}
                                </div>
                                <label className="absolute -right-2 -bottom-2 p-3 bg-primary text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                                    <Camera size={18} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo")} disabled={loading} />
                                </label>
                            </div>
                            <div className="relative group flex-1 self-stretch border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] flex items-center justify-center overflow-hidden min-h-[128px]">
                                {selectedClub!.bannerUrl ? (
                                    <Image src={selectedClub!.bannerUrl} alt="Banner" fill className="object-cover opacity-60" />
                                ) : (
                                    <p className="text-gray-400 font-bold text-xs">No Cover Banner</p>
                                )}
                                <label className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm cursor-pointer z-10">
                                    <div className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xl">
                                        <Camera size={14} /> Upload Banner
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "bannerUrl")} disabled={loading} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-6 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                                        <input type="text" value={selectedClub!.name} onChange={e => setSelectedClub({ ...selectedClub!, name: e.target.value })} className="w-full px-5 py-3 bg-gray-50 dark:bg-black/20 rounded-2xl text-sm font-bold border border-transparent focus:border-primary transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                                        <select value={selectedClub!.category} onChange={e => setSelectedClub({ ...selectedClub!, category: e.target.value as any })} className="w-full px-5 py-3 bg-gray-50 dark:bg-black/20 rounded-2xl text-sm font-bold">
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tagline</label>
                                    <input type="text" value={selectedClub!.tagline} onChange={e => setSelectedClub({ ...selectedClub!, tagline: e.target.value })} className="w-full px-5 py-3 bg-gray-50 dark:bg-black/20 rounded-2xl text-sm font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Description</label>
                            <textarea value={selectedClub!.description} onChange={e => setSelectedClub({ ...selectedClub!, description: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-black/20 rounded-3xl text-sm font-medium min-h-[120px] leading-relaxed" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} /> Meeting Venue</label>
                                <input type="text" value={selectedClub!.location} onChange={e => setSelectedClub({ ...selectedClub!, location: e.target.value })} className="w-full px-5 py-3 bg-gray-50 dark:bg-black/20 rounded-2xl text-sm font-bold" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> Schedule</label>
                                <input type="text" value={selectedClub!.schedule} onChange={e => setSelectedClub({ ...selectedClub!, schedule: e.target.value })} className="w-full px-5 py-3 bg-gray-50 dark:bg-black/20 rounded-2xl text-sm font-bold" />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                             <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">Danger Zone</h4>
                             <div className="flex gap-4">
                                 <button onClick={() => handleToggleActive(selectedClub!.id, selectedClub!.isActive !== false)} className="px-8 py-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold rounded-2xl hover:bg-amber-500 hover:text-white transition-all">
                                     {selectedClub!.isActive !== false ? "Pause Club" : "Activate Club"}
                                 </button>
                                 <button onClick={() => handleDelete(selectedClub!.id)} className="px-8 py-3 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                     Disband Club
                                 </button>
                             </div>
                        </div>
                    </div>
                );
            case "feed":
                return (
                    <div className="p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Activity Feed</h3>
                            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-black rounded-2xl shadow-lg shadow-primary/20">
                                <Plus size={16} /> Post Update
                            </button>
                        </div>
                        <div className="space-y-6">
                            {activities.map(act => (
                                <div key={act.id} className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-gray-800 flex gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${act.type === 'event' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {act.type === 'event' ? <Calendar size={20} /> : <ShieldCheck size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h6 className="text-sm font-black text-gray-900 dark:text-white">{act.title}</h6>
                                            <span className="text-[10px] text-gray-400 font-medium">{act.date}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{act.description}</p>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && <p className="text-center py-20 text-gray-400 font-medium">No recent items in the feed.</p>}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#161620] w-full max-w-7xl h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex"
            >
                {/* Sidebar (Only for Admins/Managers or if no club selected) */}
                <AnimatePresence>
                    {(isSuperAdmin || isCollegeManager || !selectedClub) && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-gray-50 dark:bg-black/10 border-r border-gray-50 dark:border-gray-800 flex flex-col"
                        >
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Organization Board</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Connected Entities</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {(isSuperAdmin || isCollegeManager) && (
                                    <button 
                                        onClick={() => { setIsCreating(true); setSelectedClub(null); }}
                                        className="w-full p-4 mb-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                                    >
                                        <Plus size={18} /> New Club
                                    </button>
                                )}
                                {clubs.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => { setSelectedClub(c); setIsCreating(false); }}
                                        className={`group p-4 rounded-3xl cursor-pointer transition-all flex items-center justify-between ${selectedClub?.id === c.id ? 'bg-white dark:bg-[#0C0C10] shadow-xl border border-primary/20' : 'hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg overflow-hidden relative shrink-0">
                                                {c.logo ? <Image src={c.logo} alt="" fill className="object-cover" /> : (c.icon || "🎯")}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{c.name}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{c.category}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className={`transition-transform ${selectedClub?.id === c.id ? 'text-primary' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />
                                    </div>
                                ))}
                            </div>
                            <div className="p-8 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={onClose} className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-500 font-black rounded-3xl hover:bg-gray-200 transition-all">Close Board</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Dashboard Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#161620]">
                    {selectedClub ? (
                        <>
                            {/* Header */}
                            <div className="p-10 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-white/5 relative overflow-hidden">
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-20 h-20 rounded-full bg-white dark:bg-black/40 flex items-center justify-center text-4xl shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden shrink-0">
                                        {selectedClub!.logo ? <Image src={selectedClub!.logo} alt="" fill className="object-cover" /> : selectedClub!.icon || "🎯"}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{selectedClub.name}</h1>
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">Active</span>
                                        </div>
                                        <p className="text-gray-500 font-medium flex items-center gap-2 mt-1"><Users size={14} /> {members.length} Members • {selectedClub.category} Organization</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 z-10">
                                    {(!isSuperAdmin && !isCollegeManager) && (
                                        <button onClick={onClose} className="p-4 bg-white dark:bg-black/20 rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 dark:border-gray-800">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                                {/* Background Decorative Element */}
                                {selectedClub.bannerUrl ? (
                                    <div className="absolute inset-0 z-0 select-none">
                                        <Image src={selectedClub.bannerUrl} alt="" fill className="object-cover opacity-20 dark:opacity-[0.15]" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-gray-50/50 to-transparent dark:from-white/10 dark:via-transparent dark:to-transparent" />
                                    </div>
                                ) : (
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 z-0" />
                                )}
                            </div>

                            {/* Nav Tabs */}
                            <div className="px-10 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-8 bg-white/50 dark:bg-black/5 backdrop-blur-md">
                                {(() => {
                                    const isPresidentOfSelected = members?.some((m) => (m.userId === profile?.uid || m.userId === (profile as any)?.id) && m.role === "President");
                                    const canManageSelected = isSuperAdmin || isCollegeManager || selectedClub?.createdBy === profile?.uid || isPresidentOfSelected;

                                    return (
                                        <>
                                            <button onClick={() => setActiveTab("dashboard")} className={`text-xs font-black uppercase tracking-widest relative py-2 transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                                Overview
                                                {activeTab === 'dashboard' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                            </button>
                                            
                                            {canManageSelected && (
                                                <button onClick={() => setActiveTab("inbound")} className={`text-xs font-black uppercase tracking-widest relative py-2 transition-all flex items-center gap-2 ${activeTab === 'inbound' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    Inbound
                                                    {requests.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                    {activeTab === 'inbound' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                                </button>
                                            )}
                                            
                                            <button onClick={() => setActiveTab("roster")} className={`text-xs font-black uppercase tracking-widest relative py-2 transition-all ${activeTab === 'roster' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                                Roster
                                                {activeTab === 'roster' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                            </button>
                                            <button onClick={() => setActiveTab("feed")} className={`text-xs font-black uppercase tracking-widest relative py-2 transition-all ${activeTab === 'feed' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                                Feed
                                                {activeTab === 'feed' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                            </button>
                                            
                                            {canManageSelected && (
                                                <button onClick={() => setActiveTab("settings")} className={`text-xs font-black uppercase tracking-widest relative py-2 transition-all ${activeTab === 'settings' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    Settings
                                                    {activeTab === 'settings' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {renderTabContent()}
                            </div>
                        </>
                    ) : renderTabContent()}
                </div>
            </motion.div>
        </div>
    );
}
