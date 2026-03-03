import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/** POST /api/feedback - Submit feedback (any signed-in user). */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const { getAdminAuth } = await import("@/lib/firebaseAdmin");
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email ?? "unknown";

    const body = await request.json();
    const type = (body.type as string) || "general";
    const message = String(body.message ?? "").trim();
    const scholarshipId = body.scholarshipId as string | undefined;

    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    const db = getAdminFirestore();
    await db.collection("feedback").add({
      uid,
      email,
      type,
      message,
      scholarshipId: scholarshipId || null,
      at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/feedback]", err);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
