import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('confirmation page sends one browser Purchase with stable order data', async () => {
  const source = fs.readFileSync(new URL('../public/meta-pixel.js', import.meta.url), 'utf8');
  const calls = [];
  const storage = new Map();
  const window = { fbq:(...args) => calls.push(args) };
  const context = {
    window,
    document:{ getElementsByTagName:() => [] },
    localStorage:{
      getItem:key => storage.get(key) || null,
      setItem:(key,value) => storage.set(key,value)
    },
    fetch:async () => ({ ok:true, json:async () => ({ pixelId:'123456789', leadPixelId:'987654321' }) })
  };

  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));

  const purchase = { eventId:'crypto:0xabc', orderId:'0xabc', value:6.99, currency:'usd' };
  await window.metaTrackPurchase(purchase);
  await window.metaTrackPurchase(purchase);

  const purchaseCalls = calls.filter(args => args[0] === 'track' && args[1] === 'Purchase');
  assert.equal(purchaseCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(purchaseCalls[0][2])), {
    value:6.99,
    currency:'USD',
    content_name:'PremiumHairstyles AI',
    content_type:'product',
    order_id:'0xabc'
  });
  assert.equal(purchaseCalls[0][3].eventID, 'crypto:0xabc');

  await window.metaTrackLead({ eventId:'lead:lead-1' });
  await window.metaTrackLead({ eventId:'lead:lead-1' });
  const leadCalls = calls.filter(args => args[0] === 'trackSingle' && args[2] === 'Lead');
  assert.equal(leadCalls.length, 1);
  assert.equal(leadCalls[0][1], '987654321');
  assert.equal(leadCalls[0][4].eventID, 'lead:lead-1');
});

test('Conversions API Purchase uses the same event id as the browser Pixel', async () => {
  process.env.META_PIXEL_ID = '123456789';
  process.env.META_LEAD_PIXEL_ID = '987654321';
  process.env.META_CONVERSIONS_API_TOKEN = 'test-token';
  process.env.APP_URL = 'https://example.com';

  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url:String(url), options };
    return { ok:true, json:async () => ({ events_received:1 }) };
  };

  try {
    const { sendMetaPurchase } = await import('../src/lib/meta.js');
    const result = await sendMetaPurchase({
      lead:{ id:'lead-1', email:'Customer@Example.com' },
      txHash:'0xabc',
      value:6.99,
      request:{ ip:'203.0.113.10', headers:{ 'user-agent':'test-agent' }, cookies:{} }
    });

    assert.equal(result.ok, true);
    const payload = JSON.parse(request.options.body);
    assert.equal(payload.data[0].event_name, 'Purchase');
    assert.equal(payload.data[0].event_id, 'crypto:0xabc');
    assert.equal(payload.data[0].custom_data.order_id, '0xabc');
    assert.equal(payload.data[0].custom_data.value, 6.99);
    assert.equal(payload.data[0].custom_data.currency, 'USD');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('verified email sends a deduplicated Lead to the dedicated Meta dataset', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url:String(url), options };
    return { ok:true, json:async () => ({ events_received:1 }) };
  };

  try {
    const { sendMetaLead } = await import('../src/lib/meta.js');
    const result = await sendMetaLead({
      lead:{ id:'lead-1', email:'Customer@Example.com', email_verified_at:new Date().toISOString() },
      eventId:'lead:lead-1',
      request:{ ip:'203.0.113.10', headers:{ 'user-agent':'test-agent' }, cookies:{ _fbp:'fb.1.test' } }
    });

    assert.equal(result.ok, true);
    assert.match(request.url,/\/987654321\/events/);
    const payload = JSON.parse(request.options.body);
    assert.equal(payload.data[0].event_name, 'Lead');
    assert.equal(payload.data[0].event_id, 'lead:lead-1');
    assert.equal(payload.data[0].custom_data.status, 'verified');
    assert.equal(payload.data[0].user_data.fbp, 'fb.1.test');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
