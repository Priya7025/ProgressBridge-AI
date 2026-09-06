# ProgressBridge AI

Intelligent data-capture and schedule-linking platform for infrastructure project execution (SIH26122).

---

## Quick Start: Seed the Demo Data

To populate the local Supabase database with the default demo project and the full **750 L5/L6 construction schedule activities** across Civil, Mechanical, and Electrical disciplines:

### Option 1: Supabase CLI (Recommended)
```bash
npx supabase db reset
```
*(This applies all database migrations in `supabase/migrations/` and executes the seed file at `supabase/seed.sql` / `supabase/seed/seed.sql`)*

### Option 2: Direct SQL Execution (or Supabase SQL Editor)
```bash
npx supabase db execute -f supabase/seed/seed.sql
```
*Or using psql:*
```bash
psql "$DATABASE_URL" -f supabase/seed/seed.sql
```

> **Note on Embeddings**: The `embedding` column is deliberately set to `NULL` during seeding. Embedding vectors (pgvector) are generated in the next step by the semantic matching pipeline (Member 2).

---

## End-to-End Pipeline Smoke Test

Run the full automated integration test to verify the complete ingestion, extraction, semantic matching, and dashboard pipeline across all 58 benchmark items:

```bash
python tests/e2e/pipeline_test.py
```

### Pipeline Stages Verified:
1. **Stage 1 (Member 4)**: `schedule_activities` table verification (750 seeded activities).
2. **Stage 2 (Member 1)**: Document ingestion webhook (`/functions/v1/document-ingest` or `/api/projects/{id}/documents`).
3. **Stage 3 (Member 1)**: LLM event extraction and `progress_events` table population.
4. **Stage 4 (Member 2)**: Semantic matching accuracy against `supabase/seed/sample_reports/ground_truth.json` (53 target matches + 5 deliberate non-matches held for review).
5. **Stage 5 (Member 3)**: Dashboard data source and analytics metrics (`/api/projects/{id}/dashboard`).

*Note: If any upstream service or branch is not merged/running, the smoke test reports clear `BLOCKED ON: <component>` diagnostics without crashing.*
