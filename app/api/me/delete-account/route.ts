import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/delete-account
 * Deletes the current user's Firestore data and Firebase Auth account.
 * Client must send Authorization: Bearer <idToken>. After success, client should sign out and redirect.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);

    const applicationsSnap = await userRef.collection("applications").get();
    const batch = db.batch();
    applicationsSnap.docs.forEach((d) => batch.delete(d.ref));
    const essaysSnap = await userRef.collection("essays").get();
    essaysSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await userRef.delete();
    await auth.deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/me/delete-account]", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
