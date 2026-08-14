const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
let cfg={priceDisplayUsd:'6.99',generationTargetCount:30,demoMode:false};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function init(){
  const [configRes,meRes]=await Promise.all([
    fetch('/api/config',{cache:'no-store'}),
    fetch('/api/me',{cache:'no-store'})
  ]);
  if(configRes.ok)cfg=await configRes.json();
  const me=await meRes.json().catch(()=>({authenticated:false}));
  if(!meRes.ok || !me.authenticated){location.href='/signin?next=personal-plan';return;}
  if(me.lead.paymentStatus==='paid'){location.href='/dashboard';return;}
  const priceEl=$('[data-price]');
  if(priceEl)priceEl.textContent=Number(cfg.priceDisplayUsd).toFixed(2).replace(/\.00$/,'');
  const countEl=$('[data-result-count]');
  if(countEl)countEl.textContent=cfg.generationTargetCount;
  animatePlan();
}

async function animatePlan(){
  const stage=$('#analysisStage');
  const paywall=$('#paywall');
  const items=[...document.querySelectorAll('.analysis-item')];
  for(const item of items){
    item.classList.add('is-active');
    await wait(320);
    item.classList.remove('is-active');
    item.classList.add('is-done');
    const badge=item.querySelector('b');
    if(badge)badge.textContent='✓';
  }
  await wait(180);
  if(stage)stage.style.display='none';
  paywall?.classList.add('is-visible');
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'paywall_view',metadata:{price:cfg.priceDisplayUsd}})}).catch(()=>{});
}

let paddleReady=false;
function initPaddle(clientToken,environment){
  if(paddleReady)return;
  if(!window.Paddle)throw new Error('paddle_not_loaded');
  if(environment==='sandbox')Paddle.Environment.set('sandbox');
  Paddle.Initialize({token:clientToken,eventCallback:handlePaddleEvent});
  paddleReady=true;
}

function logPaddleEvent(event){
  try{console.log('paddle_event',event);}catch{}
  const name=String(event?.name||'unknown').slice(0,80);
  const metadata={name,type:String(event?.type||'').slice(0,80),code:String(event?.code||'').slice(0,160),detail:String(event?.detail||'').slice(0,500),documentationUrl:String(event?.documentation_url||'').slice(0,500)};
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:name==='checkout.error'?'paddle_checkout_error':name==='checkout.warning'?'paddle_checkout_warning':'paddle_checkout_event',metadata})}).catch(()=>{});
}

function handlePaddleEvent(event){
  logPaddleEvent(event);
  const note=$('#checkoutNote');
  if(event?.name==='checkout.error' || event?.name==='checkout.payment.error'){
    const code=event?.code?` (${event.code})`:'';
    if(note)note.textContent=`Paddle checkout error${code}: ${event?.detail||'Please try again or contact support.'}`;
    console.error('paddle_checkout_error',event); return;
  }
  if(event?.name==='checkout.warning')console.warn('paddle_checkout_warning',event);
  if(event?.name==='checkout.completed'){
    fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'checkout_completed_client',metadata:{}})}).catch(()=>{});
    location.href='/dashboard';
  }
}

$('#checkoutButton')?.addEventListener('click',async()=>{
  const btn=$('#checkoutButton');
  const note=$('#checkoutNote');
  const agreement=$('#purchaseAgreement');
  if(!agreement?.checked){
    if(note)note.textContent='Please confirm the Product Details, Terms and Refund Policy before continuing to payment.';
    agreement?.focus();
    return;
  }
  btn.disabled=true;btn.textContent='Opening secure checkout…';
  if(note)note.textContent='Opening Paddle secure checkout…';
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,acceptedPurchaseTerms:true})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'checkout_failed');
    if(data.alreadyPaid){location.href='/dashboard';return;}
    if(data.demo){location.href=data.checkoutUrl;return;}
    if(!String(data.clientToken||'').startsWith(data.environment==='sandbox'?'test_':'live_'))throw new Error('paddle_environment_mismatch');
    if(!String(data.priceId||'').startsWith('pri_'))throw new Error('paddle_price_invalid');
    initPaddle(data.clientToken,data.environment);
    Paddle.Checkout.open({items:[{priceId:data.priceId,quantity:1}],customer:{email:data.customerEmail},customData:data.customData,settings:{displayMode:'overlay',theme:'light',locale:'en',allowLogout:false,successUrl:`${location.origin}/dashboard`}});
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
  }catch(e){
    console.error('checkout_open_failed',e);
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
    const messages={email_verification_required:'Please verify your email before checkout.',upload_not_ready:'Your photo is still being prepared. Please try again in a moment.',checkout_disabled:'Checkout is temporarily unavailable.',checkout_not_configured:'Checkout is not configured yet. Please contact support.',paddle_not_loaded:'Secure checkout could not load. Please refresh and try again.',paddle_environment_mismatch:'Paddle live/sandbox configuration does not match. Please contact support.',paddle_price_invalid:'The Paddle price configuration is invalid. Please contact support.',sign_in_required:'Your secure session expired. Please restart the consultation.'};
    if(note)note.textContent=messages[e.message]||'Checkout could not be opened. Please try again or contact support.';
  }
});

init().catch(error=>{
  console.error('personal_plan_init_failed',error);
  const stage=$('#analysisStage');
  if(stage)stage.innerHTML='<div class="eyebrow" style="justify-content:center">Something went wrong</div><h1>Please refresh this page.</h1><p>Your verified email and uploaded photo are safe. If the problem continues, contact support.</p>';
});
