import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined" && !firebaseConfig.apiKey) {
    return null;
  }
  if (!firebaseConfig.apiKey) {
    if (typeof window !== "undefined") {
      console.warn("Firebase env vars are not set. Auth will be disabled.");
    }
    return null;
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    return app;
  }
  return getApp() as FirebaseApp;
}

app = getFirebaseApp();

export const auth: Auth | null = app ? getAuth(app) : (null as unknown as Auth);
export const googleProvider = new GoogleAuthProvider();

