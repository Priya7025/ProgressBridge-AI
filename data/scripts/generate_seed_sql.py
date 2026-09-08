"""
Generate supabase/seed/seed.sql from supabase/seed/schedule_activities.csv.

Maps CSV schema to Postgres schema:
- planned_start_date -> planned_start
- planned_end_date -> planned_finish
- wbs_code -> wbs
- calculates duration
- inserts default demo project
- leaves embedding NULL (reserved for Member 2)
- idempotent using ON CONFLICT (project_id, activity_id)
"""

import csv
from datetime import date
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
CSV_PATH = WORKSPACE_ROOT / "supabase" / "seed" / "schedule_activities.csv"
SEED_SQL_PATH = WORKSPACE_ROOT / "supabase" / "seed" / "seed.sql"
ROOT_SEED_SQL_PATH = WORKSPACE_ROOT / "supabase" / "seed.sql"

DEMO_PROJECT_ID = "00000000-0000-0000-0000-000000000001"
DEMO_PROJECT_CODE = "PRJ-DEMO-01"
DEMO_PROJECT_NAME = "Demo Gas Terminal & Processing Facility"
DEMO_ORG = "Oil India Limited (OIL)"

def escape_sql(val: str) -> str:
    if val is None:
        return "NULL"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"

def generate_seed_sql():
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Read {len(rows)} rows from {CSV_PATH}")

    sql_lines = []
    sql_lines.append("-- ===========================================================================")
    sql_lines.append("-- ProgressBridge AI (SIH26122) - Database Seed Script")
    sql_lines.append("-- Target Table: public.schedule_activities")
    sql_lines.append(f"-- Total Seed Rows: {len(rows)} activities across Civil, Mechanical, Electrical, Piping, Instrumentation, HSE")
    sql_lines.append("--")
    sql_lines.append("-- Schema Mapping / Resolution:")
    sql_lines.append("--   CSV: planned_start_date -> DB: planned_start (date)")
    sql_lines.append("--   CSV: planned_end_date   -> DB: planned_finish (date)")
    sql_lines.append("--   CSV: wbs_code           -> DB: wbs (text)")
    sql_lines.append("--   DB:  duration           -> calculated as (planned_finish - planned_start)")
    sql_lines.append("--   DB:  level              -> 'L5' / 'L6' based on WBS depth")
    sql_lines.append("--   DB:  embedding          -> NULL (NOTE: Embeddings generation is handled")
    sql_lines.append("--                                     by Member 2 in the embedding pipeline step)")
    sql_lines.append("--")
    sql_lines.append("-- Idempotency: Uses ON CONFLICT (project_id, activity_id) DO UPDATE")
    sql_lines.append("-- ===========================================================================\n")

    # 1. Ensure Demo Project Exists
    sql_lines.append("-- 1. Ensure Default Demo Project Exists")
    sql_lines.append(f"""INSERT INTO public.projects (
  id,
  name,
  code,
  organization,
  planned_start,
  planned_finish
) VALUES (
  '{DEMO_PROJECT_ID}'::uuid,
  '{DEMO_PROJECT_NAME}',
  '{DEMO_PROJECT_CODE}',
  '{DEMO_ORG}',
  '2026-06-01'::date,
  '2026-11-30'::date
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  organization = EXCLUDED.organization,
  planned_start = EXCLUDED.planned_start,
  planned_finish = EXCLUDED.planned_finish,
  updated_at = now();
""")

    # 2. Insert schedule activities in batches of 50
    sql_lines.append(f"-- 2. Seed Schedule Activities ({len(rows)} L5/L6 Activities across 6 Disciplines)")
    sql_lines.append("-- Note: embedding column is deliberately left NULL for Member 2 to populate via embedding model.\n")

    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        sql_lines.append(f"-- Batch {i//batch_size + 1} ({i + 1} to {min(i + batch_size, len(rows))})")
        sql_lines.append("""INSERT INTO public.schedule_activities (
  project_id,
  activity_id,
  wbs,
  level,
  description,
  discipline,
  location,
  asset,
  planned_start,
  planned_finish,
  duration,
  status,
  embedding
) VALUES""")

        value_clauses = []
        for r in batch:
            act_id = escape_sql(r["activity_id"])
            wbs = escape_sql(r["wbs_code"])
            # Determine L5 vs L6 based on dots in WBS
            dots = r["wbs_code"].count(".")
            level = "'L6'" if dots >= 3 else "'L5'"
            desc = escape_sql(r["description"])
            disc = escape_sql(r["discipline"])
            loc = escape_sql(r["location"])
            asset = escape_sql(r["asset"])
            p_start = escape_sql(r["planned_start_date"])
            p_finish = escape_sql(r["planned_end_date"])

            # Calculate duration in days
            d1 = date.fromisoformat(r["planned_start_date"])
            d2 = date.fromisoformat(r["planned_end_date"])
            duration = max(1, (d2 - d1).days)

            status = escape_sql(r["status"])

            val_str = f"  ('{DEMO_PROJECT_ID}'::uuid, {act_id}, {wbs}, {level}, {desc}, {disc}, {loc}, {asset}, {p_start}::date, {p_finish}::date, {duration}, {status}, NULL)"
            value_clauses.append(val_str)

        sql_lines.append(",\n".join(value_clauses))
        sql_lines.append("""ON CONFLICT (project_id, activity_id) DO UPDATE SET
  wbs = EXCLUDED.wbs,
  level = EXCLUDED.level,
  description = EXCLUDED.description,
  discipline = EXCLUDED.discipline,
  location = EXCLUDED.location,
  asset = EXCLUDED.asset,
  planned_start = EXCLUDED.planned_start,
  planned_finish = EXCLUDED.planned_finish,
  duration = EXCLUDED.duration,
  status = EXCLUDED.status,
  updated_at = now();
""")

    full_sql = "\n".join(sql_lines) + "\n"

    for target_path in [SEED_SQL_PATH, ROOT_SEED_SQL_PATH]:
        target_path.write_text(full_sql, encoding="utf-8")
        print(f"[OK] Generated seed SQL script ({len(rows)} activities): {target_path}")

if __name__ == "__main__":
    generate_seed_sql()
