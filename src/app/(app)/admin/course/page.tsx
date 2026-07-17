"use client";

import "@/styles/training-admin.css";
import "@/styles/curriculum-builder.css";
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
  persistSectionOrder,
  persistVideoOrder,
  updateSection,
  updateVideo,
} from "@/lib/data";
import { COURSE_LEVELS, type CourseLevel, type CourseSection, type VideoDoc } from "@/lib/types";
import VideoEditModal, { type VideoModalData } from "@/components/VideoEditModal";
import CourseImport from "@/components/CourseImport";
import ConfirmModal from "@/components/ConfirmModal";

const TITLE_MAX = 80;
const OBJECTIVE_MAX = 200;

/* ---------------- icons ---------------- */
const DocIcon = () => (
  <svg className="cb-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);
const PlayIcon = () => (
  <svg className="cb-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m10 8 6 4-6 4V8Z" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const GripIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </svg>
);
const EmptyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

/* ---------------- form state ---------------- */
type OpenForm =
  | { kind: "none" }
  | { kind: "new-section" }
  | { kind: "edit-section"; id: string }
  | { kind: "edit-item"; id: string };

type Pending =
  | { kind: "section"; section: CourseSection; videoCount: number }
  | { kind: "item"; video: VideoDoc };

type DragState =
  | { kind: "section"; id: string }
  | { kind: "item"; id: string; fromSectionId: string }
  | null;

export default function AdminCoursePage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  const [sections, setSections] = useState<CourseSection[]>([]);
  const [videosBySection, setVideosBySection] = useState<Record<string, VideoDoc[]>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only one form open at a time, across the whole page.
  const [form, setForm] = useState<OpenForm>({ kind: "none" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Pending | null>(null);
  const [contentModal, setContentModal] = useState<VideoDoc | null>(null);

  const [sectionDraft, setSectionDraft] = useState({
    title: "",
    objective: "",
    level: "foundation" as CourseLevel,
    core: "",
  });
  const [itemDraft, setItemDraft] = useState("");

  const [drag, setDrag] = useState<DragState>(null);
  const [dragEnabled, setDragEnabled] = useState<string | null>(null);

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

  /* ---------------- sections ---------------- */

  function openNewSection() {
    setSectionDraft({ title: "", objective: "", level: "foundation", core: "" });
    setForm({ kind: "new-section" });
  }

  function openEditSection(section: CourseSection) {
    setSectionDraft({
      title: section.title,
      objective: section.description,
      level: section.level,
      core: section.core,
    });
    setForm({ kind: "edit-section", id: section.id });
  }

  async function submitNewSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionDraft.title.trim()) return;
    const order = sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 0;
    await guard(async () => {
      await createSection({
        title: sectionDraft.title.trim(),
        description: sectionDraft.objective.trim(),
        level: sectionDraft.level,
        core: sectionDraft.core.trim(),
        order,
      });
      setForm({ kind: "none" });
    }, "Couldn't add the section.");
  }

  async function submitEditSection(e: React.FormEvent, id: string) {
    e.preventDefault();
    await guard(async () => {
      await updateSection(id, {
        title: sectionDraft.title.trim() || "Untitled section",
        description: sectionDraft.objective.trim(),
        level: sectionDraft.level,
        core: sectionDraft.core.trim(),
      });
      setForm({ kind: "none" });
    }, "Couldn't save the section.");
  }

  /* ---------------- items ---------------- */

  async function addLecture(section: CourseSection) {
    const list = videosBySection[section.id] ?? [];
    const order = list.length ? Math.max(...list.map((v) => v.order)) + 1 : 0;
    await guard(async () => {
      const id = await createVideo({
        sectionId: section.id,
        order,
        title: "New lecture",
        description: "",
        embedUrl: "",
        requiredTools: [],
        materials: [],
        instructions: "",
      });
      // Open the new row straight into its rename form, per the spec.
      setItemDraft("New lecture");
      setForm({ kind: "edit-item", id });
    }, "Couldn't add the lecture.");
  }

  async function submitEditItem(e: React.FormEvent, id: string) {
    e.preventDefault();
    await guard(async () => {
      await updateVideo(id, { title: itemDraft.trim() || "Untitled lecture" });
      setForm({ kind: "none" });
    }, "Couldn't rename the lecture.");
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.kind === "section") {
      await guard(() => deleteSection(target.section.id), "Couldn't delete the section.");
    } else {
      await guard(() => deleteVideo(target.video.id), "Couldn't delete the lecture.");
    }
  }

  async function saveContent(data: VideoModalData) {
    if (!contentModal) return;
    await updateVideo(contentModal.id, data);
    await loadData();
    setContentModal(null);
  }

  /* ---------------- drag & drop ---------------- */

  function dropSection(targetId: string) {
    if (!drag || drag.kind !== "section" || drag.id === targetId) return;
    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(drag.id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next); // optimistic
    guard(() => persistSectionOrder(next.map((s) => s.id)), "Couldn't save the new order.");
  }

  /** Drops the dragged item into `toSectionId`, before `beforeVideoId` (or at the end). */
  function dropItem(toSectionId: string, beforeVideoId: string | null) {
    if (!drag || drag.kind !== "item") return;

    const fromList = [...(videosBySection[drag.fromSectionId] ?? [])];
    const movedIndex = fromList.findIndex((v) => v.id === drag.id);
    if (movedIndex < 0) return;
    const [moved] = fromList.splice(movedIndex, 1);

    const sameSection = drag.fromSectionId === toSectionId;
    const toList = sameSection ? fromList : [...(videosBySection[toSectionId] ?? [])];
    const insertAt = beforeVideoId ? toList.findIndex((v) => v.id === beforeVideoId) : toList.length;
    toList.splice(insertAt < 0 ? toList.length : insertAt, 0, { ...moved, sectionId: toSectionId });

    const next = { ...videosBySection, [toSectionId]: toList };
    if (!sameSection) next[drag.fromSectionId] = fromList;
    setVideosBySection(next); // optimistic

    guard(
      () => persistVideoOrder(toList.map((v) => ({ id: v.id, sectionId: toSectionId }))),
      "Couldn't save the new order.",
    );
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
          <h2>Curriculum</h2>
          <p className="admin-card-sub">
            Build your course in sections, each focused on a single learning objective. Then add the
            lectures students will work through.
          </p>

          {dataLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : (
            <div className="cb-list">
              {sections.map((section, sIndex) => {
                const videos = videosBySection[section.id] ?? [];
                const editing = form.kind === "edit-section" && form.id === section.id;

                return (
                  <div
                    className={`cb-section${drag?.kind === "section" && drag.id === section.id ? " dragging" : ""}`}
                    key={section.id}
                    draggable={dragEnabled === `section-${section.id}`}
                    onDragStart={() => setDrag({ kind: "section", id: section.id })}
                    onDragEnd={() => {
                      setDrag(null);
                      setDragEnabled(null);
                    }}
                    onDragOver={(e) => {
                      if (drag?.kind === "section") e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (drag?.kind === "section") {
                        e.preventDefault();
                        dropSection(section.id);
                      }
                    }}
                  >
                    {editing ? (
                      <form className="cb-form" onSubmit={(e) => submitEditSection(e, section.id)}>
                        <label>
                          Section title
                          <input
                            type="text"
                            maxLength={TITLE_MAX}
                            value={sectionDraft.title}
                            autoFocus
                            onChange={(e) => setSectionDraft((d) => ({ ...d, title: e.target.value }))}
                          />
                          <span className="cb-counter">{sectionDraft.title.length}/{TITLE_MAX}</span>
                        </label>
                        <label>
                          What will students be able to do by the end of this section?
                          <input
                            type="text"
                            maxLength={OBJECTIVE_MAX}
                            value={sectionDraft.objective}
                            onChange={(e) => setSectionDraft((d) => ({ ...d, objective: e.target.value }))}
                          />
                          <span className="cb-counter">{sectionDraft.objective.length}/{OBJECTIVE_MAX}</span>
                        </label>
                        <div className="cb-form-row">
                          <select
                            value={sectionDraft.level}
                            aria-label="Level"
                            onChange={(e) => setSectionDraft((d) => ({ ...d, level: e.target.value as CourseLevel }))}
                          >
                            {COURSE_LEVELS.map((l) => (
                              <option key={l.level} value={l.level}>{l.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Core Competence (e.g. 1)"
                            value={sectionDraft.core}
                            onChange={(e) => setSectionDraft((d) => ({ ...d, core: e.target.value }))}
                          />
                        </div>
                        <div className="cb-form-actions">
                          <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                          <button type="submit" className="cb-btn-primary">Save Section</button>
                        </div>
                      </form>
                    ) : (
                      <div className="cb-section-head">
                        <strong className="cb-section-label">Section {sIndex + 1}:</strong>
                        <DocIcon />
                        <span className="cb-section-title">{section.title}</span>
                        <span className="cb-row-tools">
                          <button className="cb-icon-btn" type="button" aria-label="Edit section" onClick={() => openEditSection(section)}><PencilIcon /></button>
                          <button
                            className="cb-icon-btn danger"
                            type="button"
                            aria-label="Delete section"
                            onClick={() => setPendingDelete({ kind: "section", section, videoCount: videos.length })}
                          >
                            <TrashIcon />
                          </button>
                        </span>
                        <span className="cb-section-meta">
                          <span className={`level-chip ${section.level}`}>
                            {COURSE_LEVELS.find((l) => l.level === section.level)?.label ?? section.level}
                          </span>
                          {section.core && <span className="cb-core">Core {section.core}</span>}
                        </span>
                        <button
                          className="cb-grip"
                          type="button"
                          aria-label="Drag to reorder section"
                          onMouseDown={() => setDragEnabled(`section-${section.id}`)}
                          onMouseUp={() => setDragEnabled(null)}
                        >
                          <GripIcon />
                        </button>
                      </div>
                    )}

                    {!editing && section.description && (
                      <p className="cb-objective">{section.description}</p>
                    )}

                    <div
                      className="cb-items"
                      onDragOver={(e) => {
                        if (drag?.kind === "item") e.preventDefault();
                      }}
                      onDrop={(e) => {
                        if (drag?.kind === "item") {
                          e.preventDefault();
                          dropItem(section.id, null);
                        }
                      }}
                    >
                      {videos.map((video, vIndex) => {
                        const isOpen = expanded.has(video.id);
                        const isEditingItem = form.kind === "edit-item" && form.id === video.id;
                        return (
                          <div
                            className={`cb-item${drag?.kind === "item" && drag.id === video.id ? " dragging" : ""}`}
                            key={video.id}
                            draggable={dragEnabled === `item-${video.id}`}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDrag({ kind: "item", id: video.id, fromSectionId: section.id });
                            }}
                            onDragEnd={() => {
                              setDrag(null);
                              setDragEnabled(null);
                            }}
                            onDragOver={(e) => {
                              if (drag?.kind === "item") e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (drag?.kind === "item") {
                                e.preventDefault();
                                e.stopPropagation();
                                dropItem(section.id, video.id);
                              }
                            }}
                          >
                            {isEditingItem ? (
                              <form className="cb-form inline" onSubmit={(e) => submitEditItem(e, video.id)}>
                                <label>
                                  Lecture title
                                  <input
                                    type="text"
                                    maxLength={TITLE_MAX}
                                    value={itemDraft}
                                    autoFocus
                                    onChange={(e) => setItemDraft(e.target.value)}
                                  />
                                  <span className="cb-counter">{itemDraft.length}/{TITLE_MAX}</span>
                                </label>
                                <div className="cb-form-actions">
                                  <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                                  <button type="submit" className="cb-btn-primary">Save</button>
                                </div>
                              </form>
                            ) : (
                              <div className="cb-item-head">
                                <span className={`cb-status${video.embedUrl ? " done" : ""}`} title={video.embedUrl ? "Video linked" : "No video link yet"}>
                                  {video.embedUrl ? <CheckIcon /> : <EmptyIcon />}
                                </span>
                                <strong className="cb-item-label">Lecture {vIndex + 1}:</strong>
                                <PlayIcon />
                                <span className="cb-item-title">{video.title}</span>
                                <span className="cb-row-tools">
                                  <button
                                    className="cb-icon-btn"
                                    type="button"
                                    aria-label="Rename lecture"
                                    onClick={() => {
                                      setItemDraft(video.title);
                                      setForm({ kind: "edit-item", id: video.id });
                                    }}
                                  >
                                    <PencilIcon />
                                  </button>
                                  <button
                                    className="cb-icon-btn danger"
                                    type="button"
                                    aria-label="Delete lecture"
                                    onClick={() => setPendingDelete({ kind: "item", video })}
                                  >
                                    <TrashIcon />
                                  </button>
                                </span>
                                {!video.embedUrl && <span className="cb-badge">No video</span>}
                                <button
                                  className={`cb-chevron${isOpen ? " open" : ""}`}
                                  type="button"
                                  aria-label={isOpen ? "Collapse" : "Expand"}
                                  aria-expanded={isOpen}
                                  onClick={() =>
                                    setExpanded((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(video.id)) next.delete(video.id);
                                      else next.add(video.id);
                                      return next;
                                    })
                                  }
                                >
                                  <ChevronIcon />
                                </button>
                                <button
                                  className="cb-grip"
                                  type="button"
                                  aria-label="Drag to reorder lecture"
                                  onMouseDown={() => setDragEnabled(`item-${video.id}`)}
                                  onMouseUp={() => setDragEnabled(null)}
                                >
                                  <GripIcon />
                                </button>
                              </div>
                            )}

                            {isOpen && !isEditingItem && (
                              <div className="cb-item-body">
                                <dl className="cb-meta">
                                  <div>
                                    <dt>Video</dt>
                                    <dd className={video.embedUrl ? "" : "muted"}>
                                      {video.embedUrl || "No embed link set"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Description</dt>
                                    <dd className={video.description ? "" : "muted"}>
                                      {video.description || "—"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Required tools</dt>
                                    <dd className={video.requiredTools.length ? "" : "muted"}>
                                      {video.requiredTools.length ? video.requiredTools.join(", ") : "—"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Media files</dt>
                                    <dd className={video.materials.length ? "" : "muted"}>
                                      {video.materials.length ? `${video.materials.length} file(s)` : "—"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Instructions</dt>
                                    <dd className={video.instructions ? "" : "muted"}>
                                      {video.instructions || "—"}
                                    </dd>
                                  </div>
                                </dl>
                                <button className="cb-btn-primary" type="button" onClick={() => setContentModal(video)}>
                                  Edit content
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button className="cb-add-item" type="button" onClick={() => addLecture(section)}>
                        <span aria-hidden="true">+</span> Curriculum Item
                      </button>
                    </div>
                  </div>
                );
              })}

              {form.kind === "new-section" ? (
                <form className="cb-form cb-new-section" onSubmit={submitNewSection}>
                  <label>
                    New section:
                    <input
                      type="text"
                      maxLength={TITLE_MAX}
                      value={sectionDraft.title}
                      autoFocus
                      placeholder="Section title"
                      onChange={(e) => setSectionDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                    <span className="cb-counter">{sectionDraft.title.length}/{TITLE_MAX}</span>
                  </label>
                  <label>
                    What will students be able to do by the end of this section?
                    <input
                      type="text"
                      maxLength={OBJECTIVE_MAX}
                      value={sectionDraft.objective}
                      onChange={(e) => setSectionDraft((d) => ({ ...d, objective: e.target.value }))}
                    />
                    <span className="cb-counter">{sectionDraft.objective.length}/{OBJECTIVE_MAX}</span>
                  </label>
                  <div className="cb-form-row">
                    <select
                      value={sectionDraft.level}
                      aria-label="Level"
                      onChange={(e) => setSectionDraft((d) => ({ ...d, level: e.target.value as CourseLevel }))}
                    >
                      {COURSE_LEVELS.map((l) => (
                        <option key={l.level} value={l.level}>{l.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Core Competence (e.g. 1)"
                      value={sectionDraft.core}
                      onChange={(e) => setSectionDraft((d) => ({ ...d, core: e.target.value }))}
                    />
                  </div>
                  <div className="cb-form-actions">
                    <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                    <button type="submit" className="cb-btn-primary">Add Section</button>
                  </div>
                </form>
              ) : (
                <button className="cb-add-section" type="button" onClick={openNewSection}>
                  <span aria-hidden="true">+</span> Section
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {pendingDelete && (
        <ConfirmModal
          message="You are about to remove a curriculum item. Are you sure you want to continue?"
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {contentModal && (
        <VideoEditModal
          key={`content-${contentModal.id}`}
          mode="edit"
          initial={contentModal}
          onClose={() => setContentModal(null)}
          onSave={saveContent}
        />
      )}
    </main>
  );
}
