import { NextRequest, NextResponse } from "next/server";
import { syncScholarshipsFromUrl, syncFromScholarshipOwl, syncFromGrantsGov } from "@/lib/syncScholarships";
import { deleteExpiredScholarships, deleteJunkScholarships } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const SCHOLARSHIP_API_URL = process.env.SCHOLARSHIP_API_URL;
const SCHOLARSHIP_API_KEY = process.env.SCHOLARSHIP_API_KEY;
const SCHOLARSHIP_OWL_API_KEY = process.env.SCHOLARSHIP_OWL_API_KEY;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7) === CRON_SECRET;
  const secret = request.nextUrl.searchParams.get("secret");
  return secret === CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  if (SCHOLARSHIP_OWL_API_KEY) {
    try {
      const owlResult = await syncFromScholarshipOwl();
      results.owl = { created: owlResult.created, updated: owlResult.updated, errors: owlResult.errors };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Owl sync failed";
      console.error("[cron/sync-scholarships] Owl", err);
      results.owlError = message;
    }
  }

  if (SCHOLARSHIP_API_URL) {
    try {
      const urlResult = await syncScholarshipsFromUrl(SCHOLARSHIP_API_URL, SCHOLARSHIP_API_KEY);
      results.url = { created: urlResult.created, updated: urlResult.updated, errors: urlResult.errors };
    } catch (err) {
      const message = err instanceof Error ? err.message : "URL sync failed";
      console.error("[cron/sync-scholarships] URL", err);
      results.urlError = message;
    }
  }

  try {
    const grantsResult = await syncFromGrantsGov(300);
    results.grantsGov = { created: grantsResult.created, updated: grantsResult.updated, errors: grantsResult.errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grants.gov sync failed";
    console.error("[cron/sync-scholarships] Grants.gov", err);
    results.grantsGovError = message;
  }

  try {
    const [expiredDeleted, junkDeleted] = await Promise.all([
      deleteExpiredScholarships(),
      deleteJunkScholarships(),
    ]);
    results.expiredDeleted = expiredDeleted;
    results.junkDeleted = junkDeleted;
  } catch (err) {
    console.error("[cron/sync-scholarships] Cleanup failed", err);
  }

  return NextResponse.json({ ok: true, ...results });
}

/** Allow POST so you can trigger from a dashboard or external cron (e.g. cron-job.org). */
export async function POST(request: NextRequest) {
  return GET(request);
}
