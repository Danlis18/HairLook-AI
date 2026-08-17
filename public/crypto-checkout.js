(() => {
  const TRC20_ADDRESS = '';
  const USDT_AMOUNT = '6.99';
  const el = html => { const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };

  const modal=el(`<div class="payment-modal" id="paymentModal" hidden aria-modal="true" role="dialog" aria-labelledby="paymentModalTitle"><div class="payment-sheet"><div class="payment-sheet-head"><button class="payment-back" id="paymentBack" type="button" hidden aria-label="Voltar">‹</button><h2 id="paymentModalTitle">Forma de pagamento</h2><button class="payment-close" id="paymentClose" type="button" aria-label="Fechar">×</button></div><div class="payment-body">
    <section id="paymentChoiceView"><p class="payment-subtitle">Escolha como deseja pagar seu pedido.</p><div class="payment-choice-grid"><button class="payment-choice" id="payCard" type="button"><span class="payment-choice-icon">💳</span><strong>Cartão</strong><small>Visa, Mastercard e outros cartões</small></button><button class="payment-choice" id="payCrypto" type="button"><span class="payment-choice-icon">₮</span><strong>Criptomoeda</strong><small>USDT e outras opções de cripto</small></button></div><div class="payment-alert" id="cardUnavailable" hidden>O pagamento com cartão está temporariamente indisponível. Use o pagamento com criptomoeda.</div></section>
    <section id="cryptoMethodsView" class="payment-hidden-view"><p class="payment-subtitle">Escolha a moeda e a rede. No momento, apenas USDT TRC20 está disponível.</p><div class="crypto-list">
      <button class="crypto-method active" id="trc20Method" type="button"><span class="crypto-icon">₮</span><span class="crypto-method-text"><strong>USDT TRC20</strong><small>Disponível · rede TRON</small></span><span class="crypto-chevron">›</span></button>
      ${[['USDT ERC20','₮'],['USDT BEP20','₮'],['USDC ERC20','USDC'],['Binance Pay','BNB'],['Bybit Pay','BY'],['Ethereum','ETH'],['Bitcoin','BTC'],['Litecoin','LTC'],['Bitcoin Cash','BCH']].map(([name,icon])=>`<button class="crypto-method disabled" type="button" disabled><span class="crypto-icon">${icon}</span><span class="crypto-method-text"><strong>${name}</strong><small>Temporariamente indisponível</small></span></button>`).join('')}
    </div></section>
    <section id="trc20View" class="payment-hidden-view crypto-pay-card"><span class="crypto-network-badge">USDT · TRC20</span><div class="crypto-amount-label">Valor a pagar</div><div class="crypto-amount"><span id="cryptoAmount">${USDT_AMOUNT}</span> USDT</div><div class="crypto-address-box"><div class="crypto-address-label">Endereço USDT TRC20</div><div class="crypto-address-row"><div class="crypto-address" id="cryptoAddress">${TRC20_ADDRESS || 'Endereço será configurado'}</div><button class="copy-btn" id="copyAddress" type="button" ${TRC20_ADDRESS?'':'disabled'}>Copiar</button></div></div><div class="crypto-warning">Envie somente <strong>USDT pela rede TRC20 (TRON)</strong>. Enviar outra moeda ou usar outra rede pode causar perda dos fundos.</div><div class="crypto-pending" id="cryptoPending">${TRC20_ADDRESS?'Aguardando pagamento…':'Aguardando configuração do endereço de recebimento.'}</div></section>
  </div></div></div>`);
  document.body.appendChild(modal);

  const q=s=>modal.querySelector(s); const choice=q('#paymentChoiceView'), methods=q('#cryptoMethodsView'), trc=q('#trc20View'), back=q('#paymentBack');
  const setView=view=>{ choice.style.display=view==='choice'?'block':'none'; methods.style.display=view==='methods'?'block':'none'; trc.style.display=view==='trc'?'block':'none'; back.hidden=view==='choice'; q('#paymentModalTitle').textContent=view==='choice'?'Forma de pagamento':view==='methods'?'Pagar com criptomoeda':'Pagamento USDT TRC20'; };
  const open=()=>{ modal.hidden=false; document.body.style.overflow='hidden'; setView('choice'); };
  const close=()=>{ modal.hidden=true; document.body.style.overflow=''; q('#cardUnavailable').hidden=true; };

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#checkoutButton'); if(!btn)return;
    e.preventDefault(); e.stopImmediatePropagation();
    const agreement=document.querySelector('#purchaseAgreement'); const note=document.querySelector('#checkoutNote');
    if(!agreement?.checked){ if(note)note.textContent='Confirme os Termos e a Política de Reembolso antes de continuar para o pagamento.'; agreement?.focus(); return; }
    open();
  },true);

  q('#paymentClose').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  q('#payCard').addEventListener('click',()=>{q('#cardUnavailable').hidden=false;});
  q('#payCrypto').addEventListener('click',()=>setView('methods'));
  q('#trc20Method').addEventListener('click',()=>setView('trc'));
  back.addEventListener('click',()=>setView(trc.style.display==='block'?'methods':'choice'));
  q('#copyAddress').addEventListener('click',async()=>{ if(!TRC20_ADDRESS)return; await navigator.clipboard.writeText(TRC20_ADDRESS); const b=q('#copyAddress'); b.textContent='Copiado'; setTimeout(()=>b.textContent='Copiar',1400); });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
})();