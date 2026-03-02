import type { Profile } from "@/types";
import type { Scholarship } from "@/types";

export type EligibilityResult = {
  eligible: boolean;
  message?: string;
  failedFields?: string[];
};

/**
 * Map profile + user to a flat record of field id -> value for Owl eligibility/apply.
 * Uses demographics, academics, and known Owl field ids (state, schoolLevel, GPA, etc.).
 */
export function getProfileFieldValues(
  profile: Profile,
  user: { email?: string | null; displayName?: string | null } | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (user?.email) out.email = user.email;
  if (user?.displayName) out.name = user.displayName;
  const d = profile.demographics ?? {};
  if (d.state) out.state = d.state;
  if (d.phone) out.phone = d.phone;
  if (d.dateOfBirth) out.dateOfBirth = d.dateOfBirth;
  if (d.gender) out.gender = d.gender;
  if (d.country) out.country = d.country;
  if (d.city) out.city = d.city;
  if (d.zip) out.zip = d.zip;
  const a = profile.academics ?? {};
  if (a.gpa) out.GPA = a.gpa;
  if (a.major) out.fieldOfStudy = a.major;
  if (a.graduationYear) out.collegeGraduationDate = a.graduationYear;
  return out;
}

/**
 * Simple eligibility check: if a scholarship field has eligibilityType/eligibilityValue,
 * we require the user's profile to have a value for that field. We don't fully evaluate
 * eq/neq/in (would need Owl's exact rules); we report whether required fields are present.
 */
export function checkEligibility(
  scholarship: Scholarship,
  profileValues: Record<string, string>
): EligibilityResult {
  const owlFields = scholarship.owlFields ?? [];
  const requiredWithEligibility = owlFields.filter(
    (f) => !f.optional && (f.eligibilityType != null || f.eligibilityValue != null)
  );
  const failedFields: string[] = [];
  for (const f of requiredWithEligibility) {
    const value = profileValues[f.id];
    if (value == null || String(value).trim() === "") {
      failedFields.push(f.name);
    }
  }
  if (failedFields.length > 0) {
    return {
      eligible: false,
      message: `Complete your profile: ${failedFields.join(", ")} are required for eligibility.`,
      failedFields
    };
  }
  const anyEligibility = owlFields.some((f) => f.eligibilityType != null || f.eligibilityValue != null);
  return {
    eligible: true,
    message: anyEligibility
      ? "You have the required profile fields. Scholarship provider will confirm eligibility."
      : undefined
  };
}
