"use client";

import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { emailDocId, normalizeEmail } from "@/lib/email";
import type {
  AllowlistEntry,
  CourseSection,
  SectionInput,
  UserProfile,
  VideoDoc,
  VideoInput,
} from "@/lib/types";

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

/* ---------------- Course: sections + videos (read: approved; write: admin) --------------- */

/** The course's sections, in order. */
export async function fetchSections(): Promise<CourseSection[]> {
  const snap = await getDocs(collection(db, "sections"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? "Untitled section",
        description: data.description ?? "",
        order: data.order ?? 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as CourseSection;
    })
    .sort((a, b) => a.order - b.order);
}

export async function createSection(input: SectionInput): Promise<string> {
  const ref = await addDoc(collection(db, "sections"), {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateSection(id: string, patch: Partial<SectionInput>): Promise<void> {
  await updateDoc(doc(db, "sections", id), { ...patch, updatedAt: Date.now() });
}

/** Deletes a section and every video inside it. */
export async function deleteSection(id: string): Promise<void> {
  const videos = await getDocs(query(collection(db, "videos"), where("sectionId", "==", id)));
  await Promise.all(videos.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "sections", id));
}

/** All videos, grouped by sectionId and sorted by order within each section. */
export async function fetchVideosBySection(): Promise<Record<string, VideoDoc[]>> {
  const snap = await getDocs(collection(db, "videos"));
  const bySection: Record<string, VideoDoc[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const video: VideoDoc = {
      id: d.id,
      sectionId: data.sectionId ?? "",
      order: data.order ?? 0,
      title: data.title ?? "Untitled",
      description: data.description ?? "",
      embedUrl: data.embedUrl ?? "",
      requiredTools: Array.isArray(data.requiredTools) ? data.requiredTools : [],
      materials: Array.isArray(data.materials) ? data.materials : [],
      instructions: data.instructions ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    (bySection[video.sectionId] ??= []).push(video);
  });
  Object.values(bySection).forEach((list) => list.sort((a, b) => a.order - b.order));
  return bySection;
}

export async function createVideo(input: VideoInput): Promise<string> {
  const ref = await addDoc(collection(db, "videos"), {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateVideo(
  id: string,
  patch: Partial<Omit<VideoInput, "sectionId">>,
): Promise<void> {
  await updateDoc(doc(db, "videos", id), { ...patch, updatedAt: Date.now() });
}

export async function deleteVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, "videos", id));
}

/**
 * Swaps the `order` of two documents — the primitive behind the up/down
 * reorder arrows.
 */
export async function swapOrder(
  collectionName: "sections" | "videos",
  a: { id: string; order: number },
  b: { id: string; order: number },
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, collectionName, a.id), { order: b.order, updatedAt: Date.now() }),
    updateDoc(doc(db, collectionName, b.id), { order: a.order, updatedAt: Date.now() }),
  ]);
}
