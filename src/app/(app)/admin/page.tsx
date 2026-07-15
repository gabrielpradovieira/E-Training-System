"use client";

import "@/styles/admin.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  addAllowlistEmail,
  fetchAllowlist,
  fetchAllUsers,
  removeAllowlistEmail,
} from "@/lib/data";
import type { AllowlistEntry, UserProfile } from "@/lib/types";

type Summary = { total: number; admins: number; students: number; totalHours: number };

function formatDate(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [allUsers, entries] = await Promise.all([fetchAllUsers(), fetchAllowlist()]);
      setUsers(allUsers);
      setSummary({
        total: allUsers.length,
        admins: allUsers.filter((u) => u.role === "admin").length,
        students: allUsers.filter((u) => u.role === "student").length,
        totalHours: allUsers.reduce((sum, u) => sum + (u.totalHours ?? 0), 0),
      });
      setAllowlist(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load admin data once the user is confirmed admin.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await addAllowlistEmail(newEmail, newName, user?.email ?? user?.uid ?? "admin");
      setNewEmail("");
      setNewName("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add email.");
    } finally {
      setAdding(false);
    }
  }

  async function removeEmail(email: string) {
    setError(null);
    try {
      await removeAllowlistEmail(email);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove email.");
    }
  }

  if (loading || !isAdmin) {
    return <div className="admin-page"><p className="admin-muted">Checking access…</p></div>;
  }

  return (
    <main className="section active">
      <div className="admin-page">
        {error && <div className="admin-error">{error}</div>}

        {/* Overview */}
        <div className="admin-summary-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{summary?.total ?? "—"}</div>
            <div className="admin-stat-label">Total users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{summary?.students ?? "—"}</div>
            <div className="admin-stat-label">Students</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{allowlist.length}</div>
            <div className="admin-stat-label">Approved emails</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{summary ? summary.totalHours.toFixed(0) : "—"}</div>
            <div className="admin-stat-label">Total training hours</div>
          </div>
        </div>

        {/* Users */}
        <section className="admin-card">
          <h2>Users</h2>
          <p className="admin-card-sub">Everyone with an account and their progress.</p>
          {dataLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : users.length === 0 ? (
            <p className="admin-muted">No users yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Hours</th>
                    <th>Joined</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td>{u.displayName || "—"}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`admin-badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td>{(u.totalHours ?? 0).toFixed(1)}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>{formatDate(u.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Allowlist management */}
        <section className="admin-card">
          <h2>Approved emails</h2>
          <p className="admin-card-sub">Only these emails can register. Add students here to invite them.</p>

          <form className="admin-add-form" onSubmit={addEmail}>
            <input
              type="email"
              placeholder="student@email.com"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Full name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="admin-btn" type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add email"}
            </button>
          </form>

          {dataLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : allowlist.length === 0 ? (
            <p className="admin-muted">No approved emails yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allowlist.map((entry) => (
                    <tr key={entry.email}>
                      <td>{entry.email}</td>
                      <td>{entry.displayName || "—"}</td>
                      <td>
                        <span className={`admin-badge ${entry.registered ? "registered" : "pending"}`}>
                          {entry.registered ? "Registered" : "Pending"}
                        </span>
                      </td>
                      <td>{formatDate(entry.addedAt)}</td>
                      <td>
                        <button className="admin-btn-danger" type="button" onClick={() => removeEmail(entry.email)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
