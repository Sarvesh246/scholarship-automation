import type { Essay } from "@/types";
import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

export interface EssayVersion {
  id: string;
  content: string;
  title: string;
  tags: string[];
  at: string;
}

const MAX_VERSIONS = 10;

function getUserEssaysRef() {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "essays");
}

function getVersionsRef(essayId: string) {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "essays", essayId, "versions");
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

function stripHtmlForCount(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(text: string): number {
  const plain = stripHtmlForCount(text ?? "");
  if (!plain) return 0;
  return plain.split(/\s+/).length;
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

  if (!db || !uid) {
    throw new Error("Not signed in or database not ready. Please wait a moment and try again.");
  }
  try {
    const essaysRef = doc(db, "users", uid, "essays", essayId);
    const existing = await getDoc(essaysRef);
    if (existing.exists() && essay.id) {
      const prev = existing.data() as Essay;
      const changed =
        (prev.content ?? "") !== (essay.content ?? "") ||
        (prev.title ?? "") !== (record.title) ||
        JSON.stringify(prev.tags ?? []) !== JSON.stringify(record.tags);
      if (changed) {
        const versionsRef = getVersionsRef(essayId);
        if (versionsRef) {
          const versionId = `v-${Date.now()}`;
          await setDoc(doc(versionsRef, versionId), {
            content: prev.content ?? "",
            title: prev.title ?? "",
            tags: prev.tags ?? [],
            at: prev.updatedAt ?? now,
          });
          const versionsSnap = await getDocs(versionsRef);
          const sorted = versionsSnap.docs
            .sort((a, b) => ((b.data().at as string) ?? "").localeCompare((a.data().at as string) ?? ""));
          for (const d of sorted.slice(MAX_VERSIONS)) {
            await deleteDoc(d.ref);
          }
        }
      }
    }
    const { id: _id, ...data } = record;
    await setDoc(essaysRef, data);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Failed to save essay. Check your connection and try again.");
  }
  return record;
}

export async function getEssayVersions(essayId: string): Promise<EssayVersion[]> {
  const ref = getVersionsRef(essayId);
  if (!ref) return [];
  try {
    const snap = await getDocs(ref);
    const versions = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      at: (d.data() as { at?: string }).at ?? "",
    })) as EssayVersion[];
    versions.sort((a, b) => b.at.localeCompare(a.at));
    return versions.slice(0, MAX_VERSIONS);
  } catch {
    return [];
  }
}

export async function restoreEssayVersion(essayId: string, version: EssayVersion): Promise<Essay | null> {
  return saveEssay({
    id: essayId,
    title: version.title,
    tags: version.tags,
    content: version.content,
  });
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

/** Duplicate an essay. Returns the new essay. */
export async function duplicateEssay(id: string): Promise<Essay | null> {
  const existing = await getEssay(id);
  if (!existing) return null;
  const copy: Omit<Essay, "id"> = {
    title: existing.title.startsWith("Copy of ") ? existing.title : `Copy of ${existing.title}`,
    tags: [...(existing.tags ?? [])],
    wordCount: existing.wordCount ?? 0,
    updatedAt: new Date().toISOString(),
    content: existing.content ?? "",
  };
  return saveEssay({ ...copy, title: copy.title });
}
