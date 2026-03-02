import type { Application } from "@/types";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc
} from "firebase/firestore";

const isDev = process.env.NODE_ENV === "development";

function getUserApplicationsRef() {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) {
    if (isDev) console.warn("[applicationStorage] db or uid missing", { db: !!db, uid });
    return null;
  }
  return collection(db, "users", uid, "applications");
}

export async function getApplications(): Promise<Application[]> {
  const ref = getUserApplicationsRef();
  if (!ref) return [];
  try {
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  } catch (err) {
    if (isDev) console.error("[applicationStorage] getApplications failed:", err);
    return [];
  }
}

export async function getApplication(id: string): Promise<Application | null> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid, "applications", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Application;
  } catch (err) {
    if (isDev) console.error("[applicationStorage] getApplication failed:", err);
    return null;
  }
}

export async function saveApplication(app: Application): Promise<Application> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return app;
  try {
    const { id, ...data } = app;
    await setDoc(doc(db, "users", uid, "applications", id), data);
  } catch (err) {
    if (isDev) console.error("[applicationStorage] saveApplication failed:", err);
  }
  return app;
}

export async function ensureApplication(
  scholarshipId: string,
  scholarshipDetails?: { docsRequired?: string[] }
): Promise<Application> {
  const uid = auth?.currentUser?.uid;
  const appId = scholarshipId;

  if (!db || !uid) {
    throw new Error("Not signed in or Firebase not ready. Please wait a moment and try again.");
  }

  try {
    const ref = doc(db, "users", uid, "applications", appId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() } as Application;

    const newApp: Application = {
      id: appId,
      scholarshipId,
      status: "not_started",
      progress: 0,
      nextTask: "Review requirements and prompts",
      docsRequired: scholarshipDetails?.docsRequired?.length
        ? scholarshipDetails.docsRequired
        : ["Transcript", "Resume"],
      docsUploaded: [],
      promptResponses: []
    };
    const { id, ...data } = newApp;
    await setDoc(ref, data);

    const verify = await getDocFromServer(ref);
    if (!verify.exists()) {
      throw new Error("Application could not be saved. Check Firestore security rules.");
    }

    return newApp;
  } catch (err) {
    if (isDev) console.error("[applicationStorage] ensureApplication failed:", err);
    throw err;
  }
}

export async function updateApplicationStatus(
  id: string,
  status: Application["status"],
  progress?: number
): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return;
  try {
    const ref = doc(db, "users", uid, "applications", id);
    const updates: Record<string, unknown> = { status };
    if (progress !== undefined) updates.progress = progress;
    await updateDoc(ref, updates);
  } catch (err) {
    if (isDev) console.error("[applicationStorage] updateApplicationStatus failed:", err);
  }
}
