# Scholarship sources and why 533 → 164

## Why the public scholarship page shows fewer than total in admin

After adding new sync/scrape sources, the **number on the scholarship list** can be much lower than “X created, Y updated” because the list is filtered. Admin **Total scholarships** counts every document in the `scholarships` collection. The **public scholarship page** only shows items that pass all of these:

1. **Deadline** – `deadline >= today` (API filters out past deadlines).
2. **Not draft** – `status !== "draft"`.
3. **Main feed** – `fundingType` is not institutional_grant, research_grant, or government_program (so only scholarship/fellowship/legacy).
4. **Student-targeted** – For `grants_gov` source, grants are filtered by institutional/student targeting; others are not filtered by this.
5. **Not junk** – Excludes Bold.org category placeholder pages (e.g. "By State", "By Major").
6. **Quality / verification** – Either:
   - `verificationStatus === "approved"` (qualityScore ≥ 70), or  
   - `verificationStatus === "needs_review"` (50–69), or  
   - Legacy: no status and no qualityScore (treated as showable).

So the drop (533 → 164) is from: **past deadlines**, **draft**, **funding type**, **quality & verification**, and **junk**. Letting **needs_review** appear in the feed increases how many of the 533 show.

**If new sources didn’t add many items to the list:** (1) Run **Run full validation** in Admin (Sync & scrape) so quality scores and `fundingType` are recomputed; (2) Check that scraped items have a **deadline ≥ today**; (3) Items classified as institutional/gov or with quality &lt; 50 are hidden. Increasing scraper **maxPages** or adding more sources will grow the raw count; validation and the filters above determine how many appear on the public page.

---

## Current sources (sync + scrape)

### Sync (run from Admin **Sync** or cron)

| Source | Env / config | Description |
|--------|---------------|-------------|
| **ScholarshipOwl** | `SCHOLARSHIP_OWL_API_KEY` | Business API; paginated list + detail. |
| **Custom URL** | `SCHOLARSHIP_API_URL`, optional `SCHOLARSHIP_API_KEY` | Single URL returning JSON array or `{ data/scholarships/results }`. |
| **Grants.gov** | None | Free API. Fetches by keywords: **education**, **scholarship**, **fellowship** (merged, deduped). Limit 500+ opportunities. |
| **RSS/Atom feeds** | `SCHOLARSHIP_RSS_FEEDS` (comma-separated URLs) | Parses feed entries into scholarship items; runs through quality pipeline. |

### Scrape (run from Admin **Scrape**)

| Scraper | Default pages | Notes |
|---------|----------------|--------|
| CollegeScholarships.org | 16 | List + detail pages. |
| Bold.org | 12 | Category listing pages. |
| Scholarships.com | 10 | Directory pages. |
| Scholarships360 | 12 | Listing pages. |
| CollegeData | 10 | College-specific lists. |
| University department pages | 16 | Seed list of department URLs. |
| Professional associations | 16 | Association scholarship pages. |
| Municipal / city | 16 | City/county scholarship pages. |
| Community foundations | 16 | Foundation lists. |
| Corporate foundations | 16 | Corporate program lists. |
| **State financial aid** | 10 | State higher-ed / financial aid agency pages (GA, NY, FL, IL, CA, TX, OH, PA, MA, NJ, NC, MI, VA, WA, AZ, CO, IN, MO, MD, WI). Tag: civic. |
| **Wikipedia list** | 1 | List of North American scholarships (list + table links). Tag: aggregator. |

Increasing **maxPages** per scraper in Admin (or in code) pulls more scholarships per run.

### Import from URLs (new)

**POST /api/admin/import-urls** (admin auth required)

- Body: `{ "urls": ["https://...", "https://..."], "sourceLabel": "optional_name" }`.
- Each URL must return JSON: **array** of items, or object with **items** / **data** / **scholarships** / **results** array.
- Each item should have: `title` or `name`, `sponsor` or `provider` or `organization`, `amount`, `deadline`, `description`, `eligibility`, `applicationUrl`, etc.
- Items are mapped with `mapExternalToScholarship`, run through quality verification, and upserted into Firestore with `source: sourceLabel` (default `"import_url"`).

Use this to add any third-party API or JSON export (e.g. ScholarshipAPI.com, Apify output, custom CSV→JSON endpoint). Optional: NIH RePORTER API for research/fellowships can be added behind an env key if the API is reachable from your deployment (may 403 in some environments).

---

## How to get thousands of quality scholarships

1. **Run Sync often** – Cron or manual: Owl + URL + Grants.gov + RSS (if `SCHOLARSHIP_RSS_FEEDS` is set). Grants.gov is free and no key required.
2. **Run Scrape with higher depth** – Use **Run scrape** in Admin; enable State financial aid and Wikipedia list; optionally increase **maxPages**.
3. **Add more URLs** – Set `SCHOLARSHIP_API_URL` to any API that returns a scholarship array (and optional `SCHOLARSHIP_API_KEY`).
4. **Use Import from URLs** – Call **POST /api/admin/import-urls** with `urls` from Apify, ScholarshipAPI, or your own JSON endpoints. Repeat for multiple feeds.
5. **Allow needs_review in feed** – Already enabled: scholarships with qualityScore 50–69 and `verificationStatus === "needs_review"` now show on the public page (with optional “Needs review” badge in UI).
6. **Validate and clean** – Run **Validate scholarships** in Admin to recompute qualityScore/verificationStatus and normalize; fix or hide low-quality items.

---

## Adding a new scraper

1. Add a file under `lib/scrapers/` (e.g. `newsource.ts`) that exports `scrapeNewSource(maxPages?: number): Promise<ScrapedScholarship[]>`.
2. In `lib/scrapers/index.ts`: import it, add a `ScraperId`, and register in `SCRAPERS`.
3. In `lib/scrapers/sourceRegistry.ts`: add the scraper id to `SCRAPER_SOURCE_TYPES` if you need a default `sourceType`.
4. Use shared helpers: `lib/scrapers/shared.ts` (headers, rate limit), `lib/scrapers/parseAmount.ts`, and the existing `ScrapedScholarship` type.

---

## File reference

- **API list/detail**: `app/api/scholarships/route.ts`, `app/api/scholarships/[id]/route.ts` – filters (quality, main feed, deadline).
- **Client filter**: `lib/scholarshipStorage.ts` – same rules for getScholarships/getScholarship.
- **Quality**: `lib/scholarshipQuality.ts` – MIN_SCORE_APPROVED (70), needs_review (50–69), runQualityVerification.
- **Sync**: `lib/syncScholarships.ts` – syncFromScholarshipOwl, syncScholarshipsFromUrl, syncFromGrantsGov, syncFromRssFeeds, syncFromUrlList, writeExternalItemsToFirestore.
- **RSS**: `lib/rssFeedSync.ts` – parseRssFeedsToItems (used by syncFromRssFeeds).
- **Grants.gov**: `lib/grantsGovApi.ts` – listEducationGrants, listGrantsByKeyword.
- **Scrapers**: `lib/scrapers/index.ts`, `lib/scrapers/*.ts`.
- **Admin sync**: `app/api/admin/sync/route.ts` – runs Owl + URL + Grants.gov + RSS (if SCHOLARSHIP_RSS_FEEDS set) + cleanup.
- **Cron**: `app/api/cron/sync-scholarships/route.ts` – same sync (requires CRON_SECRET).
