-- Adds real 6-digit email OTP verification for the customer funnel.
-- Safe additive migration: one new nullable column + one new table. Nothing existing changes shape.
create extension if not exists pgcrypto;

alter table public.hair_leads add column if not exists email_verified_at timestamptz;

create table if not exists public.email_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_verification_challenges_lead_idx on public.email_verification_challenges(lead_id, created_at desc);

-- This service is server-mediated. Browser roles receive no table access.
alter table public.email_verification_challenges enable row level security;
