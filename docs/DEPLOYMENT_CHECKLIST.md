# Production deployment checklist

## Secrets / account setup

- [ ] Real `APP_URL` set.
- [ ] 64+ random `SESSION_SECRET`.
- [ ] Random `IP_HASH_SALT`.
- [ ] Supabase project created and migration applied.
- [ ] `SUPABASE_SECRET_KEY` is server-only (`sb_secret_...`).
- [ ] Both Storage buckets verified private.
- [ ] PayPro Global one-time product is active.
- [ ] PayPro `PRODUCT_ID`, Secret Key and Validation Key set.
- [ ] `PAYPRO_TEST_MODE=false` before live traffic.
- [ ] PayPro IPN points to `/api/webhooks/paypro`.
- [ ] PayPro thank-you/page-template redirect points to `/dashboard`.
- [ ] Replicate token set; real 45+ identity-preservation benchmark completed.
- [ ] SMTP/domain verified; magic-link email tested.
- [ ] `ADMIN_EMAILS` contains only authorized people.
- [ ] Legal business name, address and support email are real.
- [ ] Source photo commercial rights confirmed or assets replaced.

## Railway

- [ ] Web service deploys `npm start`.
- [ ] Web healthcheck `/health` passes.
- [ ] Worker service deploys `npm run worker`.
- [ ] Same production env variables applied to both.
- [ ] Restart policy verified.
- [ ] Logs show no secret values.

## Payment acceptance

- [ ] Test checkout opens the correct product.
- [ ] Browser return alone does not mark order paid.
- [ ] Valid `OrderCharged + Processed` IPN marks lead paid.
- [ ] Replaying the same IPN does not duplicate jobs.
- [ ] Bad signature returns HTTP 400 and does not poison idempotency state.
- [ ] Refund state updates.
- [ ] Chargeback/decline/waiting state updates.
- [ ] Product/currency/amount displayed at checkout match merchant configuration.

## Database / private data

- [ ] Quiz answers saved.
- [ ] Email saved.
- [ ] Original file path saved; original bucket is private.
- [ ] No binary photo in Postgres rows.
- [ ] Payment event saved after verification.
- [ ] Generation status moves queued → processing → completed/partial.
- [ ] Results saved in private results bucket.
- [ ] Signed result URL expires.
- [ ] Original cleanup job works after retention cutoff.
- [ ] Paid originals are not deleted mid-generation.
- [ ] Result cleanup works after retention cutoff.
- [ ] User delete-data flow removes private files + lead data.

## Admin

- [ ] Unauthorized `/admin` API returns 401.
- [ ] Only allowlisted email receives admin magic link.
- [ ] Photo reveal is short-lived and audited.
- [ ] Delete photo audited.
- [ ] Delete customer audited.
- [ ] Retry failed generations audited.
- [ ] Settings changes audited.
- [ ] CSV opens cleanly in Google Sheets.
- [ ] CSV contains no photo URL, auth token or secrets.

## Responsive QA

Test at minimum:

```text
390×844
430×932
768×1024
820×1180
1024×1366
1280×720
1366×768
1440×900
1920×1080
```

For Chrome, Safari/iPhone and iPad where available:

- [ ] No horizontal scroll.
- [ ] No clipped CTA/button.
- [ ] No `100vh` keyboard bug blocking controls.
- [ ] Quiz can be completed with keyboard.
- [ ] Upload page does not create unnecessary desktop scroll.
- [ ] Modal/bottom sheet stays inside viewport.
- [ ] Text remains usable at zoom/text scaling.
- [ ] Reduced-motion preference is respected.

## Conversion / truthfulness

- [ ] No fake testimonial counts.
- [ ] No fake “AI scan” before an AI call.
- [ ] Price is clearly one-time / no subscription.
- [ ] Checkout page is authoritative for charge.
- [ ] Privacy copy states that photos are temporarily stored.
- [ ] AI previews are described as visualizations, not guaranteed salon outcomes.
