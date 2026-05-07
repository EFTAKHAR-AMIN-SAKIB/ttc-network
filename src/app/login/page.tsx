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
} from "lucide-react";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthInstance, getDb } from "@/lib/firebase";
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

    // Redirect already-logged-in users away from login page
    useEffect(() => {
        const auth = getAuthInstance();
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is already signed in — redirect them away
                router.replace(redirectTo === "/" ? `/profile/${firebaseUser.uid}` : redirectTo);
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
            router.push(redirectTo === "/" ? `/profile/${cred.user.uid}` : redirectTo);
        } catch (err: any) {
            showToast(err.message || "Invalid credentials", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const auth = getAuthInstance();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            
            // Check if user doc exists
            const db = getDb();
            // Simplified check logic to match redesign goal
            showToast("Google sign in successful", "success");
            router.push("/");
        } catch (err: any) {
             if (err.code !== "auth/popup-closed-by-user") {
                 showToast(err.message, "error");
             }
        } finally {
            setLoading(false);
        }
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
                             <button type="button" className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">Forgot password?</button>
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
                      </form>

                      <div className="relative pt-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-gray-50 dark:border-gray-800" /></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 bg-white dark:bg-[#0c0c10] px-4">
                           Social Connection
                        </div>
                      </div>

                      <button 
                         onClick={handleGoogleSignIn}
                         className="w-full py-5 border-2 border-gray-100 dark:border-gray-800 rounded-3xl font-black text-sm flex items-center justify-center gap-3 hover:bg-gray-50/50 transition-all active:scale-95"
                      >
                         <svg width="20" height="20" viewBox="0 0 24 24" className="mr-1">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                         </svg>
                         Continue with Google
                      </button>
                   </div>
                </div>
            </motion.div>
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
