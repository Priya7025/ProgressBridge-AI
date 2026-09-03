-- Enable extensions
create extension if not exists vector;

-- ── User profiles (role + project assignment, links to Supabase Auth) ─────
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('supervisor', 'planner')),
  project_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Projects ────────────────────────────────────────────────────────────
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  organization text,
  planned_start date,
  planned_finish date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Schedule activities (L5/L6, with embedding for semantic matching) ─────
-- NOTE: vector(1536) assumes an OpenAI-style embedding model.
-- If you're using Voyage AI instead, change this to vector(1024)
-- (voyage-3) or vector(512) (voyage-3-lite) BEFORE you push this.
create table schedule_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  activity_id text not null,
  wbs text,
  level text,
  description text not null,
  discipline text,
  location text,
  asset text,
  planned_start date,
  planned_finish date,
  duration numeric,
  status text not null default 'NOT_STARTED',
  actual_start date,
  actual_finish date,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, activity_id)
);

-- Vector index for similarity search. Fine to create now even with an
-- empty table — you can rebuild it with a better `lists` value later
-- once real demo data is loaded, if matching feels slow.
create index idx_schedule_activities_embedding
  on schedule_activities using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create index idx_schedule_activities_project on schedule_activities(project_id);
create index idx_schedule_activities_discipline on schedule_activities(discipline);

-- ── Uploaded documents (source of truth for every report) ─────────────────
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  filename text,
  source_type text not null check (
    source_type in ('daily_report', 'spreadsheet', 'pdf', 'time_agent')
  ),
  mime_type text,
  raw_text text,
  storage_path text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create index idx_documents_project on documents(project_id);

-- ── Extracted progress events ──────────────────────────────────────────────
create table progress_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  discipline text,
  activity_description text not null,
  asset text,
  location text,
  event_type text check (
    event_type in ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'ON_HOLD')
  ),
  event_date date,
  event_time time,
  quantity numeric,
  delay_reason text,
  extraction_confidence numeric,
  status text not null default 'PENDING_MATCH' check (
    status in ('PENDING_MATCH', 'MATCHED', 'PENDING_REVIEW', 'UNMATCHED', 'REJECTED')
  ),
  created_at timestamptz not null default now()
);

create index idx_progress_events_project on progress_events(project_id);
create index idx_progress_events_status on progress_events(status);

-- ── Activity matches (event ↔ schedule activity, with scores) ─────────────
create table activity_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references progress_events(id) on delete cascade,
  activity_id uuid references schedule_activities(id) on delete set null,
  semantic_score numeric,
  identifier_score numeric,
  discipline_score numeric,
  location_score numeric,
  final_score numeric,
  match_status text not null default 'PENDING' check (
    match_status in ('AUTO_MATCHED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'UNMATCHED')
  ),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_activity_matches_event on activity_matches(event_id);
create index idx_activity_matches_status on activity_matches(match_status);

-- ── Audit log (every change, never deleted) ────────────────────────────────
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references progress_events(id) on delete set null,
  activity_id uuid references schedule_activities(id) on delete set null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  user_id uuid references auth.users(id),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_event on audit_log(event_id);
