/**
 * Student passwords follow a fixed, non-changeable scheme:
 * (first name).(last name).(school).2026 -- all lowercase, e.g.
 * "Ahmed Al Zaabi" at "Dubai" -> "ahmed.alzaabi.dubai.2026".
 */
function slug(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, ""); // drop spaces/punctuation
}

export function generateStudentPassword(fullName: string, school: string): string {
  const { firstName, lastName } = splitFullName(fullName);
  return `${slug(firstName)}.${slug(lastName || firstName)}.${slug(school)}.2026`;
}

function capitalize(part: string): string {
  const s = slug(part);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Teacher passwords follow their own fixed scheme:
 * Firstname.Lastname@school.2026 -- name parts capitalized, e.g.
 * "sara ahmed" at "ATS Abu Dhabi - Girls" -> "Sara.Ahmed@atsabudhabigirls.2026".
 * Unlike students, a teacher can change this afterward from their own
 * account settings — this is only the password set at creation time.
 */
export function generateTeacherPassword(fullName: string, school: string): string {
  const { firstName, lastName } = splitFullName(fullName);
  return `${capitalize(firstName)}.${capitalize(lastName || firstName)}@${slug(school)}.2026`;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}
