import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore/lite";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

export const app = initializeApp(isConfigured ? firebaseConfig : { projectId: "not-configured", apiKey: "x" });

// ignoreUndefinedProperties stops a half-filled block from failing a save
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
