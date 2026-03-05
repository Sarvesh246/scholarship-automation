import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { syncFromScholarshipOwl, syncScholarshipsFromUrl, syncFromGrantsGov, syncFromRssFeeds, syncFromNihReporter } from "@/lib/syncScholarships";
import { deleteExpiredScholarships, deleteJunkScholarships } from "@/lib/scholarshipDeadline";
import { logSync, logError } from "@/lib/adminLog";
import { invalidateListCache } from "@/lib/scholarshipCache";

export const dynamic = "force-dynamic";

const SCHOLARSHIP_OWL_API_KEY = process.env.SCHOLARSHIP_OWL_API_KEY;
const SCHOLARSHIP_API_URL = process.env.SCHOLARSHIP_API_URL;
const SCHOLARSHIP_API_KEY = process.env.SCHOLARSHIP_API_KEY;
/** Comma-separated RSS/Atom feed URLs for scholarship listings. */
const SCHOLARSHIP_RSS_FEEDS = process.env.SCHOLARSHIP_RSS_FEEDS;
const NIH_REPORTER_ENABLED = process.env.NIH_REPORTER_ENABLED === "true" || process.env.NIH_REPORTER_ENABLED === "1";

/**
 * POST /api/admin/sync
 * Admin-only: run scholarship sync (Owl + optional URL). Same logic as cron, no CRON_SECRET.
 */
export async function POST(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const results: Record<string, unknown> = {};

  const owlPromise = SCHOLARSHIP_OWL_API_KEY
    ? syncFromScholarshipOwl().then((r) => ({ ok: true, ...r })).catch((err: unknown) => ({ ok: false, err }))
    : Promise.resolve({ ok: "skipped" as const, skipped: "SCHOLARSHIP_OWL_API_KEY not set" });
  const urlPromise = SCHOLARSHIP_API_URL
    ? syncScholarshipsFromUrl(SCHOLARSHIP_API_URL, SCHOLARSHIP_API_KEY).then((r) => ({ ok: true, ...r })).catch((err: unknown) => ({ ok: false, err }))
    : Promise.resolve({ ok: "skipped" as const, skipped: "SCHOLARSHIP_API_URL not set" });
  const grantsPromise = syncFromGrantsGov(500).then((r) => ({ ok: true, ...r })).catch((err: unknown) => ({ ok: false, err }));

  const rssFeedUrls = SCHOLARSHIP_RSS_FEEDS
    ? SCHOLARSHIP_RSS_FEEDS.split(",").map((u) => u.trim()).filter(Boolean)
    : [];
  const rssPromise = rssFeedUrls.length > 0
    ? syncFromRssFeeds(rssFeedUrls, "rss").then((r) => ({ ok: true as const, ...r })).catch((err: unknown) => ({ ok: false as const, err }))
    : Promise.resolve({ ok: "skipped" as const, skipped: "SCHOLARSHIP_RSS_FEEDS not set" });

  const nihPromise = NIH_REPORTER_ENABLED
    ? syncFromNihReporter().then((r) => ({ ok: true as const, ...r })).catch((err: unknown) => ({ ok: false as const, err }))
    : Promise.resolve({ ok: "skipped" as const, skipped: "NIH_REPORTER_ENABLED not set" });

  const [owlRes, urlRes, grantsRes, rssRes, nihRes] = await Promise.all([owlPromise, urlPromise, grantsPromise, rssPromise, nihPromise]);

  if (owlRes.ok === true && "created" in owlRes) {
    results.owl = { created: owlRes.created, updated: owlRes.updated, errors: owlRes.errors?.length ? owlRes.errors : undefined };
    logSync("owl", owlRes.created, owlRes.updated, owlRes.errors).catch(() => {});
  } else if (owlRes.ok === false && "err" in owlRes) {
    console.error("[admin/sync] Owl", owlRes.err);
    logError("owl", owlRes.err instanceof Error ? owlRes.err.message : "Owl sync failed").catch(() => {});
    results.owlError = owlRes.err instanceof Error ? owlRes.err.message : "Owl sync failed";
  } else results.owl = owlRes;

  if (urlRes.ok === true && "created" in urlRes) {
    results.url = { created: urlRes.created, updated: urlRes.updated, errors: urlRes.errors?.length ? urlRes.errors : undefined };
    logSync("url", urlRes.created, urlRes.updated, urlRes.errors).catch(() => {});
  } else if (urlRes.ok === false && "err" in urlRes) {
    console.error("[admin/sync] URL", urlRes.err);
    logError("url", urlRes.err instanceof Error ? urlRes.err.message : "URL sync failed").catch(() => {});
    results.urlError = urlRes.err instanceof Error ? urlRes.err.message : "URL sync failed";
  } else results.url = urlRes;

  if (rssRes.ok === true && "created" in rssRes) {
    results.rss = { created: rssRes.created, updated: rssRes.updated, errors: rssRes.errors?.length ? rssRes.errors : undefined };
    logSync("rss", rssRes.created, rssRes.updated, rssRes.errors).catch(() => {});
  } else if (rssRes.ok === false && "err" in rssRes) {
    console.error("[admin/sync] RSS", rssRes.err);
    logError("rss", rssRes.err instanceof Error ? rssRes.err.message : "RSS sync failed").catch(() => {});
    results.rssError = rssRes.err instanceof Error ? rssRes.err.message : "RSS sync failed";
  } else results.rss = rssRes;

  if (nihRes.ok === true && "created" in nihRes) {
    results.nihReporter = { created: nihRes.created, updated: nihRes.updated, errors: nihRes.errors?.length ? nihRes.errors : undefined };
    logSync("nihReporter", nihRes.created, nihRes.updated, nihRes.errors).catch(() => {});
  } else if (nihRes.ok === false && "err" in nihRes) {
    console.error("[admin/sync] NIH RePORTER", nihRes.err);
    logError("nihReporter", nihRes.err instanceof Error ? nihRes.err.message : "NIH RePORTER sync failed").catch(() => {});
    results.nihReporterError = nihRes.err instanceof Error ? nihRes.err.message : "NIH RePORTER sync failed";
  } else results.nihReporter = nihRes;

  if (grantsRes.ok === true && "created" in grantsRes) {
    results.grantsGov = { created: grantsRes.created, updated: grantsRes.updated, errors: grantsRes.errors?.length ? grantsRes.errors : undefined };
    logSync("grantsGov", grantsRes.created, grantsRes.updated, grantsRes.errors).catch(() => {});
  } else if ("err" in grantsRes) {
    console.error("[admin/sync] Grants.gov", grantsRes.err);
    logError("grantsGov", grantsRes.err instanceof Error ? grantsRes.err.message : "Grants.gov sync failed").catch(() => {});
    results.grantsGovError = grantsRes.err instanceof Error ? grantsRes.err.message : "Grants.gov sync failed";
  }

  try {
    const [expiredDeleted, junkDeleted] = await Promise.all([
      deleteExpiredScholarships(),
      deleteJunkScholarships(),
    ]);
    results.expiredDeleted = expiredDeleted;
    results.junkDeleted = junkDeleted;
    invalidateListCache();
  } catch (err) {
    console.error("[admin/sync] Cleanup failed", err);
  }

  return NextResponse.json({ ok: true, ...results });
}
