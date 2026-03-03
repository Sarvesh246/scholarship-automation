import type { Scholarship } from "@/types";
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { isInstitutionalGrant, isOverMaxPrize } from "./institutionalGrantFilter";
import { MIN_SCORE_APPROVED } from "./scholarshipQuality";

let cache: Scholarship[] | null = null;

/** Bold.org category pages that are not real scholarships. */
const JUNK_TITLE_PATTERN = /^By\s+(Demographics|Major|Year|State)$/i;
const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);

function isJunkScholarship(s: Scholarship): boolean {
  if (JUNK_IDS.has(s.id)) return true;
  if (typeof s.title === "string" && JUNK_TITLE_PATTERN.test(s.title.trim())) return true;
  return false;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDeadlineValid(deadline: string | undefined): boolean {
  if (!deadline || typeof deadline !== "string") return false;
  const normalized = deadline.replace(/T.*$/, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  return normalized >= getTodayDateString();
}

/** Only show scholarships that passed verification (approved), or legacy records not yet validated. */
function passesQualityGate(s: Scholarship): boolean {
  const status = s.verificationStatus;
  if (status === "approved") return true;
  if (status === "hidden" || status === "flagged" || status === "needs_review") return false;
  if (status === undefined && s.qualityScore === undefined) return true; // legacy: show until full validation is run
  const score = s.qualityScore ?? 0;
  return score >= MIN_SCORE_APPROVED;
}

export async function getScholarships(includeDrafts = false): Promise<Scholarship[]> {
  if (cache && !includeDrafts) return cache;
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "scholarships"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
    const filtered = all.filter((s) => {
      if (!isDeadlineValid(s.deadline) || isJunkScholarship(s)) return false;
      if (isInstitutionalGrant(s)) return false;
      if (isOverMaxPrize(s)) return false;
      if (!includeDrafts && s.status === "draft") return false;
      if (!passesQualityGate(s)) return false;
      return true;
    });
    if (!includeDrafts) cache = filtered;
    return filtered;
  } catch {
    return [];
  }
}

/** Returns all scholarships (including drafts, expired) for admin. Excludes only junk. */
export async function getScholarshipsForAdmin(): Promise<Scholarship[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "scholarships"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
    return all.filter((s) => !isJunkScholarship(s));
  } catch {
    return [];
  }
}

/** Fetch a single scholarship by ID (one Firestore read). Returns null if not found or junk. */
export async function getScholarship(id: string): Promise<Scholarship | null> {
  if (!db || !id) return null;
  try {
    const snap = await getDoc(doc(db, "scholarships", id));
    if (!snap.exists()) return null;
    const s = { id: snap.id, ...snap.data() } as Scholarship;
    if (isJunkScholarship(s) || isInstitutionalGrant(s) || isOverMaxPrize(s)) return null;
    if (!passesQualityGate(s)) return null;
    return s;
  } catch {
    return null;
  }
}

export function invalidateScholarshipCache() {
  cache = null;
}
