"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchStudents } from "@/lib/data";
import { getTrainingProgressForUsers, type TrainingProgress } from "@/lib/progress";
import { fetchAllTasks, fetchTaskCompletionsForUsers } from "@/lib/tasks";
import { countAllLessons } from "@/lib/curriculum";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";

const TOTAL_LESSONS = countAllLessons();

type StudentRow = {
  student: UserProfile;
  progress: TrainingProgress | null;
  videosCompleted: number;
  percent: number;
  tasksCompleted: number;
};

function formatLastActive(updatedAt?: number): string {
  if (!updatedAt) return "Never";
  const days = Math.floor((Date.now() - updatedAt) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(updatedAt).toLocaleDateString();
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="progress-stat-card glass">
      <span className="progress-stat-value">{value}</span>
      <span className="progress-stat-label">{label}</span>
      {sublabel && <span className="progress-stat-sublabel">{sublabel}</span>}
    </div>
  );
}

function ProgressPageContent() {
  const { isAdmin, profile } = useAuth();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => {
    if (!isAdmin && !profile?.school) return;
    let cancelled = false;
    fetchStudents(isAdmin ? {} : { school: profile?.school })
      .then(async (students) => {
        const uids = students.map((s) => s.uid);
        const [progressByUid, allTasks, completionsByUid] = await Promise.all([
          getTrainingProgressForUsers(uids),
          fetchAllTasks(),
          fetchTaskCompletionsForUsers(uids),
        ]);
        if (cancelled) return;
        setTotalTasks(allTasks.length);
        const nextRows: StudentRow[] = students.map((student) => {
          const progress = progressByUid.get(student.uid) ?? null;
          const videosCompleted = Math.min(progress?.watchedKeys?.length ?? 0, TOTAL_LESSONS);
          const percent = TOTAL_LESSONS ? Math.round((videosCompleted / TOTAL_LESSONS) * 100) : 0;
          const tasksCompleted = Math.min(
            completionsByUid.get(student.uid)?.size ?? 0,
            allTasks.length,
          );
          return { student, progress, videosCompleted, percent, tasksCompleted };
        });
        nextRows.sort((a, b) => b.percent - a.percent);
        setRows(nextRows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, profile?.school]);

  const schoolOptions = useMemo(() => {
    const schools = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.student.school) schools.add(r.student.school);
    });
    return Array.from(schools).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (!schoolFilter) return rows ?? [];
    return (rows ?? []).filter((r) => r.student.school === schoolFilter);
  }, [rows, schoolFilter]);

  const stats = useMemo(() => {
    const list = visibleRows;
    const totalStudents = list.length;
    const totalVideosCompleted = list.reduce((sum, r) => sum + r.videosCompleted, 0);
    const averagePercent = totalStudents
      ? Math.round(list.reduce((sum, r) => sum + r.percent, 0) / totalStudents)
      : 0;
    const notStarted = list.filter((r) => r.videosCompleted === 0).length;
    const completed = list.filter((r) => r.percent >= 100).length;
    const totalTasksCompleted = list.reduce((sum, r) => sum + r.tasksCompleted, 0);
    const averageTaskPercent =
      totalStudents && totalTasks
        ? Math.round(list.reduce((sum, r) => sum + (r.tasksCompleted / totalTasks) * 100, 0) / totalStudents)
        : 0;
    return {
      totalStudents,
      totalVideosCompleted,
      averagePercent,
      notStarted,
      completed,
      totalTasksCompleted,
      averageTaskPercent,
    };
  }, [visibleRows, totalTasks]);

  return (
    <main id="progress" className="section active">
      <div className="profile-page">
        <section className="progress-stats-grid">
          <StatCard label="Students" value={String(stats.totalStudents)} />
          <StatCard label="Average completion" value={`${stats.averagePercent}%`} />
          <StatCard
            label="Videos completed"
            value={String(stats.totalVideosCompleted)}
            sublabel={`out of ${TOTAL_LESSONS} per student`}
          />
          <StatCard label="Not started" value={String(stats.notStarted)} />
          <StatCard label="Fully completed" value={String(stats.completed)} />
          {totalTasks > 0 && (
            <>
              <StatCard label="Average task completion" value={`${stats.averageTaskPercent}%`} />
              <StatCard
                label="Tasks completed"
                value={String(stats.totalTasksCompleted)}
                sublabel={`out of ${totalTasks} per student`}
              />
            </>
          )}
        </section>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Students Progress</h2>
              <p>{isAdmin ? "Every student in the system." : "Students at your school."}</p>
            </div>
            {schoolOptions.length > 1 && (
              <div className="admin-field admin-filter-field">
                <label htmlFor="progress-school-filter">Filter by school</label>
                <select
                  id="progress-school-filter"
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                >
                  <option value="">All schools</option>
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="admin-table-wrap">
            {rows === null ? (
              <p className="admin-empty">Loading…</p>
            ) : visibleRows.length === 0 ? (
              <p className="admin-empty">No students yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>School</th>
                    <th>Completion</th>
                    <th>Videos completed</th>
                    {totalTasks > 0 && <th>Tasks completed</th>}
                    <th>Last active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.student.uid}>
                      <td>{row.student.displayName}</td>
                      <td>{row.student.school ?? "—"}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${row.percent}%` }} />
                          </div>
                          <span className="progress-cell-value">{row.percent}%</span>
                        </div>
                      </td>
                      <td>{row.videosCompleted}/{TOTAL_LESSONS}</td>
                      {totalTasks > 0 && <td>{row.tasksCompleted}/{totalTasks}</td>}
                      <td>{formatLastActive(row.progress?.updatedAt)}</td>
                      <td>
                        <Link href={`/progress/${row.student.uid}`} className="admin-link-btn">
                          View tasks
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ProgressPage() {
  return (
    <RoleGuard allow="teacher-or-admin">
      <ProgressPageContent />
    </RoleGuard>
  );
}
