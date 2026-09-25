"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Camera,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Check,
    School,
    GraduationCap,
    MapPin,
    Sparkle,
    BookOpen,
    Search,
    X,
    Loader2,
    AlertCircle,
    User,
    Compass,
    Building2,
    Calendar,
    ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToStorage } from "@/lib/storage";
import { colleges, College } from "@/data/colleges";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/contexts/ToastContext";

// ═══════════════════════════════════════════════════
//  PRESET SUGGESTIONS FOR ONBOARDING
// ═══════════════════════════════════════════════════

const POPULAR_INTEREST_TAGS = [
    "Educational Tech",
    "Pedagogy",
    "Curriculum Design",
    "STEM Education",
    "Classroom Management",
    "Action Research",
    "Debate & Public Speaking",
    "Digital Literacy",
    "Creative Writing",
    "Inclusive Education",
    "Educational Psychology",
    "Sports & Wellness",
];

const TEACHER_CORE_SUBJECTS = [
    "Mathematics",
    "Bangla",
    "English",
    "Science & ICT",
    "Educational Psychology",
    "Teaching Pedagogy",
    "Social Science",
    "Physical Education",
];

// Step configuration
const STEPS = [
    { id: 1, title: "Your Identity", subtitle: "Photo & Display Name", icon: User },
    { id: 2, title: "Academic Role", subtitle: "Student or Teacher Status", icon: GraduationCap },
    { id: 3, title: "Your College", subtitle: "Select your Govt. TTC", icon: Building2 },
    { id: 4, title: "Bio & Interests", subtitle: "Make your profile shine", icon: Sparkles },
];

// ═══════════════════════════════════════════════════
//  STEP PROGRESS HEADER
// ═══════════════════════════════════════════════════

interface StepProgressProps {
    currentStep: number;
    onStepClick?: (step: number) => void;
}

const StepProgress = ({ currentStep }: StepProgressProps) => {
    return (
        <div className="w-full max-w-xl mx-auto mb-8 px-2">
            {/* Step badges row */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 mb-3">
                {STEPS.map((s) => {
                    const isCompleted = currentStep > s.id;
                    const isActive = currentStep === s.id;
                    const Icon = s.icon;

                    return (
                        <div key={s.id} className="flex-1 flex flex-col items-center text-center">
                            <div
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                    isActive
                                        ? "bg-primary text-white shadow-md shadow-primary/25 scale-105"
                                        : isCompleted
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                                }`}
                            >
                                {isCompleted ? <Check size={16} /> : <Icon size={15} />}
                            </div>
                            <span
                                className={`text-[10px] sm:text-[11px] font-bold mt-1.5 line-clamp-1 max-w-[70px] sm:max-w-none ${
                                    isActive
                                        ? "text-primary font-black"
                                        : isCompleted
                                        ? "text-navy-900 dark:text-gray-200"
                                        : "text-gray-400 dark:text-gray-500"
                                }`}
                            >
                                {s.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress bar line */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    initial={false}
                    animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  MAIN ONBOARDING COMPONENT
// ═══════════════════════════════════════════════════

export default function OnboardingPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const { showToast } = useToast();
    const { siteName } = useSiteSettings();

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState("");
    const [nameError, setNameError] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");

    const [role, setRole] = useState<"student" | "teacher">("student");
    const [programme, setProgramme] = useState<"BEdHonours" | "MEd">("BEdHonours");
    const [year, setYear] = useState("1st Year");
    const [semester, setSemester] = useState("Semester 1");
    const [status, setStatus] = useState<"govt" | "non-govt">("govt");
    const [subjects, setSubjects] = useState("");

    const [collegeId, setCollegeId] = useState("");
    const [collegeSearch, setCollegeSearch] = useState("");
    const [collegeError, setCollegeError] = useState("");

    const [bio, setBio] = useState("");
    const [interests, setInterests] = useState("");
    const [selectedInterestTags, setSelectedInterestTags] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pre-populate data from profile when user is signed in
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || user?.displayName || "");
            setPhotoPreview(profile.photoURL || user?.photoURL || "");
            if (profile.role === "student" || profile.role === "teacher") {
                setRole(profile.role);
            }
            if (profile.programme === "BEdHonours" || profile.programme === "MEd") {
                setProgramme(profile.programme);
            }
            if (profile.collegeId) {
                setCollegeId(profile.collegeId);
            }
            if (profile.year) setYear(profile.year);
            if (profile.semester) setSemester(profile.semester);
            if (profile.bio) setBio(profile.bio);
            if (profile.subjects) setSubjects(profile.subjects);
            if (profile.status === "govt" || profile.status === "non-govt") {
                setStatus(profile.status);
            }
        }
    }, [profile, user]);

    // Year options based on programme
    const yearOptions = useMemo(() => {
        if (programme === "BEdHonours") {
            return ["1st Year", "2nd Year", "3rd Year", "4th Year"];
        }
        return ["1st Year", "2nd Year"];
    }, [programme]);

    // Semester options based on programme and year
    const semesterOptions = useMemo(() => {
        if (programme === "BEdHonours") {
            if (year === "1st Year") return ["Semester 1", "Semester 2"];
            if (year === "2nd Year") return ["Semester 3", "Semester 4"];
            if (year === "3rd Year") return ["Semester 5", "Semester 6"];
            if (year === "4th Year") return ["Semester 7", "Semester 8"];
        } else {
            if (year === "1st Year") return ["Semester 1", "Semester 2"];
            if (year === "2nd Year") return ["Semester 3", "Semester 4"];
        }
        return ["Semester 1", "Semester 2"];
    }, [programme, year]);

    // Keep year and semester in sync
    useEffect(() => {
        if (!yearOptions.includes(year)) {
            setYear(yearOptions[0]);
        }
    }, [programme, yearOptions, year]);

    useEffect(() => {
        if (!semesterOptions.includes(semester)) {
            setSemester(semesterOptions[0]);
        }
    }, [year, programme, semesterOptions, semester]);

    // Handle avatar file selection
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("Please upload an image file (PNG, JPG, WebP).", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be smaller than 5 MB.", "error");
            return;
        }

        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Filter colleges by search query
    const filteredColleges = useMemo(() => {
        const q = collegeSearch.trim().toLowerCase();
        if (!q) return colleges;
        return colleges.filter((c) => {
            return (
                c.name.toLowerCase().includes(q) ||
                c.shortName.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q) ||
                (c.nameBn && c.nameBn.includes(q))
            );
        });
    }, [collegeSearch]);

    // Toggle interest tag
    const handleToggleInterest = (tag: string) => {
        if (selectedInterestTags.includes(tag)) {
            setSelectedInterestTags(selectedInterestTags.filter((t) => t !== tag));
        } else {
            setSelectedInterestTags([...selectedInterestTags, tag]);
        }
    };

    // Toggle teacher subject tag
    const handleToggleSubject = (subject: string) => {
        const currentList = subjects
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (currentList.includes(subject)) {
            setSubjects(currentList.filter((s) => s !== subject).join(", "));
        } else {
            setSubjects([...currentList, subject].join(", "));
        }
    };

    // Step validation handler
    const handleNext = () => {
        if (step === 1) {
            const cleanName = displayName.trim();
            if (!cleanName || cleanName.length < 2) {
                setNameError("Please enter your full name (at least 2 characters).");
                return;
            }
            setNameError("");
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            if (!collegeId) {
                setCollegeError("Please select your Government Teachers' Training College.");
                return;
            }
            setCollegeError("");
            setStep(4);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    // Final finish and save handler
    const handleFinish = async (skipOptional: boolean = false) => {
        if (!user) {
            showToast("Please sign in to complete your profile.", "error");
            router.push("/login");
            return;
        }

        setSaving(true);
        try {
            let finalPhotoURL = photoPreview;

            // 1. Upload photo if newly selected
            if (photoFile) {
                setUploadingPhoto(true);
                try {
                    const uploadResult = await uploadToStorage(photoFile, "avatars", user.uid);
                    finalPhotoURL = uploadResult.url;
                } catch (uploadErr) {
                    console.warn("[Onboarding] Avatar upload fallback:", uploadErr);
                } finally {
                    setUploadingPhoto(false);
                }
            }

            // 2. Consolidate interests
            const allInterests = Array.from(
                new Set([
                    ...selectedInterestTags,
                    ...interests
                        .split(",")
                        .map((i) => i.trim())
                        .filter(Boolean),
                ])
            ).join(", ");

            // 3. Save to Firestore
            const db = getDb();
            await setDoc(
                doc(db, "users", user.uid),
                {
                    displayName: displayName.trim(),
                    photoURL: finalPhotoURL,
                    role,
                    programme: role === "student" ? programme : "",
                    status: role === "teacher" ? status : "",
                    collegeId,
                    year: role === "student" ? year : "",
                    semester: role === "student" ? semester : "",
                    subjects: role === "teacher" ? subjects.trim() : "",
                    bio: skipOptional ? "" : bio.trim(),
                    interests: skipOptional ? "" : allInterests,
                    onboardingCompleted: true,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            // 4. Refresh profile in Auth context & session
            await refreshProfile();

            showToast("Welcome to TTC Network! Your profile is ready.", "success");
            router.push("/profile");
        } catch (err: unknown) {
            const e = err as Error;
            console.error("[Onboarding] Error saving profile:", e);
            showToast(e?.message || "Failed to complete setup. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#08080c] flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 transition-colors">
            {/* Header branding */}
            <div className="text-center mb-6 sm:mb-8 pt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Personalize Your Account</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-navy-900 dark:text-white tracking-tight">
                    Welcome to {siteName}
                </h1>
                <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-semibold mt-1">
                    {STEPS[step - 1].subtitle}
                </p>
            </div>

            {/* Stepper Progress */}
            <StepProgress currentStep={step} />

            {/* Modal Card */}
            <div className="w-full max-w-2xl bg-white dark:bg-[#11121a] rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800/80 p-5 sm:p-8 md:p-10 relative overflow-hidden flex flex-col">
                <div className="flex-1 min-h-[360px] sm:min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* ═══════════ STEP 1: BASICS & LOOK ═══════════ */}
                        {step === 1 && (
                            <motion.div
                                key="step-1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6 sm:space-y-8"
                            >
                                <div className="text-center">
                                    <div className="relative inline-block group">
                                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl sm:rounded-[2.5rem] bg-gray-50 dark:bg-gray-800/60 border-2 border-primary/80 rotate-2 transition-transform group-hover:rotate-0 overflow-hidden flex items-center justify-center shadow-lg">
                                            {photoPreview ? (
                                                <img
                                                    src={photoPreview}
                                                    alt="Avatar Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Camera className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            aria-label="Upload photo"
                                            className="absolute -bottom-2 -right-2 p-2.5 sm:p-3 bg-navy-900 dark:bg-primary text-white rounded-2xl shadow-lg border-2 border-white dark:border-gray-900 hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            <Camera size={16} />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoSelect}
                                        />
                                    </div>

                                    {photoPreview && (
                                        <div className="mt-3 flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs font-bold text-primary hover:underline"
                                            >
                                                Change photo
                                            </button>
                                            <span className="text-gray-300 dark:text-gray-700">•</span>
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="text-xs font-bold text-red-500 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}

                                    <h2 className="text-xl sm:text-2xl font-black text-navy-900 dark:text-white mt-4 sm:mt-5">
                                        Let&apos;s start with your look
                                    </h2>
                                    <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-medium mt-1">
                                        College peers and colleagues recognize you by your face!
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                        Display Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => {
                                            setDisplayName(e.target.value);
                                            if (nameError) setNameError("");
                                        }}
                                        placeholder="Your full name"
                                        className={`w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 font-bold text-base sm:text-lg text-navy-900 dark:text-white border-2 transition-all focus:outline-none ${
                                            nameError
                                                ? "border-red-500 bg-red-50/10"
                                                : "border-transparent focus:border-primary"
                                        }`}
                                    />
                                    {nameError && (
                                        <p className="text-xs font-bold text-red-500 pl-1 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {nameError}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════ STEP 2: ROLE & PROGRAMME ═══════════ */}
                        {step === 2 && (
                            <motion.div
                                key="step-2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-navy-900 dark:text-white">
                                        What&apos;s your role?
                                    </h2>
                                    <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-medium mt-1">
                                        Customizes your feed, permissions, and academic features.
                                    </p>
                                </div>

                                {/* Role Selection Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    {[
                                        {
                                            id: "student",
                                            label: "TTC Student",
                                            desc: "B.Ed Honours or M.Ed trainee",
                                            icon: GraduationCap,
                                        },
                                        {
                                            id: "teacher",
                                            label: "TTC Educator / Faculty",
                                            desc: "Teaching current teacher-students",
                                            icon: School,
                                        },
                                    ].map((r) => {
                                        const Icon = r.icon;
                                        const isSelected = role === r.id;
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => setRole(r.id as "student" | "teacher")}
                                                className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
                                                    isSelected
                                                        ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md"
                                                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40"
                                                }`}
                                            >
                                                <div
                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected
                                                            ? "bg-primary text-white"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                                                    }`}
                                                >
                                                    <Icon size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0 pr-5">
                                                    <div className="font-black text-sm sm:text-base text-navy-900 dark:text-white">
                                                        {r.label}
                                                    </div>
                                                    <div className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-400 font-medium mt-0.5">
                                                        {r.desc}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-4 right-4 text-primary">
                                                        <Check size={18} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Student Details */}
                                {role === "student" ? (
                                    <div className="space-y-4 pt-1 animate-fade-in">
                                        {/* Programme */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                                Programme
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    {
                                                        id: "BEdHonours",
                                                        label: "B.Ed Honours",
                                                        desc: "4-Year Undergraduate",
                                                        icon: GraduationCap,
                                                    },
                                                    {
                                                        id: "MEd",
                                                        label: "M.Ed",
                                                        desc: "Postgraduate Degree",
                                                        icon: BookOpen,
                                                    },
                                                ].map((p) => {
                                                    const isSelected = programme === p.id;
                                                    const Icon = p.icon;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setProgramme(p.id as "BEdHonours" | "MEd")}
                                                            className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                                                                isSelected
                                                                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                                                                    : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-gray-200"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div
                                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                                        isSelected
                                                                            ? "bg-primary text-white"
                                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                                    }`}
                                                                >
                                                                    <Icon size={14} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-xs sm:text-sm text-navy-900 dark:text-white">
                                                                        {p.label}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {p.desc}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="absolute top-3 right-3 text-primary w-4 h-4" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Year & Semester selects */}
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                                    Current Year
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={year}
                                                        onChange={(e) => setYear(e.target.value)}
                                                        className="w-full p-3.5 pr-8 rounded-xl bg-gray-50 dark:bg-gray-800/70 font-bold text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none appearance-none cursor-pointer"
                                                    >
                                                        {yearOptions.map((y) => (
                                                            <option key={y} value={y} className="dark:bg-gray-900">
                                                                {y}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown
                                                        size={16}
                                                        className="absolute right-3 top-4 text-gray-400 pointer-events-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                                    Semester
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={semester}
                                                        onChange={(e) => setSemester(e.target.value)}
                                                        className="w-full p-3.5 pr-8 rounded-xl bg-gray-50 dark:bg-gray-800/70 font-bold text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none appearance-none cursor-pointer"
                                                    >
                                                        {semesterOptions.map((s) => (
                                                            <option key={s} value={s} className="dark:bg-gray-900">
                                                                {s}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown
                                                        size={16}
                                                        className="absolute right-3 top-4 text-gray-400 pointer-events-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Teacher Details */
                                    <div className="space-y-4 pt-1 animate-fade-in">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                                Institutional Status
                                            </label>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: "govt", label: "Govt. Appointed" },
                                                    { id: "non-govt", label: "Non-Govt / Guest" },
                                                ].map((s) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => setStatus(s.id as "govt" | "non-govt")}
                                                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${
                                                            status === s.id
                                                                ? "bg-navy-900 dark:bg-primary border-navy-900 dark:border-primary text-white shadow-md"
                                                                : "bg-gray-50 dark:bg-gray-800/60 border-transparent text-gray-400 hover:border-gray-200 dark:hover:border-gray-700"
                                                        }`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                                Core Teaching Subjects
                                            </label>
                                            <input
                                                type="text"
                                                value={subjects}
                                                onChange={(e) => setSubjects(e.target.value)}
                                                placeholder="e.g., Mathematics, Educational Psychology"
                                                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 font-bold text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none"
                                            />
                                            {/* Quick subject pills */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {TEACHER_CORE_SUBJECTS.map((sub) => {
                                                    const active = subjects.toLowerCase().includes(sub.toLowerCase());
                                                    return (
                                                        <button
                                                            key={sub}
                                                            type="button"
                                                            onClick={() => handleToggleSubject(sub)}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                                active
                                                                    ? "bg-primary text-white shadow-sm"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                            }`}
                                                        >
                                                            {active ? "✓ " : "+ "}
                                                            {sub}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══════════ STEP 3: COLLEGE FINDER ═══════════ */}
                        {step === 3 && (
                            <motion.div
                                key="step-3"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-4"
                            >
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-navy-900 dark:text-white">
                                        Choose your college
                                    </h2>
                                    <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-medium mt-1">
                                        Select from the 15 Government Teachers&apos; Training Colleges of Bangladesh.
                                    </p>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search
                                        size={18}
                                        className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        value={collegeSearch}
                                        onChange={(e) => setCollegeSearch(e.target.value)}
                                        placeholder="Search by college name, city (Dhaka, Feni, Rajshahi)..."
                                        className="w-full pl-11 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 font-semibold text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none"
                                    />
                                    {collegeSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setCollegeSearch("")}
                                            className="absolute right-3 top-3.5 text-gray-400 hover:text-navy-900 dark:hover:text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {collegeError && (
                                    <p className="text-xs font-bold text-red-500 pl-1 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {collegeError}
                                    </p>
                                )}

                                {/* College List */}
                                <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1 no-scrollbar">
                                    {filteredColleges.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-xs font-bold">
                                            No college matches &ldquo;{collegeSearch}&rdquo;. Try another city or keyword.
                                        </div>
                                    ) : (
                                        filteredColleges.map((c: College) => {
                                            const isSelected = collegeId === c.id;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCollegeId(c.id);
                                                        setCollegeError("");
                                                    }}
                                                    className={`w-full p-3.5 sm:p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all ${
                                                        isSelected
                                                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                                                            : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-200 dark:hover:border-gray-700"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                                                                isSelected
                                                                    ? "bg-primary text-white"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                            }`}
                                                        >
                                                            {c.hasLogo && c.logo ? (
                                                                <Image
                                                                    src={c.logo}
                                                                    alt={c.name}
                                                                    width={32}
                                                                    height={32}
                                                                    className="object-contain"
                                                                />
                                                            ) : (
                                                                <School size={18} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-black text-xs sm:text-sm text-navy-900 dark:text-white truncate">
                                                                {c.name}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                                                <span className="font-bengali text-gray-500 dark:text-gray-400">
                                                                    {c.nameBn}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="font-semibold text-primary">
                                                                    {c.city}
                                                                </span>
                                                                {c.established && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>Est. {c.established}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 pl-2">
                                                        {isSelected ? (
                                                            <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                                                <Check size={13} />
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════ STEP 4: BIO & INTERESTS ═══════════ */}
                        {step === 4 && (
                            <motion.div
                                key="step-4"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-5"
                            >
                                <div className="text-center sm:text-left flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center shrink-0">
                                        <Sparkle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-black text-navy-900 dark:text-white">
                                            Ready to launch!
                                        </h2>
                                        <p className="text-gray-400 dark:text-gray-400 text-xs sm:text-sm font-medium">
                                            Share a brief introduction and topics you care about.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Short Bio */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between pl-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                                                A Short Bio <span className="text-gray-400 font-normal">(Optional)</span>
                                            </label>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {bio.length}/300
                                            </span>
                                        </div>
                                        <textarea
                                            value={bio}
                                            maxLength={300}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell fellow educators and classmates about your teaching philosophy, passion, or hobbies..."
                                            rows={3}
                                            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 font-medium text-xs sm:text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    {/* Quick Interest Tags */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                            Select Interest Tags <span className="text-gray-400 font-normal">(Tap to add)</span>
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar py-1">
                                            {POPULAR_INTEREST_TAGS.map((tag) => {
                                                const active = selectedInterestTags.includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => handleToggleInterest(tag)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                            active
                                                                ? "bg-primary text-white shadow-sm scale-102"
                                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                        }`}
                                                    >
                                                        {active ? "✓ " : "+ "}
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Additional Custom Interests Input */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest pl-1">
                                            Custom Interests <span className="text-gray-400 font-normal">(Comma separated)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={interests}
                                            onChange={(e) => setInterests(e.target.value)}
                                            placeholder="e.g. Robotics, Astronomy, Micro-teaching"
                                            className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 font-semibold text-xs sm:text-sm text-navy-900 dark:text-white border-2 border-transparent focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Navigation Bar */}
                <div className="mt-8 pt-5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={step === 1 || saving}
                        onClick={handleBack}
                        className={`flex items-center gap-1.5 font-bold text-xs sm:text-sm uppercase tracking-wider transition-opacity py-2 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            step === 1 ? "opacity-0 pointer-events-none" : "text-gray-400 dark:text-gray-400 hover:text-navy-900 dark:hover:text-white"
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {step === 4 && (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleFinish(true)}
                                className="px-3.5 py-3 text-xs sm:text-sm font-bold text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors"
                            >
                                Skip optional
                            </button>
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 sm:px-8 py-3.5 bg-navy-900 dark:bg-primary text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 active:scale-95 shadow-lg shadow-navy-900/10 dark:shadow-primary/20 hover:bg-black dark:hover:bg-primary-dark transition-all"
                            >
                                <span>Continue</span>
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={saving || uploadingPhoto}
                                onClick={() => handleFinish(false)}
                                className="px-6 sm:px-8 py-3.5 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 active:scale-95 shadow-xl shadow-primary/25 hover:bg-primary-dark transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Saving Profile...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Start Journey</span>
                                        <Sparkle size={16} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
