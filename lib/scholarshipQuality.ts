/**
 * Quality filter and verification for scholarships.
 * Rule: if it cannot pass verification logic, it does not get shown.
 */
import type { Scholarship } from "@/types";

export type VerificationStatus = "approved" | "needs_review" | "hidden" | "flagged";
export type DisplayCategory =
  | "academic"
  | "merit"
  | "need_based"
  | "essay_competition"
  | "corporate"
  | "local"
  | "sweepstakes";

/** Minimum score to show in main feed. */
export const MIN_SCORE_APPROVED = 70;
/** 50–69 = needs review; <50 = hidden. */
export const MIN_SCORE_REVIEW = 50;
/** Domain trust below this → needs manual review. */
export const MIN_DOMAIN_TRUST = 4;

/** Scam / low-trust phrases → set verificationStatus to flagged. */
const SCAM_PATTERNS = [
  /act\s+now\s+limited\s+time\s+guaranteed/i,
  /winners?\s+selected\s+randomly\s+every\s+week/i,
  /guaranteed\s+winner/i,
  /no\s+essay[,.]?\s*instant\s+win/i,
  /instant\s+win/i,
  /crypto(currency)?\s+(award|scholarship|grant)/i,
  /bitcoin|ethereum|nft\s+scholarship/i,
  /mlm|multi[- ]level|recruit(ing)?\s+members/i,
  /(click|apply)\s+here\s+to\s+receive\s+your\s+prize/i,
  /(limited|only)\s+\d+\s+spots?\s+left/i,
  /(100%|free)\s+guaranteed/i,
  /\b(act\s+now|limited\s+time)\b.*\b(guaranteed|winner)\b/i,
];
/** Excessive caps = suspicious. */
const EXCESSIVE_CAPS = /[A-Z]{5,}/;
/** Vague eligibility → deduct / reject. */
const VAGUE_ELIGIBILITY = /anyone\s+can\s+apply|no\s+rules|open\s+to\s+everyone\s*[.!]?\s*$/i;
/** Spam-only / generic email domains. */
const SPAM_EMAIL_DOMAINS = /@(gmail|yahoo|hotmail|outlook|aol|mail\.com)\./i;
/** Realistic cap for non-institutional single awards (flag if above without .edu/.gov). */
const HIGH_AMOUNT_THRESHOLD = 100_000;

/** Extract hostname from URL string. */
function domainFromUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Domain trust score 0–10. */
export function scoreDomainTrust(s: {
  applicationUrl?: string | null;
  sponsor?: string;
  source?: string;
  description?: string;
}): number {
  const desc = (s.description ?? "").toLowerCase();
  const sponsor = (s.sponsor ?? "").toLowerCase();
  const url = s.applicationUrl ?? "";
  const domain = domainFromUrl(url) ?? domainFromUrl(desc.match(/https?:\/\/[^\s)]+/)?.[0]) ?? "";

  const d = domain || sponsor;
  if (!d) return 3; // unknown

  if (/\.edu\b/.test(d)) return 10;
  if (/\.gov\b/.test(d)) return 10;
  if (/\.org\b/.test(d)) {
    // Major nonprofit vs unknown .org: use sponsor length / known names as proxy
    if (/\b(united\s+way|red\s+cross|foundation|national\s+association)\b/i.test(sponsor)) return 8;
    return 5;
  }
  if (/\.com\b/.test(d)) {
    if (/\b(google|microsoft|apple|amazon|facebook|scholarship\.com|fastweb|bold\.org)\b/i.test(d + " " + sponsor))
      return 7;
    return 3;
  }
  if (/\.(net|io|co)\b/.test(d)) return 2;
  if (/grants\.gov|scholarshipowl/i.test(d)) return 8;
  return 3;
}

/** Hard reject: true = do not show. */
export function failsLegitimacy(s: Scholarship): { reject: boolean; reason?: string } {
  if (s.applicationFeeRequired === true) return { reject: true, reason: "application_fee" };
  if (!(s.title ?? "").trim()) return { reject: true, reason: "no_title" };
  if (!(s.sponsor ?? "").trim() || (s.sponsor ?? "").trim().length < 2)
    return { reject: true, reason: "no_org_name" };
  if (!s.deadline || typeof s.deadline !== "string") return { reject: true, reason: "no_deadline" };
  const dl = s.deadline.replace(/T.*$/, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dl)) return { reject: true, reason: "invalid_deadline" };
  const amount = typeof s.amount === "number" ? s.amount : 0;
  if (!Number.isFinite(amount) || amount < 0) return { reject: true, reason: "no_amount" };
  const elig = (s.eligibilityTags ?? []).length > 0 || ((s.description ?? "").length > 50);
  if (!elig) return { reject: true, reason: "no_eligibility" };
  const desc = (s.description ?? "").toLowerCase();
  if (/application\s+fee|pay\s+to\s+apply|fee\s+required|payment\s+required\s+to\s+apply/i.test(desc))
    return { reject: true, reason: "application_fee_mentioned" };
  if (/bank\s+account|routing\s+number|wire\s+transfer|send\s+money\s+to\s+claim/i.test(desc))
    return { reject: true, reason: "banking_info" };
  if (VAGUE_ELIGIBILITY.test((s.eligibilityTags ?? []).join(" ") + " " + desc))
    return { reject: true, reason: "vague_eligibility" };
  if (amount > 1_000_000 && !/\.(edu|gov)\b/.test((s.sponsor ?? "") + (s.applicationUrl ?? "")))
    return { reject: true, reason: "unrealistic_amount" };
  return { reject: false };
}

/** Detect scam-like language → flagged. */
export function detectScamPatterns(s: Scholarship): boolean {
  const text = [(s.title ?? ""), (s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ");
  if (SCAM_PATTERNS.some((re) => re.test(text))) return true;
  if (EXCESSIVE_CAPS.test(text)) return true;
  return false;
}

/** Classify as sweepstakes vs real scholarship. */
export function isSweepstakes(s: Scholarship): boolean {
  const t = (s.title ?? "").toLowerCase();
  const d = (s.description ?? "").toLowerCase();
  if (/sweepstakes|giveaway|instant\s+win|random\s+draw|no\s+essay\s+required|enter\s+to\s+win/i.test(t + " " + d))
    return true;
  if (/winners?\s+selected\s+randomly|everyone\s+eligible|no\s+requirements/i.test(d)) return true;
  return false;
}

/** Award realism: flag if high amount without institutional backing. */
export function flagUnrealisticAward(s: Scholarship): boolean {
  const amount = typeof s.amount === "number" ? s.amount : 0;
  if (amount < HIGH_AMOUNT_THRESHOLD) return false;
  const sponsor = (s.sponsor ?? "").toLowerCase();
  const url = (s.applicationUrl ?? "") + (s.description ?? "");
  if (/\.(edu|gov)\b|university|college|foundation|national\s+foundation/i.test(sponsor + " " + url))
    return false;
  return true;
}

/** Assign display category. */
export function assignDisplayCategory(s: Scholarship): DisplayCategory {
  if (isSweepstakes(s)) return "sweepstakes";
  const src = (s.source ?? "").toLowerCase();
  if (src === "grants_gov") return "academic";
  const title = (s.title ?? "").toLowerCase();
  const desc = (s.description ?? "").toLowerCase();
  const tags = (s.categoryTags ?? []).join(" ").toLowerCase();
  if (/corporate|company\s+scholarship|employer/i.test(title + desc)) return "corporate";
  if (/financial\s+need|need-based|financialneed/i.test(tags + desc)) return "need_based";
  if (/essay\s+required|essay\s+competition|writing\s+contest/i.test(desc + title)) return "essay_competition";
  if (/local|regional|state\s+scholarship|county/i.test(desc + title)) return "local";
  if (/merit|gpa|academic\s+excellence/i.test(tags + desc)) return "merit";
  return "academic";
}

/** Quality score 0–100. Formula: Domain 10 + Completeness 20 + Org 20 + Eligibility 15 + Deadline 10 + Award 15 + Contact 10. */
export function computeQualityScore(s: Scholarship, domainScore: number): number {
  const domain = Math.min(10, Math.max(0, domainScore));
  let completeness = 0;
  if ((s.title ?? "").trim().length >= 5) completeness += 3;
  if ((s.sponsor ?? "").trim().length >= 3) completeness += 4;
  if (s.deadline && /^\d{4}-\d{2}-\d{2}/.test(String(s.deadline))) completeness += 3;
  if (typeof s.amount === "number" && s.amount > 0) completeness += 3;
  if ((s.description ?? "").trim().length >= 80) completeness += 4;
  if ((s.eligibilityTags ?? []).length > 0) completeness += 3;
  completeness = Math.min(20, completeness);
  let orgCred = 10;
  if ((s.sponsor ?? "").length >= 5) orgCred += 5;
  if (s.applicationUrl || (s.description ?? "").match(/https?:\/\//)) orgCred += 5;
  orgCred = Math.min(20, orgCred);
  const eligScore = (s.eligibilityTags ?? []).length > 0 ? 15 : (s.description ?? "").length > 100 ? 8 : 0;
  const deadlineScore = s.deadline && /^\d{4}-\d{2}-\d{2}/.test(String(s.deadline)) ? 10 : 0;
  let awardScore = 15;
  if (flagUnrealisticAward(s)) awardScore = 5;
  else if (typeof s.amount !== "number" || s.amount <= 0) awardScore = 5;
  const contactScore = s.contactEmail ? 10 : (s.description ?? "").match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/) ? 5 : 0;
  const total = domain + completeness + orgCred + eligScore + deadlineScore + awardScore + contactScore;
  return Math.min(100, Math.max(0, total));
}

/** Determine verification status from score and flags. */
export function getVerificationStatus(
  s: Scholarship,
  qualityScore: number,
  scamFlagged: boolean,
  failsLegit: boolean
): VerificationStatus {
  if (failsLegit) return "hidden";
  if (scamFlagged) return "flagged";
  if (qualityScore >= MIN_SCORE_APPROVED) return "approved";
  if (qualityScore >= MIN_SCORE_REVIEW) return "needs_review";
  return "hidden";
}

/** Full quality run: returns fields to persist on the scholarship. */
export function runQualityVerification(s: Scholarship): {
  qualityScore: number;
  verificationStatus: VerificationStatus;
  domainTrustScore: number;
  displayCategory: DisplayCategory;
  lastVerifiedAt: string;
  shouldHide: boolean;
  flags: string[];
} {
  const flags: string[] = [];
  const legit = failsLegitimacy(s);
  if (legit.reject) {
    return {
      qualityScore: 0,
      verificationStatus: "hidden",
      domainTrustScore: 0,
      displayCategory: assignDisplayCategory(s),
      lastVerifiedAt: new Date().toISOString(),
      shouldHide: true,
      flags: [legit.reason ?? "failed_legitimacy"],
    };
  }
  const domainTrustScore = scoreDomainTrust(s);
  const scamFlagged = detectScamPatterns(s);
  if (scamFlagged) flags.push("scam_patterns");
  if (flagUnrealisticAward(s)) flags.push("unrealistic_award");
  if (domainTrustScore < MIN_DOMAIN_TRUST) flags.push("low_domain_trust");
  const qualityScore = computeQualityScore(s, domainTrustScore);
  const verificationStatus = getVerificationStatus(s, qualityScore, scamFlagged, false);
  const shouldHide = verificationStatus === "hidden" || verificationStatus === "flagged";
  return {
    qualityScore,
    verificationStatus,
    domainTrustScore,
    displayCategory: assignDisplayCategory(s),
    lastVerifiedAt: new Date().toISOString(),
    shouldHide,
    flags,
  };
}

/** Hash for duplicate detection (title + sponsor + deadline + amount). */
export function scholarshipHash(s: Scholarship): string {
  const t = (s.title ?? "").trim().toLowerCase();
  const o = (s.sponsor ?? "").trim().toLowerCase();
  const d = (s.deadline ?? "").replace(/T.*$/, "").trim();
  const a = String(s.amount ?? 0);
  return `${t}|${o}|${d}|${a}`;
}

/** Simple similarity: 0–1. Used to merge duplicates at 80%+. */
export function similarityHash(a: string, b: string): number {
  if (!a || !b) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let match = 0;
  for (const c of sa) if (sb.has(c)) match++;
  return (2 * match) / (sa.size + sb.size);
}
