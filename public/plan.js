const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
let cfg={priceDisplayUsd:'36.50',siteLocale:'pt-BR',siteCurrency:'BRL',generationTargetCount:30,demoMode:false};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function init(){
  const [configRes,meRes]=await Promise.all([
    fetch('/api/config',{cache:'no-store'}),
    fetch('/api/me',{cache:'no-store'})
  ]);
  if(configRes.ok)cfg={...cfg,...await configRes.json()};
  const me=await meRes.json().catch(()=>({authenticated:false}));
  if(!meRes.ok || !me.authenticated){location.href='/signin?next=personal-plan';return;}
  if(me.lead.paymentStatus==='paid'){location.href='/dashboard';return;}
  const priceEl=$('[data-price]');
  if(priceEl){
    const amount=Number(cfg.priceDisplayUsd||36.5);
    priceEl.textContent=(cfg.siteLocale||'pt-BR').toLowerCase()==='pt-br'?amount.toFixed(2).replace('.',','):amount.toFixed(2).replace(/\.00$/,'');
  }
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
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'paywall_view',metadata:{price:cfg.priceDisplayUsd,currency:cfg.siteCurrency||'BRL',locale:cfg.siteLocale||'pt-BR'}})}).catch(()=>{});
}

let paddleReady=false;
function initPaddle(clientToken,environment){
  if(paddleReady)return;
  if(!window.Paddle)throw new Error('paddle_not_loaded');
  if(environment==='sandbox')Paddle.Environment.set('sandbox');
  Paddle.Initialize({token:clientToken,eventCallback:handlePaddleEvent,checkout:{settings:{locale:'pt-BR'}}});
  paddleReady=true;
}

function logPaddleEvent(event){
  try{console.log('paddle_event',event);}catch{}
  const name=String(event?.name||'unknown').slice(0,80);
  const metadata={name,type:String(event?.type||'').slice(0,80),code:String(event?.code||'').slice(0,160),detail:String(event?.detail||'').slice(0,500),documentationUrl:String(event?.documentation_url||'').slice(0,500),locale:'pt-BR',currency:'BRL'};
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:name==='checkout.error'?'paddle_checkout_error':name==='checkout.warning'?'paddle_checkout_warning':'paddle_checkout_event',metadata})}).catch(()=>{});
}

function handlePaddleEvent(event){
  logPaddleEvent(event);
  const note=$('#checkoutNote');
  if(event?.name==='checkout.error' || event?.name==='checkout.payment.error'){
    const code=event?.code?` (${event.code})`:'';
    if(note)note.textContent=`Erro no checkout da Paddle${code}: ${event?.detail||'Tente novamente ou entre em contato com o suporte.'}`;
    console.error('paddle_checkout_error',event); return;
  }
  if(event?.name==='checkout.warning')console.warn('paddle_checkout_warning',event);
  if(event?.name==='checkout.completed'){
    fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'checkout_completed_client',metadata:{locale:'pt-BR',currency:'BRL'}})}).catch(()=>{});
    location.href='/dashboard';
  }
}

$('#checkoutButton')?.addEventListener('click',async()=>{
  const btn=$('#checkoutButton');
  const note=$('#checkoutNote');
  const agreement=$('#purchaseAgreement');
  if(!agreement?.checked){
    if(note)note.textContent='Confirme os Detalhes do Produto, os Termos e a Política de Reembolso antes de continuar para o pagamento.';
    agreement?.focus();
    return;
  }
  btn.disabled=true;btn.textContent='Abrindo checkout seguro…';
  if(note)note.textContent='Abrindo checkout seguro da Paddle…';
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,acceptedPurchaseTerms:true})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'checkout_failed');
    if(data.alreadyPaid){location.href='/dashboard';return;}
    if(data.demo){location.href=data.checkoutUrl;return;}
    if(!String(data.clientToken||'').startsWith(data.environment==='sandbox'?'test_':'live_'))throw new Error('paddle_environment_mismatch');
    if(!String(data.priceId||'').startsWith('pri_'))throw new Error('paddle_price_invalid');
    initPaddle(data.clientToken,data.environment);
    Paddle.Checkout.open({items:[{priceId:data.priceId,quantity:1}],customer:{email:data.customerEmail},customData:{...data.customData,storefront_locale:'pt-BR',storefront_currency:'BRL'},settings:{displayMode:'overlay',theme:'light',locale:'pt-BR',allowLogout:false,successUrl:`${location.origin}/dashboard`}});
    btn.disabled=false;btn.textContent='Continuar para o checkout seguro →';
  }catch(e){
    console.error('checkout_open_failed',e);
    btn.disabled=false;btn.textContent='Continuar para o checkout seguro →';
    const messages={email_verification_required:'Verifique seu e-mail antes de continuar para o pagamento.',upload_not_ready:'Sua foto ainda está sendo preparada. Tente novamente em alguns instantes.',checkout_disabled:'O checkout está temporariamente indisponível.',checkout_not_configured:'O preço em reais ainda não foi configurado no checkout. Entre em contato com o suporte.',paddle_not_loaded:'Não foi possível carregar o checkout seguro. Atualize a página e tente novamente.',paddle_environment_mismatch:'A configuração Live/Sandbox da Paddle não corresponde. Entre em contato com o suporte.',paddle_price_invalid:'A configuração do preço da Paddle é inválida. Entre em contato com o suporte.',sign_in_required:'Sua sessão segura expirou. Reinicie a consultoria.'};
    if(note)note.textContent=messages[e.message]||'Não foi possível abrir o checkout. Tente novamente ou entre em contato com o suporte.';
  }
});

init().catch(error=>{
  console.error('personal_plan_init_failed',error);
  const stage=$('#analysisStage');
  if(stage)stage.innerHTML='<div class="eyebrow" style="justify-content:center">Algo deu errado</div><h1>Atualize esta página.</h1><p>Seu e-mail verificado e sua foto enviada estão seguros. Se o problema continuar, entre em contato com o suporte.</p>';
});
