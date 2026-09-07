"use client";

import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { getSecondaryAuth } from "@/lib/firebase/secondary";
import { emailDocId, normalizeEmail } from "@/lib/email";
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
      mustChangePassword: true,
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
 * Grants an account (typically a teacher) full admin access, by writing a
 * doc keyed by their email to the admins/ collection — checked by
 * isAdmin() in firestore.rules alongside the primary ADMIN_EMAIL. Their
 * profile's role is left as-is (e.g. still "teacher"), so they keep
 * showing up in Manage Teachers, but every admin-only page/action now
 * opens up for them too. Admin only, per the security rules.
 */
export async function grantAdmin(email: string, grantedByUid: string): Promise<void> {
  await setDoc(doc(db, "admins", emailDocId(email)), {
    email: normalizeEmail(email),
    grantedAt: Date.now(),
    grantedBy: grantedByUid,
  });
}

/** Revokes a previously granted admin access. Admin only, per the security rules. */
export async function revokeAdmin(email: string): Promise<void> {
  await deleteDoc(doc(db, "admins", emailDocId(email)));
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
 * Resets a managed account's (teacher or student) password back to the
 * default Firstname.Lastname scheme and flags the account so it must be
 * changed again after the next login. This is the only way an admin (or,
 * for a student, their own teacher) can affect another account's password
 * — nobody can see or set an arbitrary password for someone else.
 */
async function resetManagedPassword(account: UserProfile): Promise<string> {
  const newPassword = generateTeacherPassword(account.displayName);
  if (!account.password) {
    const e = new Error("No current password on file for this account — use \"Send reset email\" instead.");
    (e as Error & { code?: string }).code = "no-password-on-file";
    throw e;
  }
  if (newPassword !== account.password) {
    try {
      await changeManagedUserPassword(account.email, account.password, newPassword);
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
    doc(db, "users", account.uid),
    { password: newPassword, mustChangePassword: true },
    { merge: true },
  );
  return newPassword;
}

/** Resets a teacher's password back to the default Firstname.Lastname scheme. Admin only. */
export async function resetTeacherPassword(teacher: UserProfile): Promise<string> {
  return resetManagedPassword(teacher);
}

/** Resets a student's password back to the default Firstname.Lastname scheme. Admin or their own teacher. */
export async function resetStudentPassword(student: UserProfile): Promise<string> {
  return resetManagedPassword(student);
}

/**
 * Sends a Firebase "reset your password" email to a managed account, for
 * when its stored current password no longer matches the real one (so the
 * secondary-auth sign-in used elsewhere can't work) — the only account
 * recovery path available without an Admin SDK. Doesn't touch Firestore;
 * the account's mustChangePassword flag stays as-is since the account holder
 * will set their own password via the email link.
 */
export async function sendManagedPasswordResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** @deprecated use {@link sendManagedPasswordResetEmail} — kept as an alias. */
export const sendTeacherPasswordResetEmail = sendManagedPasswordResetEmail;

/**
 * Updates a teacher's display name / school. Nobody but the teacher
 * themselves can set their password — an admin can only reset it back to
 * the default (see {@link resetTeacherPassword}).
 */
export async function updateTeacher(params: {
  uid: string;
  displayName: string;
  school?: string;
}): Promise<void> {
  const { uid, displayName, school } = params;
  await setDoc(doc(db, "users", uid), { displayName, ...(school ? { school } : {}) }, { merge: true });
}

/**
 * Updates a student's display name / school. Nobody but the student
 * themselves can set their password — an admin or their own teacher can
 * only reset it back to the default (see {@link resetStudentPassword}).
 */
export async function updateStudent(params: {
  uid: string;
  displayName: string;
  school: string;
}): Promise<void> {
  const { uid, displayName, school } = params;
  await setDoc(doc(db, "users", uid), { displayName, school }, { merge: true });
}

/**
 * Deletes a teacher account: signs into it (using its current password on
 * file) with the secondary auth instance to remove the real Firebase Auth
 * account — a user can always delete their own account, which is the only
 * account-deletion path available without an Admin SDK — then removes its
 * Firestore profile. If the stored password no longer matches (or none is
 * on file) the Auth account can't be removed this way; the profile is still
 * deleted so the teacher immediately loses all access, but the orphaned
 * Auth account itself will need removing by hand in the Firebase Console
 * (Authentication tab) if it must be fully gone.
 */
export async function deleteTeacher(teacher: UserProfile): Promise<{ authDeleted: boolean }> {
  let authDeleted = false;
  if (teacher.password) {
    const secondaryAuth = getSecondaryAuth();
    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, teacher.email, teacher.password);
      await deleteUser(cred.user);
      authDeleted = true;
    } catch {
      await fbSignOut(secondaryAuth).catch(() => {});
    }
  }
  await deleteDoc(doc(db, "users", teacher.uid));
  return { authDeleted };
}

/**
 * Deletes a student account: signs into it (using its current password on
 * file) with the secondary auth instance to remove the real Firebase Auth
 * account, then removes its Firestore profile. Same caveat as
 * {@link deleteTeacher}: if the stored password no longer matches (or none
 * is on file) the Auth account can't be removed this way, but the profile
 * is still deleted so the student immediately loses all access.
 */
export async function deleteStudent(student: UserProfile): Promise<{ authDeleted: boolean }> {
  let authDeleted = false;
  if (student.password) {
    const secondaryAuth = getSecondaryAuth();
    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, student.email, student.password);
      await deleteUser(cred.user);
      authDeleted = true;
    } catch {
      await fbSignOut(secondaryAuth).catch(() => {});
    }
  }
  await deleteDoc(doc(db, "users", student.uid));
  return { authDeleted };
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

/** A single student's profile (admin, or their own teacher — per security rules). */
export async function fetchStudentProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as Omit<UserProfile, "uid">) };
}
