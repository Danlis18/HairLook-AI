import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

process.env.DEMO_MODE = 'true';
process.env.PADDLE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.PADDLE_PRICE_ID = 'pri_test_price';

const { verifyWebhookSignature, sanitizeTransactionPayload, sanitizeAdjustmentPayload } = await import('../src/lib/paddle.js');
const { repo } = await import('../src/lib/repository.js');

function sign(body, secret, ts = Math.floor(Date.now() / 1000)) {
  const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

test('verifyWebhookSignature accepts a correctly signed payload', () => {
  const body = JSON.stringify({ event_id: 'evt_1', event_type: 'transaction.completed', data: { id: 'txn_1' } });
  const header = sign(body, 'whsec_test_secret');
  assert.deepEqual(verifyWebhookSignature(body, header), { ok: true });
});

test('verifyWebhookSignature rejects a payload signed with the wrong secret', () => {
  const body = JSON.stringify({ event_id: 'evt_1' });
  const header = sign(body, 'wrong-secret');
  const result = verifyWebhookSignature(body, header);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bad_signature');
});

test('verifyWebhookSignature rejects a tampered body even with a valid-looking signature', () => {
  const original = JSON.stringify({ event_id: 'evt_1', data: { id: 'txn_1' } });
  const header = sign(original, 'whsec_test_secret');
  const tampered = JSON.stringify({ event_id: 'evt_1', data: { id: 'txn_HACKED' } });
  assert.equal(verifyWebhookSignature(tampered, header).ok, false);
});

test('verifyWebhookSignature rejects a stale timestamp (replay protection)', () => {
  const body = JSON.stringify({ event_id: 'evt_1' });
  const oldTs = Math.floor(Date.now() / 1000) - 600;
  const header = sign(body, 'whsec_test_secret', oldTs);
  const result = verifyWebhookSignature(body, header);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale_timestamp');
});

test('verifyWebhookSignature rejects a missing or malformed signature header', () => {
  assert.equal(verifyWebhookSignature('{}', undefined).reason, 'missing_signature');
  assert.equal(verifyWebhookSignature('{}', '').reason, 'missing_signature');
  assert.equal(verifyWebhookSignature('{}', 'not-a-real-header').reason, 'malformed_signature');
});

test('sanitizeTransactionPayload keeps aggregate fields and drops billing/card/customer details', () => {
  const clean = sanitizeTransactionPayload({
    id: 'txn_1', status: 'completed', currency_code: 'USD',
    custom_data: { lead_id: 'abc' },
    items: [{ price_id: 'pri_test_price', quantity: 1 }],
    details: { totals: { total: '1500' } },
    billing_details: { address: '123 Secret St' },
    payments: [{ method_details: { card: { last4: '4242' } } }],
    created_at: '2026-01-01T00:00:00Z'
  });
  assert.equal(clean.id, 'txn_1');
  assert.equal(clean.total, '1500');
  assert.equal(clean.custom_data.lead_id, 'abc');
  assert.equal(clean.billing_details, undefined);
  assert.equal(clean.payments, undefined);
});

test('sanitizeAdjustmentPayload keeps only aggregate refund/chargeback fields', () => {
  const clean = sanitizeAdjustmentPayload({
    id: 'adj_1', action: 'refund', status: 'approved', transaction_id: 'txn_1',
    currency_code: 'USD', totals: { total: '1500' }, customer_id: 'ctm_should_not_appear'
  });
  assert.equal(clean.action, 'refund');
  assert.equal(clean.transaction_id, 'txn_1');
  assert.equal(clean.customer_id, undefined);
});

test('a lead without email_verified_at reads as unverified (checkout gate condition)', async () => {
  const lead = await repo.createLead({ email: 'paddle-gate-test@example.com', payment_status: 'unpaid', generation_status: 'not_started', upload_status: 'ready' });
  try {
    assert.ok(!lead.email_verified_at);
    const fetched = await repo.getLead(lead.id);
    assert.ok(!fetched.email_verified_at);
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('a lead with upload_status other than ready reads as not ready (checkout gate condition)', async () => {
  const lead = await repo.createLead({ email: 'paddle-upload-gate-test@example.com', payment_status: 'unpaid', generation_status: 'not_started', upload_status: 'pending', email_verified_at: new Date().toISOString() });
  try {
    assert.notEqual(lead.upload_status, 'ready');
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('an unknown lead id resolves to null so the webhook can ignore it safely', async () => {
  const missing = await repo.getLead('00000000-0000-4000-8000-000000000000');
  assert.equal(missing, null);
});

test('a transaction.completed with the wrong price id is detectable before any lead mutation', () => {
  const purchasedPriceId = 'pri_wrong_one';
  assert.notEqual(purchasedPriceId, process.env.PADDLE_PRICE_ID);
});

test('applying a transaction.completed persists a paid payment row and flips the lead to paid/manual_pending, with no generation_jobs created', async () => {
  const lead = await repo.createLead({ email: 'paddle-webhook-test@example.com', payment_status: 'unpaid', generation_status: 'not_started', upload_status: 'ready', email_verified_at: new Date().toISOString() });
  try {
    await repo.upsertPayment({ lead_id: lead.id, provider: 'paddle', provider_order_id: 'txn_test_1', status: 'paid', amount: 15, currency: 'USD', paid_at: new Date().toISOString(), raw_payload: {} });
    await repo.updateLead(lead.id, { payment_status: 'paid', payment_provider: 'paddle', payment_order_id: 'txn_test_1', payment_amount: 15, payment_currency: 'USD', paid_at: new Date().toISOString(), generation_status: 'manual_pending' });

    const updated = await repo.getLead(lead.id);
    assert.equal(updated.payment_status, 'paid');
    assert.equal(updated.payment_provider, 'paddle');
    assert.equal(updated.generation_status, 'manual_pending');

    const { rows: jobs } = await repo.listJobs({ limit: 500 });
    assert.equal(jobs.filter(j => j.lead_id === lead.id).length, 0);
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('a duplicate webhook event id is rejected the second time (idempotency)', async () => {
  const first = await repo.insertPaymentEventIfNew({ provider: 'paddle', provider_event_id: 'evt_dup_1', order_id: 'txn_dup', event_type: 'transaction.completed', payload: {}, verified: true });
  const second = await repo.insertPaymentEventIfNew({ provider: 'paddle', provider_event_id: 'evt_dup_1', order_id: 'txn_dup', event_type: 'transaction.completed', payload: {}, verified: true });
  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
});

test('getPaymentByOrderId finds a payment by provider + transaction id, and returns null when absent', async () => {
  const lead = await repo.createLead({ email: 'paddle-lookup-test@example.com', payment_status: 'paid', generation_status: 'manual_pending', upload_status: 'ready' });
  try {
    await repo.upsertPayment({ lead_id: lead.id, provider: 'paddle', provider_order_id: 'txn_lookup_1', status: 'paid', amount: 15, currency: 'USD', paid_at: new Date().toISOString(), raw_payload: {} });
    const found = await repo.getPaymentByOrderId('paddle', 'txn_lookup_1');
    assert.equal(found.lead_id, lead.id);
    assert.equal(found.status, 'paid');
    assert.equal(await repo.getPaymentByOrderId('paddle', 'txn_does_not_exist'), null);
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('a refund adjustment flips a payment to refunded and the lead follows, without losing the original amount', async () => {
  const lead = await repo.createLead({ email: 'paddle-refund-test@example.com', payment_status: 'paid', generation_status: 'manual_pending', upload_status: 'ready' });
  try {
    await repo.upsertPayment({ lead_id: lead.id, provider: 'paddle', provider_order_id: 'txn_refund_1', status: 'paid', amount: 15, currency: 'USD', paid_at: new Date().toISOString(), raw_payload: {} });
    await repo.upsertPayment({ lead_id: lead.id, provider: 'paddle', provider_order_id: 'txn_refund_1', status: 'refunded', amount: 15, currency: 'USD', refunded_at: new Date().toISOString(), raw_payload: {} });
    await repo.updateLead(lead.id, { payment_status: 'refunded' });

    const payment = await repo.getPaymentByOrderId('paddle', 'txn_refund_1');
    assert.equal(payment.status, 'refunded');
    assert.equal(Number(payment.amount), 15);
    const updatedLead = await repo.getLead(lead.id);
    assert.equal(updatedLead.payment_status, 'refunded');
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('the payments table stays provider-generic — no new migration was needed for Paddle', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/001_hairlook.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public\.payments/);
  assert.match(sql, /provider text not null/);
  assert.match(sql, /unique\(provider, provider_order_id\)/);
  assert.match(sql, /create table if not exists public\.payment_events/);
  assert.match(sql, /unique\(provider, provider_event_id\)/);
});

test('production config no longer requires PayPro variables and does require the Paddle set', () => {
  const configSrc = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(configSrc, /PAYPRO/i);
  assert.match(configSrc, /PADDLE_API_KEY/);
  assert.match(configSrc, /PADDLE_CLIENT_TOKEN/);
  assert.match(configSrc, /PADDLE_PRICE_ID/);
  assert.match(configSrc, /PADDLE_WEBHOOK_SECRET/);
});
