import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getTodayDateString } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
}

/** GET /api/admin/duplicates - Find potential duplicate scholarships. */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("scholarships").get();
    const today = getTodayDateString();

    const byNormalized = new Map<string, { id: string; title: string; amount: number }[]>();

    for (const doc of snap.docs) {
      const d = doc.data();
      const id = doc.id;
      if (JUNK_IDS.has(id) || JUNK_TITLE.test((d.title as string) || "")) continue;

      const dl = d.deadline as string;
      if (!dl || typeof dl !== "string") continue;
      const n = (dl as string).replace(/T.*$/, "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(n) || n < today) continue;

      const title = (d.title as string) ?? "";
      const norm = normalizeTitle(title);
      if (norm.length < 10) continue;

      const entry = { id, title, amount: (d.amount as number) ?? 0 };
      const list = byNormalized.get(norm) ?? [];
      list.push(entry);
      byNormalized.set(norm, list);
    }

    const groups = [...byNormalized.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([norm, list]) => ({ normalized: norm, scholarships: list }));

    return NextResponse.json({ groups });
  } catch (err) {
    console.error("[GET /api/admin/duplicates]", err);
    return NextResponse.json({ error: "Failed to find duplicates" }, { status: 500 });
  }
}
