"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems, pageMeta } from "@/lib/pageMeta";
import { useAuth } from "@/lib/auth-context";

const EVENT_TARGET = new Date("2026-10-24T00:00:00+04:00");

function currentSlug(pathname: string): string {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug && pageMeta[slug] ? slug : "training";
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
  const [countdown, setCountdown] = useState("-- days left");

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

  return (
    <div className={`app-container${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="nav-sidebar">
        <div className="sidebar-brand">
          <span className="brand-text">E-Training System</span>
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
            {(isTeacher || isAdmin) && (
              <Link
                href="/students"
                className={`menu-link${slug === "students" ? " active" : ""}`}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-marking.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Manage Students</span>
              </Link>
            )}
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
