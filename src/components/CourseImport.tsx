"use client";

import { useRef, useState } from "react";
import { mapCourseRows, parseCsv } from "@/lib/csv";
import { importCourseRows, type ImportSummary } from "@/lib/course-data";

const TEMPLATE_HEADERS =
  "LEVEL,CORE COMPETENCE,COMPETENCE UNIT,TITLE,DESCRIPTION,VIDEO LINK,REQUIRED TOOLS";

const TEMPLATE_SAMPLE =
  'Foundation,1,Understand fundamentals of drawing and sketching,Interface and menus,Learn the Photoshop UI,https://...,"Adobe Photoshop, Drawing tablet"';

export default function CourseImport({ onImported }: { onImported: () => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErrors([]);
    setSummary(null);
    try {
      const text = await file.text();
      const { rows, errors: parseErrors } = mapCourseRows(parseCsv(text));

      if (rows.length === 0) {
        setErrors(parseErrors.length ? parseErrors : ["No usable rows found in the file."]);
        return;
      }

      const result = await importCourseRows(rows);
      setSummary(result);
      // Row-level problems are worth showing even when the import succeeded.
      if (parseErrors.length) setErrors(parseErrors);
      await onImported();
    } catch {
      setErrors(["Import failed. Check the file format and that the latest firestore.rules are published."]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const blob = new Blob([`${TEMPLATE_HEADERS}\n${TEMPLATE_SAMPLE}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-card">
      <h2>Import from spreadsheet</h2>
      <p className="admin-card-sub">
        Upload a <strong>.csv</strong> with these columns — sections and videos are created automatically.
        (In Excel: <em>File → Save As → CSV UTF-8</em>.)
      </p>

      <code className="import-headers">{TEMPLATE_HEADERS}</code>

      <div className="import-actions">
        <button
          className="admin-btn"
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Importing…" : "Choose CSV file"}
        </button>
        <button className="video-modal-btn" type="button" onClick={downloadTemplate}>
          Download template
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <p className="import-note">
        Re-importing the same sheet <strong>updates</strong> matching rows instead of duplicating them
        (matched by Competence Unit, then video Title). Nothing is ever deleted.
      </p>

      {summary && (
        <div className="import-summary">
          Imported: <strong>{summary.coresCreated}</strong> new core competence(s),{" "}
          <strong>{summary.unitsCreated}</strong> new competence unit(s),{" "}
          <strong>{summary.videosCreated}</strong> new video(s),{" "}
          <strong>{summary.videosUpdated}</strong> updated.
        </div>
      )}

      {errors.length > 0 && (
        <div className="admin-error import-errors">
          {errors.slice(0, 8).map((err, i) => (
            <div key={i}>{err}</div>
          ))}
          {errors.length > 8 && <div>…and {errors.length - 8} more.</div>}
        </div>
      )}
    </section>
  );
}
