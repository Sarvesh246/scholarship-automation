# Firestore Read Optimization

This document summarizes the data-access refactor to minimize Firestore reads while keeping UX unchanged.

---

## 1. Inventory of Firestore Read Paths

### Public browsing (now via gateway only)

| Path | Where | Reads | Notes |
|------|--------|-------|--------|
| **GET /api/scholarships** | Server (API route) | 1 query, up to `limit*3` docs per request | Paginated list; cached by (limit, cursor, q). |
| **GET /api/scholarships/[id]** | Server (API route) | 1 doc per request | Single scholarship; cached by id. |

Client **no longer** reads Firestore directly for browse/search. All list and detail traffic goes through these APIs and benefits from server-side cache.

### Client-side reads (still direct Firestore)

| Path | File | When | Reads |
|------|------|------|--------|
| **getScholarshipsForAdmin()** | `lib/scholarshipStorage.ts` | Admin scholarships/bulk pages only | 1 full collection read per load |
| **getDoc(users/{uid})** | `lib/profileStorage.ts` | User profile load | 1 doc |
| **getDocs(applications)** | `lib/applicationStorage.ts` | User applications list | 1 collection read (user-scoped) |
| **getDoc(applications/{id})** | `lib/applicationStorage.ts` | Single application | 1 doc |
| **getDocs(essays)** | `lib/essayStorage.ts` | User essays list | 1 collection read (user-scoped) |
| **getDoc(essays/{id})** | `lib/essayStorage.ts` | Single essay | 1 doc |

These are user-specific or admin-only; they are not used for public scholarship browsing.

### Ingestion / background

| Path | Where | Reads | Notes |
|------|--------|-------|--------|
| **POST /api/admin/scrape** | `app/api/admin/scrape/route.ts` | **0** | Merge-only writes; no get-before-set. |
| **POST /api/admin/sync** | `app/api/admin/sync/route.ts` | Via sync libs only | Sync libs write by ID; cleanup may do reads (deleteExpired, deleteJunk). |
| **syncScholarships** (Owl, URL, Grants.gov) | `lib/syncScholarships.ts` | Depends on impl | Should use upserts by stable ID; no “check exists” per item. |

Scrape route no longer performs a read per scholarship. Sync runs only when admin triggers it or via cron, not on normal page loads.

---

## 2. Refactors Applied (and Why Each Reduces Reads)

| Refactor | What changed | Why it reduces reads |
|----------|----------------|----------------------|
| **Gateway for browse** | Client calls `GET /api/scholarships` and `GET /api/scholarships/[id]` instead of Firestore. | All public list/detail reads happen once on the server and can be cached; no repeated client reads per user/navigation. |
| **Server-side cache** | In-memory TTL cache (e.g. 5 min) for list (keyed by limit, cursor, q) and detail (keyed by id). | Repeated refreshes and navigations reuse cached responses; no Firestore reads for cache hits. |
| **Pagination** | List API returns a fixed max (e.g. 20) per request with cursor-based “next”. | Never loads full collection; each request reads only a small window (e.g. limit*3 docs before filtering). |
| **No client Firestore for browse** | `getScholarships()` / `getScholarship(id)` use `scholarshipApi` (fetch to gateway) in the browser. | Eliminates all client-side Firestore reads for scholarship list and detail on public pages. |
| **Scrape: merge-only writes** | Scrape route uses `batch.set(..., { merge: true })` only; no `ref.get()` per doc. | Zero reads during scrape; idempotent writes keyed by stable ID. |
| **Cache invalidation on ingest** | After scrape/sync (and cleanup), call `invalidateListCache()`. | Next browse gets fresh data from Firestore once, then cached again; avoids stale list without extra reads during ingest. |
| **Dev read logging** | `logFirestoreRead(source, count, detail)` in gateway and admin client path. | When `NEXT_PUBLIC_LOG_FIRESTORE_READS=1`, dev can verify where reads occur and that cache hits avoid them. |
| **Firestore Emulator for dev** | Client: `NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true`; Server: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. | Development uses emulator; prod quota is not used during local testing. |

---

## 3. Behavior Unchanged for Users

- **Pages**: Same public pages (home, browse, search, filters, scholarship detail).
- **Filters / search**: Handled by the same query params and in-memory filtering where applicable; UX unchanged.
- **Pagination**: “Load more” / infinite scroll still works; data is now fetched in pages from the gateway.
- **Detail view**: Same scholarship detail page; data comes from gateway (cached) instead of client Firestore.

---

## 4. Dev-Only Read Logging

- **Enable**: Set `NEXT_PUBLIC_LOG_FIRESTORE_READS=1` (or `true`) in `.env.local` and run in development.
- **Where it logs**:
  - **GET /api/scholarships**: after each Firestore list query (server).
  - **GET /api/scholarships/[id]**: after each Firestore get (server).
  - **getScholarshipsForAdmin**: after full collection read (client, admin only).
- **What you see**: Console lines like `[Firestore read] GET /api/scholarships: 60 docs (limit=20)` so you can confirm cache hits (no log) vs cache misses (one log per request).

---

## 5. Local Development Without Burning Prod Quota

- **Client**: In `.env.local` set `NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true`. Start Firestore emulator: `firebase emulators:start --only firestore`.
- **Server**: Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (or your emulator host) before starting the Next.js server. The Admin SDK will use the emulator automatically.
- **Result**: All Firestore traffic in dev goes to the emulator; production quota is not used.

---

## 6. React Strict Mode and double fetch

In development, React Strict Mode may double-invoke effects, so you might see two list or detail requests on first load. That is expected and does not indicate a bug. Each logical “page load” still performs at most one list and one detail fetch per effect run; cache and gateway ensure repeated navigations or refreshes hit cache and do not add Firestore reads.

---

## 7. Acceptance Checklist

- [x] Homepage and browsing for 5 minutes stay within a small number of reads (gateway + cache + pagination).
- [x] Refreshing and re-navigating hits cache when within TTL; no Firestore read for cached keys.
- [x] No background process runs on normal page loads; sync/scrape only when explicitly triggered or scheduled.
- [x] UX unchanged: same pages, filters, search, and detail behavior.
