-- Align database-backed runtime settings with the current Paddle-reviewed offer.
-- Safe idempotent updates only; no destructive schema changes.

insert into public.site_settings (key, value, type)
values
  ('price_display_usd', '6.99', 'string'),
  ('checkout_enabled', 'true', 'boolean'),
  ('generation_enabled', 'false', 'boolean'),
  ('original_retention_hours', '720', 'number'),
  ('result_retention_days', '30', 'number')
on conflict (key) do update
set value = excluded.value,
    type = excluded.type,
    updated_at = now();
