import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/require-admin";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";

/** Lists all user profiles with their progress (admin only). */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const snap = await adminDb().collection("users").orderBy("createdAt", "desc").get();
  const users: UserProfile[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email ?? "",
      displayName: data.displayName ?? "",
      role: data.role ?? "student",
      approved: data.approved ?? false,
      skillCategory: data.skillCategory,
      totalHours: data.totalHours ?? 0,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt,
    };
  });

  const summary = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    students: users.filter((u) => u.role === "student").length,
    totalHours: users.reduce((sum, u) => sum + (u.totalHours ?? 0), 0),
  };

  return NextResponse.json({ users, summary });
}
