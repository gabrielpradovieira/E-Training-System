import { NextResponse, type NextRequest } from "next/server";
import { getPlayableVideoUrlFromShareLinkAppOnly } from "@/lib/msgraph-server";

export const runtime = "nodejs";

/**
 * Resolves a SharePoint/OneDrive share link to a direct, pre-authenticated
 * download URL using an app-only Microsoft Graph credential (see
 * src/lib/msgraph-server.ts) — so the training page can play the video with
 * a plain <video> element instead of iframing SharePoint's own viewer, which
 * cannot render for a signed-out viewer (Microsoft's login page refuses to
 * be framed).
 *
 * This is the one server route in an otherwise client-only app; the app-only
 * client secret it depends on never reaches the browser. It is not gated
 * per-user — anyone who can reach this endpoint with a share link can
 * resolve it, same as anyone who already holds that link could open it
 * directly in SharePoint. It does not proxy arbitrary URLs: only strings
 * that parse as a SharePoint/OneDrive host are accepted.
 */
export async function POST(request: NextRequest) {
  let body: { shareUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const shareUrl = (body.shareUrl ?? "").trim();
  if (!shareUrl) {
    return NextResponse.json({ error: "shareUrl is required." }, { status: 400 });
  }

  let host: string;
  try {
    host = new URL(shareUrl).hostname.toLowerCase();
  } catch {
    return NextResponse.json({ error: "shareUrl is not a valid URL." }, { status: 400 });
  }
  if (!host.endsWith(".sharepoint.com") && !host.endsWith("1drv.ms")) {
    return NextResponse.json({ error: "Only SharePoint/OneDrive links can be resolved." }, { status: 400 });
  }

  try {
    const url = await getPlayableVideoUrlFromShareLinkAppOnly(shareUrl);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve the video link.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
