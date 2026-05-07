import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
});

const db = admin.firestore();

const shortNames: Record<string, string> = {
    "dhaka": "TTC Dhaka",
    "feni": "TTC Feni",
    "rajshahi": "TTC Rajshahi",
    "cumilla": "TTC Cumilla",
    "sylhet": "TTC Sylhet",
    "chattagram": "TTC Chattagram",
    "rangpur": "TTC Rangpur",
    "khulna": "TTC Khulna",
    "mymensingh": "TTC Mymensingh",
    "jashore": "TTC Jashore",
    "barishal": "TTC Barishal",
    "faridpur": "TTC Faridpur",
    "pabna": "B.Ed Pabna",
    "bogura": "B.Ed Bogura",
};

async function fixShortNames() {
    console.log("Fixing shortNames...");
    const snapshot = await db.collection("colleges").get();
    let updated = 0;
    for (const doc of snapshot.docs) {
        const id = doc.id;
        if (shortNames[id]) {
            await doc.ref.update({ shortName: shortNames[id] });
            console.log(`Updated ${id} to ${shortNames[id]}`);
            updated++;
        }
    }
    console.log(`Done. Updated ${updated} colleges.`);
    process.exit(0);
}

fixShortNames();
