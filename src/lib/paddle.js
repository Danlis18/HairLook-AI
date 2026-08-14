import crypto from 'node:crypto';
import { config } from '../config.js';
import { safeEqual } from './crypto.js';

const apiBase = () => config.paddleEnvironment === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

// Server-authoritative: custom_data.lead_id is set here, never trusted from the client,
// so a verified webhook carrying it back is safe to act on.
export async function createTransaction({ leadId, email }) {
  if (!config.paddleApiKey) throw new Error('PADDLE_API_KEY is not configured');
  if (!config.paddlePriceId) throw new Error('PADDLE_PRICE_ID is not configured');
  const res = await fetch(`${apiBase()}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.paddleApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ price_id: config.paddlePriceId, quantity: 1 }],
      custom_data: { lead_id: leadId },
      ...(email ? { customer: { email } } : {})
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Paddle transaction creation failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const body = await res.json();
  return body.data;
}

// Paddle-Signature header: "ts=<unix seconds>;h1=<hex hmac>". Signed payload is "ts:rawBody".
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.paddleWebhookSecret) return { ok: false, reason: 'webhook_secret_not_configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' };
  const parts = {};
  for (const kv of String(signatureHeader).split(';')) {
    const idx = kv.indexOf('=');
    if (idx < 0) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const { ts, h1 } = parts;
  if (!ts || !h1) return { ok: false, reason: 'malformed_signature' };
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
  const expected = crypto.createHmac('sha256', config.paddleWebhookSecret).update(`${ts}:${bodyString}`).digest('hex');
  if (!safeEqual(expected, h1)) return { ok: false, reason: 'bad_signature' };
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return { ok: false, reason: 'stale_timestamp' };
  return { ok: true };
}

// Keep only aggregate transaction fields for the audit trail; drop billing/customer/card details.
export function sanitizeTransactionPayload(data = {}) {
  return {
    id: data.id,
    status: data.status,
    currency_code: data.currency_code,
    custom_data: data.custom_data || {},
    items: Array.isArray(data.items) ? data.items.map(i => ({ price_id: i.price_id, quantity: i.quantity })) : [],
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
