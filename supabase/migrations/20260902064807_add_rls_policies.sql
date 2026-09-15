-- ── Helper functions (avoid repeating subqueries in every policy) ─────────
-- security definer so these can read user_profiles even though RLS
-- will be enabled on it too — otherwise you'd get infinite recursion.

create or replace function public.user_role()
returns text
language sql
security definer
stable
as $$
  select role from user_profiles where id = auth.uid();
$$;

create or replace function public.user_project_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select project_ids from user_profiles where id = auth.uid();
$$;

-- ── Enable RLS on every table ──────────────────────────────────────────────
alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table schedule_activities enable row level security;
alter table documents enable row level security;
alter table progress_events enable row level security;
alter table activity_matches enable row level security;
alter table audit_log enable row level security;

-- ── user_profiles ───────────────────────────────────────────────────────
-- Everyone can see their own profile. Planners can also see profiles of
-- people who share at least one project with them (so the review UI can
-- show "submitted by X").
create policy "select own or shared-project profiles" on user_profiles
for select using (
  id = auth.uid()
  or (
    public.user_role() = 'planner'
    and project_ids && public.user_project_ids()
  )
);

-- Self-signup creates their own profile, but can only ever create it as
-- 'supervisor' — nobody can self-elevate to planner through the app.
-- Promote someone to planner manually via the SQL editor.
create policy "insert own profile as supervisor" on user_profiles
for insert with check (
  id = auth.uid() and role = 'supervisor'
);
-- No update policy: profile changes (role, project_ids) go through the
-- SQL editor only, on purpose — this is the access-control table.

-- ── projects ────────────────────────────────────────────────────────────
create policy "select assigned projects" on projects
for select using (
  id = any(public.user_project_ids())
);

create policy "planners can create projects" on projects
for insert with check (
  public.user_role() = 'planner'
);

create policy "planners can update assigned projects" on projects
for update using (
  public.user_role() = 'planner' and id = any(public.user_project_ids())
);

-- ── schedule_activities ─────────────────────────────────────────────────
create policy "select activities in assigned projects" on schedule_activities
for select using (
  project_id = any(public.user_project_ids())
);

create policy "planners can upload/edit schedule" on schedule_activities
for insert with check (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

create policy "planners can update schedule" on schedule_activities
for update using (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

-- ── documents ───────────────────────────────────────────────────────────
create policy "select documents in assigned projects" on documents
for select using (
  project_id = any(public.user_project_ids())
);

create policy "upload documents to assigned projects" on documents
for insert with check (
  project_id = any(public.user_project_ids()) and uploaded_by = auth.uid()
);
-- No update/delete — uploaded source text is never edited, only reprocessed.

-- ── progress_events ─────────────────────────────────────────────────────
-- Note: the extraction pipeline itself writes here using the service_role
-- key (bypasses RLS entirely) — these policies only govern what the
-- frontend, using the anon key + a logged-in user, can see and touch.
create policy "select own events, planners see all" on progress_events
for select using (
  project_id = any(public.user_project_ids())
  and (
    public.user_role() = 'planner'
    or document_id in (select id from documents where uploaded_by = auth.uid())
  )
);

create policy "planners can update event status" on progress_events
for update using (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

-- ── activity_matches ────────────────────────────────────────────────────
-- Scoped via the parent progress_event's project, since this table has
-- no project_id column of its own.
create policy "select matches for accessible events" on activity_matches
for select using (
  exists (
    select 1 from progress_events pe
    where pe.id = activity_matches.event_id
    and pe.project_id = any(public.user_project_ids())
  )
);

create policy "planners approve/reject/override matches" on activity_matches
for update using (
  public.user_role() = 'planner'
  and exists (
    select 1 from progress_events pe
    where pe.id = activity_matches.event_id
    and pe.project_id = any(public.user_project_ids())
  )
);

-- ── audit_log ───────────────────────────────────────────────────────────
-- Planners only — this is the review/accountability trail.
create policy "planners can view audit log" on audit_log
for select using (
  public.user_role() = 'planner'
  and (
    exists (
      select 1 from progress_events pe
      where pe.id = audit_log.event_id
      and pe.project_id = any(public.user_project_ids())
    )
    or exists (
      select 1 from schedule_activities sa
      where sa.id = audit_log.activity_id
      and sa.project_id = any(public.user_project_ids())
    )
  )
);

-- Planners can log their own review actions (approve/reject/override) —
-- automated writes from the matching engine use service_role and bypass this.
create policy "planners can insert their own audit entries" on audit_log
for insert with check (
  public.user_role() = 'planner' and user_id = auth.uid()
);