/**
 * Detect federal/institutional grants that are not student scholarships.
 * Used to hide them from the main list and to skip adding them during Grants.gov sync.
 * These are typically BAAs, research grants, institutional funding, etc.
 */
type ScholarshipLike = { title?: string; sponsor?: string; source?: string };

/** Maximum prize amount (in dollars) to allow. Scholarships over this are excluded from sync and from the list. */
export const MAX_PRIZE_AMOUNT = 150_000;

/** Returns true if the scholarship's amount exceeds the allowed maximum (e.g. institutional grants). */
export function isOverMaxPrize(s: { amount?: number }): boolean {
  return (s.amount ?? 0) > MAX_PRIZE_AMOUNT;
}

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
