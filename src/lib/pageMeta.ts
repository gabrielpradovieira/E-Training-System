export type PageMeta = {
  title: string;
  icon: string;
  description: string;
};

export const pageMeta: Record<string, PageMeta> = {
  training: {
    title: "Training Material",
    icon: "/assets/icon-sidebar-training.svg",
    description: "Continue your course curriculum and training progress.",
  },
  profile: {
    title: "Profile",
    icon: "/assets/icon-sidebar-dashboard.svg",
    description: "View competitor registration and contact details.",
  },
  students: {
    title: "Manage Students",
    icon: "/assets/icon-sidebar-marking.svg",
    description: "Add students individually or in bulk via CSV.",
  },
  progress: {
    title: "Students Progress",
    icon: "/assets/icon-sidebar-dashboard.svg",
    description: "Track completion and video progress across your students.",
  },
  admin: {
    title: "Manage Teachers",
    icon: "/assets/icon-sidebar-marking.svg",
    description: "Add teacher accounts for the training system.",
  },
};

export const navItems: { slug: string; label: string; icon: string }[] = [
  { slug: "training", label: "Training Material", icon: "/assets/icon-sidebar-training.svg" },
];
