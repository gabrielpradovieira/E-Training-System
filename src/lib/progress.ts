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
