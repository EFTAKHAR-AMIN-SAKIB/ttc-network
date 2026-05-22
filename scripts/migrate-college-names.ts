import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
});

const db = admin.firestore();

async function runMigration() {
    console.log("Starting full college names migration...");

    // 1. Update Colleges Collection
    const collegeUpdates = [
        { id: "dhaka", name: "Govt. Teachers' Training College, Dhaka" },
        { id: "feni", name: "Govt. Teachers' Training College, Feni" },
        { id: "rajshahi", name: "Govt. Teachers' Training College, Rajshahi" },
        { id: "cumilla", name: "Govt. Teachers' Training College, Cumilla" },
        { id: "sylhet", name: "Govt. Teachers' Training College, Sylhet" },
        { id: "chattagram", name: "Govt. Teachers' Training College, Chattagram" },
        { id: "rangpur", name: "Govt. Teachers' Training College, Rangpur" },
        { id: "khulna", name: "Govt. Teachers' Training College, Khulna" },
        { id: "mymensingh", name: "Govt. Women's Teachers' Training College, Mymensingh" },
        { id: "mymensingh-general", name: "Govt. Teachers' Training College, Mymensingh" },
        { id: "jashore", name: "Govt. Teachers' Training College, Jashore" },
        { id: "barishal", name: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal" },
        { id: "faridpur", name: "Govt. Teachers' Training College, Faridpur" },
        { id: "pabna", name: "Govt. B.Ed College, Pabna" }
    ];

    for (const item of collegeUpdates) {
        const docRef = db.collection("colleges").doc(item.id);
        const doc = await docRef.get();
        if (doc.exists) {
            await docRef.update({ shortName: item.name });
            console.log(`Updated colleges.${item.id}.shortName to "${item.name}"`);
        } else {
            console.log(`Warning: colleges.${item.id} doc not found`);
        }
    }

    // Map of old/short names to formal names
    const collegeNameMap: { [key: string]: string } = {
        "TTC Dhaka": "Govt. Teachers' Training College, Dhaka",
        "TTC Feni": "Govt. Teachers' Training College, Feni",
        "TTC Rajshahi": "Govt. Teachers' Training College, Rajshahi",
        "TTC Cumilla": "Govt. Teachers' Training College, Cumilla",
        "TTC Sylhet": "Govt. Teachers' Training College, Sylhet",
        "TTC Chattagram": "Govt. Teachers' Training College, Chattagram",
        "TTC Rangpur": "Govt. Teachers' Training College, Rangpur",
        "TTC Khulna": "Govt. Teachers' Training College, Khulna",
        "Women's TTC Mymensingh": "Govt. Women's Teachers' Training College, Mymensingh",
        "TTC Mymensingh": "Govt. Teachers' Training College, Mymensingh",
        "TTC Jashore": "Govt. Teachers' Training College, Jashore",
        "TTC Barishal": "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal",
        "TTC Faridpur": "Govt. Teachers' Training College, Faridpur",
        "B.Ed Pabna": "Govt. B.Ed College, Pabna",
        "B.Ed College Pabna": "Govt. B.Ed College, Pabna",
    };

    // 2. Update Notices Collection
    const noticesSnapshot = await db.collection("notices").get();
    let updatedNoticesCount = 0;
    for (const doc of noticesSnapshot.docs) {
        const data = doc.data();
        const oldCollegeName = data.college;
        if (oldCollegeName && collegeNameMap[oldCollegeName]) {
            const newCollegeName = collegeNameMap[oldCollegeName];
            await doc.ref.update({ college: newCollegeName });
            console.log(`Updated notice ${doc.id} college from "${oldCollegeName}" to "${newCollegeName}"`);
            updatedNoticesCount++;
        }
    }
    console.log(`Done. Updated ${updatedNoticesCount} notices.`);

    // 3. Update Stories Collection
    const storiesSnapshot = await db.collection("stories").get();
    let updatedStoriesCount = 0;
    for (const doc of storiesSnapshot.docs) {
        const data = doc.data();
        const oldCollegeName = data.college;
        if (oldCollegeName && collegeNameMap[oldCollegeName]) {
            const newCollegeName = collegeNameMap[oldCollegeName];
            await doc.ref.update({ college: newCollegeName });
            console.log(`Updated story ${doc.id} college from "${oldCollegeName}" to "${newCollegeName}"`);
            updatedStoriesCount++;
        }
    }
    console.log(`Done. Updated ${updatedStoriesCount} stories.`);

    console.log("Migration completed successfully!");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
