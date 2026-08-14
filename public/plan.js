const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
let cfg={priceDisplayUsd:'15.00',generationTargetCount:30,demoMode:false};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function init(){
  const [configRes,meRes]=await Promise.all([fetch('/api/config'),fetch('/api/me')]);
  if(configRes.ok)cfg=await configRes.json();
  const me=await meRes.json();
  if(!me.authenticated){location.href='/signin?next=personal-plan';return;}
  if(me.lead.paymentStatus==='paid'){location.href='/dashboard';return;}
  $('[data-price]').textContent=Number(cfg.priceDisplayUsd).toFixed(2).replace(/\.00$/,'');
  $('[data-result-count]').textContent=cfg.generationTargetCount;
  animatePlan();
}
async function animatePlan(){
  const items=[...document.querySelectorAll('.analysis-item')];
  for(const item of items){item.classList.add('is-active');await wait(520);item.classList.remove('is-active');item.classList.add('is-done');item.querySelector('b').textContent='✓';}
  await wait(300);$('#analysisStage').style.display='none';$('#paywall').classList.add('is-visible');
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'paywall_view',metadata:{price:cfg.priceDisplayUsd}})}).catch(()=>{});
}
let paddleReady=false;
function initPaddle(clientToken,environment){
  if(paddleReady||!window.Paddle)return;
  if(environment==='sandbox')Paddle.Environment.set('sandbox');
  Paddle.Initialize({token:clientToken,eventCallback:handlePaddleEvent});
  paddleReady=true;
}
function handlePaddleEvent(event){
  // The client is never trusted for payment status - this only drives UX. The dashboard
  // re-checks the real, webhook-confirmed status and waits for it if it isn't there yet.
  if(event?.name==='checkout.completed'){
    fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'checkout_completed_client',metadata:{}})}).catch(()=>{});
    setTimeout(()=>{location.href='/dashboard';},1200);
  }
}
$('#checkoutButton').addEventListener('click',async()=>{
  const btn=$('#checkoutButton');btn.disabled=true;btn.textContent='Opening secure checkout…';
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'checkout_failed');
    if(data.alreadyPaid||data.demo){location.href=data.checkoutUrl;return;}
    initPaddle(data.clientToken,data.environment);
    if(!window.Paddle){throw new Error('paddle_not_loaded');}
    Paddle.Checkout.open({transactionId:data.transactionId});
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
  }catch(e){
    btn.disabled=false;btn.textContent='Continue to Secure Checkout →';
    $('#checkoutNote').textContent=e.message==='email_verification_required'?'Please verify your email before checkout.':'Checkout could not be opened. Please try again or contact support.';
  }
});
init().catch(()=>location.href='/signin');
