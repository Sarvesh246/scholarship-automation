import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getFilteredGrantsPreview } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/** GET /api/admin/filtered-grants-preview - List scholarships that would be removed by "Clean up filtered grants". */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const items = await getFilteredGrantsPreview();
    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error("[GET /api/admin/filtered-grants-preview]", err);
    return NextResponse.json({ error: "Failed to get preview" }, { status: 500 });
  }
}
