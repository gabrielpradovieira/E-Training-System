# E-Training System — Setup & Deployment

A Next.js 16 (App Router, TypeScript, Tailwind v4) app with Firebase Auth +
Firestore, deployed on Vercel. This is a **client-only** app — there is no
server code or service-account key. Access control is enforced entirely by
Firestore security rules.

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

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Project settings → General → SDK setup |

These are public identifiers, not secrets. The admin email is **not** here — it
lives only in `firestore.rules`. Access control is enforced entirely by the
rules.

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
   (all environments). They're all `NEXT_PUBLIC_*`, no secrets.
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
  components/         AppShell, AuthGuard, MediaEmbed, dashboard pieces
  lib/                firebase/client, auth-context, data (Firestore access),
                      curriculum, sharepoint, types, helpers
  styles/             legacy-dashboard.css (ported verbatim), auth.css, admin.css
legacy/               the original static prototype (archived)
firestore.rules       Firestore security rules (the enforcement layer +
                      the admin email)
sample.env            env template (committed); copy to .env (gitignored)
```
