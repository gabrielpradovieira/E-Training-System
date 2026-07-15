import { type NextRequest, NextResponse } from "next/server";
import { FirebaseError } from "firebase-admin/app";
import { adminAuth, adminDb, getAdminEmail } from "@/lib/firebase/admin";
import { emailDocId, isValidEmail, normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

type RegisterBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

/**
 * Pre-approved registration.
 *
 * Open client-side sign-up is intentionally NOT used. Accounts are only
 * created here, on the server, after verifying the email is on the
 * admin-managed Firestore allowlist. The Admin SDK bypasses Firestore
 * rules, so this check is authoritative.
 */
export async function POST(request: NextRequest) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const displayName = (body.displayName ?? "").trim();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const adminEmail = getAdminEmail();
  const isAdminEmail = adminEmail !== "" && email === adminEmail;

  let db, authAdmin;
  try {
    db = adminDb();
    authAdmin = adminAuth();
  } catch {
    return NextResponse.json(
      { error: "Server is not configured for registration yet. Contact your administrator." },
      { status: 500 },
    );
  }

  // 1. Verify the email is pre-approved (admin email is always allowed, to bootstrap).
  const allowlistRef = db.collection("allowlist").doc(emailDocId(email));
  const allowlistSnap = await allowlistRef.get();

  if (!isAdminEmail && !allowlistSnap.exists) {
    return NextResponse.json(
      { error: "This email is not approved for registration. Please contact your administrator." },
      { status: 403 },
    );
  }

  // 2. Reject if an account already exists.
  try {
    await authAdmin.getUserByEmail(email);
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in instead." },
      { status: 409 },
    );
  } catch (err) {
    if (!(err instanceof FirebaseError) || err.code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Could not verify account status." }, { status: 500 });
    }
    // user-not-found is the expected happy path — continue.
  }

  // 3. Create the account.
  let uid: string;
  try {
    const displayNameFinal =
      displayName || allowlistSnap.get("displayName") || email.split("@")[0];
    const created = await authAdmin.createUser({
      email,
      password,
      displayName: displayNameFinal,
    });
    uid = created.uid;

    // Admin gets the tamper-proof custom claim immediately.
    if (isAdminEmail) {
      await authAdmin.setCustomUserClaims(uid, { admin: true });
    }

    // 4. Seed the Firestore profile (server-side; client cannot create these).
    await db.collection("users").doc(uid).set({
      uid,
      email,
      displayName: displayNameFinal,
      role: isAdminEmail ? "admin" : "student",
      approved: true,
      createdAt: Date.now(),
    });

    // 5. Mark the allowlist entry as used.
    if (allowlistSnap.exists) {
      await allowlistRef.set({ registered: true, registeredAt: Date.now() }, { merge: true });
    }
  } catch (err) {
    const message =
      err instanceof FirebaseError && err.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : "Could not create the account. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, uid });
}
