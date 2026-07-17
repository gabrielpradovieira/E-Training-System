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
    title: "Training Material",
    icon: "/assets/icon-sidebar-training.svg",
    description: "Continue your training material and progress.",
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
    description: "Manage users and build the course.",
  },
  "admin/users": {
    title: "Users",
    icon: "/assets/icon-sidebar-marking.svg",
    description: "Manage approved emails, users, and monitor overall progress.",
  },
  "admin/course": {
    title: "Training Material",
    icon: "/assets/icon-sidebar-training.svg",
    description: "Build the training material: core competences, competence units, and videos.",
  },
};

/** Resolves the page meta for a path, including admin sub-pages. */
export function metaForPath(pathname: string): PageMeta {
  const segments = pathname.split("/").filter(Boolean);
  const twoLevel = segments.slice(0, 2).join("/");
  if (pageMeta[twoLevel]) return pageMeta[twoLevel];
  const slug = segments[0];
  return pageMeta[slug] ?? pageMeta.dashboard;
}

export const navItems: { slug: string; label: string; icon: string }[] = [
  { slug: "dashboard", label: "Dashboard", icon: "/assets/icon-sidebar-dashboard.svg" },
  { slug: "training", label: "Training Material", icon: "/assets/icon-sidebar-training.svg" },
  { slug: "competences", label: "Competences", icon: "/assets/icon-sidebar-competences.svg" },
  { slug: "documentation", label: "Documentation", icon: "/assets/icon-sidebar-documentation.svg" },
  { slug: "tasks", label: "Task Bank", icon: "/assets/icon-sidebar-taskbank.svg" },
  { slug: "marking", label: "Marking Guide", icon: "/assets/icon-sidebar-marking.svg" },
];
