/**
 * Firebase Admin SDK for API routes (server-only).
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var (full JSON key as string) in production.
 * For local dev, can use GOOGLE_APPLICATION_CREDENTIALS pointing to scripts/serviceAccountKey.json.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount(): ServiceAccount | undefined {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return JSON.parse(key) as ServiceAccount;
    } catch {
      return undefined;
    }
  }
  // Local dev: try scripts/serviceAccountKey.json
  try {
    const path = require("path");
    const fs = require("fs");
    const p = path.join(process.cwd(), "scripts", "serviceAccountKey.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as ServiceAccount;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0] as ReturnType<typeof initializeApp>;
  }
  const cred = getServiceAccount();
  if (!cred) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY. Set it to the full JSON service account key string (e.g. in Vercel env)."
    );
  }
  return initializeApp({ credential: cert(cred) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

const ADMIN_EMAILS_KEY = "ADMIN_EMAILS";

/** Comma-separated list of emails that can access admin APIs. */
export function getAdminEmails(): string[] {
  const raw = process.env[ADMIN_EMAILS_KEY] ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAdminEmails();
  return list.length > 0 && list.includes(email.toLowerCase());
}
