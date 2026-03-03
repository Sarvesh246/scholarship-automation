/**
 * Profile completion for personalization (Greenlight).
 * Weights: Location 15%, Education/grade 10%, Major 10%, Activities 20%, Awards 10%,
 * Need-based 5%, Preferences 10%, Optional eligibility 10%.
 */
import type { Profile } from "@/types";

const WEIGHTS = {
  location: 15,
  educationGrade: 10,
  major: 10,
  activities: 20,
  awards: 10,
  needBased: 5,
  preferences: 10,
  optionalEligibility: 10,
} as const;

export function getProfileCompletion(profile: Profile): { percent: number; breakdown: Record<string, { earned: number; max: number }> } {
  const loc = profile.location ?? {};
  const ac = profile.academics ?? {};
  const hasLocation = !!(loc.country?.trim() || loc.state?.trim());
  const hasEducation = !!(profile.educationLevel || ac.graduationYear?.trim());
  const hasMajor = !!(
    (profile.intendedMajors?.length ?? 0) > 0 ||
    profile.majorsFreeText?.trim() ||
    ac.major?.trim()
  );
  const hasActivities = (profile.activities?.length ?? 0) > 0;
  const hasAwards = (profile.awards?.length ?? 0) > 0;
  const hasNeedBased = profile.needBasedInterest === true;
  const hasPreferences =
    profile.timeBudgetPreference != null || profile.essayPreference != null;
  const opt = profile.optionalEligibility ?? {};
  const hasOptional =
    opt.firstGen === true ||
    opt.militaryFamily === true ||
    opt.disability === true ||
    opt.fosterCare === true ||
    opt.underrepresentedBackground === true ||
    !!(opt.citizenshipResidency?.trim());

  const breakdown = {
    location: { earned: hasLocation ? WEIGHTS.location : 0, max: WEIGHTS.location },
    educationGrade: { earned: hasEducation ? WEIGHTS.educationGrade : 0, max: WEIGHTS.educationGrade },
    major: { earned: hasMajor ? WEIGHTS.major : 0, max: WEIGHTS.major },
    activities: { earned: hasActivities ? WEIGHTS.activities : 0, max: WEIGHTS.activities },
    awards: { earned: hasAwards ? WEIGHTS.awards : 0, max: WEIGHTS.awards },
    needBased: { earned: hasNeedBased ? WEIGHTS.needBased : 0, max: WEIGHTS.needBased },
    preferences: { earned: hasPreferences ? WEIGHTS.preferences : 0, max: WEIGHTS.preferences },
    optionalEligibility: { earned: hasOptional ? WEIGHTS.optionalEligibility : 0, max: WEIGHTS.optionalEligibility },
  };
  const percent = Math.round(
    (Object.values(breakdown).reduce((s, b) => s + b.earned, 0) /
      Object.values(breakdown).reduce((s, b) => s + b.max, 0)) *
      100
  );
  return { percent: Math.min(100, percent), breakdown };
}

/** Count how many more items would unlock the next tier (for "Add X more to unlock"). */
export function getMissingItemsForMatchUnlock(profile: Profile): { count: number; suggestions: string[] } {
  const { breakdown } = getProfileCompletion(profile);
  const suggestions: string[] = [];
  if (breakdown.location.earned === 0) suggestions.push("Add location");
  if (breakdown.educationGrade.earned === 0) suggestions.push("Add education / grad year");
  if (breakdown.major.earned === 0) suggestions.push("Add intended major");
  if (breakdown.activities.earned === 0) suggestions.push("Add activities");
  if (breakdown.awards.earned === 0) suggestions.push("Add awards");
  if (breakdown.preferences.earned === 0) suggestions.push("Set time/essay preferences");
  const count = suggestions.length;
  return { count, suggestions: suggestions.slice(0, 3) };
}
