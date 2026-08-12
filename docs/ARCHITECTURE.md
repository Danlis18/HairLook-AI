# Architecture

```text
Browser
  │
  ├─ Landing / quiz / upload / account UI
  │
  ▼
Railway Web (Node 22 + Express)
  │
  ├─ Supabase Postgres (server secret only)
  ├─ Supabase private Storage
  ├─ PayPro hosted checkout link
  ├─ PayPro verified IPN endpoint
  └─ SMTP magic links / result-ready notices
              │
              ▼
        generation_jobs
              │
              ▼
Railway Worker
  │
  ├─ claim job with `FOR UPDATE SKIP LOCKED`
  ├─ short-lived signed original URL
  ├─ Replicate model abstraction
  ├─ persist result bytes to private Storage
  ├─ generation_results row
  └─ retention cleanup
```

## Trust boundaries

### Browser

Receives only public config and short-lived, session-authorized result links. It never receives Supabase secret credentials, PayPro keys, Replicate tokens or SMTP credentials.

### Web service

Owns authentication, upload sanitization, checkout link generation, webhook verification, database writes and admin authorization.

### Worker

Owns AI provider calls and private result persistence. A paid order is a prerequisite for a generation job to proceed.

## Payment state machine

```text
unpaid
  → checkout_started
  → waiting (optional)
  → paid
  → refunded / partially_refunded / chargeback

or

checkout_started → declined
```

Only a verified PayPro IPN can move an order to `paid` in production.

## Generation state

```text
not_started
  → queued
  → processing
  → completed
        or partial
        or failed
```

Each job independently moves:

```text
queued → processing → completed
                    ↘ retry → processing
                    ↘ failed after retry budget
```

## Data minimization

- Photo bytes live in Storage, not Postgres.
- `ip_hash` is salted; raw IP is not intentionally persisted in the lead row.
- Analytics metadata excludes photo contents.
- PayPro custom fields carry only an opaque lead UUID.
- Admin CSV excludes signed/private photo URLs and secrets.
