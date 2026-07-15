/**
 * SharePoint / OneDrive media links.
 *
 * A raw "share" link (…/:i:/g/personal/…/Ecabc?e=xxxx) opens SharePoint's
 * web viewer, NOT the file itself — so it can't be used directly in <img>
 * or <video> src. Appending `download=1` makes SharePoint return the raw
 * bytes, which DOES work as a direct media source.
 *
 * Paste the normal "Copy link" URL from SharePoint/OneDrive; this converts
 * it to a direct, embeddable URL.
 */
export function toDirectSharePointUrl(shareUrl: string): string {
  const trimmed = shareUrl.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const isSharePoint = host.endsWith("sharepoint.com") || host.endsWith("1drv.ms") || host.includes("onedrive");

    if (!isSharePoint) return trimmed; // Non-SharePoint (e.g. direct CDN) — leave as-is.

    // Already a direct-download link.
    if (url.searchParams.get("download") === "1") return trimmed;

    url.searchParams.set("download", "1");
    return url.toString();
  } catch {
    // Not a parseable URL — return unchanged so the caller can validate.
    return trimmed;
  }
}

export type MediaKind = "image" | "video" | "model" | "other";

/** Best-effort guess of media kind from a URL's file extension. */
export function guessMediaKind(url: string): MediaKind {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(clean)) return "video";
  if (/\.(glb|gltf)$/.test(clean)) return "model";
  return "other";
}
