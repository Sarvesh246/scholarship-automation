import { getAdminFirestore } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function logSync(source: string, created: number, updated: number, errors?: string[]): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection("admin_sync_history").add({
      source,
      created,
      updated,
      errors: errors?.slice(0, 10),
      at: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[adminLog] logSync failed:", e);
  }
}

export async function logError(source: string, message: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection("admin_errors").add({
      source,
      message,
      at: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[adminLog] logError failed:", e);
  }
}
