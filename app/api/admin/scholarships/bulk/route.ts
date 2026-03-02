import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { mapExternalToScholarship, type ExternalScholarshipItem } from "@/lib/syncScholarships";
import { enrichWithClassification } from "@/lib/classifyScholarship";
import { isDeadlineValid } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scholarships/bulk
 * Admin-only: bulk import scholarships (e.g. from scraper output).
 * Only imports scholarships with deadline >= today.
 * Body: { scholarships: ExternalScholarshipItem[] }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const items = Array.isArray(body.scholarships) ? body.scholarships : body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Body must be { scholarships: [...] } with at least one item" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const col = db.collection("scholarships");
    let created = 0;
    let updated = 0;

    for (const item of items as ExternalScholarshipItem[]) {
      if (!isDeadlineValid(item.deadline)) continue;
      const scholarship = enrichWithClassification(mapExternalToScholarship(item));
      const id = typeof item.id === "string" && item.id ? item.id : scholarship.id;
      const ref = col.doc(id);
      const existing = await ref.get();
      const { id: _id, ...data } = scholarship;
      if (existing.exists) {
        await ref.update(data);
        updated++;
      } else {
        await ref.set({ id, ...data });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (err) {
    console.error("[POST /api/admin/scholarships/bulk]", err);
    return NextResponse.json(
      { error: "Bulk import failed" },
      { status: 500 }
    );
  }
}
