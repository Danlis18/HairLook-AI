import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { log } from './log.js';

const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const normalizedEmail = value => String(value || '').trim().toLowerCase();

function graphUrl(pixelId) {
  const base = 'https://graph.facebook.com';
  const version = String(config.metaGraphApiVersion || '').trim().replace(/^\/+|\/+$/g, '');
  return `${base}${version ? `/${version}` : ''}/${encodeURIComponent(pixelId)}/events`;
}

function userDataFor(lead, request) {
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
  return userData;
}

async function sendMetaEvent({ pixelId, payload, eventId, logName, context = {} }) {
  if (config.metaTestEventCode) payload.test_event_code = config.metaTestEventCode;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL(graphUrl(pixelId));
    url.searchParams.set('access_token', config.metaConversionsApiToken);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type':'application/json', accept:'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      log.warn(`${logName}_failed`, { status:response.status, error:body?.error?.message || 'unknown_error', ...context });
      return { ok:false, status:response.status, eventId };
    }
    log.info(`${logName}_sent`, { eventId, eventsReceived:body?.events_received ?? null, ...context });
    return { ok:true, eventId };
  } catch (error) {
    log.warn(`${logName}_failed`, { error:error?.message || String(error), ...context });
    return { ok:false, eventId };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMetaPurchase({ lead, txHash, request, value = config.cryptoPriceUsdt }) {
  if (!config.metaPixelId || !config.metaConversionsApiToken || !lead?.email || !txHash) return { skipped:true };

  const eventId = `crypto:${txHash}`;
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: `${config.appUrl}/dashboard`,
      action_source: 'website',
      user_data: userDataFor(lead, request),
      custom_data: {
        currency: 'USD',
        value: Number(value),
        order_id: String(txHash),
        content_name: config.productName,
        content_type: 'product'
      }
    }]
  };
  return sendMetaEvent({ pixelId:config.metaPixelId, payload, eventId, logName:'meta_purchase', context:{ txHash } });
}

export async function sendMetaLead({ lead, request, eventId = `lead:${lead?.id || ''}` }) {
  if (!config.metaLeadPixelId || !config.metaConversionsApiToken || !lead?.email || !lead?.id) return { skipped:true, eventId };
  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: config.appUrl,
      action_source: 'website',
      user_data: userDataFor(lead, request),
      custom_data: {
        content_name: 'Verified Email Registration',
        content_category: 'email_verification',
        status: 'verified'
      }
    }]
  };
  return sendMetaEvent({ pixelId:config.metaLeadPixelId, payload, eventId, logName:'meta_lead', context:{ leadId:lead.id } });
}
