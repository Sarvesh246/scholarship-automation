export type ScholarshipCategory =
  | "STEM"
  | "Arts"
  | "Community"
  | "Leadership"
  | "FinancialNeed";

/** Inventory/source type for filtering and display (beyond aggregators). */
export type SourceType =
  | "aggregator"
  | "institutional_departmental"
  | "professional_association"
  | "corporate_foundation"
  | "municipal"
  | "community_foundation"
  | "research_fellowship"
  | "arts"
  | "civic"
  | "healthcare"
  | "industry_specific"
  | "sports"
  | "faith_based"
  | "local_business"
  | "union"
  | "recurring_pending_update";

export type ApplicationStatus =
  | "not_started"
  | "drafting"
  | "reviewing"
  | "submitted";

export interface Scholarship {
  id: string;
  title: string;
  sponsor: string;
  amount: number;
  deadline: string;
  categoryTags: ScholarshipCategory[];
  eligibilityTags: string[];
  estimatedTime: string;
  description: string;
  prompts: string[];
  /** When synced from external source: scholarship_owl, grants_gov, or scraper id (e.g. bold, collegescholarships, professional_associations). */
  source?: string;
  /** Inventory category for display/filter: institutional, professional association, municipal, etc. */
  sourceType?: SourceType;
  /** If true, show in featured section on Scholarships page. */
  featured?: boolean;
  /** draft = hidden from users, published = visible (default). */
  status?: "draft" | "published";
  /** Government vs private/institutional. Set on sync. */
  scholarshipType?: "government" | "private";
  /** True if non-citizens (international, DACA, undocumented) may qualify. Set on sync. */
  nonCitizenEligible?: boolean;
  /** Curated category for display: merit, need-based, essay, sweepstakes, corporate, academic, local. */
  displayCategory?: "academic" | "merit" | "need_based" | "essay_competition" | "corporate" | "local" | "sweepstakes";
  /** Quality score 0–100 from verification pipeline. Only show if >= min threshold. */
  qualityScore?: number;
  /** approved = shown; needs_review = admin only; hidden = never shown; flagged = scam-like. */
  verificationStatus?: "approved" | "needs_review" | "hidden" | "flagged";
  /** Domain trust score 0–10 from URL/org. */
  domainTrustScore?: number;
  /** Last time quality/verification was run (ISO string or Firestore timestamp). */
  lastVerifiedAt?: string | { _seconds: number } | null;
  /** Optional application or org URL for verification. */
  applicationUrl?: string | null;
  /** Optional contact email (not generic spam domain). */
  contactEmail?: string | null;
  /** True if scholarship requires payment to apply (auto-reject). */
  applicationFeeRequired?: boolean;
  /** Repeatable scholarship: e.g. "1 month", "1 year". meta.next = next start date. */
  recurring?: string | null;
  /** If set, scholarship is expired and no new applications accepted. */
  expiredAt?: string | null;
  /** Next run start date when recurring. */
  nextStart?: string | null;
  owlFields?: {
    id: string;
    name: string;
    type: string;
    options?: Record<string, unknown>;
    eligibilityType?: string | null;
    eligibilityValue?: string | null;
    optional?: boolean;
  }[];
  owlRequirements?: {
    id: string;
    title?: string;
    description?: string;
    optional: boolean;
    requirementType: "text" | "input" | "link" | "file" | "image";
    config?: Record<string, unknown>;
  }[];
  /** Normalized fields for matching; set during sync/validation. */
  normalized?: NormalizedScholarship;
}

/** Normalized scholarship shape for reliable matching. */
export interface NormalizedScholarship {
  title: string;
  orgName: string;
  orgWebsite?: string | null;
  applyUrl?: string | null;
  deadline: string;
  awardMin: number;
  awardMax: number;
  frequency: "one-time" | "yearly" | "monthly" | "unknown";
  statesEligible: string[];
  educationLevelsEligible: string[];
  gradeLevelsEligible: string[];
  majorsEligible: string[];
  fieldsEligible: string[];
  minGPA: number | null;
  tags: string[];
  requirements: string[];
  needBased: boolean | null;
  verifiedStatus: "approved" | "flagged" | "rejected" | "needs_review";
  qualityScore: number;
  lastVerifiedAt: string | null;
  source: string;
  /** Same as Scholarship.sourceType for filtering. */
  sourceType?: SourceType;
  matchable: boolean;
}

export interface Application {
  id: string;
  scholarshipId: string;
  status: ApplicationStatus;
  progress: number;
  nextTask: string;
  docsRequired: string[];
  docsUploaded: string[];
  promptResponses: {
    prompt: string;
    response: string;
  }[];
  /** When applied via ScholarshipOwl: status returned from their API. */
  owlStatus?: "received" | "review" | "accepted" | "rejected";
  /** Last time the user opened this application. Used for "not viewed in a while" notifications. */
  lastViewedAt?: string;
}

export interface Essay {
  id: string;
  title: string;
  tags: string[];
  wordCount: number;
  updatedAt: string;
  content: string;
}

export interface ProfileSectionCompletion {
  academics: number;
  activities: number;
  awards: number;
  demographics: number;
  financial: number;
}

export interface Profile {
  academics: {
    gpa?: string;
    major?: string;
    graduationYear?: string;
    /** GPA scale for matching: "4.0" | "5.0" | "custom". When "custom", gpaScaleCustom is the scale max (e.g. 6, 10, 100). */
    gpaScale?: "4.0" | "5.0" | "custom";
    /** When gpaScale is "custom", the maximum value of the user's scale (e.g. 6 for 0–6 scale). Used to convert to 4.0 for matching. */
    gpaScaleCustom?: number;
  };
  activities: { id: string; name: string; role: string; type?: string; tags?: string[] }[];
  awards: { id: string; name: string; year: string; category?: string; tags?: string[] }[];
  demographics?: Record<string, string>;
  financial?: Record<string, string>;
  /** Set to true when user completes first-time onboarding. */
  onboardingComplete?: boolean;
  /** Location: country, state, city (optional). */
  location?: { country?: string; state?: string; city?: string };
  /** Explicit education level for matching. */
  educationLevel?: "high_school" | "college" | "grad";
  /** School name (optional). */
  schoolName?: string;
  /** Intended major(s) for match boost; free-text fallback in majorsFreeText. */
  intendedMajors?: string[];
  majorsFreeText?: string;
  /** Time budget: how much work per week user wants. */
  timeBudgetPreference?: "low" | "medium" | "high";
  /** Okay with essays. */
  essayPreference?: boolean;
  /** Interested in need-based scholarships (no sensitive details required). */
  needBasedInterest?: boolean;
  /** Optional eligibility (only used for filtering when user opts in). */
  optionalEligibility?: {
    firstGen?: boolean;
    militaryFamily?: boolean;
    disability?: boolean;
    fosterCare?: boolean;
    underrepresentedBackground?: boolean;
    citizenshipResidency?: string;
  };
}

/** User signals derived from profile for matching. */
export interface UserSignals {
  country?: string;
  state?: string;
  city?: string;
  educationLevel?: "high_school" | "college" | "grad";
  graduationYear?: string;
  gradeLevel?: string;
  majors: string[];
  fields: string[];
  gpa: number | null;
  gpaScale: "4.0" | "5.0";
  activityTypes: string[];
  activityTags: string[];
  awardCategories: string[];
  awardTags: string[];
  timeBudgetPreference: "low" | "medium" | "high";
  essayPreference: boolean;
  needBasedInterest: boolean;
  optionalEligibility?: Profile["optionalEligibility"];
}

/** Result of matching one scholarship to the user. */
export interface ScholarshipMatchResult {
  scholarshipId: string;
  eligibilityStatus: "eligible" | "may_not_be_eligible" | "almost_eligible" | "ineligible" | "unknown";
  matchScore: number;
  reasons: string[];
  missingRequirements: string[];
  /** Criteria that failed (for Layer 1 / tooltips). */
  failedCriteria?: string[];
  /** Human-readable reason for "Almost Eligible" e.g. "Requires 3.5 GPA (you have 3.4)". */
  almostEligibleReason?: string;
}

/** User-submitted scholarship for moderation queue. */
export interface ScholarshipSubmission {
  id: string;
  title: string;
  sponsor: string;
  amount?: number;
  deadline?: string;
  description?: string;
  applicationUrl?: string | null;
  /** Submitter user id. */
  submittedBy: string;
  submittedByEmail?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string | { _seconds: number };
  reviewedAt?: string | { _seconds: number };
  /** Set when approved: id of created scholarship. */
  scholarshipId?: string | null;
  /** Optional reason when rejected. */
  rejectedReason?: string | null;
}

