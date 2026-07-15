import { coreCompetences, competenceUnits } from "@/lib/curriculum";

type UnitState = "completed" | "active" | "locked";

function unitState(cu: number): UnitState {
  if (cu <= 5) return "completed";
  if (cu === 6) return "active";
  return "locked";
}

const levels: {
  key: string;
  badge: string;
  title: string;
  meta: string;
  cores: number[];
}[] = [
  {
    key: "foundation",
    badge: "Foundation",
    title: "Level 1 — Drawing, Concept Art & 3D Modelling Fundamentals",
    meta: "150 h · Weeks 1–25",
    cores: [1],
  },
  {
    key: "intermediate",
    badge: "Intermediate",
    title: "Level 2 — Sculpting, Retopology, UV Mapping & PBR Texturing",
    meta: "150 h · Weeks 26–50",
    cores: [2],
  },
  {
    key: "advanced",
    badge: "Advanced",
    title: "Level 3 — Rigging, Animation, Engine & WorldSkills Production",
    meta: "700 h · Weeks 51–96",
    cores: [3, 4, 5, 6, 7],
  },
];

function LockIcon() {
  return (
    <div className="comp-lock">
      <svg viewBox="0 0 24 24">
        <path d="M17 11V7A5 5 0 0 0 7 7v4H5v10h14V11h-2Zm-5 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-6H9V7a3 3 0 0 1 6 0v4Z" />
      </svg>
      Locked
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="comp-unit-progress">
      <div className="topic-progress-bar-container">
        <div className="topic-progress-bar" style={{ ["--progress" as string]: `${percent}%` }}></div>
      </div>
      <span className="progress-text">{percent}%</span>
    </div>
  );
}

export default function CompetencesPage() {
  return (
    <main id="competences" className="section active">
      <div className="comp-page">
        <div className="comp-overview-board glass">
          <div className="comp-framework-summary">
            <div className="comp-framework-copy">
              <p className="comp-framework-title">Task Oriented Approach</p>
              <p className="comp-framework-description">
                Each Competence Unit takes 4 weeks of preparation. Once the task is completed, submit the files in the &quot;Start Task button&quot;.
              </p>
            </div>
            <span className="comp-framework-meta">7 Core &nbsp;&middot;&nbsp; 33 Units &nbsp;&middot;&nbsp; 1000 h</span>
          </div>
          <div className="comp-stats-bar">
            <div className="comp-stat achieved">
              <span className="comp-stat-label">Achieved</span>
              <span className="comp-stat-value">5</span>
              <div className="comp-stat-progress" aria-label="15% completion">
                <span style={{ ["--progress" as string]: "15%" }}></span>
              </div>
            </div>
            <div className="comp-stat pending">
              <span className="comp-stat-label">Pending</span>
              <span className="comp-stat-value">28</span>
            </div>
            <div className="comp-stat current">
              <span className="comp-stat-label">Current Competence</span>
              <span className="comp-stat-value">Level 2 — CU 6</span>
            </div>
          </div>
        </div>

        {levels.map((level) => (
          <div className="comp-level" key={level.key}>
            <div className={`comp-level-bar ${level.key}`}>
              <span className="comp-level-badge">{level.badge}</span>
              <span className="comp-level-title">{level.title}</span>
              <span className="comp-level-meta">{level.meta}</span>
            </div>

            {level.cores.map((core) => {
              const units = competenceUnits.filter((unit) => unit.core === core);
              return (
                <div className="comp-core" key={core}>
                  <div className="comp-core-header">
                    <span className="comp-core-num">{core}</span>
                    <span className="comp-core-text">{coreCompetences[core]}</span>
                  </div>
                  <div className="comp-units">
                    {units.map((unit) => {
                      const state = unitState(unit.cu);
                      return (
                        <div className={`comp-unit-row ${state}`} key={unit.cu}>
                          <span className="comp-unit-num">CU {unit.cu}</span>
                          <span className="comp-unit-name">{unit.title}</span>
                          {state === "completed" && (
                            <>
                              <ProgressBar percent={100} />
                              <span className="comp-check">&#10003;</span>
                            </>
                          )}
                          {state === "active" && <button className="comp-start-btn">Start Task</button>}
                          {state === "locked" && <LockIcon />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
