const $=q=>document.querySelector(q);
const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
const locale=document.documentElement.lang.toLowerCase().startsWith('pt')?'pt-BR':'en';
const isUs=document.documentElement.dataset.country==='US';
let cfg=isUs
  ? {priceDisplayUsd:'14.99',compareAtPrice:'53.54',priceSavings:'38.55',discountPercent:72,siteLocale:locale,siteCurrency:'USD',generationTargetCount:10,demoMode:false,reviewerDemo:false}
  : {priceDisplayUsd:locale==='pt-BR'?'36.49':'6.99',compareAtPrice:locale==='pt-BR'?'129.90':'24.99',priceSavings:locale==='pt-BR'?'93.41':'18.00',discountPercent:72,siteLocale:locale,siteCurrency:locale==='pt-BR'?'BRL':'USD',generationTargetCount:10,demoMode:false,reviewerDemo:false};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const C={
  en:{security:'Secure payment',preparing:'Preparing order',almost:'Your order is almost ready.',linking:'We are securely connecting your photo and verified email.',items:['Photo ready','Email verified','Secure order ready'],offer:'SPECIAL OFFER',heading:'Your Personalized Collection',summary:'10 hairstyle previews prepared from your uploaded photo.',old:'$24.99',sale:'72% OFF · SAVE $18.00',note:'One-time payment<br>No subscription',includes:['✓ 10 personalized previews','✓ Multiple hairstyles','✓ Private email delivery'],agreement:'I agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/refund" target="_blank">Refund Policy</a>.',choose:'Choose payment method →',protected:'🔒 Protected payment. Choose card or cryptocurrency.',reviewerOffer:'PROTECTED REVIEWER DEMO',reviewerChoose:'Choose free demo payment →',reviewerNote:'No charge. This isolated demo creates 10 labeled workflow previews.',accept:'Confirm the Terms and Refund Policy before continuing to payment.',opening:'Opening secure payment…',errorTitle:'Something went wrong',refresh:'Refresh this page.',safe:'Your verified email and uploaded photo are safe. If the problem continues, contact support.'},
  'pt-BR':{security:'Pagamento seguro',preparing:'Preparando pedido',almost:'Seu pedido está quase pronto.',linking:'Estamos vinculando sua foto ao seu e-mail verificado com segurança.',items:['Foto pronta','E-mail verificado','Pedido seguro pronto'],offer:'OFERTA ESPECIAL',heading:'Sua Coleção Personalizada',summary:'10 prévias de penteados preparadas com a foto enviada.',old:'R$ 129,90',sale:'72% OFF · ECONOMIZE R$ 93,41',note:'Pagamento único<br>Sem assinatura',includes:['✓ 10 prévias personalizadas','✓ Vários penteados','✓ Entrega privada por e-mail'],agreement:'Concordo com os <a href="/terms" target="_blank">Termos</a> e a <a href="/refund" target="_blank">Política de Reembolso</a>.',choose:'Escolher forma de pagamento →',protected:'🔒 Pagamento protegido. Escolha cartão ou criptomoeda.',reviewerOffer:'DEMO PROTEGIDA PARA REVISÃO',reviewerChoose:'Escolher pagamento demo gratuito →',reviewerNote:'Sem cobrança. Esta demo isolada cria 10 prévias identificadas do fluxo.',accept:'Confirme os Termos e a Política de Reembolso antes de continuar para o pagamento.',opening:'Abrindo pagamento seguro…',errorTitle:'Algo deu errado',refresh:'Atualize esta página.',safe:'Seu e-mail verificado e sua foto enviada estão seguros. Se o problema continuar, entre em contato com o suporte.'}
}[locale];

function setText(selector,value){const node=$(selector);if(node)node.textContent=value;}
function applyCopy(){
  setText('#securityNote',C.security);setText('#analysisEyebrow',C.preparing);setText('#analysisTitle',C.almost);setText('#analysisMessage',C.linking);
  document.querySelectorAll('#analysisList .analysis-item span').forEach((node,index)=>node.textContent=C.items[index]||'');
  setText('#offerBadge',C.offer);setText('#orderHeading',C.heading);setText('#orderSummary',C.summary);setText('#oldPrice',C.old);setText('#saleBadge',C.sale);$('#priceNote').innerHTML=C.note;
  setText('#includeOne',C.includes[0]);setText('#includeTwo',C.includes[1]);setText('#includeThree',C.includes[2]);$('#purchaseAgreementCopy').innerHTML=C.agreement;setText('#checkoutButton',C.choose);setText('#checkoutNote',C.protected);
  document.title=locale==='pt-BR'?'Seu pedido — PremiumHairstyles AI':'Your Order — PremiumHairstyles AI';
}

function applyPrice(){
  const currency=cfg.siteCurrency==='BRL'?'BRL':'USD';
  const region=currency==='BRL'?'pt-BR':'en-US';
  const number=value=>Number(value).toLocaleString(region,{minimumFractionDigits:2,maximumFractionDigits:2});
  const money=value=>new Intl.NumberFormat(region,{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
  setText('#oldPrice',money(cfg.compareAtPrice));
  setText('#saleBadge',locale==='pt-BR'
    ? `${cfg.discountPercent}% OFF · ECONOMIZE ${money(cfg.priceSavings)}`
    : `${cfg.discountPercent}% OFF · SAVE ${money(cfg.priceSavings)}`);
  const priceEl=$('[data-price]'),prefix=$('.price-prefix'),currencyEl=$('.price-currency');
  if(priceEl)priceEl.textContent=number(cfg.priceDisplayUsd);
  if(prefix)prefix.textContent=currency==='BRL'?'R$ ':'$';
  if(currencyEl)currencyEl.textContent=currency;
}

async function init(){
  applyCopy();
  const [configRes,meRes]=await Promise.all([fetch('/api/config',{cache:'no-store'}),fetch('/api/me',{cache:'no-store'})]);
  if(configRes.ok)cfg={...cfg,...await configRes.json()};
  window.hairlookPlanConfig=cfg;
  const me=await meRes.json().catch(()=>({authenticated:false}));
  if(!meRes.ok||!me.authenticated){location.href='/signin?next=personal-plan';return;}
  if(me.lead.paymentStatus==='paid'){location.href='/dashboard';return;}
  applyPrice();
  if(cfg.reviewerDemo){setText('#offerBadge',C.reviewerOffer);setText('#checkoutButton',C.reviewerChoose);setText('#checkoutNote',C.reviewerNote);}
  animatePlan();
}

async function animatePlan(){
  const stage=$('#analysisStage'),paywall=$('#paywall'),items=[...document.querySelectorAll('.analysis-item')];
  for(const item of items){item.classList.add('is-active');await wait(320);item.classList.remove('is-active');item.classList.add('is-done');const badge=item.querySelector('b');if(badge)badge.textContent='✓';}
  await wait(180);if(stage)stage.style.display='none';paywall?.classList.add('is-visible');
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'paywall_view',metadata:{price:cfg.priceDisplayUsd,currency:cfg.siteCurrency,locale,provider:'crypto'}})}).catch(()=>{});
}

$('#checkoutButton')?.addEventListener('click',()=>{
  const agreement=$('#purchaseAgreement'),note=$('#checkoutNote');
  if(!agreement?.checked){if(note)note.textContent=C.accept;agreement?.focus();return;}
  setText('#checkoutButton',C.opening);
});

init().catch(error=>{
  console.error('personal_plan_init_failed',error);
  const stage=$('#analysisStage');if(stage)stage.innerHTML=`<div class="eyebrow" style="justify-content:center">${C.errorTitle}</div><h1>${C.refresh}</h1><p>${C.safe}</p>`;
});
