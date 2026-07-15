import "@/styles/legacy-dashboard.css";
import "@/styles/auth.css";
import AppShell from "@/components/dashboard/AppShell";
import AuthGuard from "@/components/dashboard/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
