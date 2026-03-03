import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { enrichWithClassification } from "@/lib/classifyScholarship";
import { formatScholarshipDescription } from "@/lib/formatScholarshipDescription";
import { MAX_PRIZE_AMOUNT } from "@/lib/institutionalGrantFilter";
import type { Scholarship } from "@/types";

export const dynamic = "force-dynamic";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const sponsor = String(body.sponsor ?? "").trim();
    const amount = Number(body.amount);
    const deadline = String(body.deadline ?? "").trim();
    const description = formatScholarshipDescription(String(body.description ?? "").trim());
    const estimatedTime = String(body.estimatedTime ?? "2–3 hours").trim();
    const categoryTags = Array.isArray(body.categoryTags) ? body.categoryTags : [];
    const eligibilityTags = Array.isArray(body.eligibilityTags) ? body.eligibilityTags : [];
    const prompts = Array.isArray(body.prompts) ? body.prompts : [];

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const amountNum = Number.isFinite(Number(body.amount)) ? Number(body.amount) : 0;
    if (amountNum > MAX_PRIZE_AMOUNT) {
      return NextResponse.json(
        { error: `Amount cannot exceed $${MAX_PRIZE_AMOUNT.toLocaleString()}` },
        { status: 400 }
      );
    }

    const id = body.id && String(body.id).trim() ? String(body.id).trim() : slugify(title);
    const db = getAdminFirestore();
    const ref = db.collection("scholarships").doc(id);

    const doc = await ref.get();
    if (doc.exists && body.id !== id) {
      return NextResponse.json(
        { error: "A scholarship with this id already exists. Provide a unique id." },
        { status: 400 }
      );
    }

    const base: Scholarship = {
      id,
      title,
      sponsor,
      amount: Number.isFinite(amount) ? amount : 0,
      deadline: deadline || "2026-12-31",
      categoryTags: categoryTags.filter(Boolean),
      eligibilityTags: eligibilityTags.filter(Boolean),
      estimatedTime: estimatedTime || "2–3 hours",
      description,
      prompts: prompts.filter(Boolean),
    };
    const scholarship = enrichWithClassification(base);
    const { id: _id, ...data } = scholarship;
    await ref.set({ id, ...data });

    return NextResponse.json({ id, ...data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/scholarships]", err);
    return NextResponse.json({ error: "Failed to create scholarship" }, { status: 500 });
  }
}
