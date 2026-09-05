"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-card">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function ForgotPassword({ initialEmail }: { initialEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  if (!open) {
    return (
      <button type="button" className="auth-forgot-link" onClick={() => setOpen(true)}>
        Forgot password?
      </button>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus({ kind: "success", message: "If an account exists for that email, a reset link is on its way." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't send the reset email. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-forgot-box">
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="reset-email">Enter your email to reset your password</label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {status && <div className={status.kind === "success" ? "auth-success" : "auth-error"}>{status.message}</div>}
        <button className="auth-btn" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <button type="button" className="auth-forgot-link" onClick={() => setOpen(false)}>
        Back to sign in
      </button>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/home";
  const notApproved = searchParams.get("error") === "not-approved";
  const { user, loading, signInEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    notApproved ? "Your email is not approved to use the system yet. Contact your administrator." : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only auto-redirect visitors who are ALREADY signed in on arrival.
    // During an active sign-in, handleEmailSubmit navigates only after the
    // approval check passes — otherwise the "not approved" error would be
    // lost to a premature redirect.
    if (!loading && user && !busy) router.replace(nextPath);
  }, [loading, user, busy, router, nextPath]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInEmail(email, password);
      router.replace(nextPath);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3.5" width="20" height="13.5" rx="2"></rect>
          <path d="M9.6 7.6v5.3l4.6-2.65Z" fill="currentColor" stroke="none"></path>
          <path d="M9 21h6"></path>
          <path d="M12 17v4"></path>
        </svg>
      </div>
      <h1 className="auth-title">E-Training System</h1>
      <p className="auth-subtitle">Sign in to continue</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleEmailSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="auth-btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <ForgotPassword initialEmail={email} />
    </div>
  );
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
  }
}
