import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

/**
 * Firebase web config is public by design — it identifies the project, it does
 * not authorise anything. What actually protects the data is the rules in
 * `database.rules.json`, so those have to be deployed before launch.
 *
 * Values fall back to the literals so the app runs with no .env file, but
 * NEXT_PUBLIC_* overrides let you point a preview build at another project.
 */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyA2XpDSqR-spyX2PQvlUowq0bNwGfgIEd0",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "game-learning-platform.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "game-learning-platform",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "game-learning-platform.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "836772190250",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:836772190250:web:8f02362d50aae0647e0b53",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-6LHB0TE5Q7",

  // Realtime Database cannot be derived from projectId — without this the SDK
  // throws "Can't determine Firebase Database URL" as soon as getDatabase runs.
  // If the instance was created outside us-central1 the host differs, e.g.
  // https://<project>-default-rtdb.europe-west1.firebasedatabase.app
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://game-learning-platform-default-rtdb.firebaseio.com",
};

// Next's dev server re-evaluates modules on HMR; initializeApp twice throws.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);
export { app, firebaseConfig };
