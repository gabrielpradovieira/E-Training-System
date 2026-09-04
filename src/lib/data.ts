"use client";

import type { User } from "firebase/auth";
import { createUserWithEmailAndPassword, signOut as fbSignOut, updateProfile } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getSecondaryAuth } from "@/lib/firebase/secondary";
import { normalizeEmail } from "@/lib/email";
import type { UserProfile, UserRole } from "@/lib/types";

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

/**
 * Creates a new managed account (a teacher or a student) with a preset
 * password, without disturbing the caller's (admin's or teacher's) own
 * signed-in session. Uses a second, independent Firebase Auth instance for
 * the account-creation step, since Firebase Auth otherwise signs the
 * calling browser in as whichever account it just created.
 */
export async function createManagedUser(params: {
  displayName: string;
  email: string;
  password: string;
  role: Extract<UserRole, "teacher" | "student">;
  school?: string;
  createdByUid: string;
}): Promise<UserProfile> {
  const { displayName, email, password, role, school, createdByUid } = params;
  const normalizedEmail = normalizeEmail(email);
  const secondaryAuth = getSecondaryAuth();

  const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
  try {
    await updateProfile(cred.user, { displayName }).catch(() => {});
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: normalizedEmail,
      displayName,
      role,
      approved: true,
      totalHours: 0,
      createdAt: Date.now(),
      createdBy: createdByUid,
      ...(school ? { school } : {}),
    };
    await setDoc(doc(db, "users", cred.user.uid), profile);
    return profile;
  } finally {
    // The secondary auth instance's session is scratch — always drop it,
    // success or failure, so it never lingers as a stray signed-in state.
    await fbSignOut(secondaryAuth).catch(() => {});
  }
}

/** All teacher accounts (admin only, per security rules). */
export async function fetchTeachers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}

/**
 * Student accounts visible to the caller: every student for an admin,
 * or only the ones a given teacher created for a teacher.
 */
export async function fetchStudents(scope: { teacherUid?: string }): Promise<UserProfile[]> {
  const constraints = [where("role", "==", "student")];
  if (scope.teacherUid) constraints.push(where("createdBy", "==", scope.teacherUid));
  const snap = await getDocs(query(collection(db, "users"), ...constraints));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}
