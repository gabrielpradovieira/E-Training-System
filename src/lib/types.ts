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
