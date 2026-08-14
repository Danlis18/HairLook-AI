const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
let cfg={priceDisplayUsd:'15.00',generationTargetCount:30,demoMode:false};
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

function handlePaddleEvent(event){
  // UX only. The verified Paddle transaction.completed webhook remains authoritative.
  if(event?.name==='checkout.completed'){
    fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'checkout_completed_client',metadata:{}})}).catch(()=>{});
    location.href='/dashboard';
  }
}

$('#checkoutButton')?.addEventListener('click',async()=>{
  const btn=$('#checkoutButton');
  const note=$('#checkoutNote');
  btn.disabled=true;btn.textContent='Opening secure checkout…';
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'checkout_failed');
    if(data.alreadyPaid){location.href='/dashboard';return;}
    if(data.demo){location.href=data.checkoutUrl;return;}

    initPaddle(data.clientToken,data.environment);
    Paddle.Checkout.open({
      items:[{priceId:data.priceId,quantity:1}],
      customer:{email:data.customerEmail},
      customData:data.customData,
      settings:{displayMode:'overlay',theme:'light',locale:'en',allowLogout:false}
    });
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
  }catch(e){
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
    const messages={
      email_verification_required:'Please verify your email before checkout.',
      upload_not_ready:'Your photo is still being prepared. Please try again in a moment.',
      checkout_disabled:'Checkout is temporarily unavailable.',
      checkout_not_configured:'Checkout is not configured yet. Please contact support.',
      paddle_not_loaded:'Secure checkout could not load. Please refresh and try again.',
      sign_in_required:'Your secure session expired. Please restart the consultation.'
    };
    if(note)note.textContent=messages[e.message]||'Checkout could not be opened. Please try again or contact support.';
  }
});

init().catch(error=>{
  console.error('personal_plan_init_failed',error);
  const stage=$('#analysisStage');
  if(stage)stage.innerHTML='<div class="eyebrow" style="justify-content:center">Something went wrong</div><h1>Please refresh this page.</h1><p>Your verified email and uploaded photo are safe. If the problem continues, contact support.</p>';
});
