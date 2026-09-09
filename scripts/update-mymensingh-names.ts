import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adminClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
const adminPrivateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId,
            clientEmail: adminClientEmail,
            privateKey: adminPrivateKey,
        }),
    });
}

const db = getFirestore();

async function main() {
    console.log("Checking and updating Mymensingh colleges in Firestore...");

    // 1. Women's TTC
    const womenRef = db.collection("colleges").doc("mymensingh");
    const womenSnap = await womenRef.get();
    if (womenSnap.exists) {
        await womenRef.update({
            name: "Govt. Women's Teachers' Training College, Mymensingh",
            shortName: "Mymensingh TTC (Women)",
            gender: "women",
        });
        console.log("✅ Updated colleges/mymensingh: shortName -> Mymensingh TTC (Women)");
    } else {
        console.log("⚠️ colleges/mymensingh doc not found in Firestore.");
    }

    // 2. Men's / General TTC (mymensingh_coed)
    const coedRef = db.collection("colleges").doc("mymensingh_coed");
    const coedSnap = await coedRef.get();
    if (coedSnap.exists) {
        await coedRef.update({
            name: "Govt. Teachers' Training College (Men), Mymensingh",
            nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ (পুরুষ), ময়মনসিংহ",
            shortName: "Mymensingh TTC (Men)",
            gender: "men",
        });
        console.log("✅ Updated colleges/mymensingh_coed: shortName -> Mymensingh TTC (Men)");
    } else {
        console.log("Creating colleges/mymensingh_coed document...");
        await coedRef.set({
            name: "Govt. Teachers' Training College (Men), Mymensingh",
            nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ (পুরুষ), ময়মনসিংহ",
            shortName: "Mymensingh TTC (Men)",
            city: "Mymensingh",
            established: 1948,
            slug: "mymensingh-coed",
            gender: "men",
            logo: "",
            hasLogo: false,
            color: "#1a5276",
            principal: "To be updated",
            principalContact: "",
            students: 0,
            teachers: 0,
            classrooms: 0,
            hostel: false,
            location: "Mymensingh, Bangladesh",
            description: "Established in 1948. The primary general and men's Teachers' Training College in Mymensingh.",
            achievements: [],
            social: { facebook: "", website: "" },
            teachersList: [],
            clubs: [],
            gallery: [],
        });
        console.log("✅ Created colleges/mymensingh_coed in Firestore.");
    }

    // 3. Also check legacy mymensingh-general if it exists
    const legacyRef = db.collection("colleges").doc("mymensingh-general");
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists) {
        await legacyRef.update({
            name: "Govt. Teachers' Training College (Men), Mymensingh",
            shortName: "Mymensingh TTC (Men)",
            gender: "men",
        });
        console.log("✅ Updated legacy colleges/mymensingh-general");
    }

    console.log("Finished updating Mymensingh college documents.");
    process.exit(0);
}

main().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
});
