"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CurriculumLevel } from "@/lib/curriculum";

export type TrainingProgress = {
  level: CurriculumLevel;
  lessonKey: string;
  watchedKeys?: string[];
  updatedAt: number;
};

function progressRef(uid: string) {
  return doc(db, "users", uid, "progress", "training");
}

export async function getTrainingProgress(uid: string): Promise<TrainingProgress | null> {
  const snap = await getDoc(progressRef(uid));
  return snap.exists() ? (snap.data() as TrainingProgress) : null;
}

/** Records which lesson the student is currently on (for resuming later). */
export async function saveTrainingProgress(uid: string, level: CurriculumLevel, lessonKey: string): Promise<void> {
  await setDoc(progressRef(uid), { level, lessonKey, updatedAt: Date.now() }, { merge: true });
}

/** Records the full set of lessons the student has explicitly marked as watched. */
export async function saveWatchedLessons(uid: string, watchedKeys: string[]): Promise<void> {
  await setDoc(progressRef(uid), { watchedKeys, updatedAt: Date.now() }, { merge: true });
}

/**
 * Training progress for many users at once, keyed by uid (missing/
 * never-started -> null). `failedUids` lists any reads that errored (e.g.
 * a Firestore rules rejection) so callers can tell "genuinely no progress"
 * apart from "couldn't read this student's progress" — both would
 * otherwise look identical (null).
 */
export async function getTrainingProgressForUsers(
  uids: string[],
): Promise<{ data: Map<string, TrainingProgress | null>; failedUids: string[] }> {
  const failedUids: string[] = [];
  const entries = await Promise.all(
    uids.map(async (uid) => {
      try {
        return [uid, await getTrainingProgress(uid)] as const;
      } catch {
        failedUids.push(uid);
        return [uid, null] as const;
      }
    }),
  );
  return { data: new Map(entries), failedUids };
}
