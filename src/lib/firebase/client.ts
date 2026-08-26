"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// "Sign in with Microsoft" as a login option. Training videos are resolved
// server-side via an app-only Graph credential (src/lib/msgraph-server.ts),
// not via this per-user sign-in, so no extra Graph scopes are requested here
// — just the default OpenID sign-in.
export const microsoftProvider = new OAuthProvider("microsoft.com");
// Restricts sign-in to a single Entra tenant (e.g. the ACTVET school tenant)
// instead of "any Microsoft account". Optional — omit the env var to allow any tenant.
if (process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID) {
  microsoftProvider.setCustomParameters({ tenant: process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID });
}
