import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getTodayDateString } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

/** GET /api/admin/review-queue - Scholarships needing review (missing amount, short description, etc.) */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("scholarships").get();
    const today = getTodayDateString();

    const items: { id: string; title: string; sponsor: string; amount: number; issues: string[] }[] = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      const id = doc.id;
      if (JUNK_IDS.has(id) || JUNK_TITLE.test((d.title as string) || "")) continue;

      const dl = d.deadline as string;
      if (!dl || typeof dl !== "string") continue;
      const n = (dl as string).replace(/T.*$/, "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(n) || n < today) continue;

      const issues: string[] = [];
      if (!d.amount || (d.amount as number) === 0) issues.push("Missing amount");
      const desc = (d.description as string) || "";
      if (desc.length < 50) issues.push("Short description");
      if (desc.length > 0 && desc.length < 30) issues.push("Very short description");

      if (issues.length > 0) {
        items.push({
          id,
          title: (d.title as string) ?? "",
          sponsor: (d.sponsor as string) ?? "",
          amount: (d.amount as number) ?? 0,
          issues,
        });
      }
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/admin/review-queue]", err);
    return NextResponse.json({ error: "Failed to get review queue" }, { status: 500 });
  }
}
