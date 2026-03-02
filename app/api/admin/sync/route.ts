import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { syncFromScholarshipOwl, syncScholarshipsFromUrl, syncFromGrantsGov } from "@/lib/syncScholarships";
import { deleteExpiredScholarships } from "@/lib/scholarshipDeadline";

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

  if (owlRes.ok === true && "created" in owlRes) results.owl = { created: owlRes.created, updated: owlRes.updated, errors: owlRes.errors?.length ? owlRes.errors : undefined };
  else if (owlRes.ok === false && "err" in owlRes) { console.error("[admin/sync] Owl", owlRes.err); results.owlError = owlRes.err instanceof Error ? owlRes.err.message : "Owl sync failed"; }
  else results.owl = owlRes;

  if (urlRes.ok === true && "created" in urlRes) results.url = { created: urlRes.created, updated: urlRes.updated, errors: urlRes.errors?.length ? urlRes.errors : undefined };
  else if (urlRes.ok === false && "err" in urlRes) { console.error("[admin/sync] URL", urlRes.err); results.urlError = urlRes.err instanceof Error ? urlRes.err.message : "URL sync failed"; }
  else results.url = urlRes;

  if (grantsRes.ok === true && "created" in grantsRes) results.grantsGov = { created: grantsRes.created, updated: grantsRes.updated, errors: grantsRes.errors?.length ? grantsRes.errors : undefined };
  else if ("err" in grantsRes) { console.error("[admin/sync] Grants.gov", grantsRes.err); results.grantsGovError = grantsRes.err instanceof Error ? grantsRes.err.message : "Grants.gov sync failed"; }

  try {
    results.expiredDeleted = await deleteExpiredScholarships();
  } catch (err) {
    console.error("[admin/sync] Cleanup expired failed", err);
  }

  return NextResponse.json({ ok: true, ...results });
}
