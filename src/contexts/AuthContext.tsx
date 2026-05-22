"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthInstance } from "@/lib/firebase";
import { getDb } from "@/lib/firebase";

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

export interface Skill {
    id: string; // generated client-side for keys
    name: string;
    category?: string; // e.g., "Frontend", "Backend", "Soft Skills"
    proficiency?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

export interface ProjectEntry {
    id: string;
    title: string;
    name?: string;
    role?: string;
    status?: string;
    description: string;
    url?: string;
    repoUrl?: string;
    startDate?: string;
    endDate?: string;
}

export interface WorkExperienceEntry {
    id: string;
    role: string;
    company: string;
    location?: string;
    type?: string;
    startDate: string;
    endDate?: string; // empty if current
    current: boolean;
    description?: string;
}

export interface EducationEntry {
    id: string;
    institution: string;
    degree: string;
    field?: string;
    startDate: string;
    endDate?: string;
}

export interface CertificationEntry {
    id: string;
    name: string;
    issuer: string;
    date: string;
    url?: string;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    imageURL: string;
    dateEarned: string;
}

export interface Achievement {
    id: string;
    title: string;
    issuer: string;
    date: string;
    fileURL: string;
    type: 'image' | 'pdf' | 'other';
}

export interface AwardEntry {
    id: string;
    title: string;
    issuer: string;
    date: string;
    description?: string;
}

export interface PublicationEntry {
    id: string;
    title: string;
    publisher: string;
    date: string;
    url?: string;
    description?: string;
}

export interface SocialLink {
    id: string;
    platform: string; // "github", "linkedin", "twitter", "portfolio", "facebook", etc.
    url: string;
}

export interface PositionEntry {
    id: string;
    title: string;       // e.g. "Moderator", "Ambassador", "Owner", "Volunteer"
    organization: string; // e.g. "TTC Network", "BdOSN", "Dhaka TTC Debate Club"
    type: "current" | "past";
    startDate?: string;   // e.g. "Jan 2025"
    endDate?: string;     // e.g. "Present" or "Dec 2025"
    link?: string;        // Optional URL to organization or role
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    username: string;
    photoURL: string;
    bannerURL: string;
    role: "student" | "teacher" | "manager" | "super_manager" | "admin";
    roleVerified: boolean;
    collegeId: string;
    programme?: "BEdHonours" | "MEd"; // B.Ed Honours (4yr) or M.Ed (1-2yr)
    
    // Core Identity
    headline?: string;
    location?: string;
    languages?: string[];
    publicEmail?: string;
    phone?: string;
    whatsapp?: string;
    facebook?: string;
    
    // Professional Details
    professionalStatus?: string; // e.g., "Student", "Employed", "Looking for work"
    industry?: string;
    availability?: string; // e.g., "Full-time", "Part-time", "Freelance"
    workType?: string; // e.g., "Remote", "On-site", "Hybrid"
    
    // Legacy Basic Fields
    year: string;
    semester: string;
    bio: string;
    achievements: string;
    goals: string;
    website: string;
    education: string;
    workExperience: string;
    skills: string[]; // Legacy flat skills, keeping for fallback
    
    // New Structured Array Fields
    advancedSkills?: Skill[];
    projectHistory?: ProjectEntry[];
    workHistory?: WorkExperienceEntry[];
    educationHistory?: EducationEntry[];
    certifications?: CertificationEntry[];
    awards?: AwardEntry[];
    publications?: PublicationEntry[];
    socialLinks?: SocialLink[];
    clubPosition?: string; // e.g., "President", "Member", or empty
    badges?: Badge[];
    achievementsList?: Achievement[];
    positions?: PositionEntry[];
    bioStyle?: string;
    bioFontSize?: string;
    favoriteQuote?: string;
    favoriteQuoteAuthor?: string;
}

interface AuthContextType {
    /** Firebase Auth user (null if not signed in) */
    user: User | null;
    /** Firestore user profile (null if not loaded/not signed in) */
    profile: UserProfile | null;
    /** True while checking auth state on mount */
    loading: boolean;
    /** Sign out and clear state */
    logout: () => Promise<void>;
    /** Refresh the profile from Firestore */
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    logout: async () => { },
    refreshProfile: async () => { },
});

// ═══════════════════════════════════════════════════
//  PROVIDER
// ═══════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch or create user profile document in Firestore
    const fetchOrCreateProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
        try {
            const db = getDb();
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                // Profile exists — update lastLogin and return
                await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
                return userSnap.data() as UserProfile;
            } else {
                // Profile does NOT exist — create it with defaults
                const newProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || "",
                    displayName: firebaseUser.displayName || "TTC User",
                    username: "",
                    photoURL: firebaseUser.photoURL || "",
                    bannerURL: "",
                    role: "student",
                    roleVerified: false,
                    collegeId: "",
                    programme: "BEdHonours",
                    year: "",
                    semester: "",
                    bio: "",
                    achievements: "",
                    goals: "",
                    skills: [],
                    website: "",
                    education: "",
                    workExperience: "",
                };

                await setDoc(userRef, {
                    ...newProfile,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                });

                return newProfile;
            }
        } catch (err) {
            console.error("[AuthContext] Failed to fetch/create profile:", err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (!user) return;
        const p = await fetchOrCreateProfile(user);
        setProfile(p);
        // Sync server session and role cookie with updated profile
        if (p) {
            try {
                const idToken = await user.getIdToken(true);
                await fetch("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                });
                // Set a non-HttpOnly role cookie for middleware role checks
                // (the actual session is HttpOnly and server-verified)
                document.cookie = `ttc_role=${p.role}; path=/; max-age=604800; SameSite=Lax`;
            } catch (err) {
                console.warn("[AuthContext] Failed to refresh server session:", err);
            }
        }
    };

    const logout = async () => {
        try {
            const auth = getAuthInstance();
            await signOut(auth);
            setUser(null);
            setProfile(null);
            // Clear server session cookie via API
            await fetch("/api/session", { method: "DELETE" }).catch(() => {});
            // Clear role cookie
            document.cookie = "ttc_role=; path=/; max-age=0";
        } catch (err) {
            console.error("[AuthContext] Logout failed:", err);
        }
    };

    useEffect(() => {
        const auth = getAuthInstance();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const p = await fetchOrCreateProfile(firebaseUser);
                setProfile(p);
                
                // Create server-signed session cookie via API
                if (p) {
                    try {
                        const idToken = await firebaseUser.getIdToken();
                        await fetch("/api/session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ idToken }),
                        });
                        // Set a non-HttpOnly role cookie for middleware role checks
                        document.cookie = `ttc_role=${p.role}; path=/; max-age=604800; SameSite=Lax`;
                    } catch (err) {
                        console.warn("[AuthContext] Failed to create server session:", err);
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
                await fetch("/api/session", { method: "DELETE" }).catch(() => {});
                document.cookie = "ttc_role=; path=/; max-age=0";
            }
            setLoading(false);
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

// ═══════════════════════════════════════════════════
//  HOOK
// ═══════════════════════════════════════════════════

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
