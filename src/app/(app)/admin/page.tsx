"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createManagedUser, fetchTeachers, resetTeacherPassword, updateTeacher } from "@/lib/data";
import { generateTeacherPassword } from "@/lib/generated-password";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";
import PasswordReveal from "@/components/dashboard/PasswordReveal";

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Couldn't verify the account's current password — it may have drifted out of sync.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }
}

function AddTeacherForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setStatus(null);
    setBusy(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const password = generateTeacherPassword(displayName);
      await createManagedUser({
        displayName,
        email,
        password,
        role: "teacher",
        school: school.trim(),
        createdByUid: user.uid,
      });
      onCreated();
      setStatus({
        kind: "success",
        message: `Teacher account created for ${displayName}. Password: ${password} (they can change it later in their own account settings).`,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setSchool("");
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
          <label htmlFor="teacher-school">
            School <span className="admin-field-hint">(e.g. ATS Abu Dhabi - Girls)</span>
          </label>
          <input
            id="teacher-school"
            type="text"
            required
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />
        </div>
      </div>
      <p className="csv-hint">
        Password is generated automatically: Firstname.Lastname — the teacher will be required to change it the
        first time they sign in.
      </p>
      {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
      <button className="admin-submit-btn" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create teacher account"}
      </button>
    </form>
  );
}

function EditTeacherPanel({
  teacher,
  onDone,
  onCancel,
}: {
  teacher: UserProfile;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(teacher.displayName);
  const [school, setSchool] = useState(teacher.school ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      await updateTeacher({
        uid: teacher.uid,
        currentEmail: teacher.email,
        currentPassword: teacher.password,
        displayName: displayName.trim(),
        school: school.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setStatus({ kind: "error", message: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-edit-panel">
      <div className="admin-edit-panel-head">
        <h4>Editing {teacher.displayName}</h4>
        <button type="button" className="admin-link-btn" onClick={onCancel}>Cancel</button>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="edit-teacher-name">Full name</label>
            <input
              id="edit-teacher-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="edit-teacher-school">School</label>
            <input
              id="edit-teacher-school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="edit-teacher-password">New password</label>
            <input
              id="edit-teacher-password"
              type="text"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>
        {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
        <div className="admin-row-actions">
          <button className="admin-submit-btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="admin-secondary-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminPageContent() {
  const [teachers, setTeachers] = useState<UserProfile[] | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  function reload() {
    fetchTeachers()
      .then((list) => setTeachers(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))))
      .catch(() => setTeachers([]));
  }

  useEffect(() => {
    reload();
  }, []);

  const editingTeacher = teachers?.find((t) => t.uid === editingUid) ?? null;

  async function handleResetOne(teacher: UserProfile) {
    setResettingUid(teacher.uid);
    setBulkStatus(null);
    try {
      const newPassword = await resetTeacherPassword(teacher);
      setBulkStatus({
        kind: "success",
        message: `${teacher.displayName}'s password reset to ${newPassword}. They must change it at next login.`,
      });
      reload();
    } catch (err) {
      setBulkStatus({ kind: "error", message: friendlyError(err) });
    } finally {
      setResettingUid(null);
    }
  }

  async function handleResetAll() {
    if (!teachers || teachers.length === 0) return;
    setBulkBusy(true);
    setBulkStatus(null);
    try {
      let failures = 0;
      for (const teacher of teachers) {
        try {
          await resetTeacherPassword(teacher);
        } catch {
          failures += 1;
        }
      }
      setBulkStatus(
        failures === 0
          ? { kind: "success", message: "All teacher passwords reset to Firstname.Lastname." }
          : { kind: "error", message: `Reset finished with ${failures} failure(s). See individual rows to retry.` },
      );
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

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
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={handleResetAll}
              disabled={bulkBusy || !teachers || teachers.length === 0}
            >
              {bulkBusy ? "Resetting…" : "Reset all passwords"}
            </button>
          </div>

          {bulkStatus && <div className={`admin-status ${bulkStatus.kind}`}>{bulkStatus.message}</div>}

          {editingTeacher && (
            <EditTeacherPanel
              teacher={editingTeacher}
              onCancel={() => setEditingUid(null)}
              onDone={() => {
                setEditingUid(null);
                reload();
              }}
            />
          )}

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
                    <th>School</th>
                    <th>Password</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.uid}>
                      <td>{teacher.displayName}</td>
                      <td>{teacher.email}</td>
                      <td>{teacher.school ?? "—"}</td>
                      <td><PasswordReveal password={teacher.password} /></td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={() => setEditingUid(teacher.uid)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={() => handleResetOne(teacher)}
                            disabled={resettingUid === teacher.uid}
                          >
                            {resettingUid === teacher.uid ? "Resetting…" : "Reset password"}
                          </button>
                        </div>
                      </td>
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
