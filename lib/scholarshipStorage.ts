import type { Scholarship } from "@/types";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

let cache: Scholarship[] | null = null;

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDeadlineValid(deadline: string | undefined): boolean {
  if (!deadline || typeof deadline !== "string") return false;
  const normalized = deadline.replace(/T.*$/, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  return normalized >= getTodayDateString();
}

export async function getScholarships(): Promise<Scholarship[]> {
  if (cache) return cache;
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "scholarships"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Scholarship);
    cache = all.filter((s) => isDeadlineValid(s.deadline));
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
