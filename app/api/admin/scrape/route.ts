import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { mapExternalToScholarship, type ExternalScholarshipItem } from "@/lib/syncScholarships";
import { enrichWithClassification } from "@/lib/classifyScholarship";
import { runAllScrapers, SCRAPERS, type ScraperId } from "@/lib/scrapers";
import { isDeadlineValid, deleteExpiredScholarships, deleteJunkScholarships } from "@/lib/scholarshipDeadline";
import { logSync, logError } from "@/lib/adminLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/scrape
 * Admin-only: run web scrapers and import scholarships into Firestore.
 * Only adds scholarships with deadline >= today. Runs cleanup of expired scholarships after.
 * Body: { scrapers?: ScraperId[] } - if omitted, runs all.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json().catch(() => ({}));
    const requested = body.scrapers as ScraperId[] | undefined;
    const ids = requested?.length
      ? requested.filter((id) => id in SCRAPERS)
      : (Object.keys(SCRAPERS) as ScraperId[]);

    const maxPages = Math.min(Number(body.maxPages) || 3, 10);
    const results: Record<string, { created: number; updated: number; total: number; skipped: number }> = {};
    const db = getAdminFirestore();
    const col = db.collection("scholarships");

    const scrapersToRun = ids.map((id) => ({ id, run: SCRAPERS[id].run }));
    const scraped = await Promise.all(scrapersToRun.map(async ({ id, run }) => {
      try {
        const items = await run(maxPages);
        return { id, items: items as ExternalScholarshipItem[] };
      } catch (e) {
        console.error(`[admin/scrape] ${id} failed:`, e);
        return { id, items: [] };
      }
    }));

    for (const { id, items: itemsList } of scraped) {
      const valid = itemsList.filter((item) => isDeadlineValid(typeof item.deadline === "string" ? item.deadline : undefined));
      const toWrite = valid.map((item) => {
        const scholarship = enrichWithClassification(mapExternalToScholarship(item));
        scholarship.source = id as "bold" | "collegescholarships" | "scholarshipscom" | "scholarships360" | "collegedata";
        const docId = item.id && typeof item.id === "string" ? item.id : scholarship.id;
        return { scholarship, docId };
      });
      let created = 0;
      let updated = 0;
      const BATCH_SIZE = 500;
      for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
        const chunk = toWrite.slice(i, i + BATCH_SIZE);
        const refs = chunk.map(({ docId }) => col.doc(docId));
        const existing = await Promise.all(refs.map((r) => r.get()));
        const batch = db.batch();
        for (let j = 0; j < chunk.length; j++) {
          const { scholarship, docId } = chunk[j];
          const { id: _id, ...data } = scholarship;
          if (existing[j].exists) {
            batch.update(refs[j], data);
            updated++;
          } else {
            batch.set(refs[j], { id: docId, ...data });
            created++;
          }
        }
        await batch.commit();
      }
      results[id] = { created, updated, total: itemsList.length, skipped: itemsList.length - valid.length };
      logSync(`scrape:${id}`, created, updated).catch(() => {});
    }

    const [expiredDeleted, junkDeleted] = await Promise.all([
      deleteExpiredScholarships(),
      deleteJunkScholarships(),
    ]);

    return NextResponse.json({ ok: true, results, expiredDeleted, junkDeleted });
  } catch (err) {
    console.error("[POST /api/admin/scrape]", err);
    logError("scrape", err instanceof Error ? err.message : "Scrape failed").catch(() => {});
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
