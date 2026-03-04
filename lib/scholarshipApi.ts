/**
 * Client-side API for scholarships. Uses gateway routes (GET /api/scholarships)
 * instead of direct Firestore to minimize reads. All list/detail go through server cache.
 * When the API fails (e.g. Firestore quota), we fall back to localStorage cache so
 * scholarships still load from the last successful fetch.
 */
import type { Scholarship } from "@/types";

const API = "/api/scholarships";

const LIST_CACHE_KEY = "scholarship_list_fallback";
const DETAIL_CACHE_PREFIX = "scholarship_detail_";
const FALLBACK_TTL_MS = 24 * 60 * 60 * 1000; // 24h – only used when API fails

function getFallbackList(): Scholarship[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LIST_CACHE_KEY);
    if (!raw) return null;
    const { items, savedAt } = JSON.parse(raw) as { items: Scholarship[]; savedAt: number };
    if (!Array.isArray(items) || Date.now() - savedAt > FALLBACK_TTL_MS) return null;
    return items;
  } catch {
    return null;
  }
}

function setFallbackList(items: Scholarship[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ items, savedAt: Date.now() }));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

function getFallbackDetail(id: string): Scholarship | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + id);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw) as { data: Scholarship; savedAt: number };
    if (!data || Date.now() - savedAt > FALLBACK_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setFallbackDetail(id: string, data: Scholarship): void {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(DETAIL_CACHE_PREFIX + id, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // ignore
  }
}

export interface ScholarshipsPageResponse {
  items: Scholarship[];
  nextCursor: string | null;
}

/** Fetch one page of scholarships (max 100). On API failure, returns fallback list if available. */
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
  try {
    const res = await fetch(`${API}?${search.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const items = (data.items ?? []) as Scholarship[];
      const nextCursor = data.nextCursor ?? null;
      if (!params.cursor && !params.q?.trim()) setFallbackList(items);
      return { items, nextCursor };
    }
    if (res.status >= 500) {
      const fallback = getFallbackList();
      if (fallback) return { items: fallback, nextCursor: null };
    }
    throw new Error(data.error ?? "Failed to fetch scholarships");
  } catch (e) {
    const fallback = getFallbackList();
    if (fallback) return { items: fallback, nextCursor: null };
    throw e;
  }
}

/** Fetch first page only (for dashboard, deadlines, etc.). */
export async function fetchScholarshipsFirstPage(limit = 100): Promise<Scholarship[]> {
  const { items } = await fetchScholarshipsPage({ limit });
  return items;
}

/** Fetch a single scholarship by ID. On API failure, returns fallback from localStorage if available. */
export async function fetchScholarshipById(id: string): Promise<Scholarship | null> {
  if (!id) return null;
  try {
    const res = await fetch(`/api/scholarships/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (res.ok) {
      const data = (await res.json()) as Scholarship;
      setFallbackDetail(id, data);
      return data;
    }
    if (res.status >= 500) {
      const fallback = getFallbackDetail(id);
      if (fallback) return fallback;
    }
    return null;
  } catch {
    const fallback = getFallbackDetail(id);
    if (fallback) return fallback;
    return null;
  }
}
