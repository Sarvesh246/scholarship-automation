import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { runQualityVerification } from "@/lib/scholarshipQuality";
import { normalizeScholarship } from "@/lib/normalizeScholarship";
import { getTodayDateString } from "@/lib/scholarshipDeadline";
import type { Scholarship } from "@/types";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 250;

/**
 * POST /api/admin/validate-scholarships
 * STEP 0: Pull all scholarships, run quality verification, update each with qualityScore,
 * verificationStatus, domainTrustScore, displayCategory, lastVerifiedAt. Remove expired.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminFirestore();
    const col = db.collection("scholarships");
    const today = getTodayDateString();
    const snap = await col.get();
    const docs = snap.docs;

    let updated = 0;
    let hidden = 0;
    let expiredRemoved = 0;
    const errors: string[] = [];

    // Separate expired (to delete) from current (to validate)
    const toDelete: typeof docs = [];
    const toValidate: typeof docs = [];
    for (const doc of docs) {
      const data = doc.data();
      const deadline = data?.deadline;
      if (typeof deadline === "string") {
        const norm = deadline.replace(/T.*$/, "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(norm) && norm < today) {
          toDelete.push(doc);
          continue;
        }
      }
      toValidate.push(doc);
    }

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = db.batch();
      toDelete.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    expiredRemoved = toDelete.length;

    for (let i = 0; i < toValidate.length; i += BATCH_SIZE) {
      const chunk = toValidate.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const doc of chunk) {
        try {
          const data = doc.data();
          const s: Scholarship = {
            id: doc.id,
            title: data?.title ?? "",
            sponsor: data?.sponsor ?? "",
            amount: typeof data?.amount === "number" ? data.amount : 0,
            deadline: data?.deadline ?? "",
            categoryTags: Array.isArray(data?.categoryTags) ? data.categoryTags : [],
            eligibilityTags: Array.isArray(data?.eligibilityTags) ? data.eligibilityTags : [],
            estimatedTime: data?.estimatedTime ?? "",
            description: data?.description ?? "",
            prompts: Array.isArray(data?.prompts) ? data.prompts : [],
            source: data?.source,
            status: data?.status,
            scholarshipType: data?.scholarshipType,
            nonCitizenEligible: data?.nonCitizenEligible,
            applicationUrl: data?.applicationUrl ?? null,
            contactEmail: data?.contactEmail ?? null,
            applicationFeeRequired: data?.applicationFeeRequired,
          };

          const result = runQualityVerification(s);
          if (result.shouldHide) hidden++;

          const withQuality = {
            ...s,
            qualityScore: result.qualityScore,
            verificationStatus: result.verificationStatus,
            domainTrustScore: result.domainTrustScore,
            displayCategory: result.displayCategory,
            lastVerifiedAt: result.lastVerifiedAt,
          };
          const normalized = normalizeScholarship(withQuality);

          batch.update(doc.ref, {
            qualityScore: result.qualityScore,
            verificationStatus: result.verificationStatus,
            domainTrustScore: result.domainTrustScore,
            displayCategory: result.displayCategory,
            lastVerifiedAt: result.lastVerifiedAt,
            normalized,
          });
          updated++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${doc.id}: ${msg}`);
        }
      }

      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      totalProcessed: updated,
      expiredRemoved,
      hiddenCount: hidden,
      errors: errors.slice(0, 50),
    });
  } catch (err) {
    console.error("[POST /api/admin/validate-scholarships]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Validation failed" },
      { status: 500 }
    );
  }
}
