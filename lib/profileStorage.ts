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
    const data = snap.data();
    return {
      academics: data.academics ?? defaultProfile.academics,
      activities: Array.isArray(data.activities) ? data.activities : defaultProfile.activities,
      awards: Array.isArray(data.awards) ? data.awards : defaultProfile.awards,
      demographics: data.demographics,
      financial: data.financial ?? defaultProfile.financial,
      onboardingComplete: data.onboardingComplete === true,
      location: data.location,
      educationLevel: data.educationLevel,
      schoolName: data.schoolName,
      intendedMajors: Array.isArray(data.intendedMajors) ? data.intendedMajors : undefined,
      majorsFreeText: data.majorsFreeText,
      timeBudgetPreference: data.timeBudgetPreference,
      essayPreference: data.essayPreference,
      needBasedInterest: data.needBasedInterest,
      optionalEligibility: data.optionalEligibility,
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
