-- ── Visual Execution Verification Tables ──────────────────────────────────────
-- Migration: 20260920000000_visual_execution_verification_schema.sql
-- Supports: design_images, site_images, visual_comparisons

-- 1. Design Images (Uploaded by planners representing planned engineering design/CAD/views)
create table if not exists public.design_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  activity_id uuid not null references public.schedule_activities(id) on delete cascade,
  storage_path text not null,
  view_type text not null default 'FRONT' check (
    view_type in ('FRONT', 'LEFT', 'RIGHT', 'TOP', 'ISOMETRIC', 'PERSPECTIVE', 'SECTION', 'OTHER')
  ),
  file_name text,
  file_size bigint,
  mime_type text,
  metadata jsonb default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for fast activity and project lookups
create index if not exists idx_design_images_project on public.design_images(project_id);
create index if not exists idx_design_images_activity on public.design_images(activity_id);
create index if not exists idx_design_images_view_type on public.design_images(view_type);

-- 2. Site Images (Uploaded by supervisors representing actual on-site execution photos)
create table if not exists public.site_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  activity_id uuid not null references public.schedule_activities(id) on delete cascade,
  storage_path text not null,
  capture_date date not null default current_date,
  view_type text not null default 'OTHER' check (
    view_type in ('FRONT', 'LEFT', 'RIGHT', 'TOP', 'ISOMETRIC', 'PERSPECTIVE', 'SECTION', 'OTHER')
  ),
  file_name text,
  file_size bigint,
  mime_type text,
  latitude double precision,
  longitude double precision,
  metadata jsonb default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for fast activity, project, and date lookups
create index if not exists idx_site_images_project on public.site_images(project_id);
create index if not exists idx_site_images_activity on public.site_images(activity_id);
create index if not exists idx_site_images_capture_date on public.site_images(capture_date);
create index if not exists idx_site_images_view_type on public.site_images(view_type);

-- 3. Visual Comparisons (Persisted AI analysis cache and planner verification records)
create table if not exists public.visual_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  activity_id uuid not null references public.schedule_activities(id) on delete cascade,
  design_image_id uuid references public.design_images(id) on delete cascade,
  site_image_id uuid references public.site_images(id) on delete cascade,
  view_match_score numeric,
  visual_similarity numeric,
  completion_state text check (
    completion_state in ('NOT_STARTED', 'IN_PROGRESS', 'NEAR_COMPLETE', 'COMPLETED', 'BLOCKED', 'UNKNOWN')
  ),
  differences jsonb default '[]'::jsonb,
  confidence numeric,
  status text not null default 'PENDING_REVIEW' check (
    status in ('PENDING_REVIEW', 'VERIFIED', 'FLAGGED', 'REJECTED')
  ),
  notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for visual comparison lookups
create index if not exists idx_visual_comparisons_project on public.visual_comparisons(project_id);
create index if not exists idx_visual_comparisons_activity on public.visual_comparisons(activity_id);
create index if not exists idx_visual_comparisons_design_image on public.visual_comparisons(design_image_id);
create index if not exists idx_visual_comparisons_site_image on public.visual_comparisons(site_image_id);
create index if not exists idx_visual_comparisons_status on public.visual_comparisons(status);

-- ── Enable Row Level Security (RLS) ───────────────────────────────────────────
alter table public.design_images enable row level security;
alter table public.site_images enable row level security;
alter table public.visual_comparisons enable row level security;

-- ── RLS Policies for design_images ───────────────────────────────────────────
create policy "select design_images in assigned projects" on public.design_images
for select using (
  project_id = any(public.user_project_ids())
);

create policy "planners can upload design_images" on public.design_images
for insert with check (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

create policy "planners can delete design_images" on public.design_images
for delete using (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

-- ── RLS Policies for site_images ─────────────────────────────────────────────
create policy "select site_images in assigned projects" on public.site_images
for select using (
  project_id = any(public.user_project_ids())
);

create policy "users can upload site_images to assigned projects" on public.site_images
for insert with check (
  project_id = any(public.user_project_ids())
);

create policy "planners can delete site_images" on public.site_images
for delete using (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

-- ── RLS Policies for visual_comparisons ───────────────────────────────────────
create policy "select visual_comparisons in assigned projects" on public.visual_comparisons
for select using (
  project_id = any(public.user_project_ids())
);

create policy "planners can update visual_comparisons" on public.visual_comparisons
for update using (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

create policy "planners can insert visual_comparisons" on public.visual_comparisons
for insert with check (
  public.user_role() = 'planner' and project_id = any(public.user_project_ids())
);

-- ── Storage Bucket for Visual Assets ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('visual-evidence', 'visual-evidence', true)
on conflict (id) do update set public = true;
