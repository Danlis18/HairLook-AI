import { Router } from 'express';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { verifyWebhook, parseCustomFields, verifyLeadCorrelation, sanitizeWebhookPayload, paymentEventId } from '../lib/paypro.js';
import { log } from '../lib/log.js';

const router=Router();

router.post('/paypro',async(req,res,next)=>{try{
  const body=req.body||{};const verified=verifyWebhook(body);
  if(!verified.ok){log.warn('paypro_webhook_rejected',{reason:verified.reason,orderId:body.ORDER_ID});return res.status(400).send('invalid');}
  if(verified.testMode!==config.payproTestMode){log.warn('paypro_environment_mismatch',{orderId:body.ORDER_ID,testMode:verified.testMode});return res.status(200).send('ok');}
  if(String(body.PRODUCT_ID||'')!==String(config.payproProductId)){log.warn('paypro_product_mismatch',{productId:body.PRODUCT_ID});return res.status(200).send('ok');}
  const custom=parseCustomFields(body.ORDER_CUSTOM_FIELDS||'');const leadId=custom['x-lead-id']||custom['x_lead_id']||custom['lead-id'];const leadSig=custom['x-lead-sig']||custom['x_lead_sig'];
  if(!verifyLeadCorrelation(leadId,leadSig)){log.warn('paypro_bad_lead_correlation',{orderId:body.ORDER_ID});return res.status(200).send('ok');}
  const providerEventId=paymentEventId(body);const safePayload=sanitizeWebhookPayload(body);
  const inserted=await repo.insertPaymentEventIfNew({provider:'paypro_global',provider_event_id:providerEventId,order_id:String(body.ORDER_ID||''),event_type:String(body.IPN_TYPE_NAME||''),payload:safePayload,verified:true});
  if(!inserted.inserted)return res.status(200).send('ok');
  const lead=await repo.getLead(leadId);if(!lead){log.warn('paypro_unknown_lead',{leadId,orderId:body.ORDER_ID});return res.status(200).send('ok');}
  const type=String(body.IPN_TYPE_NAME||'');const status=String(body.ORDER_STATUS||'');const amount=Number(body.ORDER_TOTAL_AMOUNT||0);const currency=String(body.ORDER_CURRENCY_CODE||body.ORDER_BILLING_CURRENCY_CODE||config.payproCurrency);
  if(type==='OrderCharged' && status==='Processed'){
    await repo.upsertPayment({lead_id:lead.id,provider:'paypro_global',provider_order_id:String(body.ORDER_ID),status:'paid',amount,currency,paid_at:new Date().toISOString(),raw_payload:safePayload});
    const wasPaid=lead.payment_status==='paid';await repo.updateLead(lead.id,{payment_status:'paid',payment_order_id:String(body.ORDER_ID),payment_amount:amount,payment_currency:currency,paid_at:new Date().toISOString(),generation_status:wasPaid?lead.generation_status:'manual_pending'});
    if(!wasPaid){await repo.insertAnalytics({session_id:'paypro',lead_id:lead.id,event_name:'payment_success',metadata:{orderId:String(body.ORDER_ID),amount,currency}});}
  } else if(type==='OrderRefunded') {
    await repo.upsertPayment({lead_id:lead.id,provider:'paypro_global',provider_order_id:String(body.ORDER_ID),status:'refunded',amount,currency,refunded_at:new Date().toISOString(),raw_payload:safePayload});await repo.updateLead(lead.id,{payment_status:'refunded'});
  } else if(type==='OrderPartiallyRefunded') {
    await repo.upsertPayment({lead_id:lead.id,provider:'paypro_global',provider_order_id:String(body.ORDER_ID),status:'partially_refunded',amount,currency,raw_payload:safePayload});await repo.updateLead(lead.id,{payment_status:'partially_refunded'});
  } else if(type==='OrderChargedBack') {
    await repo.upsertPayment({lead_id:lead.id,provider:'paypro_global',provider_order_id:String(body.ORDER_ID),status:'chargeback',amount,currency,raw_payload:safePayload});await repo.updateLead(lead.id,{payment_status:'chargeback'});
  } else if(type==='OrderDeclined') {
    await repo.upsertPayment({lead_id:lead.id,provider:'paypro_global',provider_order_id:String(body.ORDER_ID),status:'declined',amount,currency,raw_payload:safePayload});await repo.updateLead(lead.id,{payment_status:'declined'});
  } else if(type==='OrderOnWaiting') {
    await repo.updateLead(lead.id,{payment_status:'waiting'});
  }
  res.status(200).send('ok');
}catch(e){next(e);}});

export default router;
