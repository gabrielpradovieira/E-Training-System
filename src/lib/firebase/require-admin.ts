import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

type AdminOk = { ok: true; decoded: DecodedIdToken };
type AdminFail = { ok: false; response: NextResponse };

/**
 * Verifies the request carries a valid Firebase ID token whose tamper-proof
 * `admin` custom claim is true. This is the authoritative server-side admin
 * gate — client UI checks are only cosmetic.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminOk | AdminFail> {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid session." }, { status: 401 }) };
  }

  if (decoded.admin !== true) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { ok: true, decoded };
}
