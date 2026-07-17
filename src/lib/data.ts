"use client";

import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { emailDocId, normalizeEmail } from "@/lib/email";
import type { AllowlistEntry, UserProfile } from "@/lib/types";

// Training material (cores / units / videos) lives in course-data.ts.

/**
 * Determines admin status by CAPABILITY, not by a client-side email compare —
 * so the admin's email never has to ship in the browser bundle. The allowlist
 * is admin-only per the security rules, so a successful read == admin.
 * Fails closed (returns false) on any error.
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    await getDocs(query(collection(db, "allowlist"), limit(1)));
    return true;
  } catch {
    return false;
  }
}

function newProfile(user: User, admin: boolean): UserProfile {
  return {
    uid: user.uid,
    email: normalizeEmail(user.email ?? ""),
    displayName: user.displayName || (user.email ?? "").split("@")[0],
    role: admin ? "admin" : "student",
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
  const admin = await checkIsAdmin();
  try {
    await setDoc(doc(db, "users", user.uid), newProfile(user, admin));
  } catch {
    throw notApproved();
  }
}

/**
 * Ensures a signed-in user has a profile (creating one on first sign-in) and
 * reports whether they are the admin. Both are decided by the security rules.
 * @throws Error with code "not-approved" when Firestore denies access.
 */
export async function ensureProfile(user: User): Promise<{ profile: UserProfile; isAdmin: boolean }> {
  const admin = await checkIsAdmin();
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile = newProfile(user, admin);
      await setDoc(ref, profile);
      return { profile, isAdmin: admin };
    }
    // Keep the stored role in sync with actual admin capability.
    const patch: Record<string, unknown> = { lastLoginAt: Date.now() };
    const storedRole = snap.get("role");
    if (admin && storedRole !== "admin") patch.role = "admin";
    await setDoc(ref, patch, { merge: true });
    return {
      profile: { uid: user.uid, ...(snap.data() as Omit<UserProfile, "uid">) },
      isAdmin: admin,
    };
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

