/**
 * Accepts either a bare URL or a full `<iframe …>` embed snippet (what
 * SharePoint/OneDrive "Copy embed code" produces) and returns just the URL —
 * the raw SharePoint share link, fed into the Graph app-only resolver
 * (src/lib/msgraph-server.ts) to get a directly playable video URL.
 */
export function extractEmbedSrc(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return match ? match[1] : trimmed;
}
