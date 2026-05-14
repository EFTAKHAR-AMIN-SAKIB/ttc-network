"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronRight, ChevronLeft, Sparkles, Check, School, GraduationCap, MapPin, Target, Sparkle, BookOpen } from "lucide-react";
import Image from "next/image";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToCloudinary } from "@/lib/storage";
import { colleges } from "@/data/colleges";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useToast } from "@/contexts/ToastContext";

// ═══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════

const StepProgress = ({ step }: { step: number }) => (
    <div className="flex gap-2 w-full max-w-xs mx-auto mb-12">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: step >= i ? "100%" : "0%" }}
                    className="absolute inset-0 bg-primary"
                />
            </div>
        ))}
    </div>
);

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function OnboardingPage() {
    const router = useRouter();
    const { user, profile, refreshProfile } = useAuth();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form State
    const [displayName, setDisplayName] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");
    
    const [role, setRole] = useState<"student" | "teacher">("student");
    const [programme, setProgramme] = useState<"BEdHonours" | "MEd">("BEdHonours");
    const [year, setYear] = useState("Year 1");
    const [semester, setSemester] = useState("Semester 1");
    const [status, setStatus] = useState<"govt" | "non-govt">("govt");
    const [subjects, setSubjects] = useState(""); // For teachers
    
    const [collegeId, setCollegeId] = useState("");
    
    const [bio, setBio] = useState("");
    const [interests, setInterests] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || "");
            setPhotoPreview(profile.photoURL || "");
            setRole((profile.role as any) || "student");
            setProgramme((profile.programme as any) || "BEdHonours");
            setCollegeId(profile.collegeId || "");
        }
    }, [profile]);

    // Year options based on programme
    const getYears = () => {
        if (programme === "BEdHonours") return ["Year 1", "Year 2", "Year 3", "Year 4"];
        return ["Year 1", "Year 2"]; // M.Ed is 1-2 years
    };

    // Semester options based on programme and year
    const getSemesters = () => {
        if (programme === "BEdHonours") {
            // B.Ed Honours: 4 years, 8 semesters
            if (year === "Year 1") return ["Semester 1", "Semester 2"];
            if (year === "Year 2") return ["Semester 3", "Semester 4"];
            if (year === "Year 3") return ["Semester 5", "Semester 6"];
            if (year === "Year 4") return ["Semester 7", "Semester 8"];
        } else {
            // M.Ed: 1-2 years, 2-4 semesters
            if (year === "Year 1") return ["Semester 1", "Semester 2"];
            if (year === "Year 2") return ["Semester 3", "Semester 4"];
        }
        return [];
    };

    // Reset year when programme changes
    useEffect(() => {
        const years = getYears();
        if (!years.includes(year)) {
            setYear(years[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programme]);

    // Reset semester when year changes
    useEffect(() => {
       const available = getSemesters();
       if (!available.includes(semester)) setSemester(available[0]);
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, programme]);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleFinish = async () => {
        if (!user) return;
        setSaving(true);
        try {
            let photoURL = photoPreview;
            if (photoFile) {
                const res = await uploadToCloudinary(photoFile, "avatars", user.uid);
                photoURL = res.url;
            }

            const db = getDb();
            await setDoc(doc(db, "users", user.uid), {
                displayName,
                photoURL,
                role,
                programme: role === 'student' ? programme : "",
                status: role === 'teacher' ? status : "",
                collegeId,
                year: role === 'student' ? year : "",
                semester: role === 'student' ? semester : "",
                subjects: role === 'teacher' ? subjects : "",
                bio,
                interests,
                onboardingCompleted: true,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            await refreshProfile();
            showToast("Profile ready! Welcome to the network.", "success");
            router.push("/");
        } catch (err) {
            console.error("[Onboarding] Save failed:", err);
            showToast("Failed to save profile", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] dark:bg-[#0c0c10] flex flex-col items-center justify-center p-6 pb-20">
            {/* Header branding */}
            <div className="text-center mb-12">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest mb-4">
                  <Sparkles className="w-4 h-4" />
                  Personalize Your Account
               </div>
               <h1 className="text-4xl font-black text-navy-900 dark:text-gray-100">Welcome to TTC Network</h1>
            </div>

            <StepProgress step={step} />

            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-navy-900/5 p-12 relative overflow-hidden">
               {/* Background accents */}
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <School className="w-32 h-32" />
               </div>

               <AnimatePresence mode="wait">
                  {/* STEP 1: BASICS */}
                  {step === 1 && (
                    <motion.div key="1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                        <div className="text-center">
                            <div className="relative inline-block group">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-2 border-primary rotate-3 transition-transform group-hover:rotate-0 overflow-hidden flex items-center justify-center">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-10 h-10 text-gray-300" />
                                    )}
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 p-3 bg-navy-900 text-white rounded-2xl shadow-lg border-2 border-white dark:border-gray-900 hover:scale-110 transition-transform"
                                >
                                    <Camera size={18} />
                                </button>
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handlePhotoSelect} />
                            </div>
                            <h2 className="text-2xl font-black mt-6">Let&apos;s start with your look</h2>
                            <p className="text-gray-400 font-bold italic mt-1">Classmates recognize you by your face!</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Display Name</label>
                            <input 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full text-2xl font-black border-b-4 border-gray-100 focus:border-primary transition-colors focus:outline-none bg-transparent"
                            />
                        </div>
                    </motion.div>
                  )}

                  {/* STEP 2: ROLE & PROGRAMME */}
                  {step === 2 && (
                    <motion.div key="2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                        <div>
                           <h2 className="text-3xl font-black">What&apos;s your role?</h2>
                           <p className="text-gray-400 font-bold mt-1">This defines your experience across the platform.</p>
                        </div>

                        {/* Role Selector */}
                        <div className="grid grid-cols-2 gap-6">
                           {[
                               { id: "student", label: "Student", desc: "B.Ed Honours or M.Ed", icon: <GraduationCap /> },
                               { id: "teacher", label: "Teacher", desc: "Shaping current students", icon: <School /> },
                           ].map(r => (
                               <button 
                                 key={r.id}
                                 onClick={() => setRole(r.id as any)}
                                 className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden
                                    ${role === r.id ? "border-primary bg-red-50/30 shadow-xl shadow-red-500/5" : "border-gray-50 hover:border-gray-200"}
                                 `}
                               >
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${role === r.id ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>
                                     {r.icon}
                                  </div>
                                  <div className="font-black text-lg">{r.label}</div>
                                  <div className="text-xs font-bold text-gray-400">{r.desc}</div>
                                  {role === r.id && <div className="absolute top-4 right-4"><Check className="text-primary w-5 h-5" /></div>}
                               </button>
                           ))}
                        </div>

                        {role === 'student' ? (
                            <div className="space-y-6 pt-2 animate-fade-in">
                               {/* Programme Selector */}
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Programme</label>
                                  <div className="grid grid-cols-2 gap-3">
                                     {[
                                         { id: "BEdHonours", label: "B.Ed Honours", desc: "4-year undergraduate", icon: <GraduationCap size={18} /> },
                                         { id: "MEd", label: "M.Ed", desc: "1-2 year postgraduate", icon: <BookOpen size={18} /> },
                                     ].map(p => (
                                         <button
                                           key={p.id}
                                           onClick={() => setProgramme(p.id as any)}
                                           className={`p-4 rounded-2xl border-2 text-left transition-all relative
                                              ${programme === p.id 
                                                ? "border-primary bg-primary/5 shadow-md" 
                                                : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"}
                                           `}
                                         >
                                           <div className="flex items-center gap-3">
                                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${programme === p.id ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                                 {p.icon}
                                              </div>
                                              <div>
                                                 <div className="font-black text-sm">{p.label}</div>
                                                 <div className="text-[10px] font-bold text-gray-400">{p.desc}</div>
                                              </div>
                                           </div>
                                           {programme === p.id && <Check className="absolute top-3 right-3 text-primary w-4 h-4" />}
                                         </button>
                                     ))}
                                  </div>
                               </div>

                               {/* Year & Semester */}
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Current Year</label>
                                     <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold border-2 border-transparent focus:border-primary focus:outline-none">
                                        {getYears().map(y => <option key={y}>{y}</option>)}
                                     </select>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Semester</label>
                                     <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold border-2 border-transparent focus:border-primary focus:outline-none">
                                        {getSemesters().map(s => <option key={s}>{s}</option>)}
                                     </select>
                                  </div>
                               </div>
                            </div>
                        ) : (
                            <div className="pt-2 animate-fade-in space-y-6">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Current Status</label>
                                  <div className="flex gap-2">
                                     {["govt", "non-govt"].map((s) => (
                                        <button
                                           key={s}
                                           onClick={() => setStatus(s as any)}
                                           className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2
                                              ${status === s ? "bg-navy-900 border-navy-900 text-white shadow-lg" : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"}
                                           `}
                                        >
                                           {s.replace("-", " ")}
                                        </button>
                                     ))}
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Core Subjects</label>
                                  <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="e.g., Mathematics, Educational Psychology" className="w-full p-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-primary focus:outline-none" />
                               </div>
                            </div>
                        )}
                    </motion.div>
                  )}

                  {/* STEP 3: COLLEGE */}
                  {step === 3 && (
                    <motion.div key="3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                        <div>
                           <h2 className="text-3xl font-black">Choose your college</h2>
                           <p className="text-gray-400 font-bold mt-1 text-sm">We only support the 14 Govt TTCs of Bangladesh.</p>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                           {colleges.map(c => (
                               <button 
                                 key={c.id}
                                 onClick={() => setCollegeId(c.id)}
                                 className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all
                                    ${collegeId === c.id ? "border-primary bg-red-50/30 text-navy-900" : "border-gray-50 text-gray-400 hover:border-gray-200"}
                                 `}
                               >
                                  <div className="flex items-center gap-4">
                                     <MapPin className={`w-5 h-5 ${collegeId === c.id ? "text-primary transition-colors" : "text-gray-200"}`} />
                                     <span className="font-bold">{c.name}</span>
                                  </div>
                                  {collegeId === c.id && <Check className="text-primary" />}
                               </button>
                           ))}
                        </div>
                    </motion.div>
                  )}

                  {/* STEP 4: FINISH */}
                  {step === 4 && (
                    <motion.div key="4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                               <Sparkle className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h2 className="text-3xl font-black">Ready to launch!</h2>
                            <p className="text-gray-400 font-bold mt-1 italic">One last detail to make your profile pop.</p>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">A short bio</label>
                              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the network about yourself..." className="w-full p-6 rounded-[2rem] bg-gray-50 font-medium border-2 border-transparent focus:border-primary focus:outline-none min-h-[120px]" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2">Your Interests (Comma separated)</label>
                              <input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Debate, Cricket, Educational Tech, Research" className="w-full p-6 rounded-[2rem] bg-gray-50 font-bold border-2 border-transparent focus:border-primary focus:outline-none" />
                           </div>
                        </div>
                    </motion.div>
                  )}
               </AnimatePresence>

               {/* Footer Navigation */}
               <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                   <button 
                     disabled={step === 1}
                     onClick={() => setStep(step - 1)}
                     className={`flex items-center gap-2 font-black text-sm uppercase tracking-widest transition-opacity ${step === 1 ? "opacity-0" : "text-gray-400 hover:text-navy-900"}`}
                   >
                     <ChevronLeft className="w-4 h-4" />
                     Back
                   </button>

                   {step < 4 ? (
                     <button 
                       onClick={() => setStep(step + 1)}
                       className="px-8 py-4 bg-navy-900 dark:bg-red-600 text-white rounded-2xl font-black text-sm flex items-center gap-3 active:scale-95 shadow-xl shadow-navy-900/10"
                     >
                       Continue
                       <ChevronRight size={18} />
                     </button>
                   ) : (
                     <button 
                       disabled={saving}
                       onClick={handleFinish}
                       className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center gap-3 active:scale-95 shadow-xl shadow-red-500/20"
                     >
                       {saving ? "Saving..." : "Start Journey"}
                       <Sparkle size={18} />
                     </button>
                   )}
               </div>
            </div>
        </div>
    );
}
