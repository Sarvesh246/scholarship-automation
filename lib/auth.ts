import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

function guardAuth() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Add env vars and restart.");
  }
}

export function signInWithGoogle() {
  guardAuth();
  return signInWithPopup(auth!, googleProvider);
}

export function signUpWithEmail(email: string, password: string) {
  guardAuth();
  return createUserWithEmailAndPassword(auth!, email, password);
}

export function signInWithEmail(email: string, password: string) {
  guardAuth();
  return signInWithEmailAndPassword(auth!, email, password);
}

export function sendPasswordReset(email: string) {
  guardAuth();
  return sendPasswordResetEmail(auth!, email);
}

export function signOutUser() {
  guardAuth();
  return signOut(auth!);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

export async function updateUserDisplayName(name: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user) return;
  await updateProfile(user, { displayName: name });
}

