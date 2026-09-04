"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createManagedUser,
  deleteTeacher,
  fetchTeachers,
  resetTeacherPassword,
  sendTeacherPasswordResetEmail,
  updateTeacher,
} from "@/lib/data";
import { generateTeacherPassword } from "@/lib/generated-password";
import { createTask, fetchAllTasks } from "@/lib/tasks";
import type { CurriculumLevel } from "@/lib/curriculum";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";
import PasswordReveal from "@/components/dashboard/PasswordReveal";

/**
 * One-time batch of tasks requested for specific "first video of a
 * sequence" lessons. Idempotent — SeedTasksPanel skips any preset whose
 * lessonKey + name already exists, so it's safe to run more than once.
 */
const PRESET_TASKS: { name: string; link: string; level: CurriculumLevel; lessonKey: string }[] = [
  {
    name: "First sketches",
    link: "https://docs.google.com/document/d/1FVx1WFxKGIISb-8eZTQdnHtnqmMxLcwWPHUEnDSTmM0/edit?usp=sharing",
    level: "concept-art",
    lessonKey: "concept-art-drawing-fundamentals-0",
  },
  {
    name: "Basic Anatomy",
    link: "https://docs.google.com/document/d/1kOTPF7eH0zpofvfV1a89hGFaRIYmspwt3EN77WbMm3I/edit?usp=sharing",
    level: "concept-art",
    lessonKey: "concept-art-drawing-fundamentals-3",
  },
  {
    name: "Witcher (Painting the character)",
    link: "https://docs.google.com/document/d/1M4zoSdIeo1gvLLKgOlHnjM_QSfqt2VuTzwHQpJYUGyE/edit?usp=sharing",
    level: "concept-art",
    lessonKey: "concept-art-painting-skills-2",
  },
  {
    name: "Magic Potion",
    link: "https://docs.google.com/document/d/1PqytyXNEeooMLwx4CTadkWJEghrpvXofQAaKJe9b3Us/edit?usp=sharing",
    level: "3d-modeling",
    lessonKey: "3d-maya-interface-3",
  },
  {
    name: "Coffee Mug",
    link: "https://docs.google.com/document/d/1crx5KFKijEpnxX6l2G_XUKWGsQwKHv0DW0sdfuTFnx8/edit?tab=t.0#heading=h.pcinp9hydz4t",
    level: "3d-modeling",
    lessonKey: "3d-maya-interface-6",
  },
  {
    name: "Car",
    link: "https://drive.google.com/file/d/1rngYE7pdRMGCcF-rbsqyxRs-ZwLiBzZJ/view?usp=drive_link",
    level: "3d-modeling",
    lessonKey: "3d-maya-interface-5",
  },
  {
    name: "Airplane",
    link: "https://docs.google.com/document/d/1PA9tGryA5p_A6pgBko6zWZLpdCX6f7AzS9-dFvKOHWM/edit?usp=sharing",
    level: "3d-modeling",
    lessonKey: "3d-maya-interface-10",
  },
  {
    name: "Speed Modeling",
    link: "https://docs.google.com/document/d/1g7RC3YijL9r2TI97oFxpiPehFk5sGItIcVD-mHuFbOQ/edit?usp=sharing",
    level: "3d-modeling",
    lessonKey: "3d-retopology-3",
  },
];

function SeedTasksPanel() {
  const { user } = useAuth();
  const [existingKeys, setExistingKeys] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  function reload() {
    fetchAllTasks()
      .then((tasks) => setExistingKeys(new Set(tasks.map((t) => `${t.lessonKey}|${t.name}`))))
      .catch(() => setExistingKeys(new Set()));
  }

  useEffect(() => {
    reload();
  }, []);

  const missing = existingKeys
    ? PRESET_TASKS.filter((preset) => !existingKeys.has(`${preset.lessonKey}|${preset.name}`))
    : [];

  async function handleAddMissing() {
    if (!user || missing.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      let failures = 0;
      for (const preset of missing) {
        try {
          await createTask({
            level: preset.level,
            lessonKey: preset.lessonKey,
            name: preset.name,
            link: preset.link,
            createdBy: user.uid,
          });
        } catch {
          failures += 1;
        }
      }
      setStatus(
        failures === 0
          ? { kind: "success", message: `Added ${missing.length} task(s).` }
          : { kind: "error", message: `Added ${missing.length - failures} task(s), ${failures} failed.` },
      );
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (existingKeys === null) return null;
  if (missing.length === 0) {
    return <p className="admin-empty">All preset tasks already exist in the curriculum.</p>;
  }

  return (
    <div>
      <ul className="csv-hint" style={{ listStyle: "disc", paddingLeft: 18, margin: "0 0 12px" }}>
        {missing.map((preset) => (
          <li key={`${preset.lessonKey}|${preset.name}`}>{preset.name}</li>
        ))}
      </ul>
      {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
      <button className="admin-submit-btn" type="button" onClick={handleAddMissing} disabled={busy}>
        {busy ? "Adding…" : `Add ${missing.length} missing task(s)`}
      </button>
    </div>
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
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

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
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[teacher.uid];
      return next;
    });
    try {
      const newPassword = await resetTeacherPassword(teacher);
      setBulkStatus({
        kind: "success",
        message: `${teacher.displayName}'s password reset to ${newPassword}. They must change it at next login.`,
      });
      reload();
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [teacher.uid]: friendlyError(err) }));
    } finally {
      setResettingUid(null);
    }
  }

  async function handleResetAll() {
    if (!teachers || teachers.length === 0) return;
    setBulkBusy(true);
    setBulkStatus(null);
    setRowErrors({});
    try {
      const failures: Record<string, string> = {};
      for (const teacher of teachers) {
        try {
          await resetTeacherPassword(teacher);
        } catch (err) {
          failures[teacher.uid] = friendlyError(err);
        }
      }
      const failureCount = Object.keys(failures).length;
      setRowErrors(failures);
      setBulkStatus(
        failureCount === 0
          ? { kind: "success", message: "All teacher passwords reset to Firstname.Lastname." }
          : {
              kind: "error",
              message: `Reset finished with ${failureCount} failure(s) — see the reason under each affected row below.`,
            },
      );
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete(teacher: UserProfile) {
    const confirmed = window.confirm(
      `Delete ${teacher.displayName}'s teacher account? This can't be undone.`,
    );
    if (!confirmed) return;
    setDeletingUid(teacher.uid);
    setBulkStatus(null);
    try {
      const { authDeleted } = await deleteTeacher(teacher);
      if (editingUid === teacher.uid) setEditingUid(null);
      setBulkStatus({
        kind: "success",
        message: authDeleted
          ? `${teacher.displayName} was deleted.`
          : `${teacher.displayName}'s account was removed from the system, but its sign-in couldn't be removed automatically (stale password on file) — remove it by hand in Firebase Console → Authentication if it must be fully gone.`,
      });
      reload();
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [teacher.uid]: friendlyError(err) }));
    } finally {
      setDeletingUid(null);
    }
  }

  async function handleSendResetEmail(teacher: UserProfile) {
    setResettingUid(teacher.uid);
    setBulkStatus(null);
    try {
      await sendTeacherPasswordResetEmail(teacher.email);
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[teacher.uid];
        return next;
      });
      setBulkStatus({
        kind: "success",
        message: `Password reset email sent to ${teacher.email}.`,
      });
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [teacher.uid]: friendlyError(err) }));
    } finally {
      setResettingUid(null);
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
              <h2>Seed curriculum tasks</h2>
              <p>One-time helper to add the requested set of tasks to their lessons. Safe to click more than once.</p>
            </div>
          </div>
          <SeedTasksPanel />
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
                          {rowErrors[teacher.uid] && (
                            <button
                              type="button"
                              className="admin-link-btn"
                              onClick={() => handleSendResetEmail(teacher)}
                              disabled={resettingUid === teacher.uid}
                            >
                              Send reset email
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-link-btn admin-link-btn-danger"
                            onClick={() => handleDelete(teacher)}
                            disabled={deletingUid === teacher.uid}
                          >
                            {deletingUid === teacher.uid ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                        {rowErrors[teacher.uid] && (
                          <div className="admin-status error admin-row-error">{rowErrors[teacher.uid]}</div>
                        )}
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
