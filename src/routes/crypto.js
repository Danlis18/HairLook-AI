import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { config } from '../config.js';
import { getSupabase } from '../lib/supabase.js';
import { repo } from '../lib/repository.js';
import { log } from '../lib/log.js';
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
function verifierReady(network){
  if(!config.cryptoAutoVerify)return false;
  if(network==='trc20')return true;
  if(network==='erc20')return !!config.etherscanApiKey;
  if(network==='bep20')return !!config.bscscanApiKey;
  return false;
}
function expose(row){
  const n=nets[row.network];
  return {
    id:row.id,network:row.network,networkCode:n.code,networkLabel:n.label,asset:'USDT',address:row.address,
    amount:Number(row.amount).toFixed(4),baseAmount:Number(row.base_amount).toFixed(2),status:row.status,
    txHash:row.tx_hash||null,confirmations:Number(row.confirmations||0),requiredConfirmations:n.confirmations,
    expiresAt:row.expires_at,paidAt:row.paid_at||null,verificationReady:verifierReady(row.network)
  };
}

async function allocate(sb,network){
  // 4 decimal places maximum: base price + unique 0.0001–0.0099 suffix.
  const scale=10000n;
  const base=BigInt(Math.round(config.cryptoPriceUsdt*Number(scale)));
  for(let i=0;i<30;i++){
    const raw=base+BigInt(randomInt(1,100));
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
  const u=new URL(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(intent.address)}/transactions/trc20`);u.searchParams.set('only_confirmed','true');u.searchParams.set('limit','200');u.searchParams.set('contract_address',TRON_USDT);
  const headers={accept:'application/json'};if(config.tronGridApiKey)headers['TRON-PRO-API-KEY']=config.tronGridApiKey;
  const r=await fetch(u,{headers,signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`trongrid_${r.status}`);const j=await r.json();const target=units(intent.amount,6),after=new Date(intent.created_at).getTime()-60000;
  for(const x of j.data||[]){if(x.token_info?.address&&x.token_info.address!==TRON_USDT)continue;if(String(x.to||'')!==intent.address)continue;if(Number(x.block_timestamp||0)<after)continue;if(BigInt(String(x.value||0))!==target)continue;return{hash:String(x.transaction_id||''),from:String(x.from||''),confirmations:1};}return null;
}
async function evm(intent,kind){
  const isEth=kind==='erc20',key=isEth?config.etherscanApiKey:config.bscscanApiKey;if(!key)return null;
  const contract=isEth?ETH_USDT:BSC_USDT,u=new URL(isEth?'https://api.etherscan.io/v2/api':'https://api.bscscan.com/api');if(isEth)u.searchParams.set('chainid','1');
  for(const [k,v] of Object.entries({module:'account',action:'tokentx',contractaddress:contract,address:intent.address,page:'1',offset:'100',sort:'desc',apikey:key}))u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`${kind}_explorer_${r.status}`);const j=await r.json(),after=Math.floor(new Date(intent.created_at).getTime()/1000)-60;
  for(const x of Array.isArray(j.result)?j.result:[]){if(lower(x.contractAddress)!==contract||lower(x.to)!==lower(intent.address)||Number(x.timeStamp||0)<after)continue;const d=Number(x.tokenDecimal||nets[kind].decimals);if(BigInt(String(x.value||0))!==units(intent.amount,d))continue;const c=Number(x.confirmations||0);if(c<nets[kind].confirmations)continue;return{hash:String(x.hash||''),from:String(x.from||''),confirmations:c};}return null;
}
async function detect(intent){if(!verifierReady(intent.network))return null;if(intent.network==='trc20')return tron(intent);return evm(intent,intent.network);}

async function markPaid(intent,match){
  if(!match?.hash)return intent;const sb=getSupabase();
  const {data:used,error:ue}=await sb.from('crypto_payment_intents').select('id').eq('tx_hash',match.hash).limit(1);if(ue)throw ue;if(used?.length&&used[0].id!==intent.id)return intent;
  const paidAt=now();const {data:paid,error}=await sb.from('crypto_payment_intents').update({status:'paid',tx_hash:match.hash,from_address:match.from||null,confirmations:match.confirmations||0,paid_at:paidAt,updated_at:paidAt}).eq('id',intent.id).eq('status','pending').select('*').maybeSingle();if(error)throw error;if(!paid)return intent;
  const provider=`crypto_${intent.network}`;
  await repo.insertPaymentEventIfNew({provider,provider_event_id:`${intent.network}:${match.hash}`,order_id:match.hash,event_type:'payment_confirmed',payload:{network:intent.network,asset:'USDT',amount:Number(intent.amount),to:intent.address,from:match.from||null,confirmations:match.confirmations||0},verified:true});
  await repo.upsertPayment({lead_id:intent.lead_id,provider,provider_order_id:match.hash,status:'paid',amount:Number(intent.amount),currency:'USDT',paid_at:paidAt,raw_payload:{network:intent.network,intent_id:intent.id,to:intent.address,from:match.from||null,confirmations:match.confirmations||0}});
  await repo.updateLead(intent.lead_id,{payment_status:'paid',payment_provider:provider,payment_order_id:match.hash,payment_amount:Number(intent.amount),payment_currency:'USDT',paid_at:paidAt,generation_status:'manual_pending'});
  await repo.insertAnalytics({session_id:'crypto',lead_id:intent.lead_id,event_name:'payment_success',metadata:{provider,network:intent.network,txHash:match.hash,amount:Number(intent.amount),currency:'USDT'}});return paid;
}
async function refresh(intent){
  const sb=getSupabase();if(intent.status!=='pending')return intent;if(new Date(intent.expires_at).getTime()<=Date.now()){const {data,error}=await sb.from('crypto_payment_intents').update({status:'expired',updated_at:now()}).eq('id',intent.id).eq('status','pending').select('*').single();if(error)throw error;return data;}
  const match=await detect(intent);return match?markPaid(intent,match):intent;
}

router.post('/intents',sameOrigin,leadSession,async(req,res,next)=>{try{
  if(!config.checkoutEnabled)return res.status(503).json({error:'checkout_disabled'});if(config.emailVerificationEnabled&&!req.lead.email_verified_at)return res.status(403).json({error:'email_verification_required'});if(req.lead.upload_status!=='ready')return res.status(409).json({error:'upload_not_ready'});if(req.lead.payment_status==='paid')return res.json({alreadyPaid:true,redirect:'/dashboard'});
  const network=String(req.body?.network||'').toLowerCase();if(!nets[network])return res.status(400).json({error:'unsupported_network'});const intent=await makeIntent(req.lead,network);await repo.updateLead(req.lead.id,{payment_status:'checkout_started',payment_provider:`crypto_${network}`});await repo.insertAnalytics({session_id:req.body?.sessionId||'unknown',lead_id:req.lead.id,event_name:'checkout_start',metadata:{provider:'crypto',network}});res.status(201).json({intent:expose(intent)});
}catch(e){next(e);}});

async function status(req,res,next,manual=false){try{const sb=getSupabase();const {data,error}=await sb.from('crypto_payment_intents').select('*').eq('id',req.params.id).eq('lead_id',req.lead.id).maybeSingle();if(error)throw error;if(!data)return res.status(404).json({error:'intent_not_found'});let intent=data;try{intent=await refresh(intent);}catch(e){log.warn('crypto_verify_failed',{intentId:intent.id,network:intent.network,error:e.message});if(manual)return res.status(503).json({error:'verification_temporarily_unavailable',intent:expose(intent)});return res.json({intent:expose(intent),verificationError:'temporary_verification_error'});}res.json({intent:expose(intent),redirect:intent.status==='paid'?'/dashboard':null});}catch(e){next(e);}}
router.get('/intents/:id/status',noStore,leadSession,(req,res,next)=>status(req,res,next,false));
router.post('/intents/:id/check',sameOrigin,noStore,leadSession,(req,res,next)=>status(req,res,next,true));
router.get('/networks',noStore,leadSession,(req,res)=>res.json({priceUsdt:config.cryptoPriceUsdt,ttlMinutes:config.cryptoIntentTtlMinutes,networks:Object.entries(nets).map(([id,n])=>({id,code:n.code,label:n.label,address:n.address,enabled:!!n.address,verificationReady:verifierReady(id)}))}));

export default router;
