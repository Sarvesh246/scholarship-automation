/**
 * Background scrape job runner. Runs full scrape and writes result to Firestore scrapeJobs doc.
 */
import { getAdminFirestore } from "./firebaseAdmin";
import { mapExternalToScholarship, type ExternalScholarshipItem } from "./syncScholarships";
import { enrichWithClassification } from "./classifyScholarship";
import { runQualityVerification } from "./scholarshipQuality";
import { normalizeScholarship } from "./normalizeScholarship";
import { SCRAPERS, type ScraperId } from "./scrapers";
import { SCRAPER_SOURCE_TYPES } from "./scrapers/sourceRegistry";
import type { SourceType } from "@/types";
import { isDeadlineValid, deleteExpiredScholarships, deleteJunkScholarships } from "./scholarshipDeadline";
import { logSync, logError } from "./adminLog";
import { invalidateListCache } from "./scholarshipCache";

const SCRAPE_JOBS_COLLECTION = "scrapeJobs";

export type ScrapeJobStatus = "pending" | "running" | "completed" | "failed";

export interface ScrapeJobResult {
  ok: boolean;
  results?: Record<string, { created: number; updated: number; total: number; skipped: number }>;
  expiredDeleted?: number;
  junkDeleted?: number;
  error?: string;
}

/**
 * Run the full scrape pipeline and persist result to the job doc.
 * Call this without awaiting to run in background (e.g. void runScrapeJob(...)).
 */
export async function runScrapeJob(
  jobId: string,
  ids: ScraperId[],
  maxPages: number
): Promise<void> {
  const db = getAdminFirestore();
  const jobRef = db.collection(SCRAPE_JOBS_COLLECTION).doc(jobId);

  try {
    await jobRef.update({ status: "running" as ScrapeJobStatus, startedAt: new Date().toISOString() });
  } catch {
    // doc might not exist yet
  }

  try {
    const results: Record<string, { created: number; updated: number; total: number; skipped: number }> = {};
    const col = db.collection("scholarships");

    const scrapersToRun = ids.map((id) => ({ id, run: SCRAPERS[id].run }));
    const scraped = await Promise.all(
      scrapersToRun.map(async ({ id, run }) => {
        try {
          const items = await run(maxPages);
          return { id, items: items as ExternalScholarshipItem[] };
        } catch (e) {
          console.error(`[admin/scrape] ${id} failed:`, e);
          return { id, items: [] };
        }
      })
    );

    for (const { id, items: itemsList } of scraped) {
      const valid = itemsList.filter((item) =>
        isDeadlineValid(typeof item.deadline === "string" ? item.deadline : undefined)
      );
      const defaultSourceType = SCRAPER_SOURCE_TYPES[id] as SourceType | undefined;
      const toWrite = valid
        .map((item) => {
          const scholarship = enrichWithClassification(mapExternalToScholarship(item));
          scholarship.source = id;
          if (!scholarship.sourceType && defaultSourceType) scholarship.sourceType = defaultSourceType;
          if (item.sourceType && typeof item.sourceType === "string")
            scholarship.sourceType = item.sourceType as SourceType;
          const q = runQualityVerification(scholarship);
          const withQuality = { ...scholarship, ...q };
          const normalized = normalizeScholarship(withQuality);
          const docId = item.id && typeof item.id === "string" ? item.id : scholarship.id;
          return {
            scholarship: {
              ...scholarship,
              qualityScore: q.qualityScore,
              verificationStatus: q.verificationStatus,
              domainTrustScore: q.domainTrustScore,
              displayCategory: q.displayCategory,
              lastVerifiedAt: q.lastVerifiedAt,
              riskFlags: q.riskFlags,
              qualityTier: q.qualityTier,
              fundingType: q.fundingType,
              scholarshipScore: q.scholarshipScore,
              normalized,
            },
            docId,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

      let written = 0;
      const BATCH_SIZE = 500;
      for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
        const chunk = toWrite.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (let j = 0; j < chunk.length; j++) {
          const { scholarship, docId } = chunk[j];
          const ref = col.doc(docId);
          const { id: _id, ...data } = scholarship;
          batch.set(ref, { id: docId, ...data }, { merge: true });
          written++;
        }
        await batch.commit();
      }
      results[id] = {
        created: 0,
        updated: written,
        total: itemsList.length,
        skipped: itemsList.length - valid.length,
      };
      logSync(`scrape:${id}`, 0, written).catch(() => {});
    }

    const [expiredDeleted, junkDeleted] = await Promise.all([
      deleteExpiredScholarships(),
      deleteJunkScholarships(),
    ]);

    invalidateListCache();

    const result: ScrapeJobResult = { ok: true, results, expiredDeleted, junkDeleted };
    await jobRef.set(
      {
        status: "completed",
        completedAt: new Date().toISOString(),
        result,
      },
      { merge: true }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error("[runScrapeJob]", err);
    logError("scrape", message).catch(() => {});
    await jobRef.set(
      {
        status: "failed",
        completedAt: new Date().toISOString(),
        result: { ok: false, error: message },
      },
      { merge: true }
    );
  }
}

export function generateScrapeJobId(): string {
  return `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
