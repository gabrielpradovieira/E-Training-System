"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ensureProfile } from "@/lib/data";

/**
 * Gates the authenticated app. Beyond requiring a signed-in user, it verifies
 * the account is approved (its Firestore profile is readable under the rules).
 * An unapproved or leftover session is signed out and bounced to /login — so
 * no page renders for anyone the rules wouldn't let read data anyway.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
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
        await ensureProfile(user);
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
  }, [loading, user, pathname, router, signOut]);

  if (loading || !user || state !== "approved") {
    return <div className="auth-loading">Loading…</div>;
  }

  return <>{children}</>;
}
