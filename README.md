# E-Training System

A web-based training platform for students (ACTVET EmiratesSkills, skill #50 —
3D Digital Game Art). Built with **Next.js 16** (App Router, TypeScript,
Tailwind v4) and **Firebase** (Auth + Firestore), deployed on **Vercel**.

## Features

- **Dashboard, Training, Competences, Profile** — the full competitor dashboard
  (roadmap, monthly-hours charts, weekly schedule, data-driven curriculum with
  level tabs, accordions, lesson tracking, and the competence framework).
- **Firebase auth** — email/password + Google sign-in.
- **Pre-approved registration** — only emails an admin has approved can register
  and set a password. Enforced server-side via the Firebase Admin SDK.
- **Admin panel** — gated by `ADMIN_EMAIL` (via a tamper-proof custom claim):
  manage the approved-email allowlist, view all users and their progress, and a
  summary overview.
- **SharePoint media** — paste share links; they're converted to direct,
  embeddable URLs.

## Quick start

```bash
bun install
cp sample.env .env      # then fill in Firebase values (see SETUP.md)
bun run dev             # http://localhost:3000
```

Full instructions — Firebase console, env vars, security rules, admin
bootstrap, and Vercel deployment — are in **[SETUP.md](SETUP.md)**.

## Security

Access control is enforced by [`firestore.rules`](firestore.rules) and
server-side token verification, not by client-side checks. No secrets are stored
in the source: all configuration comes from environment variables (`.env` is
gitignored; `sample.env` is the committed template).

## Legacy

The original static-HTML prototype is archived under [`legacy/`](legacy/) and on
the `legacy-static` branch.
