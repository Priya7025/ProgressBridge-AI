-- Note: security_invoker = true is important here — without it, a view
-- runs with the view owner's permissions and would bypass your RLS
-- policies entirely. With it, each user only sees rows their own RLS
-- policies allow, same as querying the tables directly.

create or replace view project_dashboard_summary
with (security_invoker = true) as
select
  sa.project_id,
  count(*) as total_activities,
  count(*) filter (where sa.status = 'COMPLETED') as completed,
  count(*) filter (where sa.status = 'IN_PROGRESS') as in_progress,
  count(*) filter (where sa.status = 'NOT_STARTED') as not_started,
  count(*) filter (
    where (sa.status = 'COMPLETED' and sa.actual_finish > sa.planned_finish)
       or (sa.status != 'COMPLETED' and sa.planned_finish < current_date)
  ) as delayed,
  (select count(*) from progress_events pe
    where pe.project_id = sa.project_id and pe.status = 'PENDING_REVIEW') as pending_review,
  (select count(*) from progress_events pe
    where pe.project_id = sa.project_id and pe.status = 'UNMATCHED') as unmatched
from schedule_activities sa
group by sa.project_id;

create or replace view project_discipline_progress
with (security_invoker = true) as
select
  project_id,
  discipline,
  count(*) as total_activities,
  count(*) filter (where status = 'COMPLETED') as completed,
  round(
    100.0 * count(*) filter (where status = 'COMPLETED') / nullif(count(*), 0),
    1
  ) as completion_pct
from schedule_activities
group by project_id, discipline;