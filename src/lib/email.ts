/** Normalizes an email for consistent storage/lookup (lower-cased, trimmed). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Firestore-safe document id for an email (email chars are already safe). */
export function emailDocId(email: string): string {
  return normalizeEmail(email);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}
