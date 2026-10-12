import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";

/**
 * Firebase Client Configuration
 * Supports environment variables with graceful fallback for initial onboarding.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemoKeyUnifiedProductOS2026",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "unified-product-os.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "unified-product-os",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "unified-product-os.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:100000000000:web:abcdef1234567890",
};

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  try {
    if (typeof window !== "undefined") {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } else {
      db = getFirestore(app);
    }
  } catch {
    db = getFirestore(app);
  }
} else {
  app = getApp();
  db = getFirestore(app);
}

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY
);

export { app, db, firebaseConfig };
