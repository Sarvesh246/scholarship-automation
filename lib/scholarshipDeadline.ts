/**
 * Deadline validation and expired scholarship cleanup.
 * Only scholarships with deadline >= today should be stored or shown.
 */
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebaseAdmin";
import { isInstitutionalGrant } from "./institutionalGrantFilter";

/** Today's date as YYYY-MM-DD (UTC). */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns true if deadline is today or in the future.
 * Expects deadline in YYYY-MM-DD format.
 */
export function isDeadlineValid(deadline: string | undefined): boolean {
  if (!deadline || typeof deadline !== "string") return false;
  const normalized = deadline.replace(/T.*$/, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  return normalized >= getTodayDateString();
}

const BATCH_SIZE = 500;

/** Normalize deadline from Firestore doc (string or Timestamp) to YYYY-MM-DD for comparison. */
function normalizeDeadlineFromDoc(deadline: unknown): string | null {
  if (typeof deadline === "string") {
    const s = deadline.replace(/T.*$/, "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  if (deadline && typeof deadline === "object" && "toDate" in deadline && typeof (deadline as { toDate: () => Date }).toDate === "function") {
    const d = (deadline as { toDate: () => Date }).toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (deadline && typeof deadline === "object" && "seconds" in (deadline as object)) {
    const sec = (deadline as { seconds: number }).seconds;
    const d = new Date(sec * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (deadline && typeof deadline === "object" && "_seconds" in (deadline as object)) {
    const sec = (deadline as { _seconds: number })._seconds;
    const d = new Date(sec * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

/**
 * Delete all scholarships with deadline before today from Firestore.
 * Returns the number of documents deleted.
 */
export async function deleteExpiredScholarships(): Promise<number> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const today = getTodayDateString();

  let snap;
  try {
    snap = await col.get();
  } catch (e) {
    console.error("[deleteExpiredScholarships] col.get() failed:", e);
    throw e;
  }

  const toDelete: DocumentReference[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const deadlineNorm = normalizeDeadlineFromDoc(data?.deadline);
    if (deadlineNorm != null && deadlineNorm < today) {
      toDelete.push(doc.ref);
    }
  }

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    try {
      await batch.commit();
    } catch (e) {
      console.error("[deleteExpiredScholarships] batch.commit() failed:", e);
      throw e;
    }
  }

  return toDelete.length;
}

/** Junk scholarship IDs and title pattern (Bold.org category pages). */
export const JUNK_BOLD_IDS = ["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"];
export const JUNK_TITLE_PATTERN = /^By\s+(Demographics|Major|Year|State)$/i;

/** Get list of junk scholarship docs (for preview). */
export async function getJunkPreview(): Promise<{ id: string; title: string }[]> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const result: { id: string; title: string }[] = [];

  for (const id of JUNK_BOLD_IDS) {
    const doc = await col.doc(id).get();
    if (doc.exists) result.push({ id, title: (doc.data()?.title as string) ?? id });
  }

  const snap = await col.get();
  for (const doc of snap.docs) {
    if (JUNK_BOLD_IDS.includes(doc.id)) continue;
    const title = doc.data()?.title as string;
    if (typeof title === "string" && JUNK_TITLE_PATTERN.test(title.trim())) {
      result.push({ id: doc.id, title });
    }
  }
  return result;
}

/**
 * Delete known junk scholarships (e.g. Bold.org "By Demographics", "By Major" category pages).
 * Returns the number of documents deleted.
 */
export async function deleteJunkScholarships(): Promise<number> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const toDelete = new Set<DocumentReference>();

  for (const id of JUNK_BOLD_IDS) {
    const ref = col.doc(id);
    try {
      const doc = await ref.get();
      if (doc.exists) toDelete.add(ref);
    } catch (e) {
      console.error("[deleteJunkScholarships] get doc failed:", id, e);
    }
  }

  let snap;
  try {
    snap = await col.get();
  } catch (e) {
    console.error("[deleteJunkScholarships] col.get() failed:", e);
    throw e;
  }

  for (const doc of snap.docs) {
    const title = doc.data()?.title;
    if (typeof title === "string" && JUNK_TITLE_PATTERN.test(title.trim())) {
      toDelete.add(doc.ref);
    }
  }

  const refs = [...toDelete];
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    try {
      await batch.commit();
    } catch (e) {
      console.error("[deleteJunkScholarships] batch.commit() failed:", e);
      throw e;
    }
  }

  return refs.length;
}

/** Scholarship-like shape from Firestore doc for filtering. */
type DocLike = { id: string; title?: string; amount?: number; source?: string };

/** Get list of scholarships that would be removed by "filtered grants" cleanup (institutional). */
export async function getFilteredGrantsPreview(): Promise<{ id: string; title: string; amount?: number; reason: string }[]> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const snap = await col.get();
  const result: { id: string; title: string; amount?: number; reason: string }[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const s: DocLike = { id: doc.id, title: data?.title, amount: data?.amount, source: data?.source };
    const institutional = isInstitutionalGrant(s);
    if (institutional) {
      const reason = "Institutional grant";
      result.push({
        id: doc.id,
        title: (data?.title as string) ?? doc.id,
        amount: typeof data?.amount === "number" ? data.amount : undefined,
        reason,
      });
    }
  }
  return result;
}

/**
 * Delete scholarships that are institutional grants or over max prize amount.
 * Returns the number of documents deleted.
 */
export async function deleteFilteredGrants(): Promise<number> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const snap = await col.get();
  const toDelete: DocumentReference[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const s: DocLike = { id: doc.id, title: data?.title, amount: data?.amount, source: data?.source };
    if (isInstitutionalGrant(s)) toDelete.push(doc.ref);
  }

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }
  return toDelete.length;
}
