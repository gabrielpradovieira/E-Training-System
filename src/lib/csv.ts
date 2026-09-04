/** Parses one CSV line into fields, handling simple double-quoted fields. */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

export type StudentCsvRow = {
  fullName: string;
  email: string;
  school: string;
};

/**
 * Parses a CSV with a header row containing "Full Name", "Email", "School"
 * (case-insensitive, any column order). Blank lines are skipped.
 */
export function parseStudentCsv(text: string): { rows: StudentCsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: ["The file is empty."] };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes("name"));
  const emailIdx = header.findIndex((h) => h.includes("email"));
  const schoolIdx = header.findIndex((h) => h.includes("school"));

  if (nameIdx === -1 || emailIdx === -1 || schoolIdx === -1) {
    return {
      rows: [],
      errors: ['CSV must have a header row with "Full Name", "Email", and "School" columns.'],
    };
  }

  const rows: StudentCsvRow[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const fields = parseLine(line);
    const fullName = fields[nameIdx]?.trim() ?? "";
    const email = fields[emailIdx]?.trim() ?? "";
    const school = fields[schoolIdx]?.trim() ?? "";
    if (!fullName || !email || !school) {
      errors.push(`Row ${index + 2}: missing full name, email, or school — skipped.`);
      return;
    }
    rows.push({ fullName, email, school });
  });

  return { rows, errors };
}

/** A downloadable starter CSV — header row plus one example row. */
export const STUDENT_CSV_TEMPLATE =
  "Full Name,Email,School\n" + "Ahmed Al Zaabi,ahmed.alzaabi@example.com,ATS Abu Dhabi - Girls\n";

export function downloadStudentCsvTemplate(): void {
  const blob = new Blob([STUDENT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
