# HairLook AI

Production-oriented AI hairstyle consultation platform rebuilt from the supplied Hair-Lend / HairLook AI specification and the supplied AIHairstyles reference archive. The public product is intentionally **not** a visual clone of the reference: it uses a new quiet-luxury design system, guided consultation flow, private data layer, verified PayPro Global payment state, a DB-backed generation worker, progressive dashboard, and an authenticated admin area.

## Implemented product flow

```text
Landing
  → 12-step style consultation
  → photo upload + browser/server validation
  → email + explicit consent
  → private original storage
  → personalized plan / paywall
  → PayPro Global hosted checkout
  → verified server-side IPN webhook
  → idempotent payment event
  → DB-backed generation jobs
  → Replicate image-edit worker
  → private result storage
  → progressive customer dashboard
  → secure downloads / magic-link sign-in
  → authenticated admin / CSV / audit log
```

The app never unlocks generation from `?success=true` or any frontend-only signal.

## What is in the ZIP

- New responsive premium landing page and design system.
- Full-screen consultation with gender, age, current/desired length, texture, current/desired color, style goals, personality, maintenance, bangs, and gray preference.
- Upload UX with source-reference good/bad photo guidance, size/dimension validation and server re-encoding.
- Private Supabase Storage abstraction with signed URLs.
- PayPro Global hosted checkout builder and official IPN `HASH` + `SIGNATURE` verification.
- Idempotent `payment_events` handling.
- 30 curated AI job templates grouped into Recommended, Modern Layers, Easy-Care, Color Directions, Gray-Friendly and Bolder Options.
- Separate generation worker with DB job claiming, retries and retention cleanup.
- Progressive private dashboard, result modal, secure download, data deletion and magic-link sign-in.
- `/admin` with Customers, Payments, Generations, Analytics, Settings, CSV export and admin audit log.
- Terms, Privacy, Refund, Contact and About pages.
- Supabase migration including RLS, private buckets and worker-safe `FOR UPDATE SKIP LOCKED` queue function.
- Demo mode that runs without external credentials and simulates payment/generation.
- Automated tests for the PayPro signature formula, prompt count/identity constraints and schema security invariants.

## Quick local demo

Node.js 22+ is required.

```bash
cp .env.demo.example .env
npm install
npm start
```

Open `http://localhost:3000`.

Demo checkout simulates a verified payment and the web process also runs an in-process demo worker for convenience. Production keeps the web and worker processes separate.

Demo admin email:

```text
admin@hairlook.local
```

Request the admin magic link on `/admin`; in demo mode the UI surfaces the local one-time link because SMTP is intentionally not required.

## Production: 1. Supabase

Create a Supabase project and run all migrations in numeric order:

```text
supabase/migrations/001_hairlook.sql
supabase/migrations/002_email_verification.sql
supabase/migrations/003_paddle_readiness.sql
supabase/migrations/004_crypto_payments.sql
supabase/migrations/005_reviewer_demo.sql
```

The migration creates:

```text
hair_leads
lead_sessions
admin_sessions
magic_links
payments
payment_events
generation_jobs
generation_results
analytics_events
site_settings
admin_audit_logs
```

It also creates private buckets:

```text
hair-originals
hair-results
```

No public Storage policy is added. Browser code never receives the Supabase secret key. Use the current server-side `sb_secret_...` credential in `SUPABASE_SECRET_KEY`.

Official references:

- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/serving/downloads
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Production: 2. PayPro Global

The launch implementation uses a **hosted dynamic checkout link**, not the REST order API. This avoids making Railway static-egress/IP allowlisting a launch dependency.

Set:

```env
PAYPRO_PRODUCT_ID=
PAYPRO_PAGE_TEMPLATE_ID=
PAYPRO_SECRET_KEY=
PAYPRO_VALIDATION_KEY=
PAYPRO_TEST_MODE=false
PAYPRO_CURRENCY=USD
PAYPRO_LANGUAGE=EN
```

The server constructs:

```text
https://store.payproglobal.com/checkout
```

with safe checkout parameters including:

```text
products[1][id]
billing-email
currency
language
page-template (optional)
x-lead-id=<opaque UUID>
```

Order correlation uses the opaque lead UUID plus an HMAC integrity value (`x-lead-sig`) generated server-side from the PayPro secret key. The signature is not a secret; it prevents a browser-edited lead ID from being accepted by the webhook. Do **not** place photo paths, signed URLs, email auth tokens, Supabase keys or other sensitive data in custom fields.

Configure the PayPro Global IPN/Webhook URL as:

```text
https://YOUR-DOMAIN/api/webhooks/paypro
```

The endpoint verifies the official fields before changing state:

```text
HASH
SIGNATURE
ORDER_ID
ORDER_STATUS
ORDER_TOTAL_AMOUNT
CUSTOMER_EMAIL
TEST_MODE
IPN_TYPE_NAME
```

The implementation handles charged, refund, partial-refund, chargeback, declined and waiting states. It also rejects test/live environment mismatches and wrong product IDs before granting access. A duplicate valid IPN does not enqueue another 30 jobs. Stored webhook/payment payloads are allowlisted to transaction-relevant fields so customer IP, postal address and card metadata are not unnecessarily persisted.

Configure the PayPro page template / thank-you behavior to send the customer back to:

```text
https://YOUR-DOMAIN/dashboard
```

That redirect is convenience only. `/dashboard` still checks the server-side payment state and waits for IPN verification.

Official references used for this implementation:

- https://developers.payproglobal.com/docs/checkout-pages/dynamic-checkout-links/
- https://developers.payproglobal.com/docs/checkout-pages/url-parameters/
- https://developers.payproglobal.com/docs/integrate-with-paypro-global/webhook-ipn/

If you later add PayPro REST API calls, use the optional vendor/API credentials and follow PayPro's current IP allowlisting requirements. They are intentionally not part of the MVP checkout flow.

## Production: 3. Replicate

Default model abstraction:

```env
AI_PROVIDER=replicate
AI_PRIMARY_MODEL=black-forest-labs/flux-kontext-pro
REPLICATE_API_TOKEN=
AI_ESTIMATED_COST_USD=0.04
```

`AI_ESTIMATED_COST_USD` is accounting metadata only and must be updated when provider pricing changes. It is not used to charge customers.

Each job gets a short-lived signed original-photo URL. Generated bytes are immediately copied into the private `hair-results` bucket because provider output URLs are not treated as permanent storage.

Prompt constraints explicitly tell the model to change the hairstyle/hair color only and preserve facial features, skin tone, apparent age, body, pose, camera angle, lighting, clothing and background.

Official model/reference:

- https://replicate.com/black-forest-labs/flux-kontext-pro
- https://replicate.com/docs/topics/predictions/input-files
- https://replicate.com/docs/topics/predictions/output-files

Before launch, run a real model benchmark on representative 45+ portraits. Frontend polish cannot compensate for identity drift or wig-like hair output.

## Production: 4. SMTP and passwordless access

Configure a transactional SMTP provider:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=HairLook AI <results@your-domain.com>
```

Magic links are one-time, hashed at rest and expire. Production startup refuses to proceed without SMTP host/from values because logging live sign-in URLs is not an acceptable production auth path.

## Production: 5. Railway

Use the same GitHub repository for **two Railway services**.

### Web service

Start command:

```text
npm start
```

Healthcheck:

```text
/health
```

`railway.json` is configured for this service.

### Worker service

Start command:

```text
npm run worker
```

Use the same environment variables. `railway-worker.json` is included as a reference; Railway can also use a service-level start-command override.

The web request that receives a successful payment only records payment state and enqueues jobs. It does not wait for 10 AI calls.

The isolated, no-charge reviewer workflow and the later AI activation checklist are documented in `docs/REVIEWER_DEMO.md`.

## Environment variables

Copy `.env.example` and fill all live values. In production, startup validates launch-critical values rather than silently using demo placeholders.

Important groups:

```text
Application / merchant identity
Supabase
PayPro Global
AI provider
SMTP
Admin allowlist
Privacy / retention
Operational flags
```

Do not commit `.env`.

## Admin security

Admin is passwordless and allowlist-based through `ADMIN_EMAILS`.

Sensitive actions are audited:

```text
photo reveal
photo delete
customer delete
generation retry
results email
settings change
CSV export
```

Admin photo reveal returns a short-lived URL. No permanent public photo URL is stored in CSV.

## Privacy and retention

Default configuration:

```text
Original portrait: 24 hours
Generated results: 30 days
```

The worker runs cleanup. A paid original is **not** deleted while generation is still queued/processing/retrying; terminal or unpaid records can be cleaned after the configured cutoff.

The public Privacy page states that photos are stored temporarily. It does not falsely claim “we never store your photos.”

The current architecture intentionally avoids storing facial-recognition embeddings or biometric identification templates. Any future automatic face-geometry/biometric feature should receive separate legal/privacy review before implementation.

## Source archive asset policy

The supplied AIHairstyles archive was audited for UX/content density, photo guidance, demo-video behavior, pricing/FAQ/trust patterns and face-shape presentation. Competitor branding and its screen-recorded demo were **not shipped into the public product**.

Selected supplied/reference media is retained only as replaceable presentation/photo-guidance material because the master specification explicitly asks to integrate those examples. `docs/SOURCE_ASSET_AUDIT.md` identifies it. Confirm commercial rights before launch; if rights are not available, replace `upload-*`, `style-portrait-*`, `product-tour.mp4` and its poster with owned/licensed media without changing the UI or backend.

## Performance choices

- Critical hero uses compressed local images, not the original ~9 MB reference video.
- The product-tour MP4 is ~sub-megabyte and lazy loaded below the fold with `preload="none"`.
- No canvas particle systems or heavy scroll libraries.
- Native CSS transitions and IntersectionObserver.
- `prefers-reduced-motion` is respected.
- Uploaded images are reoriented, resized to max 2400×2400 and re-encoded before storage.
- Mobile hit targets and non-drag alternatives are provided.

Target production web-vitals should be measured on the deployed domain, not assumed from local files.

## Test and verification

```bash
npm run check
npm test
```

Current automated checks cover:

- exact 30 curated prompt jobs;
- identity-preservation wording;
- PayPro hosted link fields;
- production PayPro `HASH` + `SIGNATURE` verification formula;
- custom lead ID parsing;
- RLS/private bucket/DB queue schema invariants.

Manual acceptance checklist is in `docs/DEPLOYMENT_CHECKLIST.md`.

## Important launch boundary

The codebase is complete enough to wire and deploy, but **a real live commercial launch still requires values only the merchant can provide**:

```text
PayPro Global merchant/product credentials and final page template
Supabase project URL + server secret
Replicate API token
SMTP credentials/domain verification
real legal business name + address + support email
final legal review / asset rights confirmation
```

Those secrets are deliberately not invented or hardcoded in this ZIP.
