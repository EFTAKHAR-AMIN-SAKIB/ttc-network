import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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

async function backfill() {
    const docId = "mymensingh_coed";
    console.log(`Checking if college "${docId}" exists in Firestore...`);
    
    const docRef = db.collection("colleges").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.log(`College "${docId}" not found. Inserting default college document...`);
        const newCollegeData = {
            name: "Govt. Teachers' Training College, Mymensingh",
            nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ",
            shortName: "Govt. Teachers' Training College, Mymensingh",
            city: "Mymensingh",
            established: 1948,
            slug: "mymensingh-coed",
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
            description: "Established in 1948.",
            achievements: [],
            social: { facebook: "", website: "" },
            teachersList: [],
            clubs: [],
            gallery: [],
            lastUpdatedBy: "backfill-script",
            lastUpdatedDate: FieldValue.serverTimestamp(),
        };

        await docRef.set(newCollegeData);
        console.log(`✅ Successfully backfilled college "${docId}" in Firestore.`);
    } else {
        console.log(`College "${docId}" already exists. No actions taken.`);
    }
}

backfill()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Error backfilling college:", err);
        process.exit(1);
    });
