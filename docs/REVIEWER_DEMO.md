# Reviewer Demo and automatic fulfillment

## Reviewer flow

The production site keeps real customer checkout unchanged and adds an isolated reviewer path:

1. The owner signs in at `/admin` and opens **Reviewer Demo**.
2. The owner creates a one-use link, preferably bound to the reviewer's email, language and a 24-hour expiry.
3. The reviewer opens the link, uploads one photo and verifies the email with the real six-digit code.
4. The normal order screen is shown in English or Portuguese. Card and cryptocurrency are disabled for this scoped session; **Free reviewer demo** is available.
5. The server records a zero-value `reviewer_demo` payment. No wallet, payment provider or Meta Purchase event is called.
6. Ten lead-scoped jobs are queued. With `REVIEWER_AI_ENABLED=true`, the web service itself processes only reviewer jobs through the configured Replicate model. Production refuses to start a Reviewer AI order when this integration is disabled; local color-filter previews remain available only for development.
7. The dashboard shows live progress, ten individual download links and one complete A4 PDF collection. The bilingual results email contains separate secure buttons for the dashboard and PDF.

Reviewer leads, zero-value payments and jobs remain visible to the owner, but are excluded from production revenue, paid-customer and conversion KPIs.

## Required before enabling Reviewer Demo in production

1. Run `supabase/migrations/005_reviewer_demo.sql` and then `supabase/migrations/006_inline_reviewer_ai.sql` in the Supabase SQL editor.
2. Deploy the web service normally (`npm start`). A second Railway worker service is not required for a reviewer-only presentation.
3. Confirm the existing `SUPABASE_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_EMAILS` and `ADMIN_PASSWORD` variables are valid.
4. Optionally set `REVIEWER_INVITE_TTL_HOURS=24`.
5. For real reviewer AI, add `REPLICATE_API_TOKEN`, keep `AI_PROVIDER=replicate` and `AI_PRIMARY_MODEL=black-forest-labs/flux-kontext-pro`, then set `REVIEWER_AI_ENABLED=true` and `REVIEWER_AI_CONCURRENCY=1`. The ten production prompts request structurally different haircuts and explicitly lock the original identity, lips, makeup, hair color, clothing, lighting and background.
6. Keep `GENERATION_ENABLED=false` and `MANUAL_FULFILLMENT_MODE=true` while only the reviewer path should use AI.
7. Create a reviewer link in `/admin` and test it in a private browser window.

Do not share the owner password or the main admin session with a reviewer.

The in-process reviewer loop claims only paid leads with `access_mode='reviewer_demo'`. It never claims real customer jobs. Jobs remain in Supabase, and processing jobs interrupted by a Railway restart are retried after a safe stale timeout.

## Later — real AI generation after paid orders

The payment hooks already call the dormant queue adapter. To activate it safely:

1. Approve the final prompt and the ten style directions.
2. Choose the image-edit provider and model.
3. Add its server-side key (currently supported: `REPLICATE_API_TOKEN`) to both Railway services.
4. Deploy a separate Railway worker using `npm run worker` (`railway-worker.json` is provided).
5. Test one internal paid order with `GENERATION_ENABLED=false`.
6. Set `MANUAL_FULFILLMENT_MODE=false` and `GENERATION_ENABLED=true` on both web and worker services.
7. Verify: confirmed payment → 10 queued jobs → 10 private results → EN/PT email → secure downloads.

Never put an AI key in browser JavaScript, and never enable automatic generation before the worker and prompt are verified.
