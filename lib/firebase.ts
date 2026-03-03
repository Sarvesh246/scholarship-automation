import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore, memoryLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";

/**
 * Firebase config from environment variables.
 * All keys must be prefixed with NEXT_PUBLIC_ to be available in the browser.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/** Cached Firebase app instance (null on server or when config is missing). */
let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn("[Firebase] Env vars not set. Add .env.local and restart the dev server.");
    }
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    return app;
  }
  app = getApp() as FirebaseApp;
  return app;
}

app = getFirebaseApp();

/** Firebase Auth instance. Null when not in browser or config missing. */
export const auth: Auth | null = app ? getAuth(app) : (null as unknown as Auth);

/** Firestore instance. Null when not in browser or config missing. */
export const db: Firestore | null = app
  ? (() => {
      try {
        const store = initializeFirestore(app, { localCache: memoryLocalCache() });
        if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === "true") {
          const { connectFirestoreEmulator } = require("firebase/firestore");
          connectFirestoreEmulator(store, "127.0.0.1", 8080);
        }
        return store;
      } catch {
        const store = getFirestore(app);
        if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === "true") {
          connectFirestoreEmulator(store, "127.0.0.1", 8080);
        }
        return store;
      }
    })()
  : null;

export const googleProvider = new GoogleAuthProvider();

/** Cached Analytics instance (client-only). */
let analyticsInstance: Analytics | null = null;

/**
 * Returns Firebase Analytics only when running in the browser and when
 * Analytics is supported. Safe to call from SSR — returns null on server.
 * Call this from client components or useEffect.
 */
export async function getAnalyticsSafe(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  const currentApp = app ?? getFirebaseApp();
  if (!currentApp) return null;
  if (analyticsInstance) return analyticsInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(currentApp);
      return analyticsInstance;
    }
  } catch (_) {
    // getAnalytics throws in Node or unsupported environments
  }
  return null;
}

/**
 * Synchronous getter for Analytics when you've already ensured client context
 * (e.g. after getAnalyticsSafe() has been called). Prefer getAnalyticsSafe().
 */
export function getAnalyticsInstance(): Analytics | null {
  return analyticsInstance;
}
