/**
 * Scholarship definition and eligibility-aware filtering.
 *
 * Rule: A scholarship on this platform must be:
 * - Awarded to an individual person (not an institution)
 * - Directly applied to by a student
 * - Not require institutional affiliation as primary applicant
 * - Not require research lab, nonprofit org, or government entity status
 * - Not exceed a reasonable individual award cap (e.g. > $100k → likely institutional)
 *
 * Hard exclusions (any match → auto reject for main feed):
 * - Institutional keywords in title/description
 * - Award above individual cap ($100k for federal; configurable)
 * - Applicant type = institutions / PI / state agencies (no student mention)
 * - Application requires EIN, DUNS, SAM, Grants.gov Workspace, or PI designation
 *
 * Scholarship score: only allow items with score ≥ MIN_SCHOLARSHIP_SCORE (30).
 */
import type { FundingType } from "@/types";

export const INDIVIDUAL_AWARD_CAP = 100_000;
/** Above this, auto-classify as institutional regardless of other signals. */
export const INSTITUTIONAL_AWARD_FLOOR = 250_000;
/** Minimum scholarship score to allow in main feed (Step 3). */
export const MIN_SCHOLARSHIP_SCORE = 30;

/** Reject if title or description contains any of these (institutional). */
export const INSTITUTIONAL_KEYWORDS = [
  "Center",
  "Program Grant",
  "P30",
  "R01",
  "EPSCoR",
  "Laboratory",
  "State Partnership",
  "Consortium",
  "Research Infrastructure",
  "Cooperative Agreement",
  "Department of Defense",
  "Warfighter",
  "National Laboratory",
  "Clinical Trial Optional",
  "Broad Agency Announcement",
  "BAA",
  "Principal Investigator",
  "applicant organization",
  "eligible institutions",
  "state agencies",
  "nonprofits",
  "research organizations",
];

/** Must mention at least one of these for grants_gov to be considered student-facing. */
export const STUDENT_APPLICANT_PATTERNS = [
  /\bstudents?\b/i,
  /\bundergraduate\b/i,
  /\bgraduate\s+students?\b/i,
  /\bhigh\s+school\s+seniors?\b/i,
  /\bindividual\s+applicant\b/i,
  /\bU\.?S\.?\s+citizen\s+student\b/i,
  /\bcollege[- ]bound\b/i,
  /\bK-?12\b/i,
  /\bstudent\s+financial\s+aid\b/i,
  /\bscholarship\b/i,
  /\bcollege\s+student\b/i,
  /\bpostsecondary\b/i,
  /\bfirst[- ]generation\s+college\b/i,
  /\blow[- ]income\s+student\b/i,
];

/** Reject if description/title emphasizes these (institutional applicant). */
export const INSTITUTIONAL_APPLICANT_PATTERNS = [
  /\beligible\s+institutions?\b/i,
  /\bstate\s+agencies?\b/i,
  /\bnonprofits?\b/i,
  /\bresearch\s+organizations?\b/i,
  /\bprincipal\s+investigator\b/i,
  /\bapplicant\s+organization\b/i,
  /\bPI\s+designation\b/i,
  /\binstitution\s+as\s+applicant\b/i,
];

/** Reject if application requires any of these (no student has DUNS/SAM). */
export const INSTITUTIONAL_APPLICATION_PATTERNS = [
  /\bDUNS\s+number\b/i,
  /\bDUNS\b/i,
  /\bSAM\s+registration\b/i,
  /\bSAM\.gov\b/i,
  /\bGrants\.gov\s+Workspace\b/i,
  /\bEIN\b/i,
  /\bEmployer\s+Identification\s+Number\b/i,
  /\bPI\s+designation\b/i,
  /\bPrincipal\s+Investigator\s+designation\b/i,
];

type ScholarshipLike = {
  title?: string;
  description?: string;
  amount?: number;
  source?: string;
  eligibilityTags?: string[];
  prompts?: string[];
};

/** Returns true if title or description contains any institutional keyword (case-insensitive). */
export function hasInstitutionalKeyword(s: ScholarshipLike): boolean {
  const text = [(s.title ?? ""), (s.description ?? "")].join(" ").toLowerCase();
  return INSTITUTIONAL_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

/** Returns true if award exceeds individual cap (e.g. $100k). */
export function exceedsIndividualCap(amount: number | undefined, cap: number = INDIVIDUAL_AWARD_CAP): boolean {
  return typeof amount === "number" && Number.isFinite(amount) && amount > cap;
}

/** Returns true if text explicitly mentions student/individual applicants. */
export function mentionsStudentApplicant(s: ScholarshipLike): boolean {
  const text = [(s.title ?? ""), (s.description ?? ""), (s.eligibilityTags ?? []).join(" ")].join(" ");
  return STUDENT_APPLICANT_PATTERNS.some((re) => re.test(text));
}

/** Returns true if text emphasizes institutional applicants (reject). */
export function mentionsInstitutionalApplicant(s: ScholarshipLike): boolean {
  const text = [(s.title ?? ""), (s.description ?? "")].join(" ");
  return INSTITUTIONAL_APPLICANT_PATTERNS.some((re) => re.test(text));
}

/** Returns true if application requires EIN/DUNS/SAM/Grants.gov Workspace/PI. */
export function requiresInstitutionalApplication(s: ScholarshipLike): boolean {
  const text = [(s.title ?? ""), (s.description ?? "")].join(" ");
  return INSTITUTIONAL_APPLICATION_PATTERNS.some((re) => re.test(text));
}

/** Hard exclusion: true = do not show in main feed (treat as institutional/reject). */
export function isHardExcluded(s: ScholarshipLike): { excluded: boolean; reason?: string } {
  if (hasInstitutionalKeyword(s)) return { excluded: true, reason: "institutional_keyword" };
  if (exceedsIndividualCap(s.amount, INDIVIDUAL_AWARD_CAP)) return { excluded: true, reason: "award_exceeds_cap" };
  const source = (s.source ?? "").toLowerCase();
  if (source === "grants_gov") {
    if (!mentionsStudentApplicant(s)) return { excluded: true, reason: "no_student_applicant_mention" };
    if (mentionsInstitutionalApplicant(s)) return { excluded: true, reason: "institutional_applicant" };
  }
  if (requiresInstitutionalApplication(s)) return { excluded: true, reason: "institutional_application_required" };
  return { excluded: false };
}

/** Scholarship score: + for student/merit signals, - for institutional. Only allow score ≥ MIN_SCHOLARSHIP_SCORE. */
export function computeScholarshipScore(s: ScholarshipLike): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];
  const text = [(s.title ?? ""), (s.description ?? "")].toLowerCase();
  const amount = typeof s.amount === "number" ? s.amount : 0;

  if (/\bstudents?\b|undergraduate|graduate\s+students?|high\s+school\s+seniors?|college[- ]bound\b/i.test(text)) {
    score += 20;
    breakdown.push("+20 mentions students");
  }
  if (Number.isFinite(amount) && amount > 0 && amount < 25_000) {
    score += 15;
    breakdown.push("+15 award < $25k");
  }
  if (/\bGPA\b|grade\s+point\s+average|minimum\s+\d\.\d|gpa\s+of\s+\d/i.test(text)) {
    score += 10;
    breakdown.push("+10 GPA requirement");
  }
  if (/\bessay\b|writing\s+sample|prompt\b|personal\s+statement/i.test(text) || (s.prompts?.length ?? 0) > 0) {
    score += 10;
    breakdown.push("+10 essay/writing");
  }
  if (/\binstitution\b|institutional\b|organizations?\s+may\s+apply/i.test(text)) {
    score -= 30;
    breakdown.push("-30 institution mention");
  }
  if (Number.isFinite(amount) && amount > INSTITUTIONAL_AWARD_FLOOR) {
    score -= 40;
    breakdown.push("-40 award > $250k");
  }
  if (/\bprincipal\s+investigator\b|\bPI\s+designation\b/i.test(text)) {
    score -= 50;
    breakdown.push("-50 principal investigator");
  }

  return { score, breakdown };
}

/**
 * Compute funding type and whether this item should appear in the main scholarship feed.
 * - scholarship / fellowship → show
 * - research_grant / institutional_grant / government_program → do not show in main feed
 */
export function computeFundingType(s: ScholarshipLike): {
  fundingType: FundingType;
  showInMainFeed: boolean;
  scholarshipScore: number;
  hardExcluded: boolean;
  exclusionReason?: string;
} {
  const hard = isHardExcluded(s);
  if (hard.excluded) {
    return {
      fundingType: "institutional_grant",
      showInMainFeed: false,
      scholarshipScore: 0,
      hardExcluded: true,
      exclusionReason: hard.reason,
    };
  }

  const { score: scholarshipScore } = computeScholarshipScore(s);
  const source = (s.source ?? "").toLowerCase();

  if (source === "grants_gov") {
    if (scholarshipScore < MIN_SCHOLARSHIP_SCORE) {
      return {
        fundingType: "government_program",
        showInMainFeed: false,
        scholarshipScore,
        hardExcluded: false,
      };
    }
    return {
      fundingType: "scholarship",
      showInMainFeed: true,
      scholarshipScore,
      hardExcluded: false,
    };
  }

  if (source === "scholarship_owl" || !source) {
    return {
      fundingType: "scholarship",
      showInMainFeed: true,
      scholarshipScore: scholarshipScore >= MIN_SCHOLARSHIP_SCORE ? scholarshipScore : 50,
      hardExcluded: false,
    };
  }

  if (scholarshipScore >= MIN_SCHOLARSHIP_SCORE && mentionsStudentApplicant(s) && !mentionsInstitutionalApplicant(s)) {
    return {
      fundingType: "fellowship",
      showInMainFeed: true,
      scholarshipScore,
      hardExcluded: false,
    };
  }

  return {
    fundingType: "institutional_grant",
    showInMainFeed: false,
    scholarshipScore,
    hardExcluded: false,
  };
}
