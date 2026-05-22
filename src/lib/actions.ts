/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use server";

import { adminDb } from "./firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract Cloudinary public_id from a secure URL.
 */
function extractPublicId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const uploadMatch = pathname.match(/\/image\/upload\/v\d+\/(.+)$/);
        if (!uploadMatch) return null;
        const pathWithExt = uploadMatch[1];
        const lastDot = pathWithExt.lastIndexOf(".");
        return lastDot > 0 ? pathWithExt.substring(0, lastDot) : pathWithExt;
    } catch {
        return null;
    }
}

/**
 * Recursively converts Firestore objects (like Timestamp) into plain JSON-serializable objects.
 */
function jsonify(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Timestamp) return obj.toDate().toISOString();
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(jsonify);
    
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = jsonify(obj[key]);
        }
    }
    return newObj;
}

/**
 * Diagnostic & Authorization Helper
 */
async function getAuthenticatedUser(uid: string) {
    if (!adminDb) throw new Error("Admin SDK not configured.");
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) throw new Error("User profile not found.");
    return { id: userDoc.id, ...userDoc.data() } as any;
}

/**
 * COLLEGES SEED DATA
 */
const colleges = [
    { id: "dhaka", name: "Govt. Teachers' Training College, Dhaka", shortName: "Govt. Teachers' Training College, Dhaka", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ঢাকা", city: "Dhaka", established: 1909, slug: "ttc-dhaka", logo: "", hasLogo: false },
    { id: "feni", name: "Govt. Teachers' Training College, Feni", shortName: "Govt. Teachers' Training College, Feni", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফেনী", city: "Feni", established: 1962, slug: "ttc-feni", logo: "", hasLogo: false },
    { id: "rajshahi", name: "Govt. Teachers' Training College, Rajshahi", shortName: "Govt. Teachers' Training College, Rajshahi", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রাজশাহী", city: "Rajshahi", established: 1955, slug: "ttc-rajshahi", logo: "", hasLogo: false },
    { id: "cumilla", name: "Govt. Teachers' Training College, Cumilla", shortName: "Govt. Teachers' Training College, Cumilla", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, কুমিল্লা", city: "Cumilla", established: 1962, slug: "ttc-cumilla", logo: "", hasLogo: false },
    { id: "sylhet", name: "Govt. Teachers' Training College, Sylhet", shortName: "Govt. Teachers' Training College, Sylhet", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, সিলেট", city: "Sylhet", established: 1946, slug: "ttc-sylhet", logo: "", hasLogo: false },
    { id: "chattagram", name: "Govt. Teachers' Training College, Chattagram", shortName: "Govt. Teachers' Training College, Chattagram", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, চট্টগ্রাম", city: "Chattagram", established: 1958, slug: "ttc-chattagram", logo: "", hasLogo: false },
    { id: "rangpur", name: "Govt. Teachers' Training College, Rangpur", shortName: "Govt. Teachers' Training College, Rangpur", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রংপুর", city: "Rangpur", established: 1882, slug: "ttc-rangpur", logo: "", hasLogo: false },
    { id: "khulna", name: "Govt. Teachers' Training College, Khulna", shortName: "Govt. Teachers' Training College, Khulna", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, খুলনা", city: "Khulna", established: 1970, slug: "ttc-khulna", logo: "", hasLogo: false },
    { id: "mymensingh", name: "Govt. Women's Teachers' Training College, Mymensingh", shortName: "Govt. Women's Teachers' Training College, Mymensingh", nameBn: "সরকারি মহিলা টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ", city: "Mymensingh", established: 1952, slug: "ttc-mymensingh", logo: "", hasLogo: false },
    { id: "mymensingh_coed", name: "Govt. Teachers' Training College, Mymensingh", shortName: "Govt. Teachers' Training College, Mymensingh", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ", city: "Mymensingh", established: 1948, slug: "ttc-mymensingh-coed", logo: "", hasLogo: false },
    { id: "bogura", name: "Govt. B.Ed College, Bogura", shortName: "Govt. B.Ed College, Bogura", nameBn: "সরকারি বি.এড কলেজ, বগুড়া", city: "Bogura", established: 2000, slug: "bed-bogura", logo: "https://res.cloudinary.com/dqmqvynxo/image/upload/v1775406576/ttc-connect/logos/aoij4zt9ikuemwmvfkqd.jpg", hasLogo: true },
    { id: "jashore", name: "Govt. Teachers' Training College, Jashore", shortName: "Govt. Teachers' Training College, Jashore", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, যশোর", city: "Jashore", established: 1963, slug: "ttc-jashore", logo: "", hasLogo: false },
    { id: "barishal", name: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal", shortName: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal", nameBn: "শহীদ আবদুর রব সেরনিয়াবাত টিচার্স ট্রেনিং কলেজ, বরিশাল", city: "Barishal", established: 1999, slug: "ttc-barishal", logo: "", hasLogo: false },
    { id: "faridpur", name: "Govt. Teachers' Training College, Faridpur", shortName: "Govt. Teachers' Training College, Faridpur", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফরিদপুর", city: "Faridpur", established: 2005, slug: "ttc-faridpur", logo: "", hasLogo: false },
    { id: "pabna", name: "Govt. B.Ed College, Pabna", shortName: "Govt. B.Ed College, Pabna", nameBn: "সরকারি বি.এড কলেজ, পাবনা", city: "Pabna", established: 1998, slug: "bed-pabna", logo: "", hasLogo: false },
];

const collegeProfiles: any = {
    dhaka: {
        shortName: "Govt. Teachers' Training College, Dhaka", location: "Dhaka, Bangladesh", principal: "Prof. Dr. Mohammad Ali", principalContact: "+880-2-9661373", teachers: 45, students: 850, classrooms: 30, hostel: true, description: "The oldest and most prestigious TTC in Bangladesh, established on January 6, 1909.", achievements: ["Best TTC Award 2024", "National Debate Champions", "100% pass rate in B.Ed 2025"], color: "#1a1a1a", social: { facebook: "https://facebook.com/ttcdhaka", website: "https://ttcdhaka.edu.bd" }, teachersList: [{ name: "Prof. Dr. Mohammad Ali", designation: "Principal", department: "Administration" }, { name: "Prof. Rehana Akhter", designation: "Vice Principal", department: "Education" }], clubs: [{ name: "Debate Club", icon: "🎙️", members: 60, advisor: "Dr. Kamal Hossain" }, { name: "Sports Club", icon: "⚽", members: 120, advisor: "Prof. Rehana Akhter" }]
    },
    feni: {
        shortName: "Govt. Teachers' Training College, Feni", location: "Feni, Bangladesh", principal: "Prof. Md. Abdul Motaleb", principalContact: "+880-331-63456", teachers: 30, students: 600, classrooms: 22, hostel: true, description: "Established in 1962, Govt. TTC Feni is one of the leading teacher training institutions in the Chattogram division.", achievements: ["Inter-college Debate Champions 2025", "Best Campus Award 2024"], color: "#0D6E3F", social: { facebook: "https://facebook.com/ttcfeni", website: "" }, teachersList: [{ name: "Prof. Md. Abdul Motaleb", designation: "Principal", department: "Administration" }], clubs: [{ name: "Debate Club", icon: "🎙️", members: 45, advisor: "Dr. Shamim Ahmad" }, { name: "Sports Club", icon: "⚽", members: 80, advisor: "Prof. Abdul Motaleb" }]
    }
};

const faqSeedData = [
    { question: "টিটিসি কানেক্ট কী?", answer: "TTC Network হলো বাংলাদেশের ১৫টি সরকারি টিচার্স ট্রেনিং কলেজের শিক্ষার্থী ও শিক্ষকদের জন্য একটি ইউনিফাইড ডিজিটাল প্ল্যাটফর্ম।", language: "bengali", order: 1 },
    { question: "কারা এই প্ল্যাটফর্ম ব্যবহার করতে পারবে?", answer: "সকল সরকারি টিটিসির বর্তমান শিক্ষার্থী, শিক্ষক, ও প্রাক্তন শিক্ষার্থীরা এই প্ল্যাটফর্ম ব্যবহার করতে পারবেন।", language: "bengali", order: 2 },
];

/**
 * ACTIONS
 */

export async function createClubAction(uid: string, club: any) {
    try {
        if (!adminDb) return { error: "Admin SDK not configured." };
        const profile = await getAuthenticatedUser(uid);
        if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "super_manager") {
            return { error: "Unauthorized: Admin or Manager role required." };
        }
        // Validate required fields
        if (!club.name || !club.name.trim()) return { error: "Club name is required." };
        if (!club.collegeId || !club.collegeId.trim()) return { error: "College ID is required." };

        // Managers can only create clubs for their own college
        if (profile.role === "manager" && profile.collegeId !== club.collegeId) {
            return { error: "You can only create clubs for your own college." };
        }

    const fullClub = {
        collegeId: club.collegeId,
        name: club.name.trim(),
        description: club.description || "",
        tagline: club.tagline || "",
        icon: club.icon || "🎯",
        logo: club.logo || "",
        bannerUrl: club.bannerUrl || "",
        category: club.category || "Other",
        advisorName: club.advisorName || "",
        advisorUserId: club.advisorUserId || "",
        schedule: club.schedule || "",
        location: club.location || "",
        foundedDate: club.foundedDate || new Date().getFullYear().toString(),
        socialLinks: {
            facebook: club.socialLinks?.facebook || "",
            whatsapp: club.socialLinks?.whatsapp || "",
        },
        isActive: true,
        membersCount: 0,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
        const docRef = await adminDb.collection("clubs").add(fullClub);
        return jsonify({ id: docRef.id });
    } catch (err: any) {
        console.error("Create Club Error:", err);
        return { error: err.message || "Failed to create club" };
    }
}

export async function seedDatabaseAction(uid: string) {
    if (!adminDb) throw new Error("Admin SDK not configured.");
    const profile = await getAuthenticatedUser(uid);
    if (profile.role !== "admin" && profile.role !== "super_manager") {
        throw new Error("Unauthorized: Super Admin required for seeding.");
    }

    let collegesCount = 0;
    for (const college of colleges) {
        const prof = collegeProfiles[college.id] || { shortName: college.shortName || college.name, location: college.city, principal: "TBD", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "", achievements: [], color: "#2563eb", social: { facebook: "", website: "" }, teachersList: [], clubs: [] };
        await adminDb.collection("colleges").doc(college.id).set({
            ...college,
            ...prof,
            gallery: [],
            lastUpdatedBy: uid,
            lastUpdatedDate: FieldValue.serverTimestamp(),
        });
        collegesCount++;
    }

    let faqCount = 0;
    for (const faq of faqSeedData) {
        await adminDb.collection("qaCards").add({
            ...faq,
            isVisible: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        faqCount++;
    }

    return jsonify({ success: true, message: `✅ Seeded ${collegesCount} colleges and ${faqCount} Q&A cards.` });
}

export async function getClubsAction(collegeId: string) {
    if (!adminDb) throw new Error("Admin SDK not configured.");
    const snapshot = await adminDb.collection("clubs").where("collegeId", "==", collegeId).get();
    const clubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return jsonify(clubs);
}

export async function deleteClubAction(uid: string, clubId: string) {
    try {
        if (!adminDb) return { error: "Admin SDK not configured." };
        const profile = await getAuthenticatedUser(uid);
        
        const clubDoc = await adminDb.collection("clubs").doc(clubId).get();
        if (!clubDoc.exists) return { error: "Club not found." };
        const clubData = clubDoc.data()!;

        let isAuthorized = false;
        if (profile.role === "admin" || profile.role === "super_manager") isAuthorized = true;
        if (profile.role === "manager" && profile.collegeId === clubData.collegeId) isAuthorized = true;
        if (clubData.createdBy === uid) isAuthorized = true;

        if (!isAuthorized) {
            return { error: "Unauthorized: Admin, Manager, or Club Creator role required to disband." };
        }

    // Delete sub-collections first (members, requests, activities)
    const subCollections = ["members", "requests", "activities"];
    for (const sub of subCollections) {
        const snap = await adminDb.collection("clubs").doc(clubId).collection(sub).get();
        const batch = adminDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.docs.length > 0) await batch.commit();
    }
    
        await adminDb.collection("clubs").doc(clubId).delete();
        return jsonify({ success: true });
    } catch (err: any) {
        console.error("Delete Club Error:", err);
        return { error: err.message || "Failed to delete club" };
    }
}

export async function updateClubAction(uid: string, clubId: string, data: any) {
    if (!adminDb) throw new Error("Admin SDK not configured.");
    const profile = await getAuthenticatedUser(uid);
    if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "super_manager") {
        throw new Error("Unauthorized: Admin or Manager role required.");
    }
    const clubDoc = await adminDb.collection("clubs").doc(clubId).get();
    if (!clubDoc.exists) throw new Error("Club not found.");
    const clubData = clubDoc.data()!;

    if (profile.role === "manager" && profile.collegeId !== clubData.collegeId) {
        throw new Error("You can only edit clubs for your own college.");
    }

    const cleanData: any = {};
    const editableFields = ["name", "description", "tagline", "icon", "category", "advisorName", "schedule", "location", "foundedDate", "socialLinks", "isActive"];
    for (const key of editableFields) {
        if (data[key] !== undefined) cleanData[key] = data[key];
    }
    cleanData.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection("clubs").doc(clubId).update(cleanData);
    return jsonify({ success: true });
}

export async function addGalleryPhotoAction(uid: string, collegeId: string, photoUrl: string, caption: string) {
    if (!adminDb) throw new Error("Admin SDK not configured.");
    const profile = await getAuthenticatedUser(uid);
    // Any authenticated user can share a photo but it gets linked to their profile
    const collegeDoc = await adminDb.collection("colleges").doc(collegeId).get();
    if (!collegeDoc.exists) throw new Error("College not found.");

    const existing = collegeDoc.data()!.gallery || [];
    const newPhoto = {
        url: photoUrl,
        caption: caption || "Campus photo",
        uploadedBy: profile.displayName || "Unknown",
        uploaderUid: uid,
        date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
    
    await adminDb.collection("colleges").doc(collegeId).update({
        gallery: [...existing, newPhoto],
        lastUpdatedDate: FieldValue.serverTimestamp(),
    });
    return jsonify({ success: true });
}

export async function deleteGalleryPhotoAction(uid: string, collegeId: string, photoUrl: string) {
    try {
        if (!adminDb) return { error: "Admin SDK not configured." };
        const profile = await getAuthenticatedUser(uid);
        
        const collegeDoc = await adminDb.collection("colleges").doc(collegeId).get();
        if (!collegeDoc.exists) return { error: "College not found." };
        
        const gallery = (collegeDoc.data()?.gallery || []) as import("./firestore").GalleryEntry[];
        const photoIndex = gallery.findIndex((item) => item.url === photoUrl);
        
        if (photoIndex === -1) return { error: "Photo not found in gallery." };
        const photo = gallery[photoIndex];

        // Permissions check
        const isAdmin = profile.role === "admin" || profile.role === "super_manager";
        const isManager = profile.role === "manager" && profile.collegeId === collegeId;
        const isUploader = photo.uploaderUid === uid;

        if (!isAdmin && !isManager && !isUploader) {
            return { error: "Unauthorized: You don't have permission to delete this photo." };
        }

        // 1. Delete from Cloudinary
        const publicId = extractPublicId(photoUrl);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { invalidate: true });
        }

        // 2. Remove from Firestore
        const updatedGallery = gallery.filter((_, i: number) => i !== photoIndex);
        await adminDb.collection("colleges").doc(collegeId).update({
            gallery: updatedGallery,
            lastUpdatedDate: FieldValue.serverTimestamp(),
        });

        return jsonify({ success: true });
    } catch (err: unknown) {
        console.error("Delete Gallery Photo Error:", err);
        return { error: err instanceof Error ? err.message : "Failed to delete photo" };
    }
}


