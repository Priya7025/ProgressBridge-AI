create or replace view review_queue
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
  pe.delay_reason,
  pe.status as event_status,
  am.id as match_id,
  am.activity_id as suggested_activity_id,
  sa.activity_id as suggested_activity_code,
  sa.description as suggested_description,
  am.semantic_score,
  am.identifier_score,
  am.discipline_score,
  am.location_score,
  am.final_score,
  d.filename as source_filename,
  d.raw_text as source_text
from progress_events pe
left join activity_matches am on am.event_id = pe.id
left join schedule_activities sa on sa.id = am.activity_id
left join documents d on d.id = pe.document_id
where pe.status = 'PENDING_REVIEW'
order by pe.created_at asc;