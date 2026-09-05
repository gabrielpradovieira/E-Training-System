"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCurriculumForLevel,
  buildGlobalLessonNumbers,
  buildLessonInfoMap,
  curriculum,
  curriculumLevelLabels,
  type CurriculumItemType,
  type CurriculumLevel,
} from "@/lib/curriculum";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { useAuth } from "@/lib/auth-context";
import { getTrainingProgress, saveTrainingProgress, saveWatchedLessons } from "@/lib/progress";
import {
  buildTaskOrdinals,
  createTask,
  deleteTask,
  fetchAllTasks,
  fetchTaskCompletions,
  formatTaskNumber,
  markTaskCompleted,
  unmarkTaskCompleted,
  type LessonTask,
  type TaskCompletion,
} from "@/lib/tasks";
import Modal from "@/components/dashboard/Modal";

const FIRST_LEVEL: CurriculumLevel = "concept-art";
const FIRST_TOPIC_ID = "concept-art-tools";
const FIRST_LESSON_KEY = "concept-art-tools-0";

const LEVEL_TABS: { level: CurriculumLevel; label: string }[] = (
  Object.keys(curriculumLevelLabels) as CurriculumLevel[]
).map((level) => ({ level, label: curriculumLevelLabels[level] }));

// Continuous video numbering across both levels (Concept Art 1..N, then
// 3D Modeling continues from there) — computed once, doesn't change at runtime.
const GLOBAL_LESSON_NUMBERS = buildGlobalLessonNumbers();

// Lesson label/video-id/level lookups across BOTH levels, not just the one
// currently viewed — so a playing video keeps playing (title, iframe source,
// module tag all still resolve) even after switching the level tab away
// from it. Only clicking a lesson row/Prev/Next changes what's playing.
const LESSON_INFO = buildLessonInfoMap();
const GLOBAL_LESSON_LABELS = new Map<string, string>();
const GLOBAL_LESSON_VIDEO_IDS = new Map<string, string>();
(Object.keys(curriculum) as CurriculumLevel[]).forEach((level) => {
  curriculum[level].forEach((sectionEntry) => {
    sectionEntry.items.forEach((item, index) => {
      const key = `${sectionEntry.id}-${index}`;
      GLOBAL_LESSON_LABELS.set(key, item.label);
      if (item.bunnyVideoId) GLOBAL_LESSON_VIDEO_IDS.set(key, item.bunnyVideoId);
    });
  });
});

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

function TaskKindIcon() {
  // A solid pencil glyph, same currentColor convention as the other
  // curriculum icons (inherits the dark-blue --nav-1 from .curriculum-item-kind).
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" fill="currentColor">
      <path d="M362.7 19.3 314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v11" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function AddTaskModal({
  lessonLabel,
  busy,
  status,
  onSubmit,
  onClose,
}: {
  lessonLabel: string;
  busy: boolean;
  status: { kind: "success" | "error"; message: string } | null;
  onSubmit: (name: string, link: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  return (
    <Modal title={`Add task to "${lessonLabel}"`} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name, link);
        }}
      >
        <div className="admin-field">
          <label htmlFor="task-name">Task name</label>
          <input id="task-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label htmlFor="task-link">External link</label>
          <input
            id="task-link"
            type="url"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
        {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
        <button className="admin-submit-btn" type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add task"}
        </button>
      </form>
    </Modal>
  );
}

function CompleteTaskModal({
  task,
  busy,
  status,
  onSubmit,
  onClose,
}: {
  task: LessonTask;
  busy: boolean;
  status: { kind: "success" | "error"; message: string } | null;
  onSubmit: (link: string) => void;
  onClose: () => void;
}) {
  const [link, setLink] = useState("");

  return (
    <Modal title={`Submit "${task.name}"`} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(link);
        }}
      >
        <div className="admin-field">
          <label htmlFor="submission-link">Your submission link (OneDrive folder)</label>
          <input
            id="submission-link"
            type="url"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://onedrive.live.com/..."
          />
        </div>
        <p className="csv-hint">A link to your OneDrive submission is required to submit this task.</p>
        {status && <div className={`admin-status ${status.kind}`}>{status.message}</div>}
        <button className="admin-submit-btn" type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit"}
        </button>
      </form>
    </Modal>
  );
}

export default function TrainingPage() {
  const { user, isAdmin } = useAuth();
  const [activeLevel, setActiveLevel] = useState<CurriculumLevel>(FIRST_LEVEL);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [currentLessonKey, setCurrentLessonKey] = useState<string | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const [tasks, setTasks] = useState<LessonTask[]>([]);
  const [completions, setCompletions] = useState<Map<string, TaskCompletion>>(new Map());
  const [addTaskFor, setAddTaskFor] = useState<string | null>(null);
  const [addTaskBusy, setAddTaskBusy] = useState(false);
  const [addTaskStatus, setAddTaskStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [completingTask, setCompletingTask] = useState<LessonTask | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeStatus, setCompleteStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  // Resume where the student left off, once per sign-in — or, for a brand new
  // student with no saved progress yet, open the very first lesson.
  useEffect(() => {
    if (!user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setActiveLevel(FIRST_LEVEL);
      setOpenTopics(new Set([FIRST_TOPIC_ID]));
      setCurrentLessonKey(FIRST_LESSON_KEY);
      setProgressLoaded(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    setProgressLoaded(false);
    getTrainingProgress(user.uid)
      .then((progress) => {
        if (cancelled) return;
        if (!progress) {
          setActiveLevel(FIRST_LEVEL);
          setOpenTopics(new Set([FIRST_TOPIC_ID]));
          setCurrentLessonKey(FIRST_LESSON_KEY);
          return;
        }
        setWatched(new Set(progress.watchedKeys ?? []));
        const sectionsForLevel = buildCurriculumForLevel(progress.level);
        let sectionId: string | null = null;
        sectionsForLevel.forEach((sectionEntry) => {
          sectionEntry.items.forEach((_, index) => {
            if (`${sectionEntry.id}-${index}` === progress.lessonKey) sectionId = sectionEntry.id;
          });
        });
        setActiveLevel(progress.level);
        if (sectionId) setOpenTopics(new Set([sectionId]));
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

  // This user's task completions, fetched once per sign-in.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletions(new Map());
      return;
    }
    let cancelled = false;
    fetchTaskCompletions(user.uid)
      .then((map) => {
        if (!cancelled) setCompletions(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Every task in the system (not just the active level) — needed so task
  // numbering ("Task 01", "Task 02", ...) stays continuous across both
  // levels, the same way video numbering does.
  useEffect(() => {
    let cancelled = false;
    fetchAllTasks()
      .then((list) => {
        if (!cancelled) setTasks(list);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const taskOrdinals = useMemo(() => buildTaskOrdinals(tasks), [tasks]);

  const sections = useMemo(() => buildCurriculumForLevel(activeLevel), [activeLevel]);

  // Flat, ordered list of every lesson key in the active level (for prev/next).
  const lessonKeys = useMemo(() => {
    const keys: string[] = [];
    sections.forEach((sectionEntry) => {
      sectionEntry.items.forEach((_, index) => keys.push(`${sectionEntry.id}-${index}`));
    });
    return keys;
  }, [sections]);

  const tasksByLesson = useMemo(() => {
    const map = new Map<string, LessonTask[]>();
    tasks.forEach((task) => {
      const list = map.get(task.lessonKey) ?? [];
      list.push(task);
      map.set(task.lessonKey, list);
    });
    return map;
  }, [tasks]);

  const currentIndex = currentLessonKey ? lessonKeys.indexOf(currentLessonKey) : -1;
  const totalLessons = lessonKeys.length;

  const videoTitle = currentLessonKey
    ? GLOBAL_LESSON_LABELS.get(currentLessonKey) ?? "Welcome to 3D Digital Game Art"
    : "Welcome to 3D Digital Game Art";
  const currentVideoId = currentLessonKey ? GLOBAL_LESSON_VIDEO_IDS.get(currentLessonKey) : undefined;
  const currentVideoLevel = currentLessonKey ? LESSON_INFO.get(currentLessonKey)?.level : undefined;

  /** Switching tabs only changes which module's list is shown — the
   * playing video (if any) keeps playing until a lesson is actually clicked. */
  function changeLevel(level: CurriculumLevel) {
    setActiveLevel(level);
    setOpenTopics(new Set());
  }

  function toggleTopic(topicId: string) {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  /** Loads a lesson into the player. Does not affect its watched state. */
  function playLesson(key: string) {
    setCurrentLessonKey(key);
    if (user && progressLoaded) {
      saveTrainingProgress(user.uid, activeLevel, key).catch(() => {});
    }
  }

  /** Marks (or unmarks) a lesson as watched, independent of which lesson is playing. */
  function toggleWatched(key: string) {
    const next = new Set(watched);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setWatched(next);
    if (user && progressLoaded) {
      saveWatchedLessons(user.uid, Array.from(next)).catch(() => {});
    }
  }

  function selectByOffset(offset: number) {
    if (!lessonKeys.length) return;
    const nextIndex = currentIndex < 0 ? 0 : Math.min(Math.max(currentIndex + offset, 0), lessonKeys.length - 1);
    playLesson(lessonKeys[nextIndex]);
  }

  async function handleAddTask(name: string, link: string) {
    if (!user || !addTaskFor) return;
    if (!name.trim() || !link.trim()) return;
    setAddTaskBusy(true);
    setAddTaskStatus(null);
    try {
      const task = await createTask({
        level: activeLevel,
        lessonKey: addTaskFor,
        name,
        link,
        createdBy: user.uid,
      });
      setTasks((prev) => [...prev, task]);
      setAddTaskFor(null);
    } catch (err) {
      setAddTaskStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't add the task. Please try again.",
      });
    } finally {
      setAddTaskBusy(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!window.confirm("Remove this task?")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // Best-effort — the admin can just try again.
    }
  }

  async function handleCompleteTask(link: string) {
    if (!user || !completingTask) return;
    if (!link.trim()) return;
    setCompleteBusy(true);
    setCompleteStatus(null);
    try {
      await markTaskCompleted(user.uid, completingTask.id, link);
      setCompletions((prev) => {
        const next = new Map(prev);
        next.set(completingTask.id, { taskId: completingTask.id, link: link.trim(), completedAt: Date.now() });
        return next;
      });
      setCompletingTask(null);
    } catch (err) {
      setCompleteStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't save your completion. Please try again.",
      });
    } finally {
      setCompleteBusy(false);
    }
  }

  async function handleUnmarkTask(taskId: string) {
    if (!user) return;
    try {
      await unmarkTaskCompleted(user.uid, taskId);
      setCompletions((prev) => {
        const next = new Map(prev);
        next.delete(taskId);
        return next;
      });
    } catch {
      // Best-effort — the button will just still read "Completed" if it fails.
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
                    <div className="play-icon">
                      <ItemKindIcon type="video" />
                    </div>
                    <p>This lesson&apos;s video hasn&apos;t been uploaded yet.</p>
                  </div>
                )}
              </div>
              <div className="video-info">
                <div className="video-copy">
                  {currentLessonKey && currentVideoLevel && (
                    <p className="video-module-tag">
                      {curriculumLevelLabels[currentVideoLevel]} · {String(GLOBAL_LESSON_NUMBERS.get(currentLessonKey) ?? 0).padStart(2, "0")}
                    </p>
                  )}
                  <h3 className="video-title">{videoTitle}</h3>
                </div>
                <div className="video-controls" aria-label="Lesson navigation">
                  <button
                    className={`lesson-nav-btn mark-complete-btn${currentLessonKey && watched.has(currentLessonKey) ? " watched" : ""}`}
                    type="button"
                    disabled={!currentLessonKey}
                    aria-pressed={!!currentLessonKey && watched.has(currentLessonKey)}
                    onClick={() => currentLessonKey && toggleWatched(currentLessonKey)}
                  >
                    <CheckIcon />
                    {currentLessonKey && watched.has(currentLessonKey) ? "Completed" : "Mark as completed"}
                  </button>
                  <button
                    className="lesson-nav-btn prev-lesson"
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={() => selectByOffset(-1)}
                  >
                    <ChevronLeftIcon />
                    Previous
                  </button>
                  <button
                    className="lesson-nav-btn next-lesson"
                    type="button"
                    disabled={totalLessons === 0 || currentIndex >= totalLessons - 1}
                    onClick={() => selectByOffset(1)}
                  >
                    Next
                    <ChevronRightIcon />
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
                    <li>Drawing Tablet (Any Non-display XP-Pen/Wacom/Huion tablet)</li>
                    <li>Adobe Photoshop 2026</li>
                    <li>Autodesk Maya 2026/2027</li>
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
                      {
                        label: "Technical Description",
                        href: "https://actvet-my.sharepoint.com/:b:/g/personal/90003515_aths_ac_ae/IQBtdfaVXYYuQaRB0_ZVACWsAVylXIo-04kGYxrB3jZpo7I?e=XrrB5T",
                      },
                      {
                        label: "Example Test Project",
                        href: "https://actvet-my.sharepoint.com/:b:/g/personal/90003515_aths_ac_ae/IQBXjXQFK5i5QpO7-nZyyWvMAftzAc_x0uXNDk7DESJNF70?e=Pbjej2",
                      },
                      {
                        label: "Task Bank",
                        href: "https://docs.google.com/spreadsheets/d/14fvJbF75PS_sfgknMiQFCXTFQ0kGsS4diNHYacCi3D0/edit?gid=0#gid=0",
                      },
                      {
                        label: "Marking Scheme",
                        href: "https://actvet-my.sharepoint.com/:x:/g/personal/90003515_aths_ac_ae/IQAxI9LS6mQtTpGfERZdK2q_ASybFcws8tp5ZmJ2QLukI90?e=PNwaZx",
                      },
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
                const sectionTaskCount = sectionEntry.items.reduce(
                  (sum, _, index) => sum + (tasksByLesson.get(`${sectionEntry.id}-${index}`)?.length ?? 0),
                  0,
                );
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
                        {sectionTaskCount > 0 && (
                          <span className="topic-task-count">
                            {sectionTaskCount} Task{sectionTaskCount === 1 ? "" : "s"}
                          </span>
                        )}
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
                        const lessonTasks = tasksByLesson.get(key) ?? [];
                        return (
                          <div className="lesson-block" key={key}>
                            <div
                              className={className}
                              role="button"
                              tabIndex={0}
                              onClick={() => playLesson(key)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  playLesson(key);
                                }
                              }}
                            >
                              <button
                                type="button"
                                className={`lesson-watched-toggle${isWatched ? " watched" : ""}`}
                                aria-pressed={isWatched}
                                aria-label={isWatched ? "Mark lesson as not watched" : "Mark lesson as watched"}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleWatched(key);
                                }}
                              />
                              <span className={`curriculum-item-kind ${item.itemType}`}>
                                <ItemKindIcon type={item.itemType} />
                              </span>
                              <span className="lesson-number">
                                {String(GLOBAL_LESSON_NUMBERS.get(key) ?? 0).padStart(2, "0")}.
                              </span>
                              <span className="lesson-label">{item.label}</span>
                              {!item.bunnyVideoId && <span className="upcoming-badge">Upcoming</span>}
                              {item.durationLabel && (
                                <span className="lesson-duration">{item.durationLabel}</span>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="add-task-btn"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setAddTaskStatus(null);
                                    setAddTaskFor(key);
                                  }}
                                >
                                  + Add task
                                </button>
                              )}
                            </div>
                            {lessonTasks.length > 0 && (
                              <div className="lesson-tasks">
                                {lessonTasks.map((task) => {
                                  const completion = completions.get(task.id);
                                  return (
                                    <div key={task.id} className={`detail-item curriculum-task-item${completion ? " watched" : ""}`}>
                                      <button
                                        type="button"
                                        className={`lesson-watched-toggle${completion ? " watched" : ""}`}
                                        aria-pressed={!!completion}
                                        aria-label={completion ? "Unmark task as completed" : "Mark task as completed"}
                                        onClick={() => (completion ? handleUnmarkTask(task.id) : setCompletingTask(task))}
                                      />
                                      <a
                                        className="curriculum-task-link"
                                        href={task.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <span className="curriculum-item-kind task">
                                          <TaskKindIcon />
                                        </span>
                                        <span className="lesson-label">
                                          Task {formatTaskNumber(taskOrdinals.get(task.id) ?? 0)}: {task.name}
                                        </span>
                                      </a>
                                      <button
                                        type="button"
                                        className={`task-upload-btn${completion ? " completed" : ""}`}
                                        aria-label={completion ? "Submitted — click to unsubmit" : "Submit task"}
                                        title={completion ? "Submitted — click to unsubmit" : "Submit"}
                                        onClick={() => (completion ? handleUnmarkTask(task.id) : setCompletingTask(task))}
                                      >
                                        {completion ? <CheckIcon /> : <UploadIcon />}
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          className="task-delete-btn"
                                          aria-label="Remove task"
                                          onClick={() => handleDeleteTask(task.id)}
                                        >
                                          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6 6 18" />
                                            <path d="m6 6 12 12" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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

      {addTaskFor && (
        <AddTaskModal
          lessonLabel={GLOBAL_LESSON_LABELS.get(addTaskFor) ?? "this lesson"}
          busy={addTaskBusy}
          status={addTaskStatus}
          onSubmit={handleAddTask}
          onClose={() => setAddTaskFor(null)}
        />
      )}

      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          busy={completeBusy}
          status={completeStatus}
          onSubmit={handleCompleteTask}
          onClose={() => setCompletingTask(null)}
        />
      )}
    </main>
  );
}
