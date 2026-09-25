create or replace function public.log_activity_match_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into audit_log (event_id, activity_id, action, old_value, new_value, user_id)
  values (
    new.event_id,
    new.activity_id,
    case when tg_op = 'INSERT' then 'match_created' else 'match_updated' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),
    auth.uid()
  );
  return new;
end;
$$;

create trigger trg_log_activity_match_change
after insert or update on activity_matches
for each row execute function public.log_activity_match_change();