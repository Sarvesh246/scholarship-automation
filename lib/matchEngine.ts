/**
 * Matching engine: 3 layers.
 * A) Hard eligibility gate: eligible | ineligible | unknown (never treat missing data as fail).
 * B) Soft fit score: weighted 0–100 (location, education, GPA, major, preferences, activities).
 * C) Completion readiness: small penalty when user is missing profile fields the scholarship needs.
 * Output: eligibilityStatus, matchPercent, reasons, missingProfileFields; optional matchBreakdown for debug.
 */
import type { Profile, Scholarship, NormalizedScholarship, UserSignals, ScholarshipMatchResult, MatchBreakdown } from "@/types";
import { expandMajor } from "@/lib/majorAbbreviations";

const GREENLIGHT_MIN_SCORE = 55;
const NEAR_MATCH_MIN_SCORE = 40;
const UNKNOWN_ELIGIBILITY_MULTIPLIER = 0.75;
const BASE_SCORE_WHEN_OPEN = 50; // scholarships with no/minimal constraints
const today = () => new Date().toISOString().slice(0, 10);

/** Normalize state to 2-letter uppercase for comparison. */
function normalizeState(state: string | undefined): string {
  if (!state || typeof state !== "string") return "";
  const t = state.trim().toUpperCase();
  if (t.length === 2) return t;
  const stateMap: Record<string, string> = {
    CALIFORNIA: "CA", TEXAS: "TX", FLORIDA: "FL", NEW_YORK: "NY", ILLINOIS: "IL",
    PENNSYLVANIA: "PA", OHIO: "OH", GEORGIA: "GA", NORTH_CAROLINA: "NC", MICHIGAN: "MI",
    ARIZONA: "AZ", VIRGINIA: "VA", WASHINGTON: "WA", MASSACHUSETTS: "MA", INDIANA: "IN",
    TENNESSEE: "TN", MISSOURI: "MO", MARYLAND: "MD", WISCONSIN: "WI", COLORADO: "CO",
  };
  const key = t.replace(/\s+/g, "_");
  return (stateMap[key] ?? t.slice(0, 2)).toUpperCase();
}

/** Normalize education level to canonical form. */
function normalizeEducationLevel(level: string | undefined): string | undefined {
  if (!level || typeof level !== "string") return undefined;
  const t = level.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "high_school" || t === "highschool") return "high_school";
  if (t === "college" || t === "undergraduate" || t === "undergrad") return "college";
  if (t === "grad" || t === "graduate" || t === "graduate_school") return "grad";
  return t;
}

/** Infer grade level from graduation year. */
function inferGradeLevel(graduationYear?: string): string | undefined {
  if (!graduationYear) return undefined;
  const y = parseInt(String(graduationYear).trim(), 10);
  if (!Number.isFinite(y)) return undefined;
  const currentYear = new Date().getFullYear();
  const diff = y - currentYear;
  if (diff <= 0) return "Senior";
  if (diff === 1) return "Junior";
  if (diff === 2) return "Sophomore";
  if (diff === 3) return "Freshman";
  return undefined;
}

/** Major match: normalize, expand abbrev, token overlap. "any" / "*" => full points. */
function majorMatchScore(
  userMajors: string[],
  eligibleMajors: string[],
  eligibleFields: string[]
): { score: number; matched: boolean } {
  if (eligibleMajors.includes("*") || eligibleFields.includes("*")) return { score: 15, matched: true };
  if (userMajors.length === 0) return { score: 0, matched: false };
  const normEligible = new Set(
    [...eligibleMajors, ...eligibleFields]
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean)
  );
  for (const m of userMajors) {
    const expanded = expandMajor(m).toLowerCase();
    const raw = m.trim().toLowerCase();
    for (const e of normEligible) {
      if (e === "*") return { score: 15, matched: true };
      if (e === raw || e === expanded) return { score: 15, matched: true };
      if (e.includes(raw) || raw.includes(e)) return { score: 15, matched: true };
      if (expanded.includes(e) || e.includes(expanded)) return { score: 12, matched: true };
    }
  }
  return { score: 0, matched: false };
}

/** Build user signals from profile. Tolerates camelCase or snake_case profile (e.g. from different sync/import). */
export function buildUserSignals(profile: Profile): UserSignals {
  const loc = profile.location ?? {};
  const ac = profile.academics ?? {};
  const prof = profile as unknown as Record<string, unknown>;
  const state = (loc as Record<string, unknown>).state ?? (loc as Record<string, unknown>).state_code ?? (loc as Record<string, unknown>).stateCode ?? profile.demographics?.state;
  const educationLevel = profile.educationLevel ?? (prof.education_level as string);
  const gpaRaw = ac.gpa?.trim() ? parseFloat(ac.gpa) : null;
  const scale = ac.gpaScale === "5.0" ? "5.0" : ac.gpaScale === "custom" && ac.gpaScaleCustom != null && ac.gpaScaleCustom > 0 ? "custom" : "4.0";
  let gpaNum: number | null = null;
  if (gpaRaw != null && Number.isFinite(gpaRaw)) {
    if (scale === "custom" && ac.gpaScaleCustom != null && ac.gpaScaleCustom > 0) {
      gpaNum = (gpaRaw / ac.gpaScaleCustom) * 4;
      gpaNum = Math.round(gpaNum * 100) / 100;
    } else if (scale !== "custom") {
      gpaNum = gpaRaw;
    }
  }
  const majors: string[] = [...(profile.intendedMajors ?? (Array.isArray(prof.intended_majors) ? prof.intended_majors : []) as string[])];
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
    state: (state as string) ?? profile.demographics?.state,
    city: loc.city ?? profile.demographics?.city,
    educationLevel: educationLevel as UserSignals["educationLevel"],
    graduationYear: ac.graduationYear,
    gradeLevel: inferGradeLevel(ac.graduationYear),
    majors,
    fields: majors,
    gpa: gpaNum,
    gpaScale: scale === "custom" ? "4.0" : (scale === "5.0" ? "5.0" : "4.0"),
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

export type GateStatus = "eligible" | "ineligible" | "unknown";

/** Layer A: Hard eligibility gate. Missing user data => unknown, not fail. */
function hardGate(
  norm: NormalizedScholarship,
  signals: UserSignals
): {
  status: GateStatus;
  failedCriteria: string[];
  missingRequirements: string[];
  unknownReasons: string[];
  almostEligibleReason?: string;
  gateDetails: { deadline: "pass" | "fail" | "unknown"; location: "pass" | "fail" | "unknown"; educationLevel: "pass" | "fail" | "unknown"; gpa: "pass" | "fail" | "unknown"; major: "pass" | "fail" | "unknown" };
} {
  const gateDetails = {
    deadline: "pass" as "pass" | "fail" | "unknown",
    location: "pass" as "pass" | "fail" | "unknown",
    educationLevel: "pass" as "pass" | "fail" | "unknown",
    gpa: "pass" as "pass" | "fail" | "unknown",
    major: "pass" as "pass" | "fail" | "unknown",
  };
  const failedCriteria: string[] = [];
  const missingRequirements: string[] = [];
  const unknownReasons: string[] = [];

  if (norm.deadline < today()) {
    gateDetails.deadline = "fail";
    failedCriteria.push("Deadline passed");
    missingRequirements.push("Deadline passed");
    return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
  }

  const hasStateRestriction = norm.statesEligible.length > 0 && !norm.statesEligible.includes("*");
  if (hasStateRestriction) {
    const userState = normalizeState(signals.state ?? "");
    if (!userState) {
      gateDetails.location = "unknown";
      unknownReasons.push("Add your state to confirm eligibility");
    } else {
      const normStates = norm.statesEligible.map((s) => normalizeState(String(s)));
      if (!normStates.some((s) => s === userState)) {
        gateDetails.location = "fail";
        failedCriteria.push("State eligibility");
        missingRequirements.push("State eligibility");
        return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
      }
    }
  }

  const hasEduRestriction = norm.educationLevelsEligible.length > 0 && !norm.educationLevelsEligible.includes("*");
  if (hasEduRestriction) {
    const userLevel = normalizeEducationLevel(signals.educationLevel) ?? (signals.graduationYear ? "college" : undefined);
    if (!userLevel) {
      gateDetails.educationLevel = "unknown";
      unknownReasons.push("Add education level or graduation year");
    } else {
      const normLevels = norm.educationLevelsEligible.map((e) => normalizeEducationLevel(e) ?? String(e).toLowerCase());
      if (!normLevels.includes(userLevel)) {
        gateDetails.educationLevel = "fail";
        failedCriteria.push("Education level");
        missingRequirements.push("Education level");
        return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
      }
    }
  }

  if (norm.minGPA != null && norm.minGPA > 0) {
    if (signals.gpa == null) {
      gateDetails.gpa = "unknown";
      unknownReasons.push("Add GPA to confirm eligibility");
    } else {
      const maxGpa = signals.gpaScale === "5.0" ? 5 : 4;
      if (signals.gpa > maxGpa) {
        gateDetails.gpa = "fail";
        failedCriteria.push("GPA");
        return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
      }
      if (signals.gpa < norm.minGPA) {
        const gap = norm.minGPA - signals.gpa;
        if (gap <= 0.2) {
          gateDetails.gpa = "fail";
          const reason = `Requires ${norm.minGPA} GPA (you have ${signals.gpa})`;
          failedCriteria.push("GPA");
          missingRequirements.push(reason);
          return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, almostEligibleReason: reason, gateDetails };
        }
        gateDetails.gpa = "fail";
        failedCriteria.push("GPA");
        missingRequirements.push(`Requires ${norm.minGPA} minimum GPA`);
        return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
      }
    }
  }

  const hasMajorRestriction = norm.majorsEligible.length > 0 && !norm.majorsEligible.includes("*") && !norm.fieldsEligible.includes("*");
  if (hasMajorRestriction && signals.majors.length === 0) {
    gateDetails.major = "unknown";
    unknownReasons.push("Add major to confirm eligibility");
  } else if (hasMajorRestriction && signals.majors.length > 0) {
    const { matched } = majorMatchScore(signals.majors, norm.majorsEligible, norm.fieldsEligible);
    if (!matched) {
      gateDetails.major = "fail";
      failedCriteria.push("Major/field");
      missingRequirements.push("Major/field not in eligible list");
      return { status: "ineligible", failedCriteria, missingRequirements, unknownReasons, gateDetails };
    }
  }

  const status: GateStatus = failedCriteria.length > 0 ? "ineligible" : unknownReasons.length > 0 ? "unknown" : "eligible";
  return { status, failedCriteria, missingRequirements, unknownReasons, gateDetails };
}

/** Weights for soft score (total 100). */
const WEIGHTS = {
  location: 15,
  educationLevel: 20,
  gpa: 15,
  major: 15,
  needBased: 10,
  essay: 10,
  effort: 10,
  activities: 5,
} as const;

/** Layer B: Weighted soft score 0–100. Layer C: readiness penalty. */
function softScoreAndReadiness(
  norm: NormalizedScholarship,
  s: Scholarship,
  signals: UserSignals,
  gateStatus: GateStatus
): { scoreBreakdown: MatchBreakdown["scoreBreakdown"]; readinessPenalty: number; reasons: string[] } {
  const reasons: string[] = [];
  let location = 0;
  let educationLevel = 0;
  let gpa = 0;
  let major = 0;
  let needBased = 0;
  let essay = 0;
  let effort = 0;
  let activities = 0;

  const reqs = Array.isArray(norm.requirements) ? norm.requirements : [];
  const tagsList = Array.isArray(norm.tags) ? norm.tags : [];

  const isOpen = !norm.statesEligible.length || norm.statesEligible.includes("*");
  if (isOpen) {
    location = WEIGHTS.location;
    if (signals.state) reasons.push(signals.state);
  } else if (signals.state && norm.statesEligible.some((st) => normalizeState(st) === normalizeState(signals.state))) {
    location = WEIGHTS.location;
    reasons.push(signals.state!);
  }

  const eduOpen = !norm.educationLevelsEligible.length || norm.educationLevelsEligible.includes("*");
  if (eduOpen) {
    educationLevel = WEIGHTS.educationLevel;
  } else if (signals.educationLevel) {
    const userLevel = normalizeEducationLevel(signals.educationLevel);
    if (userLevel && norm.educationLevelsEligible.some((e) => normalizeEducationLevel(e) === userLevel)) {
      educationLevel = WEIGHTS.educationLevel;
      reasons.push(signals.educationLevel.replace("_", " "));
      if (signals.gradeLevel) reasons.push(signals.gradeLevel);
    }
  }

  if (norm.minGPA == null || norm.minGPA === 0) {
    gpa = WEIGHTS.gpa;
  } else if (signals.gpa != null && signals.gpa >= norm.minGPA) {
    gpa = WEIGHTS.gpa;
    reasons.push(`${signals.gpa} GPA`);
  } else if (signals.gpa != null && norm.minGPA - signals.gpa <= 0.3) {
    gpa = Math.round(WEIGHTS.gpa * 0.5);
  }

  const majorResult = majorMatchScore(signals.majors, norm.majorsEligible, norm.fieldsEligible);
  major = majorResult.score;
  if (majorResult.matched && signals.majors.length) reasons.push(signals.majors.slice(0, 2).join(", "));

  if (norm.needBased === true && signals.needBasedInterest) {
    needBased = WEIGHTS.needBased;
    reasons.push("Need-based");
  } else if (norm.needBased == null) needBased = Math.round(WEIGHTS.needBased * 0.5);

  const hasEssay = reqs.includes("essay");
  if (hasEssay && signals.essayPreference) {
    essay = WEIGHTS.essay;
    reasons.push("Essays OK");
  } else if (!hasEssay && signals.timeBudgetPreference === "low") {
    essay = WEIGHTS.essay;
  } else if (!hasEssay) essay = Math.round(WEIGHTS.essay * 0.5);

  const effortTier = (s.estimatedTime ?? "").toLowerCase().includes("hour") ? "medium" : (s.estimatedTime ?? "").toLowerCase().includes("min") ? "low" : "high";
  if (effortTier === signals.timeBudgetPreference) effort = WEIGHTS.effort;
  else if (signals.timeBudgetPreference === "medium") effort = Math.round(WEIGHTS.effort * 0.6);
  else effort = Math.round(WEIGHTS.effort * 0.3);

  const userTags = [...signals.activityTags, ...signals.awardTags];
  const tagOverlap = tagsList.filter((t) => userTags.some((u) => u.toLowerCase().includes(String(t).toLowerCase()))).length;
  if (tagOverlap > 0) {
    activities = Math.min(WEIGHTS.activities, tagOverlap * 2);
    reasons.push(...tagsList.slice(0, 2).filter((t) => userTags.some((u) => u.toLowerCase().includes(String(t).toLowerCase()))));
  }

  const total = location + educationLevel + gpa + major + needBased + essay + effort + activities;

  let readinessPenalty = 0;
  if (reqs.some((r) => /transcript/i.test(String(r))) && signals.gpa == null) readinessPenalty += 5;
  if (reqs.some((r) => /essay|letter|recommendation/i.test(String(r))) && (signals.activityTags.length + signals.awardTags.length) === 0) readinessPenalty += 3;

  return {
    scoreBreakdown: {
      location,
      educationLevel,
      gpa,
      major,
      needBased,
      essay,
      effort,
      activities,
      total: Math.min(100, total),
    },
    readinessPenalty,
    reasons: [...new Set(reasons)].slice(0, 6),
  };
}

/** Build missingProfileFields for the user (what to add to improve matches). */
function getMissingProfileFields(norm: NormalizedScholarship, signals: UserSignals, unknownReasons: string[]): string[] {
  const out: string[] = [];
  const hasStateReq = norm.statesEligible.length > 0 && !norm.statesEligible.includes("*");
  if (hasStateReq && !signals.state) out.push("State");
  const hasEduReq = norm.educationLevelsEligible.length > 0 && !norm.educationLevelsEligible.includes("*");
  if (hasEduReq && !signals.educationLevel && !signals.graduationYear) out.push("Education level");
  if (norm.minGPA != null && norm.minGPA > 0 && signals.gpa == null) out.push("GPA");
  const hasMajorReq = norm.majorsEligible.length > 0 && !norm.majorsEligible.includes("*");
  if (hasMajorReq && signals.majors.length === 0) out.push("Major");
  const reqs = Array.isArray(norm.requirements) ? norm.requirements : [];
  if (reqs.some((r) => /essay|letter|recommendation/i.test(String(r))) && signals.activityTags.length === 0 && signals.awardTags.length === 0) out.push("Activities or awards");
  return [...new Set(out)];
}

/** Read array from scholarship; supports camelCase or snake_case (sync/import may use either). */
function getScholarshipArray(s: Scholarship, key: string, altKey?: string): string[] {
  const rec = s as unknown as Record<string, unknown>;
  const raw = rec[key];
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (altKey) {
    const alt = rec[altKey];
    if (Array.isArray(alt)) return alt.map((x) => String(x));
  }
  return [];
}

/** Build a minimal normalized shape when normalized is missing. Open eligibility => unknown + base score. */
function fallbackNormalized(s: Scholarship): NormalizedScholarship | null {
  let deadlineStr: string;
  const raw = s.deadline;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw.trim())) {
    deadlineStr = raw.replace(/T.*$/i, "").trim();
  } else if (raw && typeof raw === "object" && "_seconds" in raw && typeof (raw as { _seconds: number })._seconds === "number") {
    const sec = (raw as { _seconds: number })._seconds;
    deadlineStr = new Date(sec * 1000).toISOString().slice(0, 10);
  } else if (raw != null) {
    const parsed = new Date(String(raw));
    deadlineStr = !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  } else {
    deadlineStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  if (deadlineStr < today()) return null;
  const amount = typeof s.amount === "number" && s.amount >= 0 ? s.amount : 0;
  const categoryTags = getScholarshipArray(s, "categoryTags", "category_tags");
  const eligibilityTags = getScholarshipArray(s, "eligibilityTags", "eligibility_tags");
  const prompts = getScholarshipArray(s, "prompts");
  return {
    title: (s.title ?? "").trim(),
    orgName: (s.sponsor ?? "").trim(),
    orgWebsite: s.applicationUrl ?? null,
    applyUrl: s.applicationUrl ?? null,
    deadline: deadlineStr,
    awardMin: amount,
    awardMax: amount,
    frequency: "one-time",
    statesEligible: ["*"],
    educationLevelsEligible: ["*"],
    gradeLevelsEligible: [],
    majorsEligible: ["*"],
    fieldsEligible: categoryTags.length ? categoryTags.map((c) => String(c).toLowerCase()) : ["*"],
    minGPA: null,
    tags: [...categoryTags.map((c) => String(c).toLowerCase()), ...eligibilityTags.slice(0, 5)],
    requirements: prompts.length > 0 ? ["essay"] : [],
    needBased: null,
    verifiedStatus: s.verificationStatus === "approved" ? "approved" : "needs_review",
    qualityScore: s.qualityScore ?? 50,
    lastVerifiedAt: null,
    source: s.source ?? "manual",
    matchable: true,
  };
}

function isNormComplete(n: unknown): n is NormalizedScholarship {
  if (!n || typeof n !== "object") return false;
  const o = n as Record<string, unknown>;
  return (
    Array.isArray(o.educationLevelsEligible) &&
    Array.isArray(o.statesEligible) &&
    Array.isArray(o.majorsEligible) &&
    Array.isArray(o.fieldsEligible) &&
    Array.isArray(o.tags) &&
    Array.isArray(o.requirements) &&
    typeof o.deadline === "string"
  );
}

/** Compute match result for one scholarship. includeBreakdown: set true for debug UI. */
export function computeMatch(
  scholarship: Scholarship,
  signals: UserSignals,
  options?: { includeBreakdown?: boolean }
): ScholarshipMatchResult {
  const id = scholarship?.id != null ? String(scholarship.id) : "";
  if (!id) {
    return {
      scholarshipId: "",
      eligibilityStatus: "unknown",
      matchScore: 0,
      matchPercent: 0,
      reasons: [],
      missingRequirements: ["Missing scholarship id"],
      missingProfileFields: [],
      failedCriteria: [],
    };
  }
  if (scholarship.verificationStatus === "flagged" || scholarship.verificationStatus === "hidden") {
    return {
      scholarshipId: id,
      eligibilityStatus: "ineligible",
      matchScore: 0,
      matchPercent: 0,
      reasons: [],
      missingRequirements: ["Not shown"],
      missingProfileFields: [],
      failedCriteria: [],
    };
  }
  const rawNorm = scholarship.normalized;
  const rawValid = rawNorm && isNormComplete(rawNorm) && (typeof rawNorm.deadline === "string" && rawNorm.deadline >= today());
  const norm = rawValid ? rawNorm : fallbackNormalized(scholarship);
  if (!norm) {
    return {
      scholarshipId: id,
      eligibilityStatus: "unknown",
      matchScore: 0,
      matchPercent: 0,
      reasons: [],
      missingRequirements: ["Deadline passed or invalid"],
      missingProfileFields: [],
      failedCriteria: [],
    };
  }

  try {
  const gate = hardGate(norm, signals);
  const { scoreBreakdown, readinessPenalty, reasons } = softScoreAndReadiness(norm, scholarship, signals, gate.status);

  let rawScore = scoreBreakdown.total - readinessPenalty;
  const isOpen = (norm.statesEligible.includes("*") || norm.statesEligible.length === 0) &&
    (norm.educationLevelsEligible.includes("*") || norm.educationLevelsEligible.length === 0) &&
    (norm.majorsEligible.includes("*") || norm.majorsEligible.length === 0) &&
    norm.minGPA == null;
  if (isOpen && rawScore < BASE_SCORE_WHEN_OPEN) rawScore = BASE_SCORE_WHEN_OPEN;

  let multiplier = 1;
  if (gate.status === "ineligible") multiplier = 0;
  else if (gate.status === "unknown") multiplier = UNKNOWN_ELIGIBILITY_MULTIPLIER;

  const matchPercent = Math.min(100, Math.round(rawScore * multiplier));

  let eligibilityStatus: ScholarshipMatchResult["eligibilityStatus"];
  if (gate.status === "ineligible") eligibilityStatus = "ineligible";
  else if (gate.almostEligibleReason) eligibilityStatus = "almost_eligible";
  else if (gate.status === "unknown") eligibilityStatus = "unknown";
  else eligibilityStatus = matchPercent >= GREENLIGHT_MIN_SCORE ? "eligible" : "may_not_be_eligible";

  const missingProfileFields = getMissingProfileFields(norm, signals, gate.unknownReasons);

  const result: ScholarshipMatchResult = {
    scholarshipId: id,
    eligibilityStatus,
    matchScore: matchPercent,
    matchPercent,
    reasons,
    missingRequirements: gate.missingRequirements,
    missingProfileFields,
    failedCriteria: gate.failedCriteria.length ? gate.failedCriteria : undefined,
    almostEligibleReason: gate.almostEligibleReason,
  };

  if (options?.includeBreakdown) {
    result.matchBreakdown = {
      gates: gate.gateDetails,
      scoreBreakdown,
      readinessPenalty,
      eligibilityMultiplier: multiplier,
    };
  }

  return result;
  } catch (err) {
    console.warn("[matchEngine] computeMatch error for", id, err);
    return {
      scholarshipId: id,
      eligibilityStatus: "unknown",
      matchScore: BASE_SCORE_WHEN_OPEN,
      matchPercent: BASE_SCORE_WHEN_OPEN,
      reasons: [],
      missingRequirements: [],
      missingProfileFields: [],
      failedCriteria: [],
    };
  }
}

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

/** Include match breakdown in results when true (e.g. dev or ?debug=1). */
let includeBreakdownGlobal = false;
export function setIncludeMatchBreakdown(value: boolean): void {
  includeBreakdownGlobal = value;
}

export async function computeMatchesForUser(
  userId: string,
  profile: Profile,
  scholarships: Scholarship[],
  options?: { includeBreakdown?: boolean }
): Promise<ScholarshipMatchResult[]> {
  const signals = buildUserSignals(profile);
  const includeBreakdown = options?.includeBreakdown ?? includeBreakdownGlobal;
  const results: ScholarshipMatchResult[] = [];
  for (let i = 0; i < scholarships.length; i++) {
    try {
      results.push(computeMatch(scholarships[i], signals, { includeBreakdown }));
    } catch {
      const sid = scholarships[i]?.id != null ? String(scholarships[i].id) : `unknown-${i}`;
      results.push({
        scholarshipId: sid,
        eligibilityStatus: "unknown",
        matchScore: 0,
        matchPercent: 0,
        reasons: [],
        missingRequirements: [],
        missingProfileFields: [],
        failedCriteria: [],
      });
    }
  }
  setCachedMatches(userId, results);
  return results;
}

export { GREENLIGHT_MIN_SCORE, NEAR_MATCH_MIN_SCORE };

/** True if profile has at least one field used for matching (state, education level, or major). Use to avoid using cache computed with empty profile. */
export function profileHasAnyMatchData(profile: Profile): boolean {
  const loc = profile.location ?? {};
  const ac = profile.academics ?? {};
  const state = (loc as Record<string, unknown>).state ?? (loc as Record<string, unknown>).state_code ?? profile.demographics?.state;
  const educationLevel = profile.educationLevel ?? (profile as unknown as Record<string, unknown>).education_level;
  const hasMajor =
    (profile.intendedMajors?.length ?? 0) > 0 ||
    (profile as unknown as Record<string, unknown>).intended_majors != null ||
    (ac.major ?? "").trim() !== "" ||
    (profile.majorsFreeText ?? "").trim() !== "" ||
    ((profile as unknown as Record<string, unknown>).majors_free_text as string)?.trim() !== "";
  return !!(state && String(state).trim()) || !!(educationLevel && String(educationLevel).trim()) || hasMajor;
}
