import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/requireAdminAuth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getAdminFirestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/** GET /api/admin/users - List users (from Firebase Auth) with basic stats. */
export async function GET(request: Request) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const auth = getAdminAuth();
    const list = await auth.listUsers(100);
    const users = list.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName ?? null,
      createdAt: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime ?? null,
    }));

    const db = getAdminFirestore();
    const appCounts: Record<string, number> = {};
    const essayCounts: Record<string, number> = {};

    for (const u of list.users.slice(0, 50)) {
      try {
        const [appsSnap, essaysSnap] = await Promise.all([
          db.collection("users").doc(u.uid).collection("applications").count().get(),
          db.collection("users").doc(u.uid).collection("essays").count().get(),
        ]);
        appCounts[u.uid] = appsSnap.data().count;
        essayCounts[u.uid] = essaysSnap.data().count;
      } catch {
        appCounts[u.uid] = 0;
        essayCounts[u.uid] = 0;
      }
    }

    const withStats = users.map((u) => ({
      ...u,
      applicationsCount: appCounts[u.uid] ?? 0,
      essaysCount: essayCounts[u.uid] ?? 0,
    }));

    return NextResponse.json({ users: withStats, total: list.users.length });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
