import { Router } from 'express';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { verifyWebhookSignature, sanitizeTransactionPayload, sanitizeAdjustmentPayload } from '../lib/paddle.js';
import { log } from '../lib/log.js';

const router = Router();

router.post('/paddle', async (req, res, next) => { try {
  // server.js mounts express.raw() only on this path, so req.body is the exact Buffer Paddle signed.
  const rawBody = req.body;
  const verified = verifyWebhookSignature(rawBody, req.get('paddle-signature'));
  if (!verified.ok) { log.warn('paddle_webhook_rejected', { reason: verified.reason }); return res.status(400).send('invalid'); }

  let event;
  try { event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '{}')); }
  catch { log.warn('paddle_webhook_bad_json', {}); return res.status(400).send('invalid'); }

  const eventId = String(event.event_id || event.notification_id || '');
  const eventType = String(event.event_type || '');
  const data = event.data || {};
  if (!eventId || !eventType) { log.warn('paddle_webhook_missing_id_or_type', { eventId, eventType }); return res.status(200).send('ok'); }

  const isAdjustment = eventType.startsWith('adjustment.');
  const inserted = await repo.insertPaymentEventIfNew({
    provider: 'paddle',
    provider_event_id: eventId,
    order_id: String(data.id || data.transaction_id || ''),
    event_type: eventType,
    payload: isAdjustment ? sanitizeAdjustmentPayload(data) : sanitizeTransactionPayload(data),
    verified: true
  });
  if (!inserted.inserted) return res.status(200).send('ok'); // Already processed this exact event - idempotent no-op.

  if (eventType === 'transaction.completed') {
    const leadId = data.custom_data?.lead_id;
    if (!leadId) { log.warn('paddle_missing_lead_id', { transactionId: data.id }); return res.status(200).send('ok'); }
    const lead = await repo.getLead(leadId);
    if (!lead) { log.warn('paddle_unknown_lead', { leadId, transactionId: data.id }); return res.status(200).send('ok'); }
    const purchasedPriceId = data.items?.[0]?.price_id;
    if (config.paddlePriceId && purchasedPriceId !== config.paddlePriceId) {
      log.warn('paddle_price_mismatch', { transactionId: data.id, purchasedPriceId });
      return res.status(200).send('ok');
    }
    const amount = Number(data.details?.totals?.total || 0) / 100; // Paddle totals are integer minor units (cents).
    const currency = String(data.currency_code || 'USD');
    const wasPaid = lead.payment_status === 'paid';
    await repo.upsertPayment({ lead_id: lead.id, provider: 'paddle', provider_order_id: String(data.id), status: 'paid', amount, currency, paid_at: new Date().toISOString(), raw_payload: sanitizeTransactionPayload(data) });
    if (!wasPaid) {
      await repo.updateLead(lead.id, { payment_status: 'paid', payment_provider: 'paddle', payment_order_id: String(data.id), payment_amount: amount, payment_currency: currency, paid_at: new Date().toISOString(), generation_status: 'manual_pending' });
      await repo.insertAnalytics({ session_id: 'paddle', lead_id: lead.id, event_name: 'payment_success', metadata: { transactionId: String(data.id), amount, currency } });
    }
  } else if (isAdjustment && data.status === 'approved') {
    const payment = await repo.getPaymentByOrderId('paddle', String(data.transaction_id || ''));
    if (!payment) { log.warn('paddle_adjustment_unknown_transaction', { transactionId: data.transaction_id }); return res.status(200).send('ok'); }
    const isChargeback = data.action === 'chargeback' || data.action === 'chargeback_warning';
    const adjustedAmount = Number(data.totals?.total || 0) / 100;
    const isFullRefund = data.action === 'refund' && adjustedAmount >= Number(payment.amount || 0) - 0.01;
    const status = isChargeback ? 'chargeback' : data.action === 'refund' ? (isFullRefund ? 'refunded' : 'partially_refunded') : payment.status;
    if (status !== payment.status) {
      await repo.upsertPayment({ lead_id: payment.lead_id, provider: 'paddle', provider_order_id: payment.provider_order_id, status, amount: payment.amount, currency: payment.currency, refunded_at: new Date().toISOString(), raw_payload: sanitizeAdjustmentPayload(data) });
      await repo.updateLead(payment.lead_id, { payment_status: status });
    }
  }

  res.status(200).send('ok');
} catch (e) { next(e); } });

export default router;
