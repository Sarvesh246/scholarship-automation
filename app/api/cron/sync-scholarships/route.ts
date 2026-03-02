import { NextRequest, NextResponse } from "next/server";
import { syncScholarshipsFromUrl } from "@/lib/syncScholarships";

export const dynamic = "force-static";

const CRON_SECRET = process.env.CRON_SECRET;
const SCHOLARSHIP_API_URL = process.env.SCHOLARSHIP_API_URL;
const SCHOLARSHIP_API_KEY = process.env.SCHOLARSHIP_API_KEY;

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

  if (!SCHOLARSHIP_API_URL) {
    return NextResponse.json(
      {
        error: "SCHOLARSHIP_API_URL not set",
        message:
          "Set SCHOLARSHIP_API_URL (and optionally SCHOLARSHIP_API_KEY) in your environment. Use an external scholarship API that returns a JSON array or { data: [] } of items with at least title/name, and optional sponsor, amount, deadline, description, eligibility, categories, prompts."
      },
      { status: 503 }
    );
  }

  try {
    const result = await syncScholarshipsFromUrl(SCHOLARSHIP_API_URL, SCHOLARSHIP_API_KEY);
    return NextResponse.json({
      ok: true,
      created: result.created,
      updated: result.updated,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[cron/sync-scholarships]", err);
    return NextResponse.json({ error: "Sync failed", message }, { status: 500 });
  }
}

/** Allow POST so you can trigger from a dashboard or external cron (e.g. cron-job.org). */
export async function POST(request: NextRequest) {
  return GET(request);
}
