-- HairLook AI production schema for Supabase/Postgres.
-- Run through Supabase SQL editor or migration tooling with an owner role.
create extension if not exists pgcrypto;

create table if not exists public.hair_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  gender text,
  age_range text,
  exact_age smallint,
  current_length text,
  desired_length text,
  texture text,
  current_color text,
  desired_colors jsonb not null default '[]'::jsonb,
  style_goals jsonb not null default '[]'::jsonb,
  style_personality text,
  maintenance_level text,
  bangs_preference text,
  gray_preference text,
  quiz_answers jsonb not null default '{}'::jsonb,
  upload_path text,
  upload_status text not null default 'pending',
  original_deleted_at timestamptz,
  payment_status text not null default 'unpaid',
  payment_provider text,
  payment_order_id text,
  payment_amount numeric(12,2),
  payment_currency text,
  paid_at timestamptz,
  generation_status text not null default 'not_started',
  results_notified_at timestamptz,
  consent_at timestamptz,
  source text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  utm_medium text,
  utm_term text,
  landing_url text,
  ip_hash text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hair_leads_email_idx on public.hair_leads (lower(email));
create index if not exists hair_leads_created_idx on public.hair_leads (created_at desc);
create index if not exists hair_leads_payment_idx on public.hair_leads (payment_status);

create table if not exists public.lead_sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists lead_sessions_exp_idx on public.lead_sessions (expires_at);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('user','admin')),
  lead_id uuid references public.hair_leads(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  status text not null,
  amount numeric(12,2),
  currency text,
  paid_at timestamptz,
  refunded_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_order_id)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  order_id text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);
create index if not exists payment_events_order_idx on public.payment_events(order_id);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  category text not null,
  style_name text not null,
  prompt text not null,
  model text,
  sort_order integer not null,
  status text not null default 'queued' check (status in ('queued','processing','retry','completed','failed')),
  attempts integer not null default 0,
  worker_id text,
  error text,
  run_after timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lead_id, sort_order)
);
create index if not exists generation_jobs_queue_idx on public.generation_jobs(status, run_after, sort_order, created_at);

create table if not exists public.generation_results (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  job_id uuid references public.generation_jobs(id) on delete cascade,
  category text not null,
  style_name text not null,
  sort_order integer not null,
  storage_path text not null,
  provider text,
  model text,
  provider_prediction_id text,
  cost_usd numeric(12,4),
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(job_id)
);
create index if not exists generation_results_lead_idx on public.generation_results(lead_id, sort_order);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  lead_id uuid references public.hair_leads(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name, created_at desc);
create index if not exists analytics_events_lead_idx on public.analytics_events(lead_id);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  type text not null default 'string',
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

insert into public.site_settings(key,value,type) values
  ('price_display_usd','15.00','string'),
  ('generation_target_count','10','number'),
  ('support_email','support@example.com','string'),
  ('checkout_enabled','true','boolean'),
  ('generation_enabled','true','boolean'),
  ('maintenance_mode','false','boolean'),
  ('original_retention_hours','24','number'),
  ('result_retention_days','30','number')
on conflict (key) do nothing;

-- One-time magic link consumption is atomic.
create or replace function public.consume_magic_link(p_token_hash text)
returns setof public.magic_links
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.magic_links
    set used_at = now()
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  returning *;
end;
$$;
revoke all on function public.consume_magic_link(text) from public, anon, authenticated;

-- Worker-safe DB queue claim using SKIP LOCKED.
create or replace function public.claim_generation_job(p_worker_id text)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id
  from public.generation_jobs
  where status in ('queued','retry')
    and (run_after is null or run_after <= now())
  order by sort_order asc, created_at asc
  for update skip locked
  limit 1;

  if v_id is null then return; end if;

  return query
  update public.generation_jobs
  set status='processing', worker_id=p_worker_id, started_at=now(), updated_at=now(), attempts=attempts+1
  where id=v_id
  returning *;
end;
$$;
revoke all on function public.claim_generation_job(text) from public, anon, authenticated;

-- Aggregated admin metrics avoid row limits and unnecessary data transfer.
create or replace function public.hairlook_admin_overview()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with lead_stats as (
    select count(*)::numeric as leads,
           count(*) filter (where payment_status='paid')::numeric as paid
    from public.hair_leads
  ),
  payment_stats as (
    select coalesce(sum(amount) filter (where status='paid'),0)::numeric as revenue
    from public.payments
  ),
  job_stats as (
    select count(*) filter (where status='completed')::numeric as completed,
           count(*) filter (where status='failed')::numeric as failed
    from public.generation_jobs
  ),
  result_stats as (
    select count(*) filter (where deleted_at is null)::numeric as result_count,
           coalesce(sum(cost_usd) filter (where deleted_at is null),0)::numeric as ai_cost
    from public.generation_results
  )
  select jsonb_build_object(
    'revenue', payment_stats.revenue,
    'paidCustomers', lead_stats.paid,
    'leads', lead_stats.leads,
    'leadToPaid', case when lead_stats.leads>0 then lead_stats.paid/lead_stats.leads else 0 end,
    'generationSuccess', case when job_stats.completed+job_stats.failed>0 then job_stats.completed/(job_stats.completed+job_stats.failed) else 0 end,
    'resultCount', result_stats.result_count,
    'avgAiCostPerOrder', case when lead_stats.paid>0 then result_stats.ai_cost/lead_stats.paid else 0 end
  )
  from lead_stats, payment_stats, job_stats, result_stats;
$$;
revoke all on function public.hairlook_admin_overview() from public, anon, authenticated;

-- Batch result counts for large CSV exports.
create or replace function public.hairlook_result_counts(p_lead_ids uuid[])
returns table(lead_id uuid, result_count bigint)
language sql
security definer
set search_path = public
as $$
  select r.lead_id, count(*)::bigint
  from public.generation_results r
  where r.lead_id = any(p_lead_ids)
    and r.deleted_at is null
  group by r.lead_id;
$$;
revoke all on function public.hairlook_result_counts(uuid[]) from public, anon, authenticated;

-- Only the trusted server role may execute SECURITY DEFINER helpers.
grant execute on function public.consume_magic_link(text) to service_role;
grant execute on function public.claim_generation_job(text) to service_role;
grant execute on function public.hairlook_admin_overview() to service_role;
grant execute on function public.hairlook_result_counts(uuid[]) to service_role;

-- This service is server-mediated. Browser roles receive no table access.
alter table public.hair_leads enable row level security;
alter table public.lead_sessions enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.magic_links enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generation_results enable row level security;
alter table public.analytics_events enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Private storage buckets. No public policies are added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('hair-originals','hair-originals',false,15728640,array['image/jpeg','image/png','image/webp']),
  ('hair-results','hair-results',false,15728640,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;
