# E-Training System

A web-based training platform for students (ACTVET EmiratesSkills, skill #50 —
3D Digital Game Art). Built with **Next.js 16** (App Router, TypeScript,
Tailwind v4) and **Firebase** (Auth + Firestore), deployed on **Vercel**.

## Features

- **Dashboard, Training, Competences, Profile** — the full competitor dashboard
  (roadmap, monthly-hours charts, weekly schedule, data-driven curriculum with
  level tabs, accordions, lesson tracking, and the competence framework).
- **Firebase auth** — email/password + Google sign-in.
- **Pre-approved registration** — only emails an admin has approved can create a
  usable account. Enforced by Firestore security rules; unapproved accounts are
  removed at registration and can access nothing.
- **Admin panel** — gated by the admin email defined only in `firestore.rules`
  (the client detects admin by capability, so the email never ships to the
  browser): manage the approved-email allowlist, view all users and their
  progress, and a summary overview.
- **Training videos via SharePoint/OneDrive** — admins paste a share link;
  the server resolves it to a playable URL via an app-only Microsoft Graph
  credential (see [SETUP.md](SETUP.md)), since SharePoint's own viewer can't
  be embedded for a signed-out visitor.

## Quick start

```bash
bun install
cp sample.env .env      # then fill in Firebase values (see SETUP.md)
bun run dev             # http://localhost:3000
```

Full instructions — Firebase console, env vars, security rules, admin
bootstrap, and Vercel deployment — are in **[SETUP.md](SETUP.md)**.

## Security

Access control is enforced by [`firestore.rules`](firestore.rules) — a user can
read/write only their own profile, and only if their email is on the
admin-managed allowlist (or is the admin). Almost all configuration is public
`NEXT_PUBLIC_*` identifiers (`.env` is gitignored; `sample.env` is the
committed template). The one real secret is `MICROSOFT_CLIENT_SECRET`, used
only by the single server route that resolves training-video links — it never
reaches the browser.

## Legacy

The original static-HTML prototype is archived under [`legacy/`](legacy/) and on
the `legacy-static` branch.
