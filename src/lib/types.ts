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
 * Training material hierarchy:
 *   Level -> Core Competence -> Competence Unit -> Videos
 *
 * The level lives on the Core Competence, so the level tabs filter cores
 * (and everything under them).
 */
export type CoreCompetence = {
  id: string;
  level: CourseLevel;
  /** Shown as "Core Competence {title}" when numeric, else as-is. */
  title: string;
  description: string;
  order: number;
  createdAt?: number;
  updatedAt?: number;
};

export type CoreInput = {
  level: CourseLevel;
  title: string;
  description: string;
  order: number;
};

/** A Competence Unit — belongs to a Core Competence, holds videos. */
export type CourseSection = {
  id: string;
  coreId: string;
  title: string;
  /** The unit's learning objective. */
  description: string;
  /** Sort position within its core. */
  order: number;
  createdAt?: number;
  updatedAt?: number;
};

export type SectionInput = {
  coreId: string;
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
