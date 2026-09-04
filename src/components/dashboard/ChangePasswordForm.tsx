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

export default function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
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
      onSuccess?.();
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
