# E-Training System — Setup & Deployment

A Next.js 16 (App Router, TypeScript, Tailwind v4) app with Firebase Auth +
Firestore, deployed on Vercel. Registration is limited to **pre-approved
emails**, and an **admin** (set by `ADMIN_EMAIL`) manages users and content.

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
4. **Project settings → Service accounts → Generate new private key** —
   download the JSON. You'll paste three values from it into the env (below).

### Deploy the security rules

The real access control lives in [`firestore.rules`](firestore.rules). Deploy it:

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
| `NEXT_PUBLIC_FIREBASE_*` | Project settings → General → SDK setup | No (public by design) |
| `ADMIN_EMAIL` | The email that should own the admin panel | No, but keep it right |
| `FIREBASE_ADMIN_PROJECT_ID` | service-account JSON → `project_id` | — |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | service-account JSON → `client_email` | **Yes** |
| `FIREBASE_ADMIN_PRIVATE_KEY` | service-account JSON → `private_key` | **Yes** |

The private key must be one line with literal `\n` for newlines, wrapped in
double quotes, e.g. `"-----BEGIN PRIVATE KEY-----\nMII…\n-----END PRIVATE KEY-----\n"`.

> **Security model:** admin rights come from a tamper-proof Firebase *custom
> claim* that the server sets only for `ADMIN_EMAIL`. The Firestore rules trust
> that claim, not any value sent from the browser. No secrets live in the app
> code — everything comes from env.

---

## 3. Run locally

```bash
bun install
bun run dev
```

Open http://localhost:3000. You'll be redirected to `/login`.

### Bootstrap the admin

1. Set `ADMIN_EMAIL` in `.env` to your email.
2. Go to `/register`, register with that same email (the admin email is always
   allowed to register), and set a password.
3. Sign in. The server grants the admin claim on first sign-in, and the
   **Admin Panel** link appears in the sidebar.

### Invite students

In the Admin Panel → **Approved emails**, add each student's email. They can
then `/register` with that email and set their own password. Emails not on the
list are rejected at registration (and unapproved Google sign-ins are removed
server-side).

---

## 4. Media (SharePoint / OneDrive)

Paste a normal "Copy link" URL from SharePoint/OneDrive when adding media. A raw
share link opens SharePoint's *viewer* and can't be embedded, so the app
converts it to a direct URL (appends `download=1`) — see
[`src/lib/sharepoint.ts`](src/lib/sharepoint.ts). For links to render:

- Set the share scope so approved viewers can open it (e.g. "People in your
  organization with the link").
- Images and videos embed directly via `MediaEmbed`.

For fully programmatic access (listing/uploading from the app), a future
upgrade is Microsoft Graph with an Azure AD app registration.

---

## 5. Deploy to Vercel

1. Push to GitHub (branch `main`).
2. In Vercel: **New Project → import** `gabrielpradovieira/E-Training-System`.
   Framework preset **Next.js** is auto-detected. Build command `bun run build`,
   install command `bun install`.
3. **Settings → Environment Variables** — add every variable from your `.env`
   (all environments). Keep `FIREBASE_ADMIN_PRIVATE_KEY` exactly as in `.env`.
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
    api/
      register/       pre-approved registration (Admin SDK)
      auth/sync/      post-login approval + admin-claim sync
      admin/          users, allowlist, media (admin-only)
  components/         AppShell, AuthGuard, MediaEmbed, dashboard pieces
  lib/                firebase (client/admin), auth-context, curriculum,
                      sharepoint, types, helpers
  styles/             legacy-dashboard.css (ported verbatim), auth.css, admin.css
legacy/               the original static prototype (archived)
firestore.rules       Firestore security rules (the enforcement layer)
sample.env            env template (committed); copy to .env (gitignored)
```
