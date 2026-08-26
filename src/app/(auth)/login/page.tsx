"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M2 2l20 20" />}
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-split">
          <div className="login-visual" />
          <div className="login-panel">
            <div className="login-panel-inner">Loading…</div>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const registered = searchParams.get("registered") === "1";
  const notApproved = searchParams.get("error") === "not-approved";
  const { user, loading, signInEmail, signInGoogle, signInMicrosoft } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    notApproved ? "Your email is not approved to use the system yet. Contact your administrator." : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only auto-redirect visitors who are ALREADY signed in on arrival.
    // During an active sign-in, handleEmailSubmit/handleGoogle navigate only
    // after the approval check passes — otherwise the "not approved" error
    // would be lost to a premature redirect.
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

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle();
      router.replace(nextPath);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleMicrosoft() {
    setError(null);
    setBusy(true);
    try {
      await signInMicrosoft();
      router.replace(nextPath);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-split">
      <div className="login-visual">
        <div className="login-visual-copy">
          <span className="login-visual-eyebrow">E-Training</span>
          <h2 className="login-visual-title">3D Digital Game Art</h2>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <h1 className="login-heading">Login</h1>

          {registered && <div className="auth-success">Account created. You can sign in now.</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleEmailSubmit}>
            <div className="login-field">
              <label htmlFor="email">
                Email <span className="login-required">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">
                Password <span className="login-required">*</span>
              </label>
              <div className="login-password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>
            <button className="login-btn" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>

          <div className="login-divider">or</div>

          <button className="login-oauth-btn" type="button" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon />
            Continue with Google
          </button>

          <button className="login-oauth-btn" type="button" onClick={handleMicrosoft} disabled={busy}>
            <MicrosoftIcon />
            Continue with Microsoft
          </button>

          <p className="login-footer">
            If you are not registered yet you will need to contact your Organization to arrange
            access, or{" "}
            <Link href={`/register${nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
              create your account
            </Link>{" "}
            if already approved.
          </p>
        </div>
      </div>
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
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled yet. Contact your administrator.";
    default:
      return err instanceof Error ? err.message : "Sign-in failed. Please try again.";
  }
}
