import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { syncFromUrlList } from "@/lib/syncScholarships";
import { invalidateListCache } from "@/lib/scholarshipCache";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/import-urls
 * Admin-only: import scholarships from one or more JSON URLs.
 * Body: { urls: string[], sourceLabel?: string }
 * Each URL must return JSON: array of scholarships, or { items/data/scholarships/results }.
 * Items should have: title/name, sponsor/provider/organization, amount, deadline, description, eligibility, applicationUrl, etc.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: { urls?: string[]; sourceLabel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string" && u.startsWith("http")) : [];
  if (urls.length === 0) {
    return NextResponse.json({ error: "urls must be a non-empty array of HTTP(S) URLs" }, { status: 400 });
  }

  const sourceLabel = typeof body.sourceLabel === "string" && body.sourceLabel.trim() ? body.sourceLabel.trim() : "import_url";

  try {
    const result = await syncFromUrlList(urls, sourceLabel);
    invalidateListCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/import-urls]", err);
    return NextResponse.json({ error: "Import failed", detail: message }, { status: 500 });
  }
}
