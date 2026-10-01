"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
    GraduationCap,
    Send,
    UploadCloud,
    ArrowRight,
    Check,
    Sparkles,
    FileText,
    ExternalLink,
    ChevronRight,
    ChevronDown,
    Calendar,
    Info,
    Phone,
    Linkedin,
    Globe,
    Eye,
    Loader2,
    UserCheck,
    CheckCheck,
    AlertTriangle,
} from "lucide-react";
import { colleges, type College } from "@/data/colleges";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
    submitCampusManagerApplication,
    getMyCampusManagerApplication,
    getActiveCampusManagers,
    type CampusManagerApplication,
    type FirestoreUser,
} from "@/lib/firestore";
import { uploadToStorage } from "@/lib/storage";

const PROGRAM_OPTIONS = [
    {
        id: "BEdHonours",
        title: "B.Ed (Honours)",
        badge: "Undergraduate",
        subtitle: "4-Year Bachelor of Education Degree",
        icon: GraduationCap,
    },
    {
        id: "MEd",
        title: "M.Ed",
        badge: "Postgraduate",
        subtitle: "Master of Education Degree",
        icon: Award,
    },
] as const;

function formatYearSemester(year?: string, semester?: string, raw?: string): string {
    // 1. If raw string exists, check if it contains duplicate artifacts
    if (raw && raw.trim()) {
        let clean = raw.trim();
        // Remove repetitive "Year Year"
        clean = clean.replace(/\bYear\s+Year\b/gi, "Year");
        // Remove repetitive "Semester Semester"
        clean = clean.replace(/\bSemester\s+Semester\b/gi, "Semester");
        // Convert "Semester 1 Semester" -> "1st Semester"
        clean = clean.replace(/\bSemester\s+(\d+)\s+Semester\b/gi, (_, n) => {
            const ords: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", "5": "5th", "6": "6th", "7": "7th", "8": "8th" };
            return `${ords[n] || n + "th"} Semester`;
        });
        // Convert "Semester 1" -> "1st Semester"
        clean = clean.replace(/\bSemester\s+(\d+)\b/gi, (_, n) => {
            const ords: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", "5": "5th", "6": "6th", "7": "7th", "8": "8th" };
            return `${ords[n] || n + "th"} Semester`;
        });

        if (!clean.toLowerCase().includes("year year") && !clean.toLowerCase().includes("semester semester") && clean.length > 2) {
            return clean;
        }
    }

    // 2. Parse year
    let cleanYear = "";
    if (year && year.trim()) {
        const y = year.trim();
        const numMatch = y.match(/(\d+)/);
        if (numMatch) {
            const n = numMatch[1];
            const ords: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th" };
            cleanYear = `${ords[n] || n + "th"} Year`;
        } else {
            cleanYear = y.replace(/\s*year\s*/gi, "").trim() + " Year";
        }
    }

    // 3. Parse semester
    let cleanSem = "";
    if (semester && semester.trim()) {
        const s = semester.trim();
        const numMatch = s.match(/(\d+)/);
        if (numMatch) {
            const n = numMatch[1];
            const ords: Record<string, string> = {
                "1": "1st", "2": "2nd", "3": "3rd", "4": "4th",
                "5": "5th", "6": "6th", "7": "7th", "8": "8th"
            };
            cleanSem = `${ords[n] || n + "th"} Semester`;
        } else {
            cleanSem = s.replace(/\s*semester\s*/gi, "").trim() + " Semester";
        }
    }

    if (cleanYear && cleanSem) {
        return `${cleanYear}, ${cleanSem}`;
    }
    return cleanYear || cleanSem || "";
}

function MeshGradient() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[480px] bg-gradient-to-b from-blue-600/[0.08] via-indigo-600/[0.04] to-transparent blur-[120px] rounded-full" />
            <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] bg-sky-400/[0.05] dark:bg-blue-500/[0.04] blur-[100px] rounded-full" />
            <div className="absolute bottom-0 -left-20 w-[480px] h-[480px] bg-indigo-600/[0.05] dark:bg-sky-500/[0.03] blur-[120px] rounded-full" />
            <div
                className="absolute inset-0 opacity-[0.22] dark:opacity-[0.12]"
                style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />
        </div>
    );
}

function CampusManagerContent() {
    const { user, profile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Enrolled college identification from profile
    const userCollegeId = profile?.collegeId || "";

    // Form and application state
    const [existingApplication, setExistingApplication] = useState<(CampusManagerApplication & { id: string }) | null>(null);
    const [loadingApplication, setLoadingApplication] = useState(true);
    const [activeManagers, setActiveManagers] = useState<(FirestoreUser & { id: string })[]>([]);
    const [isReapplying, setIsReapplying] = useState(false);

    // Streamlined form fields matching user requirements
    const [collegeId, setCollegeId] = useState(userCollegeId);
    const [program, setProgram] = useState<string>("BEdHonours");
    const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
    const programDropdownRef = useRef<HTMLDivElement>(null);
    const [currentYearSemester, setCurrentYearSemester] = useState("");
    const [studentIdCardUrl, setStudentIdCardUrl] = useState("");
    const [uploadingIdCard, setUploadingIdCard] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [facebookUrl, setFacebookUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [isClassRepresentative, setIsClassRepresentative] = useState<boolean | null>(null);
    const [motivation, setMotivation] = useState("");

    // Selected Program details
    const selectedProgramOpt = useMemo(() => {
        return PROGRAM_OPTIONS.find((p) => p.id === program) || PROGRAM_OPTIONS[0];
    }, [program]);

    // Close program dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (programDropdownRef.current && !programDropdownRef.current.contains(event.target as Node)) {
                setIsProgramDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Submission status
    const [submitting, setSubmitting] = useState(false);

    // Selected College Object
    const selectedCollege = useMemo(() => {
        return colleges.find((c) => c.id === collegeId) || null;
    }, [collegeId]);

    const userCollegeObj = useMemo(() => {
        return colleges.find((c) => c.id === userCollegeId) || null;
    }, [userCollegeId]);

    // Pre-fill profile info once loaded and auto-lock college to user's own campus
    useEffect(() => {
        if (profile) {
            // Auto-select user's own campus
            if (profile.collegeId) {
                setCollegeId(profile.collegeId);
            }
            // Auto-write cleanly formatted Year & Semester (e.g. "1st Year, 1st Semester")
            const formattedYearSem = formatYearSemester(profile.year, profile.semester, profile.yearSemester);
            if (formattedYearSem && (!currentYearSemester || currentYearSemester.includes("Year Year") || currentYearSemester.includes("Semester 1 Semester"))) {
                setCurrentYearSemester(formattedYearSem);
            }
            if (profile.programme) {
                if (profile.programme === "MEd") {
                    setProgram("MEd");
                } else {
                    setProgram("BEdHonours");
                }
            }
            if (profile.whatsapp && !whatsappNumber) {
                setWhatsappNumber(profile.whatsapp);
            } else if (profile.phone && !whatsappNumber) {
                setWhatsappNumber(profile.phone);
            }
            if (profile.facebook && !facebookUrl) {
                setFacebookUrl(profile.facebook);
            }
            const profileLinkedin = (profile as any)?.linkedin || profile.socialLinks?.find(s => s.platform.toLowerCase() === "linkedin")?.url;
            if (profileLinkedin && !linkedinUrl) {
                setLinkedinUrl(profileLinkedin);
            }
        }
    }, [profile, userCollegeId]);

    // Load existing application & active managers
    useEffect(() => {
        async function initData() {
            setLoadingApplication(true);
            try {
                if (user?.uid) {
                    const app = await getMyCampusManagerApplication(user.uid);
                    setExistingApplication(app);

                    // If existing application exists, prefill fields if editing
                    if (app) {
                        if (app.collegeId) setCollegeId(app.collegeId);
                        if (app.program) {
                            setProgram(app.program === "MEd" ? "MEd" : "BEdHonours");
                        }
                        if (app.currentYearSemester) {
                            const cleaned = formatYearSemester(profile?.year, profile?.semester, app.currentYearSemester);
                            setCurrentYearSemester(cleaned || app.currentYearSemester);
                        }
                        if (app.studentIdCardUrl) setStudentIdCardUrl(app.studentIdCardUrl);
                        if (app.whatsappNumber || app.applicantPhone) setWhatsappNumber(app.whatsappNumber || app.applicantPhone);
                        if (app.facebookUrl) setFacebookUrl(app.facebookUrl);
                        if (app.linkedinUrl) setLinkedinUrl(app.linkedinUrl);
                        if (typeof app.isClassRepresentative === "boolean") setIsClassRepresentative(app.isClassRepresentative);
                        if (app.motivation) setMotivation(app.motivation);
                    }
                }
                const managers = await getActiveCampusManagers();
                setActiveManagers(managers);
            } catch (err) {
                console.error("Failed to load campus manager application:", err);
            } finally {
                setLoadingApplication(false);
            }
        }
        if (!authLoading) {
            initData();
        }
    }, [user?.uid, authLoading]);

    // Handle ID Card Upload
    const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!user) {
            showToast("Please sign in before uploading files.", "error");
            return;
        }

        setUploadingIdCard(true);
        try {
            const res = await uploadToStorage(file, "attachments", `id-proofs/${user.uid}`);
            setStudentIdCardUrl(res.url);
            showToast("Student ID document uploaded successfully!", "success");
        } catch (err: any) {
            showToast(err.message || "Failed to upload ID proof.", "error");
        } finally {
            setUploadingIdCard(false);
        }
    };

    // Validation
    const validateForm = (): boolean => {
        if (!collegeId) {
            showToast("Please select your Teachers' Training College.", "error");
            return false;
        }
        if (!program) {
            showToast("Please select your enrolled program.", "error");
            return false;
        }
        if (!currentYearSemester.trim()) {
            showToast("Please enter your current Year & Semester.", "error");
            return false;
        }
        if (!whatsappNumber.trim()) {
            showToast("Please enter your WhatsApp contact number for verification.", "error");
            return false;
        }
        return true;
    };

    // Submit handler
    const handleSubmitApplication = async () => {
        if (!validateForm()) return;
        if (!user || !profile) {
            showToast("Sign in required to submit application.", "error");
            return;
        }

        const collegeObj = colleges.find((c) => c.id === collegeId);
        if (!collegeObj) {
            showToast("Invalid college selected.", "error");
            return;
        }

        setSubmitting(true);
        try {
            await submitCampusManagerApplication({
                userId: user.uid,
                applicantName: profile.displayName || user.displayName || "Applicant",
                applicantEmail: user.email || "",
                applicantUsername: (profile?.username || "").toLowerCase().trim(),
                applicantPhoto: profile?.photoURL || user.photoURL || "",
                applicantPhone: whatsappNumber.trim(),
                whatsappNumber: whatsappNumber.trim(),
                collegeId: collegeObj.id,
                collegeName: collegeObj.shortName || collegeObj.name,
                program,
                currentYearSemester: currentYearSemester.trim(),
                studentIdCardUrl: studentIdCardUrl || "",
                isClassRepresentative: isClassRepresentative === true ? true : isClassRepresentative === false ? false : undefined,
                motivation: motivation.trim() || "",
                facebookUrl: facebookUrl.trim() || "",
                linkedinUrl: linkedinUrl.trim() || "",
            });

            showToast("🎉 Application submitted successfully! Central committee has been notified.", "success");

            // Re-fetch application
            const refreshed = await getMyCampusManagerApplication(user.uid);
            setExistingApplication(refreshed);
            setIsReapplying(false);
        } catch (err: any) {
            console.error("Submission failed:", err);
            showToast(err.message || "Failed to submit application.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const isExistingManager = profile?.role === "manager" || profile?.role === "super_manager" || profile?.role === "admin";

    // Handle Campus Radar Click (Enforces applying only to own campus)
    const handleRadarCampusClick = (targetCollege: College) => {
        if (userCollegeId && userCollegeId !== targetCollege.id) {
            showToast(`You are enrolled at ${userCollegeObj?.shortName || "your TTC"}. Campus Manager applications are restricted to your own campus chapter.`, "info");
            return;
        }

        setCollegeId(targetCollege.id);
        const formEl = document.getElementById("application-form-section");
        if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-[#0C0C10] text-gray-900 dark:text-gray-100 overflow-hidden pb-20">
            <MeshGradient />

            {/* Top Container */}
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-14">
                {/* Breadcrumb / Top Tag */}
                <div className="flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary dark:text-sky-400 text-xs font-bold tracking-wide uppercase shadow-sm backdrop-blur-md"
                    >
                        <Shield size={14} className="animate-pulse" />
                        TTC Network Chapter Leadership Program
                    </motion.div>
                </div>

                {/* Hero Headline — Crafted to be clean, editorial, strictly within 2 lines */}
                <div className="text-center mt-6 space-y-3.5 max-w-4xl mx-auto px-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.15rem] font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]"
                    >
                        Lead Your Campus Chapter.
                        <span className="block mt-1 sm:mt-1.5 text-primary dark:text-sky-400">
                            Become the Campus Manager.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed"
                    >
                        Take ownership of your Teachers&apos; Training College community. Keep campus information up to date, coordinate clubs, and represent your fellow students.
                    </motion.p>
                </div>

                {/* ─── 15 TTCs CHAPTER RADAR / VACANCY STATUS ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mt-12 sm:mt-14"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Building2 size={22} className="text-primary" />
                                15 TTCs Chapter Status &amp; Vacancy
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                Each TTC has 5 Campus Manager slots. See current coverage and open vacancies.
                            </p>
                        </div>
                        {userCollegeObj ? (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
                                <CheckCircle2 size={13} /> Your Campus: {userCollegeObj.shortName}
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-primary dark:text-sky-400 bg-primary/10 dark:bg-primary/20 px-3.5 py-1.5 rounded-full self-start sm:self-auto border border-primary/20">
                                Applications open (5 slots per campus)
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {colleges.map((c) => {
                            const TOTAL_SLOTS = 5;
                            const collegeManagers = activeManagers.filter((m) => m.collegeId === c.id);
                            const filledCount = collegeManagers.length;
                            const openSpots = Math.max(0, TOTAL_SLOTS - filledCount);
                            const isFull = filledCount >= TOTAL_SLOTS;
                            const isMyCampus = userCollegeId === c.id;
                            const isSelected = collegeId === c.id;

                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleRadarCampusClick(c)}
                                    className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 ${
                                        isMyCampus
                                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm ring-2 ring-emerald-500/30"
                                            : isSelected
                                            ? "border-primary bg-primary/5 dark:bg-primary/15 shadow-sm ring-2 ring-primary/40"
                                            : "border-gray-200/80 dark:border-white/5 bg-white/60 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/15"
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-gray-200/60 dark:border-white/10 shrink-0">
                                                {c.hasLogo ? (
                                                    <Image src={c.logo} alt={c.shortName} width={28} height={28} className="object-contain" />
                                                ) : (
                                                    <Building2 size={15} className="text-gray-400 dark:text-gray-500" />
                                                )}
                                            </div>
                                            {isMyCampus ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-black border border-emerald-300 dark:border-emerald-700">
                                                    Your Campus
                                                </span>
                                            ) : isFull ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 text-[10px] font-bold">
                                                    <CheckCircle2 size={10} /> Full
                                                </span>
                                            ) : filledCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 size={10} /> {filledCount}/5 Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                                    Open
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1" title={c.name}>{c.shortName}</p>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">{c.city}</p>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 flex items-center justify-between font-medium">
                                        <span className="truncate mr-1">
                                            {isFull
                                                ? "5/5 Slots Filled"
                                                : `${openSpots} Spot${openSpots === 1 ? "" : "s"} Open`}
                                        </span>
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform text-primary shrink-0" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ─── DYNAMIC APPLICATION STATE OR CANDIDATE DASHBOARD ─── */}
                <div id="application-form-section" className="mt-14 scroll-mt-24">
                    {/* CASE 1: Loading */}
                    {authLoading || loadingApplication ? (
                        <div className="p-12 rounded-3xl bg-white/80 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 text-center space-y-4">
                            <Loader2 size={32} className="animate-spin text-primary mx-auto" />
                            <p className="text-sm font-semibold text-gray-500">Checking campus records &amp; application history...</p>
                        </div>
                    ) : !user ? (
                        /* CASE 2: Unauthenticated */
                        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-[#13141f] dark:via-[#161722] dark:to-[#0f1017] border border-blue-100 dark:border-white/10 text-center space-y-6 shadow-xl">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                                <Shield size={32} />
                            </div>
                            <div className="max-w-md mx-auto space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Sign In to Apply</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    To verify your student credentials and link your application to your official student profile, please log in first.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <Link
                                    href="/login?redirect=/campus-manager"
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Log In with Student Account <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-800 dark:text-gray-200 font-bold text-sm transition-all"
                                >
                                    Create New Account
                                </Link>
                            </div>
                        </div>
                    ) : isExistingManager && !isReapplying ? (
                        /* CASE 3: Already an active manager / admin */
                        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 text-center space-y-6 shadow-xl">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                                <Award size={36} />
                            </div>
                            <div className="max-w-xl mx-auto space-y-2">
                                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                                    Verified Leadership Badge
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                                    You Are An Active Campus Manager!
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    You currently have administrative governance rights for{" "}
                                    <strong className="text-gray-900 dark:text-white">
                                        {(profile as any)?.college || selectedCollege?.name || "your TTC campus"}
                                    </strong>
                                    . You can update college details, review member submissions, manage clubs, and publish campus notices.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <Link
                                    href={`/college-info?college=${profile?.collegeId || ""}`}
                                    className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    <Building2 size={16} /> Manage College Page
                                </Link>
                                <Link
                                    href="/admin"
                                    className="px-6 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary text-gray-800 dark:text-gray-200 font-bold text-sm flex items-center gap-2"
                                >
                                    <Shield size={16} /> Open Management Console
                                </Link>
                            </div>
                        </div>
                    ) : existingApplication && !isReapplying ? (
                        /* CASE 4: Existing application status tracker */
                        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 shadow-xl space-y-8">
                            {/* Tracker Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-white/5">
                                <div>
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                        Application ID: #{existingApplication.id?.slice(0, 8)}
                                    </span>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                        Campus Manager Application Status
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 font-medium">
                                        Target Chapter: <strong className="text-primary">{existingApplication.collegeName}</strong> • Submitted on{" "}
                                        {existingApplication.createdAt
                                            ? new Date((existingApplication.createdAt as any).seconds * 1000).toLocaleDateString()
                                            : "Recent"}
                                    </p>
                                </div>

                                <div>
                                    {existingApplication.status === "approved" ? (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 size={16} /> Approved &amp; Elevated
                                        </span>
                                    ) : existingApplication.status === "under_review" ? (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-200 dark:border-blue-800">
                                            <Clock size={16} /> Under Vetting Review
                                        </span>
                                    ) : existingApplication.status === "rejected" ? (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-sm border border-red-200 dark:border-red-800">
                                            <AlertCircle size={16} /> Application Not Approved
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold text-sm border border-amber-200 dark:border-amber-800">
                                            <Clock size={16} /> Pending Evaluation
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Timeline Stepper */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                        <CheckCircle2 size={16} /> 1. Application Submitted
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Your credentials &amp; answers have been safely recorded.</p>
                                </div>

                                <div
                                    className={`p-4 rounded-2xl border space-y-1 ${
                                        existingApplication.status === "under_review" || existingApplication.status === "approved"
                                            ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-bold"
                                            : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-400"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock size={16} /> 2. Background &amp; Vetting
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        {existingApplication.status === "under_review"
                                            ? "Central administration is actively vetting your application."
                                            : existingApplication.status === "approved"
                                            ? "Verification passed with honors."
                                            : "Awaiting administrator review."}
                                    </p>
                                </div>

                                <div
                                    className={`p-4 rounded-2xl border space-y-1 ${
                                        existingApplication.status === "approved"
                                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 font-bold"
                                            : existingApplication.status === "rejected"
                                            ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 font-bold"
                                            : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-400"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <Award size={16} /> 3. Final Decision
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        {existingApplication.status === "approved"
                                            ? "Role elevated to Campus Manager."
                                            : existingApplication.status === "rejected"
                                            ? "Decision recorded. See feedback below."
                                            : "Will notify you within 24-48 hours."}
                                    </p>
                                </div>
                            </div>

                            {/* Feedback or Notes Display */}
                            {existingApplication.feedbackMessage && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                                        <Info size={16} /> Note from Admin Reviewer:
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 font-medium pl-6">
                                        &ldquo;{existingApplication.feedbackMessage}&rdquo;
                                    </p>
                                </div>
                            )}

                            {/* Application Summary Box */}
                            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-200 dark:border-white/5 space-y-4">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                    Submitted Profile Snapshot
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-400 block font-medium">Target College</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{existingApplication.collegeName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Enrolled Program</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                            {existingApplication.program === "BEdHonours" ? "B.Ed (Honours)" : existingApplication.program === "MEd" ? "M.Ed" : existingApplication.program}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Year &amp; Semester</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                            {formatYearSemester(undefined, undefined, existingApplication.currentYearSemester)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Class Representative</span>
                                        <span className={`font-bold ${existingApplication.isClassRepresentative ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}>
                                            {existingApplication.isClassRepresentative ? "Yes (CR)" : "No"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">WhatsApp Number</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{existingApplication.whatsappNumber || existingApplication.applicantPhone}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block font-medium">Student ID Proof</span>
                                        {existingApplication.studentIdCardUrl ? (
                                            <a
                                                href={existingApplication.studentIdCardUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                                            >
                                                <Eye size={12} /> View Document
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">Not attached</span>
                                        )}
                                    </div>
                                </div>

                                {existingApplication.motivation && (
                                    <div className="pt-3 border-t border-gray-200/60 dark:border-white/5 space-y-1">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                                            Motivation for {existingApplication.collegeName}
                                        </span>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap">
                                            {existingApplication.motivation}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2">
                                {existingApplication.status === "rejected" || existingApplication.status === "pending" ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsReapplying(true)}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                                    >
                                        Edit / Re-submit Application <ArrowRight size={14} />
                                    </button>
                                ) : (
                                    <div />
                                )}

                                <Link
                                    href="/college-info"
                                    className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                                >
                                    Browse College Directory
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* CASE 5: The Streamlined Short Application Form */
                        <div className="bg-white dark:bg-[#161722] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 sm:p-10 space-y-6">
                            {/* Form Header */}
                            <div className="pb-5 border-b border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                                        Campus Manager Application
                                    </h3>
                                    {selectedCollege && (
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                            {selectedCollege.shortName}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                                    Fill in your campus credentials and brief motivation to represent your college chapter.
                                </p>
                            </div>

                            {/* ─── 1. YOUR COLLEGE (Auto-selected from profile & locked) ─── */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                                    Your College (Auto-Selected from Profile) *
                                </label>

                                {selectedCollege ? (
                                    <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10">
                                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center overflow-hidden border border-gray-200/60 dark:border-white/10 shrink-0">
                                            {selectedCollege.hasLogo ? (
                                                <Image src={selectedCollege.logo} alt={selectedCollege.shortName} width={36} height={36} className="object-contain" />
                                            ) : (
                                                <span className="text-xs font-black text-gray-500">{selectedCollege.shortName.slice(0, 2)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                    {selectedCollege.name}
                                                </h4>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                                                    <CheckCircle2 size={11} /> Auto-Selected
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                {selectedCollege.shortName} • {selectedCollege.city} • You can only apply to manage your own campus chapter.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Fallback if user profile doesn't have a college set yet */
                                    <div className="space-y-1.5">
                                        <select
                                            value={collegeId}
                                            onChange={(e) => setCollegeId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">-- Select Your Enrolled TTC --</option>
                                            {colleges.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} ({c.shortName})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-gray-400">
                                            Please choose the college you are currently enrolled in. You can only apply for your own campus.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ─── 2. ENROLLED PROGRAM & 3. CURRENT YEAR & SEMESTER ─── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Enrolled Program (Bespoke 2-Option Custom Dropdown) */}
                                <div className="relative" ref={programDropdownRef}>
                                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                                        Enrolled Program *
                                    </label>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setIsProgramDropdownOpen((prev) => !prev)}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 text-sm font-semibold transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                        aria-haspopup="listbox"
                                        aria-expanded={isProgramDropdownOpen}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                selectedProgramOpt.id === "MEd"
                                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                    : "bg-primary/10 text-primary"
                                            }`}>
                                                <selectedProgramOpt.icon size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                                                        {selectedProgramOpt.title}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                        selectedProgramOpt.id === "MEd"
                                                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                                                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                                    }`}>
                                                        {selectedProgramOpt.badge}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 truncate">
                                                    {selectedProgramOpt.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            size={18}
                                            className={`text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200 shrink-0 ml-2 ${
                                                isProgramDropdownOpen ? "rotate-180 text-primary" : ""
                                            }`}
                                        />
                                    </button>

                                    {/* Dropdown Menu (Only 2 Options: B.Ed Honours and M.Ed) */}
                                    <AnimatePresence>
                                        {isProgramDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute z-50 left-0 right-0 mt-2 p-1.5 rounded-2xl bg-white dark:bg-[#161722] border border-gray-200 dark:border-white/10 shadow-2xl space-y-1"
                                                role="listbox"
                                            >
                                                {PROGRAM_OPTIONS.map((opt) => {
                                                    const isSelected = program === opt.id;
                                                    const Icon = opt.icon;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setProgram(opt.id);
                                                                setIsProgramDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                                                isSelected
                                                                    ? "bg-primary/10 border border-primary/20 text-gray-900 dark:text-white"
                                                                    : "hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent text-gray-700 dark:text-gray-300"
                                                            }`}
                                                            role="option"
                                                            aria-selected={isSelected}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                    opt.id === "MEd"
                                                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                                        : "bg-primary/10 text-primary"
                                                                }`}>
                                                                    <Icon size={16} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                                            {opt.title}
                                                                        </span>
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                                            opt.id === "MEd"
                                                                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                                                                                : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                                                                        }`}>
                                                                            {opt.badge}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-400 line-clamp-1">
                                                                        {opt.subtitle}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {isSelected && (
                                                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 ml-2 shadow-sm shadow-primary/30">
                                                                    <Check size={13} strokeWidth={3} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Current Year & Semester */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                            Current Year &amp; Semester *
                                        </label>
                                        {currentYearSemester && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                <Sparkles size={10} /> Auto-written
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Calendar size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="e.g. 1st Year, 1st Semester"
                                            value={currentYearSemester}
                                            onChange={(e) => setCurrentYearSemester(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#161722] transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Auto-formatted from your academic profile. You can adjust if needed.
                                    </p>
                                </div>
                            </div>

                            {/* ─── 4. STUDENT ID CARD PHOTO OR ENROLLMENT DOCUMENT ─── */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Student ID Card Photo or Enrollment Document
                                </label>
                                <p className="text-xs text-gray-500">
                                    Upload a clear photo of your student ID card or official college admission slip to verify your student status.
                                </p>

                                {studentIdCardUrl ? (
                                    <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/10">
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 bg-black/5">
                                            <Image src={studentIdCardUrl} alt="Student ID" fill className="object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 size={14} /> ID Document Uploaded
                                            </div>
                                            <p className="text-[11px] text-gray-400 truncate">Ready for admin verification</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={studentIdCardUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <Eye size={13} /> View
                                            </a>
                                            <label className="px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold cursor-pointer transition-colors border border-gray-200 dark:border-white/10">
                                                Replace
                                                <input type="file" accept="image/*" onChange={handleIdCardUpload} disabled={uploadingIdCard} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center p-6 sm:p-8 cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-primary dark:hover:border-primary bg-gray-50/50 dark:bg-white/[0.01] transition-all">
                                        {uploadingIdCard ? (
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                                <Loader2 size={20} className="animate-spin" /> Uploading &amp; compressing ID document...
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud size={28} className="text-gray-400 mb-2" />
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    Click to upload Student ID card (JPG, PNG)
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-1">Clear photo of student ID or admission receipt • Max 5MB</span>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleIdCardUpload} disabled={uploadingIdCard} className="hidden" />
                                    </label>
                                )}
                            </div>

                            {/* ─── 5. WHATSAPP NUMBER ─── */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                                    WhatsApp Number *
                                </label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        type="tel"
                                        placeholder="01XXXXXXXXX"
                                        value={whatsappNumber}
                                        onChange={(e) => setWhatsappNumber(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Direct WhatsApp number for committee verification and chapter communications.
                                </p>
                            </div>

                            {/* ─── 6. SOCIAL & PROFESSIONAL PROFILES ─── */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Social &amp; Professional Profiles (Facebook and LinkedIn)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                                        <input
                                            type="url"
                                            placeholder="Facebook Profile URL"
                                            value={facebookUrl}
                                            onChange={(e) => setFacebookUrl(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Linkedin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0A66C2]" />
                                        <input
                                            type="url"
                                            placeholder="LinkedIn Profile URL"
                                            value={linkedinUrl}
                                            onChange={(e) => setLinkedinUrl(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ─── 7. ARE YOU CLASS REPRESENTATIVE? (YES, NO) ─── */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                                    Are you Class Representative (CR)?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsClassRepresentative(true)}
                                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                            isClassRepresentative === true
                                                ? "border-primary bg-primary/10 text-primary dark:text-sky-400 ring-2 ring-primary/40 shadow-sm"
                                                : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                        }`}
                                    >
                                        <CheckCircle2 size={16} className={isClassRepresentative === true ? "text-primary" : "text-gray-400"} />
                                        Yes, I am a CR
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsClassRepresentative(false)}
                                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                            isClassRepresentative === false
                                                ? "border-primary bg-primary/10 text-primary dark:text-sky-400 ring-2 ring-primary/40 shadow-sm"
                                                : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isClassRepresentative === false ? "border-primary text-primary" : "border-gray-400 text-gray-400"}`}>
                                            ✕
                                        </span>
                                        No
                                    </button>
                                </div>
                            </div>

                            {/* ─── 8. WHY DO YOU WANT TO BECOME CAMPUS MANAGER FOR [COLLEGE]? ─── */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-2">
                                    Why do you want to become the Campus Manager for {selectedCollege?.shortName || "Chattagram TTC"}?
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder={`Explain your motivation to represent ${selectedCollege?.shortName || "your college"}, how you plan to help fellow students, and why you are suited for this leadership role...`}
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <p className="text-xs text-gray-400 font-medium">
                                    Applications are reviewed and verified by central TTC Network administration.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleSubmitApplication}
                                    disabled={submitting}
                                    className="px-8 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> Submit Application
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CampusManagerPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-white dark:bg-[#0C0C10] flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            }
        >
            <CampusManagerContent />
        </Suspense>
    );
}
