"use client";

import { useMemo, useState } from "react";
import {
  buildCurriculumForLevel,
  competenceUnits,
  type CurriculumItemType,
  type CurriculumLevel,
} from "@/lib/curriculum";

const LEVEL_TABS: { level: CurriculumLevel; label: string }[] = [
  { level: "foundation", label: "Foundation" },
  { level: "intermediate", label: "Intermediate" },
  { level: "advanced", label: "Advanced" },
];

function ItemKindIcon({ type }: { type: CurriculumItemType }) {
  void type;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6v12Z"></path>
      <rect x="3" y="5" width="18" height="14" rx="3"></rect>
    </svg>
  );
}

// Foundation units (cu <= 5) start with their video lessons marked watched.
const initialWatched = new Set<string>();
competenceUnits.forEach((unit) => {
  if (unit.cu <= 5) {
    const topicId = `course-cu-${unit.cu}`;
    // Overview / Tool workflow / Practice = 3 video items.
    for (let i = 0; i < 3; i += 1) initialWatched.add(`${topicId}-${i}`);
  }
});

const CERTIFICATE_PERCENT = 15;

export default function TrainingPage() {
  const [activeLevel, setActiveLevel] = useState<CurriculumLevel>("foundation");
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [watched, setWatched] = useState<Set<string>>(() => new Set(initialWatched));
  const [currentLessonKey, setCurrentLessonKey] = useState<string | null>(null);

  const groups = useMemo(() => buildCurriculumForLevel(activeLevel), [activeLevel]);

  // Flat, ordered list of every lesson key in the active level (for prev/next).
  const lessonKeys = useMemo(() => {
    const keys: string[] = [];
    groups.forEach((group) => {
      group.units.forEach((unit) => {
        unit.items.forEach((_, index) => keys.push(`${unit.topicId}-${index}`));
      });
    });
    return keys;
  }, [groups]);

  const lessonLabels = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((group) => {
      group.units.forEach((unit) => {
        unit.items.forEach((item, index) => map.set(`${unit.topicId}-${index}`, item.label));
      });
    });
    return map;
  }, [groups]);

  const currentIndex = currentLessonKey ? lessonKeys.indexOf(currentLessonKey) : -1;
  const totalLessons = lessonKeys.length;

  const videoTitle = currentIndex >= 0 && currentLessonKey
    ? lessonLabels.get(currentLessonKey) ?? "Welcome to 3D Digital Game Art"
    : "Welcome to 3D Digital Game Art";
  const videoDescription = currentIndex >= 0
    ? `Lesson ${currentIndex + 1} of ${totalLessons} in the 3D Digital Game Art curriculum.`
    : "Select any lesson from the curriculum on the right to begin watching the training videos.";

  function changeLevel(level: CurriculumLevel) {
    setActiveLevel(level);
    setOpenTopics(new Set());
    setCurrentLessonKey(null);
  }

  function toggleTopic(topicId: string) {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function selectLesson(key: string) {
    setWatched((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setCurrentLessonKey(key);
  }

  function selectByOffset(offset: number) {
    if (!lessonKeys.length) return;
    const nextIndex = currentIndex < 0 ? 0 : Math.min(Math.max(currentIndex + offset, 0), lessonKeys.length - 1);
    setCurrentLessonKey(lessonKeys[nextIndex]);
  }

  return (
    <main id="training" className="section active">
      <div className="training-page">
        <div className="training-layout">
          {/* Left Column - Video Player */}
          <div className="video-section">
            <div className="video-player glass">
              <div className="video-container">
                <div className="video-placeholder">
                  <div className="play-icon">&#9658;</div>
                  <p>Select a lesson to start learning</p>
                </div>
              </div>
              <div className="video-info">
                <div className="video-copy">
                  <h3 className="video-title">{videoTitle}</h3>
                  <p className="video-description">{videoDescription}</p>
                </div>
                <div className="video-controls" aria-label="Lesson navigation">
                  <button
                    className="lesson-nav-btn prev-lesson"
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() => selectByOffset(-1)}
                  >
                    Previous
                  </button>
                  <button
                    className="lesson-nav-btn next-lesson"
                    type="button"
                    disabled={totalLessons === 0 || currentIndex >= totalLessons - 1}
                    onClick={() => selectByOffset(1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="certificate-panel glass">
              <div className="certificate-panel-heading">
                <h3>Training Resources</h3>
              </div>
              <div className="certificate-section">
                <div className="certificate-main">
                  <div className="certificate-title">
                    <svg className="certificate-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h12v18l-6-3-6 3V3Z"></path>
                      <path d="M9 8h6"></path>
                      <path d="M9 12h4"></path>
                    </svg>
                    <span>Completion Certificate</span>
                  </div>
                  <p className="certificate-note">Certificate will be available for download only after full completion of the course.</p>
                </div>
                <div className="certificate-actions">
                  <div className="certificate-progress" aria-label="Course completion progress">
                    <div className="topic-progress-bar-container">
                      <div
                        className="topic-progress-bar certificate-progress-bar"
                        style={{ ["--progress" as string]: `${CERTIFICATE_PERCENT}%` }}
                      ></div>
                    </div>
                    <span className="progress-text certificate-progress-text">{CERTIFICATE_PERCENT}%</span>
                  </div>
                  <button className="certificate-button" type="button" disabled aria-disabled="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12"></path>
                      <path d="m7 10 5 5 5-5"></path>
                      <path d="M5 21h14"></path>
                    </svg>
                    <span>Download Certificate</span>
                  </button>
                </div>
              </div>
              <div className="certificate-section">
                <div className="certificate-main">
                  <div className="certificate-title">
                    <svg className="certificate-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-3-3 2.2-2.2Z"></path>
                      <path d="m14 14 5 5"></path>
                    </svg>
                    <span>Required tools</span>
                  </div>
                  <ul className="resource-list">
                    <li>Drawing tablet</li>
                    <li>Photoshop/Maya/Substance Painter/ZBrush/Unreal Engine</li>
                  </ul>
                  <p className="resource-helper-note">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                    <span>Kindly request software and hardware access to your School IT Department.</span>
                  </p>
                </div>
              </div>
              <div className="certificate-section">
                <div className="certificate-main">
                  <div className="certificate-title">
                    <svg className="certificate-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
                      <path d="M14 2v6h6"></path>
                      <path d="M12 18v-6"></path>
                      <path d="m9 15 3 3 3-3"></path>
                    </svg>
                    <span>Learning Material</span>
                  </div>
                  <p className="certificate-note">Reference document available for download.</p>
                  <ul className="resource-file-list">
                    <li>
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
                        <path d="M14 2v6h6"></path>
                      </svg>
                      <span>Modeling_TASK.ma</span>
                      <a className="resource-file-download" href="#" aria-label="Download Modeling_TASK.ma">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12"></path>
                          <path d="m7 10 5 5 5-5"></path>
                          <path d="M5 21h14"></path>
                        </svg>
                      </a>
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
                        <path d="M14 2v6h6"></path>
                      </svg>
                      <span>Maya_Shortcut_Guide.pdf</span>
                      <a className="resource-file-download" href="#" aria-label="Download Maya_Shortcut_Guide.pdf">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12"></path>
                          <path d="m7 10 5 5 5-5"></path>
                          <path d="M5 21h14"></path>
                        </svg>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Scrollable Curriculum */}
          <div className="curriculum-sidebar glass">
            <div className="curriculum-header">
              <div className="curriculum-title-row">
                <h3>Course Curriculum</h3>
              </div>
              <div className="curriculum-level-tabs" role="tablist" aria-label="Curriculum level filter">
                {LEVEL_TABS.map((tab) => (
                  <button
                    key={tab.level}
                    className={`curriculum-level-tab${activeLevel === tab.level ? " active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeLevel === tab.level}
                    onClick={() => changeLevel(tab.level)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="accordion-container curriculum-cu-list" id="curriculum-cu-list">
              {groups.map((group) => (
                <div key={group.core}>
                  <div className="curriculum-core-heading">
                    <span>Core Competence {group.core}</span>
                    <p>{group.description}</p>
                  </div>
                  {group.units.map((unit) => {
                    const isOpen = openTopics.has(unit.topicId);
                    return (
                      <div className="accordion-topic curriculum-cu-topic" key={unit.topicId}>
                        <button
                          className={`accordion-btn${isOpen ? " active" : ""}`}
                          type="button"
                          onClick={() => toggleTopic(unit.topicId)}
                        >
                          <span className="curriculum-cu-code">CU {unit.cu}</span>
                          <span className="topic-copy">
                            <span className="topic-title">{unit.title}</span>
                          </span>
                          <span className="accordion-arrow">&rsaquo;</span>
                        </button>
                        <div className={`accordion-content${isOpen ? " active" : ""}`} id={unit.topicId}>
                          {unit.items.map((item, index) => {
                            const key = `${unit.topicId}-${index}`;
                            const isWatched = watched.has(key);
                            const isCurrent = currentLessonKey === key;
                            const className = `detail-item curriculum-video-item${isWatched ? " watched" : ""}${isCurrent ? " current" : ""}`;
                            return (
                              <div
                                key={key}
                                className={className}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isWatched}
                                onClick={() => selectLesson(key)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectLesson(key);
                                  }
                                }}
                              >
                                <span className={`curriculum-item-kind ${item.itemType}`}>
                                  <ItemKindIcon type={item.itemType} />
                                </span>
                                <span className="lesson-label">{item.label}</span>
                                <span className="lesson-duration">{item.meta}</span>
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
          </div>
        </div>
      </div>
    </main>
  );
}
