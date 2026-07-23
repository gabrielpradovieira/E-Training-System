import type { CoreCompetence, CourseSection, CourseLevel } from "@/lib/types";

const LEVEL_ORDER: CourseLevel[] = ["foundation", "intermediate", "advanced"];

/**
 * Continuous numbering across the whole course.
 *
 * Core Competences are numbered 1..N and Competence Units 1..N in a single
 * running sequence ordered by level (Foundation -> Intermediate -> Advanced)
 * then by each item's own order. So if Foundation ends at unit 5, Intermediate
 * starts at 6 — the numbering does not restart per level or per core.
 */
export function buildNumbering(
  cores: CoreCompetence[],
  unitsByCore: Record<string, CourseSection[]>,
): { coreNumber: Map<string, number>; unitNumber: Map<string, number> } {
  const ordered = [...cores].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.order - b.order,
  );

  const coreNumber = new Map<string, number>();
  const unitNumber = new Map<string, number>();
  let c = 0;
  let u = 0;

  for (const core of ordered) {
    c += 1;
    coreNumber.set(core.id, c);
    for (const unit of unitsByCore[core.id] ?? []) {
      u += 1;
      unitNumber.set(unit.id, u);
    }
  }

  return { coreNumber, unitNumber };
}

/** "Core Competence 3" — the running number, not the core's own name. */
export function coreLabel(n: number | undefined): string {
  return `Core Competence ${n ?? "?"}`;
}
