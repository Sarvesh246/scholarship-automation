import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { deleteExpiredScholarships } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cleanup-expired
 * Admin-only: delete all scholarships with deadline before today from Firestore.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const deleted = await deleteExpiredScholarships();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[admin/cleanup-expired]", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
