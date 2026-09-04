"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchStudentProfile } from "@/lib/data";
import { fetchAllTasks, fetchTaskCompletions, type LessonTask, type TaskCompletion } from "@/lib/tasks";
import { buildLessonInfoMap, curriculumLevelLabels } from "@/lib/curriculum";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";

const LESSON_INFO = buildLessonInfoMap();

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StudentTasksContent({ uid }: { uid: string }) {
  const [student, setStudent] = useState<UserProfile | null | undefined>(undefined);
  const [tasks, setTasks] = useState<LessonTask[] | null>(null);
  const [completions, setCompletions] = useState<Map<string, TaskCompletion>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudentProfile(uid), fetchAllTasks(), fetchTaskCompletions(uid)])
      .then(([profile, allTasks, completionMap]) => {
        if (cancelled) return;
        setStudent(profile);
        setTasks(allTasks);
        setCompletions(completionMap);
      })
      .catch(() => {
        if (!cancelled) {
          setStudent(null);
          setError("Couldn't load this student — they may not be at your school, or no longer exist.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const { submitted, pending } = useMemo(() => {
    const submittedList: { task: LessonTask; completion: TaskCompletion }[] = [];
    const pendingList: LessonTask[] = [];
    (tasks ?? []).forEach((task) => {
      const completion = completions.get(task.id);
      if (completion) submittedList.push({ task, completion });
      else pendingList.push(task);
    });
    submittedList.sort((a, b) => b.completion.completedAt - a.completion.completedAt);
    return { submitted: submittedList, pending: pendingList };
  }, [tasks, completions]);

  if (student === undefined || tasks === null) {
    return (
      <main className="section active">
        <div className="profile-page">
          <p className="admin-empty">Loading…</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="section active">
        <div className="profile-page">
          <Link href="/progress" className="admin-link-btn">&lsaquo; Back to Students Progress</Link>
          <section className="profile-card glass">
            <p className="admin-empty">{error ?? "Student not found."}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section active">
      <div className="profile-page">
        <Link href="/progress" className="admin-link-btn">&lsaquo; Back to Students Progress</Link>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>{student.displayName}</h2>
              <p>{student.school ?? "—"} &middot; {student.email}</p>
            </div>
          </div>
          <div className="progress-stats-grid">
            <div className="progress-stat-card glass">
              <span className="progress-stat-value">{submitted.length}</span>
              <span className="progress-stat-label">Submitted</span>
            </div>
            <div className="progress-stat-card glass">
              <span className="progress-stat-value">{pending.length}</span>
              <span className="progress-stat-label">To do</span>
            </div>
            <div className="progress-stat-card glass">
              <span className="progress-stat-value">{tasks.length}</span>
              <span className="progress-stat-label">Total tasks</span>
            </div>
          </div>
        </section>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Submitted tasks</h2>
              <p>Tasks this student has already submitted, most recent first.</p>
            </div>
          </div>
          {submitted.length === 0 ? (
            <p className="admin-empty">No tasks submitted yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Lesson</th>
                    <th>Submission</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submitted.map(({ task, completion }) => {
                    const info = LESSON_INFO.get(task.lessonKey);
                    return (
                      <tr key={task.id}>
                        <td>{task.name}</td>
                        <td>
                          {info ? `${curriculumLevelLabels[info.level]} · ${info.sectionTitle} · ${info.label}` : "—"}
                        </td>
                        <td>
                          <a href={completion.link} target="_blank" rel="noopener noreferrer" className="admin-link-btn">
                            View submission
                          </a>
                        </td>
                        <td>{formatDate(completion.completedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Tasks still to do</h2>
              <p>Tasks assigned to this student that haven&apos;t been submitted yet.</p>
            </div>
          </div>
          {pending.length === 0 ? (
            <p className="admin-empty">{tasks.length === 0 ? "No tasks exist yet." : "All tasks submitted."}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Lesson</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((task) => {
                    const info = LESSON_INFO.get(task.lessonKey);
                    return (
                      <tr key={task.id}>
                        <td>{task.name}</td>
                        <td>
                          {info ? `${curriculumLevelLabels[info.level]} · ${info.sectionTitle} · ${info.label}` : "—"}
                        </td>
                        <td>
                          <a href={task.link} target="_blank" rel="noopener noreferrer" className="admin-link-btn">
                            Open task
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function StudentTasksPage() {
  const params = useParams<{ uid: string }>();
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid;

  return (
    <RoleGuard allow="teacher-or-admin">
      {uid ? <StudentTasksContent uid={uid} /> : <main className="section active"><div className="profile-page"><p className="admin-empty">Loading…</p></div></main>}
    </RoleGuard>
  );
}
