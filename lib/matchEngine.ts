/**
 * Matching engine: compute userSignals from profile, then per-scholarship
 * eligibilityStatus, matchScore, reasons[], missingRequirements[].
 * Cached per user; invalidate on profile change or scholarship refresh.
 */
import type { Profile, Scholarship, NormalizedScholarship, UserSignals, ScholarshipMatchResult } from "@/types";

const GREENLIGHT_MIN_SCORE = 70;
const NEAR_MATCH_MIN_SCORE = 50;
const today = () => new Date().toISOString().slice(0, 10);

/** Infer grade level from graduation year (current year vs grad year). */
function inferGradeLevel(graduationYear?: string): string | undefined {
  if (!graduationYear) return undefined;
  const y = parseInt(graduationYear, 10);
  if (!Number.isFinite(y)) return undefined;
  const now = new Date();
  const currentYear = now.getFullYear();
  const diff = y - currentYear;
  if (diff <= 0) return "Senior";
  if (diff === 1) return "Junior";
  if (diff === 2) return "Sophomore";
  if (diff === 3) return "Freshman";
  return undefined;
}

/** Build user signals from profile for matching. */
export function buildUserSignals(profile: Profile): UserSignals {
  const loc = profile.location ?? {};
  const ac = profile.academics ?? {};
  const gpaNum = ac.gpa?.trim() ? parseFloat(ac.gpa) : null;
  const majors: string[] = [...(profile.intendedMajors ?? [])];
  if (profile.majorsFreeText?.trim()) {
    profile.majorsFreeText.split(/[,;]/).map((s) => s.trim()).filter(Boolean).forEach((m) => {
      if (m && !majors.includes(m)) majors.push(m);
    });
  }
  if (ac.major?.trim() && !majors.includes(ac.major.trim())) majors.push(ac.major.trim());
  const activityTypes: string[] = [];
  const activityTags: string[] = [];
  for (const a of profile.activities ?? []) {
    if (a.type) activityTypes.push(a.type);
    if (Array.isArray(a.tags)) activityTags.push(...a.tags);
  }
  const awardCategories: string[] = [];
  const awardTags: string[] = [];
  for (const a of profile.awards ?? []) {
    if (a.category) awardCategories.push(a.category);
    if (Array.isArray(a.tags)) awardTags.push(...a.tags);
  }
  return {
    country: loc.country ?? profile.demographics?.country,
    state: loc.state ?? profile.demographics?.state,
    city: loc.city ?? profile.demographics?.city,
    educationLevel: profile.educationLevel,
    graduationYear: ac.graduationYear,
    gradeLevel: inferGradeLevel(ac.graduationYear),
    majors,
    fields: majors, // use majors as fields for now
    gpa: gpaNum != null && Number.isFinite(gpaNum) ? gpaNum : null,
    gpaScale: ac.gpaScale === "5.0" ? "5.0" : "4.0",
    activityTypes,
    activityTags,
    awardCategories,
    awardTags,
    timeBudgetPreference: profile.timeBudgetPreference ?? "medium",
    essayPreference: profile.essayPreference ?? true,
    needBasedInterest: profile.needBasedInterest ?? false,
    optionalEligibility: profile.optionalEligibility,
  };
}

/** Hard eligibility gate: deadline, education level, location, min GPA, major if required. */
function hardGate(
  norm: NormalizedScholarship,
  signals: UserSignals
): { pass: boolean; missingRequirements: string[] } {
  const missing: string[] = [];
  if (norm.deadline < today()) {
    missing.push("Deadline passed");
    return { pass: false, missingRequirements: missing };
  }
  if (norm.educationLevelsEligible.length > 0 && !norm.educationLevelsEligible.includes("*")) {
    const userLevel = signals.educationLevel ?? (signals.graduationYear ? "college" : undefined);
    if (!userLevel) missing.push("Education level");
    else if (!norm.educationLevelsEligible.includes(userLevel)) {
      missing.push("Education level");
      return { pass: false, missingRequirements: missing };
    }
  }
  if (norm.statesEligible.length > 0 && !norm.statesEligible.includes("*")) {
    const userState = (signals.state ?? "").toUpperCase().slice(0, 2);
    if (!userState) missing.push("State");
    else if (!norm.statesEligible.some((s) => s === userState)) {
      missing.push("State eligibility");
      return { pass: false, missingRequirements: missing };
    }
  }
  if (norm.minGPA != null && signals.gpa != null) {
    const maxGpa = signals.gpaScale === "5.0" ? 5 : 4;
    if (signals.gpa < norm.minGPA || signals.gpa > maxGpa) {
      missing.push("GPA");
      return { pass: false, missingRequirements: missing };
    }
  }
  return { pass: true, missingRequirements: missing };
}

/** Score 0–100: major/field, location, grade/edu, tag overlap, requirements fit, quality bonus. */
function scoreMatch(
  norm: NormalizedScholarship,
  s: Scholarship,
  signals: UserSignals,
  gatePass: boolean
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (!gatePass) return { score: 0, reasons: ["Does not meet eligibility requirements"] };

  const majorMatch =
    norm.majorsEligible.includes("*") ||
    (signals.majors.length > 0 && signals.majors.some((m) => norm.majorsEligible.some((e) => e.toLowerCase().includes(m.toLowerCase()))));
  const fieldMatch =
    norm.fieldsEligible.includes("*") ||
    (signals.fields.length > 0 && signals.fields.some((f) => norm.fieldsEligible.some((e) => e.toLowerCase().includes(f.toLowerCase()))));
  if (majorMatch || fieldMatch) {
    score += 25;
    if (signals.majors.length) reasons.push(signals.majors.slice(0, 2).join(", "));
  }

  const locationMatch = norm.statesEligible.includes("*") || (signals.state && norm.statesEligible.includes(signals.state.toUpperCase().slice(0, 2)));
  if (locationMatch) {
    score += 15;
    if (signals.state) reasons.push(signals.state);
  }

  const eduMatch =
    norm.educationLevelsEligible.includes("*") ||
    (signals.educationLevel && norm.educationLevelsEligible.includes(signals.educationLevel));
  if (eduMatch) {
    score += 20;
    if (signals.educationLevel) reasons.push(signals.educationLevel.replace("_", " "));
    if (signals.gradeLevel) reasons.push(signals.gradeLevel);
    if (signals.graduationYear) reasons.push(signals.graduationYear);
  }

  const userTags = [...signals.activityTags, ...signals.awardTags];
  const tagOverlap = norm.tags.filter((t) => userTags.some((u) => u.toLowerCase().includes(t.toLowerCase()))).length;
  if (tagOverlap > 0) {
    score += Math.min(20, tagOverlap * 5);
    reasons.push(...norm.tags.slice(0, 3).filter((t) => userTags.some((u) => u.toLowerCase().includes(t.toLowerCase()))));
  }

  const hasEssay = norm.requirements.includes("essay");
  if (hasEssay && signals.essayPreference) score += 5;
  else if (!hasEssay && signals.timeBudgetPreference === "low") score += 5;
  if (norm.needBased === true && signals.needBasedInterest) score += 5;

  const qualityBonus = Math.min(10, Math.floor((norm.qualityScore ?? 0) / 10));
  score += qualityBonus;
  if (norm.verifiedStatus === "approved") reasons.push("Verified");

  return { score: Math.min(100, score), reasons: [...new Set(reasons)].slice(0, 6) };
}

/** Compute match result for one scholarship. */
export function computeMatch(
  scholarship: Scholarship,
  signals: UserSignals
): ScholarshipMatchResult {
  const norm = scholarship.normalized;
  if (!norm || !norm.matchable) {
    return {
      scholarshipId: scholarship.id,
      eligibilityStatus: "unknown",
      matchScore: 0,
      reasons: [],
      missingRequirements: ["Eligibility unknown"],
    };
  }
  if (scholarship.verificationStatus === "flagged" || scholarship.verificationStatus === "hidden") {
    return {
      scholarshipId: scholarship.id,
      eligibilityStatus: "ineligible",
      matchScore: 0,
      reasons: [],
      missingRequirements: ["Not shown"],
    };
  }
  const gate = hardGate(norm, signals);
  const { score, reasons } = scoreMatch(norm, scholarship, signals, gate.pass);
  const eligibilityStatus = gate.pass ? (score >= GREENLIGHT_MIN_SCORE ? "eligible" : "may_not_be_eligible") : "ineligible";
  return {
    scholarshipId: scholarship.id,
    eligibilityStatus,
    matchScore: score,
    reasons,
    missingRequirements: gate.missingRequirements,
  };
}

/** In-memory cache: userId -> { at, results }. */
const cache = new Map<string, { at: number; results: ScholarshipMatchResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedMatches(userId: string): ScholarshipMatchResult[] | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.results;
}

export function setCachedMatches(userId: string, results: ScholarshipMatchResult[]): void {
  cache.set(userId, { at: Date.now(), results });
}

export function invalidateMatchCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/** Compute matches for all scholarships and cache. */
export async function computeMatchesForUser(
  userId: string,
  profile: Profile,
  scholarships: Scholarship[]
): Promise<ScholarshipMatchResult[]> {
  const signals = buildUserSignals(profile);
  const results = scholarships.map((s) => computeMatch(s, signals));
  setCachedMatches(userId, results);
  return results;
}

export { GREENLIGHT_MIN_SCORE, NEAR_MATCH_MIN_SCORE };
