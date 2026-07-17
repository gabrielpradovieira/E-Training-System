/**
 * Label for a Core Competence: "Core Competence 1" when the admin named it
 * with a number, otherwise the name they typed. Falls back to the position.
 */
export function coreHeading(title: string, index: number): string {
  const name = title.trim();
  if (!name) return `Core Competence ${index + 1}`;
  return /^\d+$/.test(name) ? `Core Competence ${name}` : name;
}
