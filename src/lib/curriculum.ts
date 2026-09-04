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
  // Adobe Photoshop
  "Interface and menus": "d1be0994-c182-405d-807b-c9d544913183",
  "Layers": "27c6f42e-71d2-46df-9840-535e7d3c9c9c",
  "Brushes": "551bffda-93a5-4fd1-ac6b-3d40d8232dba",
  "Lasso tool and transforms": "9b8e7f93-3abc-46d2-9991-515934717b77",
  "Hue, saturation and luminosity": "fbec2524-44b2-4456-b353-cf1285ccd5f8",
  "Opacity and flow": "eca195a1-8e4b-4a95-a113-8094fef0de18",
  "Masks": "5ce74dc6-75b5-49ec-9413-bbe871830650",
  "Liquify, blur and filters": "ef41a179-7b45-4c93-9b36-2cb5396e58bd",
  "Smudge Brush": "21e3d117-1efc-4b9b-9822-b164a5ffe6e8",

  // Drawing fundamentals
  "First sketches": "baba3997-f7ed-4ad2-80ba-e2fd3252be8e",
  "Basic forms and shapes": "f7aac15b-c831-4ca2-858c-b87bc4d6ecb5",
  "Light and shadows": "28ee82a0-6b4f-44d9-9dc2-93b2fabb25fb",
  // Uploaded as "15 Anatomy basics.mp4" — matched to this lesson by content, not an exact title match.
  "General Anatomy": "9e88185a-381d-4a11-b1d4-c2bbaf261535",
  "Anatomy: Faces": "88d5a975-ed0b-4d81-8b10-5664973800be",
  "Anatomy: Hands": "92137e09-e8f7-4211-80e6-f11f03bc3790",
  "Anatomy: Feet": "217da5fd-c75c-44c2-b2b0-8e15b228826b",
  "Animals anatomy": "3c972f5c-97a8-46d7-a840-b224cd120486",

  // 3D fundamentals
  // Uploaded as "26 what is 3d modelling.mp4" — confirmed match.
  "Polygons, triangles and topology": "01dd2253-0dee-4fc4-ab59-128233880b74",

  // Maya interface
  "Introduction to the Maya interface": "bc572ac9-234f-4311-b133-01260e8ae5f5",
  // Uploaded as "02 Modelling Basic Tools" — matched to this lesson by content, not an exact title match.
  "Modeling basics: Extrude, Bevel, Bridge etc...": "10e64ef1-b80d-43ea-9caa-58a0c7f638d7",
  "How to import references using image plane": "2caaa11b-c420-4df3-947c-cdfd069fb26d",
  "Modeling a Magic potion in 15 minutes": "c242a128-5782-48f5-af40-7decbbf51885",
  "Modeling a Burguer in 10 minutes": "bde16cca-1880-461c-b124-a1d1f125c1dd",
  "Modeling a Car in 20 minutes": "b51bef58-6007-4bc2-be26-5a010eae4098",
  "Modeling a coffee mug 1 - Setup": "e9e961f8-0ead-4f8a-b959-98b4c00fbc7d",
  "Modeling a coffee mug 2 - Base": "29ce0151-5d0a-4129-b4ea-2aa263ee5dd4",
  "Modeling a coffee mug 3 - Handle": "27318628-52bf-419f-a6e7-e303c1e32a2d",
  "Modeling a coffee mug 4 - Saucer": "f208140a-d0ad-4bd2-83eb-5a2e61bc3688",
  // Uploaded as "1 Settting up the references.mp4" — matched to this lesson by content, not an exact title match.
  "Modeling an airplane 1 - Briefing": "0500243d-820a-46eb-9617-d089966d8c54",
  "Modeling an airplane 2 - Blocking the fuselage": "3e4ae169-d097-4539-8510-a4a46f5494d7",
  "Modeling an airplane 3 - Modeling the seat": "220f43e4-6f46-4123-b7d3-bc86bd1e2d2c",
  "Modeling an airplane 4 - Wings and propellers": "8df774dd-fc1e-4cf5-a52f-cc71a1adb419",
  "Modeling an airplane 5 - Details of wings": "925ceefc-7f91-42b4-91f0-5dd1927f32b8",
  "Modeling an airplane 6 - Modeling the wheels": "9ab3e9f8-8828-426e-a8ef-11e335527a44",
  // Uploaded as "7 Finishing the airplane.mp4" — matched to this lesson by content, not an exact title match.
  "Modeling an airplane 7 - Rudders and glass": "06f1d356-885f-46af-99fa-2fa07401a2df",
  "Modeling a Robot 1 - Briefing": "227a5d49-f301-48b5-a633-a4c2efc63d7e",
  "How to solve N-Gons": "d71fe43d-bb93-4696-bae3-f844d330452d",
  // Uploaded as "8 - clean up and export the fbx.mp4" — matched to this lesson by content, not an exact title match.
  "Exporting and importing .FBX": "81d3a56e-1a20-4ca5-8236-6ff29dd554b1",

  // Retopology
  "Introduction to Retopology": "31ac54eb-74a6-469e-8674-57dadf487b46",
  "How to use the quad-draw tool": "8b18f3ed-eadd-4e31-99d1-78fcfda5d127",
  "Retopology of a face": "b213c58b-3513-4c31-a254-0006e4357da8",
  "Modeling Speed Task": "ac57ff5c-58d0-4776-b6c5-b51b97cf8796",
  "Modeling Tricks": "0dce524b-0bb6-4e20-83ce-2ea26ab63fcb",
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

/** Total lesson count across every level, for an overall completion percentage. */
export function countAllLessons(): number {
  return (Object.keys(curriculum) as CurriculumLevel[]).reduce(
    (total, level) => total + curriculum[level].reduce((sum, section) => sum + section.items.length, 0),
    0,
  );
}
