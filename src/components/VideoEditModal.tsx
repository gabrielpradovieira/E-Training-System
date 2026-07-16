"use client";

import { useState } from "react";
import type { VideoDoc, VideoMaterial } from "@/lib/types";
import { extractEmbedSrc } from "@/lib/sharepoint";

export type VideoModalData = {
  title: string;
  description: string;
  embedUrl: string;
  requiredTools: string[];
  materials: VideoMaterial[];
  instructions: string;
};

export type VideoModalInitial = Pick<
  VideoDoc,
  "title" | "description" | "embedUrl" | "requiredTools" | "materials" | "instructions"
>;

/**
 * Mount a fresh instance per open (via a changing `key` from the parent), so
 * form state initializes straight from props — no syncing effect needed.
 */
export default function VideoEditModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: VideoModalInitial | null;
  onClose: () => void;
  onSave: (data: VideoModalData) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [embedUrl, setEmbedUrl] = useState(initial?.embedUrl ?? "");
  const [tools, setTools] = useState(initial?.requiredTools?.join(", ") ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [materials, setMaterials] = useState<VideoMaterial[]>(initial?.materials ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateMaterial(index: number, field: keyof VideoMaterial, value: string) {
    setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim() || "Untitled video",
        description: description.trim(),
        // Accept a full <iframe> embed snippet or a bare URL.
        embedUrl: extractEmbedSrc(embedUrl),
        requiredTools: tools
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        materials: materials.filter((m) => m.label.trim() || m.url.trim()),
        instructions: instructions.trim(),
      });
    } catch {
      setError("Couldn't save. Make sure the latest firestore.rules are published and you're admin.");
      setSaving(false);
    }
  }

  return (
    <div className="video-modal-overlay" onClick={onClose} role="presentation">
      <div className="video-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{mode === "create" ? "Add video" : "Edit video"}</h3>
        <p className="video-modal-sub">
          Everything here is what students see on the Training page for this video.
        </p>

        {error && <div className="video-modal-error">{error}</div>}

        <label htmlFor="vm-title">Title</label>
        <input
          id="vm-title"
          type="text"
          value={title}
          placeholder="e.g. Interface and menus"
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="vm-desc">Description</label>
        <textarea
          id="vm-desc"
          rows={3}
          value={description}
          placeholder="What this lesson covers…"
          onChange={(e) => setDescription(e.target.value)}
        />

        <label htmlFor="vm-embed">OneDrive embed code or link</label>
        <input
          id="vm-embed"
          type="text"
          value={embedUrl}
          placeholder='<iframe src="…"> or https://…'
          onChange={(e) => setEmbedUrl(e.target.value)}
        />

        <label htmlFor="vm-tools">Required tools <span className="vm-hint">(comma separated)</span></label>
        <input
          id="vm-tools"
          type="text"
          value={tools}
          placeholder="Adobe Photoshop, Drawing tablet"
          onChange={(e) => setTools(e.target.value)}
        />

        <label htmlFor="vm-instructions">Instructions</label>
        <textarea
          id="vm-instructions"
          rows={4}
          value={instructions}
          placeholder="Steps the student should follow for this lesson's task…"
          onChange={(e) => setInstructions(e.target.value)}
        />

        <label>Media files</label>
        {materials.map((material, index) => (
          <div className="material-row" key={index}>
            <input
              type="text"
              value={material.label}
              placeholder="Label"
              onChange={(e) => updateMaterial(index, "label", e.target.value)}
            />
            <input
              type="url"
              value={material.url}
              placeholder="https://…"
              onChange={(e) => updateMaterial(index, "url", e.target.value)}
            />
            <button
              type="button"
              className="material-remove"
              aria-label="Remove media file"
              onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== index))}
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          className="material-add"
          onClick={() => setMaterials((prev) => [...prev, { label: "", url: "" }])}
        >
          + Add media file
        </button>

        <div className="video-modal-actions">
          <button type="button" className="video-modal-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="video-modal-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
