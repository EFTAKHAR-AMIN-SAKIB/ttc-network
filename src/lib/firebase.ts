/**
 * Firebase Client SDK Initialization — Lazy Singleton
 * =====================================================
 * Uses lazy initialization so Firebase is only created
 * when first accessed at RUNTIME, never during build.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { 
    initializeFirestore, 
    getFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager, 
    type Firestore 
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDfq-EOAzmInRp4QT_gH9w2DK4l9KOFTBM",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ttc-connect-2273e.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ttc-connect-2273e",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ttc-connect-2273e.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "523150908585",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:523150908585:web:7605ff120912e66fde5db8",
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
    if (!_db) {
        const app = getAppInstance();
        if (typeof window !== "undefined") {
            try {
                _db = initializeFirestore(app, {
                    localCache: persistentLocalCache({
                        tabManager: persistentMultipleTabManager(),
                    }),
                });
            } catch {
                _db = getFirestore(app);
            }
        } else {
            _db = getFirestore(app);
        }
    }
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
