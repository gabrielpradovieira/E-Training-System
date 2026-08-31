export type CurriculumLevel = "foundation" | "intermediate" | "advanced";

export const curriculumLevels: Record<CurriculumLevel, number[]> = {
  foundation: [1],
  intermediate: [2],
  advanced: [3, 4, 5, 6, 7],
};

export const coreCompetences: Record<number, string> = {
  1: "Create 2D original designs for game assets and apply 3D modeling techniques to create models with optimization and efficiency.",
  2: "Produce advanced concept art for character and assets, develop UV Mapping and Texturing workflows to generate PBR-Maps by baking high-poly meshes.",
  3: "Optimize use of UV mapping, apply advanced texturing masking and build rigging systems with FK/IK to create keyframes for animation.",
  4: "Apply principles of animation to characters and assets and create beauty shots using Unreal Engine.",
  5: "Program basic playable demos using blueprints and apply stress-tests to identify mesh, texture and animation errors.",
  6: "Design strong creative and original concept art, optimize game art workflows by implementing tricks and shortcuts in both modeling and animation.",
  7: "Deliver advanced high-quality 3D animations with solid pipeline for full generalist game art production including game engine programming.",
};

export type CompetenceUnit = { cu: number; core: number; title: string };

export const competenceUnits: CompetenceUnit[] = [
  { cu: 1, core: 1, title: "Understand fundamentals of drawing and sketching using Adobe Photoshop tools and brushes" },
  { cu: 2, core: 1, title: "Design a final render composition with colors, lighting, and mood" },
  { cu: 3, core: 1, title: "Model 3D assets and props using Autodesk Maya tools" },
  { cu: 4, core: 1, title: "Optimize and clean-up meshes to ensure efficient topology and performance" },
  { cu: 5, core: 1, title: "Design a variety of hard-surface models such as props, vehicles, and mechanical assets" },
  { cu: 6, core: 2, title: "Sculpt organic characters and environment assets using Maxon ZBrush sculpting tools" },
  { cu: 7, core: 2, title: "Learn retopology techniques for both hard-surface and organic 3D assets" },
  { cu: 8, core: 2, title: "Unwrap and organize UV maps efficiently using Autodesk Maya tools" },
  { cu: 9, core: 2, title: "Create physically based rendering (PBR) textures using Substance Painter" },
  { cu: 10, core: 2, title: "Bake high-poly details and normal maps for game-ready assets" },
  { cu: 11, core: 3, title: "Optimize the use of UV space and apply mirroring for efficiency" },
  { cu: 12, core: 3, title: "Use smart masks and anchor points to add realistic texture details" },
  { cu: 13, core: 3, title: "Set up FK and IK systems for character and asset rigging in Maya" },
  { cu: 14, core: 3, title: "Apply skin weights and deformers for advanced character rigging" },
  { cu: 15, core: 3, title: "Create keyframes to build animations for characters and objects" },
  { cu: 16, core: 4, title: "Apply the 12 principles of animation to improve motion quality" },
  { cu: 17, core: 4, title: "Create seamless animation loops and repeating motion cycles" },
  { cu: 18, core: 4, title: "Animate organic characters and hard-surface vehicles for gameplay" },
  { cu: 19, core: 4, title: "Import and organize 3D assets inside Unreal Engine 5" },
  { cu: 20, core: 4, title: "Produce beauty shots using lighting, cameras, and rendering tools" },
  { cu: 21, core: 5, title: "Apply basic UI and UX principles to simulate interactive gameplay" },
  { cu: 22, core: 5, title: "Run stress tests to identify model, UV, and deformation errors" },
  { cu: 23, core: 5, title: "Program gameplay logic and interactions using Unreal Engine Blueprints" },
  { cu: 24, core: 5, title: "Develop a playable demo scene using Unreal Engine 5" },
  { cu: 25, core: 5, title: "Plan strategic solutions for ad-hoc requests and unexpected challenges" },
  { cu: 26, core: 6, title: "Develop strong creativity and originality for concept development" },
  { cu: 27, core: 6, title: "Master the topology flow across different types of surfaces" },
  { cu: 28, core: 6, title: "Develop efficient shortcuts and workflows for faster 3D modelling" },
  { cu: 29, core: 6, title: "Apply advanced concept art and digital painting techniques" },
  { cu: 30, core: 6, title: "Execute advanced animation workflows for complex sequences" },
  { cu: 31, core: 7, title: "Perform advanced rigging tasks with speed and accuracy" },
  { cu: 32, core: 7, title: "Apply advanced modelling and texturing workflows for production assets" },
  { cu: 33, core: 7, title: "Develop solid workflow across softwares for accurate execution of multiple tasks" },
];

export type CurriculumItemType = "video";

export type CurriculumLessonItem = {
  itemType: CurriculumItemType;
  label: string;
  meta: string;
  initiallyWatched: boolean;
};

export type CurriculumUnitEntry = {
  cu: number;
  core: number;
  title: string;
  topicId: string;
  items: CurriculumLessonItem[];
};

export type CurriculumCoreGroup = {
  core: number;
  description: string;
  units: CurriculumUnitEntry[];
};

/** Mirrors the legacy renderCompetenceUnitCurriculum() logic for a given level. */
export function buildCurriculumForLevel(level: CurriculumLevel): CurriculumCoreGroup[] {
  const activeCores = curriculumLevels[level] ?? curriculumLevels.foundation;
  const visibleUnits = competenceUnits.filter((unit) => activeCores.includes(unit.core));

  const groups: CurriculumCoreGroup[] = [];
  let lastCore: number | null = null;

  visibleUnits.forEach((unit) => {
    if (unit.core !== lastCore) {
      groups.push({ core: unit.core, description: coreCompetences[unit.core], units: [] });
      lastCore = unit.core;
    }

    const watched = unit.cu <= 5;
    const items: CurriculumLessonItem[] = [
      { itemType: "video", label: "Overview and objectives", meta: "5 min", initiallyWatched: watched },
      { itemType: "video", label: "Tool workflow tutorial", meta: "12 min", initiallyWatched: watched },
      { itemType: "video", label: "Practice walkthrough", meta: "19 min", initiallyWatched: watched },
    ];

    groups[groups.length - 1].units.push({
      cu: unit.cu,
      core: unit.core,
      title: unit.title,
      topicId: `course-cu-${unit.cu}`,
      items,
    });
  });

  return groups;
}
