import bunnyDurations from "./bunny-durations.json";

export type CurriculumLevel = "concept-art" | "3d-modeling";

export const curriculumLevelLabels: Record<CurriculumLevel, string> = {
  "concept-art": "Concept Art",
  "3d-modeling": "3D Modeling",
};

export type CurriculumItemType = "video";

export type CurriculumLessonItem = {
  itemType: CurriculumItemType;
  label: string;
  initiallyWatched: boolean;
  bunnyVideoId?: string;
  /** mm:ss (or h:mm:ss) run time, shown next to the lesson label when known. */
  durationLabel?: string;
};

export type CurriculumSection = {
  id: string;
  title: string;
  items: CurriculumLessonItem[];
};

/** Maps a lesson label to its Bunny Stream video GUID, for videos already uploaded. */
const BUNNY_VIDEO_IDS: Record<string, string> = {
  "Interface and menus": "d1be0994-c182-405d-807b-c9d544913183",
  "Layers": "27c6f42e-71d2-46df-9840-535e7d3c9c9c",
  "Brushes": "551bffda-93a5-4fd1-ac6b-3d40d8232dba",
  "Lasso tool and transforms": "9b8e7f93-3abc-46d2-9991-515934717b77",
  "Hue, saturation and luminosity": "fbec2524-44b2-4456-b353-cf1285ccd5f8",
  "Opacity and flow": "eca195a1-8e4b-4a95-a113-8094fef0de18",
  "Masks": "5ce74dc6-75b5-49ec-9413-bbe871830650",
  "Liquify, blur and filters": "ef41a179-7b45-4c93-9b36-2cb5396e58bd",
  "Smudge Brush": "21e3d117-1efc-4b9b-9822-b164a5ffe6e8",
};

/** Known run times (seconds) for uploaded videos, keyed by Bunny video GUID. Kept in sync by scripts/sync-bunny-durations.mjs. */
const DURATION_SECONDS: Record<string, number> = bunnyDurations;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function section(id: string, title: string, subjects: string[]): CurriculumSection {
  return {
    id,
    title,
    items: subjects.map((label) => {
      const bunnyVideoId = BUNNY_VIDEO_IDS[label];
      const seconds = bunnyVideoId ? DURATION_SECONDS[bunnyVideoId] : undefined;
      return {
        itemType: "video",
        label,
        initiallyWatched: false,
        bunnyVideoId,
        durationLabel: seconds !== undefined ? formatDuration(seconds) : undefined,
      };
    }),
  };
}

export const curriculum: Record<CurriculumLevel, CurriculumSection[]> = {
  "concept-art": [
    section("concept-art-tools", "What kinds of tools we use?", ["Hardwares", "Softwares"]),
    section("concept-art-photoshop", "Understand and use Adobe Photoshop", [
      "Interface and menus",
      "Layers",
      "Brushes",
      "Lasso tool and transforms",
      "Hue, saturation and luminosity",
      "Opacity and flow",
      "Masks",
      "Liquify, blur and filters",
      "Smudge Brush",
    ]),
    section("concept-art-drawing-fundamentals", "Understanding of drawing fundamentals", [
      "First sketches",
      "Basic forms and shapes",
      "Light and shadows",
      "General Anatomy",
      "Anatomy: Faces",
      "Anatomy: Hands",
      "Anatomy: Feet",
      "Animals anatomy",
    ]),
    section("concept-art-painting-skills", "Concept Art and painting skills", [
      "Thumbnails and sketching",
      "Filling the basic colors",
      "Painting the character",
    ]),
  ],
  "3d-modeling": [
    section("3d-fundamentals", "3D fundamentals", ["Polygons, triangles and topology"]),
    section("3d-maya-interface", "Understand and use Maya interface", [
      "Introduction to the Maya interface",
      "Modeling basics: Extrude, Bevel, Bridge etc...",
      "How to import references using image plane",
      "Modeling a Magic potion in 15 minutes",
      "Modeling a Burguer in 10 minutes",
      "Modeling a Car in 20 minutes",
      "Modeling a coffee mug 1 - Setup",
      "Modeling a coffee mug 2 - Base",
      "Modeling a coffee mug 3 - Handle",
      "Modeling a coffee mug 4 - Saucer",
      "Modeling an airplane 1 - Briefing",
      "Modeling an airplane 2 - Blocking the fuselage",
      "Modeling an airplane 3 - Modeling the seat",
      "Modeling an airplane 4 - Wings and propellers",
      "Modeling an airplane 5 - Details of wings",
      "Modeling an airplane 6 - Modeling the wheels",
      "Modeling an airplane 7 - Rudders and glass",
      "Modeling a Robot 1 - Briefing",
      "Modeling a Robot 2 - Chest and Head",
      "Modeling a Robot 3 - Limbs",
      "Modeling a Robot 4 - Right Arm",
      "Modeling a Robot 5 - Left Arm",
      "Modeling a Robot 6 - Legs",
      "How to solve N-Gons",
      "Exporting and importing .FBX",
    ]),
    section("3d-retopology", "Retopology", [
      "Introduction to Retopology",
      "How to use the quad-draw tool",
      "Retopology of a face",
      "Modeling Speed Task",
      "Modeling Tricks",
    ]),
  ],
};

export function buildCurriculumForLevel(level: CurriculumLevel): CurriculumSection[] {
  return curriculum[level] ?? curriculum["concept-art"];
}
