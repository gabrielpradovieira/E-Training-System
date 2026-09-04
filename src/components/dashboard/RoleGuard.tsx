"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Gates a page to admins and/or teachers. Renders nothing (and redirects
 * to /training) for anyone else — mirrors AuthGuard's client-only pattern;
 * the real enforcement is in firestore.rules, this just avoids flashing
 * the page to someone who can't use it.
 */
export default function RoleGuard({
  allow,
  children,
}: {
  allow: "admin" | "teacher-or-admin";
  children: React.ReactNode;
}) {
  const { isAdmin, isTeacher, profile } = useAuth();
  const router = useRouter();

  const allowed = allow === "admin" ? isAdmin : isAdmin || isTeacher;

  useEffect(() => {
    if (profile && !allowed) router.replace("/training");
  }, [profile, allowed, router]);

  if (!profile || !allowed) {
    return <div className="auth-loading">Loading…</div>;
  }

  return <>{children}</>;
}
