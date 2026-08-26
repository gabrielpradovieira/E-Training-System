# E-Training System — Setup & Deployment

A Next.js 16 (App Router, TypeScript, Tailwind v4) app with Firebase Auth +
Firestore, deployed on Vercel. Access control (who can register, who is
admin, who can read/write what) is enforced entirely by Firestore security
rules — there is no Firebase Admin SDK and no service-account key.

The one exception is **training video playback**: SharePoint's own viewer
can't be embedded for a signed-out visitor (Microsoft's login page refuses to
render inside a frame), so there is exactly one small server route,
`/api/resolve-video`, that resolves a video's SharePoint share link to a
direct URL using an app-only Microsoft Graph credential. That credential is a
real secret and lives server-only (see "Microsoft Graph" below) — it never
reaches the browser.

- **Approved emails** (an admin-managed allowlist) can register/use the app.
  An unapproved person can create an auth account, but the rules let them read
  or write nothing, and the registration flow deletes the account immediately.
- The **admin** is one email, set **only** in `firestore.rules`
  (`adminEmail()`). The app never ships the admin email to the browser — it
  detects admin status by capability (whether you can read the admin-only
  allowlist).

Package manager: **Bun**.

---

## 1. Firebase Console setup (one-time)

Project: **e-training-system** (already created).

1. **Authentication → Sign-in method** — enable:
   - **Email/Password**
   - **Google**
2. **Authentication → Settings → Authorized domains** — add:
   - `localhost` (already there)
   - your Vercel domain, e.g. `e-training-system.vercel.app`
   - (later) any custom domain
3. **Firestore Database → Create database** — start in **production mode**,
   pick a region (e.g. `eur3` / `nam5`).

### Set the admin email + deploy the security rules

The real access control lives in [`firestore.rules`](firestore.rules) — it is
also where the admin email is enforced.

1. Open `firestore.rules` and change the `adminEmail()` line from
   `admin@example.com` to your admin's email.
2. Deploy the rules:

   ```bash
   bunx firebase-tools login
   bunx firebase-tools deploy --only firestore:rules --project e-training-system
   ```

   (Or paste the contents of `firestore.rules` into **Firestore → Rules → Publish**.)

---

## 2. Environment variables

Copy the template and fill it in:

```bash
cp sample.env .env
```

`.env` is gitignored — **never commit it**. Values:

| Variable | Where it comes from | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Project settings → General → SDK setup | No — public identifier |
| `NEXT_PUBLIC_MICROSOFT_TENANT_ID` | Azure Portal → Entra ID → Overview (optional) | No — public identifier |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_TENANT_ID` | Azure app registration → Overview | No — public identifier |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration → Certificates & secrets | **Yes — real secret** |

The admin email is **not** an env var — it lives only in `firestore.rules`.
`MICROSOFT_CLIENT_SECRET` is the only real secret in this app; see
"Microsoft Graph" below for how to get it.

> **Security model:** access is enforced server-side by Firestore rules. A user
> can read/write only their own profile, and only if their email is on the
> allowlist (or is the admin). The admin email lives **only** in
> `firestore.rules` (`adminEmail()`); the app detects admin status by capability
> (whether the signed-in user can read the admin-only allowlist), so the email
> never ships to the browser.

---

## 3. Run locally

```bash
bun install
bun run dev
```

Open http://localhost:3000. You'll be redirected to `/login`.

### Bootstrap the admin

1. Set your email in `firestore.rules` (`adminEmail()`), then deploy the rules
   (step 1).
2. Go to `/register`, register with that same email, and set a password. (The
   admin is always allowed by the rules, even without being on the allowlist.)
3. Sign in. The **Admin Panel** link appears in the sidebar.

### Invite students

In the Admin Panel → **Approved emails**, add each student's email. They can
then `/register` with that email and set their own password. Emails not on the
list can't create a usable account — registration deletes the account, and the
rules block all data access for anyone not approved.

---

## 4. Microsoft Graph (required for training videos to play)

Admins paste a SharePoint/OneDrive share link (or the "Embed" dialog's
`<iframe>` code — either works, see
[`src/lib/sharepoint.ts`](src/lib/sharepoint.ts)) as each video's link in
Admin → Training Material. **Do not iframe that link directly** — a signed-out
viewer hits SharePoint's login page, which refuses to render inside a frame,
so the video never appears. Instead, the app calls
[`/api/resolve-video`](src/app/api/resolve-video/route.ts), which uses an
**app-only** Microsoft Graph credential (server-side only) to resolve the
share link to a direct, pre-authenticated download URL, then plays that in a
plain `<video>` element.

### One-time Azure app registration

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration.**
   Any name; default (single tenant) account type is fine.
2. **API permissions → Add a permission → Microsoft Graph → Application
   permissions** (not Delegated) → search **`Sites.Read.All`** → Add permissions.
3. Still on API permissions, click **Grant admin consent for \<tenant\>** —
   this requires a Global/Application Administrator in your Entra tenant.
4. **Certificates & secrets → Client secrets → New client secret.** Copy the
   **Value** immediately (it's shown once) — that's `MICROSOFT_CLIENT_SECRET`.
5. On the **Overview** page, copy **Application (client) ID** →
   `MICROSOFT_CLIENT_ID`, and **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`.
6. Put all three in `.env` (locally) and in Vercel's environment variables
   (deployed) — never commit them.

Until these are set, video playback fails with a clear
"Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID"
error rather than a silent blank player.

Each video's share link must have sharing enabled for at least
"People in your organization with the link" (or "Anyone with the link") —
`Sites.Read.All` lets the app read it regardless of who's signed in, but the
file's own sharing setting still has to allow that link to resolve at all.

---

## 5. Deploy to Vercel

1. Push to GitHub (branch `main`).
2. In Vercel: **New Project → import** `gabrielpradovieira/E-Training-System`.
   Framework preset **Next.js** is auto-detected. Build command `bun run build`,
   install command `bun install`.
3. **Settings → Environment Variables** — add every variable from your `.env`
   (all environments), including `MICROSOFT_CLIENT_SECRET`. Vercel encrypts
   environment variables and never exposes non-`NEXT_PUBLIC_` ones to the
   browser bundle.
4. Deploy. Then add the Vercel domain to Firebase **Authorized domains** (step 1.2).

Every push to `main` redeploys automatically.

---

## Project layout

```
src/
  app/
    (app)/            authenticated app — dashboard, training, competences,
                      profile, admin, + coming-soon stubs (shared shell)
    (auth)/           login + register (public)
    api/resolve-video/  the one server route — resolves a SharePoint share
                      link to a playable URL via app-only Graph
  components/         AppShell, AuthGuard, dashboard pieces
  lib/                firebase/client, auth-context, data + course-data
                      (Firestore access), curriculum, sharepoint, msgraph-server
                      (server-only Graph credential), types, helpers
  styles/             legacy-dashboard.css (ported verbatim), auth.css,
                      admin.css, curriculum-builder.css, training-admin.css
legacy/               the original static prototype (archived)
firestore.rules       Firestore security rules (the enforcement layer +
                      the admin email)
sample.env            env template (committed); copy to .env (gitignored)
```
