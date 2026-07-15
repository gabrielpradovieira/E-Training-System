"use client";

import { useState } from "react";
import type { VideoDoc, VideoMaterial } from "@/lib/types";

export type VideoModalData = {
  title: string;
  embedUrl: string;
  materials: VideoMaterial[];
};

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
  initial?: Pick<VideoDoc, "title" | "embedUrl" | "materials"> | null;
  onClose: () => void;
  onSave: (data: VideoModalData) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [embedUrl, setEmbedUrl] = useState(initial?.embedUrl ?? "");
  const [materials, setMaterials] = useState<VideoMaterial[]>(initial?.materials ?? []);
  const [saving, setSaving] = useState(false);

  function updateMaterial(index: number, field: keyof VideoMaterial, value: string) {
    setMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || "Untitled video",
        embedUrl: embedUrl.trim(),
        // Drop empty rows.
        materials: materials.filter((m) => m.label.trim() || m.url.trim()),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="video-modal-overlay" onClick={onClose} role="presentation">
      <div className="video-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>{mode === "create" ? "Add video" : "Edit video"}</h3>
        <p className="video-modal-sub">Paste a OneDrive / SharePoint embed link and attach any learning materials.</p>

        <label htmlFor="vm-title">Video title</label>
        <input
          id="vm-title"
          type="text"
          value={title}
          placeholder="e.g. Overview and objectives"
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="vm-embed">OneDrive embed link</label>
        <input
          id="vm-embed"
          type="url"
          value={embedUrl}
          placeholder="https://onedrive.live.com/embed?..."
          onChange={(e) => setEmbedUrl(e.target.value)}
        />

        <label>Learning materials</label>
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
              aria-label="Remove material"
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
          + Add material link
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
