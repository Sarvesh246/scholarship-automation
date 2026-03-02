import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import type { Scholarship } from "@/types";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const body = await _request.json();
    const db = getAdminFirestore();
    const ref = db.collection("scholarships").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
    }

    const updates: Partial<Omit<Scholarship, "id">> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.sponsor !== undefined) updates.sponsor = String(body.sponsor).trim();
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.deadline !== undefined) updates.deadline = String(body.deadline).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.estimatedTime !== undefined) updates.estimatedTime = String(body.estimatedTime).trim();
    if (Array.isArray(body.categoryTags)) updates.categoryTags = body.categoryTags.filter(Boolean);
    if (Array.isArray(body.eligibilityTags)) updates.eligibilityTags = body.eligibilityTags.filter(Boolean);
    if (Array.isArray(body.prompts)) updates.prompts = body.prompts.filter(Boolean);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error("[PATCH /api/admin/scholarships]", err);
    return NextResponse.json({ error: "Failed to update scholarship" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const ref = db.collection("scholarships").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
    }
    await ref.delete();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/admin/scholarships]", err);
    return NextResponse.json({ error: "Failed to delete scholarship" }, { status: 500 });
  }
}
