import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

export interface FirebaseClientServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

const firebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function hasFirebaseBrowserConfig() {
  return Boolean(
    firebasePublicConfig.apiKey &&
      firebasePublicConfig.authDomain &&
      firebasePublicConfig.projectId &&
      firebasePublicConfig.appId,
  );
}

export function getFirebaseClientServices(): FirebaseClientServices | null {
  if (!hasFirebaseBrowserConfig()) {
    return null;
  }

  const app = getApps().length
    ? getApp()
    : initializeApp(firebasePublicConfig);

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app),
  };
}