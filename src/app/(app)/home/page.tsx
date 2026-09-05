"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getTrainingProgress } from "@/lib/progress";
import { fetchAllTasks, fetchTaskCompletions } from "@/lib/tasks";
import { countAllLessons, curriculumLevelLabels, formatCourseDuration, totalCourseDurationSeconds } from "@/lib/curriculum";

const TOTAL_LESSONS = countAllLessons();
const TOTAL_DURATION_LABEL = formatCourseDuration(totalCourseDurationSeconds());
const COURSE_TITLE = "Skills Challenge Preparation Course 2026";
const COURSE_MODULES = Object.values(curriculumLevelLabels);
const COMPETITION_DATE = "22/10/2026";

function CourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10.5V16c0 1 2.7 3 6 3s6-2 6-3v-5.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m10.5 9 4 3-4 3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 7 1.5 1.5L8 6" />
      <path d="m4 13 1.5 1.5L8 12" />
      <path d="m4 19 1.5 1.5L8 17" />
      <path d="M11 7h9" />
      <path d="M11 13h9" />
      <path d="M11 19h9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
    </svg>
  );
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const [watchedCount, setWatchedCount] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksCompletedCount, setTasksCompletedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getTrainingProgress(user.uid), fetchAllTasks(), fetchTaskCompletions(user.uid)])
      .then(([progress, tasks, completions]) => {
        if (cancelled) return;
        setWatchedCount(progress?.watchedKeys?.length ?? 0);
        setTasksTotal(tasks.length);
        setTasksCompletedCount(completions.size);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const videosCompleted = Math.min(watchedCount, TOTAL_LESSONS);
  const coursePercent = TOTAL_LESSONS ? Math.round((videosCompleted / TOTAL_LESSONS) * 100) : 0;
  const tasksCompleted = Math.min(tasksCompletedCount, tasksTotal);

  const displayName = profile?.displayName || user?.displayName || "there";
  const firstName = displayName.split(" ")[0];
  const role = profile?.role === "admin" ? "Admin" : profile?.role === "teacher" ? "Teacher" : "Student";

  return (
    <main id="home" className="section active">
      <div className="home-page">
        <section className="home-hero glass">
          <div className="home-hero-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="home-hero-info">
            <p className="home-hero-greeting">Welcome back, {firstName}</p>
            <h1 className="home-hero-name">{displayName}</h1>
            <div className="home-hero-meta">
              <span className="home-hero-badge">{role}</span>
              {profile?.school && <span>{profile.school}</span>}
              {profile?.email && <span>{profile.email}</span>}
            </div>
          </div>
        </section>

        <section className="home-stats-grid">
          <div className="progress-stat-card glass">
            <span className="progress-stat-value">{coursePercent}%</span>
            <span className="progress-stat-label">Course completion</span>
          </div>
          <div className="progress-stat-card glass">
            <span className="progress-stat-value">{videosCompleted}/{TOTAL_LESSONS}</span>
            <span className="progress-stat-label">Videos completed</span>
          </div>
          <div className="progress-stat-card glass">
            <span className="progress-stat-value">{tasksCompleted}/{tasksTotal}</span>
            <span className="progress-stat-label">Tasks completed</span>
          </div>
        </section>

        <section className="home-course-section">
          <div className="home-section-head">
            <h2>My Courses</h2>
          </div>
          <Link href="/training" className="home-course-card glass">
            <div className="home-course-banner">
              <CourseIcon />
            </div>
            <div className="home-course-body">
              <h3>{COURSE_TITLE}</h3>
              <div className="home-course-modules">
                {COURSE_MODULES.map((mod) => (
                  <span key={mod} className="home-course-module-pill">{mod}</span>
                ))}
              </div>
              <div className="home-course-details">
                <span><PlayIcon />{TOTAL_LESSONS} lessons</span>
                {tasksTotal > 0 && <span><ChecklistIcon />{tasksTotal} tasks</span>}
                <span><ClockIcon />{TOTAL_DURATION_LABEL} total</span>
              </div>
              <div className="home-course-competition">
                <CalendarIcon />
                <span>Competition date: <strong>{COMPETITION_DATE}</strong></span>
              </div>
              <div className="home-course-progress-row">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${coursePercent}%` }} />
                </div>
                <span className="progress-cell-value">{coursePercent}%</span>
              </div>
              <span className="home-course-cta">
                {videosCompleted === 0 ? "Start course" : coursePercent >= 100 ? "Review course" : "Continue learning"}
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
