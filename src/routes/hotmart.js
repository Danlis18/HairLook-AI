import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { log } from '../lib/log.js';
import { leadSession, sameOrigin } from '../middleware.js';
import { queueRealPaidGeneration } from '../services/fulfillment.js';

const router = Router();

function safeEqualText(a='', b='') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function checkoutUrl(email) {
  const url = new URL(config.hotmartCheckoutUrl);
  url.searchParams.set('email', String(email || '').trim().toLowerCase());
  url.searchParams.set('sck', 'premiumhairstyles');
  return url.toString();
}

function sanitizeHotmartPayload(body={}) {
  const data = body.data || {};
  const purchase = data.purchase || {};
  return {
    id: String(body.id || ''),
    event: String(body.event || ''),
    version: String(body.version || ''),
    creation_date: body.creation_date || null,
    product: {
      id: data.product?.id ?? null,
      ucode: data.product?.ucode || null,
      name: data.product?.name || null
    },
    buyer: {
      email: data.buyer?.email || null
    },
    purchase: {
      transaction: purchase.transaction || null,
      status: purchase.status || null,
      approved_date: purchase.approved_date || null,
      price: purchase.price || null,
      full_price: purchase.full_price || null,
      payment_type: purchase.payment?.type || null,
      offer_code: purchase.offer?.code || null,
      origin: purchase.origin || null
    }
  };
}

router.post('/checkout', sameOrigin, leadSession, async (req,res,next) => { try {
  if(req.lead.access_mode==='reviewer_demo')return res.status(403).json({error:'reviewer_demo_no_real_payment'});
  const settings = await repo.getSettings();
  if (String(settings.checkout_enabled ?? config.checkoutEnabled) === 'false') return res.status(503).json({ error:'checkout_disabled' });
  if (config.emailVerificationEnabled && !req.lead.email_verified_at) return res.status(403).json({ error:'email_verification_required' });
  if (req.lead.upload_status !== 'ready') return res.status(409).json({ error:'upload_not_ready' });
  if (req.lead.payment_status === 'paid') return res.json({ checkoutUrl:'/dashboard', alreadyPaid:true });
  if (req.body?.acceptedPurchaseTerms !== true) return res.status(400).json({ error:'purchase_terms_required' });
  if (!config.hotmartCheckoutUrl) return res.status(503).json({ error:'checkout_not_configured' });

  await repo.updateLead(req.lead.id, { payment_status:'checkout_started', payment_provider:'hotmart' });
  await repo.insertAnalytics({
    session_id:req.body?.sessionId || 'unknown',
    lead_id:req.lead.id,
    event_name:'purchase_terms_accepted',
    metadata:{ product:'personalized_hairstyle_collection', price:config.priceDisplayUsd, provider:'hotmart' }
  });
  await repo.insertAnalytics({
    session_id:req.body?.sessionId || 'unknown',
    lead_id:req.lead.id,
    event_name:'checkout_start',
    metadata:{ provider:'hotmart' }
  });

  res.json({ checkoutUrl:checkoutUrl(req.lead.email), provider:'hotmart' });
} catch (e) { next(e); } });

router.post('/webhook', async (req,res,next) => { try {
  const token = req.get('X-HOTMART-HOTTOK') || '';
  if (!config.hotmartHottok || !safeEqualText(token, config.hotmartHottok)) {
    log.warn('hotmart_webhook_rejected', { reason:'invalid_hottok' });
    return res.status(401).send('invalid');
  }

  const body = req.body || {};
  const eventId = String(body.id || '');
  const eventType = String(body.event || '');
  const data = body.data || {};
  const productId = String(data.product?.id ?? '');
  const purchase = data.purchase || {};
  const transaction = String(purchase.transaction || '');
  const buyerEmail = String(data.buyer?.email || '').trim().toLowerCase();

  if (!eventId || !eventType) return res.status(200).send('ok');
  if (config.hotmartProductId && productId !== String(config.hotmartProductId)) {
    log.warn('hotmart_product_mismatch', { eventId, productId });
    return res.status(200).send('ok');
  }

  const safePayload = sanitizeHotmartPayload(body);
  const inserted = await repo.insertPaymentEventIfNew({
    provider:'hotmart',
    provider_event_id:eventId,
    order_id:transaction,
    event_type:eventType,
    payload:safePayload,
    verified:true
  });
  if (!inserted.inserted) return res.status(200).send('ok');

  if (!buyerEmail || !transaction) {
    log.warn('hotmart_webhook_missing_correlation', { eventId, eventType, buyerEmail:!!buyerEmail, transaction:!!transaction });
    return res.status(200).send('ok');
  }

  const lead = await repo.getLeadByEmail(buyerEmail);
  if (!lead) {
    log.warn('hotmart_unknown_buyer', { eventId, transaction, buyerEmail });
    return res.status(200).send('ok');
  }

  const amount = Number(purchase.price?.value ?? purchase.full_price?.value ?? 0);
  const currency = String(purchase.price?.currency_value || purchase.full_price?.currency_value || config.siteCurrency || 'BRL');
  const paidEvents = new Set(['PURCHASE_APPROVED','PURCHASE_COMPLETE']);
  const reversalMap = {
    PURCHASE_REFUNDED:'refunded',
    PURCHASE_CHARGEBACK:'chargeback',
    PURCHASE_CANCELED:'canceled',
    PURCHASE_EXPIRED:'expired'
  };

  if (paidEvents.has(eventType)) {
    const wasPaid = lead.payment_status === 'paid';
    const paidAt = purchase.approved_date ? new Date(Number(purchase.approved_date)).toISOString() : new Date().toISOString();
    await repo.upsertPayment({
      lead_id:lead.id,
      provider:'hotmart',
      provider_order_id:transaction,
      status:'paid',
      amount,
      currency,
      paid_at:paidAt,
      raw_payload:safePayload
    });
    if (!wasPaid) {
      const updatedLead=await repo.updateLead(lead.id, {
        payment_status:'paid',
        payment_provider:'hotmart',
        payment_order_id:transaction,
        payment_amount:amount,
        payment_currency:currency,
        paid_at:paidAt,
        generation_status:'manual_pending'
      });
      await repo.insertAnalytics({
        session_id:'hotmart',
        lead_id:lead.id,
        event_name:'payment_success',
        metadata:{ transactionId:transaction, amount, currency, paymentType:purchase.payment?.type || null }
      });
      await queueRealPaidGeneration(updatedLead).catch(error=>log.error('paid_generation_queue_failed',{leadId:updatedLead.id,provider:'hotmart',error:error.message}));
    }
  } else if (reversalMap[eventType]) {
    const status = reversalMap[eventType];
    const existing = await repo.getPaymentByOrderId('hotmart', transaction);
    if (existing) {
      await repo.upsertPayment({
        lead_id:existing.lead_id,
        provider:'hotmart',
        provider_order_id:transaction,
        status,
        amount:existing.amount,
        currency:existing.currency,
        paid_at:existing.paid_at,
        refunded_at:['refunded','chargeback'].includes(status) ? new Date().toISOString() : existing.refunded_at,
        raw_payload:safePayload
      });
    }
    await repo.updateLead(lead.id, { payment_status:status, payment_provider:'hotmart' });
  }

  res.status(200).send('ok');
} catch (e) { next(e); } });

export default router;
