/**
 * Duplicate detection for scholarships across sources.
 * Normalized title similarity + deadline/award/sponsor match.
 * Use at sync/ingest to merge into one canonical scholarship with multiple source links.
 */
import type { Scholarship } from "@/types";

const STOPWORDS = new Set(
  "a an the and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must shall can need dare ought used".split(" ")
);

/** Normalize title for comparison: lowercase, remove punctuation, collapse spaces, optional stopword removal. */
export function normalizeTitle(title: string | undefined | null): string {
  if (!title || typeof title !== "string") return "";
  return title
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token set for similarity (with stopwords removed). */
export function titleTokens(normalized: string): Set<string> {
  const words = normalized.split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

/** Jaccard-like similarity 0–1 between two normalized titles. */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  const ta = titleTokens(na);
  const tb = titleTokens(nb);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersect = 0;
  for (const w of ta) if (tb.has(w)) intersect++;
  const union = ta.size + tb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/** Same date (YYYY-MM-DD). */
export function sameDeadline(d1: string | undefined, d2: string | undefined): boolean {
  const a = (d1 ?? "").replace(/T.*$/, "").trim();
  const b = (d2 ?? "").replace(/T.*$/, "").trim();
  if (!a || !b) return false;
  return a === b;
}

/** Same award (exact or within 10% if large). */
export function sameAward(amt1: number | undefined, amt2: number | undefined): boolean {
  const a = typeof amt1 === "number" ? amt1 : 0;
  const b = typeof amt2 === "number" ? amt2 : 0;
  if (a === 0 && b === 0) return true;
  if (a === b) return true;
  const max = Math.max(a, b);
  if (max === 0) return true;
  return Math.abs(a - b) / max <= 0.1;
}

/** Sponsor match: normalized org name similarity (e.g. "National Science Foundation" vs "NSF"). */
export function sponsorMatch(s1: string | undefined, s2: string | undefined): boolean {
  const a = (s1 ?? "").trim().toLowerCase();
  const b = (s2 ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  // One contains the other (e.g. "NSF" in "National Science Foundation")
  if (a.includes(b) || b.includes(a)) return true;
  // Token overlap
  const ta = titleTokens(a.replace(/[^\w\s]/g, " "));
  const tb = titleTokens(b.replace(/[^\w\s]/g, " "));
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap++;
  return ta.size > 0 && overlap / Math.min(ta.size, tb.size) >= 0.5;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.88;

/**
 * Returns true if two scholarships are likely duplicates.
 * Criteria: title similarity >= threshold, and (deadline match OR award match), and sponsor match.
 */
export function isDuplicate(
  a: Scholarship,
  b: Scholarship,
  options?: { titleSimilarityThreshold?: number }
): boolean {
  const threshold = options?.titleSimilarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const sim = titleSimilarity(a.title, b.title);
  if (sim < threshold) return false;
  const deadlineOk = sameDeadline(a.deadline, b.deadline);
  const awardOk = sameAward(a.amount, b.amount);
  const sponsorOk = sponsorMatch(a.sponsor, b.sponsor);
  return (deadlineOk || awardOk) && sponsorOk;
}

/**
 * Merge strategy: pick canonical (e.g. highest qualityScore or first), store source links.
 * Returns canonical scholarship with sourceApplicationUrls: string[].
 */
export function mergeDuplicates(
  list: Scholarship[],
  options?: { titleSimilarityThreshold?: number }
): { canonical: Scholarship; sourceApplicationUrls: string[] }[] {
  const threshold = options?.titleSimilarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const merged: { canonical: Scholarship; sourceApplicationUrls: string[] }[] = [];
  const used = new Set<number>();

  for (let i = 0; i < list.length; i++) {
    if (used.has(i)) continue;
    const canonical = list[i];
    const urls = new Set<string>();
    if (canonical.applicationUrl) urls.add(canonical.applicationUrl);

    for (let j = i + 1; j < list.length; j++) {
      if (used.has(j)) continue;
      if (isDuplicate(canonical, list[j], { titleSimilarityThreshold: threshold })) {
        used.add(j);
        if (list[j].applicationUrl) urls.add(list[j].applicationUrl);
      }
    }

    merged.push({
      canonical: { ...canonical },
      sourceApplicationUrls: Array.from(urls),
    });
  }

  return merged;
}
