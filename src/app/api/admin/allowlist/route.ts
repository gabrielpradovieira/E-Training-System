import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/require-admin";
import { emailDocId, isValidEmail, normalizeEmail } from "@/lib/email";
import type { AllowlistEntry } from "@/lib/types";

export const runtime = "nodejs";

/** List all pre-approved emails (admin only). */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const snap = await adminDb().collection("allowlist").orderBy("addedAt", "desc").get();
  const entries: AllowlistEntry[] = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      email: data.email ?? doc.id,
      displayName: data.displayName,
      addedBy: data.addedBy,
      addedAt: data.addedAt,
      registered: data.registered ?? false,
    };
  });
  return NextResponse.json({ entries });
}

/** Add an email to the allowlist (admin only). */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  let body: { email?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  await adminDb()
    .collection("allowlist")
    .doc(emailDocId(email))
    .set(
      {
        email,
        displayName: (body.displayName ?? "").trim() || null,
        addedBy: gate.decoded.email ?? gate.decoded.uid,
        addedAt: Date.now(),
        registered: false,
      },
      { merge: true },
    );

  return NextResponse.json({ ok: true });
}

/** Remove an email from the allowlist (admin only). */
export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const email = normalizeEmail(new URL(request.url).searchParams.get("email") ?? "");
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  await adminDb().collection("allowlist").doc(emailDocId(email)).delete();
  return NextResponse.json({ ok: true });
}
