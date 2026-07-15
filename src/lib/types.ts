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

export type VideoDoc = {
  id: string;
  /** The competence unit this video belongs to, e.g. "course-cu-1". */
  topicId: string;
  /** Sort position within the topic (fractional inserts are allowed). */
  order: number;
  title: string;
  /** OneDrive / SharePoint embed URL rendered in an iframe. */
  embedUrl: string;
  materials: VideoMaterial[];
  createdAt?: number;
  updatedAt?: number;
};

export type VideoInput = {
  topicId: string;
  order: number;
  title: string;
  embedUrl: string;
  materials: VideoMaterial[];
};
