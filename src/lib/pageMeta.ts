export type PageMeta = {
  title: string;
  icon: string;
  description: string;
};

export const pageMeta: Record<string, PageMeta> = {
  dashboard: {
    title: "Dashboard",
    icon: "/assets/icon-sidebar-dashboard.svg",
    description: "Welcome back, Ahmed Al Mansoori! Here's your overview.",
  },
  training: {
    title: "Training Structure",
    icon: "/assets/icon-sidebar-training.svg",
    description: "Continue your course curriculum and training progress.",
  },
  competences: {
    title: "Competences",
    icon: "/assets/icon-sidebar-competences.svg",
    description: "Track technical competence progress across the framework.",
  },
  documentation: {
    title: "Documentation",
    icon: "/assets/icon-sidebar-documentation.svg",
    description: "Access supporting references, guides, and course documents.",
  },
  tasks: {
    title: "Task Bank",
    icon: "/assets/icon-sidebar-taskbank.svg",
    description: "Review practice tasks, assignments, and submission work.",
  },
  marking: {
    title: "Marking Guide",
    icon: "/assets/icon-sidebar-marking.svg",
    description: "Check assessment criteria and performance expectations.",
  },
  profile: {
    title: "Profile",
    icon: "/assets/icon-sidebar-dashboard.svg",
    description: "View competitor registration and contact details.",
  },
  admin: {
    title: "Admin Panel",
    icon: "/assets/icon-sidebar-marking.svg",
    description: "Manage users, approved emails, and monitor overall progress.",
  },
};

export const navItems: { slug: string; label: string; icon: string }[] = [
  { slug: "dashboard", label: "Dashboard", icon: "/assets/icon-sidebar-dashboard.svg" },
  { slug: "training", label: "Training Structure", icon: "/assets/icon-sidebar-training.svg" },
  { slug: "competences", label: "Competences", icon: "/assets/icon-sidebar-competences.svg" },
  { slug: "documentation", label: "Documentation", icon: "/assets/icon-sidebar-documentation.svg" },
  { slug: "tasks", label: "Task Bank", icon: "/assets/icon-sidebar-taskbank.svg" },
  { slug: "marking", label: "Marking Guide", icon: "/assets/icon-sidebar-marking.svg" },
];
