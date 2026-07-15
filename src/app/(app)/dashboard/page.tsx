/* eslint-disable @next/next/no-img-element */

const CheckpointClock = () => (
  <svg className="roadmap-clock" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
    <path d="M12 6v6l4 3" fill="none" stroke="var(--bg-1)" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter"></path>
  </svg>
);

// The competition checkpoints, from the first challenge to WorldSkills Aichi.
const checkpoints = [
  { num: "1.", title: "Skills Challenge", date: "24/11/2026", hours: "100 h" },
  { num: "2.", title: "EmiratesSkills", date: "2026", hours: "300 h" },
  { num: "3.", title: "WorldSkills Asia 2027", date: "2027", hours: "700 h" },
  { num: "4.", title: "WorldSkills Aichi 2028", date: "2028", hours: "1500 h" },
];

export default function DashboardPage() {
  return (
    <main id="dashboard" className="section active dashboard-rebuild-section">
      <div className="db-shell">
        <section className="db-card db-roadmap" aria-label="Competition checkpoints">
          <div className="db-roadmap-track">
            <img
              className="roadmap-svg-image light-roadmap"
              src="/assets/competition_pathway.svg"
              alt="Competition checkpoints from Skills Challenge to EmiratesSkills, WorldSkills Asia, and WorldSkills International"
            />
            <img
              className="roadmap-svg-image dark-roadmap"
              src="/assets/competition_pathway_dark.svg"
              alt="Competition checkpoints from Skills Challenge to EmiratesSkills, WorldSkills Asia, and WorldSkills International"
            />
            <div className="roadmap-stage-labels" aria-label="Competition checkpoint milestones">
              {checkpoints.map((checkpoint) => (
                <div className="roadmap-stage" key={checkpoint.title}>
                  <span className="roadmap-stage-number">{checkpoint.num}</span>
                  <h3 className="roadmap-stage-title">{checkpoint.title}</h3>
                  <div className="roadmap-stage-date">{checkpoint.date}</div>
                  <div className="roadmap-stage-hours">
                    <CheckpointClock />
                    <span>{checkpoint.hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
