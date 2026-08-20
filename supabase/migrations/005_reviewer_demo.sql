-- Scoped reviewer demos for production.
-- These invitations never expose the owner admin session and never create revenue.

create extension if not exists pgcrypto;

alter table public.hair_leads
  add column if not exists access_mode text not null default 'customer';

alter table public.hair_leads
  drop constraint if exists hair_leads_access_mode_check;
alter table public.hair_leads
  add constraint hair_leads_access_mode_check
  check (access_mode in ('customer','reviewer_demo'));

create table if not exists public.reviewer_demo_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  reviewer_email text,
  locale text not null default 'en' check (locale in ('en','pt-BR')),
  created_by text not null,
  expires_at timestamptz not null,
  lead_id uuid references public.hair_leads(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reviewer_demo_invites_created_idx
  on public.reviewer_demo_invites(created_at desc);
create index if not exists reviewer_demo_invites_expiry_idx
  on public.reviewer_demo_invites(expires_at)
  where revoked_at is null;

-- Claiming is atomic so one invitation can never create two free orders.
create or replace function public.claim_reviewer_demo_invite(
  p_token_hash text,
  p_lead_id uuid,
  p_email text
)
returns setof public.reviewer_demo_invites
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.reviewer_demo_invites
  set lead_id = p_lead_id,
      used_at = now()
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
    and used_at is null
    and lead_id is null
    and (reviewer_email is null or lower(reviewer_email) = lower(p_email))
  returning *;
end;
$$;

-- A dedicated claim keeps demo processing isolated from real paid jobs.
create or replace function public.claim_generation_job_for_lead(
  p_worker_id text,
  p_lead_id uuid
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id
  from public.generation_jobs
  where lead_id = p_lead_id
    and status in ('queued','retry')
    and (run_after is null or run_after <= now())
  order by sort_order asc, created_at asc
  for update skip locked
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

revoke all on function public.claim_reviewer_demo_invite(text,uuid,text) from public, anon, authenticated;
revoke all on function public.claim_generation_job_for_lead(text,uuid) from public, anon, authenticated;
grant execute on function public.claim_reviewer_demo_invite(text,uuid,text) to service_role;
grant execute on function public.claim_generation_job_for_lead(text,uuid) to service_role;

alter table public.reviewer_demo_invites enable row level security;

-- Product contract: every completed collection contains exactly 10 images.
insert into public.site_settings(key,value,type)
values ('generation_target_count','10','number')
on conflict (key) do update set value='10',type='number',updated_at=now();

-- Reviewer activity remains visible in its own admin view but never inflates sales KPIs.
create or replace function public.hairlook_admin_overview()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with customers as (
    select * from public.hair_leads where access_mode = 'customer'
  ), lead_stats as (
    select count(*)::numeric as leads,
           count(*) filter (where payment_status='paid')::numeric as paid
    from customers
  ), payment_stats as (
    select coalesce(sum(p.amount) filter (where p.status='paid'),0)::numeric as revenue
    from public.payments p join customers c on c.id=p.lead_id
  ), job_stats as (
    select count(*) filter (where j.status='completed')::numeric as completed,
           count(*) filter (where j.status='failed')::numeric as failed
    from public.generation_jobs j join customers c on c.id=j.lead_id
  ), result_stats as (
    select count(*) filter (where r.deleted_at is null)::numeric as result_count,
           coalesce(sum(r.cost_usd) filter (where r.deleted_at is null),0)::numeric as ai_cost
    from public.generation_results r join customers c on c.id=r.lead_id
  )
  select jsonb_build_object(
    'revenue',payment_stats.revenue,
    'paidCustomers',lead_stats.paid,
    'leads',lead_stats.leads,
    'leadToPaid',case when lead_stats.leads>0 then lead_stats.paid/lead_stats.leads else 0 end,
    'generationSuccess',case when job_stats.completed+job_stats.failed>0 then job_stats.completed/(job_stats.completed+job_stats.failed) else 0 end,
    'resultCount',result_stats.result_count,
    'avgAiCostPerOrder',case when lead_stats.paid>0 then result_stats.ai_cost/lead_stats.paid else 0 end
  ) from lead_stats,payment_stats,job_stats,result_stats;
$$;
revoke all on function public.hairlook_admin_overview() from public, anon, authenticated;
grant execute on function public.hairlook_admin_overview() to service_role;
