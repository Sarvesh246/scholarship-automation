import type { Scholarship } from "@/types";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

let cache: Scholarship[] | null = null;

export async function getScholarships(): Promise<Scholarship[]> {
  if (cache) return cache;
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "scholarships"));
    cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
    return cache;
  } catch {
    return [];
  }
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  const all = await getScholarships();
  return all.find((s) => s.id === id) ?? null;
}

export function invalidateScholarshipCache() {
  cache = null;
}
