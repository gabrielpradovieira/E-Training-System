function slug(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, ""); // drop spaces/punctuation
}

function capitalize(part: string): string {
  const s = slug(part);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

/**
 * Every managed account (teacher or student) gets the same default password
 * scheme: Firstname.Lastname -- name parts capitalized, e.g.
 * "sara ahmed" -> "Sara.Ahmed". This is only the default password set at
 * creation (or reset) time — the account holder must change it after their
 * first login (or after an admin/teacher resets it back to this default).
 * Nobody, including admins and teachers, can see or set an arbitrary
 * password for another account — only reset it back to this formula.
 */
export function generateDefaultPassword(fullName: string): string {
  const { firstName, lastName } = splitFullName(fullName);
  return `${capitalize(firstName)}.${capitalize(lastName || firstName)}`;
}

export function generateTeacherPassword(fullName: string): string {
  return generateDefaultPassword(fullName);
}

export function generateStudentPassword(fullName: string): string {
  return generateDefaultPassword(fullName);
}
