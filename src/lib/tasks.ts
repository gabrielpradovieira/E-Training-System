"use client";

import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CurriculumLevel } from "@/lib/curriculum";

export type LessonTask = {
  id: string;
  level: CurriculumLevel;
  lessonKey: string;
  name: string;
  link: string;
  createdAt: number;
  createdBy: string;
};

export type TaskCompletion = {
  taskId: string;
  link: string;
  completedAt: number;
};

function tasksCollection() {
  return collection(db, "tasks");
}

/** Every task attached to lessons in one curriculum level. */
export async function fetchTasksForLevel(level: CurriculumLevel): Promise<LessonTask[]> {
  const snap = await getDocs(query(tasksCollection(), where("level", "==", level)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LessonTask, "id">) }));
}

/** Every task in the system, across every level (for totals/stats). */
export async function fetchAllTasks(): Promise<LessonTask[]> {
  const snap = await getDocs(tasksCollection());
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LessonTask, "id">) }));
}

/** Admin-only: attaches a new task to a lesson. */
export async function createTask(params: {
  level: CurriculumLevel;
  lessonKey: string;
  name: string;
  link: string;
  createdBy: string;
}): Promise<LessonTask> {
  const ref = doc(tasksCollection());
  const task: LessonTask = {
    id: ref.id,
    level: params.level,
    lessonKey: params.lessonKey,
    name: params.name.trim(),
    link: params.link.trim(),
    createdAt: Date.now(),
    createdBy: params.createdBy,
  };
  await setDoc(ref, task);
  return task;
}

/** Admin-only: removes a task (and leaves any students' completions orphaned but harmless). */
export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", taskId));
}

function completionsCollection(uid: string) {
  return collection(db, "users", uid, "taskCompletions");
}

/** A user's own task completions, keyed by task id. */
export async function fetchTaskCompletions(uid: string): Promise<Map<string, TaskCompletion>> {
  const snap = await getDocs(completionsCollection(uid));
  const map = new Map<string, TaskCompletion>();
  snap.docs.forEach((d) => map.set(d.id, d.data() as TaskCompletion));
  return map;
}

/** Task completions for many users at once, keyed by uid then task id. */
export async function fetchTaskCompletionsForUsers(
  uids: string[],
): Promise<Map<string, Map<string, TaskCompletion>>> {
  const entries = await Promise.all(
    uids.map(async (uid) => [uid, await fetchTaskCompletions(uid).catch(() => new Map<string, TaskCompletion>())] as const),
  );
  return new Map(entries);
}

/** Marking a task complete requires the student's own submission link. */
export async function markTaskCompleted(uid: string, taskId: string, link: string): Promise<void> {
  await setDoc(doc(db, "users", uid, "taskCompletions", taskId), {
    taskId,
    link: link.trim(),
    completedAt: Date.now(),
  });
}

export async function unmarkTaskCompleted(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "taskCompletions", taskId));
}
