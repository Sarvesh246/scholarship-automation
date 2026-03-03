import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { deleteExpiredScholarships, deleteJunkScholarships } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/cleanup-expired
 * Admin-only: delete all scholarships with deadline before today from Firestore.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const [expiredDeleted, junkDeleted] = await Promise.all([
      deleteExpiredScholarships(),
      deleteJunkScholarships(),
    ]);
    return NextResponse.json({ ok: true, expiredDeleted, junkDeleted, deleted: expiredDeleted + junkDeleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    console.error("[admin/cleanup-expired]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
