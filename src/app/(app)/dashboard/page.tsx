/* eslint-disable @next/next/no-img-element */

const RoadmapClock = () => (
  <svg className="roadmap-clock" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
    <path d="M12 6v6l4 3" fill="none" stroke="var(--bg-1)" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter"></path>
  </svg>
);

const allStudentsBars = [
  { label: "Ahmed", hours: "38h", height: 118 },
  { label: "Fatima", hours: "62h", height: 178 },
  { label: "Omar", hours: "45h", height: 136 },
  { label: "Aisha", hours: "71h", height: 200 },
  { label: "Hassan", hours: "29h", height: 96 },
  { label: "Layla", hours: "54h", height: 158 },
  { label: "Khalid", hours: "67h", height: 190 },
  { label: "Sara", hours: "41h", height: 126 },
];

const myMonthlyBars = [
  { label: "Nov", hours: "25h", height: 104 },
  { label: "Dec", hours: "32h", height: 128 },
  { label: "Jan", hours: "28h", height: 114 },
  { label: "Feb", hours: "35h", height: 140 },
  { label: "Mar", hours: "42h", height: 166 },
  { label: "Apr", hours: "45h", height: 178 },
];

const roadmapStages = [
  { num: "1.", title: "Skills Challenge", date: "24/11/2026", hours: "100 h" },
  { num: "2.", title: "EmiratesSkills", date: "2026", hours: "300 h" },
  { num: "3.", title: "WorldSkills Asia 2027", date: "2027", hours: "700 h" },
  { num: "4.", title: "WorldSkills Aichi 2028", date: "2028", hours: "1500 h" },
];

export default function DashboardPage() {
  return (
    <main id="dashboard" className="section active dashboard-rebuild-section">
      <div className="db-shell">
        <section className="db-card db-roadmap" aria-label="Competition journey roadmap">
          <div className="db-roadmap-track">
            <img
              className="roadmap-svg-image light-roadmap"
              src="/assets/competition_pathway.svg"
              alt="Competition pathway from Skills Challenge to EmiratesSkills, WorldSkills Asia, and WorldSkills International"
            />
            <img
              className="roadmap-svg-image dark-roadmap"
              src="/assets/competition_pathway_dark.svg"
              alt="Competition pathway from Skills Challenge to EmiratesSkills, WorldSkills Asia, and WorldSkills International"
            />
            <div className="roadmap-stage-labels" aria-label="Competition pathway milestones">
              {roadmapStages.map((stage) => (
                <div className="roadmap-stage" key={stage.title}>
                  <span className="roadmap-stage-number">{stage.num}</span>
                  <h3 className="roadmap-stage-title">{stage.title}</h3>
                  <div className="roadmap-stage-date">{stage.date}</div>
                  <div className="roadmap-stage-hours">
                    <RoadmapClock />
                    <span>{stage.hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="db-graph-row">
          <section className="db-card db-chart-card">
            <div className="db-card-head compact">
              <div>
                <h2>All Students Monthly Hours</h2>
                <p>April training activity</p>
              </div>
            </div>
            <div className="db-bars students" aria-label="All students monthly hours chart">
              {allStudentsBars.map((bar) => (
                <div className="db-bar-item" key={bar.label}>
                  <span>{bar.hours}</span>
                  <div style={{ height: `${bar.height}px` }}></div>
                  <p>{bar.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="db-card db-chart-card">
            <div className="db-card-head compact">
              <div>
                <h2>My Monthly Hours</h2>
                <p>Last six months</p>
              </div>
            </div>
            <div className="db-bars mine" aria-label="My monthly hours chart">
              {myMonthlyBars.map((bar) => (
                <div className="db-bar-item" key={bar.label}>
                  <span>{bar.hours}</span>
                  <div style={{ height: `${bar.height}px` }}></div>
                  <p>{bar.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="db-card db-schedule-card">
          <div className="db-card-head">
            <div>
              <h2>My Student Schedule</h2>
              <p>Monday to Friday, 8 AM to 6 PM</p>
            </div>
            <span className="db-pill">Total training hours planned = 6 hours</span>
          </div>
          <div className="db-calendar" aria-label="Weekly training schedule">
            <div className="db-time-head"></div>
            <div className="db-day-head">MON</div>
            <div className="db-day-head">TUE</div>
            <div className="db-day-head">WED</div>
            <div className="db-day-head">THU</div>
            <div className="db-day-head">FRI</div>
            <div className="db-time">8 AM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">9 AM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">10 AM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">11 AM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">12 PM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">1 PM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">2 PM</div><div></div><div></div><div></div><div></div><div></div>
            <div className="db-time">3 PM</div>
            <div className="db-event" style={{ gridRow: "9 / span 3", gridColumn: 2 }}>Training<br /><span>3 PM - 6 PM</span></div>
            <div></div>
            <div className="db-event" style={{ gridRow: "9 / span 3", gridColumn: 4 }}>Training<br /><span>3 PM - 6 PM</span></div>
            <div></div>
            <div></div>
            <div className="db-time">4 PM</div><div></div><div></div><div></div>
            <div className="db-time">5 PM</div><div></div><div></div><div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
