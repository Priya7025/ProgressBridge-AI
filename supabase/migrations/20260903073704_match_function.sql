create or replace function public.match_schedule_activities(
  p_project_id uuid,
  p_embedding extensions.vector(1536),
  p_discipline text default null,
  p_location text default null,
  p_asset text default null,
  p_match_count int default 5
)
returns table (
  activity_id uuid,
  activity_code text,
  description text,
  semantic_score numeric,
  identifier_score numeric,
  discipline_score numeric,
  location_score numeric,
  final_score numeric
)
language sql
stable
set search_path = extensions, public
as $$
  select
    sa.id as activity_id,
    sa.activity_id as activity_code,
    sa.description,
    round((1 - (sa.embedding <=> p_embedding))::numeric, 4) as semantic_score,
    case when p_asset is not null and sa.asset ilike '%' || p_asset || '%'
      then 1.0 else 0.0 end as identifier_score,
    case when p_discipline is not null and sa.discipline ilike p_discipline
      then 1.0 else 0.0 end as discipline_score,
    case when p_location is not null and sa.location ilike '%' || p_location || '%'
      then 1.0 else 0.0 end as location_score,
    round((
      0.50 * (1 - (sa.embedding <=> p_embedding))
      + 0.25 * (case when p_asset is not null and sa.asset ilike '%' || p_asset || '%' then 1.0 else 0.0 end)
      + 0.15 * (case when p_discipline is not null and sa.discipline ilike p_discipline then 1.0 else 0.0 end)
      + 0.10 * (case when p_location is not null and sa.location ilike '%' || p_location || '%' then 1.0 else 0.0 end)
    )::numeric, 4) as final_score
  from schedule_activities sa
  where sa.project_id = p_project_id
  order by final_score desc
  limit p_match_count;
$$;