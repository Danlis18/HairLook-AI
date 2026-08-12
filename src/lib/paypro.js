import { config } from '../config.js';
import { md5, sha256, hmacSha256, safeEqual, eventFingerprint } from './crypto.js';

export function buildCheckoutUrl({ leadId, email }) {
  if (!config.payproProductId) throw new Error('PAYPRO_PRODUCT_ID is not configured');
  const url = new URL('https://store.payproglobal.com/checkout');
  url.searchParams.set('products[1][id]', config.payproProductId);
  url.searchParams.set('billing-email', email);
  url.searchParams.set('currency', config.payproCurrency);
  url.searchParams.set('language', config.payproLanguage);
  url.searchParams.set('x-lead-id', leadId);
  url.searchParams.set('x-lead-sig', hmacSha256(config.payproSecretKey, `hairlook:${leadId}`));
  if (config.payproPageTemplateId) url.searchParams.set('page-template', config.payproPageTemplateId);
  if (config.payproTestMode) {
    url.searchParams.set('use-test-mode', 'true');
    if (config.payproSecretKey) url.searchParams.set('secret-key', config.payproSecretKey);
  }
  return url.toString();
}

export function parseCustomFields(value='') {
  const result = {};
  String(value).split(/[,&;]/).map(x=>x.trim()).filter(Boolean).forEach(pair => {
    const idx=pair.indexOf('='); if(idx<0)return;
    const key=decodeURIComponent(pair.slice(0,idx).trim());
    const val=decodeURIComponent(pair.slice(idx+1).trim());
    result[key]=val;
  });
  return result;
}

export function verifyWebhook(body) {
  const required=['ORDER_ID','ORDER_STATUS','ORDER_TOTAL_AMOUNT','CUSTOMER_EMAIL','TEST_MODE','IPN_TYPE_NAME','SIGNATURE','HASH'];
  const missing=required.filter(k=>body[k]==null);
  if(missing.length) return {ok:false,reason:`missing:${missing.join(',')}`};
  if(!config.payproValidationKey || !config.payproSecretKey) return {ok:false,reason:'paypro_keys_not_configured'};

  const signatureInput = `${body.ORDER_ID}${body.ORDER_STATUS}${body.ORDER_TOTAL_AMOUNT}${body.CUSTOMER_EMAIL}${config.payproValidationKey}${body.TEST_MODE}${body.IPN_TYPE_NAME}`;
  const expectedSignature = sha256(signatureInput);
  const testMode = String(body.TEST_MODE)==='1' || String(body.TEST_MODE).toLowerCase()==='true';
  const expectedHash = testMode ? md5('1') : md5(`${body.ORDER_ID}${config.payproSecretKey}`);
  const signatureOk = safeEqual(String(body.SIGNATURE).toLowerCase(), expectedSignature.toLowerCase());
  const hashOk = safeEqual(String(body.HASH).toLowerCase(), expectedHash.toLowerCase());
  if(!signatureOk || !hashOk) return {ok:false,reason:!signatureOk?'bad_signature':'bad_hash'};

  return {ok:true,testMode};
}

export function verifyLeadCorrelation(leadId, signature) {
  if(!leadId || !signature || !config.payproSecretKey) return false;
  return safeEqual(String(signature).toLowerCase(), hmacSha256(config.payproSecretKey, `hairlook:${leadId}`).toLowerCase());
}

const SAFE_WEBHOOK_FIELDS = new Set([
  'IPN_TYPE_ID','IPN_TYPE_NAME','ORDER_ID','ORDER_STATUS_ID','ORDER_STATUS','PRODUCT_ID','PRODUCT_QUANTITY',
  'ORDER_ITEM_ID','ORDER_ITEM_NAME','ORDER_ITEM_TYPE_ID','ORDER_ITEM_TYPE_NAME','ORDER_ITEM_SKU',
  'ORDER_CURRENCY_CODE','ORDER_ITEM_UNIT_PRICE','ORDER_ITEM_TOTAL_AMOUNT','ORDER_TOTAL_AMOUNT','ORDER_TOTAL_AMOUNT_SHOWN',
  'ORDER_TOTAL_AMOUNT_WITH_TAXES_SHOWN','ORDER_TAXES_AMOUNT','ORDER_REFUNDED','ORDER_CUSTOM_FIELDS','CUSTOMER_EMAIL',
  'CUSTOMER_COUNTRY_CODE','CUSTOMER_COUNTRY_CODE_BY_IP','PAYMENT_METHOD_ID','PAYMENT_METHOD_NAME','ACTION_REASON',
  'TEST_MODE','IS_RESENT'
]);

export function sanitizeWebhookPayload(body={}) {
  return Object.fromEntries(Object.entries(body).filter(([key])=>SAFE_WEBHOOK_FIELDS.has(key)));
}

export function paymentEventId(body) {
  return eventFingerprint([
    body.ORDER_ID, body.IPN_TYPE_ID, body.IPN_TYPE_NAME, body.ORDER_STATUS, body.PRODUCT_ID,
    body.ORDER_TOTAL_AMOUNT, body.ORDER_REFUNDED, body.ORDER_ITEM_ID, body.SUBSCRIPTION_ID
  ]);
}
