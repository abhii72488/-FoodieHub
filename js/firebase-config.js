// ============================================================
// FoodieHub - Firebase Configuration
// ============================================================
// IMPORTANT: Replace the placeholder values below with your
// actual Firebase project configuration.
// Never commit real credentials to a public repository.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ============================================================
// YOUR FIREBASE CONFIGURATION
// Replace these values with your Firebase project's config.
// Find them in: Firebase Console → Project Settings → General
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBzggs2dIdhcUdL2LPAu_cW6vBR2ITZuIU",
  authDomain: "foodiehub-42514.firebaseapp.com",
  projectId: "foodiehub-42514",
  storageBucket: "foodiehub-42514.firebasestorage.app",
  messagingSenderId: "44070608633",
  appId: "1:44070608633:web:053ffada43808c8bc70c28",
  measurementId: "G-B8H6QRNWFP",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence for Firestore (best-effort)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore persistence unavailable: multiple tabs open.");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence not supported in this browser.");
  }
});

export default app;
