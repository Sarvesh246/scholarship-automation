import { NextRequest, NextResponse } from "next/server";
import { applyToScholarship, type ScholarshipOwlApplyAttributes } from "@/lib/scholarshipOwlApi";

export const dynamic = "force-dynamic";

/**
 * POST /api/scholarship-owl/apply
 * Body: { scholarshipId: string, attributes: ScholarshipOwlApplyAttributes }
 * Submits an application to ScholarshipOwl. Requires SCHOLARSHIP_OWL_API_KEY.
 * Attributes must include required fields (name, email, phone) and requirements object keyed by scholarship requirement id.
 */
export async function POST(request: NextRequest) {
  if (!process.env.SCHOLARSHIP_OWL_API_KEY) {
    return NextResponse.json(
      { error: "ScholarshipOwl API key not configured" },
      { status: 503 }
    );
  }

  let body: { scholarshipId?: string; attributes?: ScholarshipOwlApplyAttributes };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { scholarshipId, attributes } = body;
  if (!scholarshipId || typeof scholarshipId !== "string" || !attributes || typeof attributes !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid scholarshipId and attributes" },
      { status: 400 }
    );
  }

  try {
    const result = await applyToScholarship(scholarshipId, attributes);
    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    console.error("[scholarship-owl/apply]", err);
    return NextResponse.json({ error: "Apply failed", message }, { status: 500 });
  }
}
