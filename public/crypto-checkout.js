(() => {
  const sessionId=sessionStorage.getItem('hairlook_session_id')||crypto.randomUUID();
  let pollTimer=null,countdownTimer=null,currentIntent=null,currentNetwork=null;
  const el=html=>{const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;};
  const methods=[
    {id:'trc20',name:'USDT TRC20',sub:'TRON · disponível',icon:'₮',active:true},
    {id:'erc20',name:'USDT ERC20',sub:'Ethereum · disponível',icon:'₮',active:true},
    {id:'bep20',name:'USDT BEP20',sub:'BNB Smart Chain · disponível',icon:'₮',active:true},
    {id:'usdc',name:'USDC ERC20',sub:'Temporariamente indisponível',icon:'USDC'},
    {id:'binance',name:'Binance Pay',sub:'Temporariamente indisponível',icon:'BNB'},
    {id:'bybit',name:'Bybit Pay',sub:'Temporariamente indisponível',icon:'BY'},
    {id:'eth',name:'Ethereum',sub:'Temporariamente indisponível',icon:'ETH'},
    {id:'btc',name:'Bitcoin',sub:'Temporariamente indisponível',icon:'BTC'},
    {id:'ltc',name:'Litecoin',sub:'Temporariamente indisponível',icon:'LTC'},
    {id:'bch',name:'Bitcoin Cash',sub:'Temporariamente indisponível',icon:'BCH'}
  ];

  const modal=el(`<div class="payment-modal" id="paymentModal" hidden aria-modal="true" role="dialog" aria-labelledby="paymentModalTitle"><div class="payment-sheet"><div class="payment-sheet-head"><button class="payment-back" id="paymentBack" type="button" hidden aria-label="Voltar">‹</button><h2 id="paymentModalTitle">Forma de pagamento</h2><button class="payment-close" id="paymentClose" type="button" aria-label="Fechar">×</button></div><div class="payment-body">
    <section id="paymentChoiceView"><p class="payment-subtitle">Escolha como deseja pagar seu pedido.</p><div class="payment-choice-grid"><button class="payment-choice" id="payCard" type="button"><span class="payment-choice-icon">💳</span><strong>Cartão</strong><small>Visa, Mastercard e outros cartões</small></button><button class="payment-choice" id="payCrypto" type="button"><span class="payment-choice-icon">₮</span><strong>Criptomoeda</strong><small>USDT · pagamento em blockchain</small></button></div><div class="payment-alert" id="cardUnavailable" hidden><strong>Pagamento com cartão temporariamente indisponível.</strong><br>Use a opção de pagamento com criptomoeda.</div></section>
    <section id="cryptoMethodsView" class="payment-hidden-view"><p class="payment-subtitle">Escolha a rede para pagar em USDT.</p><div class="crypto-list">${methods.map(m=>`<button class="crypto-method ${m.active?'active':'disabled'}" type="button" data-network="${m.id}" ${m.active?'':'disabled'}><span class="crypto-icon">${m.icon}</span><span class="crypto-method-text"><strong>${m.name}</strong><small>${m.sub}</small></span>${m.active?'<span class="crypto-chevron">›</span>':''}</button>`).join('')}</div></section>
    <section id="cryptoPayView" class="payment-hidden-view crypto-pay-card"><div id="cryptoLoading" class="crypto-loading">Criando pagamento seguro…</div><div id="cryptoInvoice" hidden><span class="crypto-network-badge" id="cryptoNetworkBadge">USDT</span><div class="crypto-qr-wrap"><img id="cryptoQr" class="crypto-qr" alt="QR Code para o endereço de pagamento"></div><div class="crypto-amount-label">Envie exatamente</div><div class="crypto-amount"><span id="cryptoAmount">—</span> USDT</div><button class="copy-amount" id="copyAmount" type="button">Copiar valor</button><div class="crypto-unique-note">Este valor possui casas decimais únicas para identificarmos automaticamente o seu pedido.</div><div class="crypto-address-box"><div class="crypto-address-label" id="cryptoAddressLabel">Endereço</div><div class="crypto-address-row"><div class="crypto-address" id="cryptoAddress">—</div><button class="copy-btn" id="copyAddress" type="button">Copiar</button></div></div><div class="crypto-warning" id="cryptoWarning"></div><div class="crypto-timer">Este pagamento expira em <strong id="cryptoTimer">30:00</strong></div><div class="crypto-pending" id="cryptoPending"><span class="pending-dot"></span><span>Aguardando pagamento na blockchain…</span></div><button class="crypto-check-btn" id="cryptoCheck" type="button">Já paguei · verificar agora</button><div class="crypto-status-note" id="cryptoStatusNote">A confirmação é automática. Você pode manter esta janela aberta.</div></div><div id="cryptoError" class="payment-alert" hidden></div></section>
    <section id="cryptoSuccessView" class="payment-hidden-view crypto-success"><div class="crypto-success-mark">✓</div><h3>Pagamento confirmado</h3><p>Recebemos seu pagamento. Seu pedido já está confirmado.</p><small>Redirecionando para o seu pedido…</small></section>
  </div></div></div>`);
  document.body.appendChild(modal);

  const q=s=>modal.querySelector(s),choice=q('#paymentChoiceView'),methodsView=q('#cryptoMethodsView'),payView=q('#cryptoPayView'),successView=q('#cryptoSuccessView'),back=q('#paymentBack');
  const clearTimers=()=>{clearTimeout(pollTimer);clearInterval(countdownTimer);pollTimer=null;countdownTimer=null;};
  const setView=view=>{choice.style.display=view==='choice'?'block':'none';methodsView.style.display=view==='methods'?'block':'none';payView.style.display=view==='pay'?'block':'none';successView.style.display=view==='success'?'block':'none';back.hidden=view==='choice'||view==='success';q('#paymentModalTitle').textContent=view==='choice'?'Forma de pagamento':view==='methods'?'Pagar com criptomoeda':view==='success'?'Pagamento confirmado':'Pagamento em USDT';};
  const open=()=>{modal.hidden=false;document.body.style.overflow='hidden';setView('choice');};
  const close=()=>{modal.hidden=true;document.body.style.overflow='';q('#cardUnavailable').hidden=true;clearTimers();};
  const copy=async(text,button)=>{try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copiado ✓';setTimeout(()=>button.textContent=old,1400);}catch{button.textContent='Selecione e copie';}};

  function qrUrl(address){return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&format=png&data=${encodeURIComponent(address)}`;}
  function networkWarning(intent){
    if(intent.network==='trc20')return 'Envie somente <strong>USDT pela rede TRC20 (TRON)</strong> para este endereço.';
    if(intent.network==='erc20')return 'Envie somente <strong>USDT pela rede ERC20 (Ethereum)</strong> para este endereço. A taxa de rede é paga pelo remetente.';
    return 'Envie somente <strong>USDT pela rede BEP20 (BNB Smart Chain)</strong> para este endereço.';
  }
  function startCountdown(expiresAt){
    clearInterval(countdownTimer);const render=()=>{const left=Math.max(0,new Date(expiresAt).getTime()-Date.now()),s=Math.floor(left/1000),m=Math.floor(s/60),ss=s%60;q('#cryptoTimer').textContent=`${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;if(left<=0){clearInterval(countdownTimer);q('#cryptoPending').innerHTML='<span>Pagamento expirado. Volte e gere um novo pagamento.</span>';q('#cryptoCheck').disabled=true;}};render();countdownTimer=setInterval(render,1000);
  }
  function showIntent(intent){
    currentIntent=intent;q('#cryptoLoading').hidden=true;q('#cryptoError').hidden=true;q('#cryptoInvoice').hidden=false;q('#cryptoNetworkBadge').textContent=`USDT · ${intent.networkCode}`;q('#cryptoAmount').textContent=intent.amount;q('#cryptoAddress').textContent=intent.address;q('#cryptoAddressLabel').textContent=`Endereço USDT ${intent.networkCode}`;q('#cryptoQr').src=qrUrl(intent.address);q('#cryptoWarning').innerHTML=networkWarning(intent);q('#copyAmount').onclick=()=>copy(intent.amount,q('#copyAmount'));q('#copyAddress').onclick=()=>copy(intent.address,q('#copyAddress'));q('#cryptoCheck').disabled=false;
    q('#cryptoStatusNote').textContent=intent.verificationReady?'A confirmação é automática. Normalmente aparece em poucos segundos após as confirmações da rede.':'Pagamento pode ser realizado, mas a verificação automática desta rede ainda está sendo configurada.';
    startCountdown(intent.expiresAt);schedulePoll(2500);
  }
  async function createPayment(network){
    currentNetwork=network;clearTimers();setView('pay');q('#cryptoLoading').hidden=false;q('#cryptoInvoice').hidden=true;q('#cryptoError').hidden=true;
    try{const r=await fetch('/api/crypto/intents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({network,sessionId})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'crypto_intent_failed');if(data.alreadyPaid){location.href='/dashboard';return;}showIntent(data.intent);}catch(e){q('#cryptoLoading').hidden=true;q('#cryptoError').hidden=false;q('#cryptoError').textContent=e.message==='email_verification_required'?'Verifique seu e-mail antes de pagar.':e.message==='upload_not_ready'?'Sua foto ainda está sendo preparada. Tente novamente.':'Não foi possível criar o pagamento agora. Tente novamente em alguns instantes.';}
  }
  function schedulePoll(delay=6000){clearTimeout(pollTimer);if(!currentIntent||currentIntent.status!=='pending')return;pollTimer=setTimeout(checkStatus,delay);}
  async function checkStatus(manual=false){
    if(!currentIntent)return;try{const r=await fetch(`/api/crypto/intents/${encodeURIComponent(currentIntent.id)}/${manual?'check':'status'}`,{method:manual?'POST':'GET',headers:manual?{'Content-Type':'application/json'}:undefined});const data=await r.json().catch(()=>({}));if(r.ok&&data.intent){currentIntent=data.intent;if(data.intent.status==='paid'||data.redirect){clearTimers();setView('success');setTimeout(()=>location.href=data.redirect||'/dashboard',1200);return;}if(data.intent.status==='expired'){clearTimers();q('#cryptoPending').innerHTML='<span>Pagamento expirado. Volte e gere um novo pagamento.</span>';q('#cryptoCheck').disabled=true;return;}if(data.verificationError)q('#cryptoStatusNote').textContent='A blockchain está demorando para responder. Continuaremos tentando automaticamente.';}else if(manual){q('#cryptoStatusNote').textContent='Não conseguimos verificar agora. Tente novamente em alguns segundos.';}}catch{if(manual)q('#cryptoStatusNote').textContent='Falha temporária de conexão. A verificação automática continuará.';}schedulePoll(6000);
  }

  document.addEventListener('click',e=>{const btn=e.target.closest('#checkoutButton');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();const agreement=document.querySelector('#purchaseAgreement'),note=document.querySelector('#checkoutNote');if(!agreement?.checked){if(note)note.textContent='Confirme os Termos e a Política de Reembolso antes de continuar para o pagamento.';agreement?.focus();return;}open();},true);
  q('#paymentClose').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close();});q('#payCard').addEventListener('click',()=>{q('#cardUnavailable').hidden=false;});q('#payCrypto').addEventListener('click',()=>setView('methods'));
  methodsView.addEventListener('click',e=>{const b=e.target.closest('.crypto-method.active');if(!b)return;createPayment(b.dataset.network);});
  back.addEventListener('click',()=>{clearTimers();if(payView.style.display==='block')setView('methods');else setView('choice');});q('#cryptoCheck').addEventListener('click',()=>{q('#cryptoStatusNote').textContent='Verificando a blockchain…';checkStatus(true);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
})();