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
$('#checkoutButton').addEventListener('click',async()=>{
  const btn=$('#checkoutButton');btn.disabled=true;btn.textContent='Opening secure checkout…';
  try{const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});const data=await res.json();if(!res.ok)throw new Error(data.error||'checkout_failed');location.href=data.checkoutUrl;}catch(e){btn.disabled=false;btn.textContent='Continue to Secure Checkout →';$('#checkoutNote').textContent='Checkout could not be opened. Please try again or contact support.';}
});
init().catch(()=>location.href='/signin');
