"use client";

import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { emailDocId, normalizeEmail } from "@/lib/email";
import type { AllowlistEntry, UserProfile } from "@/lib/types";

export const ADMIN_EMAIL = normalizeEmail(process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "");

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAIL !== "" && normalizeEmail(email) === ADMIN_EMAIL;
}

function newProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    email: normalizeEmail(user.email ?? ""),
    displayName: user.displayName || (user.email ?? "").split("@")[0],
    role: isAdminEmail(user.email) ? "admin" : "student",
    approved: true,
    totalHours: 0,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
}

/** Wraps a Firestore permission error as a recognizable "not-approved" error. */
function notApproved(): Error {
  const e = new Error("Your email is not approved to use the system yet. Contact your administrator.");
  (e as Error & { code?: string }).code = "not-approved";
  return e;
}

/**
 * Creates the profile document for a just-registered user. Firestore rules
 * only allow this for approved (allowlisted) emails or the admin, so a
 * permission error means the email is not approved.
 * @throws Error with code "not-approved"
 */
export async function createOwnProfile(user: User): Promise<void> {
  try {
    await setDoc(doc(db, "users", user.uid), newProfile(user));
  } catch {
    throw notApproved();
  }
}

/**
 * Ensures a signed-in user has a profile (creating one on first sign-in).
 * @throws Error with code "not-approved" when Firestore denies access.
 */
export async function ensureProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile = newProfile(user);
      await setDoc(ref, profile);
      return profile;
    }
    await setDoc(ref, { lastLoginAt: Date.now() }, { merge: true });
    return { uid: user.uid, ...(snap.data() as Omit<UserProfile, "uid">) };
  } catch {
    throw notApproved();
  }
}

/* ---------------- Admin: users + allowlist (client SDK, rules-gated) --------------- */

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}

export async function fetchAllowlist(): Promise<AllowlistEntry[]> {
  const snap = await getDocs(collection(db, "allowlist"));
  const entries = snap.docs.map((d) => {
    const data = d.data();
    return {
      email: data.email ?? d.id,
      displayName: data.displayName,
      addedBy: data.addedBy,
      addedAt: data.addedAt,
      registered: data.registered ?? false,
    } as AllowlistEntry;
  });
  return entries.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

export async function addAllowlistEmail(email: string, displayName: string, addedBy: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await setDoc(
    doc(db, "allowlist", emailDocId(normalized)),
    {
      email: normalized,
      displayName: displayName.trim() || null,
      addedBy,
      addedAt: Date.now(),
      registered: false,
    },
    { merge: true },
  );
}

export async function removeAllowlistEmail(email: string): Promise<void> {
  await deleteDoc(doc(db, "allowlist", emailDocId(normalizeEmail(email))));
}
