"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { metaForPath, navItems, pageMeta } from "@/lib/pageMeta";
import { useAuth } from "@/lib/auth-context";

const EVENT_TARGET = new Date("2026-10-24T00:00:00+04:00");

function currentSlug(pathname: string): string {
  const slug = pathname.split("/").filter(Boolean)[0];
  return slug && pageMeta[slug] ? slug : "dashboard";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const slug = currentSlug(pathname);
  const meta = metaForPath(pathname);

  const displayName = user?.displayName || user?.email || "Competitor";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const [collapsed, setCollapsed] = useState(false);
  const [countdown, setCountdown] = useState("-- days left");
  // Keep the admin accordion open while on an admin page.
  const [adminOpen, setAdminOpen] = useState(slug === "admin");

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
          </div>

          {isAdmin && (
            <div className="menu-section admin-section">
              <div className="menu-label">Admin</div>
              <button
                className={`menu-link admin-accordion-btn${adminOpen ? " open" : ""}${slug === "admin" ? " active" : ""}`}
                type="button"
                aria-expanded={adminOpen}
                onClick={() => setAdminOpen((prev) => !prev)}
              >
                <img
                  className="link-icon sidebar-vector-icon"
                  src="/assets/icon-sidebar-marking.svg"
                  alt=""
                  aria-hidden="true"
                />
                <span className="link-text">Admin Panel</span>
                <span className="admin-accordion-arrow" aria-hidden="true">&rsaquo;</span>
              </button>
              <div className={`admin-submenu${adminOpen ? " open" : ""}`}>
                <Link
                  href="/admin/users"
                  className={`admin-submenu-link${pathname.startsWith("/admin/users") ? " active" : ""}`}
                >
                  Users
                </Link>
                <Link
                  href="/admin/course"
                  className={`admin-submenu-link${pathname.startsWith("/admin/course") ? " active" : ""}`}
                >
                  Training Material
                </Link>
              </div>
            </div>
          )}
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
