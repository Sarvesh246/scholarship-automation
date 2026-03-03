import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { syncFromScholarshipOwl, syncScholarshipsFromUrl, syncFromGrantsGov } from "@/lib/syncScholarships";
import { deleteExpiredScholarships, deleteJunkScholarships } from "@/lib/scholarshipDeadline";
import { logSync, logError } from "@/lib/adminLog";
import { invalidateListCache } from "@/lib/scholarshipCache";

export const dynamic = "force-dynamic";

const SCHOLARSHIP_OWL_API_KEY = process.env.SCHOLARSHIP_OWL_API_KEY;
const SCHOLARSHIP_API_URL = process.env.SCHOLARSHIP_API_URL;
const SCHOLARSHIP_API_KEY = process.env.SCHOLARSHIP_API_KEY;

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
  const grantsPromise = syncFromGrantsGov(300).then((r) => ({ ok: true, ...r })).catch((err: unknown) => ({ ok: false, err }));

  const [owlRes, urlRes, grantsRes] = await Promise.all([owlPromise, urlPromise, grantsPromise]);

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
