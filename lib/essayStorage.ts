import type { Essay } from "@/types";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";

function getUserEssaysRef() {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "essays");
}

export async function getEssays(): Promise<Essay[]> {
  const ref = getUserEssaysRef();
  if (!ref) return [];
  try {
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Essay);
  } catch {
    return [];
  }
}

export async function getEssay(id: string): Promise<Essay | null> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid, "essays", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Essay;
  } catch {
    return null;
  }
}

function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export async function saveEssay(essay: {
  id?: string;
  title: string;
  tags: string[];
  content: string;
}): Promise<Essay> {
  const uid = auth?.currentUser?.uid;
  const essayId = essay.id ?? `essay-${Date.now()}`;
  const now = new Date().toISOString();
  const record: Essay = {
    id: essayId,
    title: essay.title || "Untitled essay",
    tags: essay.tags?.length ? essay.tags : ["General"],
    wordCount: wordCount(essay.content ?? ""),
    updatedAt: now,
    content: essay.content ?? ""
  };

  if (!db || !uid) return record;
  try {
    const { id, ...data } = record;
    await setDoc(doc(db, "users", uid, "essays", id), data);
  } catch {
    /* write failed */
  }
  return record;
}

export async function deleteEssay(id: string): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "essays", id));
  } catch {
    /* silent */
  }
}
