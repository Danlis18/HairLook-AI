import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.PAYPRO_PRODUCT_ID='12345';
process.env.PAYPRO_SECRET_KEY='secret-key';
process.env.PAYPRO_VALIDATION_KEY='validation-key';
process.env.PAYPRO_TEST_MODE='false';
const { buildCheckoutUrl, verifyWebhook, parseCustomFields, verifyLeadCorrelation, sanitizeWebhookPayload } = await import('../src/lib/paypro.js');

const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const md5=s=>crypto.createHash('md5').update(s).digest('hex');

test('builds hosted PayPro Global checkout with opaque lead custom field',()=>{
 const url=new URL(buildCheckoutUrl({leadId:'550e8400-e29b-41d4-a716-446655440000',email:'person@example.com'}));
 assert.equal(url.origin,'https://store.payproglobal.com');
 assert.equal(url.pathname,'/checkout');
 assert.equal(url.searchParams.get('products[1][id]'),'12345');
 assert.equal(url.searchParams.get('billing-email'),'person@example.com');
 assert.equal(url.searchParams.get('x-lead-id'),'550e8400-e29b-41d4-a716-446655440000');
 assert.equal(verifyLeadCorrelation(url.searchParams.get('x-lead-id'),url.searchParams.get('x-lead-sig')),true);
 assert.equal(url.searchParams.has('secret-key'),false);
});

test('verifies production PayPro HASH and SIGNATURE formula',()=>{
 const body={ORDER_ID:'9001',ORDER_STATUS:'Processed',ORDER_TOTAL_AMOUNT:'15.00',CUSTOMER_EMAIL:'person@example.com',TEST_MODE:'0',IPN_TYPE_NAME:'OrderCharged'};
 body.HASH=md5(body.ORDER_ID+'secret-key');
 body.SIGNATURE=sha256(body.ORDER_ID+body.ORDER_STATUS+body.ORDER_TOTAL_AMOUNT+body.CUSTOMER_EMAIL+'validation-key'+body.TEST_MODE+body.IPN_TYPE_NAME);
 assert.deepEqual(verifyWebhook(body),{ok:true,testMode:false});
 body.SIGNATURE='bad';
 assert.equal(verifyWebhook(body).ok,false);
});

test('parses custom x-lead-id returned by IPN',()=>{
 assert.equal(parseCustomFields('x-lead-id=abc-123,foo=bar')['x-lead-id'],'abc-123');
});


test('sanitizes webhook payload before persistence',()=>{
 const clean=sanitizeWebhookPayload({ORDER_ID:'1',CUSTOMER_EMAIL:'person@example.com',CUSTOMER_IP:'203.0.113.8',CREDIT_CARD_LAST4:'4242',ORDER_CUSTOM_FIELDS:'x-lead-id=abc'});
 assert.equal(clean.ORDER_ID,'1');
 assert.equal(clean.CUSTOMER_EMAIL,'person@example.com');
 assert.equal(clean.CUSTOMER_IP,undefined);
 assert.equal(clean.CREDIT_CARD_LAST4,undefined);
});
