"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Shield, Users, AlertTriangle, Check, XCircle, 
    UserCheck, UserMinus, ShieldAlert, ShieldCheck, Loader2,
    BarChart2, FileText, Settings, VolumeX, Volume2, Trash2, 
    Plus, HelpCircle, Activity, Info, Globe, Lock, EyeOff,
    Home, ChevronRight, ArrowLeft, ExternalLink, Sparkles
} from "lucide-react";
import { 
    subscribeGroupRequests, subscribeGroupMembers, subscribeGroupReports,
    approveGroupRequest, rejectGroupRequest, updateGroupMemberRole,
    resolveGroupReport, deleteGroupPost, type GroupRequest, type GroupMember,
    muteGroupMember, unmuteGroupMember, banGroupMemberWithPurge, getGroupInsights,
    updateGroupSettings, subscribeGroupActivityLog, subscribeGroupDetails,
    deleteGroup, uploadFile
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import SafeAvatar from "./SafeAvatar";

interface GroupModerationPanelProps {
    isOpen?: boolean;
    onClose?: () => void;
    groupId: string;
    groupName: string;
    currentUserRole: "admin" | "moderator" | null;
    embedded?: boolean;
    onBackToHome?: () => void;
    controlledTab?: "insights" | "requests" | "reports" | "members" | "settings" | "activity";
    onTabChange?: (tab: "insights" | "requests" | "reports" | "members" | "settings" | "activity") => void;
    hideSidebar?: boolean;
}

export default function GroupModerationPanel({ 
    isOpen = true, 
    onClose = () => {}, 
    groupId, 
    groupName, 
    currentUserRole,
    embedded = false,
    onBackToHome,
    controlledTab,
    onTabChange,
    hideSidebar = false
}: GroupModerationPanelProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading, close } = useConfirm();

    // Active tool tab
    const [internalTab, setInternalTab] = useState<"insights" | "requests" | "reports" | "members" | "settings" | "activity">("insights");
    const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
    const setActiveTab = (tab: "insights" | "requests" | "reports" | "members" | "settings" | "activity") => {
        setInternalTab(tab);
        onTabChange?.(tab);
    };
    const [mobileToolOpen, setMobileToolOpen] = useState(false);
    
    // Subscribed data state
    const [requests, setRequests] = useState<GroupRequest[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [group, setGroup] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    
    // Insights state
    const [insights, setInsights] = useState<any>(null);
    const [insightsRange, setInsightsRange] = useState<number>(28);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // Settings form state
    const [settingsJoinApproval, setSettingsJoinApproval] = useState(false);
    const [settingsMinWordsEnabled, setSettingsMinWordsEnabled] = useState(false);
    const [settingsMinWordsCount, setSettingsMinWordsCount] = useState(10);
    const [settingsBlockLinksEnabled, setSettingsBlockLinksEnabled] = useState(false);
    const [settingsBlockNewMembersEnabled, setSettingsBlockNewMembersEnabled] = useState(false);
    const [settingsNewMemberHours, setSettingsNewMemberHours] = useState(24);
    const [newKeyword, setNewKeyword] = useState("");
    const [settingsKeywords, setSettingsKeywords] = useState<string[]>([]);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsPrivacyType, setSettingsPrivacyType] = useState<"public" | "private" | "secret">("public");

    // Group Details editing state
    const [settingsGroupName, setSettingsGroupName] = useState("");
    const [settingsGroupDescription, setSettingsGroupDescription] = useState("");
    const [settingsCoverFile, setSettingsCoverFile] = useState<File | null>(null);
    const [settingsCoverPreview, setSettingsCoverPreview] = useState<string | null>(null);

    // Muting & Banning local interactive state
    const [mutingUserId, setMutingUserId] = useState<string | null>(null);
    const [banningUser, setBanningUser] = useState<GroupMember | null>(null);
    const [purgePostsOnBan, setPurgePostsOnBan] = useState(false);

    // Group deletion local state
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // General loading
    const [loading, setLoading] = useState(true);
    const [isActioning, setIsActioning] = useState<string | null>(null);

    const router = useRouter();

    const isAdmin = currentUserRole === "admin";
    const isModerator = currentUserRole === "moderator";

    // Subscribe to standard real-time group data
    useEffect(() => {
        if (!isOpen && !embedded) return;

        setLoading(true);
        const unsubRequests = subscribeGroupRequests(groupId, (data) => {
            setRequests(data);
            setLoading(false);
        });

        const unsubReports = subscribeGroupReports(groupId, (data) => {
            setReports(data);
        });

        const unsubMembers = subscribeGroupMembers(groupId, (data) => {
            setMembers(data);
        });

        const unsubDetails = subscribeGroupDetails(groupId, (data) => {
            setGroup(data);
        });

        return () => {
            unsubRequests();
            unsubReports();
            unsubMembers();
            unsubDetails();
        };
    }, [isOpen, embedded, groupId]);

    // Lazy load / subscribe to activity logs when tab active
    useEffect(() => {
        if (activeTab === "activity" && (isOpen || embedded)) {
            const unsub = subscribeGroupActivityLog(groupId, (logs) => {
                setActivityLogs(logs);
            });
            return () => unsub();
        }
    }, [activeTab, groupId, isOpen, embedded]);

    // Lazy load insights when range changes or tab is active
    useEffect(() => {
        if (activeTab === "insights" && (isOpen || embedded)) {
            setLoadingInsights(true);
            getGroupInsights(groupId, insightsRange)
                .then((data) => {
                    setInsights(data);
                })
                .catch((err) => {
                    console.error(err);
                    showToast("Failed to load insights data.", "error");
                })
                .finally(() => {
                    setLoadingInsights(false);
                });
        }
    }, [activeTab, insightsRange, groupId, isOpen, embedded, showToast]);

    // Synchronize Firestore settings with local state
    useEffect(() => {
        if (group) {
            setSettingsJoinApproval(group.joinApprovalRequired || false);
            const rules = group.adminAssistRules || {};
            setSettingsMinWordsEnabled(rules.minWordsEnabled || false);
            setSettingsMinWordsCount(rules.minWordsCount || 10);
            setSettingsBlockLinksEnabled(rules.blockLinksEnabled || false);
            setSettingsBlockNewMembersEnabled(rules.blockNewMembersEnabled || false);
            setSettingsNewMemberHours(rules.newMemberHours || 24);
            setSettingsKeywords(group.keywordAlerts || []);
            setSettingsPrivacyType(group.privacyType || "public");

            setSettingsGroupName(group.name || "");
            setSettingsGroupDescription(group.description || "");
            setSettingsCoverPreview(group.coverUrl || null);
            setSettingsCoverFile(null);
        }
    }, [group]);

    const handleApproveRequest = async (req: GroupRequest) => {
        setIsActioning(req.userId);
        try {
            await approveGroupRequest(groupId, req.userId, req.displayName, req.photoURL);
            showToast(`Approved ${req.displayName}`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to approve request", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleRejectRequest = async (userId: string) => {
        setIsActioning(userId);
        try {
            await rejectGroupRequest(groupId, userId);
            showToast("Request declined", "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to decline request", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleDismissReport = async (reportId: string) => {
        setIsActioning(reportId);
        try {
            await resolveGroupReport(reportId);
            showToast("Report resolved & dismissed", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to resolve report", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleDeleteReportedPost = async (reportId: string, postId: string) => {
        const confirmed = await confirm({
            title: "Delete Reported Post?",
            message: "This will permanently remove this post and delete all comments inside it. The report will be marked as resolved.",
            confirmText: "Delete Post",
            variant: "danger"
        });

        if (!confirmed) return;
        setIsActioning(postId);
        setIsLoading(true);
        try {
            await deleteGroupPost(postId, groupId);
            await resolveGroupReport(reportId);
            showToast("Reported post deleted successfully", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to delete post", "error");
        } finally {
            close();
            setIsActioning(null);
        }
    };

    const handlePromoteMember = async (m: GroupMember) => {
        setIsActioning(m.userId);
        try {
            await updateGroupMemberRole(groupId, m.userId, "moderator");
            showToast(`${m.displayName} promoted to Moderator`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to promote member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handlePromoteToAdmin = async (m: GroupMember) => {
        const confirmed = await confirm({
            title: "Promote to Admin?",
            message: `Are you sure you want to promote ${m.displayName} to Admin? This will give them full management permissions, including the ability to edit group settings and delete the group.`,
            confirmText: "Promote",
            variant: "danger"
        });
        if (!confirmed) return;

        setIsActioning(m.userId);
        try {
            await updateGroupMemberRole(groupId, m.userId, "admin");
            showToast(`${m.displayName} is now an Admin`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to promote to admin", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleDemoteMember = async (m: GroupMember) => {
        setIsActioning(m.userId);
        try {
            await updateGroupMemberRole(groupId, m.userId, "member");
            showToast(`${m.displayName} role set to Member`, "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to demote member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleMuteMember = async (m: GroupMember, days: number) => {
        setIsActioning(m.userId);
        try {
            await muteGroupMember(groupId, m.userId, days, m.displayName);
            showToast(`${m.displayName} muted for ${days} days`, "info");
            setMutingUserId(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to mute member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleUnmuteMember = async (m: GroupMember) => {
        setIsActioning(m.userId);
        try {
            await unmuteGroupMember(groupId, m.userId, m.displayName);
            showToast(`${m.displayName} unmuted`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to unmute member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleConfirmBan = async () => {
        if (!banningUser) return;
        setIsActioning(banningUser.userId);
        try {
            await banGroupMemberWithPurge(groupId, banningUser.userId, banningUser.displayName, purgePostsOnBan);
            showToast(`Banned ${banningUser.displayName}${purgePostsOnBan ? " & purged posts" : ""}`, "info");
            setBanningUser(null);
            setPurgePostsOnBan(false);
        } catch (err) {
            console.error(err);
            showToast("Failed to ban member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            let finalCoverUrl = group.coverUrl;
            if (settingsCoverFile) {
                finalCoverUrl = await uploadFile(`group_covers/${groupId}_${Date.now()}`, settingsCoverFile);
            }

            await updateGroupSettings(groupId, {
                name: settingsGroupName.trim() || groupName,
                description: settingsGroupDescription.trim(),
                coverUrl: finalCoverUrl,
                privacyType: settingsPrivacyType,
                joinApprovalRequired: settingsJoinApproval,
                adminAssistRules: {
                    minWordsEnabled: settingsMinWordsEnabled,
                    minWordsCount: settingsMinWordsCount,
                    blockLinksEnabled: settingsBlockLinksEnabled,
                    blockNewMembersEnabled: settingsBlockNewMembersEnabled,
                    newMemberHours: settingsNewMemberHours
                },
                keywordAlerts: settingsKeywords
            });

            showToast("Group settings saved successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to save group settings", "error");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (deleteConfirmText.trim().toLowerCase() !== "confirm") {
            showToast('Please type "confirm" to permanently delete', "error");
            return;
        }

        setIsActioning("deleting_group");
        try {
            await deleteGroup(groupId);
            showToast(`Group "${groupName}" deleted successfully`, "success");
            onClose();
            window.location.href = "/groups";
        } catch (err) {
            console.error(err);
            showToast("Failed to delete group", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleAddKeyword = () => {
        if (!newKeyword.trim()) return;
        const kw = newKeyword.trim().toLowerCase();
        if (settingsKeywords.includes(kw)) {
            showToast("Keyword already exists", "info");
            return;
        }
        setSettingsKeywords([...settingsKeywords, kw]);
        setNewKeyword("");
    };

    const handleRemoveKeyword = (kw: string) => {
        setSettingsKeywords(settingsKeywords.filter(k => k !== kw));
    };

    // SVG Line Chart Renderers
    const renderMemberGrowthChart = () => {
        if (!insights || !insights.memberGrowth || insights.memberGrowth.length === 0) return null;
        const data = insights.memberGrowth;
        const max = Math.max(...data, 5);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        const width = 500;
        const height = 150;
        const paddingLeft = 30;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 20;
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        const points = data.map((val: number, i: number) => {
            const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((val - min) / range) * chartHeight;
            return { x, y, val };
        });

        const linePath = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

        return (
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Member Growth</h4>
                        <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{data[data.length - 1]} Members</p>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-black uppercase bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-full">
                        +{data[data.length - 1] - data[0]} new
                    </span>
                </div>

                <div className="relative h-36 w-full">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {[0, 0.5, 1].map((ratio, idx) => {
                            const y = paddingTop + chartHeight * ratio;
                            const val = Math.round(max - ratio * range);
                            return (
                                <g key={idx}>
                                    <line 
                                        x1={paddingLeft} 
                                        y1={y} 
                                        x2={width - paddingRight} 
                                        y2={y} 
                                        className="stroke-gray-100 dark:stroke-gray-800/60" 
                                        strokeWidth="1" 
                                        strokeDasharray="4 4"
                                    />
                                    <text 
                                        x={paddingLeft - 8} 
                                        y={y + 3} 
                                        className="fill-gray-400 dark:fill-gray-500 text-[9px] font-bold text-right"
                                        textAnchor="end"
                                    >
                                        {val}
                                    </text>
                                </g>
                            );
                        })}
                        <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p: any, idx: number) => (
                            <circle key={idx} cx={p.x} cy={p.y} r="3" className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-[#1a1b23]" strokeWidth="2" />
                        ))}
                    </svg>
                </div>
                <div className="flex justify-between px-6 text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                    {insights.labels.map((label: string, idx: number) => (
                        <span key={idx}>{label}</span>
                    ))}
                </div>
            </div>
        );
    };

    const renderInteractionVolumeChart = () => {
        if (!insights || !insights.postVolume || !insights.commentVolume) return null;
        const posts = insights.postVolume;
        const comments = insights.commentVolume;
        const maxVal = Math.max(...posts, ...comments, 5);
        const minVal = 0;
        const range = maxVal - minVal || 1;
        const width = 500;
        const height = 150;
        const paddingLeft = 30;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 20;
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        const postPoints = posts.map((val: number, i: number) => {
            const x = paddingLeft + (i / (posts.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
            return { x, y, val };
        });

        const commentPoints = comments.map((val: number, i: number) => {
            const x = paddingLeft + (i / (comments.length - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
            return { x, y, val };
        });

        const postLinePath = postPoints.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        const commentLinePath = commentPoints.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

        return (
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Interaction Volume</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Posts & comments activity</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Posts
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Comments
                        </div>
                    </div>
                </div>

                <div className="relative h-36 w-full">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        {[0, 0.5, 1].map((ratio, idx) => {
                            const y = paddingTop + chartHeight * ratio;
                            const val = Math.round(maxVal - ratio * range);
                            return (
                                <g key={idx}>
                                    <line 
                                        x1={paddingLeft} 
                                        y1={y} 
                                        x2={width - paddingRight} 
                                        y2={y} 
                                        className="stroke-gray-100 dark:stroke-gray-800/60" 
                                        strokeWidth="1" 
                                        strokeDasharray="4 4"
                                    />
                                    <text 
                                        x={paddingLeft - 8} 
                                        y={y + 3} 
                                        className="fill-gray-400 dark:fill-gray-500 text-[9px] font-bold text-right"
                                        textAnchor="end"
                                    >
                                        {val}
                                    </text>
                                </g>
                            );
                        })}
                        <path d={postLinePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={commentLinePath} fill="none" stroke="rgb(16, 185, 129)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="flex justify-between px-6 text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                    {insights.labels.map((label: string, idx: number) => (
                        <span key={idx}>{label}</span>
                    ))}
                </div>
            </div>
        );
    };

    const renderDemographics = () => {
        if (!insights || !insights.demographics) return null;
        const { students, teachers, managers } = insights.demographics;
        const total = students + teachers + managers || 1;
        const pctStudents = Math.round((students / total) * 100);
        const pctTeachers = Math.round((teachers / total) * 100);
        const pctManagers = 100 - pctStudents - pctTeachers;

        return (
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Member Demographics</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Distribution of roles</p>
                </div>

                <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-800">
                    {pctStudents > 0 && (
                        <div 
                            style={{ width: `${pctStudents}%` }} 
                            className="bg-indigo-500 h-full" 
                            title={`Students: ${pctStudents}%`}
                        />
                    )}
                    {pctTeachers > 0 && (
                        <div 
                            style={{ width: `${pctTeachers}%` }} 
                            className="bg-emerald-500 h-full" 
                            title={`Teachers: ${pctTeachers}%`}
                        />
                    )}
                    {pctManagers > 0 && (
                        <div 
                            style={{ width: `${pctManagers}%` }} 
                            className="bg-purple-500 h-full" 
                            title={`Managers: ${pctManagers}%`}
                        />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <p className="text-[9px] font-black uppercase text-indigo-500">Students</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{students} ({pctStudents}%)</p>
                    </div>
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <p className="text-[9px] font-black uppercase text-emerald-500">Teachers</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{teachers} ({pctTeachers}%)</p>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                        <p className="text-[9px] font-black uppercase text-purple-500">Admins</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{managers} ({pctManagers}%)</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderTopContributors = () => {
        if (!insights || !insights.topContributors || insights.topContributors.length === 0) return null;
        return (
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Top Contributors</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Most active group members</p>
                </div>

                <div className="space-y-2.5">
                    {insights.topContributors.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white">{c.name}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{c.role}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-xl">
                                {c.count} posts
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ═════════════════════════════════════════════════════════════
    // ADMIN TOOLS NAVIGATION DEFINITION
    // ═════════════════════════════════════════════════════════════
    const adminNavItems = [
        { id: "insights", label: "Overview & Insights", desc: "Growth, engagement, and role distribution", icon: BarChart2 },
        { id: "requests", label: "Member Requests", desc: "Review and approve new students joining", icon: UserCheck, count: requests.length },
        { id: "reports", label: "Reported Content", desc: "Review posts flagged by students and auto-mod", icon: AlertTriangle, count: reports.length, danger: reports.length > 0 },
        { id: "members", label: "Manage Members", desc: "Manage roles, muting, and campus privileges", icon: Users, count: members.length },
        ...((isAdmin || isModerator) ? [{ id: "settings", label: "Group Settings & Rules", desc: "Admin assist, auto-mod keyword filters, and details", icon: Settings }] : []),
        { id: "activity", label: "Activity Log", desc: "Audit log of moderation history and actions", icon: Activity }
    ];

    // ═════════════════════════════════════════════════════════════
    // ACTIVE TOOL CONTENT RENDERER
    // ═════════════════════════════════════════════════════════════
    const renderActiveToolContent = () => {
        return (
            <div className="space-y-6">
                
                {/* 1. OVERVIEW & INSIGHTS */}
                {activeTab === "insights" && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <BarChart2 size={18} className="text-primary" /> Group Overview & Insights
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Track community growth, activity volume, and student engagement
                                </p>
                            </div>

                            {/* Range Selector */}
                            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl self-start sm:self-auto">
                                {[
                                    { label: "28D", days: 28 },
                                    { label: "90D", days: 90 },
                                    { label: "1Y", days: 365 },
                                    { label: "2Y", days: 730 }
                                ].map((tab) => (
                                    <button
                                        key={tab.days}
                                        onClick={() => setInsightsRange(tab.days)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                            insightsRange === tab.days 
                                                ? "bg-primary text-white shadow-xs" 
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingInsights ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="animate-spin text-primary" size={28} />
                                <p className="text-xs font-bold text-gray-400">Loading Insights Data...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderMemberGrowthChart()}
                                    {renderInteractionVolumeChart()}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderDemographics()}
                                    {renderTopContributors()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. MEMBER REQUESTS */}
                {activeTab === "requests" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <UserCheck size={18} className="text-primary" /> Member Join Requests ({requests.length})
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Students awaiting approval to join this campus group
                                </p>
                            </div>
                        </div>

                        {requests.length === 0 ? (
                            <div className="py-20 text-center bg-gray-50/50 dark:bg-white/5 rounded-3xl p-6">
                                <UserCheck size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Pending Requests</h4>
                                <p className="text-xs text-gray-400 mt-1">All membership requests have been reviewed.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map(req => (
                                    <div key={req.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-2xl gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                                        
                                        {/* Clickable Profile Info */}
                                        <Link 
                                            href={`/profile/${req.userId}`}
                                            className="flex items-center gap-3 hover:opacity-85 transition-opacity group cursor-pointer"
                                            title="View student profile"
                                        >
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                                                <SafeAvatar 
                                                    src={req.photoURL} 
                                                    alt={req.displayName} 
                                                    sizeClassName="w-full h-full"
                                                    roundedClassName="rounded-2xl"
                                                    textClassName="text-sm font-black"
                                                    fallbackBg="bg-primary/10"
                                                    fallbackColor="text-primary"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                    <span>{req.displayName}</span>
                                                    <ExternalLink size={12} className="text-gray-400 group-hover:text-primary" />
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    Requested to join · Click to inspect profile
                                                </p>
                                            </div>
                                        </Link>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button
                                                onClick={() => handleRejectRequest(req.userId)}
                                                disabled={isActioning !== null}
                                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                                            >
                                                <XCircle size={14} />
                                                <span>Decline</span>
                                            </button>
                                            <button
                                                onClick={() => handleApproveRequest(req)}
                                                disabled={isActioning !== null}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
                                            >
                                                {isActioning === req.userId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                <span>Approve</span>
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. REPORTED CONTENT */}
                {activeTab === "reports" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-500" /> Member-Reported Content ({reports.length})
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Posts flagged by group members or triggered by campus safety rules
                            </p>
                        </div>

                        {reports.length === 0 ? (
                            <div className="py-20 text-center bg-gray-50/50 dark:bg-white/5 rounded-3xl p-6">
                                <ShieldCheck size={40} className="mx-auto text-emerald-500 mb-3" />
                                <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Clean Community</h4>
                                <p className="text-xs text-gray-400 mt-1">No reported posts or moderation alerts.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map(rep => (
                                    <div key={rep.id} className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-2xl space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-2.5">
                                                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Flag Reason</p>
                                                    <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">{rep.reason}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDismissReport(rep.id)}
                                                    disabled={isActioning !== null}
                                                    className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold rounded-xl transition-all"
                                                >
                                                    Keep Post
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReportedPost(rep.id, rep.postId)}
                                                    disabled={isActioning !== null}
                                                    className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                                                >
                                                    Delete Post
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white dark:bg-[#1a1b23] border border-gray-200/60 dark:border-gray-800 rounded-xl text-xs text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap font-mono">
                                            {`"${rep.postContent}"`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. MANAGE MEMBERS */}
                {activeTab === "members" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Users size={18} className="text-primary" /> Group Members & Roles ({members.length})
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Assign moderator privileges, mute rulebreakers, or remove users
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {members.map(m => {
                                const isSelf = m.userId === user?.uid;
                                const isTargetAdmin = m.role === "admin";
                                const isTargetModerator = m.role === "moderator";
                                const isCurrentlyMuted = m.mutedUntil && m.mutedUntil.toDate().getTime() > Date.now();

                                return (
                                    <div key={m.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-2xl gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                                        
                                        {/* Clickable Member Profile Link */}
                                        <Link 
                                            href={`/profile/${m.userId}`}
                                            className="flex items-center gap-3 hover:opacity-85 transition-opacity group cursor-pointer"
                                            title="View student profile"
                                        >
                                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-200 dark:border-gray-700">
                                                <SafeAvatar 
                                                    src={m.photoURL} 
                                                    alt={m.displayName} 
                                                    sizeClassName="w-full h-full"
                                                    roundedClassName="rounded-2xl"
                                                    textClassName="text-xs font-black"
                                                    fallbackBg="bg-primary/10"
                                                    fallbackColor="text-primary"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                        <span>{m.displayName}</span>
                                                        <ExternalLink size={11} className="text-gray-400 group-hover:text-primary" />
                                                    </p>
                                                    {isSelf && <span className="text-[9px] text-gray-400 font-bold italic">(You)</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                                        {m.role === "admin" ? (
                                                            <span className="text-amber-500 flex items-center gap-0.5"><ShieldAlert size={11} /> Admin</span>
                                                        ) : m.role === "moderator" ? (
                                                            <span className="text-indigo-500 flex items-center gap-0.5"><ShieldCheck size={11} /> Moderator</span>
                                                        ) : (
                                                            <span className="text-gray-400">Member</span>
                                                        )}
                                                    </span>
                                                    {isCurrentlyMuted && (
                                                        <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                            <VolumeX size={10} /> Muted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Action Controls */}
                                        {!isSelf && (
                                            <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                                
                                                {/* Muting Trigger */}
                                                {((isAdmin && !isTargetAdmin) || (isModerator && !isTargetAdmin && !isTargetModerator)) && (
                                                    <div className="relative">
                                                        {isCurrentlyMuted ? (
                                                            <button
                                                                onClick={() => handleUnmuteMember(m)}
                                                                disabled={isActioning !== null}
                                                                className="px-2.5 py-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Volume2 size={14} /> Unmute
                                                            </button>
                                                        ) : mutingUserId === m.userId ? (
                                                            <div className="flex items-center gap-1 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-md">
                                                                {[1, 7, 30].map(days => (
                                                                    <button
                                                                        key={days}
                                                                        onClick={() => handleMuteMember(m, days)}
                                                                        className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-[9px] font-black uppercase"
                                                                    >
                                                                        {days}d
                                                                    </button>
                                                                ))}
                                                                <button 
                                                                    onClick={() => setMutingUserId(null)}
                                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setMutingUserId(m.userId)}
                                                                disabled={isActioning !== null}
                                                                className="px-2.5 py-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                                            >
                                                                <VolumeX size={14} /> Mute
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Promote / Demote */}
                                                {isAdmin && (
                                                    <div className="flex items-center gap-1">
                                                        {isTargetModerator ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleDemoteMember(m)}
                                                                    className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold"
                                                                >
                                                                    Remove Mod
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePromoteToAdmin(m)}
                                                                    className="px-2.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold"
                                                                >
                                                                    Make Admin
                                                                </button>
                                                            </>
                                                        ) : !isTargetAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => handlePromoteMember(m)}
                                                                    className="px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold"
                                                                >
                                                                    Make Mod
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePromoteToAdmin(m)}
                                                                    className="px-2.5 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold"
                                                                >
                                                                    Make Admin
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Ban Member */}
                                                {((isAdmin && !isTargetAdmin) || (isModerator && !isTargetAdmin && !isTargetModerator)) && (
                                                    <button
                                                        onClick={() => setBanningUser(m)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                                        title="Ban Member"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}

                                            </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 5. RULES & SETTINGS */}
                {activeTab === "settings" && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Settings size={18} className="text-primary" /> Group Settings & Admin Assist
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Configure auto-moderation rules, keyword filters, and community details
                                </p>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
                            >
                                {isSavingSettings ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                <span>Save Changes</span>
                            </button>
                        </div>

                        {/* Settings Form Content */}
                        <div className="space-y-6">
                            
                            {/* Group Details */}
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-2">
                                    <Info size={16} className="text-primary" /> Basic Information
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400">Group Name</label>
                                        <input 
                                            type="text"
                                            value={settingsGroupName}
                                            onChange={(e) => setSettingsGroupName(e.target.value)}
                                            className="w-full mt-1 px-3.5 py-2.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400">Description</label>
                                        <textarea 
                                            value={settingsGroupDescription}
                                            onChange={(e) => setSettingsGroupDescription(e.target.value)}
                                            rows={3}
                                            className="w-full mt-1 px-3.5 py-2.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Privacy & Membership */}
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-2">
                                    <Shield size={16} className="text-primary" /> Privacy & Join Approvals
                                </h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: "public", label: "Public", desc: "Anyone can view & join", icon: Globe },
                                            { id: "private", label: "Private", desc: "Only members view posts", icon: Lock },
                                            { id: "secret", label: "Secret", desc: "Hidden & invite only", icon: EyeOff }
                                        ].map(item => {
                                            const Icon = item.icon;
                                            const isSelected = settingsPrivacyType === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSettingsPrivacyType(item.id as any)}
                                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                                        isSelected 
                                                            ? "bg-primary/10 border-primary text-primary" 
                                                            : "bg-white dark:bg-[#1a1b23] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    <Icon size={18} className="mb-1.5" />
                                                    <p className="text-xs font-black uppercase">{item.label}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Require Join Approval Toggle */}
                                    <label className="flex items-center justify-between p-3.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer">
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Require Join Approval</p>
                                            <p className="text-[10px] text-gray-400">Admins must manually approve new students before they can enter</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            checked={settingsJoinApproval}
                                            onChange={(e) => setSettingsJoinApproval(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Admin Assist Auto-Moderation */}
                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles size={16} className="text-primary" /> Admin Assist (Auto-Moderation)
                                </h4>
                                <div className="space-y-3">
                                    
                                    {/* Block links */}
                                    <label className="flex items-center justify-between p-3.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer">
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Block External Web Links</p>
                                            <p className="text-[10px] text-gray-400">Automatically blocks posts containing external URLs to prevent spam</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            checked={settingsBlockLinksEnabled}
                                            onChange={(e) => setSettingsBlockLinksEnabled(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                    </label>

                                    {/* Min words */}
                                    <label className="flex items-center justify-between p-3.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer">
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Enforce Minimum Word Count</p>
                                            <p className="text-[10px] text-gray-400">Prevents low-effort 1-word spam updates (minimum 10 words)</p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            checked={settingsMinWordsEnabled}
                                            onChange={(e) => setSettingsMinWordsEnabled(e.target.checked)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                    </label>

                                    {/* Keyword alerts */}
                                    <div className="p-3.5 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-2xl space-y-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Keyword Auto-Alerts</p>
                                            <p className="text-[10px] text-gray-400">Flag posts containing these words directly to the moderation queue</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text"
                                                value={newKeyword}
                                                onChange={(e) => setNewKeyword(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                                                placeholder="Add word to filter..."
                                                className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                                            />
                                            <button 
                                                onClick={handleAddKeyword}
                                                className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {settingsKeywords.map(kw => (
                                                <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold">
                                                    {kw}
                                                    <button onClick={() => handleRemoveKeyword(kw)} className="text-gray-400 hover:text-red-500">
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* 6. ACTIVITY LOG */}
                {activeTab === "activity" && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <Activity size={18} className="text-primary" /> Group Activity Log ({activityLogs.length})
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Transparent audit history of all leadership and moderation events
                            </p>
                        </div>

                        {activityLogs.length === 0 ? (
                            <div className="py-20 text-center bg-gray-50/50 dark:bg-white/5 rounded-3xl p-6">
                                <Activity size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">No Activity Recorded</h4>
                                <p className="text-xs text-gray-400 mt-1">Moderator actions will appear here in chronological order.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {activityLogs.map((log: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-gray-800 rounded-2xl">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
                                            <Activity size={14} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                                                {log.action}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                By <Link href={`/profile/${log.actorId}`} className="font-bold text-primary hover:underline">{log.actorName || "Admin"}</Link> · {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recently"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        );
    };

    // ═════════════════════════════════════════════════════════════
    // RENDER 0: EMBEDDED WORKSPACE ONLY (WHEN SIDEBAR IS OUTSIDE)
    // ═════════════════════════════════════════════════════════════
    if (embedded && hideSidebar) {
        return (
            <div className="w-full relative space-y-4">
                {/* Ban Dialogue Overlay */}
                {banningUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                            <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                                <AlertTriangle size={18} className="text-red-500" />
                                Ban {banningUser.displayName}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-normal">
                                Are you sure you want to ban this user from the group? They will lose access immediately.
                            </p>
                            <label className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={purgePostsOnBan}
                                    onChange={(e) => setPurgePostsOnBan(e.target.checked)}
                                    className="mt-0.5 border-gray-300 dark:border-gray-700 text-red-500 focus:ring-red-500 rounded"
                                />
                                <div className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-wider">
                                    {"Purge member's post history"}
                                    <p className="text-[9px] text-red-500/80 normal-case font-bold mt-0.5">
                                        Deletes all posts, comments, and polls created by this member inside this group.
                                    </p>
                                </div>
                            </label>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setBanningUser(null);
                                        setPurgePostsOnBan(false);
                                    }}
                                    className="px-3.5 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmBan}
                                    className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                    Ban & Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Back to Community Home breadcrumb button */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBackToHome || onClose}
                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors py-2 px-3.5 rounded-xl bg-primary/10 hover:bg-primary/15"
                    >
                        <ArrowLeft size={15} />
                        <span>Back to Community Home</span>
                    </button>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                        Admin Workspace
                    </span>
                </div>

                <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm min-h-[600px]">
                    {renderActiveToolContent()}
                </div>
            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════
    // RENDER 1: EMBEDDED FACEBOOK-STYLE FULL MANAGEMENT DASHBOARD
    // ═════════════════════════════════════════════════════════════
    if (embedded) {
        return (
            <div className="w-full space-y-4">
                
                {/* Mobile Manage Header with Back Navigation */}
                <div className="lg:hidden bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                    <button
                        onClick={() => {
                            if (mobileToolOpen) {
                                setMobileToolOpen(false);
                            } else if (onBackToHome) {
                                onBackToHome();
                            } else {
                                onClose();
                            }
                        }}
                        className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary"
                    >
                        <ArrowLeft size={16} />
                        <span>{mobileToolOpen ? "Back to Admin Tools" : "Community Home"}</span>
                    </button>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                        Group Manage
                    </span>
                </div>

                {/* Main 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Sidebar (Desktop: Sticky, Mobile: Toggleable Hub) */}
                    <div className={`lg:col-span-3 space-y-4 lg:sticky lg:top-24 ${mobileToolOpen ? "hidden lg:block" : "block"}`}>
                        
                        {/* Group Mini Header Card */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-200 dark:border-gray-700">
                                    {group?.coverUrl ? (
                                        <img src={group.coverUrl} alt={groupName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-sm text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                                            {groupName.slice(0, 2)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate" title={groupName}>
                                        {groupName}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                        {group?.privacyType || "Group"} · {members.length} members
                                    </p>
                                </div>
                            </div>

                            {/* Return to Community Feed Button */}
                            <button
                                onClick={onBackToHome || onClose}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                <Home size={14} />
                                <span>Community Home</span>
                            </button>
                        </div>

                        {/* Admin Tools Navigation List */}
                        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-3 shadow-sm space-y-1">
                            <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                Admin Tools
                            </p>

                            {adminNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id as any);
                                            setMobileToolOpen(true);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                            isActive 
                                                ? "bg-primary text-white shadow-md shadow-primary/20 font-black" 
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                                            <span>{item.label}</span>
                                        </div>
                                        {typeof item.count === "number" && item.count > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                                isActive 
                                                    ? "bg-white/20 text-white" 
                                                    : item.danger ? "bg-red-500 text-white" : "bg-primary/10 text-primary"
                                            }`}>
                                                {item.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                    </div>

                    {/* Right Workspace Canvas */}
                    <div className={`lg:col-span-9 bg-white dark:bg-[#1a1b23] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm min-h-[600px] relative ${!mobileToolOpen ? "hidden lg:block" : "block"}`}>
                        
                        {/* Ban Dialogue Overlay */}
                        {banningUser && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-3xl">
                                <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                                    <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <AlertTriangle size={18} className="text-red-500" />
                                        Ban {banningUser.displayName}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-normal">
                                        Are you sure you want to ban this user from the group? They will lose access immediately.
                                    </p>
                                    <label className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={purgePostsOnBan}
                                            onChange={(e) => setPurgePostsOnBan(e.target.checked)}
                                            className="mt-0.5 border-gray-300 dark:border-gray-700 text-red-500 focus:ring-red-500 rounded"
                                        />
                                        <div className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-wider">
                                            {"Purge member's post history"}
                                            <p className="text-[9px] text-red-500/80 normal-case font-bold mt-0.5">
                                                Deletes all posts, comments, and polls created by this member inside this group.
                                            </p>
                                        </div>
                                    </label>
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setBanningUser(null);
                                                setPurgePostsOnBan(false);
                                            }}
                                            className="px-3.5 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmBan}
                                            className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Ban & Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {renderActiveToolContent()}

                    </div>

                </div>

            </div>
        );
    }

    // ═════════════════════════════════════════════════════════════
    // RENDER 2: FALLBACK MODAL MODE
    // ═════════════════════════════════════════════════════════════
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={onClose} />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col h-[85vh] z-10"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-500">
                                <Shield size={18} className="stroke-[2.5]" />
                                <h2 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                                    Group Moderation: {groupName}
                                </h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 px-4 bg-gray-50/20 dark:bg-black/5 no-scrollbar">
                            {adminNavItems.map(tab => {
                                const TabIcon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                                            isActive 
                                                ? "border-primary text-primary" 
                                                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        }`}
                                    >
                                        <TabIcon size={14} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative">
                            {renderActiveToolContent()}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
