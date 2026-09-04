"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CurriculumLevel } from "@/lib/curriculum";

export type TrainingProgress = {
  level: CurriculumLevel;
  lessonKey: string;
  updatedAt: number;
};

function progressRef(uid: string) {
  return doc(db, "users", uid, "progress", "training");
}

export async function getTrainingProgress(uid: string): Promise<TrainingProgress | null> {
  const snap = await getDoc(progressRef(uid));
  return snap.exists() ? (snap.data() as TrainingProgress) : null;
}

export async function saveTrainingProgress(uid: string, level: CurriculumLevel, lessonKey: string): Promise<void> {
  await setDoc(progressRef(uid), { level, lessonKey, updatedAt: Date.now() });
}
