50 Dashboard portable package
================================

Open index.html in this folder. Keep the assets folder beside it.

Copied local assets:
- ../temp/actvet_emiratesskills_logo_white.svg -> assets/actvet_emiratesskills_logo_white.svg
- bust.svg -> assets/bust.svg
- competition_pathway.svg?v=soft-blue-2 -> assets/competition_pathway.svg?v=soft-blue-2
- competition_pathway_dark.svg?v=soft-blue-2 -> assets/competition_pathway_dark.svg?v=soft-blue-2
- determination.ttf -> assets/determination.ttf
- icon-bone.svg -> assets/icon-bone.svg
- icon-motion.svg -> assets/icon-motion.svg
- icon-paint-bucket.svg -> assets/icon-paint-bucket.svg
- icon-paint-palette.svg -> assets/icon-paint-palette.svg
- icon-scisor.svg -> assets/icon-scisor.svg
- icon-sidebar-competences.svg -> assets/icon-sidebar-competences.svg
- icon-sidebar-dashboard.svg -> assets/icon-sidebar-dashboard.svg
- icon-sidebar-documentation.svg -> assets/icon-sidebar-documentation.svg
- icon-sidebar-marking.svg -> assets/icon-sidebar-marking.svg
- icon-sidebar-taskbank.svg -> assets/icon-sidebar-taskbank.svg
- icon-sidebar-training.svg -> assets/icon-sidebar-training.svg
- icon-top-event.svg -> assets/icon-top-event.svg
- icon-top-level.svg -> assets/icon-top-level.svg
- icon-top-training-hours.svg -> assets/icon-top-training-hours.svg

Missing local references not found on this PC:
- ${student.mediaSrc} -> C:\Users\Gabriel\Desktop\50_Dashboard\${student.mediaSrc}

External web references were left unchanged and require internet access when used.

SQLite persistence
------------------

The prototype includes a small SQLite manager in database/database_manager.py.

Commands:
- python database/database_manager.py init
- python database/database_manager.py summary

The database file is created at database/dashboard.sqlite3 and uses
database/schema.sql for the initial tables.
