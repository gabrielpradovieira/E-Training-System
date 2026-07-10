# E-Training System

A web-based training dashboard for tracking student competences, training hours, task banks, marking, and documentation — built for use with students.

## Contents

- **`index.html`** — the main single-page application (dashboard UI).
- **`assets/`** — logos, icons, and fonts used by the dashboard.
- **`database/`** — SQLite persistence layer:
  - `schema.sql` — initial table definitions.
  - `database_manager.py` — small Python manager for initializing and summarizing the database.

## Getting started

Open `index.html` in a browser. Keep the `assets/` folder beside it.

### SQLite persistence

The prototype includes a small SQLite manager in `database/database_manager.py`:

```bash
python database/database_manager.py init      # create the database and tables
python database/database_manager.py summary   # print a summary
```

The database file is created at `database/dashboard.sqlite3` from `database/schema.sql`.
This data file is intentionally not committed (see `.gitignore`); run `init` to generate it locally.

## Notes

- Some assets reference external web resources that require internet access when used.
