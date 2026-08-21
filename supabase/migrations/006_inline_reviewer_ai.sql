-- Reviewer-only AI queue for deployments that run the processor inside the web service.
-- Real customer jobs remain isolated and cannot be claimed by this worker.

create or replace function public.claim_reviewer_generation_job(
  p_worker_id text
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select j.id into v_id
  from public.generation_jobs j
  join public.hair_leads l on l.id = j.lead_id
  where l.access_mode = 'reviewer_demo'
    and l.payment_status = 'paid'
    and j.status in ('queued','retry')
    and (j.run_after is null or j.run_after <= now())
  order by j.sort_order asc, j.created_at asc
  for update of j skip locked
  limit 1;

  if v_id is null then return; end if;

  return query
  update public.generation_jobs
  set status='processing', worker_id=p_worker_id, started_at=now(),
      updated_at=now(), attempts=attempts+1
  where id=v_id
  returning *;
end;
$$;

-- A deployment can stop while an external image request is running. Requeue only
-- stale reviewer jobs so the next web process can safely resume the demo.
create or replace function public.recover_stale_reviewer_generation_jobs(
  p_stale_before timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.generation_jobs j
  set status='retry', worker_id=null,
      error='Recovered after interrupted reviewer AI processing',
      run_after=now(), updated_at=now()
  from public.hair_leads l
  where l.id=j.lead_id
    and l.access_mode='reviewer_demo'
    and j.status='processing'
    and j.started_at < p_stale_before;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_reviewer_generation_job(text) from public, anon, authenticated;
revoke all on function public.recover_stale_reviewer_generation_jobs(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_reviewer_generation_job(text) to service_role;
grant execute on function public.recover_stale_reviewer_generation_jobs(timestamptz) to service_role;
