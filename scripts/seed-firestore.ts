/**
 * CLI Seed Script — Firebase Admin SDK
 * ======================================
 * Run with: npx tsx scripts/seed-firestore.ts
 * 
 * Seeds 14 colleges + 4 FAQ cards into Firestore.
 * Uses the Admin SDK so it runs outside the browser.
 * 
 * Requires: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY,
 *           NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load env vars from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Validate env vars
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Missing Firebase Admin credentials in .env.local");
    console.error("   Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY");
    process.exit(1);
}

// Initialize Admin SDK
const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ═══════════════════════════════════════════════════
//  COLLEGE DATA (from data/colleges.ts)
// ═══════════════════════════════════════════════════

const colleges = [
    { id: "dhaka", name: "Govt. Teachers' Training College, Dhaka", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ঢাকা", city: "Dhaka", established: 1909, slug: "ttc-dhaka", logo: "", hasLogo: false },
    { id: "feni", name: "Govt. Teachers' Training College, Feni", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফেনী", city: "Feni", established: 1962, slug: "ttc-feni", logo: "", hasLogo: false },
    { id: "rajshahi", name: "Govt. Teachers' Training College, Rajshahi", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রাজশাহী", city: "Rajshahi", established: 1955, slug: "ttc-rajshahi", logo: "", hasLogo: false },
    { id: "cumilla", name: "Govt. Teachers' Training College, Cumilla", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, কুমিল্লা", city: "Cumilla", established: 1962, slug: "ttc-cumilla", logo: "", hasLogo: false },
    { id: "sylhet", name: "Govt. Teachers' Training College, Sylhet", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, সিলেট", city: "Sylhet", established: 1946, slug: "ttc-sylhet", logo: "", hasLogo: false },
    { id: "chattagram", name: "Govt. Teachers' Training College, Chattagram", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, চট্টগ্রাম", city: "Chattagram", established: 1958, slug: "ttc-chattagram", logo: "", hasLogo: false },
    { id: "rangpur", name: "Govt. Teachers' Training College, Rangpur", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রংপুর", city: "Rangpur", established: 1882, slug: "ttc-rangpur", logo: "", hasLogo: false },
    { id: "khulna", name: "Govt. Teachers' Training College, Khulna", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, খুলনা", city: "Khulna", established: 1970, slug: "ttc-khulna", logo: "", hasLogo: false },
    { id: "mymensingh", name: "Govt. Women's Teachers' Training College, Mymensingh", nameBn: "সরকারি মহিলা টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ", city: "Mymensingh", established: 1952, slug: "ttc-mymensingh", logo: "", hasLogo: false },
    { id: "bogura", name: "Govt. B.Ed College, Bogura", nameBn: "সরকারি বি.এড কলেজ, বগুড়া", city: "Bogura", established: 2000, slug: "bed-bogura", logo: "https://res.cloudinary.com/dqmqvynxo/image/upload/v1775406576/ttc-connect/logos/aoij4zt9ikuemwmvfkqd.jpg", hasLogo: true },
    { id: "jashore", name: "Govt. Teachers' Training College, Jashore", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, যশোর", city: "Jashore", established: 1963, slug: "ttc-jashore", logo: "", hasLogo: false },
    { id: "barishal", name: "Govt. Teachers' Training College, Barishal", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, বরিশাল", city: "Barishal", established: 1999, slug: "ttc-barishal", logo: "", hasLogo: false },
    { id: "faridpur", name: "Govt. Teachers' Training College, Faridpur", nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফরিদপুর", city: "Faridpur", established: 2005, slug: "ttc-faridpur", logo: "", hasLogo: false },
    { id: "pabna", name: "Govt. B.Ed College, Pabna", nameBn: "সরকারি বি.এড কলেজ, পাবনা", city: "Pabna", established: 1998, slug: "bed-pabna", logo: "", hasLogo: false },
];

const collegeProfiles: Record<string, {
    shortName: string; location: string; principal: string; principalContact: string;
    teachers: number; students: number; classrooms: number; hostel: boolean;
    description: string; achievements: string[]; color: string;
    social: { facebook: string; website: string };
    teachersList: { name: string; designation: string; department: string; email: string; phone: string }[];
    clubs: { name: string; icon: string; members: number; advisor: string; membersList: string[] }[];
}> = {
    dhaka: {
        shortName: "Govt. Teachers' Training College, Dhaka", location: "Dhaka, Bangladesh",
        principal: "Prof. Dr. Mohammad Ali", principalContact: "+880-2-9661373",
        teachers: 45, students: 850, classrooms: 30, hostel: true,
        description: "The oldest and most prestigious TTC in Bangladesh, established on January 6, 1909.",
        achievements: ["Best TTC Award 2024", "National Debate Champions", "100% pass rate in B.Ed 2025"],
        color: "#1a1a1a",
        social: { facebook: "https://facebook.com/ttcdhaka", website: "https://ttcdhaka.edu.bd" },
        teachersList: [
            { name: "Prof. Dr. Mohammad Ali", designation: "Principal", department: "Administration", email: "principal@ttcdhaka.edu.bd", phone: "+880-2-9661373" },
            { name: "Prof. Rehana Akhter", designation: "Vice Principal", department: "Education", email: "rehana@ttcdhaka.edu.bd", phone: "+880-2-9661374" },
        ],
        clubs: [
            { name: "Debate Club", icon: "🎙️", members: 60, advisor: "Dr. Kamal Hossain", membersList: ["Tanvir Rahman (President)"] },
            { name: "Sports Club", icon: "⚽", members: 120, advisor: "Prof. Rehana Akhter", membersList: ["Sakib Al Hasan (Captain)"] },
        ],
    },
    feni: {
        shortName: "Govt. Teachers' Training College, Feni", location: "Feni, Bangladesh",
        principal: "Prof. Md. Abdul Motaleb", principalContact: "+880-331-63456",
        teachers: 30, students: 600, classrooms: 22, hostel: true,
        description: "Established in 1962, Govt. TTC Feni is one of the leading teacher training institutions in the Chattogram division.",
        achievements: ["Inter-college Debate Champions 2025", "Best Campus Award 2024"],
        color: "#0D6E3F",
        social: { facebook: "https://facebook.com/ttcfeni", website: "" },
        teachersList: [
            { name: "Prof. Md. Abdul Motaleb", designation: "Principal", department: "Administration", email: "principal@ttcfeni.gov.bd", phone: "+880-331-63456" },
        ],
        clubs: [
            { name: "Debate Club", icon: "🎙️", members: 45, advisor: "Dr. Shamim Ahmad", membersList: ["Eftakhar Amin Sakib (President)"] },
            { name: "Sports Club", icon: "⚽", members: 80, advisor: "Prof. Abdul Motaleb", membersList: [] },
        ],
    },
    rajshahi: {
        shortName: "Govt. Teachers' Training College, Rajshahi", location: "Rajshahi, Bangladesh",
        principal: "Prof. Dr. Abdul Karim", principalContact: "+880-721-750345",
        teachers: 38, students: 720, classrooms: 25, hostel: true,
        description: "Established in 1955, TTC Rajshahi is one of the most well-known teacher training colleges in northern Bangladesh.",
        achievements: ["National Science Fair Winners 2024"], color: "#1B1464",
        social: { facebook: "https://facebook.com/ttcrajshahi", website: "" },
        teachersList: [{ name: "Prof. Dr. Abdul Karim", designation: "Principal", department: "Administration", email: "principal@ttcrajshahi.gov.bd", phone: "+880-721-750345" }],
        clubs: [{ name: "Science Club", icon: "🔬", members: 55, advisor: "Prof. Dr. Abdul Karim", membersList: [] }],
    },
    cumilla: {
        shortName: "Govt. Teachers' Training College, Cumilla", location: "Cumilla, Bangladesh",
        principal: "Prof. Md. Rafiqul Islam", principalContact: "+880-81-76543",
        teachers: 32, students: 580, classrooms: 20, hostel: true,
        description: "Established in 1962, TTC Cumilla is a prominent teacher training college.",
        achievements: ["Inter-college Cultural Champions 2024"], color: "#0D3B8F",
        social: { facebook: "https://facebook.com/ttccumilla", website: "" },
        teachersList: [{ name: "Prof. Md. Rafiqul Islam", designation: "Principal", department: "Administration", email: "principal@ttccumilla.gov.bd", phone: "+880-81-76543" }],
        clubs: [{ name: "Cultural Club", icon: "🎭", members: 50, advisor: "Prof. Md. Rafiqul Islam", membersList: [] }],
    },
    sylhet: {
        shortName: "Govt. Teachers' Training College, Sylhet", location: "Sylhet, Bangladesh",
        principal: "Prof. Dr. Anwar Hossain", principalContact: "+880-821-717890",
        teachers: 35, students: 650, classrooms: 24, hostel: true,
        description: "Established in 1946, one of the oldest teacher training colleges in Bangladesh.",
        achievements: ["Best TTC in Sylhet Division 2024"], color: "#0A5C36",
        social: { facebook: "https://facebook.com/ttcsylhet", website: "" },
        teachersList: [{ name: "Prof. Dr. Anwar Hossain", designation: "Principal", department: "Administration", email: "principal@ttcsylhet.gov.bd", phone: "+880-821-717890" }],
        clubs: [{ name: "Debate Club", icon: "🎙️", members: 40, advisor: "Prof. Dr. Anwar Hossain", membersList: [] }],
    },
    chattagram: {
        shortName: "Govt. Teachers' Training College, Chattagram", location: "Chattagram, Bangladesh",
        principal: "Prof. Dr. Jamal Uddin", principalContact: "+880-31-619876",
        teachers: 40, students: 780, classrooms: 28, hostel: true,
        description: "Established in 1958, the premier teacher training college in the port city.",
        achievements: ["National Education Excellence Award 2024"], color: "#2C3E50",
        social: { facebook: "https://facebook.com/ttcchattagram", website: "" },
        teachersList: [{ name: "Prof. Dr. Jamal Uddin", designation: "Principal", department: "Administration", email: "principal@ttcchattagram.gov.bd", phone: "+880-31-619876" }],
        clubs: [{ name: "Sports Club", icon: "⚽", members: 90, advisor: "Prof. Dr. Jamal Uddin", membersList: [] }],
    },
    rangpur: { shortName: "Govt. Teachers' Training College, Rangpur", location: "Rangpur, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1882.", achievements: [], color: "#2D7D2D", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    khulna: { shortName: "Govt. Teachers' Training College, Khulna", location: "Khulna, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1970.", achievements: [], color: "#1A5276", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    mymensingh: { shortName: "Govt. Women's Teachers' Training College, Mymensingh", location: "Mymensingh, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1952. The only dedicated women's TTC.", achievements: [], color: "#8E44AD", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    bogura: { shortName: "Govt. B.Ed College, Bogura", location: "Bogura, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 2000.", achievements: [], color: "#1A5276", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    jashore: { shortName: "Govt. Teachers' Training College, Jashore", location: "Jashore, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1963.", achievements: [], color: "#1B4F72", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    barishal: { shortName: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal", location: "Barishal, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1999.", achievements: [], color: "#0E6655", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    faridpur: { shortName: "Govt. Teachers' Training College, Faridpur", location: "Faridpur, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 2005.", achievements: [], color: "#1A5276", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
    pabna: { shortName: "Govt. B.Ed College, Pabna", location: "Pabna, Bangladesh", principal: "To be updated", principalContact: "", teachers: 0, students: 0, classrooms: 0, hostel: false, description: "Established in 1998.", achievements: [], color: "#6C3483", social: { facebook: "", website: "" }, teachersList: [], clubs: [] },
};

const faqSeedData = [
    { question: "টিটিসি কানেক্ট কী?", answer: "TTC Network হলো বাংলাদেশের ১৪টি সরকারি টিচার্স ট্রেনিং কলেজের শিক্ষার্থী ও শিক্ষকদের জন্য একটি ইউনিফাইড ডিজিটাল প্ল্যাটফর্ম।", language: "bengali", order: 1 },
    { question: "কারা এই প্ল্যাটফর্ম ব্যবহার করতে পারবে?", answer: "সকল সরকারি টিটিসির বর্তমান শিক্ষার্থী, শিক্ষক, ও প্রাক্তন শিক্ষার্থীরা এই প্ল্যাটফর্ম ব্যবহার করতে পারবেন।", language: "bengali", order: 2 },
    { question: "কোন কোন কলেজ এখানে আছে?", answer: "বাংলাদেশের সকল ১৪টি সরকারি টিটিসি ও বি.এড কলেজ — ঢাকা, ময়মনসিংহ (মহিলা), বগুড়া (বি.এড), রাজশাহী, ফেনী, কুমিল্লা, সিলেট, চট্টগ্রাম, রংপুর, খুলনা, যশোর, বরিশাল, ফরিদপুর, এবং পাবনা।", language: "bengali", order: 3 },
    { question: "এই প্ল্যাটফর্ম কি সরকারি?", answer: "না, এটি একটি স্টুডেন্ট-বিল্ট ইনিশিয়েটিভ — ফেনী টিটিসির শিক্ষার্থী সাকিব কর্তৃক নির্মিত ও পরিচালিত।", language: "bengali", order: 4 },
];

// ═══════════════════════════════════════════════════
//  SEED FUNCTIONS
// ═══════════════════════════════════════════════════

async function seedColleges(): Promise<number> {
    let count = 0;
    for (const college of colleges) {
        const profile = collegeProfiles[college.id];
        if (!profile) continue;

        await db.collection("colleges").doc(college.id).set({
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
            lastUpdatedDate: FieldValue.serverTimestamp(),
        });
        count++;
        console.log(`  ✅ ${college.name}`);
    }
    return count;
}

async function seedQACards(): Promise<number> {
    let count = 0;
    for (const card of faqSeedData) {
        await db.collection("qaCards").add({
            question: card.question,
            answer: card.answer,
            language: card.language,
            isVisible: true,
            order: card.order,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        count++;
        console.log(`  ✅ Q&A Card #${card.order}`);
    }
    return count;
}

async function main() {
    console.log("\n🌱 TTC Network — Firestore Seed Script");
    console.log("═══════════════════════════════════════\n");

    // Check if already seeded
    const existingColleges = await db.collection("colleges").get();
    if (existingColleges.size > 0) {
        console.log(`⚠️  Database already has ${existingColleges.size} colleges.`);
        console.log("   Delete the 'colleges' collection in Firebase Console to re-seed.\n");
        process.exit(1);
    }

    console.log("📚 Seeding 14 colleges...");
    const collegeCount = await seedColleges();
    console.log(`\n✅ ${collegeCount} colleges seeded.\n`);

    console.log("❓ Seeding FAQ cards...");
    const qaCount = await seedQACards();
    console.log(`\n✅ ${qaCount} Q&A cards seeded.\n`);

    console.log("═══════════════════════════════════════");
    console.log(`🎉 Done! ${collegeCount} colleges + ${qaCount} Q&A cards in Firestore.`);
    console.log("   Check: https://console.firebase.google.com/project/ttc-connect-2273e/firestore\n");

    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seed failed:", err.message || err);
    process.exit(1);
});
