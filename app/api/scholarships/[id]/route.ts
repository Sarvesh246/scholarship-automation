import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getCachedDetail, setCachedDetail } from "@/lib/scholarshipCache";
import { logFirestoreRead } from "@/lib/firestoreReadLog";
import { isInstitutionalGrant, isOverMaxPrize } from "@/lib/institutionalGrantFilter";
import { MIN_SCORE_APPROVED } from "@/lib/scholarshipQuality";
import type { Scholarship } from "@/types";

export const dynamic = "force-dynamic";

const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

function isJunk(s: Scholarship): boolean {
  if (JUNK_IDS.has(s.id)) return true;
  if (typeof s.title === "string" && JUNK_TITLE.test(s.title.trim())) return true;
  return false;
}

function passesQuality(s: Scholarship): boolean {
  if (s.verificationStatus === "approved") return true;
  if (s.verificationStatus === "hidden" || s.verificationStatus === "flagged" || s.verificationStatus === "needs_review") return false;
  if (s.verificationStatus === undefined && s.qualityScore === undefined) return true;
  return (s.qualityScore ?? 0) >= MIN_SCORE_APPROVED;
}

/**
 * GET /api/scholarships/[id]
 * Public. Single scholarship by ID. Cached.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const cached = getCachedDetail(id);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const db = getAdminFirestore();
    const ref = db.collection("scholarships").doc(id);
    const snap = await ref.get();
    logFirestoreRead("GET /api/scholarships/[id]", 1, id);

    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const s = { id: snap.id, ...snap.data() } as Scholarship;
    if (isJunk(s) || isInstitutionalGrant(s) || isOverMaxPrize(s)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!passesQuality(s)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    setCachedDetail(id, s);
    return NextResponse.json(s);
  } catch (err) {
    console.error("[GET /api/scholarships/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch scholarship" }, { status: 500 });
  }
}
