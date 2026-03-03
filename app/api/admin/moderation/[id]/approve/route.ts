import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { enrichWithClassification } from "@/lib/classifyScholarship";
import { formatScholarshipDescription } from "@/lib/formatScholarshipDescription";
import { MAX_PRIZE_AMOUNT } from "@/lib/institutionalGrantFilter";
import type { Scholarship } from "@/types";

export const dynamic = "force-dynamic";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: submissionId } = await params;
  if (!submissionId) return NextResponse.json({ error: "Missing submission id" }, { status: 400 });

  try {
    const db = getAdminFirestore();
    const subRef = db.collection("scholarship_submissions").doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    const data = subSnap.data()!;
    if (data.status !== "pending") return NextResponse.json({ error: "Submission already reviewed" }, { status: 400 });

    const title = String(data.title ?? "").trim();
    const sponsor = String(data.sponsor ?? "").trim();
    const amount = Number(data.amount);
    const amountNum = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    if (amountNum > MAX_PRIZE_AMOUNT) {
      return NextResponse.json({ error: `Amount cannot exceed $${MAX_PRIZE_AMOUNT.toLocaleString()}` }, { status: 400 });
    }
    const deadline = (data.deadline && String(data.deadline).trim()) || "2026-12-31";
    const description = formatScholarshipDescription(String(data.description ?? "").trim());
    const applicationUrl = data.applicationUrl && String(data.applicationUrl).trim() ? String(data.applicationUrl).trim() : null;

    const baseId = slugify(title) || "user-submission";
    const scholarshipId = `${baseId}-${submissionId.slice(0, 8)}`;
    const scholRef = db.collection("scholarships").doc(scholarshipId);
    if ((await scholRef.get()).exists) {
      return NextResponse.json({ error: "Scholarship id already exists." }, { status: 400 });
    }

    const base: Scholarship = {
      id: scholarshipId,
      title,
      sponsor,
      amount: amountNum,
      deadline,
      categoryTags: [],
      eligibilityTags: [],
      estimatedTime: "1–2 hours",
      description,
      prompts: [],
      source: "manual",
      status: "published",
      verificationStatus: "needs_review",
      applicationUrl: applicationUrl ?? null,
    };
    const scholarship = enrichWithClassification(base);
    const { id: _id, ...writeData } = scholarship;
    await scholRef.set({ id: scholarshipId, ...writeData });
    await subRef.update({ status: "approved", scholarshipId, reviewedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true, scholarshipId });
  } catch (err) {
    console.error("[POST /api/admin/moderation/approve]", err);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
