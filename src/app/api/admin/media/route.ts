import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/require-admin";
import { guessMediaKind, toDirectSharePointUrl } from "@/lib/sharepoint";

export const runtime = "nodejs";

/** List media references (admin only). */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const snap = await adminDb().collection("media").orderBy("addedAt", "desc").get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ items });
}

/**
 * Add a media reference from a SharePoint/OneDrive share link. The link is
 * converted to a direct-embeddable URL before storing.
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  let body: { title?: string; shareUrl?: string; ownerUid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const shareUrl = (body.shareUrl ?? "").trim();
  if (!shareUrl) {
    return NextResponse.json({ error: "A SharePoint/OneDrive link is required." }, { status: 400 });
  }

  const directUrl = toDirectSharePointUrl(shareUrl);
  const ref = await adminDb().collection("media").add({
    title: (body.title ?? "").trim() || "Untitled",
    shareUrl,
    directUrl,
    kind: guessMediaKind(directUrl),
    ownerUid: body.ownerUid ?? null,
    addedBy: gate.decoded.email ?? gate.decoded.uid,
    addedAt: Date.now(),
  });

  return NextResponse.json({ ok: true, id: ref.id, directUrl });
}

/** Remove a media reference (admin only). */
export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await adminDb().collection("media").doc(id).delete();
  return NextResponse.json({ ok: true });
}
