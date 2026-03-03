import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { deleteFilteredGrants } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/** POST /api/admin/cleanup-filtered-grants - Delete institutional grants and scholarships over $150k from Firestore. */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const deleted = await deleteFilteredGrants();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[POST /api/admin/cleanup-filtered-grants]", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
