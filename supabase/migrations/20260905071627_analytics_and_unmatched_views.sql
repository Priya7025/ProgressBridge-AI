-- Distinct from review_queue: these events had no reliable candidate at all,
-- not just an uncertain one. Still shown alongside the closest guess (if any)
-- so a planner isn't picking blind.
create or replace view unmatched_queue
with (security_invoker = true) as
select
  pe.id as event_id,
  pe.project_id,
  pe.discipline,
  pe.activity_description,
  pe.asset,
  pe.location,
  pe.event_type,
  pe.event_date,
  pe.event_time,
  pe.status as event_status,
  am.final_score as closest_score,
  sa.activity_id as closest_activity_code,
  sa.description as closest_description,
  d.filename as source_filename,
  d.raw_text as source_text
from progress_events pe
left join activity_matches am on am.event_id = pe.id
left join schedule_activities sa on sa.id = am.activity_id
left join documents d on d.id = pe.document_id
where pe.status = 'UNMATCHED'
order by pe.created_at asc;

-- Per-activity delay in days — completed activities use actual vs planned
-- finish; still-open activities use today vs planned finish (expected delay).
create or replace view activity_delay_analytics
with (security_invoker = true) as
select
  project_id,
  id as activity_id,
  activity_id as activity_code,
  description,
  discipline,
  planned_finish,
  actual_finish,
  status,
  case
    when status = 'COMPLETED' and actual_finish is not null then actual_finish - planned_finish
    when status != 'COMPLETED' and planned_finish < current_date then current_date - planned_finish
    else 0
  end as delay_days
from schedule_activities
where planned_finish is not null
order by delay_days desc;

-- Counts of each stated delay reason, for the "top delay causes" chart.
create or replace view delay_reason_breakdown
with (security_invoker = true) as
select
  project_id,
  delay_reason,
  count(*) as occurrences
from progress_events
where delay_reason is not null
group by project_id, delay_reason
order by occurrences desc;

-- Match confidence breakdown — the "data quality" stat from PRD Section 23.
create or replace view match_data_quality
with (security_invoker = true) as
select
  pe.project_id,
  count(*) as total_matches,
  count(*) filter (where am.match_status = 'AUTO_MATCHED') as high_confidence,
  count(*) filter (where am.match_status = 'PENDING_REVIEW') as needs_review,
  count(*) filter (where am.match_status = 'UNMATCHED') as unmatched,
  round(100.0 * count(*) filter (where am.match_status = 'AUTO_MATCHED') / nullif(count(*), 0), 1) as high_confidence_pct
from progress_events pe
left join activity_matches am on am.event_id = pe.id
group by pe.project_id;