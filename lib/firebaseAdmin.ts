/**
 * Firebase Admin SDK for API routes (server-only).
 * Supports either:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: full JSON key as string, or
 * - Separate vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   (FIREBASE_PRIVATE_KEY can use escaped newlines \\n in env; we replace to real newlines.)
 * For local dev, can use scripts/serviceAccountKey.json when no env key is set.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Unescape \\n in private key string (for env vars that store the key with literal \n). */
function unescapePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

/** Google's JSON uses private_key; ServiceAccount expects privateKey. */
interface RawServiceAccount {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
}

function normalizeToServiceAccount(raw: RawServiceAccount): ServiceAccount {
  const privateKey =
    unescapePrivateKey(raw.private_key ?? raw.privateKey) ?? raw.privateKey ?? raw.private_key;
  return {
    projectId: raw.projectId ?? raw.project_id,
    clientEmail: raw.clientEmail ?? raw.client_email,
    privateKey,
  } as ServiceAccount;
}

function getServiceAccount(): ServiceAccount | undefined {
  // Prefer separate env vars (common on Vercel: paste private_key with \n as \\n)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = unescapePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount;
  }

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      const parsed = JSON.parse(key) as RawServiceAccount;
      return normalizeToServiceAccount(parsed);
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
      const parsed = JSON.parse(fs.readFileSync(p, "utf-8")) as RawServiceAccount;
      return normalizeToServiceAccount(parsed);
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
      "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY (full JSON) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in Vercel env."
    );
  }
  return initializeApp({ credential: cert(cred) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

let _firestoreSettingsApplied = false;

export function getAdminFirestore() {
  const db = getFirestore(getAdminApp());
  if (!_firestoreSettingsApplied) {
    try {
      (db as unknown as { settings: (s: { ignoreUndefinedProperties?: boolean }) => void }).settings({
        ignoreUndefinedProperties: true,
      });
      _firestoreSettingsApplied = true;
    } catch {
      // ignore if already applied
    }
  }
  return db;
}

const ADMIN_EMAILS_KEY = "ADMIN_EMAILS";

/** Comma-separated list of emails that can access admin APIs and see the Admin section. Set your email here to keep admin access. */
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
