import type { CourseLevel } from "@/lib/types";

/**
 * Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas and
 * newlines, doubled quotes ("" -> "), CRLF, and a leading BOM.
 */
export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    // A quote only opens a quoted field at the START of a field. Mid-field
    // quotes are literal — otherwise an unquoted cell like
    // `<iframe src="https://…">` would have its quotes eaten.
    if (c === '"' && field.length === 0) {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely blank.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** One parsed course row from the spreadsheet. */
export type CourseImportRow = {
  level: CourseLevel;
  core: string;
  unit: string;
  title: string;
  description: string;
  videoLink: string;
  requiredTools: string[];
  /** Optional DURATION column, e.g. "12 min". */
  duration: string;
};

export type ImportParseResult = {
  rows: CourseImportRow[];
  errors: string[];
};

function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/\s+/g, " ");
}

export function normalizeLevel(value: string): CourseLevel | null {
  const v = value.trim().toLowerCase();
  if (v.startsWith("found") || v === "1" || v === "level 1") return "foundation";
  if (v.startsWith("inter") || v === "2" || v === "level 2") return "intermediate";
  if (v.startsWith("adv") || v === "3" || v === "level 3") return "advanced";
  return null;
}

const REQUIRED_HEADERS = ["LEVEL", "CORE COMPETENCE", "COMPETENCE UNIT", "TITLE"];

/**
 * Maps parsed CSV cells onto course rows using the header names:
 * LEVEL, CORE COMPETENCE, COMPETENCE UNIT, TITLE, DESCRIPTION, VIDEO LINK,
 * REQUIRED TOOLS. Extra columns are ignored; column order doesn't matter.
 */
export function mapCourseRows(table: string[][]): ImportParseResult {
  const errors: string[] = [];
  if (table.length === 0) return { rows: [], errors: ["The file is empty."] };

  const headers = table[0].map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    return {
      rows: [],
      errors: [`Missing column(s): ${missing.join(", ")}. Expected header row: ${REQUIRED_HEADERS.join(", ")}, DESCRIPTION, VIDEO LINK, REQUIRED TOOLS.`],
    };
  }

  const idx = (name: string) => headers.indexOf(name);
  const cell = (r: string[], name: string) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "");

  const rows: CourseImportRow[] = [];

  table.slice(1).forEach((r, n) => {
    const lineNo = n + 2; // 1-based, +1 for the header row
    const rawLevel = cell(r, "LEVEL");
    const level = normalizeLevel(rawLevel);
    const unit = cell(r, "COMPETENCE UNIT");
    const title = cell(r, "TITLE");

    if (!level) {
      errors.push(`Row ${lineNo}: unknown LEVEL "${rawLevel}" (use Foundation, Intermediate or Advanced).`);
      return;
    }
    if (!unit) {
      errors.push(`Row ${lineNo}: COMPETENCE UNIT is empty.`);
      return;
    }
    if (!title) {
      errors.push(`Row ${lineNo}: TITLE is empty.`);
      return;
    }

    rows.push({
      level,
      core: cell(r, "CORE COMPETENCE"),
      unit,
      title,
      description: cell(r, "DESCRIPTION"),
      videoLink: cell(r, "VIDEO LINK"),
      requiredTools: cell(r, "REQUIRED TOOLS")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      duration: cell(r, "DURATION"),
    });
  });

  return { rows, errors };
}
