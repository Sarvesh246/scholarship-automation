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
      financial: data.financial ?? defaultProfile.financial
    };
  } catch {
    return defaultProfile;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, "users", uid), {
      academics: profile.academics ?? {},
      activities: profile.activities ?? [],
      awards: profile.awards ?? [],
      demographics: profile.demographics ?? {},
      financial: profile.financial ?? {}
    }, { merge: true });
  } catch {
    /* write failed */
  }
}
