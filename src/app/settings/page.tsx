"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    Shield,
    Mail,
    User,
    Trash2,
    Eye,
    EyeOff,
    Lock,
    Loader2,
    Check,
    X,
    AlertTriangle,
    Info,
    Home,
    ChevronRight,
    Save,
    BadgeCheck,
    Calendar,
    Building2,
    AtSign,
} from "lucide-react";
import {
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword,
    verifyBeforeUpdateEmail,
    updateProfile,
    deleteUser,
} from "firebase/auth";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getAuthInstance, getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

// ═══════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════

const ROLE_LABELS: Record<string, string> = {
    student: "Student",
    teacher: "Teacher",
    manager: "Manager",
    super_manager: "Super Manager",
    admin: "Administrator",
};

interface PasswordRequirement {
    label: string;
    test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw) => /\d/.test(pw) },
    { label: "One special character (!@#$...)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string; barColor: string } {
    if (!pw) return { score: 0, label: "", color: "", barColor: "bg-gray-200 dark:bg-gray-700" };
    const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(pw)).length;
    if (passed <= 1) return { score: 1, label: "Weak", color: "text-red-500", barColor: "bg-red-500" };
    if (passed <= 2) return { score: 2, label: "Fair", color: "text-orange-500", barColor: "bg-orange-500" };
    if (passed <= 3) return { score: 3, label: "Good", color: "text-yellow-500", barColor: "bg-yellow-500" };
    if (passed === 4) return { score: 4, label: "Strong", color: "text-lime-500", barColor: "bg-lime-500" };
    return { score: 5, label: "Very Strong", color: "text-emerald-500", barColor: "bg-emerald-500" };
}

// ═══════════════════════════════════════════════════
//  ANIMATION VARIANTS
// ═══════════════════════════════════════════════════

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

const modalOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const modalContentVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 350 } },
    exit: { opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.2 } },
};

// ═══════════════════════════════════════════════════
//  REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    showToggle?: boolean;
    toggleState?: boolean;
    onToggle?: () => void;
    readOnly?: boolean;
}

function InputField({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    disabled = false,
    icon,
    showToggle = false,
    toggleState = false,
    onToggle,
    readOnly = false,
}: InputFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        {icon}
                    </div>
                )}
                <input
                    type={showToggle ? (toggleState ? "text" : "password") : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    className={`
                        w-full rounded-2xl border-2 px-4 py-3.5 font-bold text-navy-900 dark:text-white
                        bg-white dark:bg-white/5
                        border-gray-200 dark:border-white/10
                        focus:border-primary focus:ring-4 focus:ring-primary/10 dark:focus:ring-primary/20
                        placeholder:text-gray-400 dark:placeholder:text-gray-600
                        transition-all duration-200 outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        read-only:bg-gray-50 dark:read-only:bg-white/[0.03] read-only:cursor-default
                        ${icon ? "pl-12" : ""}
                        ${showToggle ? "pr-12" : ""}
                    `}
                />
                {showToggle && onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        {toggleState ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
}

interface SectionCardProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
    children: React.ReactNode;
    danger?: boolean;
}

function SectionCard({ icon, iconBg, title, description, children, danger = false }: SectionCardProps) {
    return (
        <div
            className={`
                bg-white dark:bg-[#16181C] rounded-3xl shadow-sm
                border ${danger
                    ? "border-red-200 dark:border-red-500/20"
                    : "border-gray-100 dark:border-white/[0.06]"
                }
                overflow-hidden
            `}
        >
            {/* Section Header */}
            <div className={`
                px-6 py-5 sm:px-8 sm:py-6
                border-b ${danger
                    ? "border-red-100 dark:border-red-500/10 bg-red-50/50 dark:bg-red-500/[0.03]"
                    : "border-gray-100 dark:border-white/[0.06]"
                }
            `}>
                <div className="flex items-center gap-4">
                    <div className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
                        ${iconBg}
                    `}>
                        {icon}
                    </div>
                    <div>
                        <h2 className={`text-lg font-extrabold ${danger ? "text-red-600 dark:text-red-400" : "text-navy-900 dark:text-white"}`}>
                            {title}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
            {/* Section Body */}
            <div className="px-6 py-6 sm:px-8 sm:py-7">
                {children}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
//  DELETE ACCOUNT MODAL
// ═══════════════════════════════════════════════════

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    userUid: string;
    onDeleted: () => void;
}

function DeleteAccountModal({ isOpen, onClose, userEmail, userUid, onDeleted }: DeleteModalProps) {
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { showToast } = useToast();

    // Reset when opened/closed
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setPassword("");
            setConfirmEmail("");
            setShowPw(false);
            setLoading(false);
            setError("");
        }
    }, [isOpen]);

    const handleDelete = async () => {
        setLoading(true);
        setError("");
        try {
            const auth = getAuthInstance();
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error("Not authenticated");

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // Delete Firestore document
            const db = getDb();
            await deleteDoc(doc(db, "users", userUid));

            // Delete Firebase Auth account
            await deleteUser(user);

            showToast("Your account has been permanently deleted.", "success");
            onDeleted();
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
                setError("Incorrect password. Please try again.");
            } else if (firebaseError.code === "auth/too-many-requests") {
                setError("Too many attempts. Please wait and try again later.");
            } else {
                setError(firebaseError.message || "Failed to delete account. Please try again.");
            }
            setLoading(false);
        }
    };

    const TOTAL_STEPS = 4;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={modalOverlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        variants={modalContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#1a1c2e] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-red-100 dark:border-red-500/10 bg-red-50/60 dark:bg-red-500/[0.05] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold text-red-600 dark:text-red-400">
                                        Delete Account
                                    </h3>
                                    <p className="text-xs text-red-400 dark:text-red-500">
                                        Step {step} of {TOTAL_STEPS}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/10 text-red-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 bg-red-100 dark:bg-red-500/10">
                            <motion.div
                                className="h-full bg-red-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-6">
                            <AnimatePresence mode="wait">
                                {/* Step 1: Warning */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/20 rounded-2xl p-4">
                                            <h4 className="font-bold text-red-700 dark:text-red-400 mb-2">
                                                This action is permanent and cannot be undone.
                                            </h4>
                                            <ul className="text-sm text-red-600 dark:text-red-400/80 space-y-1.5">
                                                <li className="flex items-start gap-2">
                                                    <X size={14} className="mt-0.5 flex-shrink-0" />
                                                    Your profile, posts, and all associated data will be permanently erased
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <X size={14} className="mt-0.5 flex-shrink-0" />
                                                    Your username will be released and available for others
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <X size={14} className="mt-0.5 flex-shrink-0" />
                                                    Any uploaded files and media will be deleted
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <X size={14} className="mt-0.5 flex-shrink-0" />
                                                    You will be immediately logged out
                                                </li>
                                            </ul>
                                        </div>
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors"
                                        >
                                            I understand, continue
                                        </button>
                                    </motion.div>
                                )}

                                {/* Step 2: Password */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Enter your password to verify your identity.
                                        </p>
                                        <InputField
                                            label="Password"
                                            value={password}
                                            onChange={setPassword}
                                            type="password"
                                            placeholder="Enter your current password"
                                            icon={<Lock size={18} />}
                                            showToggle
                                            toggleState={showPw}
                                            onToggle={() => setShowPw(!showPw)}
                                        />
                                        {error && (
                                            <p className="text-sm text-red-500 font-medium">{error}</p>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setStep(1); setError(""); }}
                                                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={() => { if (password.length > 0) { setStep(3); setError(""); } }}
                                                disabled={!password}
                                                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold transition-colors"
                                            >
                                                Continue
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 3: Confirm Email */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Type <span className="font-bold text-navy-900 dark:text-white">{userEmail}</span> to confirm.
                                        </p>
                                        <InputField
                                            label="Confirm Email"
                                            value={confirmEmail}
                                            onChange={setConfirmEmail}
                                            placeholder={userEmail}
                                            icon={<Mail size={18} />}
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep(2)}
                                                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={() => { if (confirmEmail === userEmail) setStep(4); }}
                                                disabled={confirmEmail !== userEmail}
                                                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold transition-colors"
                                            >
                                                Continue
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 4: Final Delete */}
                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-5"
                                    >
                                        <div className="text-center space-y-3">
                                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto">
                                                <Trash2 size={28} className="text-red-500" />
                                            </div>
                                            <h4 className="text-lg font-extrabold text-red-600 dark:text-red-400">
                                                Final Confirmation
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Click the button below to permanently delete your account. There is no going back.
                                            </p>
                                        </div>
                                        {error && (
                                            <p className="text-sm text-red-500 font-medium text-center">{error}</p>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep(3)}
                                                disabled={loading}
                                                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                                            >
                                                Go Back
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                disabled={loading}
                                                className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Deleting…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={18} />
                                                        Delete Forever
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ═══════════════════════════════════════════════════
//  MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════

export default function SettingsPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const { showToast } = useToast();

    // ─── Redirect if not authenticated ───
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/login");
        }
    }, [authLoading, user, router]);

    // ─── Change Password State ───
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    // ─── Email State ───
    const [newEmail, setNewEmail] = useState("");
    const [emailPw, setEmailPw] = useState("");
    const [showEmailPw, setShowEmailPw] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    // ─── Profile State ───
    const [displayName, setDisplayName] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);

    // ─── Delete Modal ───
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Sync displayName from profile
    useEffect(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
    }, [profile?.displayName]);

    // Password strength memoized
    const strength = useMemo(() => getPasswordStrength(newPw), [newPw]);
    const requirements = useMemo(
        () => PASSWORD_REQUIREMENTS.map((r) => ({ ...r, met: r.test(newPw) })),
        [newPw]
    );
    const passwordsMatch = newPw.length > 0 && confirmPw.length > 0 && newPw === confirmPw;
    const canSubmitPw = currentPw.length > 0 && strength.score >= 4 && passwordsMatch;

    // ─── Handlers ───

    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!user?.email || !canSubmitPw) return;
        setPwLoading(true);
        try {
            const auth = getAuthInstance();
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Not authenticated");

            const credential = EmailAuthProvider.credential(currentUser.email!, currentPw);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPw);

            showToast("Password updated successfully!", "success");
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
            setShowCurrentPw(false);
            setShowNewPw(false);
            setShowConfirmPw(false);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
                showToast("Current password is incorrect.", "error");
            } else if (firebaseError.code === "auth/too-many-requests") {
                showToast("Too many attempts. Please wait and try again.", "error");
            } else if (firebaseError.code === "auth/weak-password") {
                showToast("Password is too weak. Please choose a stronger one.", "error");
            } else {
                showToast(firebaseError.message || "Failed to update password.", "error");
            }
        } finally {
            setPwLoading(false);
        }
    };

    const handleChangeEmail = async (e: FormEvent) => {
        e.preventDefault();
        if (!user?.email || !newEmail || !emailPw) return;
        setEmailLoading(true);
        try {
            const auth = getAuthInstance();
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Not authenticated");

            const credential = EmailAuthProvider.credential(currentUser.email!, emailPw);
            await reauthenticateWithCredential(currentUser, credential);
            
            const response = await fetch('/api/auth/change-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email, newEmail }),
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to send verification email");
            }

            showToast(
                "Verification email sent to " + newEmail + ". Please click the link to confirm your new email.",
                "success"
            );
            setNewEmail("");
            setEmailPw("");
            setShowEmailPw(false);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
                showToast("Password is incorrect.", "error");
            } else if (firebaseError.code === "auth/email-already-in-use") {
                showToast("That email address is already in use.", "error");
            } else if (firebaseError.code === "auth/invalid-email") {
                showToast("Please enter a valid email address.", "error");
            } else if (firebaseError.code === "auth/too-many-requests") {
                showToast("Too many attempts. Please wait and try again.", "error");
            } else {
                showToast(firebaseError.message || "Failed to update email.", "error");
            }
        } finally {
            setEmailLoading(false);
        }
    };

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !displayName.trim()) return;
        setProfileLoading(true);
        try {
            const auth = getAuthInstance();
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Not authenticated");

            // Update Firebase Auth profile
            await updateProfile(currentUser, { displayName: displayName.trim() });

            // Update Firestore user document
            const db = getDb();
            await updateDoc(doc(db, "users", user.uid), {
                displayName: displayName.trim(),
                updatedAt: serverTimestamp(),
            });

            await refreshProfile();
            showToast("Profile updated successfully!", "success");
        } catch (err: unknown) {
            const firebaseError = err as { message?: string };
            showToast(firebaseError.message || "Failed to update profile.", "error");
        } finally {
            setProfileLoading(false);
        }
    };

    const handleAccountDeleted = () => {
        setDeleteModalOpen(false);
        router.replace("/");
    };

    // ─── Loading / Auth Guard ───

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-[#0A0A0A]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 size={36} className="animate-spin text-primary" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Loading settings…
                    </p>
                </motion.div>
            </div>
        );
    }

    if (!user) return null;

    const memberSince = user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "—";

    return (
        <>
            <div className="min-h-screen bg-gray-50/50 dark:bg-[#0A0A0A]">
                {/* ═══ Page Header ═══ */}
                <div className="bg-white dark:bg-[#16181C] border-b border-gray-100 dark:border-white/[0.06]">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-1.5 text-sm mb-5">
                            <Link
                                href="/"
                                className="flex items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors font-medium"
                            >
                                <Home size={14} />
                                Home
                            </Link>
                            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                            <span className="text-navy-900 dark:text-white font-bold">Settings</span>
                        </nav>

                        {/* Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5 flex items-center justify-center">
                                <Settings size={26} className="text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 dark:text-white tracking-tight">
                                    Account Settings
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Manage your account security, email, and preferences
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ Content ═══ */}
                <div
                    className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6"
                >
                    {/* ═══════════════════════════════════════════
                         SECTION 1: CHANGE PASSWORD
                         ═══════════════════════════════════════════ */}
                    <SectionCard
                        icon={<Shield size={20} className="text-blue-600 dark:text-blue-400" />}
                        iconBg="bg-blue-100 dark:bg-blue-500/20"
                        title="Account Security"
                        description="Change your password to keep your account secure"
                    >
                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <InputField
                                label="Current Password"
                                value={currentPw}
                                onChange={setCurrentPw}
                                type="password"
                                placeholder="Enter your current password"
                                icon={<Lock size={18} />}
                                showToggle
                                toggleState={showCurrentPw}
                                onToggle={() => setShowCurrentPw(!showCurrentPw)}
                            />

                            <div className="space-y-3">
                                <InputField
                                    label="New Password"
                                    value={newPw}
                                    onChange={setNewPw}
                                    type="password"
                                    placeholder="Choose a strong password"
                                    icon={<Lock size={18} />}
                                    showToggle
                                    toggleState={showNewPw}
                                    onToggle={() => setShowNewPw(!showNewPw)}
                                />

                                {/* Strength Bar */}
                                {newPw.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                Strength
                                            </span>
                                            <span className={`text-xs font-extrabold ${strength.color}`}>
                                                {strength.label}
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${strength.barColor}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(strength.score / 5) * 100}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <InputField
                                label="Confirm New Password"
                                value={confirmPw}
                                onChange={setConfirmPw}
                                type="password"
                                placeholder="Re-enter your new password"
                                icon={<Lock size={18} />}
                                showToggle
                                toggleState={showConfirmPw}
                                onToggle={() => setShowConfirmPw(!showConfirmPw)}
                            />

                            {/* Mismatch warning */}
                            {confirmPw.length > 0 && newPw !== confirmPw && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-red-500 font-medium flex items-center gap-1.5"
                                >
                                    <X size={14} />
                                    Passwords do not match
                                </motion.p>
                            )}

                            {/* Requirements Checklist */}
                            {newPw.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06]"
                                >
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                                        Requirements
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {requirements.map((req) => (
                                            <div
                                                key={req.label}
                                                className={`flex items-center gap-2 text-sm transition-colors ${
                                                    req.met
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-gray-400 dark:text-gray-500"
                                                }`}
                                            >
                                                {req.met ? (
                                                    <Check size={14} className="flex-shrink-0" />
                                                ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                                                )}
                                                <span className={req.met ? "font-semibold" : "font-medium"}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={!canSubmitPw || pwLoading}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-navy-900 hover:bg-navy-900/90 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-navy-900 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {pwLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Updating…
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Update Password
                                    </>
                                )}
                            </button>
                        </form>
                    </SectionCard>

                    {/* ═══════════════════════════════════════════
                         SECTION 2: EMAIL SETTINGS
                         ═══════════════════════════════════════════ */}
                    <SectionCard
                        icon={<Mail size={20} className="text-violet-600 dark:text-violet-400" />}
                        iconBg="bg-violet-100 dark:bg-violet-500/20"
                        title="Email Settings"
                        description="Update the email address associated with your account"
                    >
                        <form onSubmit={handleChangeEmail} className="space-y-5">
                            {/* Current email display */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Current Email
                                </label>
                                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border-2 border-gray-200 dark:border-white/10">
                                    <Mail size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span className="font-bold text-navy-900 dark:text-white">
                                        {user.email || "—"}
                                    </span>
                                    <BadgeCheck size={16} className="text-emerald-500 ml-auto" />
                                </div>
                            </div>

                            <InputField
                                label="New Email Address"
                                value={newEmail}
                                onChange={setNewEmail}
                                type="email"
                                placeholder="Enter your new email address"
                                icon={<Mail size={18} />}
                            />

                            <InputField
                                label="Current Password"
                                value={emailPw}
                                onChange={setEmailPw}
                                type="password"
                                placeholder="Required for verification"
                                icon={<Lock size={18} />}
                                showToggle
                                toggleState={showEmailPw}
                                onToggle={() => setShowEmailPw(!showEmailPw)}
                            />

                            {/* Info box */}
                            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/[0.08] border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    A verification email will be sent to your new address. Your email won&apos;t change
                                    until you click the verification link. The link expires in 24 hours.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={!newEmail || !emailPw || emailLoading}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-navy-900 hover:bg-navy-900/90 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-navy-900 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {emailLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <Mail size={18} />
                                        Send Verification Email
                                    </>
                                )}
                            </button>
                        </form>
                    </SectionCard>

                    {/* ═══════════════════════════════════════════
                         SECTION 3: PROFILE QUICK SETTINGS
                         ═══════════════════════════════════════════ */}
                    <SectionCard
                        icon={<User size={20} className="text-emerald-600 dark:text-emerald-400" />}
                        iconBg="bg-emerald-100 dark:bg-emerald-500/20"
                        title="Profile Quick Settings"
                        description="Update your display name and view account details"
                    >
                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                            <InputField
                                label="Display Name"
                                value={displayName}
                                onChange={setDisplayName}
                                placeholder="Your display name"
                                icon={<User size={18} />}
                            />

                            {/* Read-only info grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                {[
                                    {
                                        label: "Role",
                                        value: profile?.role ? ROLE_LABELS[profile.role] || profile.role : "—",
                                        icon: <BadgeCheck size={16} />,
                                    },
                                    {
                                        label: "College ID",
                                        value: profile?.collegeId || "Not set",
                                        icon: <Building2 size={16} />,
                                    },
                                    {
                                        label: "Username",
                                        value: profile?.username ? `@${profile.username}` : "Not set",
                                        icon: <AtSign size={16} />,
                                    },
                                    {
                                        label: "Member Since",
                                        value: memberSince,
                                        icon: <Calendar size={16} />,
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.06]"
                                    >
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1.5">
                                            <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                                            {item.label}
                                        </p>
                                        <p className="font-bold text-navy-900 dark:text-white truncate">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={!displayName.trim() || displayName.trim() === profile?.displayName || profileLoading}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-navy-900 hover:bg-navy-900/90 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-navy-900 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {profileLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </form>
                    </SectionCard>

                    {/* ═══════════════════════════════════════════
                         SECTION 4: DANGER ZONE
                         ═══════════════════════════════════════════ */}
                    <SectionCard
                        icon={<Trash2 size={20} className="text-red-500" />}
                        iconBg="bg-red-100 dark:bg-red-500/20"
                        title="Danger Zone"
                        description="Irreversible actions that affect your entire account"
                        danger
                    >
                        <div className="space-y-4">
                            <div className="bg-red-50/50 dark:bg-red-500/[0.05] border border-red-200 dark:border-red-500/15 rounded-2xl p-4">
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    Deleting your account will permanently remove all your data, including your profile,
                                    posts, uploaded files, and any other content. This action <strong>cannot be undone</strong>.
                                </p>
                            </div>
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="px-8 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete My Account
                            </button>
                        </div>
                    </SectionCard>

                    {/* Bottom spacer */}
                    <div className="h-8" />
                </div>
            </div>

            {/* Delete Modal */}
            <DeleteAccountModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                userEmail={user.email || ""}
                userUid={user.uid}
                onDeleted={handleAccountDeleted}
            />
        </>
    );
}
