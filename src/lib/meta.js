import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { log } from './log.js';

const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const normalizedEmail = value => String(value || '').trim().toLowerCase();

function graphUrl() {
  const base = 'https://graph.facebook.com';
  const version = String(config.metaGraphApiVersion || '').trim().replace(/^\/+|\/+$/g, '');
  return `${base}${version ? `/${version}` : ''}/${encodeURIComponent(config.metaPixelId)}/events`;
}

export async function sendMetaPurchase({ lead, txHash, request, value = config.cryptoPriceUsdt }) {
  if (!config.metaPixelId || !config.metaConversionsApiToken || !lead?.email || !txHash) return { skipped:true };

  const userData = {
    em: [sha256(normalizedEmail(lead.email))],
    external_id: [sha256(String(lead.id))]
  };

  const ip = request?.ip || request?.socket?.remoteAddress || '';
  const ua = request?.get?.('user-agent') || request?.headers?.['user-agent'] || '';
  const fbp = request?.cookies?._fbp || '';
  const fbc = request?.cookies?._fbc || '';
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const eventId = `crypto:${txHash}`;
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: `${config.appUrl}/dashboard`,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        currency: 'USD',
        value: Number(value),
        order_id: String(txHash),
        content_name: config.productName,
        content_type: 'product'
      }
    }]
  };
  if (config.metaTestEventCode) payload.test_event_code = config.metaTestEventCode;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL(graphUrl());
    url.searchParams.set('access_token', config.metaConversionsApiToken);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type':'application/json', accept:'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      log.warn('meta_purchase_failed', { status:response.status, error:body?.error?.message || 'unknown_error', txHash });
      return { ok:false, status:response.status };
    }
    log.info('meta_purchase_sent', { txHash, eventId, eventsReceived:body?.events_received ?? null });
    return { ok:true, eventId };
  } catch (error) {
    log.warn('meta_purchase_failed', { error:error?.message || String(error), txHash });
    return { ok:false };
  } finally {
    clearTimeout(timer);
  }
}
