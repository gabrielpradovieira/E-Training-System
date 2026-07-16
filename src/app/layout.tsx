import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// No next/font/google here on purpose: the dashboard defines its own font
// stack in legacy-dashboard.css, and fetching webfonts at build time made the
// build fail whenever the network was unavailable.

export const metadata: Metadata = {
  title: "E-Training System",
  description: "E-Training System dashboard for ACTVET EmiratesSkills competitors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
