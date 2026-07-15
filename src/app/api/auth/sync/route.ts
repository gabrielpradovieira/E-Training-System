import { type NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, getAdminEmail } from "@/lib/firebase/admin";
import { emailDocId, normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Called by the client right after any successful sign-in (email/password
 * or Google). It:
 *   1. Verifies the Firebase ID token server-side.
 *   2. Enforces the pre-approval gate for Google sign-ins (email/password
 *      users already passed it at registration). An unapproved account is
 *      deleted immediately.
 *   3. Keeps the tamper-proof `admin` custom claim in sync with ADMIN_EMAIL.
 *   4. Ensures a Firestore profile exists and updates lastLoginAt.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return NextResponse.json({ error: "Missing credentials." }, { status: 401 });
  }

  let authAdmin, db;
  try {
    authAdmin = adminAuth();
    db = adminDb();
  } catch {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const uid = decoded.uid;
  const email = normalizeEmail(decoded.email ?? "");
  const adminEmail = getAdminEmail();
  const isAdminEmail = adminEmail !== "" && email === adminEmail;

  const profileRef = db.collection("users").doc(uid);
  const profileSnap = await profileRef.get();

  // Enforce pre-approval for first-time (e.g. Google) sign-ins.
  if (!profileSnap.exists) {
    const allowlistRef = db.collection("allowlist").doc(emailDocId(email));
    const allowlistSnap = await allowlistRef.get();
    const approved = isAdminEmail || allowlistSnap.exists;

    if (!approved) {
      // Not pre-approved — undo the auth account created by the sign-in.
      await authAdmin.deleteUser(uid).catch(() => {});
      return NextResponse.json(
        { error: "This email is not approved to use the system. Contact your administrator." },
        { status: 403 },
      );
    }

    await profileRef.set({
      uid,
      email,
      displayName: decoded.name ?? allowlistSnap.get("displayName") ?? email.split("@")[0],
      role: isAdminEmail ? "admin" : "student",
      approved: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
    if (allowlistSnap.exists) {
      await allowlistRef.set({ registered: true }, { merge: true });
    }
  } else {
    await profileRef.set({ lastLoginAt: Date.now() }, { merge: true });
  }

  // Keep the admin custom claim in sync with ADMIN_EMAIL.
  const hasAdminClaim = decoded.admin === true;
  let needsRefresh = false;
  if (isAdminEmail && !hasAdminClaim) {
    await authAdmin.setCustomUserClaims(uid, { admin: true });
    await profileRef.set({ role: "admin" }, { merge: true });
    needsRefresh = true;
  } else if (!isAdminEmail && hasAdminClaim) {
    await authAdmin.setCustomUserClaims(uid, { admin: false });
    await profileRef.set({ role: "student" }, { merge: true });
    needsRefresh = true;
  }

  return NextResponse.json({ ok: true, admin: isAdminEmail, needsRefresh });
}
