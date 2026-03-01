import type { Profile } from "@/types";

const STORAGE_KEY = "scholarship-app-profile";

const defaultProfile: Profile = {
  academics: {},
  activities: [],
  awards: [],
  financial: {}
};

function getStored(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw) as Profile;
    return {
      academics: parsed.academics ?? defaultProfile.academics,
      activities: Array.isArray(parsed.activities) ? parsed.activities : defaultProfile.activities,
      awards: Array.isArray(parsed.awards) ? parsed.awards : defaultProfile.awards,
      demographics: parsed.demographics,
      financial: parsed.financial ?? defaultProfile.financial
    };
  } catch {
    return defaultProfile;
  }
}

/**
 * Get the current profile from localStorage.
 */
export function getProfile(): Profile {
  return getStored();
}

/**
 * Save the full profile to localStorage.
 */
export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (_) {}
}
