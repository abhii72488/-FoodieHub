// ============================================================
// FoodieHub - Authentication Module
// Handles: Registration, Login, Logout, Auth State
// ============================================================

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Auth state listener ──────────────────────────────────────
// Exported so every page can react to auth state changes.
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Get current user ────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}

// ── Register new user ────────────────────────────────────────
export async function registerUser({ name, email, password }) {
  // Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  // Update display name in Auth
  await updateProfile(user, { displayName: name });

  // Save profile in Firestore (no password stored)
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: "",
    address: "",
    role: "user", // Default role. Admin role must be set via trusted backend.
    createdAt: serverTimestamp(),
  });

  return user;
}

// ── Login existing user ──────────────────────────────────────
export async function loginUser({ email, password }) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

// ── Logout ───────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
}

// ── Fetch user profile from Firestore ────────────────────────
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ── Send password reset email ────────────────────────────────
export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Check if current user is admin ───────────────────────────
// Admin status is stored in Firestore. The actual security is enforced
// by Firestore Security Rules — not by this client-side check.
export async function isCurrentUserAdmin() {
  const user = auth.currentUser;
  if (!user) return false;
  const profile = await fetchUserProfile(user.uid);
  return profile?.role === "admin";
}
