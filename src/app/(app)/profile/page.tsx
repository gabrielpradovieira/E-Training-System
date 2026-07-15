const fields = [
  { label: "Full name", value: "Ahmed Al Mansoori" },
  { label: "Email", value: "ahmed.almansoori@example.ae" },
  { label: "Phone number", value: "+971 50 000 0000" },
  { label: "Emirates ID", value: "784-0000-0000000-0" },
  { label: "Role", value: "Competitor" },
  { label: "Skill category", value: "3D Digital Game Art" },
];

export default function ProfilePage() {
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
              <h2>Ahmed Al Mansoori</h2>
              <p>Competitor profile and registration details</p>
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
      </div>
    </main>
  );
}
