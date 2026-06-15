"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
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
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════

const FloatingInput = ({ label, icon: Icon, type, value, onChange, error, success, status, ...props }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <div className="relative group/input space-y-1">
            <div className={`
                relative flex items-center transition-all duration-300 rounded-2xl border-2
                ${focused ? "border-primary bg-white shadow-xl shadow-red-500/5" : "border-gray-100 bg-gray-50/50"}
                ${error ? "border-red-500 bg-red-50/10" : ""}
                ${success ? "border-emerald-500 bg-emerald-50/10" : ""}
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
                {status === 'checking' && <Loader2 size={16} className="animate-spin text-gray-400 mr-4" />}
                {success && <CheckCircle size={16} className="text-emerald-500 mr-4" />}
                {error && <XCircle size={16} className="text-red-500 mr-4" />}
            </div>
            {error && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-4">{error}</p>}
        </div>
    );
};

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

function SignupPageInner() {
    const router = useRouter();
    const { showToast } = useToast();
    const { siteName, logoUrl } = useSiteSettings();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Username Status
    const [uStatus, setUStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
    const [uError, setUError] = useState("");

    useEffect(() => {
        const trimmed = username.trim().toLowerCase();
        if (!trimmed) { setUStatus("idle"); return; }
        
        const val = validateUsername(trimmed);
        if (!val.valid) {
            setUStatus("invalid");
            setUError(val.error || "Invalid username");
            return;
        }

        setUStatus("checking");
        const t = setTimeout(async () => {
            const avail = await isUsernameAvailable(trimmed);
            setUStatus(avail ? "available" : "taken");
            setUError(avail ? "" : "Username is taken");
        }, 500);
        return () => clearTimeout(t);
    }, [username]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (uStatus !== 'available') {
            showToast("Please choose a valid username", "error");
            return;
        }

        setLoading(true);
        try {
            const auth = getAuthInstance();
            const db = getDb();
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            
            // Claim username
            await claimUsername(cred.user.uid, username.toLowerCase());

            await setDoc(doc(db, "users", cred.user.uid), {
                uid: cred.user.uid,
                email,
                displayName: name,
                username: username.toLowerCase(),
                photoURL: "",
                bannerURL: "",
                role: "student",
                roleVerified: false,
                collegeId: "",
                programme: "BEdHonours",
                onboardingCompleted: false,
                year: "",
                semester: "",
                bio: "",
                achievements: "",
                goals: "",
                skills: [],
                website: "",
                education: "",
                workExperience: "",
                createdAt: serverTimestamp(),
            }, { merge: true });

            showToast("Account created! Let's finish up.", "success");
            router.push("/onboarding");
        } catch (err: any) {
            showToast(err.message || "Registration failed", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-0 lg:p-6 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-7xl bg-white dark:bg-[#0c0c10] rounded-none lg:rounded-[3rem] shadow-2xl flex flex-col lg:flex-row-reverse overflow-hidden min-h-screen lg:min-h-[85vh]"
            >
                {/* ═══════════ RIGHT PANEL (ASSET) ═══════════ */}
                <div className="hidden lg:flex lg:w-3/5 bg-navy-900 relative p-20 flex-col justify-between overflow-hidden">
                   <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
                   <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                   <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />

                   <div className="relative z-10 text-right">
                      <div className="flex items-center justify-end gap-4 mb-16">
                         <h2 className="text-2xl font-black text-white tracking-tight">{siteName}</h2>
                         <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
                            <Image src={logoUrl} alt={siteName} width={40} height={40} className="invert" />
                         </div>
                      </div>
                      
                      <h1 className="text-6xl font-black text-white leading-[1.1] mb-8">
                         Join the <br/>
                         Next Generation of <br/>
                         <span className="text-primary italic-serif">Teachers.</span>
                      </h1>
                   </div>

                   <div className="relative z-10 self-end max-w-md text-right">
                      <div className="p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 space-y-4">
                         <div className="flex justify-end"><Sparkles className="w-10 h-10 text-primary opacity-50" /></div>
                         <p className="text-lg text-white/80 font-medium leading-relaxed italic">
                            "Connecting educators, sharing experiences, and building a stronger teaching community together."
                         </p>
                         <p className="text-xs font-black text-white/40 uppercase tracking-widest">Global TTC Mission</p>
                      </div>
                   </div>
                </div>

                {/* ═══════════ LEFT PANEL (FORM) ═══════════ */}
                <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center relative bg-white dark:bg-[#0c0c10]">
                   <div className="max-w-md mx-auto w-full space-y-10">
                      <div>
                        <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-xs font-black text-gray-300 hover:text-navy-900 transition-colors uppercase tracking-widest mb-8">
                           <ChevronLeft size={16} /> Back to login
                        </button>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest mb-4">
                           <ShieldCheck className="w-3 h-3" />
                           Create Account
                        </div>
                        <h2 className="text-4xl font-black text-navy-900 tracking-tight mb-2">Build your legacy.</h2>
                        <p className="text-gray-400 font-bold">Already part of us? <button onClick={() => router.push('/login')} className="text-primary hover:underline">Sign In</button></p>
                      </div>

                      <form onSubmit={handleSignUp} className="space-y-4">
                         <FloatingInput 
                            label="Full Name"
                            icon={User}
                            type="text"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            required
                         />

                         <FloatingInput 
                            label="Username"
                            icon={AtSign}
                            type="text"
                            value={username}
                            onChange={(e: any) => setUsername(e.target.value.replace(/\s/g, ''))}
                            status={uStatus}
                            success={uStatus === 'available'}
                            error={uStatus === 'taken' || uStatus === 'invalid' ? uError : ""}
                            required
                         />

                         <FloatingInput 
                            label="Email Address"
                            icon={Mail}
                            type="email"
                            value={email}
                            onChange={(e: any) => setEmail(e.target.value)}
                            required
                         />

                         <FloatingInput 
                            label="Create Password"
                            icon={Lock}
                            type="password"
                            value={password}
                            onChange={(e: any) => setPassword(e.target.value)}
                            required
                            minLength={6}
                         />

                         <button 
                            disabled={loading || uStatus !== 'available'}
                            type="submit"
                            className="w-full py-5 bg-navy-900 text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 group/btn hover:bg-black transition-all active:scale-95 shadow-xl shadow-navy-900/10 disabled:opacity-50 mt-8"
                         >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                   Initialize Setup
                                   <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                         </button>
                      </form>

                      <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                         By joining, you agree to our <span className="text-gray-400 underline">Terms of Fellowship</span>
                      </p>
                   </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3]">
                <Loader2 className="animate-spin text-primary" />
            </div>
        }>
            <SignupPageInner />
        </Suspense>
    );
}
