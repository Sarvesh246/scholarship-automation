import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { enrichWithClassification } from "@/lib/classifyScholarship";

export const dynamic = "force-dynamic";

/** POST /api/admin/bulk-edit - Update multiple scholarships. */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;
    const updates = body.updates as Record<string, unknown> | undefined;

    if (!Array.isArray(ids) || ids.length === 0 || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Body must be { ids: string[], updates: { field: value } }" },
        { status: 400 }
      );
    }

    const allowed = ["categoryTags", "deadline", "sponsor", "featured", "status"];
    const filtered: Record<string, unknown> = {};
    for (const k of Object.keys(updates)) {
      if (allowed.includes(k)) filtered[k] = updates[k];
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const col = db.collection("scholarships");
    let updated = 0;

    for (const id of ids) {
      const ref = col.doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const data = doc.data() ?? {};
        const merged = { ...data, ...filtered };
        if (filtered.categoryTags || filtered.sponsor) {
          const enriched = enrichWithClassification(merged as Parameters<typeof enrichWithClassification>[0]);
          Object.assign(merged, { scholarshipType: enriched.scholarshipType, nonCitizenEligible: enriched.nonCitizenEligible });
        }
        const { id: _id, ...toWrite } = merged;
        await ref.update(toWrite);
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("[POST /api/admin/bulk-edit]", err);
    return NextResponse.json({ error: "Bulk edit failed" }, { status: 500 });
  }
}
