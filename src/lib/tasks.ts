"use client";

import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { buildGlobalLessonNumbers, type CurriculumLevel } from "@/lib/curriculum";

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

// Position of each lesson in the curriculum (continuous across both levels)
// — the basis for task ordering, since tasks are always pinned to a lesson.
const LESSON_NUMBERS = buildGlobalLessonNumbers();

/**
 * Orders tasks by their lesson's position in the curriculum (continuous
 * across both levels), then by creation time for multiple tasks pinned to
 * the same lesson. This is the single source of task order used everywhere
 * ("Task 01", "Task 02", ...) — since it's always derived, never stored,
 * adding a new task automatically slots it into place and renumbers
 * everything downstream without any manual reordering step.
 */
export function sortTasksByOrder(tasks: LessonTask[]): LessonTask[] {
  return [...tasks].sort((a, b) => {
    const an = LESSON_NUMBERS.get(a.lessonKey) ?? 0;
    const bn = LESSON_NUMBERS.get(b.lessonKey) ?? 0;
    if (an !== bn) return an - bn;
    return a.createdAt - b.createdAt;
  });
}

/** Task id -> its 1-based "Task 01" style ordinal, computed across ALL tasks in the system. */
export function buildTaskOrdinals(allTasks: LessonTask[]): Map<string, number> {
  const map = new Map<string, number>();
  sortTasksByOrder(allTasks).forEach((task, index) => map.set(task.id, index + 1));
  return map;
}

/** Formats a task ordinal as e.g. "01", "12". */
export function formatTaskNumber(n: number): string {
  return String(n).padStart(2, "0");
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

/**
 * Task completions for many users at once, keyed by uid then task id.
 * `failedUids` lists any reads that errored, so a permission problem
 * doesn't silently masquerade as "this student completed nothing."
 */
export async function fetchTaskCompletionsForUsers(
  uids: string[],
): Promise<{ data: Map<string, Map<string, TaskCompletion>>; failedUids: string[] }> {
  const failedUids: string[] = [];
  const entries = await Promise.all(
    uids.map(async (uid) => {
      try {
        return [uid, await fetchTaskCompletions(uid)] as const;
      } catch {
        failedUids.push(uid);
        return [uid, new Map<string, TaskCompletion>()] as const;
      }
    }),
  );
  return { data: new Map(entries), failedUids };
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
