"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { extractEmbedSrc } from "@/lib/sharepoint";
import type { CourseImportRow } from "@/lib/csv";
import type {
  CoreCompetence,
  CoreInput,
  CourseSection,
  SectionInput,
  VideoDoc,
  VideoInput,
} from "@/lib/types";

/* =====================================================================
   Training material (read: approved users; write: admin)
   Hierarchy: Level -> Core Competence -> Competence Unit -> Videos
   ===================================================================== */

/* ---------------- Core Competences ---------------- */

/** Core Competences, in order. The level lives here. */
export async function fetchCores(): Promise<CoreCompetence[]> {
  const snap = await getDocs(collection(db, "cores"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        level: data.level ?? "foundation",
        title: data.title ?? "",
        description: data.description ?? "",
        order: data.order ?? 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as CoreCompetence;
    })
    .sort((a, b) => a.order - b.order);
}

export async function createCore(input: CoreInput): Promise<string> {
  const ref = await addDoc(collection(db, "cores"), {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateCore(id: string, patch: Partial<CoreInput>): Promise<void> {
  await updateDoc(doc(db, "cores", id), { ...patch, updatedAt: Date.now() });
}

/** Deletes a core, every unit inside it, and every video inside those units. */
export async function deleteCore(id: string): Promise<void> {
  const units = await getDocs(query(collection(db, "sections"), where("coreId", "==", id)));
  await Promise.all(units.docs.map((u) => deleteSection(u.id)));
  await deleteDoc(doc(db, "cores", id));
}

/* ---------------- Competence Units ---------------- */

/** Competence Units grouped by coreId, sorted by order within each core. */
export async function fetchSectionsByCore(): Promise<Record<string, CourseSection[]>> {
  const snap = await getDocs(collection(db, "sections"));
  const byCore: Record<string, CourseSection[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const section: CourseSection = {
      id: d.id,
      coreId: data.coreId ?? "",
      title: data.title ?? "Untitled unit",
      description: data.description ?? "",
      order: data.order ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    (byCore[section.coreId] ??= []).push(section);
  });
  Object.values(byCore).forEach((list) => list.sort((a, b) => a.order - b.order));
  return byCore;
}

export async function createSection(input: SectionInput): Promise<string> {
  const ref = await addDoc(collection(db, "sections"), {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateSection(id: string, patch: Partial<SectionInput>): Promise<void> {
  await updateDoc(doc(db, "sections", id), { ...patch, updatedAt: Date.now() });
}

/** Deletes a unit and every video inside it. */
export async function deleteSection(id: string): Promise<void> {
  const videos = await getDocs(query(collection(db, "videos"), where("sectionId", "==", id)));
  await Promise.all(videos.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "sections", id));
}

/* ---------------- Videos ---------------- */

/** All videos, grouped by sectionId and sorted by order within each unit. */
export async function fetchVideosBySection(): Promise<Record<string, VideoDoc[]>> {
  const snap = await getDocs(collection(db, "videos"));
  const bySection: Record<string, VideoDoc[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const video: VideoDoc = {
      id: d.id,
      sectionId: data.sectionId ?? "",
      order: data.order ?? 0,
      title: data.title ?? "Untitled",
      description: data.description ?? "",
      duration: data.duration ?? "",
      embedUrl: data.embedUrl ?? "",
      requiredTools: Array.isArray(data.requiredTools) ? data.requiredTools : [],
      materials: Array.isArray(data.materials) ? data.materials : [],
      instructions: data.instructions ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    (bySection[video.sectionId] ??= []).push(video);
  });
  Object.values(bySection).forEach((list) => list.sort((a, b) => a.order - b.order));
  return bySection;
}

export async function createVideo(input: VideoInput): Promise<string> {
  const ref = await addDoc(collection(db, "videos"), {
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateVideo(
  id: string,
  patch: Partial<Omit<VideoInput, "sectionId">>,
): Promise<void> {
  await updateDoc(doc(db, "videos", id), { ...patch, updatedAt: Date.now() });
}

export async function deleteVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, "videos", id));
}

/* ---------------- Reordering (drag & drop) ---------------- */

export async function persistCoreOrder(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, index) => updateDoc(doc(db, "cores", id), { order: index, updatedAt: Date.now() })),
  );
}

/** Persists unit order, moving a unit to a new core when dropped into one. */
export async function persistSectionOrder(items: { id: string; coreId: string }[]): Promise<void> {
  await Promise.all(
    items.map((item, index) =>
      updateDoc(doc(db, "sections", item.id), {
        order: index,
        coreId: item.coreId,
        updatedAt: Date.now(),
      }),
    ),
  );
}

/** Persists video order, moving a video to a new unit when dropped into one. */
export async function persistVideoOrder(items: { id: string; sectionId: string }[]): Promise<void> {
  await Promise.all(
    items.map((item, index) =>
      updateDoc(doc(db, "videos", item.id), {
        order: index,
        sectionId: item.sectionId,
        updatedAt: Date.now(),
      }),
    ),
  );
}

/* ---------------- Danger zone ---------------- */

/** Wipes every core, unit, and video — the entire training material. Irreversible. */
export async function deleteAllCourseData(): Promise<void> {
  const [coreSnap, sectionSnap, videoSnap] = await Promise.all([
    getDocs(collection(db, "cores")),
    getDocs(collection(db, "sections")),
    getDocs(collection(db, "videos")),
  ]);
  await Promise.all([
    ...videoSnap.docs.map((d) => deleteDoc(d.ref)),
    ...sectionSnap.docs.map((d) => deleteDoc(d.ref)),
    ...coreSnap.docs.map((d) => deleteDoc(d.ref)),
  ]);
}

/* ---------------- Spreadsheet import ---------------- */

export type ImportSummary = {
  coresCreated: number;
  unitsCreated: number;
  videosCreated: number;
  videosUpdated: number;
};

/**
 * Imports spreadsheet rows into the training material.
 *
 * Matching: core by (level + name), unit by (core + name), video by (unit +
 * title). Re-importing the same sheet UPDATES matching videos rather than
 * duplicating them. Nothing is ever deleted.
 */
export async function importCourseRows(rows: CourseImportRow[]): Promise<ImportSummary> {
  const cores = await fetchCores();
  const unitsByCore = await fetchSectionsByCore();
  const videosBySection = await fetchVideosBySection();

  const norm = (s: string) => s.trim().toLowerCase();
  const coreKey = (level: string, title: string) => `${level}||${norm(title)}`;

  const coreByKey = new Map<string, CoreCompetence>();
  cores.forEach((c) => coreByKey.set(coreKey(c.level, c.title), c));

  const unitByKey = new Map<string, CourseSection>();
  Object.values(unitsByCore).forEach((list) =>
    list.forEach((u) => unitByKey.set(`${u.coreId}||${norm(u.title)}`, u)),
  );

  let nextCoreOrder = cores.length ? Math.max(...cores.map((c) => c.order)) + 1 : 0;
  const videoOrder = new Map<string, number>();
  const seenVideo = new Map<string, Set<string>>();
  const summary: ImportSummary = {
    coresCreated: 0,
    unitsCreated: 0,
    videosCreated: 0,
    videosUpdated: 0,
  };

  for (const row of rows) {
    // --- Core Competence ---
    const cKey = coreKey(row.level, row.core);
    let core = coreByKey.get(cKey);
    if (!core) {
      const order = nextCoreOrder;
      nextCoreOrder += 1;
      const id = await createCore({ level: row.level, title: row.core, description: "", order });
      core = { id, level: row.level, title: row.core, description: "", order };
      coreByKey.set(cKey, core);
      summary.coresCreated += 1;
    }

    // --- Competence Unit ---
    // New units are ordered by their sheet-supplied Competence Unit Number
    // (the curriculum's continuous 1..33 numbering) rather than row order, so
    // a reshuffled sheet still produces correctly ordered units.
    const uKey = `${core.id}||${norm(row.unit)}`;
    let unit = unitByKey.get(uKey);
    if (!unit) {
      const order = row.unitNumber;
      const id = await createSection({ coreId: core.id, title: row.unit, description: "", order });
      unit = { id, coreId: core.id, title: row.unit, description: "", order };
      unitByKey.set(uKey, unit);
      summary.unitsCreated += 1;
    }

    // --- Video ---
    const existingVideos = videosBySection[unit.id] ?? [];
    if (!videoOrder.has(unit.id)) {
      videoOrder.set(
        unit.id,
        existingVideos.length ? Math.max(...existingVideos.map((v) => v.order)) + 1 : 0,
      );
    }
    if (!seenVideo.has(unit.id)) seenVideo.set(unit.id, new Set());

    const embedUrl = extractEmbedSrc(row.videoLink);
    const match = existingVideos.find((v) => norm(v.title) === norm(row.title));

    if (match) {
      await updateVideo(match.id, {
        title: row.title,
        description: row.description,
        // Only overwrite an existing duration when the sheet supplies one.
        ...(row.duration ? { duration: row.duration } : {}),
        embedUrl,
        requiredTools: row.requiredTools,
      });
      summary.videosUpdated += 1;
    } else if (!seenVideo.get(unit.id)!.has(norm(row.title))) {
      const order = videoOrder.get(unit.id)!;
      videoOrder.set(unit.id, order + 1);
      await createVideo({
        sectionId: unit.id,
        order,
        title: row.title,
        description: row.description,
        duration: row.duration,
        embedUrl,
        requiredTools: row.requiredTools,
        materials: [],
        instructions: "",
      });
      seenVideo.get(unit.id)!.add(norm(row.title));
      summary.videosCreated += 1;
    }
  }

  return summary;
}
