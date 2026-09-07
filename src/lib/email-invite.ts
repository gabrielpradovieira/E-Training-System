"use client";

import emailjs from "@emailjs/browser";

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

export const COURSE_NAME = "Skills Challenge Preparation Course 2026";

/**
 * Sends a "you've been invited" email via EmailJS (a free, client-only email
 * API — no backend/Cloud Functions needed, fitting this app's client-only
 * architecture). Silently does nothing if the EmailJS env vars aren't
 * configured, so account creation always works even before an admin sets
 * this up. Failures are swallowed to a boolean rather than thrown, since a
 * failed invite email should never block account creation.
 *
 * The EmailJS template (configured in the EmailJS dashboard, not here) is
 * expected to use these variable names: to_name, to_email, role,
 * login_email, login_password, login_url, course_name.
 */
export async function sendInviteEmail(params: {
  displayName: string;
  email: string;
  password: string;
  role: "admin" | "teacher" | "student";
}): Promise<boolean> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) return false;
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name: params.displayName,
        to_email: params.email,
        role: params.role === "admin" ? "Admin" : params.role === "teacher" ? "Teacher" : "Student",
        login_email: params.email,
        login_password: params.password,
        login_url: `${window.location.origin}/login`,
        course_name: COURSE_NAME,
      },
      { publicKey: PUBLIC_KEY },
    );
    return true;
  } catch {
    return false;
  }
}

/** Whether EmailJS is configured at all — lets the UI hide/adjust invite-related messaging. */
export const isInviteEmailConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
