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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="11" y1="18" x2="13" y2="18"></line>
    </svg>
  );
}

function ViewTasksIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 7 1.5 1.5L8 6" />
      <path d="m4 13 1.5 1.5L8 12" />
      <path d="M11 7h9" />
      <path d="M11 13h9" />
      <path d="M4 19h16" />
    </svg>
  );
}

function ProgressPageContent() {
  const { isAdmin, profile } = useAuth();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    if (!isAdmin && !profile?.school) return;
    let cancelled = false;
    fetchStudents(isAdmin ? {} : { school: profile?.school })
      .then(async (students) => {
        const uids = students.map((s) => s.uid);
        const [progressResult, allTasks, completionsResult] = await Promise.all([
          getTrainingProgressForUsers(uids),
          fetchAllTasks(),
          fetchTaskCompletionsForUsers(uids),
        ]);
        if (cancelled) return;
        setTotalTasks(allTasks.length);
        const failedUids = new Set([...progressResult.failedUids, ...completionsResult.failedUids]);
        setFailedCount(failedUids.size);
        const nextRows: StudentRow[] = students.map((student) => {
          const progress = progressResult.data.get(student.uid) ?? null;
          const videosCompleted = Math.min(progress?.watchedKeys?.length ?? 0, TOTAL_LESSONS);
          const percent = TOTAL_LESSONS ? Math.round((videosCompleted / TOTAL_LESSONS) * 100) : 0;
          const tasksCompleted = Math.min(
            completionsResult.data.get(student.uid)?.size ?? 0,
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
    let list = rows ?? [];
    if (schoolFilter) list = list.filter((r) => r.student.school === schoolFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.student.displayName.toLowerCase().includes(query) ||
          r.student.email.toLowerCase().includes(query),
      );
    }
    return list;
  }, [rows, schoolFilter, searchQuery]);

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
        {failedCount > 0 && (
          <div className="admin-status error">
            Couldn&apos;t load progress for {failedCount} student{failedCount === 1 ? "" : "s"} — their stats below
            show as 0/blank rather than their real numbers. This is usually outdated Firestore security rules;
            re-publish the latest <code>firestore.rules</code>.
          </div>
        )}
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

        <section className="profile-card glass roster-card">
          <div className="profile-card-head">
            <div>
              <h2>Students Progress</h2>
              <p>{isAdmin ? "Every student in the system." : "Students at your school."}</p>
            </div>
          </div>

          <div className="roster-toolbar">
            <div className="roster-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search students"
              />
            </div>
            {schoolOptions.length > 1 && (
              <div className="roster-filter">
                <FilterIcon />
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  aria-label="Filter by school"
                >
                  <option value="">All schools</option>
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="roster-table-wrap">
            {rows === null ? (
              <p className="admin-empty">Loading…</p>
            ) : visibleRows.length === 0 ? (
              <p className="admin-empty">No students match your search.</p>
            ) : (
              <table className="roster-table">
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
                      <td className="roster-name-cell">{row.student.displayName}</td>
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
                        <Link href={`/progress/${row.student.uid}`} className="roster-view-tasks-btn">
                          <ViewTasksIcon />
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
