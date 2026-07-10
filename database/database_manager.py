from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "dashboard.sqlite3"
SCHEMA_PATH = ROOT / "schema.sql"


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize() -> None:
    with connect() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def summary() -> dict[str, int]:
    tables = [
        "students",
        "competence_units",
        "student_competence_progress",
        "training_resources",
        "schedule_blocks",
    ]
    with connect() as connection:
        return {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in tables
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="SQLite manager for the 3D Digital Game Art dashboard prototype.")
    parser.add_argument("command", choices=["init", "summary"], help="Database action to run.")
    args = parser.parse_args()

    if args.command == "init":
        initialize()
        print(f"Initialized {DB_PATH}")
        return

    initialize()
    for table, count in summary().items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
