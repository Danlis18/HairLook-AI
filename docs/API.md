# API map

## Public
- `GET /health` — Railway healthcheck.
- `GET /api/config` — safe cached/configurable client values only.
- `POST /api/analytics` — funnel event, never photo content.
- `POST /api/leads` — multipart quiz + email + consent + image upload; image is decoded, EXIF-oriented, resized and rewritten before private storage.
- `GET /api/me` — current lead session summary.
- `POST /api/checkout` — returns PayPro hosted purchase link or demo checkout URL.
- `GET /api/dashboard` — private progressive generation results.
- `GET /api/results/:id/download` — authorized short-lived download.
- `POST /api/auth/request-link` / `GET /auth/magic` — passwordless result access.
- `DELETE /api/account` — delete current lead, original and result files.
- `POST /api/logout` — revoke current lead session.

## PayPro Global
- `POST /api/webhooks/paypro` — IPN endpoint. Verifies official `HASH` + `SIGNATURE`, stores an idempotent event, then changes payment state and enqueues generation.

## Admin
- `POST /api/admin/auth/request-link` / `GET /admin/magic`
- `GET /api/admin/me`, `POST /api/admin/logout`
- `GET /api/admin/overview`
- `GET /api/admin/customers`, `GET /api/admin/customers/:id`
- `GET /api/admin/customers/:id/photo` — audited 120s signed original URL
- `DELETE /api/admin/customers/:id/photo`
- `DELETE /api/admin/customers/:id`
- `POST /api/admin/customers/:id/retry`
- `POST /api/admin/customers/:id/send-results`
- `GET /api/admin/payments`
- `GET /api/admin/generations`
- `GET /api/admin/analytics`
- `GET /api/admin/settings`, `PUT /api/admin/settings`
- `GET /api/admin/audit`
- `GET /api/admin/export/customers.csv`
