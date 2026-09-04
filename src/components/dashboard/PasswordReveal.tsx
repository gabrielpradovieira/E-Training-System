"use client";

import { useState } from "react";

/** A masked password with a click-to-reveal eye toggle, admin-only UI. */
export default function PasswordReveal({ password }: { password?: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!password) return <span className="admin-empty">—</span>;

  return (
    <span className="password-reveal">
      <code>{revealed ? password : "•".repeat(Math.min(password.length, 12))}</code>
      <button
        type="button"
        className="password-eye-btn"
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        onClick={() => setRevealed((prev) => !prev)}
      >
        {revealed ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
