"use client";

import "@/styles/training-admin.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  createSection,
  createVideo,
  deleteSection,
  deleteVideo,
  fetchSections,
  fetchVideosBySection,
  swapOrder,
  updateSection,
  updateVideo,
} from "@/lib/data";
import { COURSE_LEVELS, type CourseLevel, type CourseSection, type VideoDoc } from "@/lib/types";
import VideoEditModal, { type VideoModalData } from "@/components/VideoEditModal";
import CourseImport from "@/components/CourseImport";

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; sectionId: string; order: number }
  | { open: true; mode: "edit"; video: VideoDoc };

function ArrowUp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
  );
}
function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function AdminCoursePage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [videosBySection, setVideosBySection] = useState<Record<string, VideoDoc[]>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });

  const [newSection, setNewSection] = useState<{ title: string; level: CourseLevel; core: string }>({
    title: "",
    level: "foundation",
    core: "",
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState({ title: "", description: "" });

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [secs, vids] = await Promise.all([fetchSections(), fetchVideosBySection()]);
      setSections(secs);
      setVideosBySection(vids);
    } catch {
      setError("Couldn't load the course. Make sure the latest firestore.rules are published.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  async function guard(fn: () => Promise<void>, message: string) {
    setError(null);
    try {
      await fn();
      await loadData();
    } catch {
      setError(message);
    }
  }

  /* ---- sections ---- */

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    const title = newSection.title.trim();
    if (!title) return;
    const order = sections.length ? sections[sections.length - 1].order + 1 : 0;
    await guard(async () => {
      await createSection({
        title,
        level: newSection.level,
        core: newSection.core.trim(),
        description: "",
        order,
      });
      setNewSection({ title: "", level: newSection.level, core: newSection.core });
    }, "Couldn't add the section.");
  }

  async function saveSection(id: string) {
    await guard(async () => {
      await updateSection(id, { title: sectionDraft.title.trim() || "Untitled section", description: sectionDraft.description.trim() });
      setEditingSection(null);
    }, "Couldn't save the section.");
  }

  async function removeSection(section: CourseSection) {
    const count = (videosBySection[section.id] ?? []).length;
    const warning = count
      ? `Delete "${section.title}" and its ${count} video(s)? This cannot be undone.`
      : `Delete "${section.title}"?`;
    if (!window.confirm(warning)) return;
    await guard(() => deleteSection(section.id), "Couldn't delete the section.");
  }

  async function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    await guard(() => swapOrder("sections", sections[index], sections[target]), "Couldn't reorder.");
  }

  /* ---- videos ---- */

  async function moveVideo(sectionId: string, index: number, direction: -1 | 1) {
    const list = videosBySection[sectionId] ?? [];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    await guard(() => swapOrder("videos", list[index], list[target]), "Couldn't reorder.");
  }

  async function removeVideo(video: VideoDoc) {
    if (!window.confirm(`Delete "${video.title}"?`)) return;
    await guard(() => deleteVideo(video.id), "Couldn't delete the video.");
  }

  async function handleSave(data: VideoModalData) {
    if (!modal.open) return;
    if (modal.mode === "create") {
      await createVideo({ sectionId: modal.sectionId, order: modal.order, ...data });
    } else {
      await updateVideo(modal.video.id, data);
    }
    await loadData();
    setModal({ open: false });
  }

  if (loading || !isAdmin) {
    return <div className="admin-page"><p className="admin-muted">Checking access…</p></div>;
  }

  return (
    <main className="section active">
      <div className="admin-page">
        {error && <div className="admin-error">{error}</div>}

        <CourseImport onImported={loadData} />

        <section className="admin-card">
          <h2>Course structure</h2>
          <p className="admin-card-sub">
            The Training page is built from exactly what you set up here. Each section is a Competence Unit,
            shown under its Level tab and grouped by Core Competence.
          </p>

          <form className="admin-add-form" onSubmit={addSection}>
            <select
              value={newSection.level}
              onChange={(e) => setNewSection((s) => ({ ...s, level: e.target.value as CourseLevel }))}
              aria-label="Level"
            >
              {COURSE_LEVELS.map((l) => (
                <option key={l.level} value={l.level}>{l.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Core (e.g. 1)"
              value={newSection.core}
              onChange={(e) => setNewSection((s) => ({ ...s, core: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Competence Unit title"
              value={newSection.title}
              onChange={(e) => setNewSection((s) => ({ ...s, title: e.target.value }))}
            />
            <button className="admin-btn" type="submit">Add section</button>
          </form>

          {dataLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : sections.length === 0 ? (
            <p className="admin-muted">No sections yet. Add your first one above.</p>
          ) : (
            <div className="course-sections">
              {sections.map((section, sIndex) => {
                const videos = videosBySection[section.id] ?? [];
                const isEditing = editingSection === section.id;
                return (
                  <div className="course-section" key={section.id}>
                    <div className="course-section-head">
                      <span className="course-section-index">{String(sIndex + 1).padStart(2, "0")}</span>
                      {isEditing ? (
                        <div className="course-section-edit">
                          <input
                            type="text"
                            value={sectionDraft.title}
                            placeholder="Section title"
                            onChange={(e) => setSectionDraft((d) => ({ ...d, title: e.target.value }))}
                          />
                          <input
                            type="text"
                            value={sectionDraft.description}
                            placeholder="Short description (optional)"
                            onChange={(e) => setSectionDraft((d) => ({ ...d, description: e.target.value }))}
                          />
                          <button className="admin-btn" type="button" onClick={() => saveSection(section.id)}>Save</button>
                          <button className="video-modal-btn" type="button" onClick={() => setEditingSection(null)}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <div className="course-section-copy">
                            <strong>{section.title}</strong>
                            <p>
                              <span className={`level-chip ${section.level}`}>
                                {COURSE_LEVELS.find((l) => l.level === section.level)?.label ?? section.level}
                              </span>
                              {section.core && <span> · Core {section.core}</span>}
                              {section.description && <span> · {section.description}</span>}
                            </p>
                          </div>
                          <div className="course-section-actions">
                            <button className="vid-edit-btn" type="button" aria-label="Move section up" disabled={sIndex === 0} onClick={() => moveSection(sIndex, -1)}><ArrowUp /></button>
                            <button className="vid-edit-btn" type="button" aria-label="Move section down" disabled={sIndex === sections.length - 1} onClick={() => moveSection(sIndex, 1)}><ArrowDown /></button>
                            <button
                              className="vid-edit-btn"
                              type="button"
                              aria-label="Edit section"
                              onClick={() => {
                                setEditingSection(section.id);
                                setSectionDraft({ title: section.title, description: section.description });
                              }}
                            >
                              <PencilIcon />
                            </button>
                            <button className="vid-delete-btn" type="button" aria-label="Delete section" onClick={() => removeSection(section)}><TrashIcon /></button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="course-videos">
                      {videos.length === 0 && <p className="vid-empty">No videos in this section yet.</p>}
                      {videos.map((video, vIndex) => (
                        <div className="course-video-row" key={video.id}>
                          <span className="vid-number">{String(vIndex + 1).padStart(2, "0")}</span>
                          <div className="course-video-copy">
                            <strong>{video.title}</strong>
                            <p>
                              {video.embedUrl ? "Video linked" : "No video link"}
                              {video.requiredTools.length > 0 && ` · ${video.requiredTools.length} tool(s)`}
                              {video.materials.length > 0 && ` · ${video.materials.length} file(s)`}
                              {video.instructions && " · has instructions"}
                            </p>
                          </div>
                          <div className="course-video-actions">
                            <button className="vid-edit-btn" type="button" aria-label="Move video up" disabled={vIndex === 0} onClick={() => moveVideo(section.id, vIndex, -1)}><ArrowUp /></button>
                            <button className="vid-edit-btn" type="button" aria-label="Move video down" disabled={vIndex === videos.length - 1} onClick={() => moveVideo(section.id, vIndex, 1)}><ArrowDown /></button>
                            <button className="vid-edit-btn" type="button" aria-label="Edit video" onClick={() => setModal({ open: true, mode: "edit", video })}><PencilIcon /></button>
                            <button className="vid-delete-btn" type="button" aria-label="Delete video" onClick={() => removeVideo(video)}><TrashIcon /></button>
                          </div>
                        </div>
                      ))}
                      <button
                        className="vid-add-row always"
                        type="button"
                        onClick={() =>
                          setModal({
                            open: true,
                            mode: "create",
                            sectionId: section.id,
                            order: videos.length ? videos[videos.length - 1].order + 1 : 0,
                          })
                        }
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        Add video to “{section.title}”
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {modal.open && (
        <VideoEditModal
          key={modal.mode === "edit" ? `edit-${modal.video.id}` : `create-${modal.sectionId}-${modal.order}`}
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.video : null}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
