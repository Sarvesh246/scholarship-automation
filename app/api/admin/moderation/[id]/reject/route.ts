import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/** POST /api/admin/moderation/[id]/reject - Mark submission as rejected. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: submissionId } = await params;
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;

    const db = getAdminFirestore();
    const subRef = db.collection("scholarship_submissions").doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    const data = subSnap.data()!;
    if (data.status !== "pending") {
      return NextResponse.json({ error: "Submission already reviewed" }, { status: 400 });
    }

    await subRef.update({
      status: "rejected",
      rejectedReason: reason,
      reviewedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/moderation/reject]", err);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
