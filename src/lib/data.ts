"use client";

import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { getSecondaryAuth } from "@/lib/firebase/secondary";
import { normalizeEmail } from "@/lib/email";
import { generateTeacherPassword } from "@/lib/generated-password";
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
      password,
      ...(school ? { school } : {}),
      ...(role === "teacher" ? { mustChangePassword: true } : {}),
    };
    await setDoc(doc(db, "users", cred.user.uid), profile);
    return profile;
  } finally {
    // The secondary auth instance's session is scratch — always drop it,
    // success or failure, so it never lingers as a stray signed-in state.
    await fbSignOut(secondaryAuth).catch(() => {});
  }
}

/**
 * Changes another account's Firebase Auth password, without disturbing the
 * caller's own session. Requires the account's *current* password (we keep
 * it in Firestore precisely so this is possible) — signs into the secondary
 * auth instance as that account, updates the password there, signs out.
 */
async function changeManagedUserPassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
  const secondaryAuth = getSecondaryAuth();
  const cred = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword);
  try {
    await updatePassword(cred.user, newPassword);
  } finally {
    await fbSignOut(secondaryAuth).catch(() => {});
  }
}

/**
 * Lets a signed-in user (teacher or admin) change their own password from
 * their account settings. Firebase requires a recent sign-in for this, so
 * it re-authenticates with the current password first.
 */
export async function changeOwnPassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email ?? "", currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  await setDoc(
    doc(db, "users", user.uid),
    { password: newPassword, mustChangePassword: false },
    { merge: true },
  );
}

/**
 * Resets a teacher's password back to the default Firstname.Lastname scheme
 * and flags the account so they must change it again after their next login.
 * Used by an admin to bring an already-created teacher onto the new scheme.
 */
export async function resetTeacherPassword(teacher: UserProfile): Promise<string> {
  const newPassword = generateTeacherPassword(teacher.displayName);
  if (!teacher.password) {
    const e = new Error("No current password on file for this account — use \"Send reset email\" instead.");
    (e as Error & { code?: string }).code = "no-password-on-file";
    throw e;
  }
  if (newPassword !== teacher.password) {
    try {
      await changeManagedUserPassword(teacher.email, teacher.password, newPassword);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        const e = new Error(
          "The password on file doesn't match this account's real password anymore — use \"Send reset email\" instead.",
        );
        (e as Error & { code?: string }).code = "stale-password-on-file";
        throw e;
      }
      throw err;
    }
  }
  await setDoc(
    doc(db, "users", teacher.uid),
    { password: newPassword, mustChangePassword: true },
    { merge: true },
  );
  return newPassword;
}

/**
 * Sends a Firebase "reset your password" email to a managed account, for
 * when its stored current password no longer matches the real one (so the
 * secondary-auth sign-in used elsewhere can't work) — the only account
 * recovery path available without an Admin SDK. Doesn't touch Firestore;
 * the account's mustChangePassword flag stays as-is since the teacher will
 * set their own password via the email link.
 */
export async function sendTeacherPasswordResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Updates a teacher's display name / school, and optionally their password
 * (admin sets a new one directly). Leaves email untouched.
 */
export async function updateTeacher(params: {
  uid: string;
  currentEmail: string;
  currentPassword?: string;
  displayName: string;
  school?: string;
  newPassword?: string;
}): Promise<void> {
  const { uid, currentEmail, currentPassword, displayName, school, newPassword } = params;
  const patch: Record<string, unknown> = { displayName, ...(school ? { school } : {}) };

  if (newPassword && newPassword !== currentPassword) {
    if (!currentPassword) {
      throw new Error("Can't change this account's password — its current password isn't on file.");
    }
    await changeManagedUserPassword(currentEmail, currentPassword, newPassword);
    patch.password = newPassword;
    patch.mustChangePassword = true;
  }

  await setDoc(doc(db, "users", uid), patch, { merge: true });
}

/**
 * Updates a student's display name / school. Since a student's password is
 * always derived from their name + school, editing either regenerates it to
 * match (and updates the real Firebase Auth password to keep it in sync).
 */
export async function updateStudent(params: {
  uid: string;
  currentEmail: string;
  currentPassword?: string;
  displayName: string;
  school: string;
  regeneratePassword: (displayName: string, school: string) => string;
}): Promise<{ password?: string }> {
  const { uid, currentEmail, currentPassword, displayName, school, regeneratePassword } = params;
  const patch: Record<string, unknown> = { displayName, school };

  const nextPassword = regeneratePassword(displayName, school);
  if (currentPassword && nextPassword !== currentPassword) {
    await changeManagedUserPassword(currentEmail, currentPassword, nextPassword);
    patch.password = nextPassword;
  }

  await setDoc(doc(db, "users", uid), patch, { merge: true });
  return { password: patch.password as string | undefined };
}

/** All teacher accounts (admin only, per security rules). */
export async function fetchTeachers(): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}

/**
 * Student accounts visible to the caller: every student for an admin, or
 * only the ones at a given teacher's own school (teachers never see other
 * schools' students, even ones added by a different teacher at that school).
 */
export async function fetchStudents(scope: { school?: string }): Promise<UserProfile[]> {
  const constraints = [where("role", "==", "student")];
  if (scope.school) constraints.push(where("school", "==", scope.school));
  const snap = await getDocs(query(collection(db, "users"), ...constraints));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}
