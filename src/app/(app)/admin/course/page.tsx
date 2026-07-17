"use client";

import "@/styles/training-admin.css";
import "@/styles/curriculum-builder.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  createCore,
  createSection,
  createVideo,
  deleteCore,
  deleteSection,
  deleteVideo,
  fetchCores,
  fetchSectionsByCore,
  fetchVideosBySection,
  persistCoreOrder,
  persistSectionOrder,
  persistVideoOrder,
  updateCore,
  updateSection,
  updateVideo,
} from "@/lib/course-data";
import {
  COURSE_LEVELS,
  type CoreCompetence,
  type CourseLevel,
  type CourseSection,
  type VideoDoc,
  type VideoMaterial,
} from "@/lib/types";
import { extractEmbedSrc } from "@/lib/sharepoint";
import CourseImport from "@/components/CourseImport";
import ConfirmModal from "@/components/ConfirmModal";
import { coreHeading } from "@/lib/course-format";

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

/* ---------------- state types ---------------- */
type OpenForm =
  | { kind: "none" }
  | { kind: "new-core" }
  | { kind: "edit-core"; id: string }
  | { kind: "new-unit"; coreId: string }
  | { kind: "edit-unit"; id: string }
  | { kind: "edit-video-title"; id: string };

type Pending =
  | { kind: "core"; core: CoreCompetence }
  | { kind: "unit"; unit: CourseSection }
  | { kind: "video"; video: VideoDoc };

type DragState =
  | { kind: "core"; id: string }
  | { kind: "unit"; id: string; fromCoreId: string }
  | { kind: "video"; id: string; fromSectionId: string }
  | null;

/** The editable form behind an expanded video row. */
type VideoDraft = {
  embedUrl: string;
  description: string;
  requiredTools: string;
  instructions: string;
  materials: VideoMaterial[];
};

export default function AdminTrainingMaterialPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  const [cores, setCores] = useState<CoreCompetence[]>([]);
  const [unitsByCore, setUnitsByCore] = useState<Record<string, CourseSection[]>>({});
  const [videosBySection, setVideosBySection] = useState<Record<string, VideoDoc[]>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeLevel, setActiveLevel] = useState<CourseLevel>("foundation");
  const [form, setForm] = useState<OpenForm>({ kind: "none" });
  const [openCores, setOpenCores] = useState<Set<string>>(new Set());
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set());
  const [openVideos, setOpenVideos] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Pending | null>(null);

  const [coreDraft, setCoreDraft] = useState({ title: "", description: "" });
  const [unitDraft, setUnitDraft] = useState({ title: "", description: "" });
  const [videoTitleDraft, setVideoTitleDraft] = useState("");
  const [videoDrafts, setVideoDrafts] = useState<Record<string, VideoDraft>>({});
  const [savingVideo, setSavingVideo] = useState<string | null>(null);

  const [drag, setDrag] = useState<DragState>(null);
  const [dragEnabled, setDragEnabled] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [c, u, v] = await Promise.all([fetchCores(), fetchSectionsByCore(), fetchVideosBySection()]);
      setCores(c);
      setUnitsByCore(u);
      setVideosBySection(v);
    } catch {
      setError("Couldn't load the training material. Make sure the latest firestore.rules are published.");
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

  const visibleCores = cores.filter((c) => c.level === activeLevel);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------- cores ---------------- */

  async function submitNewCore(e: React.FormEvent) {
    e.preventDefault();
    if (!coreDraft.title.trim()) return;
    const order = cores.length ? Math.max(...cores.map((c) => c.order)) + 1 : 0;
    await guard(async () => {
      await createCore({
        level: activeLevel,
        title: coreDraft.title.trim(),
        description: coreDraft.description.trim(),
        order,
      });
      setForm({ kind: "none" });
    }, "Couldn't add the core competence.");
  }

  async function submitEditCore(e: React.FormEvent, id: string) {
    e.preventDefault();
    await guard(async () => {
      await updateCore(id, {
        title: coreDraft.title.trim() || "Untitled",
        description: coreDraft.description.trim(),
      });
      setForm({ kind: "none" });
    }, "Couldn't save the core competence.");
  }

  /* ---------------- units ---------------- */

  async function submitNewUnit(e: React.FormEvent, coreId: string) {
    e.preventDefault();
    if (!unitDraft.title.trim()) return;
    const list = unitsByCore[coreId] ?? [];
    const order = list.length ? Math.max(...list.map((u) => u.order)) + 1 : 0;
    await guard(async () => {
      await createSection({
        coreId,
        title: unitDraft.title.trim(),
        description: unitDraft.description.trim(),
        order,
      });
      setForm({ kind: "none" });
      setOpenCores((prev) => new Set(prev).add(coreId));
    }, "Couldn't add the competence unit.");
  }

  async function submitEditUnit(e: React.FormEvent, id: string) {
    e.preventDefault();
    await guard(async () => {
      await updateSection(id, {
        title: unitDraft.title.trim() || "Untitled unit",
        description: unitDraft.description.trim(),
      });
      setForm({ kind: "none" });
    }, "Couldn't save the competence unit.");
  }

  /* ---------------- videos ---------------- */

  async function addVideo(unit: CourseSection) {
    const list = videosBySection[unit.id] ?? [];
    const order = list.length ? Math.max(...list.map((v) => v.order)) + 1 : 0;
    await guard(async () => {
      const id = await createVideo({
        sectionId: unit.id,
        order,
        title: "New video",
        description: "",
        embedUrl: "",
        requiredTools: [],
        materials: [],
        instructions: "",
      });
      setVideoTitleDraft("New video");
      setForm({ kind: "edit-video-title", id });
      setOpenUnits((prev) => new Set(prev).add(unit.id));
    }, "Couldn't add the video.");
  }

  async function submitVideoTitle(e: React.FormEvent, id: string) {
    e.preventDefault();
    await guard(async () => {
      await updateVideo(id, { title: videoTitleDraft.trim() || "Untitled video" });
      setForm({ kind: "none" });
    }, "Couldn't rename the video.");
  }

  function draftFor(video: VideoDoc): VideoDraft {
    return (
      videoDrafts[video.id] ?? {
        embedUrl: video.embedUrl,
        description: video.description,
        requiredTools: video.requiredTools.join(", "),
        instructions: video.instructions,
        materials: video.materials,
      }
    );
  }

  function setDraft(id: string, patch: Partial<VideoDraft>) {
    setVideoDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } as VideoDraft }));
  }

  async function saveVideo(video: VideoDoc) {
    const draft = draftFor(video);
    setSavingVideo(video.id);
    await guard(async () => {
      await updateVideo(video.id, {
        embedUrl: extractEmbedSrc(draft.embedUrl),
        description: draft.description.trim(),
        requiredTools: draft.requiredTools
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        instructions: draft.instructions.trim(),
        materials: draft.materials.filter((m) => m.label.trim() || m.url.trim()),
      });
      setVideoDrafts((prev) => {
        const next = { ...prev };
        delete next[video.id];
        return next;
      });
    }, "Couldn't save the video.");
    setSavingVideo(null);
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.kind === "core") await guard(() => deleteCore(target.core.id), "Couldn't delete the core competence.");
    else if (target.kind === "unit") await guard(() => deleteSection(target.unit.id), "Couldn't delete the competence unit.");
    else await guard(() => deleteVideo(target.video.id), "Couldn't delete the video.");
  }

  /* ---------------- drag & drop ---------------- */

  function dropCore(targetId: string) {
    if (!drag || drag.kind !== "core" || drag.id === targetId) return;
    // Reorder within the visible level, then splice back into the full list.
    const ids = visibleCores.map((c) => c.id);
    const from = ids.indexOf(drag.id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...visibleCores];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const others = cores.filter((c) => c.level !== activeLevel);
    const next = [...others, ...reordered].sort((a, b) => a.order - b.order);
    setCores([...cores.filter((c) => c.level !== activeLevel), ...reordered]);
    guard(() => persistCoreOrder(next.map((c) => c.id)), "Couldn't save the new order.");
  }

  function dropUnit(toCoreId: string, beforeUnitId: string | null) {
    if (!drag || drag.kind !== "unit") return;
    const fromList = [...(unitsByCore[drag.fromCoreId] ?? [])];
    const movedIndex = fromList.findIndex((u) => u.id === drag.id);
    if (movedIndex < 0) return;
    const [moved] = fromList.splice(movedIndex, 1);

    const same = drag.fromCoreId === toCoreId;
    const toList = same ? fromList : [...(unitsByCore[toCoreId] ?? [])];
    const at = beforeUnitId ? toList.findIndex((u) => u.id === beforeUnitId) : toList.length;
    toList.splice(at < 0 ? toList.length : at, 0, { ...moved, coreId: toCoreId });

    const next = { ...unitsByCore, [toCoreId]: toList };
    if (!same) next[drag.fromCoreId] = fromList;
    setUnitsByCore(next);
    guard(
      () => persistSectionOrder(toList.map((u) => ({ id: u.id, coreId: toCoreId }))),
      "Couldn't save the new order.",
    );
  }

  function dropVideo(toSectionId: string, beforeVideoId: string | null) {
    if (!drag || drag.kind !== "video") return;
    const fromList = [...(videosBySection[drag.fromSectionId] ?? [])];
    const movedIndex = fromList.findIndex((v) => v.id === drag.id);
    if (movedIndex < 0) return;
    const [moved] = fromList.splice(movedIndex, 1);

    const same = drag.fromSectionId === toSectionId;
    const toList = same ? fromList : [...(videosBySection[toSectionId] ?? [])];
    const at = beforeVideoId ? toList.findIndex((v) => v.id === beforeVideoId) : toList.length;
    toList.splice(at < 0 ? toList.length : at, 0, { ...moved, sectionId: toSectionId });

    const next = { ...videosBySection, [toSectionId]: toList };
    if (!same) next[drag.fromSectionId] = fromList;
    setVideosBySection(next);
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
          <h2>Training Material</h2>
          <p className="admin-card-sub">
            Build the training material as Core Competences, each holding Competence Units, each
            holding videos. Students see exactly this on the Training Material page.
          </p>

          {/* Level filter — shows/hides everything for the selected level. */}
          <div className="curriculum-level-tabs cb-level-tabs" role="tablist" aria-label="Level filter">
            {COURSE_LEVELS.map((tab) => (
              <button
                key={tab.level}
                className={`curriculum-level-tab${activeLevel === tab.level ? " active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeLevel === tab.level}
                onClick={() => {
                  setActiveLevel(tab.level);
                  setForm({ kind: "none" });
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : (
            <div className="cb-list">
              {visibleCores.length === 0 && form.kind !== "new-core" && (
                <p className="admin-muted">
                  Nothing in {COURSE_LEVELS.find((l) => l.level === activeLevel)?.label} yet.
                </p>
              )}

              {visibleCores.map((core, cIndex) => {
                const units = unitsByCore[core.id] ?? [];
                const coreOpen = openCores.has(core.id);
                const editingCore = form.kind === "edit-core" && form.id === core.id;

                return (
                  <div
                    className={`cb-section${drag?.kind === "core" && drag.id === core.id ? " dragging" : ""}`}
                    key={core.id}
                    draggable={dragEnabled === `core-${core.id}`}
                    onDragStart={() => setDrag({ kind: "core", id: core.id })}
                    onDragEnd={() => { setDrag(null); setDragEnabled(null); }}
                    onDragOver={(e) => { if (drag?.kind === "core") e.preventDefault(); }}
                    onDrop={(e) => {
                      if (drag?.kind === "core") { e.preventDefault(); dropCore(core.id); }
                    }}
                  >
                    {editingCore ? (
                      <form className="cb-form" onSubmit={(e) => submitEditCore(e, core.id)}>
                        <label>
                          Core Competence name
                          <input
                            type="text" maxLength={TITLE_MAX} value={coreDraft.title} autoFocus
                            onChange={(e) => setCoreDraft((d) => ({ ...d, title: e.target.value }))}
                          />
                          <span className="cb-counter">{coreDraft.title.length}/{TITLE_MAX}</span>
                        </label>
                        <label>
                          Description
                          <input
                            type="text" maxLength={OBJECTIVE_MAX} value={coreDraft.description}
                            onChange={(e) => setCoreDraft((d) => ({ ...d, description: e.target.value }))}
                          />
                          <span className="cb-counter">{coreDraft.description.length}/{OBJECTIVE_MAX}</span>
                        </label>
                        <div className="cb-form-actions">
                          <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                          <button type="submit" className="cb-btn-primary">Save</button>
                        </div>
                      </form>
                    ) : (
                      <div className="cb-section-head">
                        <button
                          className={`cb-chevron flush${coreOpen ? " open" : ""}`}
                          type="button"
                          aria-label={coreOpen ? "Collapse core competence" : "Expand core competence"}
                          aria-expanded={coreOpen}
                          onClick={() => toggle(setOpenCores, core.id)}
                        >
                          <ChevronIcon />
                        </button>
                        <strong className="cb-section-label">{coreHeading(core.title, cIndex)}:</strong>
                        <DocIcon />
                        <span className="cb-section-title">{core.description || "—"}</span>
                        <span className="cb-row-tools">
                          <button className="cb-icon-btn" type="button" aria-label="Edit core competence"
                            onClick={() => { setCoreDraft({ title: core.title, description: core.description }); setForm({ kind: "edit-core", id: core.id }); }}>
                            <PencilIcon />
                          </button>
                          <button className="cb-icon-btn danger" type="button" aria-label="Delete core competence"
                            onClick={() => setPendingDelete({ kind: "core", core })}>
                            <TrashIcon />
                          </button>
                        </span>
                        <span className="cb-section-meta">
                          <span className="cb-core">{units.length} unit(s)</span>
                        </span>
                        <button className="cb-grip" type="button" aria-label="Drag to reorder core competence"
                          onMouseDown={() => setDragEnabled(`core-${core.id}`)}
                          onMouseUp={() => setDragEnabled(null)}>
                          <GripIcon />
                        </button>
                      </div>
                    )}

                    {coreOpen && !editingCore && (
                      <div
                        className="cb-items"
                        onDragOver={(e) => { if (drag?.kind === "unit") e.preventDefault(); }}
                        onDrop={(e) => { if (drag?.kind === "unit") { e.preventDefault(); dropUnit(core.id, null); } }}
                      >
                        {units.map((unit, uIndex) => {
                          const videos = videosBySection[unit.id] ?? [];
                          const unitOpen = openUnits.has(unit.id);
                          const editingUnit = form.kind === "edit-unit" && form.id === unit.id;

                          return (
                            <div
                              className={`cb-unit${drag?.kind === "unit" && drag.id === unit.id ? " dragging" : ""}`}
                              key={unit.id}
                              draggable={dragEnabled === `unit-${unit.id}`}
                              onDragStart={(e) => { e.stopPropagation(); setDrag({ kind: "unit", id: unit.id, fromCoreId: core.id }); }}
                              onDragEnd={() => { setDrag(null); setDragEnabled(null); }}
                              onDragOver={(e) => { if (drag?.kind === "unit") e.preventDefault(); }}
                              onDrop={(e) => { if (drag?.kind === "unit") { e.preventDefault(); e.stopPropagation(); dropUnit(core.id, unit.id); } }}
                            >
                              {editingUnit ? (
                                <form className="cb-form" onSubmit={(e) => submitEditUnit(e, unit.id)}>
                                  <label>
                                    Competence Unit title
                                    <input type="text" maxLength={TITLE_MAX} value={unitDraft.title} autoFocus
                                      onChange={(e) => setUnitDraft((d) => ({ ...d, title: e.target.value }))} />
                                    <span className="cb-counter">{unitDraft.title.length}/{TITLE_MAX}</span>
                                  </label>
                                  <label>
                                    What will students be able to do by the end of this unit?
                                    <input type="text" maxLength={OBJECTIVE_MAX} value={unitDraft.description}
                                      onChange={(e) => setUnitDraft((d) => ({ ...d, description: e.target.value }))} />
                                    <span className="cb-counter">{unitDraft.description.length}/{OBJECTIVE_MAX}</span>
                                  </label>
                                  <div className="cb-form-actions">
                                    <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                                    <button type="submit" className="cb-btn-primary">Save Unit</button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="cb-item-head">
                                    <button
                                      className={`cb-chevron flush${unitOpen ? " open" : ""}`}
                                      type="button"
                                      aria-label={unitOpen ? "Collapse unit" : "Expand unit"}
                                      aria-expanded={unitOpen}
                                      onClick={() => toggle(setOpenUnits, unit.id)}
                                    >
                                      <ChevronIcon />
                                    </button>
                                    <strong className="cb-item-label">Unit {uIndex + 1}:</strong>
                                    <DocIcon />
                                    <span className="cb-item-title">{unit.title}</span>
                                    <span className="cb-row-tools">
                                      <button className="cb-icon-btn" type="button" aria-label="Edit unit"
                                        onClick={() => { setUnitDraft({ title: unit.title, description: unit.description }); setForm({ kind: "edit-unit", id: unit.id }); }}>
                                        <PencilIcon />
                                      </button>
                                      <button className="cb-icon-btn danger" type="button" aria-label="Delete unit"
                                        onClick={() => setPendingDelete({ kind: "unit", unit })}>
                                        <TrashIcon />
                                      </button>
                                    </span>
                                    <span className="cb-badge-neutral">{videos.length} video(s)</span>
                                    <button className="cb-grip" type="button" aria-label="Drag to reorder unit"
                                      onMouseDown={() => setDragEnabled(`unit-${unit.id}`)}
                                      onMouseUp={() => setDragEnabled(null)}>
                                      <GripIcon />
                                    </button>
                                  </div>
                                  {unit.description && <p className="cb-objective">{unit.description}</p>}
                                </>
                              )}

                              {unitOpen && !editingUnit && (
                                <div
                                  className="cb-videos"
                                  onDragOver={(e) => { if (drag?.kind === "video") e.preventDefault(); }}
                                  onDrop={(e) => { if (drag?.kind === "video") { e.preventDefault(); dropVideo(unit.id, null); } }}
                                >
                                  {videos.map((video, vIndex) => {
                                    const videoOpen = openVideos.has(video.id);
                                    const editingTitle = form.kind === "edit-video-title" && form.id === video.id;
                                    const draft = draftFor(video);

                                    return (
                                      <div
                                        className={`cb-item${drag?.kind === "video" && drag.id === video.id ? " dragging" : ""}`}
                                        key={video.id}
                                        draggable={dragEnabled === `video-${video.id}`}
                                        onDragStart={(e) => { e.stopPropagation(); setDrag({ kind: "video", id: video.id, fromSectionId: unit.id }); }}
                                        onDragEnd={() => { setDrag(null); setDragEnabled(null); }}
                                        onDragOver={(e) => { if (drag?.kind === "video") e.preventDefault(); }}
                                        onDrop={(e) => { if (drag?.kind === "video") { e.preventDefault(); e.stopPropagation(); dropVideo(unit.id, video.id); } }}
                                      >
                                        {editingTitle ? (
                                          <form className="cb-form inline" onSubmit={(e) => submitVideoTitle(e, video.id)}>
                                            <label>
                                              Video title
                                              <input type="text" maxLength={TITLE_MAX} value={videoTitleDraft} autoFocus
                                                onChange={(e) => setVideoTitleDraft(e.target.value)} />
                                              <span className="cb-counter">{videoTitleDraft.length}/{TITLE_MAX}</span>
                                            </label>
                                            <div className="cb-form-actions">
                                              <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                                              <button type="submit" className="cb-btn-primary">Save</button>
                                            </div>
                                          </form>
                                        ) : (
                                          <div className="cb-item-head">
                                            <span className={`cb-status${video.embedUrl ? " done" : ""}`}
                                              title={video.embedUrl ? "Video linked" : "No video link yet"}>
                                              {video.embedUrl ? <CheckIcon /> : <EmptyIcon />}
                                            </span>
                                            <strong className="cb-item-label">Video {vIndex + 1}:</strong>
                                            <PlayIcon />
                                            <span className="cb-item-title">{video.title}</span>
                                            <span className="cb-row-tools">
                                              <button className="cb-icon-btn" type="button" aria-label="Rename video"
                                                onClick={() => { setVideoTitleDraft(video.title); setForm({ kind: "edit-video-title", id: video.id }); }}>
                                                <PencilIcon />
                                              </button>
                                              <button className="cb-icon-btn danger" type="button" aria-label="Delete video"
                                                onClick={() => setPendingDelete({ kind: "video", video })}>
                                                <TrashIcon />
                                              </button>
                                            </span>
                                            {!video.embedUrl && <span className="cb-badge">No video</span>}
                                            <button className={`cb-chevron${videoOpen ? " open" : ""}`} type="button"
                                              aria-label={videoOpen ? "Collapse" : "Expand"} aria-expanded={videoOpen}
                                              onClick={() => toggle(setOpenVideos, video.id)}>
                                              <ChevronIcon />
                                            </button>
                                            <button className="cb-grip" type="button" aria-label="Drag to reorder video"
                                              onMouseDown={() => setDragEnabled(`video-${video.id}`)}
                                              onMouseUp={() => setDragEnabled(null)}>
                                              <GripIcon />
                                            </button>
                                          </div>
                                        )}

                                        {/* Inline editing — click any field, then Save. */}
                                        {videoOpen && !editingTitle && (
                                          <div className="cb-item-body">
                                            <label className="cb-field">
                                              Video link
                                              <input type="text" value={draft.embedUrl}
                                                placeholder='<iframe src="…"> or https://…'
                                                onChange={(e) => setDraft(video.id, { ...draft, embedUrl: e.target.value })} />
                                            </label>
                                            <label className="cb-field">
                                              Description
                                              <textarea rows={3} value={draft.description}
                                                onChange={(e) => setDraft(video.id, { ...draft, description: e.target.value })} />
                                            </label>
                                            <label className="cb-field">
                                              Required tools <span className="vm-hint">(comma separated)</span>
                                              <input type="text" value={draft.requiredTools}
                                                placeholder="Adobe Photoshop, Drawing tablet"
                                                onChange={(e) => setDraft(video.id, { ...draft, requiredTools: e.target.value })} />
                                            </label>
                                            <label className="cb-field">
                                              Instructions
                                              <textarea rows={3} value={draft.instructions}
                                                onChange={(e) => setDraft(video.id, { ...draft, instructions: e.target.value })} />
                                            </label>

                                            <div className="cb-field">
                                              <span className="cb-field-label">Media files</span>
                                              {draft.materials.map((m, i) => (
                                                <div className="material-row" key={i}>
                                                  <input type="text" value={m.label} placeholder="Label"
                                                    onChange={(e) => {
                                                      const next = draft.materials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                                                      setDraft(video.id, { ...draft, materials: next });
                                                    }} />
                                                  <input type="url" value={m.url} placeholder="https://…"
                                                    onChange={(e) => {
                                                      const next = draft.materials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x));
                                                      setDraft(video.id, { ...draft, materials: next });
                                                    }} />
                                                  <button type="button" className="material-remove" aria-label="Remove media file"
                                                    onClick={() => setDraft(video.id, { ...draft, materials: draft.materials.filter((_, j) => j !== i) })}>
                                                    &times;
                                                  </button>
                                                </div>
                                              ))}
                                              <button type="button" className="material-add"
                                                onClick={() => setDraft(video.id, { ...draft, materials: [...draft.materials, { label: "", url: "" }] })}>
                                                + Add media file
                                              </button>
                                            </div>

                                            <div className="cb-form-actions">
                                              <button type="button" className="cb-btn-primary"
                                                disabled={savingVideo === video.id}
                                                onClick={() => saveVideo(video)}>
                                                {savingVideo === video.id ? "Saving…" : "Save"}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  <button className="cb-add-item" type="button" onClick={() => addVideo(unit)}>
                                    <span aria-hidden="true">+</span> Video
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {form.kind === "new-unit" && form.coreId === core.id ? (
                          <form className="cb-form cb-new-section" onSubmit={(e) => submitNewUnit(e, core.id)}>
                            <label>
                              New competence unit:
                              <input type="text" maxLength={TITLE_MAX} value={unitDraft.title} autoFocus placeholder="Unit title"
                                onChange={(e) => setUnitDraft((d) => ({ ...d, title: e.target.value }))} />
                              <span className="cb-counter">{unitDraft.title.length}/{TITLE_MAX}</span>
                            </label>
                            <label>
                              What will students be able to do by the end of this unit?
                              <input type="text" maxLength={OBJECTIVE_MAX} value={unitDraft.description}
                                onChange={(e) => setUnitDraft((d) => ({ ...d, description: e.target.value }))} />
                              <span className="cb-counter">{unitDraft.description.length}/{OBJECTIVE_MAX}</span>
                            </label>
                            <div className="cb-form-actions">
                              <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                              <button type="submit" className="cb-btn-primary">Add Unit</button>
                            </div>
                          </form>
                        ) : (
                          <button className="cb-add-item" type="button"
                            onClick={() => { setUnitDraft({ title: "", description: "" }); setForm({ kind: "new-unit", coreId: core.id }); }}>
                            <span aria-hidden="true">+</span> Competence Unit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {form.kind === "new-core" ? (
                <form className="cb-form cb-new-section" onSubmit={submitNewCore}>
                  <label>
                    New core competence:
                    <input type="text" maxLength={TITLE_MAX} value={coreDraft.title} autoFocus placeholder="e.g. 1"
                      onChange={(e) => setCoreDraft((d) => ({ ...d, title: e.target.value }))} />
                    <span className="cb-counter">{coreDraft.title.length}/{TITLE_MAX}</span>
                  </label>
                  <label>
                    Description
                    <input type="text" maxLength={OBJECTIVE_MAX} value={coreDraft.description}
                      onChange={(e) => setCoreDraft((d) => ({ ...d, description: e.target.value }))} />
                    <span className="cb-counter">{coreDraft.description.length}/{OBJECTIVE_MAX}</span>
                  </label>
                  <p className="import-note">
                    Added to <strong>{COURSE_LEVELS.find((l) => l.level === activeLevel)?.label}</strong> (the selected level tab).
                  </p>
                  <div className="cb-form-actions">
                    <button type="button" className="cb-btn-ghost" onClick={() => setForm({ kind: "none" })}>Cancel</button>
                    <button type="submit" className="cb-btn-primary">Add Core Competence</button>
                  </div>
                </form>
              ) : (
                <button className="cb-add-section" type="button"
                  onClick={() => { setCoreDraft({ title: "", description: "" }); setForm({ kind: "new-core" }); }}>
                  <span aria-hidden="true">+</span> Core Competence
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
    </main>
  );
}
