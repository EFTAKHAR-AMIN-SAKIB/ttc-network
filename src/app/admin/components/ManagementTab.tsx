"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Users,
    Shield,
    ShieldCheck,
    ShieldX,
    CheckCircle2,
    Clock,
    ChevronDown,
    AlertTriangle,
} from "lucide-react";
import {
    getCurrentUserProfile,
    getAllUsers,
    getUsersByCollege,
    updateUserRoleAndCollege,
    updateUserRole,
    getPendingPosts,
    getPendingStories,
    getNotices,
    approvePost,
    rejectPost,
    approveStory,
    rejectStory,
    updateNoticeStatus,
    getColleges,
    type FirestoreUser,
    type FirestorePost,
    type FirestoreStory,
    type FirestoreNotice,
    type FirestoreCollege,
} from "@/lib/firestore";
import { UserProfile } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function ManagementTab({ profile: initialProfile }: { profile: UserProfile }) {
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [users, setUsers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [posts, setPosts] = useState<(FirestorePost & { id: string })[]>([]);
    const [stories, setStories] = useState<(FirestoreStory & { id: string })[]>([]);
    const [notices, setNotices] = useState<(FirestoreNotice & { id: string })[]>([]);
    const [colleges, setColleges] = useState<(FirestoreCollege & { id: string })[]>([]);
    
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [activeSection, setActiveSection] = useState<"approvals" | "users">("approvals");

    // Section-specific error states
    const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});

    const loadData = async (targetSection?: string) => {
        if (!targetSection) setLoading(true);
        else setSectionErrors(prev => ({ ...prev, [targetSection]: false }));

        try {
            const userProfile = initialProfile || await getCurrentUserProfile();
            if (!userProfile) {
                return;
            }
            setProfile(userProfile as any);
            const isGlobalAdmin = userProfile.role === "admin" || userProfile.role === "super_manager";

            const fetchPromises = [
                // 1. Users
                (!targetSection || targetSection === "users") ? (async () => {
                    try {
                        const data = isGlobalAdmin ? await getAllUsers() : await getUsersByCollege(userProfile.collegeId);
                        setUsers(data);
                    } catch (e) {
                        console.error("Users load fail:", e);
                        setSectionErrors(prev => ({ ...prev, users: true }));
                    }
                })() : Promise.resolve(),

                // 2. Posts
                (!targetSection || targetSection === "posts") ? (async () => {
                    try {
                        const data = await getPendingPosts();
                        setPosts(isGlobalAdmin ? data : data.filter(p => p.collegeId === userProfile.collegeId));
                    } catch (e) {
                        console.error("Posts load fail:", e);
                        setSectionErrors(prev => ({ ...prev, posts: true }));
                    }
                })() : Promise.resolve(),

                // 3. Stories
                (!targetSection || targetSection === "stories") ? (async () => {
                    try {
                        const data = await getPendingStories();
                        setStories(isGlobalAdmin ? data : data.filter(s => s.collegeId === userProfile.collegeId));
                    } catch (e) {
                        console.error("Stories load fail:", e);
                        setSectionErrors(prev => ({ ...prev, stories: true }));
                    }
                })() : Promise.resolve(),

                // 4. Notices
                (!targetSection || targetSection === "notices") ? (async () => {
                    try {
                        const data = await getNotices();
                        setNotices(data.filter(n => n.status === "pending" && (isGlobalAdmin || n.collegeId === userProfile.collegeId)));
                    } catch (e) {
                        console.error("Notices load fail:", e);
                        setSectionErrors(prev => ({ ...prev, notices: true }));
                    }
                })() : Promise.resolve(),

                // 5. Colleges (Constant)
                (!targetSection || targetSection === "colleges") ? (async () => {
                    try {
                        setColleges(await getColleges());
                    } catch (e) {
                        console.error("Colleges load fail:", e);
                    }
                })() : Promise.resolve(),
            ];

            await Promise.all(fetchPromises);

            // If we detected any section errors during a full load, show a global warning
            const hasAnyError = Object.values(sectionErrors).some(v => v);
            if (!targetSection && hasAnyError) {
                showToast("Some sections failed to load. Please check your data connection or indexes.", "error");
            }
        } catch (err) {
            console.error("Critical fail:", err);
            showToast("Global authentication or connection failure.", "error");
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);



    /* ─── Approvals ─── */
    const handleAction = async (type: "post" | "story" | "notice", id: string, action: "approve" | "reject") => {
        try {
            if (type === "post") {
                if (action === "approve") await approvePost(id);
                else await rejectPost(id);
            } else if (type === "story") {
                if (action === "approve") await approveStory(id);
                else await rejectStory(id, "Rejected by moderation.");
            } else if (type === "notice") {
                await updateNoticeStatus(id, action === "approve" ? "approved" : "rejected");
            }
            showToast(`✅ ${type} ${action}d successfully.`, "success");
            loadData();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
        }
    };

    /* ─── User Management ─── */
    const handleRoleChange = async (userId: string, user: FirestoreUser, newRole: FirestoreUser["role"]) => {
        try {
            await updateUserRole(userId, newRole, newRole === "admin" || newRole === "manager");
            showToast(`✅ Role updated to ${newRole}`, "success");
            loadData();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleCollegeChange = async (userId: string, user: FirestoreUser, newCollegeId: string) => {
        const col = colleges.find(c => c.id === newCollegeId);
        if (!col) return;
        try {
            await updateUserRoleAndCollege(userId, user.role, user.roleVerified, col.id, col.shortName || col.name);
            showToast(`✅ College updated to ${col.shortName}`, "success");
            loadData();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    const handleVerifyToggle = async (userId: string, user: FirestoreUser) => {
        try {
            await updateUserRole(userId, user.role, !user.roleVerified);
            showToast(user.roleVerified ? "Verification removed." : "✅ Role verified!", "success");
            loadData();
        } catch (err) {
            showToast(`❌ Error: ${err instanceof Error ? err.message : "Error"}`, "error");
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-[#1a1b23] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (!profile || (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "super_manager")) {
        return (
            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl p-8 border border-gray-100 dark:border-gray-800 text-center">
                <ShieldX size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h3>
                <p className="text-gray-700 dark:text-gray-400">You must be an Administrator or Manager to access this section.</p>
            </div>
        );
    }

    const pendingCount = posts.length + stories.length + notices.length;
    const isAdmin = profile.role === "admin";
    const isSuperManager = profile.role === "super_manager";
    const isGlobalAdmin = isAdmin || isSuperManager;

    return (
        <div className="space-y-6">


            <div className="flex bg-white dark:bg-[#1a1b23] p-1 rounded-xl border border-gray-100 dark:border-gray-800 inline-flex shadow-sm">
                <button 
                    onClick={() => setActiveSection("approvals")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeSection === "approvals" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                    <Clock size={16} /> Approvals
                    {pendingCount > 0 && (
                        <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveSection("users")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeSection === "users" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
                >
                    <Users size={16} /> Users & Roles
                </button>
            </div>

            {activeSection === "approvals" && (
                <div className="space-y-8">
                    {/* Posts Section */}
                    <div className="bg-white dark:bg-[#1a1b23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-primary" /> Pending Posts ({posts.length})
                            </h3>
                            {sectionErrors.posts && (
                                <button onClick={() => loadData("posts")} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                                    <AlertTriangle size={12} /> Retry Load
                                </button>
                            )}
                        </div>
                        
                        {sectionErrors.posts ? (
                            <div className="p-8 text-center bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unable to fetch posts. This usually requires a Firestore index.</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs italic">No pending posts to review.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {posts.map((post) => (
                                    <div key={post.id} className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 relative group overflow-hidden">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {post.createdBy.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{post.createdBy.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black">{post.collegeName} · {post.linkPreview.title}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed">{post.linkPreview.description}</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleAction("post", post.id!, "approve")} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors shadow-sm">Approve</button>
                                            <button onClick={() => handleAction("post", post.id!, "reject")} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stories Section */}
                    <div className="bg-white dark:bg-[#1a1b23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Clock size={14} className="text-emerald-500" /> Pending Stories ({stories.length})
                            </h3>
                            {sectionErrors.stories && (
                                <button onClick={() => loadData("stories")} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                                    <AlertTriangle size={12} /> Retry Load
                                </button>
                            )}
                        </div>

                        {sectionErrors.stories ? (
                            <div className="p-8 text-center bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Stories fail to load. Composite index might be missing.</p>
                            </div>
                        ) : stories.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs italic">All stories have been processed.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stories.map((story) => (
                                    <div key={story.id} className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3 mb-3">
                                            {story.authorPhoto && <Image src={story.authorPhoto} alt="" width={32} height={32} className="rounded-full flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{story.title}</p>
                                                <p className="text-[10px] text-gray-500">{story.name} · {story.college}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 italic leading-relaxed">&ldquo;{story.preview}&rdquo;</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleAction("story", story.id!, "approve")} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors shadow-sm">Approve</button>
                                            <button onClick={() => handleAction("story", story.id!, "reject")} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notices Section */}
                    <div className="bg-white dark:bg-[#1a1b23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Shield size={14} className="text-amber-500" /> Notice Approvals ({notices.length})
                            </h3>
                            {sectionErrors.notices && (
                                <button onClick={() => loadData("notices")} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-200 transition-colors flex items-center gap-1.5">
                                    <AlertTriangle size={12} /> Retry Load
                                </button>
                            )}
                        </div>

                        {sectionErrors.notices ? (
                            <div className="p-8 text-center bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Failed to load notices. Check shadow-ban index.</p>
                            </div>
                        ) : notices.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs italic">No notices awaiting approval.</div>
                        ) : (
                            <div className="space-y-3">
                                {notices.map((notice) => (
                                    <div key={notice.id} className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">{notice.programme}</span>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{notice.title}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-500">By {notice.postedBy} · {notice.college}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAction("notice", notice.id!, "approve")} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold shadow-sm">Approve</button>
                                            <button onClick={() => handleAction("notice", notice.id!, "reject")} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-[10px] font-bold">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSection === "users" && (
                <div className="bg-white dark:bg-[#1a1b23] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-widest text-sm">
                                <Users size={16} className="text-primary" /> User Directory ({users.length})
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">
                                {isGlobalAdmin ? "Admin access: Viewing all registered members" : `Manager access: Viewing members of your institution`}
                            </p>
                        </div>
                        {sectionErrors.users && (
                            <button onClick={() => loadData("users")} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-amber-500/20">
                                <AlertTriangle size={14} /> Retry Loading Users
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {sectionErrors.users ? (
                            <div className="p-20 text-center">
                                <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Directory Error</h4>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">We couldn&apos;t fetch the user list. This is likely due to a missing Firestore index for college filtering.</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-20 text-center">
                                <Users size={48} className="text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Empty Directory</h4>
                                <p className="text-sm text-gray-500 mt-2">No users found matching your access permissions.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm border-separate border-spacing-0">
                                <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-[10px] uppercase font-black tracking-widest text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Member Identity</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Institution</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Authorization</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Trust State</th>
                                        <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 text-right">Operations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {users.map((user) => (
                                        <tr key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-primary/5 transition-all">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm shadow-sm">
                                                        {user.displayName[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-gray-900 dark:text-white text-sm truncate">{user.displayName}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold truncate tracking-tight">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {isGlobalAdmin ? (
                                                    <div className="relative inline-block w-48">
                                                        <select 
                                                            value={user.collegeId} 
                                                            onChange={(e) => handleCollegeChange(user.id!, user, e.target.value)}
                                                            className="appearance-none w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs font-bold"
                                                        >
                                                            {colleges.map(c => (
                                                                <option key={c.id} value={c.id}>{c.shortName || c.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{user.college}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="relative inline-block w-36">
                                                    <select 
                                                        value={user.role} 
                                                        onChange={(e) => handleRoleChange(user.id!, user, e.target.value as FirestoreUser["role"])}
                                                        className={`appearance-none w-full border text-[10px] font-black uppercase py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                                            user.role === "admin" ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800" :
                                                            user.role === "super_manager" ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800" :
                                                            user.role === "manager" ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" :
                                                            user.role === "teacher" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                                                            "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                                        }`}
                                                        disabled={(user.role === "admin" && !isAdmin) || (user.role === "super_manager" && !isAdmin && profile?.uid !== user.id)}
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="teacher">Teacher</option>
                                                        {isGlobalAdmin && <option value="manager">Manager</option>}
                                                        {isAdmin && <option value="super_manager">Super Manager</option>}
                                                        {isAdmin && <option value="admin">Admin</option>}
                                                    </select>
                                                    <ChevronDown size={10} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {user.roleVerified ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                                        <ShieldCheck size={14} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500 uppercase tracking-widest border border-gray-100 dark:border-gray-700">
                                                        <Shield size={14} /> Unverified
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => handleVerifyToggle(user.id!, user)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                                                        user.roleVerified 
                                                        ? "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700" 
                                                        : "bg-primary text-white hover:bg-secondary shadow-lg shadow-primary/20"
                                                    }`}
                                                >
                                                    {user.roleVerified ? "Revoke" : "Approve"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
