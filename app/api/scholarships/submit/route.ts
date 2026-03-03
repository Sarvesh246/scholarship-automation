import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/** POST /api/scholarships/submit - User submits a scholarship for moderation (signed-in users). */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email ?? undefined;

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const sponsor = String(body.sponsor ?? "").trim();
    const amount = typeof body.amount === "number" && body.amount >= 0 ? body.amount : undefined;
    const deadline = typeof body.deadline === "string" ? body.deadline.trim() : undefined;
    const description = typeof body.description === "string" ? body.description.trim() : undefined;
    const applicationUrl = typeof body.applicationUrl === "string" ? body.applicationUrl.trim() || null : null;

    if (!title || title.length < 3) {
      return NextResponse.json({ error: "Title is required (at least 3 characters)" }, { status: 400 });
    }
    if (!sponsor || sponsor.length < 2) {
      return NextResponse.json({ error: "Sponsor / organization name is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.collection("scholarship_submissions").doc();
    await ref.set({
      title,
      sponsor,
      amount: amount ?? null,
      deadline: deadline || null,
      description: description || null,
      applicationUrl,
      submittedBy: uid,
      submittedByEmail: email ?? null,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("[POST /api/scholarships/submit]", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
