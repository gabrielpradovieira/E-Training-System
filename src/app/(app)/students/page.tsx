"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createManagedUser, fetchStudents } from "@/lib/data";
import { generateStudentPassword } from "@/lib/generated-password";
import { parseStudentCsv, type StudentCsvRow } from "@/lib/csv";
import type { UserProfile } from "@/lib/types";
import RoleGuard from "@/components/dashboard/RoleGuard";

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
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
      const password = generateStudentPassword(fullName, school);
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
          <label htmlFor="student-school">School</label>
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

function CsvUploadForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRowState[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const { rows: parsedRows, errors } = parseStudentCsv(text);
      setParseErrors(errors);
      setRows(
        parsedRows.map((row) => ({
          ...row,
          password: generateStudentPassword(row.fullName, row.school),
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
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} />
        <p className="csv-hint">
          Header row required with columns: <code>Full Name</code>, <code>Email</code>, <code>School</code>.
        </p>
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

function StudentsPageContent() {
  const { isAdmin, user } = useAuth();
  const [students, setStudents] = useState<UserProfile[] | null>(null);

  function reload() {
    if (!user) return;
    fetchStudents(isAdmin ? {} : { teacherUid: user.uid })
      .then((list) => setStudents(list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))))
      .catch(() => setStudents([]));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  return (
    <main id="students" className="section active">
      <div className="profile-page">
        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Add a student</h2>
              <p>Their password is generated automatically: firstname.lastname.school.2026</p>
            </div>
          </div>
          <AddStudentForm onCreated={reload} />
          <hr className="admin-divider" />
          <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem" }}>Or add many at once via CSV</h3>
          <CsvUploadForm onCreated={reload} />
        </section>

        <section className="profile-card glass">
          <div className="profile-card-head">
            <div>
              <h2>Students</h2>
              <p>{isAdmin ? "Every student in the system." : "Students you've added."}</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            {students === null ? (
              <p className="admin-empty">Loading…</p>
            ) : students.length === 0 ? (
              <p className="admin-empty">No students yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.uid}>
                      <td>{student.displayName}</td>
                      <td>{student.email}</td>
                      <td>{student.school ?? "—"}</td>
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
