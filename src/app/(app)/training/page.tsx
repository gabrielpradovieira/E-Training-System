"use client";

import "@/styles/training-admin.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCurriculumForLevel, type CurriculumLevel } from "@/lib/curriculum";
import { useAuth } from "@/lib/auth-context";
import { createVideo, deleteVideo, fetchVideosByTopic, updateVideo } from "@/lib/data";
import type { VideoDoc } from "@/lib/types";
import VideoEditModal, { type VideoModalData } from "@/components/VideoEditModal";

const LEVEL_TABS: { level: CurriculumLevel; label: string }[] = [
  { level: "foundation", label: "Foundation" },
  { level: "intermediate", label: "Intermediate" },
  { level: "advanced", label: "Advanced" },
];

const TASK_ORIENTED_DOC_URL =
  "file:///C:/Users/LENOVO/Desktop/DOCUMENTS/Task%20Oriented%20Approach/Task%20Oriented%20Approach%20-%203D%20Digital%20Game%20Art.pdf";

const CERTIFICATE_PERCENT = 15;

/** Order value for a new video inserted after `afterIndex` (-1 = before first). */
function insertOrder(videos: VideoDoc[], afterIndex: number): number {
  if (videos.length === 0) return 0;
  if (afterIndex < 0) return videos[0].order - 1;
  if (afterIndex >= videos.length - 1) return videos[videos.length - 1].order + 1;
  return (videos[afterIndex].order + videos[afterIndex + 1].order) / 2;
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; topicId: string; order: number }
  | { open: true; mode: "edit"; video: VideoDoc };

export default function TrainingPage() {
  const { isAdmin } = useAuth();

  const [activeLevel, setActiveLevel] = useState<CurriculumLevel>("foundation");
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [videosByTopic, setVideosByTopic] = useState<Record<string, VideoDoc[]>>({});
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });

  const groups = useMemo(() => buildCurriculumForLevel(activeLevel), [activeLevel]);

  const loadVideos = useCallback(async () => {
    try {
      setVideosByTopic(await fetchVideosByTopic());
      setLoadError(null);
    } catch {
      setLoadError("Couldn't load videos.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVideos();
  }, [loadVideos]);

  // Flat, ordered list of videos across the active level (for prev/next lookups).
  const flatVideos = useMemo(() => {
    const list: VideoDoc[] = [];
    groups.forEach((group) =>
      group.units.forEach((unit) => (videosByTopic[unit.topicId] ?? []).forEach((v) => list.push(v))),
    );
    return list;
  }, [groups, videosByTopic]);

  const currentIndex = currentVideoId ? flatVideos.findIndex((v) => v.id === currentVideoId) : -1;
  const currentVideo = currentIndex >= 0 ? flatVideos[currentIndex] : null;
  const totalVideos = flatVideos.length;

  function changeLevel(level: CurriculumLevel) {
    setActiveLevel(level);
    setOpenTopics(new Set());
    setCurrentVideoId(null);
  }

  function toggleTopic(topicId: string) {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function selectVideo(video: VideoDoc) {
    setWatched((prev) => new Set(prev).add(video.id));
    setCurrentVideoId(video.id);
  }

  function selectByOffset(offset: number) {
    if (!flatVideos.length) return;
    const nextIndex = currentIndex < 0 ? 0 : Math.min(Math.max(currentIndex + offset, 0), flatVideos.length - 1);
    setCurrentVideoId(flatVideos[nextIndex].id);
  }

  async function handleSave(data: VideoModalData) {
    if (!modal.open) return;
    if (modal.mode === "create") {
      await createVideo({ topicId: modal.topicId, order: modal.order, ...data });
    } else {
      await updateVideo(modal.video.id, data);
    }
    await loadVideos();
    setModal({ open: false });
  }

  async function handleDelete(video: VideoDoc) {
    if (!window.confirm(`Delete "${video.title}"?`)) return;
    try {
      await deleteVideo(video.id);
      if (currentVideoId === video.id) setCurrentVideoId(null);
      await loadVideos();
    } catch {
      setLoadError("Couldn't delete the video. Make sure the videos rules are published.");
    }
  }

  const videoTitle = currentVideo?.title ?? "Welcome to 3D Digital Game Art";
  const videoDescription =
    currentIndex >= 0
      ? `Lesson ${currentIndex + 1} of ${totalVideos} in the 3D Digital Game Art curriculum.`
      : "Select any lesson from the curriculum on the right to begin watching the training videos.";

  return (
    <main id="training" className="section active">
      <div className="training-page">
        <div className="training-layout">
          {/* Left Column - Video Player */}
          <div className="video-section">
            <div className="video-player glass">
              <div className="video-container">
                {currentVideo?.embedUrl ? (
                  <iframe
                    className="video-embed-frame"
                    src={currentVideo.embedUrl}
                    title={currentVideo.title}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="video-placeholder">
                    <div className="play-icon">&#9658;</div>
                    <p>{currentVideo ? "No video link set for this lesson yet." : "Select a lesson to start learning"}</p>
                  </div>
                )}
              </div>
              <div className="video-info">
                <div className="video-copy">
                  <h3 className="video-title">{videoTitle}</h3>
                  <p className="video-description">{videoDescription}</p>
                  {currentVideo && currentVideo.materials.length > 0 && (
                    <div className="video-materials">
                      <h4>Learning materials</h4>
                      <ul>
                        {currentVideo.materials.map((m, i) => (
                          <li key={i}>
                            <a href={m.url} target="_blank" rel="noopener noreferrer">
                              {m.label || m.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    disabled={totalVideos === 0 || currentIndex >= totalVideos - 1}
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
                  <p className="certificate-note">Certificate will be available after full completion of the course.</p>
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
            </div>
          </div>

          {/* Right Column - Scrollable Curriculum */}
          <div className="curriculum-sidebar glass">
            <div className="curriculum-header">
              <div className="curriculum-title-row">
                <h3>Course Curriculum</h3>
                <a
                  className="curriculum-info-btn"
                  href={TASK_ORIENTED_DOC_URL}
                  target="_blank"
                  rel="noopener"
                  aria-label="Open task oriented approach document"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </a>
              </div>
              {loadError && <p className="vid-empty">{loadError}</p>}
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
                    const videos = videosByTopic[unit.topicId] ?? [];
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
                          {videos.length === 0 && !isAdmin && <p className="vid-empty">No videos yet.</p>}

                          {videos.map((video, index) => {
                            const isWatched = watched.has(video.id);
                            const isCurrent = currentVideoId === video.id;
                            const number = String(index + 1).padStart(2, "0");
                            return (
                              <div className="vid-row" key={video.id}>
                                {isAdmin && (
                                  <button
                                    className="vid-add-left"
                                    type="button"
                                    aria-label="Add a video here"
                                    onClick={() =>
                                      setModal({
                                        open: true,
                                        mode: "create",
                                        topicId: unit.topicId,
                                        order: insertOrder(videos, index - 1),
                                      })
                                    }
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                                  </button>
                                )}
                                <div
                                  className={`detail-item curriculum-video-item${isWatched ? " watched" : ""}${isCurrent ? " current" : ""}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-pressed={isWatched}
                                  onClick={() => selectVideo(video)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      selectVideo(video);
                                    }
                                  }}
                                >
                                  <span className="vid-number">{number}</span>
                                  <span className="lesson-label">{video.title}</span>
                                  {video.materials.length > 0 && (
                                    <span className="lesson-duration">{video.materials.length} file(s)</span>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="vid-actions">
                                    <button
                                      className="vid-edit-btn"
                                      type="button"
                                      aria-label={`Edit ${video.title}`}
                                      onClick={() => setModal({ open: true, mode: "edit", video })}
                                    >
                                      <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                      </svg>
                                    </button>
                                    <button
                                      className="vid-delete-btn"
                                      type="button"
                                      aria-label={`Delete ${video.title}`}
                                      onClick={() => handleDelete(video)}
                                    >
                                      <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M3 6h18" />
                                        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                        <path d="M10 11v6M14 11v6" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {isAdmin && (
                            <button
                              className="vid-add-trailing"
                              type="button"
                              onClick={() =>
                                setModal({
                                  open: true,
                                  mode: "create",
                                  topicId: unit.topicId,
                                  order: insertOrder(videos, videos.length - 1),
                                })
                              }
                            >
                              + Add video
                            </button>
                          )}
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

      {modal.open && (
        <VideoEditModal
          key={modal.mode === "edit" ? `edit-${modal.video.id}` : `create-${modal.topicId}-${modal.order}`}
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.video : null}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
