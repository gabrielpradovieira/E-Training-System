"use client";

import { useAuth } from "@/lib/auth-context";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";

export default function ProfilePage() {
  const { user, profile } = useAuth();

  const displayName = profile?.displayName || user?.displayName || "—";
  const email = profile?.email || user?.email || "—";
  const school = profile?.school || "—";
  const role = profile?.role === "admin" ? "Admin" : profile?.role === "teacher" ? "Teacher" : "Student";
  const canChangeOwnPassword = profile?.role === "teacher" || profile?.role === "admin";

  const fields = [
    { label: "Full name", value: displayName },
    { label: "Email", value: email },
    { label: "School", value: school },
    { label: "Role", value: role },
  ];

  return (
    <main id="profile" className="section active">
      <div className="profile-page">
        <section className="profile-card glass">
          <div className="profile-card-head">
            <div className="profile-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>Student profile and registration details</p>
            </div>
          </div>
          <div className="profile-details">
            {fields.map((field) => (
              <div className="profile-field" key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {canChangeOwnPassword && (
          <section className="profile-card glass">
            <div className="profile-card-head">
              <div>
                <h2>Change password</h2>
                <p>Set a new password for your own account.</p>
              </div>
            </div>
            <ChangePasswordForm />
          </section>
        )}
      </div>
    </main>
  );
}
