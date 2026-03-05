import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getTodayDateString } from "@/lib/scholarshipDeadline";

export const dynamic = "force-dynamic";

const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

function inferSource(id: string, source?: string): string {
  if (source) return source;
  if (id.startsWith("bold-")) return "bold";
  if (id.startsWith("collegescholarships-")) return "collegescholarships";
  if (id.startsWith("scholarshipscom-")) return "scholarshipscom";
  if (id.startsWith("scholarships360-")) return "scholarships360";
  if (id.startsWith("collegedata-")) return "collegedata";
  if (id.startsWith("grants-gov-")) return "grants_gov";
  return "manual";
}

/** GET /api/admin/stats - Admin dashboard stats. */
export async function GET(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const today = getTodayDateString();

    const [scholarshipsSnap, syncHistorySnap, errorsSnap, usersSnap, applicationsSnap, essaysSnap] = await Promise.all([
      db.collection("scholarships").get(),
      db.collection("admin_sync_history").orderBy("at", "desc").limit(20).get(),
      db.collection("admin_errors").orderBy("at", "desc").limit(20).get(),
      db.collection("users").count().get(),
      db.collectionGroup("applications").count().get(),
      db.collectionGroup("essays").count().get(),
    ]);

    const scholarships = scholarshipsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    const valid = scholarships.filter((s) => {
      const dl = s.deadline as string;
      if (!dl || typeof dl !== "string") return false;
      const n = dl.replace(/T.*$/, "").trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(n) && n >= today;
    });
    const nonJunk = valid.filter((s) => !JUNK_IDS.has(String(s.id)) && !JUNK_TITLE.test(String(s.title || "")));

    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byDeadline: { next7: number; next30: number; next90: number; later: number } = { next7: 0, next30: 0, next90: 0, later: 0 };
    const now = new Date();

    let matchableCount = 0;
    let missingEligibilityCount = 0;
    let missingGPACount = 0;
    let missingStateCount = 0;
    let qualitySum = 0;
    let qualityCount = 0;
    let verifiedCount = 0;

    for (const s of nonJunk) {
      if (s.verificationStatus === "approved") verifiedCount++;
      const src = inferSource(String(s.id), s.source as string | undefined);
      bySource[src] = (bySource[src] ?? 0) + 1;
      for (const c of (s.categoryTags as string[]) ?? []) {
        byCategory[c] = (byCategory[c] ?? 0) + 1;
      }
      const dl = s.deadline as string;
      if (dl) {
        const d = new Date(dl);
        const days = Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (days <= 7) byDeadline.next7++;
        else if (days <= 30) byDeadline.next30++;
        else if (days <= 90) byDeadline.next90++;
        else byDeadline.later++;
      }
      const norm = s.normalized as { matchable?: boolean; educationLevelsEligible?: string[]; statesEligible?: string[]; majorsEligible?: string[]; minGPA?: number | null; qualityScore?: number } | undefined;
      if (norm?.matchable) matchableCount++;
      const hasEligibility = (norm?.educationLevelsEligible?.length ?? 0) > 0 || (norm?.statesEligible?.length ?? 0) > 0 || (norm?.majorsEligible?.length ?? 0) > 0;
      if (!hasEligibility) missingEligibilityCount++;
      if (norm && "minGPA" in norm && (norm.minGPA == null || norm.minGPA === undefined)) missingGPACount++;
      const hasState = (norm?.statesEligible?.length ?? 0) > 0;
      if (!hasState) missingStateCount++;
      const q = (s.qualityScore as number) ?? norm?.qualityScore;
      if (typeof q === "number") {
        qualitySum += q;
        qualityCount++;
      }
    }

    const totalForMatch = nonJunk.length || 1;
    const matchingHealth = {
      matchablePercent: Math.round((matchableCount / totalForMatch) * 100),
      missingStructuredEligibilityPercent: Math.round((missingEligibilityCount / totalForMatch) * 100),
      missingGPAPercent: Math.round((missingGPACount / totalForMatch) * 100),
      missingStateEligibilityPercent: Math.round((missingStateCount / totalForMatch) * 100),
      averageQualityScore: qualityCount > 0 ? Math.round((qualitySum / qualityCount) * 10) / 10 : null,
      matchableCount,
      totalScholarships: totalForMatch,
    };

    const syncHistory = syncHistorySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const errors = errorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const envVars = [
      "FIREBASE_SERVICE_ACCOUNT_KEY",
      "ADMIN_EMAILS",
      "CRON_SECRET",
      "SCHOLARSHIP_OWL_API_KEY",
      "SCHOLARSHIP_API_URL",
      "SCHOLARSHIP_API_KEY",
      "SCHOLARSHIP_RSS_FEEDS",
      "NIH_REPORTER_ENABLED",
    ].map((k) => ({ key: k, set: !!(process.env[k] ?? "").trim() }));

    return NextResponse.json({
      totalScholarships: nonJunk.length,
      verifiedPercent: totalForMatch > 0 ? Math.round((verifiedCount / totalForMatch) * 100) : 0,
      expiredCount: scholarships.length - valid.length,
      junkCount: valid.length - nonJunk.length,
      bySource,
      byCategory,
      byDeadline,
      totalUsers: usersSnap.data().count,
      applicationsCount: applicationsSnap.data().count,
      essaysCount: essaysSnap.data().count,
      matchingHealth,
      syncHistory,
      errors,
      envVars,
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
