import { NextRequest, NextResponse } from "next/server";
import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { getCachedList, setCachedList, listCacheKey } from "@/lib/scholarshipCache";
import { logFirestoreRead } from "@/lib/firestoreReadLog";
import { isInstitutionalGrant, isOverMaxPrize } from "@/lib/institutionalGrantFilter";
import { MIN_SCORE_APPROVED } from "@/lib/scholarshipQuality";
import type { Scholarship } from "@/types";

export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 20;
const JUNK_IDS = new Set(["bold-by-state", "bold-by-major", "bold-by-year", "bold-by-demographics"]);
const JUNK_TITLE = /^By\s+(Demographics|Major|Year|State)$/i;

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
 * GET /api/scholarships
 * Public. Paginated list of active scholarships. Cached by (limit, cursor, q).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const cursor = searchParams.get("cursor") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const cacheKey = listCacheKey({ limit, cursor: cursor || null, q });
  const cached = getCachedList(cacheKey);
  if (cached) {
    return NextResponse.json({ items: cached.items, nextCursor: cached.nextCursor });
  }

  try {
    const db = getAdminFirestore();
    const col = db.collection("scholarships");
    const today = getToday();

    let query = col
      .where("deadline", ">=", today)
      .orderBy("deadline")
      .orderBy(FieldPath.documentId())
      .limit(limit * 3);

    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, "base64url").toString("utf8");
        const [deadlinePart, idPart] = decoded.split("|");
        if (deadlinePart != null && idPart) {
          query = query.startAfter(deadlinePart, idPart);
        }
      } catch {
        // invalid cursor
      }
    }

    const snap = await query.get();
    logFirestoreRead("GET /api/scholarships", snap.size, `limit=${limit}`);

    const items: Scholarship[] = [];
    let lastDoc: QueryDocumentSnapshot | null = null;
    for (const doc of snap.docs) {
      const s = { id: doc.id, ...doc.data() } as Scholarship;
      if (isJunk(s) || isInstitutionalGrant(s) || isOverMaxPrize(s)) continue;
      if (s.status === "draft") continue;
      if (!passesQuality(s)) continue;
      items.push(s);
      lastDoc = doc;
      if (items.length >= limit) break;
    }

    const nextCursor =
      lastDoc && snap.docs.length >= limit * 3
        ? Buffer.from(`${(lastDoc.data() as { deadline?: string }).deadline ?? ""}|${lastDoc.id}`, "utf8").toString("base64url")
        : null;

    const result = { items, nextCursor };
    setCachedList(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/scholarships]", err);
    return NextResponse.json({ error: "Failed to fetch scholarships" }, { status: 500 });
  }
}
