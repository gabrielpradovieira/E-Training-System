"use client";

import "@/styles/training-admin.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchCores, fetchSectionsByCore, fetchVideosBySection } from "@/lib/course-data";
import {
  COURSE_LEVELS,
  type CoreCompetence,
  type CourseLevel,
  type CourseSection,
  type VideoDoc,
} from "@/lib/types";
import { buildNumbering, coreLabel } from "@/lib/course-format";

const CERTIFICATE_PERCENT = 15;

export default function TrainingPage() {
  const { isAdmin } = useAuth();

  const [cores, setCores] = useState<CoreCompetence[]>([]);
  const [unitsByCore, setUnitsByCore] = useState<Record<string, CourseSection[]>>({});
  const [videosBySection, setVideosBySection] = useState<Record<string, VideoDoc[]>>({});
  const [activeLevel, setActiveLevel] = useState<CourseLevel>("foundation");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, u, v] = await Promise.all([
        fetchCores(),
        fetchSectionsByCore(),
        fetchVideosBySection(),
      ]);
      setCores(c);
      setUnitsByCore(u);
      setVideosBySection(v);
      setLoadError(null);
    } catch {
      setLoadError("Couldn't load the training material.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Core Competences in the active level, each with its Competence Units.
  const coreGroups = useMemo(
    () =>
      cores
        .filter((c) => c.level === activeLevel)
        .map((core) => ({ core, units: unitsByCore[core.id] ?? [] })),
    [cores, unitsByCore, activeLevel],
  );

  // Numbering runs continuously across the whole course, not per level.
  const { coreNumber, unitNumber } = useMemo(
    () => buildNumbering(cores, unitsByCore),
    [cores, unitsByCore],
  );

  // Flat, ordered list within the active level (for prev/next).
  const flatVideos = useMemo(() => {
    const list: VideoDoc[] = [];
    coreGroups.forEach((group) =>
      group.units.forEach((unit) => (videosBySection[unit.id] ?? []).forEach((v) => list.push(v))),
    );
    return list;
  }, [coreGroups, videosBySection]);

  const currentIndex = currentVideoId ? flatVideos.findIndex((v) => v.id === currentVideoId) : -1;
  const currentVideo = currentIndex >= 0 ? flatVideos[currentIndex] : null;
  const totalVideos = flatVideos.length;

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const videoTitle = currentVideo?.title ?? "Welcome to 3D Digital Game Art";
  const videoDescription =
    currentVideo?.description ||
    (currentIndex >= 0
      ? `Lesson ${currentIndex + 1} of ${totalVideos}.`
      : "Select any lesson from the curriculum on the right to begin watching the training videos.");

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

            {/* Per-video resources, driven by the course setup */}
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
                  {currentVideo && currentVideo.requiredTools.length > 0 ? (
                    <ul className="resource-list">
                      {currentVideo.requiredTools.map((tool) => (
                        <li key={tool}>{tool}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="certificate-note">
                      {currentVideo ? "No tools listed for this lesson." : "Select a lesson to see its required tools."}
                    </p>
                  )}
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

              {currentVideo && currentVideo.instructions && (
                <div className="certificate-section">
                  <div className="certificate-main">
                    <div className="certificate-title">
                      <svg className="certificate-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span>Instructions</span>
                    </div>
                    <p className="video-instructions">{currentVideo.instructions}</p>
                  </div>
                </div>
              )}

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
                  {currentVideo && currentVideo.materials.length > 0 ? (
                    <ul className="resource-file-list">
                      {currentVideo.materials.map((m, i) => (
                        <li key={i}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
                            <path d="M14 2v6h6"></path>
                          </svg>
                          <span>{m.label || m.url}</span>
                          <a className="resource-file-download" href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.label || m.url}`}>
                            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 3v12"></path>
                              <path d="m7 10 5 5 5-5"></path>
                              <path d="M5 21h14"></path>
                            </svg>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="certificate-note">
                      {currentVideo
                        ? "No learning material for this lesson."
                        : "Select a lesson to see its learning material."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Course curriculum, built from the admin Course setup */}
          <div className="curriculum-sidebar glass">
            <div className="curriculum-header">
              <div className="curriculum-title-row">
                <h3>Course Curriculum</h3>
              </div>
              {loadError && <p className="vid-empty">{loadError}</p>}
              <div className="curriculum-level-tabs" role="tablist" aria-label="Curriculum level filter">
                {COURSE_LEVELS.map((tab) => (
                  <button
                    key={tab.level}
                    className={`curriculum-level-tab${activeLevel === tab.level ? " active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={activeLevel === tab.level}
                    onClick={() => {
                      setActiveLevel(tab.level);
                      setOpenSections(new Set());
                      setCurrentVideoId(null);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="accordion-container curriculum-cu-list">
              {loading ? (
                <p className="vid-empty">Loading…</p>
              ) : cores.length === 0 ? (
                <p className="vid-empty">
                  The training material hasn&apos;t been set up yet.{" "}
                  {isAdmin && <Link href="/admin/course">Build it in Admin → Training Material.</Link>}
                </p>
              ) : coreGroups.length === 0 ? (
                <p className="vid-empty">Nothing in this level yet.</p>
              ) : (
                coreGroups.map((group) => (
                  <div key={group.core.id}>
                    <div className="curriculum-core-heading">
                      <span>
                        {coreLabel(coreNumber.get(group.core.id))}
                        {group.core.title ? ` — ${group.core.title}` : ""}
                      </span>
                      {group.core.description && <p>{group.core.description}</p>}
                    </div>
                    {group.units.map((section) => {
                      const videos = videosBySection[section.id] ?? [];
                      const isOpen = openSections.has(section.id);
                      return (
                        <div className="accordion-topic curriculum-cu-topic" key={section.id}>
                          <button
                            className={`accordion-btn${isOpen ? " active" : ""}`}
                            type="button"
                            onClick={() => toggleSection(section.id)}
                          >
                            <span className="curriculum-cu-code">CU {unitNumber.get(section.id)}</span>
                            <span className="topic-copy">
                              <span className="topic-title">{section.title}</span>
                            </span>
                            <span className="accordion-arrow">&rsaquo;</span>
                          </button>
                          <div className={`accordion-content${isOpen ? " active" : ""}`} id={section.id}>
                            {section.description && <p className="vid-empty">{section.description}</p>}
                            {videos.length === 0 ? (
                              <p className="vid-empty">No videos yet.</p>
                            ) : (
                              videos.map((video, vIndex) => {
                                const isWatched = watched.has(video.id);
                                const isCurrent = currentVideoId === video.id;
                                return (
                                  <div className="vid-row" key={video.id}>
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
                                      <span className="vid-number">{String(vIndex + 1).padStart(2, "0")}</span>
                                      <span className="lesson-label">{video.title}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
