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
};

export const navItems: { slug: string; label: string; icon: string }[] = [
  { slug: "training", label: "Training Material", icon: "/assets/icon-sidebar-training.svg" },
];
