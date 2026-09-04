"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCurriculumForLevel,
  curriculumLevelLabels,
  type CurriculumItemType,
  type CurriculumLevel,
} from "@/lib/curriculum";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { useAuth } from "@/lib/auth-context";
import { getTrainingProgress, saveTrainingProgress } from "@/lib/progress";

const LEVEL_TABS: { level: CurriculumLevel; label: string }[] = (
  Object.keys(curriculumLevelLabels) as CurriculumLevel[]
).map((level) => ({ level, label: curriculumLevelLabels[level] }));

function ItemKindIcon({ type }: { type: CurriculumItemType }) {
  void type;
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" fill="currentColor">
      <circle cx="256" cy="256" r="256"></circle>
      <path
        d="M204.8 166.86v178.28a17.8 17.8 0 0 0 27.6 14.87l139.55-89.14a17.8 17.8 0 0 0 0-29.74l-139.55-89.14a17.8 17.8 0 0 0-27.6 14.87Z"
        fill="var(--bg-1, #fff)"
      ></path>
    </svg>
  );
}

export default function TrainingPage() {
  const { user } = useAuth();
  const [activeLevel, setActiveLevel] = useState<CurriculumLevel>("concept-art");
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [currentLessonKey, setCurrentLessonKey] = useState<string | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Resume where the student left off, once per sign-in.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgressLoaded(true);
      return;
    }
    let cancelled = false;
    setProgressLoaded(false);
    getTrainingProgress(user.uid)
      .then((progress) => {
        if (cancelled || !progress) return;
        const sectionsForLevel = buildCurriculumForLevel(progress.level);
        let sectionId: string | null = null;
        sectionsForLevel.forEach((sectionEntry) => {
          sectionEntry.items.forEach((_, index) => {
            if (`${sectionEntry.id}-${index}` === progress.lessonKey) sectionId = sectionEntry.id;
          });
        });
        if (!sectionId) return;
        setActiveLevel(progress.level);
        setOpenTopics(new Set([sectionId]));
        setCurrentLessonKey(progress.lessonKey);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProgressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sections = useMemo(() => buildCurriculumForLevel(activeLevel), [activeLevel]);

  // Flat, ordered list of every lesson key in the active level (for prev/next).
  const lessonKeys = useMemo(() => {
    const keys: string[] = [];
    sections.forEach((sectionEntry) => {
      sectionEntry.items.forEach((_, index) => keys.push(`${sectionEntry.id}-${index}`));
    });
    return keys;
  }, [sections]);

  const lessonLabels = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((sectionEntry) => {
      sectionEntry.items.forEach((item, index) => map.set(`${sectionEntry.id}-${index}`, item.label));
    });
    return map;
  }, [sections]);

  const lessonVideoIds = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((sectionEntry) => {
      sectionEntry.items.forEach((item, index) => {
        if (item.bunnyVideoId) map.set(`${sectionEntry.id}-${index}`, item.bunnyVideoId);
      });
    });
    return map;
  }, [sections]);

  const currentIndex = currentLessonKey ? lessonKeys.indexOf(currentLessonKey) : -1;
  const totalLessons = lessonKeys.length;

  const videoTitle = currentIndex >= 0 && currentLessonKey
    ? lessonLabels.get(currentLessonKey) ?? "Welcome to 3D Digital Game Art"
    : "Welcome to 3D Digital Game Art";
  const videoDescription = currentIndex >= 0
    ? `Lesson ${currentIndex + 1} of ${totalLessons} in the 3D Digital Game Art curriculum.`
    : "Select any lesson from the curriculum on the right to begin watching the training videos.";
  const currentVideoId = currentLessonKey ? lessonVideoIds.get(currentLessonKey) : undefined;

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
    if (user && progressLoaded) {
      saveTrainingProgress(user.uid, activeLevel, key).catch(() => {});
    }
  }

  function selectByOffset(offset: number) {
    if (!lessonKeys.length) return;
    const nextIndex = currentIndex < 0 ? 0 : Math.min(Math.max(currentIndex + offset, 0), lessonKeys.length - 1);
    const key = lessonKeys[nextIndex];
    setCurrentLessonKey(key);
    if (user && progressLoaded) {
      saveTrainingProgress(user.uid, activeLevel, key).catch(() => {});
    }
  }

  return (
    <main id="training" className="section active">
      <div className="training-page">
        <div className="training-layout">
          {/* Left Column - Video Player */}
          <div className="video-section">
            <div className="video-player glass">
              <div className="video-container">
                {currentVideoId ? (
                  <iframe
                    key={currentVideoId}
                    src={bunnyEmbedUrl(currentVideoId)}
                    title={videoTitle}
                    loading="lazy"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="video-iframe"
                  />
                ) : (
                  <div className="video-placeholder">
                    <div className="play-icon">&#9658;</div>
                    <p>
                      {currentLessonKey
                        ? "This lesson's video hasn't been uploaded yet."
                        : "Select a lesson to start learning"}
                    </p>
                  </div>
                )}
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
                      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-3-3 2.2-2.2Z"></path>
                      <path d="m14 14 5 5"></path>
                    </svg>
                    <span>Required tools</span>
                  </div>
                  <ul className="resource-list">
                    <li>Drawing tablet</li>
                    <li>Adobe Photoshop</li>
                    <li>Autodesk Maya</li>
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
                    <span>Documentation</span>
                  </div>
                  <ul className="resource-doc-list">
                    {[
                      { label: "Technical Description", href: "#" },
                      { label: "Example Test Project", href: "#" },
                      { label: "Task Bank", href: "#" },
                    ].map((doc) => (
                      <li key={doc.label}>
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
                          <path d="M14 2v6h6"></path>
                        </svg>
                        <span>{doc.label}</span>
                        <a
                          className="resource-doc-open"
                          href={doc.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${doc.label}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                          </svg>
                        </a>
                      </li>
                    ))}
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
              {sections.map((sectionEntry, sectionIndex) => {
                const isOpen = openTopics.has(sectionEntry.id);
                const sectionNumber = String(sectionIndex + 1).padStart(2, "0");
                const completedCount = sectionEntry.items.filter((_, index) =>
                  watched.has(`${sectionEntry.id}-${index}`),
                ).length;
                return (
                  <div className="accordion-topic curriculum-cu-topic" key={sectionEntry.id}>
                    <button
                      className={`accordion-btn${isOpen ? " active" : ""}`}
                      type="button"
                      onClick={() => toggleTopic(sectionEntry.id)}
                    >
                      <span className="topic-copy">
                        <span className="topic-title">
                          {sectionNumber}. {sectionEntry.title}
                        </span>
                      </span>
                      <span className="topic-progress-count">
                        {completedCount}/{sectionEntry.items.length}
                      </span>
                      <span className="accordion-arrow">&rsaquo;</span>
                    </button>
                    <div className={`accordion-content${isOpen ? " active" : ""}`} id={sectionEntry.id}>
                      {sectionEntry.items.map((item, index) => {
                        const key = `${sectionEntry.id}-${index}`;
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
                            {item.durationLabel && (
                              <span className="lesson-duration">{item.durationLabel}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
