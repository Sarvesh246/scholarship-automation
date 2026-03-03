/**
 * In-memory TTL cache for scholarship list and detail responses.
 * Reduces Firestore reads on repeated page loads and navigations.
 * Works in serverless (per-instance); use short TTL for consistency.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const listCache = new Map<string, CacheEntry<{ items: unknown[]; nextCursor: string | null }>>();
const detailCache = new Map<string, CacheEntry<unknown>>();

function pruneListCache() {
  const now = Date.now();
  for (const [key, entry] of listCache.entries()) {
    if (entry.expiresAt <= now) listCache.delete(key);
  }
}

function pruneDetailCache() {
  const now = Date.now();
  for (const [key, entry] of detailCache.entries()) {
    if (entry.expiresAt <= now) detailCache.delete(key);
  }
}

/** Cache key for list: limit + cursor + optional q (search). */
export function listCacheKey(params: { limit: number; cursor?: string | null; q?: string }): string {
  const parts = [`limit=${params.limit}`];
  if (params.cursor) parts.push(`cursor=${params.cursor}`);
  if (params.q?.trim()) parts.push(`q=${params.q.trim().toLowerCase().slice(0, 80)}`);
  return parts.join("&");
}

export function getCachedList(
  key: string,
  ttlMs = DEFAULT_TTL_MS
): { items: unknown[]; nextCursor: string | null } | null {
  if (listCache.size > 500) pruneListCache();
  const entry = listCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    listCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedList(
  key: string,
  data: { items: unknown[]; nextCursor: string | null },
  ttlMs = DEFAULT_TTL_MS
): void {
  listCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function getCachedDetail(id: string, ttlMs = DEFAULT_TTL_MS): unknown | null {
  if (detailCache.size > 1000) pruneDetailCache();
  const entry = detailCache.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    detailCache.delete(id);
    return null;
  }
  return entry.data;
}

export function setCachedDetail(id: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  detailCache.set(id, { data, expiresAt: Date.now() + ttlMs });
}

/** Invalidate detail cache when a scholarship is updated (e.g. admin edit). */
export function invalidateDetail(id: string): void {
  detailCache.delete(id);
}

/** Invalidate all list cache (e.g. after bulk sync). */
export function invalidateListCache(): void {
  listCache.clear();
}
