import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** GET /api/admin/moderation - List user-submitted scholarships (pending first, then by date). */
export async function GET(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection("scholarship_submissions")
      .orderBy("submittedAt", "desc")
      .limit(100)
      .get();

    const items = snap.docs.map((d) => {
      const data = d.data();
      const submittedAt = data.submittedAt;
      const reviewedAt = data.reviewedAt;
      return {
        id: d.id,
        title: data.title ?? "",
        sponsor: data.sponsor ?? "",
        amount: data.amount ?? null,
        deadline: data.deadline ?? null,
        description: data.description ?? null,
        applicationUrl: data.applicationUrl ?? null,
        submittedBy: data.submittedBy ?? "",
        submittedByEmail: data.submittedByEmail ?? null,
        status: data.status ?? "pending",
        submittedAt: submittedAt && typeof submittedAt === "object" && "_seconds" in submittedAt ? submittedAt : null,
        reviewedAt: reviewedAt && typeof reviewedAt === "object" && "_seconds" in reviewedAt ? reviewedAt : null,
        scholarshipId: data.scholarshipId ?? null,
        rejectedReason: data.rejectedReason ?? null,
      };
    });

    const pending = items.filter((i) => i.status === "pending");
    const rest = items.filter((i) => i.status !== "pending");
    const sorted = [...pending, ...rest];

    return NextResponse.json({ items: sorted });
  } catch (err) {
    console.error("[GET /api/admin/moderation]", err);
    return NextResponse.json({ error: "Failed to load moderation queue" }, { status: 500 });
  }
}
