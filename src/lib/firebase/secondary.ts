"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const SECONDARY_APP_NAME = "provisioning";

/**
 * A second, independent Firebase Auth instance. Used only to create new
 * accounts (students/teachers) without disturbing the signed-in admin's or
 * teacher's own session on the primary app — Firebase Auth otherwise signs
 * you in as whichever account you just created.
 */
function getSecondaryApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  return existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);
}

export function getSecondaryAuth(): Auth {
  return getAuth(getSecondaryApp());
}
