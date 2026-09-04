"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createManagedUser, fetchTeachers } from "@/lib/data";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";

function AddTeacherForm({ onCreated }: { onCreated: (teacher: UserProfile) => void }) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setStatus(null);
    setBusy(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const teacher = await createManagedUser({
        displayName,
        email,
        password,
        role: "teacher",
        createdByUid: user.uid,
      });
      onCreated(teacher);
      setStatus({ kind: "success", message: `Teacher account created for ${displayName}.` });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setStatus({ kind: "error", message: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="teacher-first-name">First name</label>
          <input
            id="teacher-first-name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="teacher-last-name">Last name</label>
          <input
            id="teacher-last-name"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="teacher-email">Email</label>
          <input
            id="teacher-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="teacher-password">Password</label>
          <input
            id="teacher-password"
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set the teacher's password"
          />
        </div>
      </div>
      {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
      <button className="admin-submit-btn" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create teacher account"}
      </button>
    </form>
  );
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }
}

function AdminPageContent() {
  const [teachers, setTeachers] = useState<UserProfile[] | null>(null);

  function reload() {
    fetchTeachers()
      .then((list) => setTeachers(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))))
      .catch(() => setTeachers([]));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <main id="admin" className="section active">
      <div className="profile-page">
        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Add a teacher</h2>
              <p>Create a teacher account. You choose the password yourself.</p>
            </div>
          </div>
          <AddTeacherForm onCreated={reload} />
        </section>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Teachers</h2>
              <p>Every teacher account in the system.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            {teachers === null ? (
              <p className="admin-empty">Loading…</p>
            ) : teachers.length === 0 ? (
              <p className="admin-empty">No teachers yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.uid}>
                      <td>{teacher.displayName}</td>
                      <td>{teacher.email}</td>
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

export default function AdminPage() {
  return (
    <RoleGuard allow="admin">
      <AdminPageContent />
    </RoleGuard>
  );
}
