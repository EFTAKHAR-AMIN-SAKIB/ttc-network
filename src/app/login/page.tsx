"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    CheckCircle,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Quote,
    UserPlus,
    X,
    ArrowLeft,
    MailCheck,
    KeyRound,
} from "lucide-react";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
} from "firebase/auth";
import { getAuthInstance } from "@/lib/firebase";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/contexts/ToastContext";

// ═══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════

const FloatingInput = ({ label, icon: Icon, type, value, onChange, error, ...props }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <div className="relative group/input space-y-1">
            <div className={`
                relative flex items-center transition-all duration-300 rounded-2xl border-2
                ${focused ? "border-primary bg-white shadow-xl shadow-red-500/5" : "border-gray-100 bg-gray-50/50"}
                ${error ? "border-red-500 bg-red-50/10" : ""}
            `}>
                <div className={`pl-4 transition-colors ${focused ? "text-primary" : "text-gray-400"}`}>
                    <Icon size={18} />
                </div>
                <div className="relative flex-grow">
                    <input
                        {...props}
                        type={type}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full px-3 py-4 bg-transparent border-none focus:ring-0 text-navy-900 font-bold placeholder-transparent peer"
                    />
                    <label className={`
                        absolute left-3 transition-all cursor-text pointer-events-none
                        ${focused || value ? "-top-2 text-[10px] bg-white px-2 text-primary font-black uppercase tracking-widest" : "top-4 text-sm text-gray-400 font-bold"}
                    `}>
                        {label}
                    </label>
                </div>
            </div>
            {error && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-4">{error}</p>}
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

function LoginPageInner() {
    const router = useRouter();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const rawRedirect = searchParams.get("redirect") || "/";
    // Sanitize redirect: only allow relative paths (prevent open redirect)
    const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
    const { siteName, logoUrl } = useSiteSettings();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [isCapsLocked, setIsCapsLocked] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotError, setForgotError] = useState("");

    // Redirect already-logged-in users away from login page
    useEffect(() => {
        const auth = getAuthInstance();
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is already signed in — redirect them away
                router.replace(redirectTo === "/" ? `/network?tab=discover` : redirectTo);
            } else {
                // Not signed in — show the login form
                setCheckingAuth(false);
            }
        });
        return () => unsub();
    }, [router, redirectTo]);

    // Caps Lock Detection
    const checkCapsLock = (e: any) => {
        if (e.getModifierState && e.getModifierState("CapsLock")) {
            setIsCapsLocked(true);
        } else {
            setIsCapsLocked(false);
        }
    };

    // While checking if user is already logged in, show a loading spinner
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const auth = getAuthInstance();
            const cred = await signInWithEmailAndPassword(auth, email, password);
            showToast("Welcome back!", "success");
            router.push(redirectTo === "/" ? `/network?tab=discover` : redirectTo);
        } catch (err: any) {
            showToast(err.message || "Invalid credentials", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim()) {
            setForgotError("Please enter your email address");
            return;
        }
        setForgotLoading(true);
        setForgotError("");
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.trim() }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Failed to send reset email");
            }
            
            setForgotSent(true);
        } catch (err: any) {
            setForgotError(err.message || "Something went wrong. Please try again.");
        } finally {
            setForgotLoading(false);
        }
    };

    const openForgotModal = () => {
        setForgotEmail(email); // Pre-fill from login form
        setForgotSent(false);
        setForgotError("");
        setForgotOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-0 lg:p-6 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-7xl bg-white dark:bg-[#0c0c10] rounded-none lg:rounded-[3rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-screen lg:min-h-[85vh]"
            >
                {/* ═══════════ LEFT PANEL (ASSET) ═══════════ */}
                <div className="hidden lg:flex lg:w-3/5 bg-navy-900 relative p-20 flex-col justify-between overflow-hidden">
                   {/* Animated grain/noise overlay */}
                   <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
                   <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                   <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />

                   <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-16">
                         <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
                            <Image src={logoUrl} alt={siteName} width={40} height={40} className="invert" />
                         </div>
                         <h2 className="text-2xl font-black text-white tracking-tight">{siteName}</h2>
                      </div>
                      
                      <h1 className="text-6xl font-black text-white leading-[1.1] mb-8">
                         The Gateway to <br/>
                         Bangladeshi <br/>
                         <span className="text-primary italic-serif">Educators.</span>
                      </h1>
                   </div>

                   <div className="relative z-10 max-w-md">
                      <div className="p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 space-y-4">
                         <Quote className="w-10 h-10 text-primary opacity-50" />
                         <p className="text-xl text-white/80 font-medium leading-relaxed italic font-bengali">
                            "শিক্ষাই জাতির মেরুদণ্ড, আর শিক্ষকরা হলেন সেই মেরুদণ্ডের কারিগর।"
                         </p>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40" />
                            <div>
                               <p className="text-sm font-black text-white">Inspired by Thousands</p>
                               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Global TTC Network</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* ═══════════ RIGHT PANEL (FORM) ═══════════ */}
                <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center relative bg-white dark:bg-[#0c0c10]">
                   <div className="max-w-md mx-auto w-full space-y-10">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest mb-4">
                           <ShieldCheck className="w-3 h-3" />
                           Secure Access
                        </div>
                        <h2 className="text-4xl font-black text-navy-900 tracking-tight mb-2">Login to your account</h2>
                        <p className="text-gray-400 font-bold">Don't have an account yet? <button onClick={() => router.push('/signup')} className="text-primary hover:underline">Join the community</button></p>
                      </div>

                      <form onSubmit={handleSignIn} className="space-y-6" onKeyDown={checkCapsLock}>
                         <FloatingInput 
                            label="Email Address"
                            icon={Mail}
                            type="email"
                            value={email}
                            onChange={(e: any) => setEmail(e.target.value)}
                            required
                         />

                         <div className="relative">
                            <FloatingInput 
                                label="Secret Password"
                                icon={Lock}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e: any) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[1.35rem] text-gray-300 hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            {isCapsLocked && (
                                <div className="absolute right-0 -bottom-6 flex items-center gap-1.5 text-amber-500">
                                   <AlertCircle size={10} />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Caps Lock ON</span>
                                </div>
                            )}
                         </div>

                         <div className="flex items-center justify-between pt-2">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative w-5 h-5">
                                   <input 
                                     type="checkbox" 
                                     checked={rememberMe}
                                     onChange={() => setRememberMe(!rememberMe)}
                                     className="sr-only" 
                                   />
                                   <div className={`
                                      w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center
                                      ${rememberMe ? "bg-primary border-primary" : "border-gray-200 group-hover:border-primary"}
                                   `}>
                                      {rememberMe && <CheckCircle size={12} className="text-white" />}
                                   </div>
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-navy-900 transition-colors">Keep me signed in</span>
                             </label>
                             <button type="button" onClick={openForgotModal} className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">Forgot password?</button>
                         </div>

                          <button 
                             disabled={loading}
                             type="submit"
                             className="w-full py-5 bg-navy-900 text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 group/btn hover:bg-black transition-all active:scale-95 shadow-xl shadow-navy-900/10"
                          >
                             {loading ? <Loader2 className="animate-spin" /> : (
                                 <>
                                    Access Dashboard
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                 </>
                             )}
                          </button>

                          {/* Divider */}
                          <div className="flex items-center gap-4 py-2">
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Or</span>
                            <div className="flex-1 h-px bg-gray-100" />
                          </div>

                          {/* Sign Up Button */}
                          <button
                             type="button"
                             onClick={() => router.push('/signup')}
                             className="w-full py-5 bg-transparent border-2 border-gray-200 text-navy-900 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 group/btn hover:border-primary hover:text-primary transition-all active:scale-95"
                          >
                             Create Account
                             <UserPlus size={20} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                      </form>
                   </div>
                </div>
            </motion.div>

            {/* ═══════════ FORGOT PASSWORD MODAL ═══════════ */}
            <AnimatePresence>
                {forgotOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setForgotOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-white dark:bg-[#1a1b23] rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="relative px-8 pt-8 pb-4">
                                <button
                                    onClick={() => setForgotOpen(false)}
                                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={18} className="text-gray-400" />
                                </button>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                                    forgotSent 
                                        ? "bg-green-50 dark:bg-green-500/10" 
                                        : "bg-primary/10 dark:bg-primary/20"
                                }`}>
                                    {forgotSent 
                                        ? <MailCheck size={24} className="text-green-500" />
                                        : <KeyRound size={24} className="text-primary" />
                                    }
                                </div>
                                <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">
                                    {forgotSent ? "Check your inbox" : "Reset your password"}
                                </h3>
                                <p className="text-sm text-gray-400 font-medium mt-1">
                                    {forgotSent 
                                        ? `We've sent a password reset link to` 
                                        : "Enter your email and we'll send you a reset link"
                                    }
                                </p>
                                {forgotSent && (
                                    <p className="text-sm font-bold text-navy-900 dark:text-white mt-1">{forgotEmail}</p>
                                )}
                            </div>

                            {/* Body */}
                            <div className="px-8 pb-8">
                                {forgotSent ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-100 dark:border-green-500/20">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-green-800 dark:text-green-400">Email sent successfully!</p>
                                                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">Check your inbox and spam folder. The link expires in 1 hour.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setForgotSent(false); setForgotError(""); }}
                                                className="flex-1 py-3.5 border-2 border-gray-200 dark:border-gray-700 text-navy-900 dark:text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:border-primary transition-all"
                                            >
                                                <ArrowLeft size={16} /> Try another email
                                            </button>
                                            <button
                                                onClick={() => setForgotOpen(false)}
                                                className="flex-1 py-3.5 bg-navy-900 dark:bg-white text-white dark:text-navy-900 rounded-2xl font-bold text-sm hover:bg-black dark:hover:bg-gray-100 transition-all"
                                            >
                                                Back to login
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <div>
                                            <div className={`relative flex items-center transition-all duration-300 rounded-2xl border-2 ${
                                                forgotError ? "border-red-500 bg-red-50/10" : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus-within:border-primary focus-within:bg-white dark:focus-within:bg-[#1a1b23] focus-within:shadow-xl focus-within:shadow-primary/5"
                                            }`}>
                                                <div className="pl-4 text-gray-400">
                                                    <Mail size={18} />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={forgotEmail}
                                                    onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                                                    placeholder="Enter your email address"
                                                    className="w-full px-3 py-4 bg-transparent border-none focus:ring-0 focus:outline-none text-navy-900 dark:text-white font-bold placeholder-gray-400 text-sm"
                                                    autoFocus
                                                />
                                            </div>
                                            {forgotError && (
                                                <motion.p 
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-4 mt-2 flex items-center gap-1.5"
                                                >
                                                    <AlertCircle size={10} /> {forgotError}
                                                </motion.p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                                        >
                                            {forgotLoading ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : (
                                                <>
                                                    Send reset link
                                                    <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForgotOpen(false)}
                                            className="w-full py-3 text-sm font-bold text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors"
                                        >
                                            Back to login
                                        </button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3]">
                <Loader2 className="animate-spin text-primary" />
            </div>
        }>
            <LoginPageInner />
        </Suspense>
    );
}
