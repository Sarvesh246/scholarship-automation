import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getTodayDateString } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

/** GET /api/admin/export?format=json|csv */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const format = request.nextUrl.searchParams.get("format") || "json";

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("scholarships").get();
    const today = getTodayDateString();

    const scholarships = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter((s) => {
        const dl = s.deadline as string;
        if (!dl || typeof dl !== "string") return false;
        const n = dl.replace(/T.*$/, "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(n) || n < today) return false;
        return !JUNK_IDS.has(String(s.id)) && !JUNK_TITLE.test(String(s.title || ""));
      });

    if (format === "csv") {
      const headers = ["id", "title", "sponsor", "amount", "deadline", "description", "categoryTags", "eligibilityTags", "source"];
      const rows = scholarships.map((s) =>
        headers.map((h) => {
          const v = s[h as keyof typeof s];
          if (Array.isArray(v)) return JSON.stringify(v).replace(/"/g, '""');
          return String(v ?? "").replace(/"/g, '""');
        }).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="scholarships-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(scholarships);
  } catch (err) {
    console.error("[GET /api/admin/export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
