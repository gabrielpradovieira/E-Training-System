"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { changeOwnPassword } from "@/lib/data";

function friendlyPasswordError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is incorrect.";
    case "auth/weak-password":
      return "New password is too weak. Use at least 8 characters.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }
}

function ChangePasswordForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setStatus(null);

    if (newPassword.length < 8) {
      setStatus({ kind: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "New password and confirmation don't match." });
      return;
    }

    setBusy(true);
    try {
      await changeOwnPassword(user, currentPassword, newPassword);
      setStatus({ kind: "success", message: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus({ kind: "error", message: friendlyPasswordError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>
      {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
      <button className="admin-submit-btn" type="submit" disabled={busy}>
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { user, profile } = useAuth();

  const displayName = profile?.displayName || user?.displayName || "—";
  const email = profile?.email || user?.email || "—";
  const school = profile?.school || "—";
  const role = profile?.role === "admin" ? "Admin" : profile?.role === "teacher" ? "Teacher" : "Student";
  const canChangeOwnPassword = profile?.role === "teacher" || profile?.role === "admin";

  const fields = [
    { label: "Full name", value: displayName },
    { label: "Email", value: email },
    { label: "School", value: school },
    { label: "Role", value: role },
  ];

  return (
    <main id="profile" className="section active">
      <div className="profile-page">
        <section className="profile-card glass">
          <div className="profile-card-head">
            <div className="profile-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>Student profile and registration details</p>
            </div>
          </div>
          <div className="profile-details">
            {fields.map((field) => (
              <div className="profile-field" key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {canChangeOwnPassword && (
          <section className="profile-card glass">
            <div className="profile-card-head">
              <div>
                <h2>Change password</h2>
                <p>Set a new password for your own account.</p>
              </div>
            </div>
            <ChangePasswordForm />
          </section>
        )}
      </div>
    </main>
  );
}
