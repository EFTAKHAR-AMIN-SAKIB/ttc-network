"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, Shield, Users, AlertTriangle, Check, XCircle, 
    UserCheck, UserMinus, ShieldAlert, ShieldCheck, Loader2,
    BarChart2, FileText, Settings, VolumeX, Volume2, Trash2, 
    Plus, HelpCircle, Activity, Info
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

interface GroupModerationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    currentUserRole: "admin" | "moderator" | null;
}

export default function GroupModerationPanel({ isOpen, onClose, groupId, groupName, currentUserRole }: GroupModerationPanelProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm, setIsLoading, close } = useConfirm();

    // Tabs state
    const [activeTab, setActiveTab] = useState<"requests" | "reports" | "members" | "settings" | "insights" | "activity">("requests");
    
    // Subscribed data state
    const [requests, setRequests] = useState<GroupRequest[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [group, setGroup] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    
    // Insights state
    const [insights, setInsights] = useState<any>(null);
    const [insightsRange, setInsightsRange] = useState<number>(28); // 28, 90, 365, 730 days
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
        if (!isOpen) return;

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
    }, [isOpen, groupId]);

    // Lazy load / subscribe to activity logs when tab active
    useEffect(() => {
        if (activeTab === "activity" && isOpen) {
            const unsub = subscribeGroupActivityLog(groupId, (logs) => {
                setActivityLogs(logs);
            });
            return () => unsub();
        }
    }, [activeTab, groupId, isOpen]);

    // Lazy load insights when range changes or tab is active
    useEffect(() => {
        if (activeTab === "insights" && isOpen) {
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
    }, [activeTab, insightsRange, groupId, isOpen]);

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
            showToast(`${m.displayName} promoted to Admin`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to promote member to admin", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const handleDemoteMember = async (m: GroupMember) => {
        setIsActioning(m.userId);
        try {
            await updateGroupMemberRole(groupId, m.userId, "member");
            showToast(`${m.displayName} demoted to Member`, "info");
        } catch (err) {
            console.error(err);
            showToast("Failed to demote member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    // Advanced Mute Controls
    const handleMuteMember = async (m: GroupMember, days: number) => {
        setIsActioning(m.userId);
        setMutingUserId(null);
        try {
            await muteGroupMember(groupId, m.userId, days, m.displayName);
            showToast(`Muted ${m.displayName} for ${days} day(s)`, "success");
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
            showToast(`${m.displayName} has been unmuted`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to unmute member", "error");
        } finally {
            setIsActioning(null);
        }
    };

    const getMutedDurationRemaining = (m: GroupMember) => {
        if (!m.mutedUntil) return null;
        const date = typeof m.mutedUntil.toDate === "function" 
            ? m.mutedUntil.toDate() 
            : new Date(m.mutedUntil);
        const diffMs = date.getTime() - Date.now();
        if (diffMs <= 0) return null;

        const diffMins = Math.ceil(diffMs / (1000 * 60));
        if (diffMins < 60) return `${diffMins}m remaining`;
        const diffHours = Math.ceil(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h remaining`;
        const diffDays = Math.ceil(diffHours / 24);
        return `${diffDays}d remaining`;
    };

    // Advanced Ban + Purge Confirm
    const handleConfirmBan = async () => {
        if (!banningUser) return;
        const m = banningUser;
        setBanningUser(null);
        setIsActioning(m.userId);
        setIsLoading(true);
        try {
            await banGroupMemberWithPurge(groupId, m.userId, m.displayName, purgePostsOnBan);
            showToast(`${m.displayName} has been removed & banned`, "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to ban member", "error");
        } finally {
            close();
            setIsActioning(null);
            setPurgePostsOnBan(false);
        }
    };
    // Save settings & admin assist rules
    const handleSaveSettings = async () => {
        if (!settingsGroupName.trim()) {
            showToast("Group name cannot be empty", "error");
            return;
        }
        setIsSavingSettings(true);
        try {
            let finalCoverUrl = group?.coverUrl || "";
            if (settingsCoverFile) {
                finalCoverUrl = await uploadFile("group-covers", settingsCoverFile);
            }

            await updateGroupSettings(groupId, {
                name: settingsGroupName.trim(),
                description: settingsGroupDescription.trim(),
                coverUrl: finalCoverUrl,
                joinApprovalRequired: settingsJoinApproval,
                adminAssistRules: {
                    minWordsEnabled: settingsMinWordsEnabled,
                    minWordsCount: Number(settingsMinWordsCount),
                    blockLinksEnabled: settingsBlockLinksEnabled,
                    blockNewMembersEnabled: settingsBlockNewMembersEnabled,
                    newMemberHours: Number(settingsNewMemberHours)
                },
                keywordAlerts: settingsKeywords
            });
            showToast("Group details and settings updated!", "success");
            setSettingsCoverFile(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to update settings", "error");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleDeleteGroupSubmit = async () => {
        if (deleteConfirmText.trim().toLowerCase() !== "confirm") return;
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
        const fillPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

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
                        <path d={fillPath} fill="url(#growthGrad)" />
                        <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p: any, idx: number) => (
                            <circle 
                                key={idx}
                                cx={p.x} 
                                cy={p.y} 
                                r="3.5" 
                                className="fill-white dark:fill-[#1a1b23] stroke-indigo-500" 
                                strokeWidth="2" 
                            />
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

    const renderActivityVolumeChart = () => {
        if (!insights || !insights.postVolume || insights.postVolume.length === 0) return null;
        const posts = insights.postVolume;
        const comments = insights.commentVolume;
        const maxVal = Math.max(...posts, ...comments, 5);
        const minVal = 0;
        const range = maxVal - minVal;
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
                            className="bg-amber-500 h-full" 
                            title={`Managers: ${pctManagers}%`}
                        />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Students</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{students}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{pctStudents}%</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Teachers</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{teachers}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{pctTeachers}%</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-500">Admins/Mods</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{managers}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{pctManagers}%</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderTopContributors = () => {
        if (!insights || !insights.topContributors) return null;
        return (
            <div className="bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Top Contributors</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Most active group members</p>
                </div>
                <div className="space-y-3">
                    {insights.topContributors.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl">
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
                        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-black/10 flex items-center justify-between">
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
                        <div className="flex overflow-x-auto border-b border-gray-50 dark:border-gray-800/50 px-4 bg-gray-50/20 dark:bg-black/5 no-scrollbar scrollbar-none">
                            {[
                                { id: "requests", label: `Requests (${requests.length})`, icon: UserCheck },
                                { id: "reports", label: `Reports (${reports.length})`, icon: AlertTriangle },
                                { id: "members", label: `Members (${members.length})`, icon: Users },
                                ...((isAdmin || isModerator) ? [{ id: "settings", label: "Rules & Settings", icon: Settings }] : []),
                                { id: "insights", label: "Insights", icon: BarChart2 },
                                { id: "activity", label: "Activity Log", icon: Activity }
                            ].map(tab => {
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
                            
                            {/* Custom Group Delete Dialogue Overlay */}
                            {isDeletingGroup && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-b-3xl">
                                    <div className="bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                                        <div className="flex items-center gap-2 text-red-500">
                                            <AlertTriangle size={20} className="stroke-[2.5]" />
                                            <h3 className="text-sm font-black uppercase tracking-tight">Delete Group: {groupName}</h3>
                                        </div>
                                        
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                                            <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">Warning: This action is irreversible</p>
                                            <p className="text-xs text-red-500/90 font-semibold leading-normal normal-case">
                                                Deleting this group will immediately and permanently erase all members, posts, polls, reactions, comments, reports, and activity logs from the server.
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                Type <span className="text-gray-900 dark:text-white font-bold">confirm</span> to confirm deletion:
                                            </p>
                                            <input 
                                                type="text" 
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder="Type confirm..."
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-red-500 text-gray-800 dark:text-gray-200"
                                            />
                                        </div>
                                        
                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    setIsDeletingGroup(false);
                                                    setDeleteConfirmText("");
                                                }}
                                                className="px-3.5 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteGroupSubmit}
                                                disabled={deleteConfirmText.trim().toLowerCase() !== "confirm" || isActioning !== null}
                                                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-white ${
                                                    deleteConfirmText.trim().toLowerCase() === "confirm" 
                                                        ? "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20" 
                                                        : "bg-red-500/40 cursor-not-allowed"
                                                }`}
                                            >
                                                {isActioning === "deleting_group" ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    "Permanently Delete Group"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Ban Dialogue Overlay */}
                            {banningUser && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-b-3xl">
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

                            {loading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="animate-spin text-primary" size={28} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    
                                    {/* REQUESTS TAB */}
                                    {activeTab === "requests" && (
                                        requests.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase text-center py-8">
                                                No pending join requests
                                            </p>
                                        ) : (
                                            requests.map(req => (
                                                <div key={req.userId} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl animate-fade-in">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 dark:border-gray-800">
                                                            {req.photoURL ? (
                                                                <img src={req.photoURL} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                                    {req.displayName[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{req.displayName}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Requested to join</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleRejectRequest(req.userId)}
                                                            disabled={isActioning !== null}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                                            title="Decline"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveRequest(req)}
                                                            disabled={isActioning !== null}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}

                                    {/* REPORTS TAB */}
                                    {activeTab === "reports" && (
                                        reports.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase text-center py-8">
                                                No reported posts or alerts
                                            </p>
                                        ) : (
                                            reports.map(rep => (
                                                <div key={rep.id} className="p-4 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-3 animate-fade-in">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-2.5">
                                                            <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Flag Type / Reason</p>
                                                                <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">{rep.reason}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => handleDismissReport(rep.id)}
                                                                disabled={isActioning !== null}
                                                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                                                            >
                                                                Keep Post
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteReportedPost(rep.id, rep.postId)}
                                                                disabled={isActioning !== null}
                                                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                                                            >
                                                                Delete Post
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 rounded-xl text-xs text-gray-700 dark:text-gray-300 italic max-h-24 overflow-y-auto whitespace-pre-wrap">
                                                        {`"${rep.postContent}"`}
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}

                                    {/* MEMBERS TAB */}
                                    {activeTab === "members" && (
                                        members.map(m => {
                                            const isSelf = m.userId === user?.uid;
                                            const isTargetAdmin = m.role === "admin";
                                            const isTargetModerator = m.role === "moderator";
                                            
                                            const remainingMuteTime = getMutedDurationRemaining(m);
                                            const isCurrentlyMuted = !!remainingMuteTime;

                                            return (
                                                <div key={m.userId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 dark:border-gray-800 shrink-0">
                                                            {m.photoURL ? (
                                                                <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                                    {m.displayName[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                    {m.displayName}
                                                                </p>
                                                                {isSelf && <span className="text-[9px] text-gray-400 font-bold normal-case italic">(You)</span>}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                    {m.role === "admin" ? (
                                                                        <span className="text-amber-500 flex items-center gap-0.5"><ShieldAlert size={10} /> Admin</span>
                                                                    ) : m.role === "moderator" ? (
                                                                        <span className="text-indigo-500 flex items-center gap-0.5"><ShieldCheck size={10} /> Moderator</span>
                                                                    ) : (
                                                                        "Member"
                                                                    )}
                                                                </span>
                                                                
                                                                {isCurrentlyMuted && (
                                                                    <span className="text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                                        <VolumeX size={9} /> {remainingMuteTime}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions Row */}
                                                    {!isSelf && (
                                                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                                                            {/* Muting Trigger select / controls */}
                                                            {((isAdmin && !isTargetAdmin) || (isModerator && !isTargetAdmin && !isTargetModerator)) && (
                                                                <div className="relative">
                                                                    {isCurrentlyMuted ? (
                                                                        <button
                                                                            onClick={() => handleUnmuteMember(m)}
                                                                            disabled={isActioning !== null}
                                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                                                                            title="Unmute Member"
                                                                        >
                                                                            <Volume2 size={15} /> <span className="sm:hidden">Unmute</span>
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
                                                                                <X size={10} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setMutingUserId(m.userId)}
                                                                            disabled={isActioning !== null}
                                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                                                                            title="Mute Member"
                                                                        >
                                                                            <VolumeX size={15} /> <span className="sm:hidden">Mute</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Promote / Demote (Admins Only) */}
                                                            {isAdmin && (
                                                                <div className="flex items-center gap-1">
                                                                    {isTargetModerator ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleDemoteMember(m)}
                                                                                disabled={isActioning !== null}
                                                                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors"
                                                                                title="Demote to Member"
                                                                            >
                                                                                <UserMinus size={15} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handlePromoteToAdmin(m)}
                                                                                disabled={isActioning !== null}
                                                                                className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl transition-colors"
                                                                                title="Promote to Admin"
                                                                            >
                                                                                <ShieldCheck size={15} />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        !isTargetAdmin && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handlePromoteMember(m)}
                                                                                    disabled={isActioning !== null}
                                                                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors"
                                                                                    title="Promote to Moderator"
                                                                                >
                                                                                    <UserCheck size={15} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handlePromoteToAdmin(m)}
                                                                                    disabled={isActioning !== null}
                                                                                    className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl transition-colors"
                                                                                    title="Promote to Admin"
                                                                                >
                                                                                    <ShieldCheck size={15} />
                                                                                </button>
                                                                            </>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Ban/Remove Trigger (Custom Overlay) */}
                                                            {((isAdmin && !isTargetAdmin) || (isModerator && !isTargetAdmin && !isTargetModerator)) && (
                                                                <button
                                                                    onClick={() => setBanningUser(m)}
                                                                    disabled={isActioning !== null}
                                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                                                    title="Ban Member"
                                                                >
                                                                    <XCircle size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* SETTINGS / RULES TAB */}
                                    {activeTab === "settings" && (
                                        <div className="space-y-6 animate-fade-in">
                                            
                                            {/* Group Identity Settings */}
                                            <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <Info size={15} className="text-primary" /> Group Identity Settings
                                                </h3>
                                                
                                                <div className="space-y-3">
                                                    {/* Group Name */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Group Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={settingsGroupName}
                                                            onChange={(e) => setSettingsGroupName(e.target.value)}
                                                            placeholder="Enter group name..."
                                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-1 focus:ring-primary outline-none text-gray-800 dark:text-gray-200"
                                                        />
                                                    </div>

                                                    {/* Group Description */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Group Description</label>
                                                        <textarea 
                                                            value={settingsGroupDescription}
                                                            onChange={(e) => setSettingsGroupDescription(e.target.value)}
                                                            placeholder="Enter group description..."
                                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:ring-1 focus:ring-primary outline-none h-24 resize-none text-gray-800 dark:text-gray-200"
                                                        />
                                                    </div>

                                                    {/* Cover Photo */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Cover Photo</label>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-24 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative border border-gray-100 dark:border-gray-800 shrink-0">
                                                                {settingsCoverPreview ? (
                                                                    <img src={settingsCoverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase text-gray-400">No Photo</div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 space-y-1.5">
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*"
                                                                    id="settings-cover-file"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        if (file.size > 5 * 1024 * 1024) {
                                                                            showToast("Cover image must be under 5MB", "error");
                                                                            return;
                                                                        }
                                                                        setSettingsCoverFile(file);
                                                                        setSettingsCoverPreview(URL.createObjectURL(file));
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <label 
                                                                    htmlFor="settings-cover-file"
                                                                    className="inline-flex px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                                                                >
                                                                    Choose New Photo
                                                                </label>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase">PNG, JPG or WEBP up to 5MB</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <>
                                                    {/* General Rules Toggle */}
                                                    <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                                            <Shield size={15} className="text-primary" /> General Group Settings
                                                        </h3>
                                                        
                                                        <label className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl cursor-pointer">
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Require Admin Approval</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Approve requests before joining</p>
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={settingsJoinApproval}
                                                                onChange={(e) => setSettingsJoinApproval(e.target.checked)}
                                                                className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full checked:bg-primary appearance-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* Admin Assist Toggles */}
                                                    <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <Settings size={15} className="text-indigo-500" />
                                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Admin Assist Auto-Moderation</h3>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Automated moderation rules for posts inside this group.</p>
                                                        
                                                        <div className="space-y-3">
                                                            {/* Rule 1: Min Word Count */}
                                                            <div className="p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl space-y-3">
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Minimum Word Count</p>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Decline short posts automatically</p>
                                                                    </div>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={settingsMinWordsEnabled}
                                                                        onChange={(e) => setSettingsMinWordsEnabled(e.target.checked)}
                                                                        className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full checked:bg-primary appearance-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                                                                    />
                                                                </label>
                                                                {settingsMinWordsEnabled && (
                                                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Limit:</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={settingsMinWordsCount}
                                                                            onChange={(e) => setSettingsMinWordsCount(Number(e.target.value))}
                                                                            className="w-20 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs font-black"
                                                                            min="1"
                                                                        />
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">words</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Rule 2: Block Links */}
                                                            <label className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl cursor-pointer">
                                                                <div>
                                                                    <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Block Links</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Reject posts containing URLs</p>
                                                                </div>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={settingsBlockLinksEnabled}
                                                                    onChange={(e) => setSettingsBlockLinksEnabled(e.target.checked)}
                                                                    className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full checked:bg-primary appearance-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                                                                />
                                                            </label>

                                                            {/* Rule 3: Block New Members */}
                                                            <div className="p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl space-y-3">
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Restrict New Members</p>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Restrict posting for fresh members</p>
                                                                    </div>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={settingsBlockNewMembersEnabled}
                                                                        onChange={(e) => setSettingsBlockNewMembersEnabled(e.target.checked)}
                                                                        className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full checked:bg-primary appearance-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform"
                                                                    />
                                                                </label>
                                                                {settingsBlockNewMembersEnabled && (
                                                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Restrict for first:</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={settingsNewMemberHours}
                                                                            onChange={(e) => setSettingsNewMemberHours(Number(e.target.value))}
                                                                            className="w-20 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1 text-xs font-black"
                                                                            min="1"
                                                                        />
                                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">hours after joining</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Keyword Alerts config */}
                                                    <div className="bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 space-y-4">
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                                                            <AlertTriangle size={15} className="text-amber-500" /> Admin Custom Keyword Alerts
                                                        </h3>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Posts matching these words will be flagged automatically to reports queue.</p>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="text"
                                                                value={newKeyword}
                                                                onChange={(e) => setNewKeyword(e.target.value)}
                                                                placeholder="Add custom keyword (e.g. exam, leaking)..."
                                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                                                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                                                            />
                                                            <button
                                                                onClick={handleAddKeyword}
                                                                className="px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                                                            >
                                                                <Plus size={14} /> Add
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                                            {settingsKeywords.length === 0 ? (
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">No custom keywords configured</span>
                                                            ) : (
                                                                settingsKeywords.map(kw => (
                                                                    <span 
                                                                        key={kw} 
                                                                        className="px-2.5 py-1 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-[10px] font-bold flex items-center gap-1.5"
                                                                    >
                                                                        {kw}
                                                                        <button 
                                                                            onClick={() => handleRemoveKeyword(kw)}
                                                                            className="text-red-500 hover:text-red-600 transition-colors"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Danger Zone */}
                                                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-5 space-y-4 mt-6">
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                                                            <AlertTriangle size={15} /> Danger Zone
                                                        </h3>
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-black uppercase text-gray-800 dark:text-gray-200">Delete this group</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase leading-normal normal-case">
                                                                    Permanently delete this group and all its associated data. This action is irreversible.
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setIsDeletingGroup(true);
                                                                    setDeleteConfirmText("");
                                                                }}
                                                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shrink-0"
                                                            >
                                                                Delete Group
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Action save bar */}
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={handleSaveSettings}
                                                    disabled={isSavingSettings}
                                                    className="px-6 py-3.5 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    {isSavingSettings ? (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin" /> Saving...
                                                        </>
                                                    ) : (
                                                        "Save Moderation Settings"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* INSIGHTS TAB */}
                                    {activeTab === "insights" && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Range filter selector */}
                                            <div className="flex justify-between items-center bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Insights Range</span>
                                                <div className="flex gap-1.5">
                                                    {[
                                                        { label: "28D", val: 28 },
                                                        { label: "90D", val: 90 },
                                                        { label: "1Y", val: 365 },
                                                        { label: "2Y", val: 730 }
                                                    ].map(r => (
                                                        <button
                                                            key={r.val}
                                                            onClick={() => setInsightsRange(r.val)}
                                                            className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                                                insightsRange === r.val 
                                                                    ? "bg-primary text-white border-primary" 
                                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                                                            }`}
                                                        >
                                                            {r.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {loadingInsights ? (
                                                <div className="py-20 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-primary" size={24} />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="md:col-span-2">
                                                        {renderMemberGrowthChart()}
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        {renderActivityVolumeChart()}
                                                    </div>
                                                    
                                                    {renderDemographics()}
                                                    {renderTopContributors()}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIVITY LOG TAB */}
                                    {activeTab === "activity" && (
                                        activityLogs.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase text-center py-8">
                                                No activity logged for this group
                                            </p>
                                        ) : (
                                            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin animate-fade-in">
                                                {activityLogs.map(log => (
                                                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/10 text-indigo-500 shrink-0">
                                                            <Activity size={14} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap leading-none">
                                                                {log.actionByName}
                                                                <span className="text-[8px] font-bold text-indigo-500 px-1.5 py-0.5 bg-indigo-500/10 rounded-full">{log.actionType}</span>
                                                            </p>
                                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{log.details}</p>
                                                            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">
                                                                {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : new Date(log.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}

                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
