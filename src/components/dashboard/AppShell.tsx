"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems, pageMeta } from "@/lib/pageMeta";
import { useAuth } from "@/lib/auth-context";

const EVENT_TARGET = new Date("2026-10-24T00:00:00+04:00");
const THEME_STORAGE_KEY = "tv-dashboard-theme";

function currentSlug(pathname: string): string {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug && pageMeta[slug] ? slug : "dashboard";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const slug = currentSlug(pathname);
  const meta = pageMeta[slug];

  const displayName = user?.displayName || user?.email || "Competitor";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [countdown, setCountdown] = useState("-- days left");

  useEffect(() => {
    // Hydrate the persisted theme on mount (localStorage is client-only).
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "dark") setIsDark(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
  }, [isDark]);

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

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }

  return (
    <div className={`app-container${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="nav-sidebar">
        <div className="sidebar-brand">
          <img
            className="brand-logo"
            src="/assets/actvet_emiratesskills_logo_white.svg"
            alt="ACTVET EmiratesSkills"
          />
        </div>

        <div className="sidebar-skill-title">
          <span className="sidebar-program-title">E-Training</span>
          <span className="sidebar-skill-name">#50 - 3D Digital Game Art</span>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section">
            <div className="menu-label">Main</div>
            {navItems.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className={`menu-link${slug === item.slug ? " active" : ""}`}
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
            {isAdmin && (
              <Link
                href="/admin"
                className={`menu-link${slug === "admin" ? " active" : ""}`}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-marking.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Admin Panel</span>
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
              onClick={() => router.push("/profile")}
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
            <button
              className="theme-toggle"
              id="theme-toggle"
              type="button"
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
              onClick={toggleTheme}
            >
              <span className="theme-toggle-icon sun-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              </span>
              <span className="theme-toggle-icon moon-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.99 12.68A8.5 8.5 0 1 1 11.32 3.01 6.5 6.5 0 0 0 20.99 12.68z" />
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
              <div className="pgtop-stat">
                <span className="pgtop-stat-value has-icon">
                  <img className="pgtop-stat-icon" src="/assets/icon-top-training-hours.svg" alt="" aria-hidden="true" />
                  186 h
                </span>
                <span className="pgtop-stat-label">Training hours</span>
              </div>
              <div className="pgtop-divider"></div>
              <div className="pgtop-stat">
                <span className="pgtop-stat-value has-icon">
                  <img className="pgtop-stat-icon" src="/assets/icon-top-level.svg" alt="" aria-hidden="true" />
                  Level 2
                </span>
                <span className="pgtop-stat-label">CU 6</span>
              </div>
              <div className="pgtop-divider"></div>
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
