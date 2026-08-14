import crypto from 'node:crypto';
import { config } from '../config.js';
import { hmacSha256, safeEqual } from './crypto.js';

// The browser is allowed to send Paddle.js checkout parameters, but it must not be able
// to point a successful payment at a different HairLook lead. We sign the lead id on the
// server and verify the signature again when Paddle returns custom_data in the webhook.
export function signLeadForCheckout(leadId) {
  return hmacSha256(config.sessionSecret, `paddle:${leadId}`);
}

export function verifyLeadCorrelation(leadId, signature) {
  if (!leadId || !signature) return false;
  return safeEqual(signLeadForCheckout(String(leadId)), String(signature));
}

// Paddle-Signature can contain more than one h1 value during secret rotation.
// Paddle signs the exact raw body as: ts + ':' + rawBody, using HMAC-SHA256.
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.paddleWebhookSecret) return { ok: false, reason: 'webhook_secret_not_configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' };

  let ts = '';
  const signatures = [];
  for (const part of String(signatureHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === 'ts') ts = value;
    if (key === 'h1' && value) signatures.push(value);
  }
  if (!ts || !signatures.length) return { ok: false, reason: 'malformed_signature' };

  const timestamp = Number(ts);
  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return { ok: false, reason: 'stale_timestamp' };

  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
  const expected = crypto.createHmac('sha256', config.paddleWebhookSecret).update(`${ts}:${bodyString}`).digest('hex');
  if (!signatures.some(sig => safeEqual(expected, sig))) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

export function transactionPriceIds(data = {}) {
  const ids = new Set();
  for (const item of Array.isArray(data.items) ? data.items : []) {
    const id = item?.price?.id || item?.price_id;
    if (id) ids.add(String(id));
  }
  for (const item of Array.isArray(data.details?.line_items) ? data.details.line_items : []) {
    if (item?.price_id) ids.add(String(item.price_id));
  }
  return [...ids];
}

// Keep only aggregate transaction fields for the audit trail; drop billing/customer/card details.
export function sanitizeTransactionPayload(data = {}) {
  return {
    id: data.id,
    status: data.status,
    currency_code: data.currency_code,
    custom_data: data.custom_data || {},
    items: (Array.isArray(data.items) ? data.items : []).map(i => ({
      price_id: i?.price?.id || i?.price_id || null,
      quantity: i?.quantity ?? null
    })),
    total: data.details?.totals?.total,
    created_at: data.created_at,
    billed_at: data.billed_at
  };
}

export function sanitizeAdjustmentPayload(data = {}) {
  return {
    id: data.id,
    action: data.action,
    status: data.status,
    transaction_id: data.transaction_id,
    currency_code: data.currency_code,
    total: data.totals?.total,
    created_at: data.created_at
  };
}
