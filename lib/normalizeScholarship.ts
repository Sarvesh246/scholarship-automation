/**
 * Build normalized scholarship object for reliable matching.
 * Every scholarship gets normalized fields + matchable flag.
 */
import type { Scholarship, NormalizedScholarship } from "@/types";

const REQUIREMENT_KEYWORDS = ["essay", "transcript", "recommendation", "letter of recommendation", "portfolio", "interview", "resume", "cv"];

function normalizeFrequency(s: Scholarship): NormalizedScholarship["frequency"] {
  const r = (s.recurring ?? "").toLowerCase();
  if (/month|monthly/i.test(r)) return "monthly";
  if (/year|annual/i.test(r)) return "yearly";
  if (r) return "yearly";
  return "one-time";
}

function extractStatesEligible(s: Scholarship): string[] {
  const text = [(s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ").toLowerCase();
  const states: string[] = [];
  const stateAbbrevs = "al,ak,az,ar,ca,co,ct,de,fl,ga,hi,id,il,in,ia,ks,ky,la,me,md,ma,mi,mn,ms,mo,mt,ne,nv,nh,nj,nm,ny,nc,nd,oh,ok,or,pa,ri,sc,sd,tn,tx,ut,vt,va,wa,wv,wi,wy,dc".split(",");
  for (const ab of stateAbbrevs) {
    if (text.includes(ab) || new RegExp(`\\b${ab}\\b`, "i").test(text)) states.push(ab.toUpperCase());
  }
  if (/\b(?:all\s+states|nationwide|us\s+citizen)\b/i.test(text) && states.length === 0) return ["*"];
  return states;
}

function extractEducationLevels(s: Scholarship): string[] {
  const text = [(s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ").toLowerCase();
  const out: string[] = [];
  if (/\b(high\s+school|hs\s+senior|grade\s+12)\b/i.test(text)) out.push("high_school");
  if (/\b(college|undergraduate|bachelor|university\s+student)\b/i.test(text)) out.push("college");
  if (/\b(graduate|grad\s+school|master|mba|phd|doctoral)\b/i.test(text)) out.push("grad");
  if (out.length === 0) return ["high_school", "college"];
  return out;
}

function extractGradeLevels(s: Scholarship): string[] {
  const text = [(s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ").toLowerCase();
  const out: string[] = [];
  for (const g of ["freshman", "sophomore", "junior", "senior"]) {
    if (new RegExp(`\\b${g}\\b`, "i").test(text)) out.push(g.charAt(0).toUpperCase() + g.slice(1));
  }
  return out;
}

function extractMajorsAndFields(s: Scholarship): { majors: string[]; fields: string[] } {
  const fields: string[] = [];
  for (const tag of s.categoryTags ?? []) {
    const key = String(tag).toLowerCase().replace(/\s+/g, "");
    const map: Record<string, string> = { stem: "STEM", arts: "Arts", community: "Community", leadership: "Leadership", financialneed: "Financial Need" };
    if (map[key] && !fields.includes(map[key])) fields.push(map[key]);
  }
  const text = (s.description ?? "").toLowerCase();
  const majors: string[] = [];
  if (/\b(any\s+major|all\s+majors)\b/i.test(text)) {
    majors.push("*");
    if (fields.length === 0) fields.push("*");
  }
  return { majors: majors.length ? majors : ["*"], fields: fields.length ? fields : ["*"] };
}

function extractMinGPA(s: Scholarship): number | null {
  const text = [(s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ");
  const m = text.match(/\b(?:min(?:imum)?\s+)?gpa\s*(?:of|:)?\s*(\d\.?\d*)/i) ?? text.match(/\b(\d\.?\d*)\s*gpa\b/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 5) return n;
  }
  return null;
}

function extractRequirements(s: Scholarship): string[] {
  const reqs: string[] = [];
  const text = (s.description ?? "").toLowerCase();
  if ((s.prompts ?? []).length > 0) reqs.push("essay");
  for (const kw of REQUIREMENT_KEYWORDS) {
    if (text.includes(kw) && !reqs.includes(kw)) reqs.push(kw);
  }
  if (s.owlRequirements) {
    for (const r of s.owlRequirements) {
      const t = (r.requirementType ?? "").toLowerCase();
      if (t === "text") reqs.push("essay");
      else if (t === "file") reqs.push("transcript");
    }
  }
  return [...new Set(reqs)];
}

function extractTags(s: Scholarship): string[] {
  const tags: string[] = [];
  const text = [(s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ").toLowerCase();
  for (const t of ["leadership", "volunteering", "athletics", "writing", "entrepreneurship", "community service", "stem", "arts", "need-based", "merit"]) {
    if (text.includes(t)) tags.push(t);
  }
  for (const c of s.categoryTags ?? []) tags.push(String(c).toLowerCase());
  return [...new Set(tags)];
}

function inferNeedBased(s: Scholarship): boolean | null {
  const d = (s.description ?? "").toLowerCase();
  if (/\bneed[- ]?based|financial\s+need\b/i.test(d)) return true;
  if (/\bmerit\s+only\b/i.test(d)) return false;
  return null;
}

/** Build normalized object from a scholarship. Sets matchable if enough structured data. */
export function normalizeScholarship(s: Scholarship): NormalizedScholarship {
  const deadline = (s.deadline ?? "").replace(/T.*$/, "").trim();
  const amount = typeof s.amount === "number" && s.amount >= 0 ? s.amount : 0;
  const { majors: majorsEligible, fields: fieldsEligible } = extractMajorsAndFields(s);
  const statesEligible = extractStatesEligible(s);
  const educationLevelsEligible = extractEducationLevels(s);
  const gradeLevelsEligible = extractGradeLevels(s);
  const requirements = extractRequirements(s);
  const tags = extractTags(s);
  const hasStructuredEligibility =
    (statesEligible.length > 0 || educationLevelsEligible.length > 0) &&
    (amount > 0 || requirements.length > 0) &&
    /^\d{4}-\d{2}-\d{2}$/.test(deadline);

  const verifiedStatus =
    s.verificationStatus === "approved" ? "approved" :
    s.verificationStatus === "flagged" ? "flagged" :
    s.verificationStatus === "needs_review" ? "needs_review" : "rejected";

  return {
    title: (s.title ?? "").trim(),
    orgName: (s.sponsor ?? "").trim(),
    orgWebsite: s.applicationUrl ?? null,
    applyUrl: s.applicationUrl ?? null,
    deadline,
    awardMin: amount,
    awardMax: amount,
    frequency: normalizeFrequency(s),
    statesEligible,
    educationLevelsEligible,
    gradeLevelsEligible,
    majorsEligible,
    fieldsEligible,
    minGPA: extractMinGPA(s),
    tags,
    requirements,
    needBased: inferNeedBased(s),
    verifiedStatus,
    qualityScore: s.qualityScore ?? 0,
    lastVerifiedAt: s.lastVerifiedAt ? (typeof s.lastVerifiedAt === "string" ? s.lastVerifiedAt : null) : null,
    source: s.source ?? "manual",
    matchable: hasStructuredEligibility && (s.verificationStatus === "approved" || (s.qualityScore ?? 0) >= 70),
  };
}
