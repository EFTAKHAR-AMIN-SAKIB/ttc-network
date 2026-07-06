/**
 * Firebase Client SDK Initialization — Lazy Singleton
 * =====================================================
 * Uses lazy initialization so Firebase is only created
 * when first accessed at RUNTIME, never during build.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;
let _messaging: Messaging | null = null;

function getAppInstance(): FirebaseApp {
    if (!_app) {
        _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    return _app;
}

export function getDb(): Firestore {
    if (!_db) _db = getFirestore(getAppInstance());
    return _db;
}

export function getAuthInstance(): Auth {
    if (!_auth) _auth = getAuth(getAppInstance());
    return _auth;
}

export function getStorageInstance(): FirebaseStorage {
    if (!_storage) _storage = getStorage(getAppInstance());
    return _storage;
}

export function getMessagingInstance(): Messaging | null {
    if (typeof window === "undefined") return null;
    if (!_messaging) {
        try {
            _messaging = getMessaging(getAppInstance());
        } catch (e) {
            console.warn("[Firebase] FCM messaging is not supported in this environment:", e);
        }
    }
    return _messaging;
}

export default getAppInstance;
