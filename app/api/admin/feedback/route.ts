import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** GET /api/admin/feedback - List user feedback. */
export async function GET(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("feedback").orderBy("at", "desc").limit(50).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/admin/feedback]", err);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}

/** DELETE /api/admin/feedback - Clear all feedback (after reviewing). */
export async function DELETE(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const col = db.collection("feedback");
    const snap = await col.get();
    const batchSize = 500;
    let totalDeleted = 0;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = snap.docs.slice(i, i + batchSize);
      chunk.forEach((doc) => batch.delete(doc.ref));
      if (chunk.length > 0) {
        await batch.commit();
        totalDeleted += chunk.length;
      }
    }
    return NextResponse.json({ deleted: totalDeleted });
  } catch (err) {
    console.error("[DELETE /api/admin/feedback]", err);
    return NextResponse.json({ error: "Failed to clear feedback" }, { status: 500 });
  }
}
