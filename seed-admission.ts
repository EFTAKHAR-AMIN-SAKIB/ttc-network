import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

const admissionStepsData = [
  {
    title: "অনলাইনে প্রাথমিক আবেদন",
    subtitle: "Online Primary Application",
    description: "জাতীয় বিশ্ববিদ্যালয়ের ভর্তি বিষয়ক ওয়েবসাইটে (app1.nu.edu.bd অথবা nu.ac.bd/admissions) প্রবেশ করে B.Ed (Honours) প্রফেশনাল কোর্সে প্রাথমিক আবেদন ফরম সঠিকভাবে পূরণ করতে হবে। আবেদন ফি বাবদ ৩৫০ টাকা (জাতীয় বিশ্ববিদ্যালয় নির্ধারিত) মোবাইল ব্যাংকিং বা সংশ্লিষ্ট কলেজের নির্দেশনা অনুযায়ী জমা দিয়ে রসিদ সংগ্রহ করতে হবে।",
    iconName: "Monitor",
    stepNumber: 1,
    order: 1,
    isVisible: true,
  },
  {
    title: "মেধাতালিকা ও মাইগ্রেশন",
    subtitle: "Merit List, Migration & Release Slip",
    description: "আবেদনকারীদের এসএসসি ও এইচএসসি/সমমান পরীক্ষার জিপিএ (GPA)-এর ভিত্তিতে ১ম ও ২য় মেধাতালিকা প্রকাশ করা হয়। এছাড়া বিষয় বা কলেজ পরিবর্তনের জন্য অটো-মাইগ্রেশন সুবিধা থাকে। যারা সুযোগ পান না, তারা পরবর্তীতে ১ম ও ২য় রিলিজ স্লিপে (Release Slip) নতুন করে ৫টি কলেজে আবেদন করতে পারেন।",
    iconName: "Trophy",
    stepNumber: 2,
    order: 2,
    isVisible: true,
  },
  {
    title: "চূড়ান্ত ভর্তি ফরম পূরণ",
    subtitle: "Final Admission Form Fill-up",
    description: "মেধাতালিকায় অথবা রিলিজ স্লিপে মনোনীত শিক্ষার্থীরা ভর্তি রোল ও পিন নম্বর ব্যবহার করে লগইন করবেন এবং 'Final Admission Form' পূরণ করবেন। ফরমে শিক্ষার্থীর সকল ব্যক্তিগত ও অভিভাবকের তথ্য নির্ভুলভাবে প্রদান করে ফরমটির ২ কপি রঙিন প্রিন্ট সংরক্ষণ করতে হবে।",
    iconName: "FileCheck",
    stepNumber: 3,
    order: 3,
    isVisible: true,
  },
  {
    title: "কাগজপত্র যাচাই ও ভর্তি নিশ্চিতকরণ",
    subtitle: "Document Verification & Final Enrollment",
    description: "চূড়ান্ত ভর্তি ফরম, এসএসসি ও এইচএসসি পরীক্ষার মূল মার্কশিট/একাডেমিক ট্রান্সক্রিপ্ট ও সত্যায়িত ফটোকপি, মূল প্রশংসাপত্র (Testimonial), পাসপোর্ট সাইজের সত্যায়িত ছবি (৪-৬ কপি) এবং ১ম সেমিস্টারের নির্ধারিত সরকারি ভর্তি ফি সরাসরি কলেজের ভর্তি ডেস্কে জমা দিয়ে ভর্তি নিশ্চিত করতে হবে।",
    iconName: "GraduationCap",
    stepNumber: 4,
    order: 4,
    isVisible: true,
  },
];

const admissionCostsData = [
  { label: "প্রাথমিক আবেদন ফি", amount: "৩৫০ টাকা", order: 1, isVisible: true, isHighlighted: false },
  { label: "ভর্তি ও ১ম সেমিস্টার ফি (কলেজ + জাবি রেজিস্ট্রেশন)", amount: "৪,০০০ - ৫,৫০০ টাকা", order: 2, isVisible: true, isHighlighted: false },
  { label: "সেমিস্টার ফি (প্রতি বছর ২টি সেমিস্টার)", amount: "২,০০০ - ৩,০০০ টাকা", order: 3, isVisible: true, isHighlighted: false },
  { label: "সেমিস্টার পরীক্ষা ফরম পূরণ ফি (প্রতি সেমিস্টার)", amount: "১,৫০০ - ২,৫০০ টাকা", order: 4, isVisible: true, isHighlighted: false },
  { label: "৪ বছরের মোট আনুমানিক খরচ (৮টি সেমিস্টার)", amount: "৩৫,০০০ - ৪৫,০০০ টাকা*", order: 5, isVisible: true, isHighlighted: true },
];

async function seed() {
  console.log("Seeding admission data...");
  const batch = db.batch();

  // Settings
  const settingsRef = db.collection("settings").doc("admission");
  batch.set(settingsRef, {
    sectionTitle: "বি.এড (অনার্স) ভর্তি প্রক্রিয়া",
    sectionSubtitle: "সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সহজ ও পূর্ণাঙ্গ গাইডলাইন",
    costTitle: "খরচের আনুমানিক ধারণা",
    isVisible: true,
    updatedAt: new Date(),
  });

  // Steps
  admissionStepsData.forEach((step) => {
    const docRef = db.collection("admissionSteps").doc();
    batch.set(docRef, {
      ...step,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // Costs
  admissionCostsData.forEach((cost) => {
    const docRef = db.collection("admissionCosts").doc();
    batch.set(docRef, {
      ...cost,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await batch.commit();
  console.log("Seeding complete!");
}

seed().catch(console.error);
