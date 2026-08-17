-- Direct USDT payment intents for TRC20 / ERC20 / BEP20.
-- Run this migration in Supabase before enabling automatic crypto verification.

create table if not exists public.crypto_payment_intents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.hair_leads(id) on delete cascade,
  network text not null check (network in ('trc20','erc20','bep20')),
  asset text not null default 'USDT',
  address text not null,
  base_amount numeric(18,6) not null,
  amount numeric(18,6) not null,
  status text not null default 'pending' check (status in ('pending','paid','expired','canceled')),
  tx_hash text,
  from_address text,
  confirmations integer not null default 0,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crypto_payment_intents_lead_idx
  on public.crypto_payment_intents(lead_id, created_at desc);
create index if not exists crypto_payment_intents_pending_idx
  on public.crypto_payment_intents(network, status, expires_at desc);
create unique index if not exists crypto_payment_intents_tx_hash_uq
  on public.crypto_payment_intents(tx_hash)
  where tx_hash is not null;
create unique index if not exists crypto_payment_intents_pending_amount_uq
  on public.crypto_payment_intents(network, amount)
  where status = 'pending';
