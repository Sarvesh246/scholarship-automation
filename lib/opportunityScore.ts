/**
 * Scholarship Quality / Opportunity Score and ROI.
 * Powers "Highest Opportunity Score" and "High ROI" differentiation.
 */
import type { Scholarship } from "@/types";

/** Effort tier for display: Easy (10–20 min), Medium (30–60), Heavy (2+ hrs). */
export type EffortTier = "easy" | "medium" | "heavy";

/** Parse estimatedTime string to approximate minutes. */
export function parseEffortMinutes(estimatedTime: string | undefined | null): number {
  const t = (estimatedTime ?? "").toLowerCase();
  if (!t.trim()) return 60; // default 1 hr
  if (t.includes("min") && /\d+/.test(t)) return Math.min(parseInt(t.match(/\d+/)?.[0] ?? "30", 10) || 30, 600);
  if (t.includes("hour") && /\d+/.test(t)) return (parseInt(t.match(/\d+/)?.[0] ?? "1", 10) || 1) * 60;
  if (t.includes("4+") || t.includes("3–4") || t.includes("3-4")) return 240;
  if (t.includes("2–3") || t.includes("2-3")) return 150;
  if (t.includes("1.5") || t.includes("1–2") || t.includes("1-2")) return 90;
  return 60;
}

/** Effort tier for display (no AI). Used for "Easy / Medium / Heavy" badge. */
export function getEffortTier(estimatedTime: string | undefined | null): EffortTier {
  const mins = parseEffortMinutes(estimatedTime);
  if (mins <= 25) return "easy";
  if (mins <= 75) return "medium";
  return "heavy";
}

/** Rule-based win probability estimate when no user match: local/specific = higher, national/lottery = lower. */
export function getWinProbabilityEstimate(s: Scholarship): number {
  const sourceType = (s.sourceType ?? "").toString();
  const displayCategory = (s.displayCategory ?? "").toString();
  const desc = (s.description ?? "").toLowerCase();
  const title = (s.title ?? "").toLowerCase();

  // Local/niche sources: higher probability
  if (/community_foundation|municipal|local_business|professional_association|institutional/.test(sourceType))
    return 0.5;
  if (displayCategory === "local") return 0.45;

  // Sweepstakes / no-essay lottery: lower
  if (displayCategory === "sweepstakes") return 0.15;
  if (/no\s+essay|instant\s+win|random\s+draw|everyone\s+eligible/i.test(desc + " " + title)) return 0.2;

  // Huge national awards (rough proxy by amount)
  const amount = typeof s.amount === "number" ? s.amount : 0;
  if (amount >= 50000) return 0.2;
  if (amount >= 25000) return 0.25;
  if (amount >= 10000) return 0.3;

  // Default moderate
  return 0.35;
}

/** Award band score 0–25 (higher = better). */
function amountScore(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount >= 25000) return 25;
  if (amount >= 10000) return 20;
  if (amount >= 5000) return 15;
  if (amount >= 2000) return 12;
  if (amount >= 1000) return 8;
  return 4;
}

/** Deadline proximity 0–25 (sooner = higher). */
function deadlineProximityScore(deadline: string | undefined | null): number {
  if (!deadline || typeof deadline !== "string") return 0;
  const d = new Date(deadline.replace(/T.*$/, "").trim());
  const now = new Date();
  if (d < now) return 0;
  const days = (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 7) return 25;
  if (days <= 30) return 20;
  if (days <= 60) return 15;
  if (days <= 90) return 10;
  if (days <= 180) return 5;
  return 2;
}

/** Legitimacy from qualityScore 0–25. */
function legitimacyScore(qualityScore: number | undefined, domainTrust: number | undefined): number {
  const q = Math.min(100, Math.max(0, qualityScore ?? 0));
  const d = Math.min(10, Math.max(0, domainTrust ?? 0));
  return Math.min(25, (q / 4) + (d * 0.5));
}

/** Lower effort = higher score 0–15. */
function effortScore(estimatedTime: string | undefined | null): number {
  const mins = parseEffortMinutes(estimatedTime);
  if (mins <= 30) return 15;
  if (mins <= 60) return 12;
  if (mins <= 90) return 9;
  if (mins <= 120) return 6;
  if (mins <= 180) return 3;
  return 0;
}

/**
 * Opportunity Score (SQS-style) 0–100.
 * Combines: award amount, deadline proximity, legitimacy, effort, recurrence, sponsor credibility.
 */
export function getOpportunityScore(s: Scholarship): number {
  const amount = typeof s.amount === "number" ? s.amount : 0;
  const recurBonus = s.recurring && s.recurring.trim().length > 0 ? 5 : 0;
  const score =
    amountScore(amount) +
    deadlineProximityScore(s.deadline) +
    legitimacyScore(s.qualityScore, s.domainTrustScore) +
    effortScore(s.estimatedTime) +
    recurBonus +
    Math.min(5, (s.domainTrustScore ?? 0) * 0.5);
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * ROI Score = (Award × Win Probability) / Time (minutes).
 * Higher = better use of time. Use for sorting and "High ROI" badge.
 * matchPct: 0–100 from user's match score; when missing, use rule-based getWinProbabilityEstimate(s).
 */
export function getROIScore(
  s: Scholarship,
  matchPct?: number | null
): number {
  const amount = typeof s.amount === "number" ? s.amount : 0;
  if (amount <= 0) return 0;
  const winProb = matchPct != null && matchPct >= 0 && matchPct <= 100
    ? matchPct / 100
    : getWinProbabilityEstimate(s);
  const minutes = Math.max(15, parseEffortMinutes(s.estimatedTime));
  return (amount * winProb) / minutes;
}

/** True if ROI is in top tier (e.g. above threshold or top 25% of list). */
export function isHighROI(
  roiScore: number,
  options?: { threshold?: number; percentile80?: number }
): boolean {
  if (options?.percentile80 != null && options.percentile80 > 0) {
    return roiScore >= options.percentile80;
  }
  const threshold = options?.threshold ?? 50; // $50/min equivalent at 35% win = ~$140/hr value
  return roiScore >= threshold;
}

/** Compute 80th percentile ROI from a list of scores (for "High ROI" badge). */
export function percentile80(roiScores: number[]): number {
  if (roiScores.length === 0) return 0;
  const sorted = [...roiScores].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.8) - 1);
  return sorted[Math.max(0, idx)];
}

const STALE_DAYS = 14;

/** Timestamp for tiebreak sorting: higher = fresher. Uses lastCheckedAt or lastVerifiedAt. */
export function getFreshnessTimestamp(s: Scholarship): number {
  const iso = s.lastCheckedAt ?? s.lastVerifiedAt ?? null;
  if (!iso) return 0;
  const t = typeof iso === "string" ? new Date(iso) : "_seconds" in iso ? new Date((iso as { _seconds: number })._seconds * 1000) : null;
  return t && !isNaN(t.getTime()) ? t.getTime() : 0;
}

/** True if scholarship has not been checked/verified in 14+ days. For "Stale" label. */
export function isStale(s: Scholarship): boolean {
  const iso = s.lastCheckedAt ?? s.lastVerifiedAt ?? null;
  if (!iso) return false;
  const t = typeof iso === "string" ? new Date(iso) : "_seconds" in iso ? new Date((iso as { _seconds: number })._seconds * 1000) : null;
  if (!t || isNaN(t.getTime())) return false;
  const days = (Date.now() - t.getTime()) / (24 * 60 * 60 * 1000);
  return days > STALE_DAYS;
}
