"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchStudentProfile } from "@/lib/data";
import {
  buildTaskOrdinals,
  fetchAllTasks,
  fetchTaskCompletions,
  formatTaskNumber,
  sortTasksByOrder,
  type LessonTask,
  type TaskCompletion,
} from "@/lib/tasks";
import { buildLessonInfoMap, curriculumLevelLabels, type CurriculumLevel } from "@/lib/curriculum";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";

const LESSON_INFO = buildLessonInfoMap();

const LEVEL_TABS: { level: CurriculumLevel; label: string }[] = (
  Object.keys(curriculumLevelLabels) as CurriculumLevel[]
).map((level) => ({ level, label: curriculumLevelLabels[level] }));

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

function OpenLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}

type StatusFilter = "all" | "submitted" | "pending";

function StudentTasksContent({ uid }: { uid: string }) {
  const [student, setStudent] = useState<UserProfile | null | undefined>(undefined);
  const [tasks, setTasks] = useState<LessonTask[] | null>(null);
  const [completions, setCompletions] = useState<Map<string, TaskCompletion>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<CurriculumLevel>("concept-art");

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

  const taskOrdinals = useMemo(() => buildTaskOrdinals(tasks ?? []), [tasks]);

  const orderedRows = useMemo(() => {
    return sortTasksByOrder(tasks ?? []).map((task) => ({
      task,
      completion: completions.get(task.id) ?? null,
    }));
  }, [tasks, completions]);

  const submittedCount = orderedRows.filter((r) => r.completion).length;
  const pendingCount = orderedRows.length - submittedCount;

  const levelRows = useMemo(
    () => orderedRows.filter((r) => r.task.level === levelFilter),
    [orderedRows, levelFilter],
  );

  const visibleRows = useMemo(() => {
    let list = levelRows;
    if (statusFilter === "submitted") list = list.filter((r) => r.completion);
    if (statusFilter === "pending") list = list.filter((r) => !r.completion);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((r) => {
        const info = LESSON_INFO.get(r.task.lessonKey);
        return (
          r.task.name.toLowerCase().includes(query) ||
          info?.label.toLowerCase().includes(query) ||
          info?.sectionTitle.toLowerCase().includes(query)
        );
      });
    }
    return list;
  }, [levelRows, statusFilter, searchQuery]);

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
              <span className="progress-stat-value">{submittedCount}</span>
              <span className="progress-stat-label">Submitted</span>
            </div>
            <div className="progress-stat-card glass">
              <span className="progress-stat-value">{pendingCount}</span>
              <span className="progress-stat-label">To do</span>
            </div>
            <div className="progress-stat-card glass">
              <span className="progress-stat-value">{orderedRows.length}</span>
              <span className="progress-stat-label">Total tasks</span>
            </div>
          </div>
        </section>

        <section className="profile-card glass roster-card">
          <div className="profile-card-head task-level-header">
            <div>
              <h2>Tasks</h2>
              <p>Every task assigned to this student, in curriculum order.</p>
            </div>
            <div className="curriculum-level-tabs" role="tablist" aria-label="Curriculum level filter">
              {LEVEL_TABS.map((tab) => (
                <button
                  key={tab.level}
                  className={`curriculum-level-tab${levelFilter === tab.level ? " active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={levelFilter === tab.level}
                  onClick={() => setLevelFilter(tab.level)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="roster-toolbar">
            <div className="roster-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search by task or lesson…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tasks"
              />
            </div>
            <div className="roster-filter">
              <FilterIcon />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="pending">To do</option>
              </select>
            </div>
          </div>

          <div className="roster-table-wrap">
            {levelRows.length === 0 ? (
              <p className="admin-empty">No tasks in this module yet.</p>
            ) : visibleRows.length === 0 ? (
              <p className="admin-empty">No tasks match your search.</p>
            ) : (
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Task</th>
                    <th>Lesson</th>
                    <th>Status</th>
                    <th>Link</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ task, completion }) => {
                    const info = LESSON_INFO.get(task.lessonKey);
                    return (
                      <tr key={task.id}>
                        <td className="task-number-cell">{formatTaskNumber(taskOrdinals.get(task.id) ?? 0)}</td>
                        <td className="roster-name-cell">{task.name}</td>
                        <td>
                          {info ? `${curriculumLevelLabels[info.level]} · ${info.sectionTitle} · ${info.label}` : "—"}
                        </td>
                        <td>
                          <span className={`task-status-pill${completion ? " submitted" : " pending"}`}>
                            {completion ? "Submitted" : "To do"}
                          </span>
                        </td>
                        <td>
                          <a
                            href={completion ? completion.link : task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="roster-view-tasks-btn"
                          >
                            <OpenLinkIcon />
                            {completion ? "View submission" : "Open task"}
                          </a>
                        </td>
                        <td>{completion ? formatDate(completion.completedAt) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
