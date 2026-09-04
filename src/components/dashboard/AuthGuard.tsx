"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";

/**
 * Gates the authenticated app. Beyond requiring a signed-in user, it verifies
 * the account is approved (its Firestore profile is readable under the rules).
 * An unapproved or leftover session is signed out and bounced to /login — so
 * no page renders for anyone the rules wouldn't let read data anyway.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "approved">("checking");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const next = encodeURIComponent(pathname || "/training");
      router.replace(`/login?next=${next}`);
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("checking");
    (async () => {
      try {
        await refreshProfile();
        if (!cancelled) setState("approved");
      } catch {
        // Not approved — don't let the shell render; sign out and redirect.
        await signOut().catch(() => {});
        if (!cancelled) router.replace("/login?error=not-approved");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname, router, signOut, refreshProfile]);

  if (loading || !user || state !== "approved") {
    return <div className="auth-loading">Loading…</div>;
  }

  if (profile?.mustChangePassword) {
    return (
      <main className="section active">
        <div className="profile-page">
          <section className="profile-card glass">
            <div className="profile-card-head">
              <div>
                <h2>Set a new password</h2>
                <p>Your password was reset. Choose a new one to continue.</p>
              </div>
            </div>
            <ChangePasswordForm onSuccess={() => refreshProfile()} />
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
