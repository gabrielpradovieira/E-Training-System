export type CurriculumCategory = "concept-art" | "3d-modeling";

export type CurriculumVideoItem = {
  label: string;
  url?: string;
};

export type CurriculumSection = {
  title: string;
  sectionId: string;
  items: CurriculumVideoItem[];
};

export type CurriculumCategoryGroup = {
  category: CurriculumCategory;
  label: string;
  badge: string;
  sections: CurriculumSection[];
};

function section(category: CurriculumCategory, title: string, labels: string[]): CurriculumSection {
  const sectionId = `${category}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  return { title, sectionId, items: labels.map((label) => ({ label })) };
}

const FIRST_VIDEO_URL =
  "https://1drv.ms/v/c/d14666fc896f6975/IQQsGrxc1aGsRbq_S30-LFCEAf6PTNpzgBNJgdSM9daR8vY?width=1920&height=1080";

export const curriculum: CurriculumCategoryGroup[] = [
  {
    category: "concept-art",
    label: "Concept Art",
    badge: "Ps",
    sections: [
      (() => {
        const s = section("concept-art", "What kinds of tools we use?", ["Hardwares", "Softwares"]);
        s.items[0].url = FIRST_VIDEO_URL;
        return s;
      })(),
      section("concept-art", "Understand and use Adobe Photoshop", [
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
      section("concept-art", "Understanding of drawing fundamentals", [
        "First sketches",
        "Basic forms and shapes",
        "Light and shadows",
        "General Anatomy",
        "Anatomy: Faces",
        "Anatomy: Hands",
        "Anatomy: Feet",
        "Animals anatomy",
      ]),
      section("concept-art", "Concept Art and painting skills", [
        "Thumbnails and sketching",
        "Filling the basic colors",
        "Painting the character",
      ]),
    ],
  },
  {
    category: "3d-modeling",
    label: "3D Modeling",
    badge: "M",
    sections: [
      section("3d-modeling", "3D fundamentals", ["Polygons, triangles and topology"]),
      section("3d-modeling", "Understand and use Maya interface", [
        "Introduction to the Maya Interface",
        "Modeling basics: Extrude, Bevel, Bridge etc...",
        "How to import references using image plane",
        "Modeling a Magic potion in 15 minutes",
        "Modeling a Burguer in 10 minutes",
        "Modeling a Car in 20 minutes",
        "Modeling a coffee mug 1 - Setup",
        "Modeling a coffee mug 2 - Base",
        "Modeling a coffee mug 3 - Handle",
        "Modeling a coffee mug 4 - Saucer",
        "Modeling an airplane 1 - Setting the reference",
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
      section("3d-modeling", "Retopology", [
        "Introduction to Retopology",
        "How to use the quad-draw tool",
        "Retopology of a face",
        "Modeling Speed Task",
        "Modeling Tricks",
      ]),
    ],
  },
];
