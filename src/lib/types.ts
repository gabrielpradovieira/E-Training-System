export type UserRole = "student" | "teacher" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  approved: boolean;
  school?: string;
  skillCategory?: string;
  totalHours?: number;
  createdAt?: number;
  lastLoginAt?: number;
  /** uid of the admin/teacher who provisioned this account (students/teachers only). */
  createdBy?: string;
};
