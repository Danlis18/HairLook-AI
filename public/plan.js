const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
let cfg={priceDisplayUsd:'36.49',siteLocale:'pt-BR',siteCurrency:'BRL',generationTargetCount:30,demoMode:false};
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
    const amount=Number(cfg.priceDisplayUsd||36.49);
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
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'paywall_view',metadata:{price:cfg.priceDisplayUsd,currency:cfg.siteCurrency||'BRL',locale:cfg.siteLocale||'pt-BR',provider:'hotmart'}})}).catch(()=>{});
}

$('#checkoutButton')?.addEventListener('click',async()=>{
  const btn=$('#checkoutButton');
  const note=$('#checkoutNote');
  const agreement=$('#purchaseAgreement');
  if(!agreement?.checked){
    if(note)note.textContent='Confirme os Termos e a Política de Reembolso antes de continuar para o pagamento.';
    agreement?.focus();
    return;
  }
  btn.disabled=true;
  btn.textContent='Abrindo pagamento seguro…';
  if(note)note.textContent='Abrindo checkout seguro da Hotmart…';
  try{
    const res=await fetch('/api/hotmart/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,acceptedPurchaseTerms:true})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'checkout_failed');
    if(data.alreadyPaid){location.href='/dashboard';return;}
    if(!data.checkoutUrl)throw new Error('checkout_not_configured');
    location.href=data.checkoutUrl;
  }catch(e){
    console.error('checkout_open_failed',e);
    btn.disabled=false;
    btn.textContent='Comprar por R$ 36,49 →';
    const messages={
      email_verification_required:'Verifique seu e-mail antes de continuar para o pagamento.',
      upload_not_ready:'Sua foto ainda está sendo preparada. Tente novamente em alguns instantes.',
      checkout_disabled:'O checkout está temporariamente indisponível.',
      checkout_not_configured:'O checkout da Hotmart ainda não foi configurado. Entre em contato com o suporte.',
      purchase_terms_required:'Confirme os Termos e a Política de Reembolso antes de continuar.',
      sign_in_required:'Sua sessão segura expirou. Reinicie a consultoria.'
    };
    if(note)note.textContent=messages[e.message]||'Não foi possível abrir o checkout. Tente novamente ou entre em contato com o suporte.';
  }
});

init().catch(error=>{
  console.error('personal_plan_init_failed',error);
  const stage=$('#analysisStage');
  if(stage)stage.innerHTML='<div class="eyebrow" style="justify-content:center">Algo deu errado</div><h1>Atualize esta página.</h1><p>Seu e-mail verificado e sua foto enviada estão seguros. Se o problema continuar, entre em contato com o suporte.</p>';
});
