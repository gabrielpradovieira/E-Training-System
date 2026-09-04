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
  /**
   * Plaintext copy of the account's current password, stored so an admin
   * (and the teacher who owns a given student) can look it up later —
   * Firebase Auth itself never lets you read a password back. Same
   * Firestore rules that gate the rest of the profile gate this field.
   */
  password?: string;
};
