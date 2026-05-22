/**
 * Data Seed Script
 * =================
 * One-time migration of hardcoded data from colleges.ts + college-info data
 * into Firestore. Run this from the admin panel via a "Seed Data" button.
 * 
 * Usage: Import and call `seedAllData()` from the admin panel.
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";

// Removed Proxy-based db accessor as it was causing initialization issues
import { colleges } from "@/data/colleges";

// ═══════════════════════════════════════════════════
//  COLLEGE SEED DATA (extracted from college-info/page.tsx)
// ═══════════════════════════════════════════════════

const collegeProfiles: Record<string, {
    shortName: string;
    location: string;
    principal: string;
    principalContact: string;
    teachers: number;
    students: number;
    classrooms: number;
    hostel: boolean;
    description: string;
    achievements: string[];
    color: string;
    social: { facebook: string; website: string };
    teachersList: { name: string; designation: string; department: string; email: string; phone: string }[];
    clubs: { name: string; icon: string; members: number; advisor: string; membersList: { name: string; role: string; batch: string; }[] }[];
}> = {
    dhaka: {
        shortName: "Govt. Teachers' Training College, Dhaka",
        location: "Dhaka, Bangladesh",
        principal: "Prof. Dr. Mohammad Ali",
        principalContact: "+880-2-9661373",
        teachers: 45,
        students: 850,
        classrooms: 30,
        hostel: true,
        description: "The oldest and most prestigious TTC in Bangladesh, established on January 6, 1909. Initially located in Armanitola, it moved to its current site in 1956. Known for pioneering teacher education in the country.",
        achievements: ["Best TTC Award 2024", "National Debate Champions", "100% pass rate in B.Ed 2025"],
        color: "#1a1a1a",
        social: { facebook: "https://facebook.com/ttcdhaka", website: "https://ttcdhaka.edu.bd" },
        teachersList: [
            { name: "Prof. Dr. Mohammad Ali", designation: "Principal", department: "Administration", email: "principal@ttcdhaka.edu.bd", phone: "+880-2-9661373" },
            { name: "Prof. Rehana Akhter", designation: "Vice Principal", department: "Education", email: "rehana@ttcdhaka.edu.bd", phone: "+880-2-9661374" },
            { name: "Dr. Kamal Hossain", designation: "Associate Professor", department: "Science Education", email: "kamal@ttcdhaka.edu.bd", phone: "+880-2-9661375" },
            { name: "Prof. Nasreen Sultana", designation: "Assistant Professor", department: "Social Science Education", email: "nasreen@ttcdhaka.edu.bd", phone: "+880-2-9661376" },
        ],
        clubs: [
            { name: "Debate Club", icon: "🎙️", members: 60, advisor: "Dr. Kamal Hossain", membersList: [] },
            { name: "Sports Club", icon: "⚽", members: 120, advisor: "Prof. Rehana Akhter", membersList: [] },
            { name: "Cultural Club", icon: "🎭", members: 80, advisor: "Prof. Nasreen Sultana", membersList: [] },
            { name: "Science Club", icon: "🔬", members: 45, advisor: "Dr. Kamal Hossain", membersList: [] },
        ],
    },
    feni: {
        shortName: "Govt. Teachers' Training College, Feni",
        location: "Feni, Bangladesh",
        principal: "Prof. Md. Abdul Motaleb",
        principalContact: "+880-331-63456",
        teachers: 30,
        students: 600,
        classrooms: 22,
        hostel: true,
        description: "Established in 1962, Govt. TTC Feni is one of the leading teacher training institutions in the Chattogram division. Known for its strong academic environment and campus life.",
        achievements: ["Inter-college Debate Champions 2025", "Best Campus Award 2024"],
        color: "#0D6E3F",
        social: { facebook: "https://facebook.com/ttcfeni", website: "" },
        teachersList: [
            { name: "Prof. Md. Abdul Motaleb", designation: "Principal", department: "Administration", email: "principal@ttcfeni.gov.bd", phone: "+880-331-63456" },
            { name: "Dr. Shamim Ahmad", designation: "Vice Principal", department: "Education", email: "shamim@ttcfeni.gov.bd", phone: "+880-331-63457" },
        ],
        clubs: [
            { name: "Debate Club", icon: "🎙️", members: 45, advisor: "Dr. Shamim Ahmad", membersList: [] },
            { name: "Sports Club", icon: "⚽", members: 80, advisor: "Prof. Abdul Motaleb", membersList: [] },
            { name: "Creative Writing Club", icon: "✍️", members: 35, advisor: "Dr. Shamim Ahmad", membersList: [] },
        ],
    },
    rajshahi: {
        shortName: "Govt. Teachers' Training College, Rajshahi",
        location: "Rajshahi, Bangladesh",
        principal: "Prof. Dr. Abdul Karim",
        principalContact: "+880-721-750345",
        teachers: 38,
        students: 720,
        classrooms: 25,
        hostel: true,
        description: "Established in 1955, TTC Rajshahi is one of the most well-known teacher training colleges in northern Bangladesh.",
        achievements: ["National Science Fair Winners 2024", "Best Research Paper 2025"],
        color: "#1B1464",
        social: { facebook: "https://facebook.com/ttcrajshahi", website: "" },
        teachersList: [
            { name: "Prof. Dr. Abdul Karim", designation: "Principal", department: "Administration", email: "principal@ttcrajshahi.gov.bd", phone: "+880-721-750345" },
        ],
        clubs: [
            { name: "Science Club", icon: "🔬", members: 55, advisor: "Prof. Dr. Abdul Karim", membersList: [] },
            { name: "Debate Club", icon: "🎙️", members: 40, advisor: "Prof. Dr. Abdul Karim", membersList: [] },
        ],
    },
    cumilla: {
        shortName: "Govt. Teachers' Training College, Cumilla",
        location: "Cumilla, Bangladesh",
        principal: "Prof. Md. Rafiqul Islam",
        principalContact: "+880-81-76543",
        teachers: 32,
        students: 580,
        classrooms: 20,
        hostel: true,
        description: "Established in 1962, TTC Cumilla is a prominent teacher training college in the southeastern region of Bangladesh.",
        achievements: ["Inter-college Cultural Champions 2024"],
        color: "#0D3B8F",
        social: { facebook: "https://facebook.com/ttccumilla", website: "" },
        teachersList: [
            { name: "Prof. Md. Rafiqul Islam", designation: "Principal", department: "Administration", email: "principal@ttccumilla.gov.bd", phone: "+880-81-76543" },
        ],
        clubs: [
            { name: "Cultural Club", icon: "🎭", members: 50, advisor: "Prof. Md. Rafiqul Islam", membersList: [] },
        ],
    },
    sylhet: {
        shortName: "Govt. Teachers' Training College, Sylhet",
        location: "Sylhet, Bangladesh",
        principal: "Prof. Dr. Anwar Hossain",
        principalContact: "+880-821-717890",
        teachers: 35,
        students: 650,
        classrooms: 24,
        hostel: true,
        description: "Established in 1946, TTC Sylhet is one of the oldest teacher training colleges in Bangladesh with a strong tradition in educational excellence.",
        achievements: ["Best TTC in Sylhet Division 2024", "National Teaching Innovation Award 2025"],
        color: "#0A5C36",
        social: { facebook: "https://facebook.com/ttcsylhet", website: "" },
        teachersList: [
            { name: "Prof. Dr. Anwar Hossain", designation: "Principal", department: "Administration", email: "principal@ttcsylhet.gov.bd", phone: "+880-821-717890" },
        ],
        clubs: [
            { name: "Debate Club", icon: "🎙️", members: 40, advisor: "Prof. Dr. Anwar Hossain", membersList: [] },
        ],
    },
    chattagram: {
        shortName: "Govt. Teachers' Training College, Chattagram",
        location: "Chattagram, Bangladesh",
        principal: "Prof. Dr. Jamal Uddin",
        principalContact: "+880-31-619876",
        teachers: 40,
        students: 780,
        classrooms: 28,
        hostel: true,
        description: "Established in 1958, TTC Chattagram is the premier teacher training college in the port city. Known for strong faculty and modern facilities.",
        achievements: ["National Education Excellence Award 2024"],
        color: "#2C3E50",
        social: { facebook: "https://facebook.com/ttcchattagram", website: "" },
        teachersList: [
            { name: "Prof. Dr. Jamal Uddin", designation: "Principal", department: "Administration", email: "principal@ttcchattagram.gov.bd", phone: "+880-31-619876" },
        ],
        clubs: [
            { name: "Sports Club", icon: "⚽", members: 90, advisor: "Prof. Dr. Jamal Uddin", membersList: [] },
        ],
    },
    // Remaining 8 colleges with minimal data (user will update via admin)
    rangpur: {
        shortName: "Govt. Teachers' Training College, Rangpur",
        location: "Rangpur, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1882, one of the oldest educational institutions in the region.",
        achievements: [],
        color: "#2D7D2D",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    khulna: {
        shortName: "Govt. Teachers' Training College, Khulna",
        location: "Khulna, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1970.",
        achievements: [],
        color: "#1A5276",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    mymensingh: {
        shortName: "Govt. Women's Teachers' Training College, Mymensingh",
        location: "Mymensingh, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1952. The only dedicated women's TTC.",
        achievements: [],
        color: "#8E44AD",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    mymensingh_coed: {
        shortName: "Govt. Teachers' Training College, Mymensingh",
        location: "Mymensingh, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1948.",
        achievements: [],
        color: "#1A5276",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    bogura: {
        shortName: "Govt. B.Ed College, Bogura",
        location: "Bogura, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 2000.",
        achievements: [],
        color: "#1A5276",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    jashore: {
        shortName: "Govt. Teachers' Training College, Jashore",
        location: "Jashore, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1963.",
        achievements: [],
        color: "#1B4F72",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    barishal: {
        shortName: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal",
        location: "Barishal, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1999.",
        achievements: [],
        color: "#0E6655",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    faridpur: {
        shortName: "Govt. Teachers' Training College, Faridpur",
        location: "Faridpur, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 2005.",
        achievements: [],
        color: "#1A5276",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },
    pabna: {
        shortName: "Govt. B.Ed College, Pabna",
        location: "Pabna, Bangladesh",
        principal: "To be updated",
        principalContact: "",
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1998.",
        achievements: [],
        color: "#6C3483",
        social: { facebook: "", website: "" },
        teachersList: [],
        clubs: [],
    },

};

// ═══════════════════════════════════════════════════
//  FAQ SEED DATA (from homepage)
// ═══════════════════════════════════════════════════

const faqSeedData = [
    {
        question: "টিটিসি কানেক্ট কী?",
        answer: "TTC Network হলো বাংলাদেশের ১৫টি সরকারি টিচার্স ট্রেনিং কলেজের শিক্ষার্থী ও শিক্ষকদের জন্য একটি ইউনিফাইড ডিজিটাল প্ল্যাটফর্ম।",
        language: "bengali" as const,
        order: 1,
    },
    {
        question: "কারা এই প্ল্যাটফর্ম ব্যবহার করতে পারবে?",
        answer: "সকল সরকারি টিটিসির বর্তমান শিক্ষার্থী, শিক্ষক, ও প্রাক্তন শিক্ষার্থীরা এই প্ল্যাটফর্ম ব্যবহার করতে পারবেন।",
        language: "bengali" as const,
        order: 2,
    },
    {
        question: "কোন কোন কলেজ এখানে আছে?",
        answer: "বাংলাদেশের সকল ১৫টি সরকারি টিটিসি — ঢাকা, ময়মনসিংহ (মহিলা), ময়মনসিংহ (সাধারণ), রাজশাহী, ফেনী, কুমিল্লা, সিলেট, চট্টগ্রাম, রংপুর, খুলনা, বগুড়া, যশোর, বরিশাল, ফরিদপুর, এবং পাবনা।",
        language: "bengali" as const,
        order: 3,
    },
    {
        question: "এই প্ল্যাটফর্ম কি সরকারি?",
        answer: "না, এটি একটি স্টুডেন্ট-বিল্ট ইনিশিয়েটিভ — ফেনী টিটিসির শিক্ষার্থী সাকিব কর্তৃক নির্মিত ও পরিচালিত।",
        language: "bengali" as const,
        order: 4,
    },
];

// ═══════════════════════════════════════════════════
//  ADMISSION GUIDE SEED DATA
// ═══════════════════════════════════════════════════

const admissionStepsSeedData = [
    {
        stepNumber: 1,
        title: "অনলাইনে প্রাথমিক আবেদন",
        subtitle: "Online Primary Application",
        description: "জাতীয় বিশ্ববিদ্যালয়ের ভর্তি বিষয়ক ওয়েবসাইট (nu.ac.bd/admissions) থেকে 'Honours Professional' ট্যাবে গিয়ে বি.এড (অনার্স) কোর্সের জন্য অনলাইনে আবেদন ফরম পূরণ করতে হবে। আবেদন শেষে নির্ধারিত প্রাথমিক ফি মোবাইল ব্যাংকিংয়ের মাধ্যমে জমা দিয়ে আবেদন নিশ্চিত করতে হবে।",
        iconName: "Monitor",
        isVisible: true,
        order: 1,
    },
    {
        stepNumber: 2,
        title: "মেধা তালিকা প্রকাশ",
        subtitle: "Merit List Publication",
        description: "এই কোর্সে ভর্তির জন্য আলাদা কোনো লিখিত পরীক্ষা দিতে হয় না। আবেদনকারীর এসএসসি (SSC) এবং এইচএসসি (HSC) পরীক্ষার জিপিএ (GPA)-এর ভিত্তিতে মেধা তালিকা তৈরি করা হয়। মেধা তালিকায় নাম আসলে পছন্দকৃত সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সুযোগ পাওয়া যায়।",
        iconName: "Trophy",
        isVisible: true,
        order: 2,
    },
    {
        stepNumber: 3,
        title: "চূড়ান্ত ভর্তি",
        subtitle: "Final Admission",
        description: "মেধা তালিকায় নির্বাচিত হওয়ার পর, অনলাইন থেকে চূড়ান্ত ভর্তির ফরম পূরণ করে প্রিন্ট করতে হবে। এরপর মূল মার্কশিট, প্রশংসাপত্র, ছবি এবং নির্ধারিত ভর্তি ফিসহ সংশ্লিষ্ট কলেজে সশরীরে উপস্থিত হয়ে ভর্তি সম্পন্ন করতে হবে।",
        iconName: "FileCheck",
        isVisible: true,
        order: 3,
    },
    {
        stepNumber: 4,
        title: "ওরিয়েন্টেশন ও ক্লাস শুরু",
        subtitle: "Class Commencement",
        description: "ভর্তি প্রক্রিয়া সফলভাবে শেষ হওয়ার পর, জাতীয় বিশ্ববিদ্যালয় এবং সংশ্লিষ্ট কলেজের প্রকাশিত রুটিন ও নোটিশ অনুযায়ী ওরিয়েন্টেশন ক্লাসের মাধ্যমে ৪ বছর মেয়াদী এই প্রফেশনাল কোর্সের আনুষ্ঠানিক কার্যক্রম শুরু হবে।",
        iconName: "GraduationCap",
        isVisible: true,
        order: 4,
    },
];

const admissionCostsSeedData = [
    {
        label: "প্রাথমিক আবেদন ফি",
        amount: "৩০০ - ৫০০ টাকা",
        isHighlighted: false,
        order: 1,
        isVisible: true,
    },
    {
        label: "চূড়ান্ত ভর্তি ও রেজিস্ট্রেশন ফি",
        amount: "৪,০০০ - ৬,০০০ টাকা",
        isHighlighted: false,
        order: 2,
        isVisible: true,
    },
    {
        label: "সেমিস্টার ফি (৮টি সেমিস্টার)",
        amount: "সর্বমোট আনুমানিক ১৬,০০০ টাকা",
        isHighlighted: false,
        order: 3,
        isVisible: true,
    },
    {
        label: "৪ বছরের সর্বমোট আনুমানিক খরচ",
        amount: "৩৮,০০০ - ৪২,০০০ টাকা",
        isHighlighted: true,
        order: 4,
        isVisible: true,
    },
];

// ═══════════════════════════════════════════════════
//  SEED FUNCTIONS
// ═══════════════════════════════════════════════════

export async function seedColleges(): Promise<number> {
    const db = getDb();
    let count = 0;

    for (const college of colleges) {
        const profile = collegeProfiles[college.id];
        if (!profile) continue;

        await setDoc(doc(db, "colleges", college.id), {
            name: college.name,
            nameBn: college.nameBn,
            shortName: profile.shortName,
            city: college.city,
            established: college.established,
            slug: college.slug,
            logo: college.logo,
            hasLogo: college.hasLogo,
            color: profile.color,
            principal: profile.principal,
            principalContact: profile.principalContact,
            students: profile.students,
            teachers: profile.teachers,
            classrooms: profile.classrooms,
            hostel: profile.hostel,
            location: profile.location,
            description: profile.description,
            achievements: profile.achievements,
            social: profile.social,
            teachersList: profile.teachersList,
            clubs: profile.clubs,
            gallery: [],
            lastUpdatedBy: "seed-script",
            lastUpdatedDate: serverTimestamp(),
        });
        count++;
    }

    return count;
}

export async function seedQACards(): Promise<number> {
    const db = getDb();
    let count = 0;

    for (const card of faqSeedData) {
        await setDoc(doc(collection(db, "qaCards")), {
            question: card.question,
            answer: card.answer,
            language: card.language,
            isVisible: true,
            order: card.order,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        count++;
    }

    return count;
}

export async function seedAdmissionGuide(): Promise<{ steps: number; costs: number }> {
    const db = getDb();
    let stepCount = 0;
    let costCount = 0;

    // Seed admission settings
    await setDoc(doc(db, "settings", "admission"), {
        sectionTitle: "বি.এড (অনার্স) ভর্তি প্রক্রিয়া",
        sectionSubtitle: "সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সহজ ও পূর্ণাঙ্গ গাইডলাইন",
        costTitle: "খরচের আনুমানিক ধারণা",
        isVisible: true,
    });

    // Seed admission steps
    for (const step of admissionStepsSeedData) {
        await setDoc(doc(collection(db, "admissionSteps")), {
            ...step,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        stepCount++;
    }

    // Seed admission costs
    for (const cost of admissionCostsSeedData) {
        await setDoc(doc(collection(db, "admissionCosts")), {
            ...cost,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        costCount++;
    }

    return { steps: stepCount, costs: costCount };
}

export async function seedAllData(): Promise<{ colleges: number; qaCards: number; admissionSteps: number; admissionCosts: number }> {
    const db = getDb();
    // Check if already seeded
    const existingColleges = await getDocs(collection(db, "colleges"));
    if (existingColleges.size > 0) {
        throw new Error(
            `Database already has ${existingColleges.size} colleges. Clear the database first if you want to re-seed.`
        );
    }

    const collegeCount = await seedColleges();
    const qaCount = await seedQACards();
    const admission = await seedAdmissionGuide();

    return { colleges: collegeCount, qaCards: qaCount, admissionSteps: admission.steps, admissionCosts: admission.costs };
}

export async function seedPhases(): Promise<void> {
    const db = getDb();
    const DEFAULT_PHASES = [
        {
            title: "Phase 1: UI & Frontend",
            description: "The initial phase of building out TTC Network's stunning design framework, user directory, global newsfeed, and support ecosystem.",
            status: "Complete",
            order: 1,
            targetAmount: 20000,
            color: "emerald",
            icon: "Layout"
        },
        {
            title: "Phase 2: Developing the Backend",
            description: "Focusing heavily on robust Firebase security rules, cloud functions, deep user profiling, data hydration, and dynamic feeds.",
            status: "In Progress",
            order: 2,
            targetAmount: 50000,
            color: "blue",
            icon: "Server"
        },
        {
            title: "Phase 3: Building the Mobile App",
            description: "Once the web application is stable and fully adopted, development will pivot to releasing a native mobile application.",
            status: "Upcoming",
            order: 3,
            targetAmount: 100000,
            color: "purple",
            icon: "Smartphone"
        }
    ];

    const ref = collection(db, "supportPhases");
    for (const phase of DEFAULT_PHASES) {
        await setDoc(doc(ref), phase);
        console.log("Added:", phase.title);
    }
}

