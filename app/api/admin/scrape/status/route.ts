import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/scrape/status?jobId=xxx
 * Admin-only: return scrape job status and result for audit.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const doc = await db.collection("scrapeJobs").doc(jobId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      jobId: doc.id,
      status: data?.status ?? "pending",
      startedAt: data?.startedAt ?? null,
      completedAt: data?.completedAt ?? null,
      result: data?.result ?? null,
    });
  } catch (err) {
    console.error("[GET /api/admin/scrape/status]", err);
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
