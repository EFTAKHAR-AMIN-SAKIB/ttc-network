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
        const colSnap = await db.collection("stories").orderBy("timestamp", "desc").get();
        console.log("Total stories in DB:", colSnap.size);
        for (const doc of colSnap.docs) {
            const data = doc.data();
            const ts = data.timestamp;
            let dateStr = "N/A";
            if (ts) {
                if (ts.toDate) {
                    dateStr = ts.toDate().toISOString();
                } else if (ts._seconds) {
                    dateStr = new Date(ts._seconds * 1000).toISOString();
                } else if (ts.seconds) {
                    dateStr = new Date(ts.seconds * 1000).toISOString();
                } else {
                    dateStr = JSON.stringify(ts);
                }
            }
            console.log(`ID: ${doc.id} | Title: ${data.title} | Timestamp: ${dateStr} | Status: ${data.status}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
