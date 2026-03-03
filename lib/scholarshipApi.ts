/**
 * Client-side API for scholarships. Uses gateway routes (GET /api/scholarships)
 * instead of direct Firestore to minimize reads. All list/detail go through server cache.
 */
import type { Scholarship } from "@/types";

const API = "/api/scholarships";

export interface ScholarshipsPageResponse {
  items: Scholarship[];
  nextCursor: string | null;
}

/** Fetch one page of scholarships (max 100). */
export async function fetchScholarshipsPage(params: {
  limit?: number;
  cursor?: string | null;
  q?: string;
}): Promise<ScholarshipsPageResponse> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 100));
  const search = new URLSearchParams();
  search.set("limit", String(limit));
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const res = await fetch(`${API}?${search.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch scholarships");
  const data = await res.json();
  return { items: data.items ?? [], nextCursor: data.nextCursor ?? null };
}

/** Fetch first page only (for dashboard, deadlines, etc.). */
export async function fetchScholarshipsFirstPage(limit = 100): Promise<Scholarship[]> {
  const { items } = await fetchScholarshipsPage({ limit });
  return items;
}

/** Fetch a single scholarship by ID. */
export async function fetchScholarshipById(id: string): Promise<Scholarship | null> {
  if (!id) return null;
  const res = await fetch(`/api/scholarships/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data as Scholarship;
}
