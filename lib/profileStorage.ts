import type { Profile } from "@/types";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const defaultProfile: Profile = {
  academics: {},
  activities: [],
  awards: [],
  financial: {}
};

export async function getProfile(): Promise<Profile> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return defaultProfile;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return defaultProfile;
    const data = snap.data() as Record<string, unknown>;
    const loc = (data.location ?? {}) as Record<string, unknown>;
    const locState = (loc?.state ?? loc?.state_code ?? loc?.stateCode) as string | undefined;
    const location = (data.location && typeof data.location === "object")
      ? { ...(data.location as Record<string, unknown>), state: (data.location as Record<string, unknown>).state ?? locState }
      : locState ? { state: locState, country: loc?.country, city: loc?.city } : undefined;
    return {
      academics: (data.academics ?? defaultProfile.academics) as Profile["academics"],
      activities: Array.isArray(data.activities) ? data.activities : defaultProfile.activities,
      awards: Array.isArray(data.awards) ? data.awards : defaultProfile.awards,
      demographics: data.demographics as Profile["demographics"],
      financial: (data.financial ?? defaultProfile.financial) as Profile["financial"],
      onboardingComplete: data.onboardingComplete === true,
      location: location as Profile["location"],
      educationLevel: (data.educationLevel ?? data.education_level) as Profile["educationLevel"],
      schoolName: data.schoolName as string | undefined,
      intendedMajors: Array.isArray(data.intendedMajors) ? data.intendedMajors : (Array.isArray(data.intended_majors) ? data.intended_majors : undefined),
      majorsFreeText: (data.majorsFreeText ?? data.majors_free_text) as string | undefined,
      timeBudgetPreference: (data.timeBudgetPreference ?? data.time_budget_preference) as Profile["timeBudgetPreference"],
      essayPreference: data.essayPreference as boolean | undefined,
      needBasedInterest: data.needBasedInterest as boolean | undefined,
      optionalEligibility: data.optionalEligibility as Profile["optionalEligibility"],
    };
  } catch {
    return defaultProfile;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) {
    throw new Error("Not signed in or database unavailable. Please sign in again.");
  }
  /** Firestore does not allow undefined; strip it from nested objects. */
  function stripUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(stripUndefined) as T;
    if (typeof obj === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = stripUndefined(v);
      }
      return out as T;
    }
    return obj;
  }
  const payload = stripUndefined({
    academics: profile.academics ?? {},
    activities: profile.activities ?? [],
    awards: profile.awards ?? [],
    demographics: profile.demographics ?? {},
    financial: profile.financial ?? {},
    onboardingComplete: profile.onboardingComplete === true,
    location: profile.location ?? undefined,
    educationLevel: profile.educationLevel,
    schoolName: profile.schoolName,
    intendedMajors: profile.intendedMajors,
    majorsFreeText: profile.majorsFreeText,
    timeBudgetPreference: profile.timeBudgetPreference,
    essayPreference: profile.essayPreference,
    needBasedInterest: profile.needBasedInterest,
    optionalEligibility: profile.optionalEligibility ?? undefined,
  });
  try {
    await setDoc(doc(db, "users", uid), payload, { merge: true });
  } catch (e) {
    throw e;
  }
}
