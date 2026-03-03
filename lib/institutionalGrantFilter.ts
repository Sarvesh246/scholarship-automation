/**
 * Detect federal/institutional grants that are not student scholarships.
 * Used to hide them from the main list and to skip adding them during Grants.gov sync.
 * These are typically BAAs, research grants, institutional funding, etc.
 *
 * Also filters out grants that target non-students (world leaders, senior professionals,
 * faculty development, etc.) so only student-focused grants (high school, college, etc.) are allowed.
 */
import { INDIVIDUAL_AWARD_CAP } from "./scholarshipDefinition";

/** Max prize amount for admin validation; same as individual award cap. Re-exported for backward compatibility. */
export const MAX_PRIZE_AMOUNT = INDIVIDUAL_AWARD_CAP;

type ScholarshipLike = { title?: string; sponsor?: string; source?: string; description?: string };

/** Phrases in title that indicate an institutional grant (organizations, not individual students). */
const INSTITUTIONAL_TITLE_PATTERNS = [
  /\bBroad\s+Agency\s+Announcement\b/i,
  /\bBAA\b/i,
  /\bResearch\s+and\s+Development\b/i,
  /\bR&D\s+/i,
  /\bR\s*&\s*D\b/i,
  /\bUniversity\s+Assistance\b/i,
  /\bCenters?\s+of\s+Excellence\b/i,
  /\bImplementation\s+Grants?\b/i,
  /\bCooperative\s+Agreement\b/i,
  /\bExtramural\b/i,
  /\bPartners?\s+Program\b/i,
  /\bProgram\s+Guidance\b/i,
  /\bDirected\s+Energy\b/i,
  /\bField\s+Tests?\b/i,
  /\bFacilities\s+and\s+Equipment\b/i,
  /\bPay-for-Performance\b/i,
  /\bIncentive\s+Payments?\s+Program\b/i,
  /\bStaffing\s+Campaign\b/i,
  /\bTraining\s+Grants?\b/i,
  /\bOpen\s+NFO\b/i,
  /\bCompetitive\s+Grants?\s+Program\b/i,
  /\bInnovation\s+Partners?\b/i,
  /\bEnergy\s+Frontier\b/i,
  /\bExpeditions?\s+in\s+Computing\b/i,
  /\bRESTORE\s+Act\b/i,
  /\bFellow,?\s+Specialist\b/i,
  /\bVirtual\s+Educator\s+Program\b/i,
  /\bStrengthening\s+Community\s+Colleges\b/i,
  /\bStaff\s+Research\s+Program\b/i,
  /\bAgriculture\s+and\s+Food\s+Research\s+Initiative\b/i,
  /\bBroad\s+Agency\s+Announcement\s+\(BAA\)/i,
  /\bHuman\s+Performance\s+Research\b/i,
  /\bBiomedical\s+and\s+Human\s+Performance\b/i,
  /\bDirected\s+Energy\s+\(RD\)\b/i,
  /\bOceanographic\s+Facilities\b/i,
  /\bChoice\s+Neighborhoods\s+Implementation\b/i,
  /\bGeothermal\s+Field\s+Tests?\b/i,
  /\bSCALEUP\b/i,
  /\bCyber\s+Service\s+Academy\b/i,
  /\bNursing\s+Home\s+Staffing\b/i,
  /\bEnergy\s+Frontier\s+Research\s+Centers\b/i,
  /\bFuture\s+Computing\s+Research\b/i,
  /\bCISE\b/i,
  /\bDislocated\s+Worker\s+Grant\b/i,
  /\bSUPERHOT\b/i,
  /\bSmall\s+Surface\s+Water\s+and\s+Groundwater\b/i,
  /\bIntegrated\s+Data\s+Systems\b/i,
  /\bEnglish\s+Language\s+Fellow\b/i,
  /\bNDEP\s+STEM\s+Open\b/i,
  /\bFoundational\s+and\s+Applied\s+Science\s+Program\b/i,
  /\bNIFA\b/i,
];

/**
 * Returns true if this grant is aimed at institutions/organizations rather than individual students.
 * Only applies to grants_gov (and similar) source; other sources are not filtered by this.
 */
export function isInstitutionalGrant(s: ScholarshipLike): boolean {
  const source = (s.source ?? "").toLowerCase();
  if (source !== "grants_gov") return false;

  const title = (s.title ?? "").trim();
  if (!title) return false;

  return INSTITUTIONAL_TITLE_PATTERNS.some((re) => re.test(title));
}

/** True if the title alone looks like an institutional grant (for admin form warning). */
export function titleLooksInstitutional(title: string): boolean {
  const t = (title ?? "").trim();
  if (!t) return false;
  return INSTITUTIONAL_TITLE_PATTERNS.some((re) => re.test(t));
}

/**
 * Phrases that indicate a grant targets non-students (world leaders, senior professionals,
 * faculty, principal investigators, decades of experience, etc.).
 * Used to exclude these from Grants.gov sync so only student-focused grants are allowed.
 */
const NON_STUDENT_TARGET_PATTERNS = [
  /\bworld\s+leader/i,
  /\bglobal\s+leader/i,
  /\bdecades?\s+of\s+experience\b/i,
  /\byears?\s+of\s+experience\b/i,
  /\b(?:senior|mid-?career|established)\s+(?:executive|professional|fellow|scholar|scientist|researcher)\b/i,
  /\bprincipal\s+investigator\b/i,
  /\b(?:faculty|teacher)\s+development\b/i,
  /\bprofessional\s+development\s+for\s+(?:educators|teachers|faculty)\b/i,
  /\bvisiting\s+scholar\b/i,
  /\bdistinguished\s+scholar\b/i,
  /\bemeritus\b/i,
  /\bpost-?doctoral\s+(?:fellow|researcher)\b/i,
  /\bpostdoc\b/i,
  /\binstitutional\s+capacity\b/i,
  /\bworkforce\s+development\b/i,
  /\bdislocated\s+worker\b/i,
  /\blifelong\s+learning\b/i,
  /\bcontinuing\s+education\b/i,
  /\bprofessional\s+certification\b/i,
  /\bexecutive\s+leadership\b/i,
  /\bgovernment\s+official/i,
  /\bdiplomat/i,
  /\bpolicy\s+fellow\b/i,
  /\bmid-?career\s+researcher\b/i,
  /\bestablished\s+investigator\b/i,
  /\bR01\b/i,
  /\bR21\b/i,
  /\bK99\b/i,
  /\bK01\b/i,
  // Leaders, on-demand, diplomacy
  /\bleaders\s+lead\b/i,
  /\bon-?demand\b.*\b(lead|leader)\b/i,
  // Community/industry programs (wood, energy, innovation)
  /\bwood\s+energy\b/i,
  /\bwood\s+innovation\b/i,
  /\bcommunity\s+wood\b/i,
  // Research/tech acceleration, LEAP, centers
  /\bleading\s+edge\s+acceleration\b/i,
  /\bLEAP\b/i,
  /\bresearch\s+centers?\b/i,
  /\bP30\b/i,
  /\bclinical\s+trial\b/i,
  /\bEPSCoR\b/i,
  /\bnational\s+laboratory\b/i,
  /\bstate\/national\s+laboratory\b/i,
  // Military / warfighter
  /\bwarfighter\b/i,
  /\bdeployed\s+military\b/i,
  /\bmilitary\s+personnel\b/i,
  /\bdisease\s+vectors\b/i,
  /\barthropod\b/i,
  // Occupational / workforce training (non-student)
  /\boccupational\s+safety\b/i,
  /\bcommercial\s+fishing\b/i,
  /\btraining\s+project\s+grants?\b/i,
  /\bT03\b/i,
  // Early career (researcher/faculty, not undergrad)
  /\bdistinguished\s+early\s+career\b/i,
  /\bearly\s+career\s+program\b/i,
  // Generic (keep specific; avoid overly broad)
  /\bhealth\s+information\s+technology\b/i,
  /\bdiabetes\s+research\s+centers\b/i,
];

/**
 * Phrases that indicate a grant targets students (K-12, high school, college, etc.).
 * For grants_gov we require at least one of these to allow the grant.
 */
const STUDENT_TARGET_PATTERNS = [
  /\bhigh\s+school\b/i,
  /\bcollege\s+student/i,
  /\bundergraduate\b/i,
  /\bgraduate\s+student\b/i,
  /\bgrad\s+student\b/i,
  /\bK-?12\b/i,
  /\bsecondary\s+education\b/i,
  /\bpostsecondary\b/i,
  /\bstudent\s+financial\s+aid\b/i,
  /\bscholarship\b/i,
  /\bfellowship\s+for\s+students\b/i,
  /\bstudent\s+fellowship\b/i,
  /\bundergraduate\s+research\b/i,
  /\bstudent\s+research\b/i,
  /\btribal\s+college\b/i,
  /\bcommunity\s+college\b/i,
  /\bhistorically\s+black\s+college\b/i,
  /\bHBCU\b/i,
  /\bminority\s+serving\s+institution\b/i,
  /\bMSI\b/i,
  /\bfirst-?generation\s+college\b/i,
  /\blow-?income\s+student\b/i,
  /\bPell\s+grant\b/i,
  /\bFAFSA\b/i,
  /\bstudent\s+success\b/i,
  /\bcollege\s+access\b/i,
  /\bcollege\s+completion\b/i,
  /\bstudent\s+support\b/i,
  /\bacademic\s+support\s+for\s+students\b/i,
];

/**
 * Returns true if this grant appears to target students (has student-related keywords).
 * Only applies to grants_gov. When false, the grant should be skipped during sync.
 */
export function isStudentTargetedGrant(s: ScholarshipLike): boolean {
  const source = (s.source ?? "").toLowerCase();
  if (source !== "grants_gov") return true; // only filter grants_gov by this

  const text = [(s.title ?? ""), (s.description ?? "")].join(" ").trim();
  if (!text) return false;

  return STUDENT_TARGET_PATTERNS.some((re) => re.test(text));
}

/**
 * Returns true if this grant is clearly aimed at non-students (e.g. world leaders,
 * senior professionals, faculty development, principal investigators).
 * Only applies to grants_gov source. When true, the grant should be skipped during sync.
 */
export function isNonStudentTargetedGrant(s: ScholarshipLike): boolean {
  const source = (s.source ?? "").toLowerCase();
  if (source !== "grants_gov") return false;

  const text = [(s.title ?? ""), (s.description ?? "")].join(" ").trim();
  if (!text) return false;

  return NON_STUDENT_TARGET_PATTERNS.some((re) => re.test(text));
}
