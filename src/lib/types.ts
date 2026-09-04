export type UserRole = "student" | "admin";

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
};
