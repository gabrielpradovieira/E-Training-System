import "server-only";

/**
 * App-only (application permission) Microsoft Graph access — server-side
 * only, never imported by client code. Unlike the delegated per-user flow in
 * src/lib/msgraph.ts, this authenticates as the registered Azure app itself
 * (client credentials flow), so it reads with the app's own tenant-wide
 * Graph permission instead of the signed-in student's personal permissions.
 *
 * This sidesteps the documented Microsoft Graph limitation where the
 * /shares/{id}/driveItem endpoint can't reliably resolve anonymous
 * "Anyone with the link" links for OneDrive for Business / SharePoint
 * without the calling user independently having access to the file.
 *
 * Requires env vars (server-only, NOT prefixed with NEXT_PUBLIC_):
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID
 * and an Azure app registration with the Application (not Delegated)
 * permission "Sites.Read.All", admin-consented.
 */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppOnlyAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(
      "Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID env vars.",
    );
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get app-only Graph token (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

function encodeShareUrl(shareUrl: string): string {
  const base64 = Buffer.from(shareUrl.trim(), "utf-8").toString("base64");
  const base64url = base64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  return `u!${base64url}`;
}

/** Resolves a share link to a playable, pre-authenticated download URL using an app-only token. */
export async function getPlayableVideoUrlFromShareLinkAppOnly(shareUrl: string): Promise<string> {
  const token = await getAppOnlyAccessToken();
  const shareId = encodeShareUrl(shareUrl);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem?$select=id,@microsoft.graph.downloadUrl`,
    { headers: { Authorization: `Bearer ${token}`, Prefer: "redeemSharingLinkIfNecessary" } },
  );
  if (!res.ok) {
    throw new Error(`Graph request failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const downloadUrl = data["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) throw new Error("Graph response was missing @microsoft.graph.downloadUrl.");
  return downloadUrl;
}
