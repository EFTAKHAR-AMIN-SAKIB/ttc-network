"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Mail,
    Lock,
    User,
    AtSign,
    Loader2,
    CheckCircle,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    XCircle,
    ChevronLeft,
    Eye,
    EyeOff,
    AlertCircle,
    GraduationCap,
    Quote,
} from "lucide-react";
import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthInstance, getDb } from "@/lib/firebase";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/contexts/ToastContext";
import { validateUsername, isUsernameAvailable, claimUsername } from "@/lib/username";

// ═══════════════════════════════════════════════════
//  PASSWORD STRENGTH HELPER
// ═══════════════════════════════════════════════════

interface PasswordStrength {
    score: number;
    label: string;
    barColor: string;
    textColor: string;
}

function computePasswordStrength(pwd: string): PasswordStrength {
    if (!pwd) return { score: 0, label: "", barColor: "bg-gray-200 dark:bg-gray-800", textColor: "text-gray-400" };
    if (pwd.length < 6) {
        return { score: 1, label: "Too short (min. 6 characters)", barColor: "bg-red-500", textColor: "text-red-500" };
    }

    let score = 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd) || (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd))) score += 1;

    switch (score) {
        case 2:
            return { score: 2, label: "Fair — Add a number or uppercase letter", barColor: "bg-amber-500", textColor: "text-amber-500" };
        case 3:
            return { score: 3, label: "Good — Add a special symbol for max safety", barColor: "bg-blue-500", textColor: "text-blue-500" };
        case 4:
            return { score: 4, label: "Strong — Excellent password security!", barColor: "bg-emerald-500", textColor: "text-emerald-500" };
        default:
            return { score: 1, label: "Weak — Use a longer combination", barColor: "bg-red-500", textColor: "text-red-500" };
    }
}

// ═══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: React.ElementType;
    error?: string;
    success?: boolean;
    status?: "idle" | "checking" | "available" | "taken" | "invalid";
    endAdornment?: React.ReactNode;
}

const FloatingInput = ({
    label,
    icon: Icon,
    type,
    value,
    onChange,
    error,
    success,
    status,
    endAdornment,
    ...props
}: FloatingInputProps) => {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(value);

    return (
        <div className="relative group/input space-y-1">
            <div
                className={`
                relative flex items-center transition-all duration-200 rounded-2xl border-2
                ${focused
                    ? "border-primary bg-white dark:bg-[#151722] shadow-lg shadow-primary/5"
                    : "border-gray-200/90 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700"
                }
                ${error ? "!border-red-500 bg-red-50/20 dark:bg-red-950/20" : ""}
                ${success ? "!border-emerald-500/90 bg-emerald-50/20 dark:bg-emerald-950/20" : ""}
            `}
            >
                <div className={`pl-4 shrink-0 transition-colors ${focused ? "text-primary" : "text-gray-400 dark:text-gray-500"}`}>
                    <Icon size={18} />
                </div>
                <div className="relative flex-grow min-w-0">
                    <input
                        {...props}
                        type={type}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full px-3 py-4 bg-transparent border-none focus:ring-0 focus:outline-none text-navy-900 dark:text-gray-100 font-bold placeholder-transparent peer text-sm sm:text-base"
                    />
                    <label
                        className={`
                        absolute left-3 transition-all cursor-text pointer-events-none select-none
                        ${focused || hasValue
                            ? "-top-2.5 text-[10px] bg-white dark:bg-[#151722] px-1.5 text-primary font-black uppercase tracking-wider rounded"
                            : "top-4 text-sm text-gray-400 dark:text-gray-500 font-semibold"
                        }
                    `}
                    >
                        {label}
                    </label>
                </div>
                
                {status === "checking" && (
                    <div className="mr-3 shrink-0 flex items-center text-primary animate-spin">
                        <Loader2 size={16} />
                    </div>
                )}
                {success && !endAdornment && (
                    <div className="mr-3 shrink-0 flex items-center text-emerald-500">
                        <CheckCircle size={16} />
                    </div>
                )}
                {error && !endAdornment && (
                    <div className="mr-3 shrink-0 flex items-center text-red-500">
                        <XCircle size={16} />
                    </div>
                )}
                {endAdornment && <div className="mr-3 shrink-0 flex items-center">{endAdornment}</div>}
            </div>
            {error && (
                <p className="text-[11px] font-bold text-red-500 pl-3.5 flex items-center gap-1 animate-fade-in">
                    <AlertCircle size={11} className="shrink-0" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  MAIN SIGNUP COMPONENT
// ═══════════════════════════════════════════════════

function SignupPageInner() {
    const router = useRouter();
    const { showToast } = useToast();
    const { siteName, logoUrl } = useSiteSettings();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isCapsLocked, setIsCapsLocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // Username Status
    const [uStatus, setUStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
    const [uError, setUError] = useState("");

    // Dynamic Password Strength
    const passwordStrength = useMemo(() => computePasswordStrength(password), [password]);

    // Username validation & debounce check
    useEffect(() => {
        const trimmed = username.trim().toLowerCase();
        if (!trimmed) {
            setUStatus("idle");
            setUError("");
            return;
        }

        const val = validateUsername(trimmed);
        if (!val.valid) {
            setUStatus("invalid");
            setUError(val.error || "Invalid username");
            return;
        }

        setUStatus("checking");
        setUError("");

        const timer = setTimeout(async () => {
            try {
                const avail = await isUsernameAvailable(trimmed);
                setUStatus(avail ? "available" : "taken");
                setUError(avail ? "" : "This username is already claimed");
            } catch {
                setUStatus("invalid");
                setUError("Error checking username");
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [username]);

    const checkCapsLock = (e: React.KeyboardEvent) => {
        if (e.getModifierState && e.getModifierState("CapsLock")) {
            setIsCapsLocked(true);
        } else {
            setIsCapsLocked(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanName = name.trim();
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName) {
            showToast("Please enter your full name.", "error");
            return;
        }

        if (cleanName.length < 2) {
            showToast("Name must be at least 2 characters.", "error");
            return;
        }

        if (uStatus !== "available") {
            showToast(uError || "Please choose a valid and available username.", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters long.", "error");
            return;
        }

        setLoading(true);
        try {
            const auth = getAuthInstance();
            const db = getDb();

            // 1. Create Firebase Auth user
            const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            await updateProfile(cred.user, { displayName: cleanName });

            // 2. Set user document in Firestore with onboardingCompleted: false
            await setDoc(doc(db, "users", cred.user.uid), {
                uid: cred.user.uid,
                email: cleanEmail,
                displayName: cleanName,
                username: cleanUsername,
                photoURL: "",
                bannerURL: "",
                role: "student",
                roleVerified: false,
                collegeId: "",
                programme: "BEdHonours",
                onboardingCompleted: false,
                year: "1st Year",
                semester: "Semester 1",
                bio: "",
                achievements: "",
                goals: "",
                skills: [],
                website: "",
                education: "",
                workExperience: "",
                createdAt: serverTimestamp(),
            }, { merge: true });

            // 3. Atomically claim username reservation in usernames/{username}
            const claimResult = await claimUsername(cred.user.uid, cleanUsername);
            if (!claimResult.success) {
                console.warn("[SignUp] Username claim issue:", claimResult.error);
            }

            showToast("Account created! Let's personalize your profile.", "success");
            router.push("/onboarding");
        } catch (err: unknown) {
            const e = err as { code?: string; message?: string };
            const code = e?.code || "";
            const msg = e?.message || "";

            if (code === "auth/email-already-in-use" || msg.includes("email-already-in-use")) {
                showToast("This email is already registered. Please sign in instead.", "error");
            } else if (code === "auth/weak-password" || msg.includes("weak-password")) {
                showToast("Password is too weak. Please use at least 6 characters.", "error");
            } else if (code === "auth/invalid-email" || msg.includes("invalid-email")) {
                showToast("Please enter a valid email address.", "error");
            } else if (code === "auth/network-request-failed" || msg.includes("network-request-failed")) {
                showToast("Network error. Please check your internet connection.", "error");
            } else {
                showToast(e?.message || "Registration failed. Please try again.", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#08080c] flex items-center justify-center p-0 sm:p-4 lg:p-8 transition-colors">
            <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-7xl bg-white dark:bg-[#11121a] rounded-none sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800/80 flex flex-col lg:flex-row-reverse overflow-hidden min-h-screen sm:min-h-[85vh]"
            >
                {/* ═══════════ RIGHT PANEL (DESKTOP ASSET) ═══════════ */}
                <div className="hidden lg:flex lg:w-7/12 bg-navy-900 relative p-16 xl:p-20 flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative z-10 text-right">
                        <div className="flex items-center justify-end gap-3.5 mb-14">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">{siteName}</h2>
                                <p className="text-[11px] font-bold text-primary uppercase tracking-widest">Educators Network</p>
                            </div>
                            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 shadow-inner">
                                <Image src={logoUrl} alt={siteName} width={38} height={38} className="invert drop-shadow" />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-bold mb-6">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            <span>15 Govt. Teachers&apos; Training Colleges of Bangladesh</span>
                        </div>

                        <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.12] mb-6 tracking-tight">
                            Join the <br />
                            Next Generation of <br />
                            <span className="text-primary italic-serif">Teachers.</span>
                        </h1>
                        <p className="text-gray-300 text-sm max-w-lg ml-auto font-medium leading-relaxed">
                            Create your academic profile, share educational resources, connect with college peers, and shape future classrooms.
                        </p>
                    </div>

                    <div className="relative z-10 self-end max-w-md text-right mt-12">
                        <div className="p-6 xl:p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 space-y-3.5 shadow-xl">
                            <div className="flex justify-end">
                                <Quote className="w-8 h-8 text-primary opacity-60" />
                            </div>
                            <p className="text-base xl:text-lg text-white/85 font-medium leading-relaxed italic font-bengali">
                                &ldquo;শিক্ষক কেবল জ্ঞানের বাহক নন, তিনি আলোকবর্তিকা যা ভবিষ্যৎ প্রজন্মকে দিকনির্দেশ করে।&rdquo;
                            </p>
                            <div className="flex items-center justify-end gap-2 text-xs font-black text-white/50 uppercase tracking-widest pt-2">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <span>TTC Community Vision</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ LEFT PANEL (FORM) ═══════════ */}
                <div className="flex-1 p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center relative bg-white dark:bg-[#11121a]">
                    <div className="max-w-md mx-auto w-full space-y-8">
                        {/* Mobile Top Branding */}
                        <div className="flex items-center justify-between lg:hidden pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Image src={logoUrl} alt={siteName} width={26} height={26} />
                                </div>
                                <span className="font-black text-base text-navy-900 dark:text-white tracking-tight">{siteName}</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">
                                Sign Up
                            </span>
                        </div>

                        {/* Heading & Back Link */}
                        <div>
                            <button
                                onClick={() => router.push("/login")}
                                className="inline-flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors uppercase tracking-widest mb-6 py-1"
                            >
                                <ChevronLeft size={16} />
                                <span>Back to login</span>
                            </button>

                            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest mb-3">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verified Member Registration</span>
                            </div>

                            <h2 className="text-3xl sm:text-4xl font-black text-navy-900 dark:text-white tracking-tight mb-2">
                                Build your legacy.
                            </h2>
                            <p className="text-gray-400 dark:text-gray-400 text-sm font-semibold">
                                Already part of the network?{" "}
                                <button
                                    onClick={() => router.push("/login")}
                                    className="text-primary hover:underline font-bold transition-all"
                                >
                                    Sign In
                                </button>
                            </p>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={handleSignUp} className="space-y-4" onKeyDown={checkCapsLock}>
                            {/* Full Name */}
                            <FloatingInput
                                label="Full Name"
                                icon={User}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Your full name"
                            />

                            {/* Username with real-time feedback */}
                            <div className="space-y-1.5">
                                <FloatingInput
                                    label="Username"
                                    icon={AtSign}
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                                    status={uStatus}
                                    success={uStatus === "available"}
                                    error={uStatus === "taken" || uStatus === "invalid" ? uError : ""}
                                    required
                                    placeholder="your_handle"
                                />

                                {/* Subtitle Helper */}
                                <div className="px-3 flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-gray-400 dark:text-gray-500">
                                        {username.trim() ? (
                                            <span className="font-mono text-primary">@{username.trim().toLowerCase()}</span>
                                        ) : (
                                            "Letters, numbers & underscores (3–20 chars)"
                                        )}
                                    </span>
                                    {uStatus === "available" && (
                                        <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                                            <CheckCircle size={12} /> Available
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Email Address */}
                            <FloatingInput
                                label="Email Address"
                                icon={Mail}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@domain.com"
                            />

                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <FloatingInput
                                        label="Create Password"
                                        icon={Lock}
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="••••••••"
                                        endAdornment={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="p-1 text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        }
                                    />

                                    {/* Caps Lock Alert */}
                                    <AnimatePresence>
                                        {isCapsLocked && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="absolute right-2 -bottom-5 flex items-center gap-1 text-amber-500 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider"
                                            >
                                                <AlertCircle size={11} />
                                                <span>Caps Lock is ON</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Dynamic Password Strength Bar */}
                                {password.length > 0 && (
                                    <div className="px-3 pt-1 space-y-1.5 animate-fade-in">
                                        <div className="flex gap-1.5 h-1.5 w-full">
                                            {[1, 2, 3, 4].map((stepIdx) => (
                                                <div
                                                    key={stepIdx}
                                                    className={`flex-1 rounded-full transition-all duration-300 ${
                                                        passwordStrength.score >= stepIdx
                                                            ? passwordStrength.barColor
                                                            : "bg-gray-100 dark:bg-gray-800"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-[11px] font-bold ${passwordStrength.textColor}`}>
                                            {passwordStrength.label}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                disabled={loading || uStatus !== "available" || password.length < 6}
                                type="submit"
                                className="w-full py-4 sm:py-4.5 bg-navy-900 dark:bg-primary text-white rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 group/btn hover:bg-black dark:hover:bg-primary-dark transition-all active:scale-[0.98] shadow-xl shadow-navy-900/10 dark:shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none mt-6"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <span>Create Account & Continue</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Terms Notice */}
                        <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                            By joining, you agree to our{" "}
                            <Link href="/privacy" className="text-primary hover:underline font-bold">
                                Terms & Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] dark:bg-[#08080c]">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            }
        >
            <SignupPageInner />
        </Suspense>
    );
}
