# Reviewer Demo and automatic fulfillment

## Phase 1 — no external AI API

The production site keeps real customer checkout unchanged and adds an isolated reviewer path:

1. The owner signs in at `/admin` and opens **Reviewer Demo**.
2. The owner creates a one-use link, preferably bound to the reviewer's email, language and a 24-hour expiry.
3. The reviewer opens the link, uploads one photo and verifies the email with the real six-digit code.
4. The normal order screen is shown in English or Portuguese. Card and cryptocurrency are disabled for this scoped session; **Free reviewer demo** is available.
5. The server records a zero-value `reviewer_demo` payment. No wallet, payment provider or Meta Purchase event is called.
6. Ten lead-scoped jobs are queued. The app creates ten clearly labeled local previews from the uploaded photo to validate upload, queue, private storage, dashboard and delivery without claiming that an AI hairstyle edit occurred.
7. The dashboard shows live progress and the ten download links. A bilingual email contains a secure one-time results link.

Reviewer leads, zero-value payments and jobs remain visible to the owner, but are excluded from production revenue, paid-customer and conversion KPIs.

## Required before enabling Reviewer Demo in production

1. Run `supabase/migrations/005_reviewer_demo.sql` in the Supabase SQL editor.
2. Deploy the web service normally (`npm start`). No new Railway variable is mandatory for Phase 1.
3. Confirm the existing `SUPABASE_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_EMAILS` and `ADMIN_PASSWORD` variables are valid.
4. Optionally set `REVIEWER_INVITE_TTL_HOURS=24`.
5. Create a reviewer link in `/admin` and test it in a private browser window.

Do not share the owner password or the main admin session with a reviewer.

## Phase 2 — real AI generation after paid orders

The payment hooks already call the dormant queue adapter. To activate it safely:

1. Approve the final prompt and the ten style directions.
2. Choose the image-edit provider and model.
3. Add its server-side key (currently supported: `REPLICATE_API_TOKEN`) to both Railway services.
4. Deploy a separate Railway worker using `npm run worker` (`railway-worker.json` is provided).
5. Test one internal paid order with `GENERATION_ENABLED=false`.
6. Set `MANUAL_FULFILLMENT_MODE=false` and `GENERATION_ENABLED=true` on both web and worker services.
7. Verify: confirmed payment → 10 queued jobs → 10 private results → EN/PT email → secure downloads.

Never put an AI key in browser JavaScript, and never enable automatic generation before the worker and prompt are verified.
