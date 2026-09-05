"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createManagedUser,
  deleteStudent,
  fetchStudents,
  resetStudentPassword,
  sendManagedPasswordResetEmail,
  updateStudent,
} from "@/lib/data";
import { generateStudentPassword } from "@/lib/generated-password";
import { downloadStudentCsvTemplate, parseStudentCsv, type StudentCsvRow } from "@/lib/csv";
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
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Couldn't verify the account's current password — it may have drifted out of sync.";
    default:
      return err instanceof Error ? err.message : "Something went wrong. Please try again.";
  }
}

function AddStudentForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
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
      const password = generateStudentPassword(fullName);
      await createManagedUser({
        displayName: fullName.trim(),
        email,
        password,
        role: "student",
        school: school.trim(),
        createdByUid: user.uid,
      });
      onCreated();
      setStatus({ kind: "success", message: `Student account created. Password: ${password}` });
      setFullName("");
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
          <label htmlFor="student-full-name">Full name</label>
          <input
            id="student-full-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="student-email">Email</label>
          <input
            id="student-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="student-school">
            School <span className="admin-field-hint">(e.g. ATS Abu Dhabi - Girls)</span>
          </label>
          <input
            id="student-school"
            type="text"
            required
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />
        </div>
      </div>
      {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
      <button className="admin-submit-btn" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create student account"}
      </button>
    </form>
  );
}

type CsvRowState = StudentCsvRow & { password: string; status: "pending" | "creating" | "done" | "error"; error?: string };

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.3 7.03 4 4 0 0 1 17 15" />
      <path d="M12 12v7" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}

function CsvUploadForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRowState[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    file.text().then((text) => {
      const { rows: parsedRows, errors } = parseStudentCsv(text);
      setParseErrors(errors);
      setRows(
        parsedRows.map((row) => ({
          ...row,
          password: generateStudentPassword(row.fullName),
          status: "pending" as const,
        })),
      );
    });
  }

  async function handleCreateAll() {
    if (!user || rows.length === 0) return;
    setBusy(true);
    for (let i = 0; i < rows.length; i += 1) {
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "creating" } : r)));
      try {
        await createManagedUser({
          displayName: rows[i].fullName,
          email: rows[i].email,
          password: rows[i].password,
          role: "student",
          school: rows[i].school,
          createdByUid: user.uid,
        });
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: friendlyError(err) } : r)),
        );
      }
    }
    setBusy(false);
    onCreated();
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="admin-form">
      <div className="csv-upload">
        <div className="csv-upload-icon">
          <UploadCloudIcon />
        </div>
        <p className="csv-upload-title">Upload a CSV file</p>
        <p className="csv-hint">
          Header row required with columns: <code>Full Name</code>, <code>Email</code>, <code>School</code>.
        </p>
        <div className="csv-upload-actions">
          <label className="csv-file-btn">
            Choose file
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="csv-file-input"
            />
          </label>
          <button type="button" className="admin-secondary-btn" onClick={downloadStudentCsvTemplate}>
            Download template
          </button>
        </div>
        {fileName && <p className="csv-filename">Selected: {fileName}</p>}
      </div>

      {parseErrors.length > 0 && (
        <div className="admin-status error">{parseErrors.join(" ")}</div>
      )}

      {rows.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Full name</th>
                  <th>Email</th>
                  <th>School</th>
                  <th>Password</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.email}-${index}`}>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{row.school}</td>
                    <td><code>{row.password}</code></td>
                    <td>
                      {row.status === "pending" && "—"}
                      {row.status === "creating" && "Creating…"}
                      {row.status === "done" && "Created"}
                      {row.status === "error" && (row.error ?? "Failed")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="admin-submit-btn" type="button" onClick={handleCreateAll} disabled={busy || pendingCount === 0}>
            {busy ? "Creating accounts…" : `Create ${pendingCount} account${pendingCount === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </div>
  );
}

function EditStudentPanel({
  student,
  onDone,
  onCancel,
}: {
  student: UserProfile;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(student.displayName);
  const [school, setSchool] = useState(student.school ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      await updateStudent({
        uid: student.uid,
        displayName: displayName.trim(),
        school: school.trim(),
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
        <h4>Editing {student.displayName}</h4>
        <button type="button" className="admin-link-btn" onClick={onCancel}>Cancel</button>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="edit-student-name">Full name</label>
            <input
              id="edit-student-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="edit-student-school">School</label>
            <input
              id="edit-student-school"
              type="text"
              required
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

function StudentsPageContent() {
  const { isAdmin, user, profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, { kind: "success" | "error"; message: string }>>({});

  function reload() {
    if (!user) return;
    if (!isAdmin && !profile?.school) return;
    fetchStudents(isAdmin ? {} : { school: profile?.school })
      .then((list) => setStudents(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))))
      .catch(() => setStudents([]));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, profile?.school]);

  const editingStudent = students?.find((s) => s.uid === editingUid) ?? null;

  function canManage(student: UserProfile): boolean {
    return isAdmin || student.createdBy === user?.uid;
  }

  async function handleResetPassword(student: UserProfile) {
    setResettingUid(student.uid);
    setRowStatus((prev) => {
      const next = { ...prev };
      delete next[student.uid];
      return next;
    });
    try {
      const newPassword = await resetStudentPassword(student);
      setRowStatus((prev) => ({
        ...prev,
        [student.uid]: {
          kind: "success",
          message: `Password reset to ${newPassword}. They must change it at next login.`,
        },
      }));
    } catch (err) {
      setRowStatus((prev) => ({ ...prev, [student.uid]: { kind: "error", message: friendlyError(err) } }));
    } finally {
      setResettingUid(null);
    }
  }

  async function handleSendResetEmail(student: UserProfile) {
    setResettingUid(student.uid);
    try {
      await sendManagedPasswordResetEmail(student.email);
      setRowStatus((prev) => ({
        ...prev,
        [student.uid]: { kind: "success", message: `Password reset email sent to ${student.email}.` },
      }));
    } catch (err) {
      setRowStatus((prev) => ({ ...prev, [student.uid]: { kind: "error", message: friendlyError(err) } }));
    } finally {
      setResettingUid(null);
    }
  }

  async function handleDelete(student: UserProfile) {
    const confirmed = window.confirm(`Remove ${student.displayName}'s student account? This can't be undone.`);
    if (!confirmed) return;
    setDeletingUid(student.uid);
    setRowStatus((prev) => {
      const next = { ...prev };
      delete next[student.uid];
      return next;
    });
    try {
      const { authDeleted } = await deleteStudent(student);
      if (editingUid === student.uid) setEditingUid(null);
      reload();
      if (!authDeleted) {
        setRowStatus((prev) => ({
          ...prev,
          [student.uid]: {
            kind: "error",
            message: `${student.displayName}'s account was removed, but its sign-in couldn't be removed automatically (stale password on file) — remove it by hand in Firebase Console → Authentication if it must be fully gone.`,
          },
        }));
      }
    } catch (err) {
      setRowStatus((prev) => ({ ...prev, [student.uid]: { kind: "error", message: friendlyError(err) } }));
    } finally {
      setDeletingUid(null);
    }
  }

  const schoolOptions = useMemo(() => {
    const schools = new Set<string>();
    (students ?? []).forEach((s) => {
      if (s.school) schools.add(s.school);
    });
    return Array.from(schools).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const visibleStudents = useMemo(() => {
    let list = students ?? [];
    if (schoolFilter) list = list.filter((s) => s.school === schoolFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (s) => s.displayName.toLowerCase().includes(query) || s.email.toLowerCase().includes(query),
      );
    }
    return list;
  }, [students, schoolFilter, searchQuery]);

  return (
    <main id="students" className="section active">
      <div className="profile-page">
        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Add a student</h2>
              <p>
                Their password is generated automatically: Firstname.Lastname — they&apos;ll be required to
                change it the first time they sign in.
              </p>
            </div>
          </div>
          <AddStudentForm onCreated={reload} />
          <hr className="admin-divider" />
          <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem" }}>Or add many at once via CSV</h3>
          <CsvUploadForm onCreated={reload} />
        </section>

        <section className="profile-card glass roster-card">
          <div className="profile-card-head">
            <div>
              <h2>Students</h2>
              <p>{isAdmin ? "Every student in the system." : "Students at your school."}</p>
            </div>
          </div>

          <div className="roster-toolbar">
            <div className="roster-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search students"
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

          {editingStudent && (
            <EditStudentPanel
              student={editingStudent}
              onCancel={() => setEditingUid(null)}
              onDone={() => {
                setEditingUid(null);
                reload();
              }}
            />
          )}

          <div className="roster-table-wrap">
            {students === null ? (
              <p className="admin-empty">Loading…</p>
            ) : students.length === 0 ? (
              <p className="admin-empty">No students yet.</p>
            ) : visibleStudents.length === 0 ? (
              <p className="admin-empty">No students match your search.</p>
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
                  {visibleStudents.map((student) => (
                    <tr key={student.uid}>
                      <td className="roster-name-cell">{student.displayName}</td>
                      <td>{student.email}</td>
                      <td>{student.school ?? "—"}</td>
                      <td>
                        {canManage(student) ? (
                          <RosterActionMenu
                            label={`Actions for ${student.displayName}`}
                            actions={[
                              { label: "Edit", onClick: () => setEditingUid(student.uid) },
                              {
                                label: resettingUid === student.uid ? "Resetting…" : "Reset password",
                                onClick: () => handleResetPassword(student),
                                disabled: resettingUid === student.uid,
                              },
                              ...(rowStatus[student.uid]?.kind === "error"
                                ? [
                                    {
                                      label: "Send reset email",
                                      onClick: () => handleSendResetEmail(student),
                                      disabled: resettingUid === student.uid,
                                    },
                                  ]
                                : []),
                              {
                                label: deletingUid === student.uid ? "Removing…" : "Remove student",
                                onClick: () => handleDelete(student),
                                disabled: deletingUid === student.uid,
                                danger: true,
                              },
                            ]}
                          />
                        ) : (
                          <span className="admin-empty">—</span>
                        )}
                        {rowStatus[student.uid] && (
                          <div className={`admin-status ${rowStatus[student.uid].kind} admin-row-error`}>
                            {rowStatus[student.uid].message}
                          </div>
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

export default function StudentsPage() {
  return (
    <RoleGuard allow="teacher-or-admin">
      <StudentsPageContent />
    </RoleGuard>
  );
}
