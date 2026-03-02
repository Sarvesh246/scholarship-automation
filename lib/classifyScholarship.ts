/**
 * Classify scholarships for filtering: government vs private, non-citizen eligibility.
 */
import type { Scholarship } from "@/types";

const GOV_PATTERNS = /\b(gov(ernment)?|federal|state\s|us\s|u\.s\.|department\s+of|agency|va-|doi-|doc-|hhs|nih|nsf|doe|dod|usda|ed\.gov|\.gov)\b/i;
const NON_CITIZEN_PATTERNS = /\b(international|non-?citizen|no\s+citizenship|all\s+nationalit|open\s+to\s+all|daca|undocumented|without\s+regard\s+to\s+citizenship|non-?us\s+citizen|permanent\s+resident|green\s+card|visa\s+holder)\b/i;
const US_ONLY_PATTERNS = /\b(u\.s\.\s+citizen|us\s+citizen|american\s+citizen|citizen\s+of\s+the\s+united\s+states)\b/i;

export function classifyScholarship(s: Scholarship): {
  scholarshipType: "government" | "private";
  nonCitizenEligible: boolean;
} {
  const id = (s.id ?? "").toLowerCase();
  const sponsor = (s.sponsor ?? "").toLowerCase();
  const title = (s.title ?? "").toLowerCase();
  const desc = (s.description ?? "").toLowerCase();
  const eligibility = (s.eligibilityTags ?? []).join(" ").toLowerCase();

  let scholarshipType: "government" | "private" = "private";
  if (s.scholarshipType === "government" || s.scholarshipType === "private") {
    scholarshipType = s.scholarshipType;
  } else if (
    s.source === "grants_gov" ||
    id.startsWith("grants-gov-") ||
    GOV_PATTERNS.test(sponsor) ||
    GOV_PATTERNS.test(title) ||
    GOV_PATTERNS.test(desc)
  ) {
    scholarshipType = "government";
  }

  let nonCitizenEligible = s.nonCitizenEligible ?? false;
  if (s.nonCitizenEligible === true) {
    nonCitizenEligible = true;
  } else if (s.nonCitizenEligible === false) {
    nonCitizenEligible = false;
  } else {
    const text = `${desc} ${eligibility}`;
    if (US_ONLY_PATTERNS.test(text)) {
      nonCitizenEligible = false;
    } else if (NON_CITIZEN_PATTERNS.test(text)) {
      nonCitizenEligible = true;
    }
  }

  return { scholarshipType, nonCitizenEligible };
}

/** Enrich a scholarship with classification fields. Call before writing to Firestore. */
export function enrichWithClassification(s: Scholarship): Scholarship {
  const { scholarshipType, nonCitizenEligible } = classifyScholarship(s);
  return {
    ...s,
    scholarshipType,
    nonCitizenEligible,
  };
}
