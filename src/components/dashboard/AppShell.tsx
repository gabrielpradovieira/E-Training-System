"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems, pageMeta } from "@/lib/pageMeta";
import { useAuth } from "@/lib/auth-context";
import { countAllLessons } from "@/lib/curriculum";
import { getTrainingProgress } from "@/lib/progress";
import { fetchAllTasks, fetchTaskCompletions } from "@/lib/tasks";

const EVENT_TARGET = new Date("2026-10-24T00:00:00+04:00");
const TOTAL_LESSONS = countAllLessons();

function currentSlug(pathname: string): string {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug && pageMeta[slug] ? slug : "home";
}

function CompletionRing({ percent }: { percent: number }) {
  const size = 40;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="completion-ring" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="completion-ring-track"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="completion-ring-progress"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isTeacher, signOut } = useAuth();
  const slug = currentSlug(pathname);
  const meta = pageMeta[slug];

  const displayName = user?.displayName || user?.email || "Competitor";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState("-- days left");
  const [completedCount, setCompletedCount] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);

  useEffect(() => {
    const update = () => {
      const dayMs = 24 * 60 * 60 * 1000;
      const daysLeft = Math.max(0, Math.ceil((EVENT_TARGET.getTime() - Date.now()) / dayMs));
      setCountdown(`${daysLeft} day${daysLeft === 1 ? "" : "s"} left`);
    };
    update();
    const interval = setInterval(update, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Refetched on every navigation so marking a lesson watched on the
  // training page is reflected here as soon as the user moves elsewhere.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletedCount(0);
      return;
    }
    let cancelled = false;
    getTrainingProgress(user.uid)
      .then((progress) => {
        if (!cancelled) setCompletedCount(progress?.watchedKeys?.length ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  // Same refetch-on-navigation approach for task completion.
  useEffect(() => {
    if (!user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTasksTotal(0);
      setTasksCompleted(0);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    Promise.all([fetchAllTasks(), fetchTaskCompletions(user.uid)])
      .then(([allTasks, completions]) => {
        if (cancelled) return;
        setTasksTotal(allTasks.length);
        setTasksCompleted(completions.size);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const completionPercent = TOTAL_LESSONS
    ? Math.round((Math.min(completedCount, TOTAL_LESSONS) / TOTAL_LESSONS) * 100)
    : 0;

  const taskCompletionPercent = tasksTotal
    ? Math.round((Math.min(tasksCompleted, tasksTotal) / tasksTotal) * 100)
    : 0;

  return (
    <div
      className={`app-container${collapsed ? " sidebar-collapsed" : ""}${mobileMenuOpen ? " mobile-menu-open" : ""}`}
    >
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}
      <aside className="nav-sidebar">
        <div className="sidebar-brand">
          <img className="brand-icon" src="/assets/icon-brand-computer.svg" alt="" aria-hidden="true" />
          <span className="brand-text">E-Training System</span>
          <button
            type="button"
            className="mobile-menu-close-btn"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section">
            <div className="menu-label">Main</div>
            {navItems.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className={`menu-link${slug === item.slug ? " active" : ""}`}
                onClick={closeMobileMenu}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">{item.label}</span>
              </Link>
            ))}
            {(isTeacher || isAdmin) && (
              <Link
                href="/students"
                className={`menu-link${slug === "students" ? " active" : ""}`}
                onClick={closeMobileMenu}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-students.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Manage Students</span>
              </Link>
            )}
            {(isTeacher || isAdmin) && (
              <Link
                href="/progress"
                className={`menu-link${slug === "progress" ? " active" : ""}`}
                onClick={closeMobileMenu}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-dashboard.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Students Progress</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`menu-link${slug === "admin" ? " active" : ""}`}
                onClick={closeMobileMenu}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-teacher.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Manage Teachers</span>
              </Link>
            )}
          </div>
        </nav>

        <div className="sidebar-actions">
          <div className="sidebar-competitor-info">{displayName}</div>
          <div className="sidebar-actions-icons">
            <button
              className="profile-btn"
              id="profile-btn"
              type="button"
              aria-label="Profile"
              onClick={() => {
                closeMobileMenu();
                router.push("/profile");
              }}
            >
              <span className="profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
            </button>
            <button
              className="profile-btn"
              type="button"
              aria-label="Sign out"
              onClick={handleSignOut}
            >
              <span className="profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <div className="pgtop">
          <div className="pgtop-main">
            <button
              className="sidebar-toggle"
              id="sidebar-toggle"
              type="button"
              aria-label={collapsed ? "Expand side menu" : "Collapse side menu"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            <button
              className="mobile-menu-btn"
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
            <div className="pgtop-identity">
              <div className="pgtop-avatar" aria-hidden="true">
                <img id="pgtop-icon" src={meta.icon} alt="" aria-hidden="true" />
              </div>
              <div className="pgtop-info">
                <div className="pgtop-title-row">
                  <span className="pgtop-title" id="pgtop-title">{meta.title}</span>
                </div>
                <p className="pgtop-subtitle" id="pgtop-subtitle">{meta.description}</p>
              </div>
            </div>
            <div className="pgtop-stats">
              {tasksTotal > 0 && (
                <>
                  <div className="pgtop-stat pgtop-stat-completion">
                    <CompletionRing percent={taskCompletionPercent} />
                    <div>
                      <span className="pgtop-stat-value">{taskCompletionPercent}%</span>
                      <span className="pgtop-stat-label">{tasksCompleted}/{tasksTotal} tasks completed</span>
                    </div>
                  </div>
                  <div className="pgtop-divider" aria-hidden="true" />
                </>
              )}
              <div className="pgtop-stat pgtop-stat-completion">
                <CompletionRing percent={completionPercent} />
                <div>
                  <span className="pgtop-stat-value">{completionPercent}%</span>
                  <span className="pgtop-stat-label">{completedCount}/{TOTAL_LESSONS} lessons completed</span>
                </div>
              </div>
              <div className="pgtop-divider" aria-hidden="true" />
              <div className="pgtop-stat">
                <span className="pgtop-stat-value has-icon">
                  <img className="pgtop-stat-icon" src="/assets/icon-top-event.svg" alt="" aria-hidden="true" />
                  Skills Challenge 2026
                </span>
                <span className="pgtop-stat-label">Next event &middot; <span id="event-countdown">{countdown}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
