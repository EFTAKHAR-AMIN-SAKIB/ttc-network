"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Award,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Users,
    GraduationCap,
    Check,
    X,
    Search,
    Filter,
    ExternalLink,
    Eye,
    Phone,
    Mail,
    Linkedin,
    Globe,
    FileText,
    Calendar,
    ChevronDown,
    Loader2,
    MessageSquare,
    AlertTriangle,
    UserCheck,
    UserX,
    RotateCcw,
    Sparkles,
    Quote,
    ChevronRight,
    XCircle,
    Send,
    Bell,
    AtSign,
} from "lucide-react";
import { colleges } from "@/data/colleges";
import {
    getAllCampusManagerApplications,
    updateCampusManagerApplicationStatus,
    getActiveCampusManagers,
    revokeCampusManagerRole,
    getCampusManagerStats,
    type CampusManagerApplication,
    type FirestoreUser,
} from "@/lib/firestore";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { type UserProfile } from "@/contexts/AuthContext";

export default function CampusManagersTab({ profile }: { profile: UserProfile }) {
    const { showToast } = useToast();
    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    // Data states
    const [applications, setApplications] = useState<(CampusManagerApplication & { id: string })[]>([]);
    const [activeManagers, setActiveManagers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [stats, setStats] = useState({
        totalApplications: 0,
        pendingCount: 0,
        underReviewCount: 0,
        approvedCount: 0,
        activeManagersCount: 0,
    });
    const [loading, setLoading] = useState(true);

    // Filtering & View states
    const [viewMode, setViewMode] = useState<"applications" | "managers" | "coverage">("applications");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal state for Candidate Dossier Review
    const [selectedApp, setSelectedApp] = useState<(CampusManagerApplication & { id: string }) | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [processingAction, setProcessingAction] = useState(false);
    const [confirmingStatus, setConfirmingStatus] = useState<"approved" | "rejected" | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Preset feedback templates for speedy admin review
    const FEEDBACK_PRESETS = [
        "🎉 Congratulations! Your application has been approved. Welcome to the TTC Network Campus Manager team!",
        "🔍 Your application is currently under review by our central vetting committee. We are confirming credentials.",
        "📸 Please re-upload a clear, readable photo of your official Student ID card or college enrollment document.",
        "ℹ️ Thank you for applying. Currently, all 5 Campus Manager slots for your campus are occupied for this term.",
    ];

    // Load applications and managers
    const loadData = async () => {
        setLoading(true);
        try {
            const [allApps, managers, statsData] = await Promise.all([
                getAllCampusManagerApplications(),
                getActiveCampusManagers(),
                getCampusManagerStats(),
            ]);

            setApplications(allApps);
            setActiveManagers(managers);
            setStats(statsData);
        } catch (err) {
            console.error("Failed to load campus manager data:", err);
            showToast("Failed to load campus manager data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtered Applications
    const filteredApplications = useMemo(() => {
        return applications.filter((app) => {
            const matchCollege = selectedCollegeFilter === "all" || app.collegeId === selectedCollegeFilter;
            const matchStatus = statusFilter === "all" || app.status === statusFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchSearch =
                !q ||
                (app.applicantName || "").toLowerCase().includes(q) ||
                (app.applicantEmail || "").toLowerCase().includes(q) ||
                (app.studentId || "").toLowerCase().includes(q) ||
                (app.collegeName || "").toLowerCase().includes(q) ||
                (app.whatsappNumber || app.applicantPhone || "").includes(q);

            return matchCollege && matchStatus && matchSearch;
        });
    }, [applications, selectedCollegeFilter, statusFilter, searchQuery]);

    // Handle Open Dossier Modal
    const handleOpenDossier = (app: CampusManagerApplication & { id: string }) => {
        setSelectedApp(app);
        setAdminNotes(app.adminNotes || "");
        setFeedbackMessage(app.feedbackMessage || "");
        setConfirmingStatus(null);
    };

    // Handle Status Change (Approve / Reject / Under Review)
    const handleStatusUpdate = async (newStatus: "approved" | "rejected" | "under_review") => {
        if (!selectedApp) return;

        setProcessingAction(true);
        try {
            await updateCampusManagerApplicationStatus(
                selectedApp.id,
                newStatus,
                adminNotes.trim() || undefined,
                feedbackMessage.trim() || undefined
            );

            showToast(
                newStatus === "approved"
                    ? `🎉 ${selectedApp.applicantName} has been approved as Campus Manager!`
                    : newStatus === "rejected"
                    ? `Application rejected. Feedback sent to ${selectedApp.applicantName}.`
                    : `Application marked as Under Review.`,
                "success"
            );

            setSelectedApp(null);
            setConfirmingStatus(null);
            await loadData();
        } catch (err: any) {
            console.error("Action failed:", err);
            showToast(err.message || "Failed to update application status.", "error");
        } finally {
            setProcessingAction(false);
        }
    };

    // Handle Revoke Role
    const handleRevokeRole = async (user: FirestoreUser & { id: string }) => {
        const confirmed = await confirm({
            title: `Revoke Campus Manager Role?`,
            message: `Are you sure you want to revoke the Campus Manager role from ${user.displayName}? Their role will be reverted to "student".`,
            variant: "danger",
        });

        if (!confirmed) return;

        setConfirmLoading(true);
        try {
            await revokeCampusManagerRole(user.id, "Administrative reorganization");
            showToast(`Role revoked for ${user.displayName}.`, "success");
            await loadData();
        } catch (err: any) {
            showToast(err.message || "Failed to revoke role.", "error");
        } finally {
            closeConfirm();
        }
    };

    // Calculate College Coverage Metrics
    const collegeCoverageList = useMemo(() => {
        return colleges.map((c) => {
            const managers = activeManagers.filter((m) => m.collegeId === c.id);
            const pendingApps = applications.filter((a) => a.collegeId === c.id && a.status === "pending");
            return {
                ...c,
                managers,
                hasManager: managers.length > 0,
                pendingAppsCount: pendingApps.length,
            };
        });
    }, [activeManagers, applications]);

    const vacantCollegesCount = collegeCoverageList.filter((c) => !c.hasManager).length;

    // Helper for formatting program name
    const formatProgram = (prog: string) => {
        if (prog === "BEdHonours") return "B.Ed (Honours)";
        if (prog === "MEd") return "M.Ed";
        return prog || "N/A";
    };

    return (
        <div className="space-y-6">
            {/* ─── TOP EXECUTIVE SUMMARY STATS ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs space-y-1 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Pending Reviews</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock size={16} className="text-amber-500" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-500">{stats.pendingCount}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Awaiting administrator vetting</span>
                    {stats.pendingCount > 0 && (
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500 animate-ping mr-3 mt-3" />
                    )}
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Active Managers</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Award size={16} className="text-emerald-500" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-500">{activeManagers.length}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Across all 15 colleges</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Vacant Campuses</span>
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Building2 size={16} className="text-rose-500" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-500">{vacantCollegesCount} / 15</div>
                    <span className="text-[11px] text-gray-400 font-medium">Campuses needing managers</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Total Submissions</span>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText size={16} className="text-primary" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stats.totalApplications}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Lifetime candidates applied</span>
                </div>
            </div>

            {/* ─── TAB VIEW SELECTOR & ACTIONS ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#161722] p-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setViewMode("applications")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            viewMode === "applications"
                                ? "bg-primary text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                    >
                        <FileText size={14} />
                        <span>Applications Queue</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            viewMode === "applications" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        }`}>
                            {applications.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode("coverage")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            viewMode === "coverage"
                                ? "bg-primary text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                    >
                        <Building2 size={14} />
                        <span>15 TTCs Coverage Matrix</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            viewMode === "coverage" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        }`}>
                            {15 - vacantCollegesCount}/15
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode("managers")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            viewMode === "managers"
                                ? "bg-primary text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                    >
                        <Users size={14} />
                        <span>Active Managers</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            viewMode === "managers" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        }`}>
                            {activeManagers.length}
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/campus-manager"
                        target="_blank"
                        className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-primary/50 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
                    >
                        <ExternalLink size={13} /> Public Recruitment Portal
                    </Link>
                </div>
            </div>

            {/* ─── VIEW 1: APPLICATIONS QUEUE ─── */}
            {viewMode === "applications" && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, phone, or campus..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* College Filter */}
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedCollegeFilter}
                                onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            >
                                <option value="all">All 15 Colleges</option>
                                {colleges.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.shortName}
                                    </option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">🟡 Pending</option>
                                <option value="under_review">🔵 Under Review</option>
                                <option value="approved">🟢 Approved</option>
                                <option value="rejected">🔴 Rejected</option>
                            </select>

                            {(selectedCollegeFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                                <button
                                    onClick={() => {
                                        setSelectedCollegeFilter("all");
                                        setStatusFilter("all");
                                        setSearchQuery("");
                                    }}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-white/5 flex items-center gap-1 shrink-0"
                                    title="Reset all filters"
                                >
                                    <RotateCcw size={13} />
                                    <span className="hidden sm:inline">Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Applications Table / Cards */}
                    {loading ? (
                        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5">
                            <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400">Loading candidate applications...</p>
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 space-y-2">
                            <FileText size={32} className="text-gray-300 dark:text-gray-600 mx-auto" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No applications found</p>
                            <p className="text-xs text-gray-400">Try adjusting your filters or search keywords.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredApplications.map((app) => {
                                const cleanPhone = (app.whatsappNumber || app.applicantPhone || "").replace(/\D/g, "");
                                return (
                                    <div
                                        key={app.id}
                                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        {/* Candidate Info */}
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                                                {app.applicantPhoto ? (
                                                    <Image src={app.applicantPhoto} alt={app.applicantName} width={48} height={48} className="object-cover w-full h-full" />
                                                ) : (
                                                    app.applicantName.slice(0, 2).toUpperCase()
                                                )}
                                            </div>

                                            <div className="space-y-1.5 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {app.applicantName}
                                                    </h4>
                                                    {app.applicantUsername && (
                                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono flex items-center gap-0.5 border border-primary/20">
                                                            <AtSign size={10} />
                                                            {app.applicantUsername}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                                                        {app.collegeName}
                                                    </span>
                                                    {app.isClassRepresentative && (
                                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                            <UserCheck size={11} /> Class Rep (CR)
                                                        </span>
                                                    )}
                                                    {app.studentIdCardUrl && (
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                            <FileText size={11} /> ID Attached
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                                                    <span>Program: <strong className="text-gray-700 dark:text-gray-300">{formatProgram(app.program)}</strong></span>
                                                    <span>{app.currentYearSemester}</span>
                                                    {cleanPhone && (
                                                        <a
                                                            href={`https://wa.me/${cleanPhone}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <Phone size={11} />
                                                            <span>{app.whatsappNumber || app.applicantPhone}</span>
                                                        </a>
                                                    )}
                                                    <span className="text-gray-400 text-[11px]">
                                                        {app.createdAt ? new Date((app.createdAt as any).seconds * 1000).toLocaleDateString() : "Recent"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge & Actions */}
                                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                                            {app.status === "approved" ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 size={13} /> Approved
                                                </span>
                                            ) : app.status === "under_review" ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
                                                    <Clock size={13} /> Under Review
                                                </span>
                                            ) : app.status === "rejected" ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                                                    <AlertCircle size={13} /> Rejected
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800 animate-pulse">
                                                    <Clock size={13} /> Pending Review
                                                </span>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleOpenDossier(app)}
                                                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs shadow-primary/25 transition-all flex items-center gap-1.5 active:scale-95"
                                            >
                                                <Eye size={14} /> Review Dossier
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── VIEW 2: 15 TTCs COVERAGE MATRIX ─── */}
            {viewMode === "coverage" && (
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="space-y-1 text-center sm:text-left">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white">
                                Decentralized Chapter Network Overview
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">
                                15 Government Teachers&apos; Training Colleges across Bangladesh. Each campus has 5 Campus Manager slots.
                            </p>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs font-black text-primary border border-primary/20">
                            {15 - vacantCollegesCount} / 15 Covered
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collegeCoverageList.map((col) => (
                            <div
                                key={col.id}
                                className={`p-5 rounded-2xl border transition-all ${
                                    col.hasManager
                                        ? "bg-white dark:bg-[#161722] border-gray-200 dark:border-white/5"
                                        : "bg-amber-500/[0.03] border-amber-500/20"
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-gray-200/60 dark:border-white/10">
                                            {col.hasLogo ? (
                                                <Image src={col.logo} alt={col.shortName} width={34} height={34} className="object-contain" />
                                            ) : (
                                                <span className="text-xs font-black text-gray-500">{col.shortName.slice(0, 2)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{col.shortName}</h4>
                                            <p className="text-xs text-gray-500">{col.city}</p>
                                        </div>
                                    </div>

                                    {col.managers.length >= 5 ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 text-xs font-bold">
                                            <CheckCircle2 size={12} /> Full (5/5)
                                        </span>
                                    ) : col.managers.length > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 size={12} /> {col.managers.length}/5 Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800">
                                            5 Slots Open
                                        </span>
                                    )}
                                </div>

                                {/* Active Managers List */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2">
                                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                        <span>Campus Managers</span>
                                        <span>{col.managers.length} / 5 Appointed</span>
                                    </div>

                                    {col.managers.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {col.managers.map((m) => (
                                                <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-white/[0.02]">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{m.displayName}</span>
                                                    <span className="text-[10px] text-gray-400">{m.email}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No appointed manager yet.</p>
                                    )}

                                    {/* Pending Applications count button */}
                                    <div className="pt-2 flex items-center justify-between">
                                        <span className="text-xs text-gray-500 font-medium">
                                            {col.pendingAppsCount} pending applicant{col.pendingAppsCount === 1 ? "" : "s"}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCollegeFilter(col.id);
                                                setViewMode("applications");
                                            }}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            View Queue <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── VIEW 3: ACTIVE MANAGERS ROSTER ─── */}
            {viewMode === "managers" && (
                <div className="space-y-4">
                    {activeManagers.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 space-y-2">
                            <Users size={32} className="text-gray-400 mx-auto" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No active campus managers appointed yet</p>
                            <p className="text-xs text-gray-400">Approve pending applications to appoint leaders for each college.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeManagers.map((mgr) => (
                                <div
                                    key={mgr.id}
                                    className="p-5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-100 dark:border-white/5 shadow-xs space-y-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 overflow-hidden">
                                                {mgr.photoURL ? (
                                                    <Image src={mgr.photoURL} alt={mgr.displayName} width={48} height={48} className="object-cover" />
                                                ) : (
                                                    mgr.displayName.slice(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    {mgr.displayName}
                                                    <Award size={14} className="text-emerald-500" />
                                                </h4>
                                                <p className="text-xs font-semibold text-primary">{mgr.college || "Unassigned TTC"}</p>
                                                <p className="text-xs text-gray-400">{mgr.email}</p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRevokeRole(mgr)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                            title="Revoke Manager Role"
                                        >
                                            <UserX size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl">
                                        <div>
                                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Program</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatProgram(mgr.programme || "")}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-400 font-bold uppercase">Role Verified</span>
                                            <span className="font-semibold text-emerald-600">Yes (Verified)</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <Link
                                            href={`/college-info?college=${mgr.collegeId || ""}`}
                                            target="_blank"
                                            className="text-primary hover:underline font-bold flex items-center gap-1"
                                        >
                                            <Building2 size={13} /> View Campus Page
                                        </Link>
                                        <Link
                                            href={`/profile/${mgr.username || mgr.id}`}
                                            target="_blank"
                                            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium flex items-center gap-1"
                                        >
                                            <ExternalLink size={13} /> View Profile
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── CANDIDATE DOSSIER REVIEW MODAL (VETTING COCKPIT) ─── */}
            <AnimatePresence>
                {selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            className="w-full max-w-5xl bg-white dark:bg-[#161722] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.01]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                                Candidate Dossier &amp; Vetting
                                            </h3>
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                                {selectedApp.collegeName}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">
                                            Applied on{" "}
                                            {selectedApp.createdAt
                                                ? new Date((selectedApp.createdAt as any).seconds * 1000).toLocaleString()
                                                : "Recent"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {selectedApp.status === "approved" ? (
                                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                            Approved
                                        </span>
                                    ) : selectedApp.status === "under_review" ? (
                                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
                                            Under Review
                                        </span>
                                    ) : selectedApp.status === "rejected" ? (
                                        <span className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                                            Rejected
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800">
                                            Pending Decision
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedApp(null);
                                            setConfirmingStatus(null);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal 2-Column Responsive Body */}
                            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* ─── LEFT COLUMN: CANDIDATE IDENTITY & VERIFICATION (5 cols) ─── */}
                                    <div className="lg:col-span-5 space-y-4">
                                        {/* Profile Card */}
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                                                    {selectedApp.applicantPhoto ? (
                                                        <Image src={selectedApp.applicantPhoto} alt={selectedApp.applicantName} width={56} height={56} className="object-cover w-full h-full" />
                                                    ) : (
                                                        selectedApp.applicantName.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-base text-gray-900 dark:text-white truncate">
                                                        {selectedApp.applicantName}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 truncate">{selectedApp.applicantEmail}</p>
                                                    {selectedApp.applicantUsername && (
                                                        <p className="text-[11px] text-primary font-semibold">@{selectedApp.applicantUsername}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* CR Status Badge */}
                                            <div className="pt-2 border-t border-gray-200/60 dark:border-white/5">
                                                {selectedApp.isClassRepresentative ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                                        <UserCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                        <span>Official Class Representative (CR)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 text-xs font-semibold">
                                                        <UserX size={14} className="shrink-0 text-gray-400" />
                                                        <span>Not a Class Representative</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* WhatsApp Direct Connect Button */}
                                            {(() => {
                                                const cleanPhone = (selectedApp.whatsappNumber || selectedApp.applicantPhone || "").replace(/\D/g, "");
                                                const greeting = encodeURIComponent(
                                                    `Hello ${selectedApp.applicantName}, this is the TTC Network Central Committee regarding your Campus Manager application for ${selectedApp.collegeName}.`
                                                );
                                                return cleanPhone ? (
                                                    <a
                                                        href={`https://wa.me/${cleanPhone}?text=${greeting}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs shadow-emerald-500/25 transition-all"
                                                    >
                                                        <Phone size={14} />
                                                        <span>Chat on WhatsApp ({selectedApp.whatsappNumber || selectedApp.applicantPhone})</span>
                                                    </a>
                                                ) : null;
                                            })()}

                                            {/* Social Links */}
                                            {(selectedApp.facebookUrl || selectedApp.linkedinUrl) && (
                                                <div className="flex items-center gap-2 pt-1">
                                                    {selectedApp.facebookUrl && (
                                                        <a
                                                            href={selectedApp.facebookUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Globe size={13} /> Facebook
                                                        </a>
                                                    )}
                                                    {selectedApp.linkedinUrl && (
                                                        <a
                                                            href={selectedApp.linkedinUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                                                        >
                                                            <Linkedin size={13} /> LinkedIn
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Academic Details Card */}
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-2.5">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                                                Academic Affiliation
                                            </span>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                        <Building2 size={13} className="text-primary" /> Target Campus
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{selectedApp.collegeName}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                        <GraduationCap size={13} className="text-primary" /> Enrolled Program
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{formatProgram(selectedApp.program)}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-primary" /> Year &amp; Semester
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{selectedApp.currentYearSemester}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Student ID Proof Inspection Card */}
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                    <FileText size={13} className="text-emerald-500" />
                                                    Student ID Document
                                                </span>
                                                {selectedApp.studentIdCardUrl && (
                                                    <a
                                                        href={selectedApp.studentIdCardUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={11} /> Open Full
                                                    </a>
                                                )}
                                            </div>

                                            {selectedApp.studentIdCardUrl ? (
                                                <div
                                                    className="relative h-44 w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer border border-gray-200 dark:border-white/10 group"
                                                    onClick={() => setPreviewImage(selectedApp.studentIdCardUrl || null)}
                                                    title="Click to zoom in"
                                                >
                                                    <Image
                                                        src={selectedApp.studentIdCardUrl}
                                                        alt="Student ID Proof"
                                                        fill
                                                        className="object-contain group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                                                        <Eye size={16} /> Click to Inspect
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-center text-xs text-gray-400 font-medium">
                                                    No ID card photo uploaded (Optional)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ─── RIGHT COLUMN: MOTIVATION & INTERACTIVE REVIEW ACTION CENTER (7 cols) ─── */}
                                    <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            {/* Candidate Motivation Section */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                                    <Quote size={15} />
                                                    <span>Why do you want to become the Campus Manager for {selectedApp.collegeName}?</span>
                                                </div>
                                                {selectedApp.motivation?.trim() ? (
                                                    <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-primary/30">
                                                        {selectedApp.motivation}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No statement provided.</p>
                                                )}
                                            </div>

                                            {/* Optional Extra Fields (Rendered ONLY if filled) */}
                                            {Boolean(selectedApp.campusVision?.trim()) && (
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1.5">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        Campus Vision / Identified Needs:
                                                    </span>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {selectedApp.campusVision}
                                                    </p>
                                                </div>
                                            )}

                                            {Boolean(selectedApp.communityPlan?.trim()) && (
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1.5">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        Community Mobilization Plan:
                                                    </span>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {selectedApp.communityPlan}
                                                    </p>
                                                </div>
                                            )}

                                            {Boolean(selectedApp.moderationApproach?.trim()) && (
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1.5">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        Conflict Resolution &amp; Truthfulness Approach:
                                                    </span>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {selectedApp.moderationApproach}
                                                    </p>
                                                </div>
                                            )}

                                            {Boolean(selectedApp.clubExperience?.trim()) && (
                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-1.5">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        Club &amp; Leadership Background:
                                                    </span>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300">
                                                        {selectedApp.clubExperience}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* ─── REVIEW DECISION CENTER ─── */}
                                        <div className="p-5 rounded-2xl bg-primary/[0.03] dark:bg-primary/[0.06] border border-primary/20 space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-primary" />
                                                    Administrative Vetting Decision
                                                </h5>
                                                <span className="text-[11px] text-gray-500 font-semibold">
                                                    Current Status: <strong className="text-primary capitalize">{selectedApp.status.replace("_", " ")}</strong>
                                                </span>
                                            </div>

                                            {/* Notification Target Account Indicator */}
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-xs">
                                                <Bell size={13} className="text-primary shrink-0" />
                                                <span className="text-gray-500 font-medium">Notification will be delivered to:</span>
                                                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                                                    <AtSign size={11} />
                                                    {selectedApp.applicantUsername || selectedApp.applicantName}
                                                </span>
                                                <span className="text-gray-400 text-[11px]">({selectedApp.applicantName})</span>
                                            </div>

                                            {/* Quick Preset Feedback Chips */}
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-gray-500 block">Quick Feedback Presets:</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {FEEDBACK_PRESETS.map((preset, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setFeedbackMessage(preset)}
                                                            className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 px-2.5 py-1 rounded-lg text-left transition-all"
                                                        >
                                                            {preset.slice(0, 38)}...
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Feedback to Candidate (Notification message) */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                                                    Feedback to Candidate <span className="text-gray-400 font-normal">(Sent via In-App Notification)</span>
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Feedback message explaining decision or requesting further details..."
                                                    value={feedbackMessage}
                                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                                                />
                                            </div>

                                            {/* Private Internal Notes */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                                                    Private Admin Notes <span className="text-gray-400 font-normal">(Visible only to central admins)</span>
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Write internal notes about candidate evaluation..."
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                                                />
                                            </div>

                                            {/* Inline Confirmation Safeguard */}
                                            {confirmingStatus && (
                                                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                                                    confirmingStatus === "approved"
                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                                        : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                                                }`}>
                                                    <div className="text-xs">
                                                        <p className="font-bold">
                                                            {confirmingStatus === "approved"
                                                                ? `Confirm promotion of ${selectedApp.applicantName}?`
                                                                : `Confirm rejection of ${selectedApp.applicantName}?`}
                         &nbsp;                             </p>
                                                        <p className="text-[11px] opacity-80 mt-0.5">
                                                            {confirmingStatus === "approved"
                                                                ? `Their account will be elevated to "manager" role for ${selectedApp.collegeName}.`
                                                                : `They will receive your feedback notification explaining this decision.`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmingStatus(null)}
                                                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 text-xs font-bold hover:bg-white/10"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusUpdate(confirmingStatus)}
                                                            disabled={processingAction}
                                                            className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                                                                confirmingStatus === "approved"
                                                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                                                    : "bg-red-600 hover:bg-red-700"
                                                            }`}
                                                        >
                                                            {processingAction ? (
                                                                <Loader2 size={13} className="animate-spin" />
                                                            ) : (
                                                                <Check size={13} />
                                                            )}
                                                            <span>Confirm {confirmingStatus === "approved" ? "Approve" : "Reject"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.01] flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedApp(null);
                                        setConfirmingStatus(null);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                >
                                    Close Dossier
                                </button>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Mark Under Review Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate("under_review")}
                                        disabled={processingAction || selectedApp.status === "under_review"}
                                        className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {processingAction ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                                        <span>Mark Under Review</span>
                                    </button>

                                    {/* Reject Button */}
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingStatus("rejected")}
                                        disabled={processingAction || selectedApp.status === "rejected"}
                                        className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-bold border border-red-200 dark:border-red-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <XCircle size={13} />
                                        <span>Reject with Feedback</span>
                                    </button>

                                    {/* Approve Button */}
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingStatus("approved")}
                                        disabled={processingAction || selectedApp.status === "approved"}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Approve as Campus Manager</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Lightbox Modal for ID Image Zoom */}
            <AnimatePresence>
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative max-w-3xl max-h-[85vh] w-full h-full flex items-center justify-center">
                            <Image
                                src={previewImage}
                                alt="Zoomed ID Proof"
                                width={900}
                                height={700}
                                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
