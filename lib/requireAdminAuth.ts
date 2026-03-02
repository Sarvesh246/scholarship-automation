import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { isAdminEmail } from "@/lib/firebaseAdmin";

export async function requireAdminAuth(request: Request): Promise<{ ok: true; decoded: DecodedIdToken } | NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }
    return { ok: true, decoded };
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
