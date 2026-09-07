"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createManagedUser,
  deleteTeacher,
  fetchTeachers,
  grantAdmin,
  resetTeacherPassword,
  sendTeacherPasswordResetEmail,
  updateTeacher,
} from "@/lib/data";
import { generateTeacherPassword } from "@/lib/generated-password";
import { sendInviteEmail } from "@/lib/email-invite";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";
import RosterActionMenu from "@/components/dashboard/RosterActionMenu";

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
  const [makeAdmin, setMakeAdmin] = useState(false);
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
      if (makeAdmin) await grantAdmin(email, user.uid);
      onCreated();
      const emailSent = await sendInviteEmail({
        displayName,
        email,
        password,
        role: makeAdmin ? "admin" : "teacher",
      });
      const adminNote = makeAdmin ? " They also have full admin access." : "";
      setStatus({
        kind: "success",
        message: emailSent
          ? `Teacher account created for ${displayName}. An invite email with their login was sent to ${email}.${adminNote}`
          : `Teacher account created for ${displayName}. Password: ${password} (couldn't send the invite email automatically — share this password with them directly).${adminNote}`,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setSchool("");
      setMakeAdmin(false);
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
      <label className="admin-checkbox-field">
        <input
          type="checkbox"
          checked={makeAdmin}
          onChange={(e) => setMakeAdmin(e.target.checked)}
        />
        <span>
          Make admin <span className="admin-field-hint">(full access to every admin function, not just teacher tools)</span>
        </span>
      </label>
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      await updateTeacher({
        uid: teacher.uid,
        displayName: displayName.trim(),
        school: school.trim() || undefined,
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
        </div>
        <p className="csv-hint">
          Password can&apos;t be viewed or set here — use &quot;Reset password&quot; to reset it back to the
          default (Firstname.Lastname).
        </p>
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
      <line x1="11" y1="18" x2="13" y2="18"></line>
    </svg>
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
  const [schoolFilter, setSchoolFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  function reload() {
    fetchTeachers()
      .then((list) => setTeachers(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))))
      .catch(() => setTeachers([]));
  }

  useEffect(() => {
    reload();
  }, []);

  const editingTeacher = teachers?.find((t) => t.uid === editingUid) ?? null;

  const schoolOptions = useMemo(() => {
    const schools = new Set<string>();
    (teachers ?? []).forEach((t) => {
      if (t.school) schools.add(t.school);
    });
    return Array.from(schools).sort((a, b) => a.localeCompare(b));
  }, [teachers]);

  const visibleTeachers = useMemo(() => {
    let list = teachers ?? [];
    if (schoolFilter) list = list.filter((t) => t.school === schoolFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (t) => t.displayName.toLowerCase().includes(query) || t.email.toLowerCase().includes(query),
      );
    }
    return list;
  }, [teachers, schoolFilter, searchQuery]);

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

        <section className="profile-card glass roster-card">
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

          <div className="roster-toolbar">
            <div className="roster-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search teachers"
              />
            </div>
            {schoolOptions.length > 1 && (
              <div className="roster-filter">
                <FilterIcon />
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  aria-label="Filter by school"
                >
                  <option value="">All schools</option>
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </div>
            )}
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

          <div className="roster-table-wrap">
            {teachers === null ? (
              <p className="admin-empty">Loading…</p>
            ) : teachers.length === 0 ? (
              <p className="admin-empty">No teachers yet.</p>
            ) : visibleTeachers.length === 0 ? (
              <p className="admin-empty">No teachers match your search.</p>
            ) : (
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeachers.map((teacher) => (
                    <tr key={teacher.uid}>
                      <td className="roster-name-cell">{teacher.displayName}</td>
                      <td>{teacher.email}</td>
                      <td>{teacher.school ?? "—"}</td>
                      <td>
                        <RosterActionMenu
                          label={`Actions for ${teacher.displayName}`}
                          actions={[
                            { label: "Edit", onClick: () => setEditingUid(teacher.uid) },
                            {
                              label: resettingUid === teacher.uid ? "Resetting…" : "Reset password",
                              onClick: () => handleResetOne(teacher),
                              disabled: resettingUid === teacher.uid,
                            },
                            ...(rowErrors[teacher.uid]
                              ? [
                                  {
                                    label: "Send reset email",
                                    onClick: () => handleSendResetEmail(teacher),
                                    disabled: resettingUid === teacher.uid,
                                  },
                                ]
                              : []),
                            {
                              label: deletingUid === teacher.uid ? "Deleting…" : "Delete",
                              onClick: () => handleDelete(teacher),
                              disabled: deletingUid === teacher.uid,
                              danger: true,
                            },
                          ]}
                        />
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
