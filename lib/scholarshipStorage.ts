import type { Scholarship } from "@/types";
import { db } from "./firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { fetchScholarshipsFirstPage, fetchScholarshipById } from "./scholarshipApi";
import { isInstitutionalGrant, isNonStudentTargetedGrant, isStudentTargetedGrant } from "./institutionalGrantFilter";
import { MIN_SCORE_APPROVED } from "./scholarshipQuality";
import { logFirestoreRead } from "./firestoreReadLog";

/** Funding types that belong in the main scholarship feed. */
const MAIN_FEED_FUNDING_TYPES = new Set<string>(["scholarship", "fellowship"]);
function showInMainFeed(s: Scholarship): boolean {
  const ft = s.fundingType;
  if (!ft) return true; // legacy
  return MAIN_FEED_FUNDING_TYPES.has(ft);
}

/** Client-side cache for first page (avoids duplicate fetches in same session). */
let firstPageCache: Scholarship[] | null = null;

/** Bold.org category pages that are not real scholarships. */
const JUNK_TITLE_PATTERN = /^By\s+(Demographics|Major|Year|State)$/i;
const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);

function isJunkScholarship(s: Scholarship): boolean {
  if (JUNK_IDS.has(s.id)) return true;
  if (typeof s.title === "string" && JUNK_TITLE_PATTERN.test(s.title.trim())) return true;
  return false;
}

function passesQualityGate(s: Scholarship): boolean {
  const status = s.verificationStatus;
  if (status === "approved") return true;
  if (status === "hidden" || status === "flagged" || status === "needs_review") return false;
  if (status === undefined && s.qualityScore === undefined) return true;
  const score = s.qualityScore ?? 0;
  return score >= MIN_SCORE_APPROVED;
}

/**
 * Get first page of scholarships (max 100). Uses gateway API + server cache.
 * No direct Firestore reads from client.
 * Fetches 100 so dashboard "Curated for you" matches Greenlight count on scholarships page.
 */
export async function getScholarships(includeDrafts = false): Promise<Scholarship[]> {
  if (typeof window === "undefined") return [];
  if (firstPageCache && !includeDrafts) return firstPageCache;
  try {
    const items = await fetchScholarshipsFirstPage(100);
    const filtered = includeDrafts
      ? items
      : items.filter((s) => {
          if (s.status === "draft") return false;
          if (!showInMainFeed(s)) return false;
          return passesQualityGate(s);
        });
    if (!includeDrafts) firstPageCache = filtered;
    return filtered;
  } catch {
    return [];
  }
}

/**
 * Admin-only: full list from Firestore (no gateway). Use sparingly.
 * Called only from admin scholarship/bulk pages.
 */
export async function getScholarshipsForAdmin(): Promise<Scholarship[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "scholarships"));
    logFirestoreRead("getScholarshipsForAdmin (client)", snap.size);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
    return all.filter((s) => !isJunkScholarship(s));
  } catch {
    return [];
  }
}

/**
 * Get a single scholarship by ID. Uses gateway API + server cache.
 * No direct Firestore read from client.
 */
export async function getScholarship(id: string): Promise<Scholarship | null> {
  if (!id) return null;
  if (typeof window === "undefined") return null;
  try {
    const s = await fetchScholarshipById(id);
    if (!s) return null;
    if (isJunkScholarship(s) || isInstitutionalGrant(s) || isNonStudentTargetedGrant(s) || !isStudentTargetedGrant(s)) return null;
    if (!showInMainFeed(s)) return null;
    if (!passesQualityGate(s)) return null;
    return s;
  } catch {
    return null;
  }
}

export function invalidateScholarshipCache() {
  firstPageCache = null;
}
