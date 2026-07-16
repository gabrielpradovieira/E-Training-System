export type UserRole = "student" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  approved: boolean;
  skillCategory?: string;
  totalHours?: number;
  createdAt?: number;
  lastLoginAt?: number;
};

export type AllowlistEntry = {
  email: string;
  displayName?: string;
  addedBy?: string;
  addedAt?: number;
  registered?: boolean;
};

export type VideoMaterial = {
  label: string;
  url: string;
};

export type CourseLevel = "foundation" | "intermediate" | "advanced";

export const COURSE_LEVELS: { level: CourseLevel; label: string }[] = [
  { level: "foundation", label: "Foundation" },
  { level: "intermediate", label: "Intermediate" },
  { level: "advanced", label: "Advanced" },
];

/**
 * A section of the course = one Competence Unit. Sections are grouped by
 * `core` (Core Competence) and filtered by `level` on the Training page.
 */
export type CourseSection = {
  id: string;
  /** Which level tab this section appears under. */
  level: CourseLevel;
  /** Core Competence this unit belongs to (e.g. "1" or a label). */
  core: string;
  /** The Competence Unit title. */
  title: string;
  description: string;
  /** Sort position within the course (fractional inserts allowed). */
  order: number;
  createdAt?: number;
  updatedAt?: number;
};

export type SectionInput = {
  level: CourseLevel;
  core: string;
  title: string;
  description: string;
  order: number;
};

export type VideoDoc = {
  id: string;
  /** The course section this video belongs to. */
  sectionId: string;
  /** Sort position within the section (fractional inserts allowed). */
  order: number;
  title: string;
  description: string;
  /** OneDrive / SharePoint embed URL rendered in an iframe. */
  embedUrl: string;
  /** Per-video tool list, e.g. ["Maya", "ZBrush"]. */
  requiredTools: string[];
  /** Downloadable / reference links for this video. */
  materials: VideoMaterial[];
  /** Free-text instructions or steps for this video's task. */
  instructions: string;
  createdAt?: number;
  updatedAt?: number;
};

export type VideoInput = {
  sectionId: string;
  order: number;
  title: string;
  description: string;
  embedUrl: string;
  requiredTools: string[];
  materials: VideoMaterial[];
  instructions: string;
};
