import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { config } from '../config.js';
import { getSupabase } from '../lib/supabase.js';
import { repo } from '../lib/repository.js';
import { log } from '../lib/log.js';
import { sendMetaPurchase } from '../lib/meta.js';
import { leadSession, sameOrigin, noStore } from '../middleware.js';

const router = Router();
const TRON_USDT='TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const ETH_USDT='0xdac17f958d2ee523a2206206994597c13d831ec7';
const BSC_USDT='0x55d398326f99059ff775485246999027b3197955';
const nets={
  trc20:{code:'TRC20',label:'TRON',address:config.cryptoTrc20Address,contract:TRON_USDT,decimals:6,confirmations:1},
  erc20:{code:'ERC20',label:'Ethereum',address:config.cryptoErc20Address,contract:ETH_USDT,decimals:6,confirmations:config.cryptoErc20Confirmations},
  bep20:{code:'BEP20',label:'BNB Smart Chain',address:config.cryptoBep20Address,contract:BSC_USDT,decimals:18,confirmations:config.cryptoBep20Confirmations}
};
const lower=v=>String(v||'').toLowerCase();
const now=()=>new Date().toISOString();

function units(value,decimals){
  const [w='0',f='']=String(value??0).split('.');
  return BigInt(w||0)*10n**BigInt(decimals)+BigInt((f+'0'.repeat(decimals)).slice(0,decimals)||0);
}
function absBig(v){return v<0n?-v:v;}
function paymentTag(valueUnits,decimals){
  const divisor=10n**BigInt(Math.max(0,decimals-4));
  return (valueUnits/divisor)%100n;
}
function decimalFromUnits(value,decimals){
  const scale=10n**BigInt(decimals),whole=value/scale,fraction=String(value%scale).padStart(decimals,'0').replace(/0+$/,'');
  return fraction?`${whole}.${fraction}`:String(whole);
}
function amountMatches(received,target,decimals){
  if(received===target)return true;
  const tolerance=units(config.cryptoPaymentToleranceUsdt,decimals);
  if(absBig(received-target)>tolerance)return false;
  // Preserve the unique last-two-digit invoice tag. A fee expressed to cents (0.01 USDT)
  // changes the main amount but keeps this tag, preventing a payment from matching another order.
  return paymentTag(received,decimals)===paymentTag(target,decimals);
}
function verifierReady(network){
  if(!config.cryptoAutoVerify)return false;
  if(network==='trc20')return true;
  if(network==='erc20')return !!config.etherscanApiKey;
  if(network==='bep20')return true; // BscScan is attempted with an optional key; keyless calls are rate-limited.
  return false;
}
function expose(row){
  const n=nets[row.network];
  return {
    id:row.id,network:row.network,networkCode:n.code,networkLabel:n.label,asset:'USDT',address:row.address,
    amount:Number(row.amount).toFixed(4),baseAmount:Number(row.base_amount).toFixed(2),status:row.status,
    txHash:row.tx_hash||null,confirmations:Number(row.confirmations||0),requiredConfirmations:n.confirmations,
    expiresAt:row.expires_at,paidAt:row.paid_at||null,verificationReady:verifierReady(row.network),
    toleranceUsdt:config.cryptoPaymentToleranceUsdt
  };
}

async function allocate(sb,network){
  // 4 decimal places maximum. The final two digits act as a compact order fingerprint.
  const scale=10000n;
  const base=BigInt(Math.round(config.cryptoPriceUsdt*Number(scale)));
  const {data:active,error:activeError}=await sb.from('crypto_payment_intents').select('amount').eq('network',network).eq('status','pending').gt('expires_at',now());
  if(activeError)throw activeError;
  const usedTags=new Set((active||[]).map(x=>String(Math.round(Number(x.amount)*10000)%100).padStart(2,'0')));
  for(let i=0;i<60;i++){
    const suffix=randomInt(1,100);
    const tag=String(suffix).padStart(2,'0');
    if(usedTags.has(tag))continue;
    const raw=base+BigInt(suffix);
    const amount=`${raw/scale}.${String(raw%scale).padStart(4,'0')}`;
    const {data,error}=await sb.from('crypto_payment_intents').select('id').eq('network',network).eq('amount',amount).eq('status','pending').gt('expires_at',now()).limit(1);
    if(error)throw error;
    if(!data?.length)return amount;
  }
  throw new Error('crypto_amount_allocation_failed');
}
async function makeIntent(lead,network){
  const n=nets[network];if(!n?.address)throw new Error('crypto_network_not_configured');
  const sb=getSupabase();
  await sb.from('crypto_payment_intents').update({status:'expired',updated_at:now()}).eq('lead_id',lead.id).eq('status','pending').lte('expires_at',now());
  const {data:existing,error:e1}=await sb.from('crypto_payment_intents').select('*').eq('lead_id',lead.id).eq('network',network).eq('status','pending').gt('expires_at',now()).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(e1)throw e1;
  if(existing){
    const fraction=(String(existing.amount).split('.')[1]||'').replace(/0+$/,'');
    if(fraction.length<=4)return existing;
    await sb.from('crypto_payment_intents').update({status:'canceled',updated_at:now()}).eq('id',existing.id).eq('status','pending');
  }
  await sb.from('crypto_payment_intents').update({status:'canceled',updated_at:now()}).eq('lead_id',lead.id).eq('status','pending');
  for(let i=0;i<5;i++){
    const amount=await allocate(sb,network),expiresAt=new Date(Date.now()+config.cryptoIntentTtlMinutes*60000).toISOString();
    const {data,error}=await sb.from('crypto_payment_intents').insert({lead_id:lead.id,network,asset:'USDT',address:n.address,base_amount:config.cryptoPriceUsdt.toFixed(6),amount,status:'pending',expires_at:expiresAt}).select('*').single();
    if(!error)return data;
    if(error.code!=='23505')throw error;
  }
  throw new Error('crypto_intent_create_failed');
}

async function tron(intent){
  const u=new URL(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(intent.address)}/transactions/trc20`);
  u.searchParams.set('only_confirmed','true');u.searchParams.set('limit','200');u.searchParams.set('contract_address',TRON_USDT);
  const headers={accept:'application/json'};if(config.tronGridApiKey)headers['TRON-PRO-API-KEY']=config.tronGridApiKey;
  const r=await fetch(u,{headers,signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`trongrid_${r.status}`);
  const j=await r.json(),target=units(intent.amount,6),after=new Date(intent.created_at).getTime()-60000,before=new Date(intent.expires_at).getTime()+120000;
  for(const x of j.data||[]){
    if(x.token_info?.address&&x.token_info.address!==TRON_USDT)continue;
    if(String(x.to||'')!==intent.address)continue;
    const ts=Number(x.block_timestamp||0);if(ts<after||ts>before)continue;
    const received=BigInt(String(x.value||0));
    if(!amountMatches(received,target,6))continue;
    return{hash:String(x.transaction_id||''),from:String(x.from||''),confirmations:1,receivedAmount:decimalFromUnits(received,6)};
  }
  return null;
}

function rowsFromExplorerPayload(j,kind){
  if(Array.isArray(j?.result))return j.result;
  const msg=String(j?.result||j?.message||'').toLowerCase();
  if(msg.includes('no transactions found'))return [];
  throw new Error(`${kind}_api_${String(j?.result||j?.message||'invalid_response').slice(0,160)}`);
}
async function fetchEtherscanRows(intent,kind){
  const isEth=kind==='erc20';
  if(!config.etherscanApiKey)throw new Error(`${kind}_etherscan_key_missing`);
  const u=new URL('https://api.etherscan.io/v2/api');
  for(const [k,v] of Object.entries({chainid:isEth?'1':'56',module:'account',action:'tokentx',contractaddress:isEth?ETH_USDT:BSC_USDT,address:intent.address,page:'1',offset:'100',sort:'desc',apikey:config.etherscanApiKey}))u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`${kind}_etherscan_${r.status}`);
  return rowsFromExplorerPayload(await r.json(),`${kind}_etherscan`);
}
async function fetchBscScanRows(intent){
  const u=new URL('https://api.bscscan.com/api');
  const params={module:'account',action:'tokentx',contractaddress:BSC_USDT,address:intent.address,page:'1',offset:'100',sort:'desc'};
  if(config.bscscanApiKey)params.apikey=config.bscscanApiKey;
  for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`bep20_bscscan_${r.status}`);
  return rowsFromExplorerPayload(await r.json(),'bep20_bscscan');
}
async function evm(intent,kind){
  const isEth=kind==='erc20',contract=isEth?ETH_USDT:BSC_USDT;
  let rows;
  if(isEth){
    rows=await fetchEtherscanRows(intent,kind);
  }else{
    let bscError=null;
    try{rows=await fetchBscScanRows(intent);}catch(e){bscError=e;}
    if(!rows){
      try{rows=await fetchEtherscanRows(intent,kind);}catch(e){throw new Error(`${bscError?.message||'bscscan_failed'}; ${e.message}`);}
    }
  }
  const after=Math.floor(new Date(intent.created_at).getTime()/1000)-60,before=Math.floor(new Date(intent.expires_at).getTime()/1000)+120;
  for(const x of rows||[]){
    const ts=Number(x.timeStamp||0);
    if(lower(x.contractAddress)!==contract||lower(x.to)!==lower(intent.address)||ts<after||ts>before)continue;
    const d=Number(x.tokenDecimal||nets[kind].decimals),received=BigInt(String(x.value||0)),target=units(intent.amount,d);
    if(!amountMatches(received,target,d))continue;
    const c=Number(x.confirmations||0);if(c<nets[kind].confirmations)continue;
    return{hash:String(x.hash||''),from:String(x.from||''),confirmations:c,receivedAmount:decimalFromUnits(received,d)};
  }
  return null;
}
async function detect(intent){if(!verifierReady(intent.network))return null;if(intent.network==='trc20')return tron(intent);return evm(intent,intent.network);}

async function markPaid(intent,match,request){
  if(!match?.hash)return intent;const sb=getSupabase();
  const {data:used,error:ue}=await sb.from('crypto_payment_intents').select('id').eq('tx_hash',match.hash).limit(1);if(ue)throw ue;if(used?.length&&used[0].id!==intent.id)return intent;
  const paidAt=now(),receivedAmount=Number(match.receivedAmount||intent.amount);
  const {data:paid,error}=await sb.from('crypto_payment_intents').update({status:'paid',tx_hash:match.hash,from_address:match.from||null,confirmations:match.confirmations||0,paid_at:paidAt,updated_at:paidAt}).eq('id',intent.id).eq('status','pending').select('*').maybeSingle();
  if(error)throw error;if(!paid)return intent;
  const provider=`crypto_${intent.network}`;
  await repo.insertPaymentEventIfNew({provider,provider_event_id:`${intent.network}:${match.hash}`,order_id:match.hash,event_type:'payment_confirmed',payload:{network:intent.network,asset:'USDT',expectedAmount:Number(intent.amount),receivedAmount,to:intent.address,from:match.from||null,confirmations:match.confirmations||0,toleranceUsdt:config.cryptoPaymentToleranceUsdt},verified:true});
  await repo.upsertPayment({lead_id:intent.lead_id,provider,provider_order_id:match.hash,status:'paid',amount:receivedAmount,currency:'USDT',paid_at:paidAt,raw_payload:{network:intent.network,intent_id:intent.id,expected_amount:Number(intent.amount),received_amount:receivedAmount,to:intent.address,from:match.from||null,confirmations:match.confirmations||0}});
  const updatedLead=await repo.updateLead(intent.lead_id,{payment_status:'paid',payment_provider:provider,payment_order_id:match.hash,payment_amount:receivedAmount,payment_currency:'USDT',paid_at:paidAt,generation_status:'manual_pending'});
  await repo.insertAnalytics({session_id:'crypto',lead_id:intent.lead_id,event_name:'payment_success',metadata:{provider,network:intent.network,txHash:match.hash,expectedAmount:Number(intent.amount),receivedAmount,currency:'USDT'}});
  await sendMetaPurchase({lead:updatedLead,txHash:match.hash,request,value:config.cryptoPriceUsdt});
  return paid;
}
async function refresh(intent,request){
  const sb=getSupabase();if(intent.status!=='pending')return intent;
  // Check the chain first, even if the UI timer has just expired. This accepts a payment that was
  // actually sent before expiry but became visible to our verifier a little later.
  const match=await detect(intent);if(match)return markPaid(intent,match,request);
  if(new Date(intent.expires_at).getTime()<=Date.now()){
    const {data,error}=await sb.from('crypto_payment_intents').update({status:'expired',updated_at:now()}).eq('id',intent.id).eq('status','pending').select('*').single();if(error)throw error;return data;
  }
  return intent;
}

router.post('/intents',sameOrigin,leadSession,async(req,res,next)=>{try{
  if(!config.checkoutEnabled)return res.status(503).json({error:'checkout_disabled'});
  if(config.emailVerificationEnabled&&!req.lead.email_verified_at)return res.status(403).json({error:'email_verification_required'});
  if(req.lead.upload_status!=='ready')return res.status(409).json({error:'upload_not_ready'});
  if(req.lead.payment_status==='paid')return res.json({alreadyPaid:true,redirect:'/dashboard'});
  const network=String(req.body?.network||'').toLowerCase();if(!nets[network])return res.status(400).json({error:'unsupported_network'});
  const intent=await makeIntent(req.lead,network);
  await repo.updateLead(req.lead.id,{payment_status:'checkout_started',payment_provider:`crypto_${network}`});
  await repo.insertAnalytics({session_id:req.body?.sessionId||'unknown',lead_id:req.lead.id,event_name:'checkout_start',metadata:{provider:'crypto',network}});
  res.status(201).json({intent:expose(intent)});
}catch(e){next(e);}});

async function status(req,res,next,manual=false){try{
  const sb=getSupabase();const {data,error}=await sb.from('crypto_payment_intents').select('*').eq('id',req.params.id).eq('lead_id',req.lead.id).maybeSingle();
  if(error)throw error;if(!data)return res.status(404).json({error:'intent_not_found'});
  let intent=data;
  try{intent=await refresh(intent,req);}catch(e){
    log.warn('crypto_verify_failed',{intentId:intent.id,network:intent.network,error:e.message});
    if(manual)return res.status(503).json({error:'verification_temporarily_unavailable',details:config.isProduction?undefined:e.message,intent:expose(intent)});
    return res.json({intent:expose(intent),verificationError:'temporary_verification_error'});
  }
  res.json({intent:expose(intent),redirect:intent.status==='paid'?'/dashboard':null});
}catch(e){next(e);}}
router.get('/intents/:id/status',noStore,leadSession,(req,res,next)=>status(req,res,next,false));
router.post('/intents/:id/check',sameOrigin,noStore,leadSession,(req,res,next)=>status(req,res,next,true));
router.get('/networks',noStore,leadSession,(req,res)=>res.json({priceUsdt:config.cryptoPriceUsdt,ttlMinutes:config.cryptoIntentTtlMinutes,toleranceUsdt:config.cryptoPaymentToleranceUsdt,networks:Object.entries(nets).map(([id,n])=>({id,code:n.code,label:n.label,address:n.address,enabled:!!n.address,verificationReady:verifierReady(id)}))}));

export default router;