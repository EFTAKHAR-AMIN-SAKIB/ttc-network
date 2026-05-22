import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
const adminPrivateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

const app = initializeApp({
    credential: cert({
        projectId,
        clientEmail: adminClientEmail,
        privateKey: adminPrivateKey,
    }),
});

const db = getFirestore(app);

async function check() {
    try {
        const colSnap = await db.collection("colleges").get();
        console.log("Total colleges in DB:", colSnap.size);
        for (const doc of colSnap.docs) {
            console.log(`ID: ${doc.id} | Name: ${doc.data().name} | ShortName: ${doc.data().shortName}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
