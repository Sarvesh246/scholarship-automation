import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getJunkPreview } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/** GET /api/admin/junk-preview - List scholarships that would be removed by cleanup. */
export async function GET(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const items = await getJunkPreview();
    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error("[GET /api/admin/junk-preview]", err);
    return NextResponse.json({ error: "Failed to get junk preview" }, { status: 500 });
  }
}
