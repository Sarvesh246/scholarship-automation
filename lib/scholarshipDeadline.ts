/**
 * Deadline validation and expired scholarship cleanup.
 * Only scholarships with deadline >= today should be stored or shown.
 */
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "./firebaseAdmin";

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

/**
 * Delete all scholarships with deadline before today from Firestore.
 * Returns the number of documents deleted.
 */
export async function deleteExpiredScholarships(): Promise<number> {
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  const today = getTodayDateString();

  const snap = await col.get();
  const toDelete: DocumentReference[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const deadline = data?.deadline;
    if (typeof deadline === "string") {
      const normalized = deadline.replace(/T.*$/, "").trim();
      if (normalized < today) {
        toDelete.push(doc.ref);
      }
    }
  }

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }

  return toDelete.length;
}
