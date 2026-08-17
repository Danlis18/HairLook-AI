(() => {
  const USDT_AMOUNT = '6.99';
  const NETWORKS = {
    trc20: {
      label: 'USDT TRC20',
      network: 'TRC20 (TRON)',
      address: 'TMS2rDhMQi5emHGQ2ixoyfMgjabryZTLJW',
      icon: '₮'
    },
    bep20: {
      label: 'USDT BEP20',
      network: 'BEP20 (BNB Smart Chain)',
      address: '0x16420e2a9aa8c4ca89b328ef36c1120e67607d81',
      icon: '₮'
    },
    erc20: {
      label: 'USDT ERC20',
      network: 'ERC20 (Ethereum)',
      address: '0x16420e2a9aa8c4ca89b328ef36c1120e67607d81',
      icon: '₮'
    }
  };

  let selectedNetwork = 'trc20';
  const el = html => { const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };

  const modal=el(`<div class="payment-modal" id="paymentModal" hidden aria-modal="true" role="dialog" aria-labelledby="paymentModalTitle"><div class="payment-sheet"><div class="payment-sheet-head"><button class="payment-back" id="paymentBack" type="button" hidden aria-label="Voltar">‹</button><h2 id="paymentModalTitle">Forma de pagamento</h2><button class="payment-close" id="paymentClose" type="button" aria-label="Fechar">×</button></div><div class="payment-body">
    <section id="paymentChoiceView"><p class="payment-subtitle">Escolha como deseja pagar seu pedido.</p><div class="payment-choice-grid"><button class="payment-choice" id="payCard" type="button"><span class="payment-choice-icon">💳</span><strong>Cartão</strong><small>Visa, Mastercard e outros cartões</small></button><button class="payment-choice" id="payCrypto" type="button"><span class="payment-choice-icon">₮</span><strong>Criptomoeda</strong><small>USDT por TRC20, BEP20 ou ERC20</small></button></div><div class="payment-alert" id="cardUnavailable" hidden>O pagamento com cartão está temporariamente indisponível. Use o pagamento com criptomoeda.</div></section>
    <section id="cryptoMethodsView" class="payment-hidden-view"><p class="payment-subtitle">Escolha a rede para pagar com USDT.</p><div class="crypto-list">
      <button class="crypto-method active" data-network="trc20" type="button"><span class="crypto-icon">₮</span><span class="crypto-method-text"><strong>USDT TRC20</strong><small>Disponível · rede TRON</small></span><span class="crypto-chevron">›</span></button>
      <button class="crypto-method active" data-network="bep20" type="button"><span class="crypto-icon">₮</span><span class="crypto-method-text"><strong>USDT BEP20</strong><small>Disponível · BNB Smart Chain</small></span><span class="crypto-chevron">›</span></button>
      <button class="crypto-method active" data-network="erc20" type="button"><span class="crypto-icon">₮</span><span class="crypto-method-text"><strong>USDT ERC20</strong><small>Disponível · Ethereum</small></span><span class="crypto-chevron">›</span></button>
      ${[['USDC ERC20','USDC'],['Binance Pay','BNB'],['Bybit Pay','BY'],['Ethereum','ETH'],['Bitcoin','BTC'],['Litecoin','LTC'],['Bitcoin Cash','BCH']].map(([name,icon])=>`<button class="crypto-method disabled" type="button" disabled><span class="crypto-icon">${icon}</span><span class="crypto-method-text"><strong>${name}</strong><small>Temporariamente indisponível</small></span></button>`).join('')}
    </div></section>
    <section id="cryptoPayView" class="payment-hidden-view crypto-pay-card"><span class="crypto-network-badge" id="cryptoNetworkBadge"></span><div class="crypto-amount-label">Valor a pagar</div><div class="crypto-amount"><span id="cryptoAmount">${USDT_AMOUNT}</span> USDT</div><div class="crypto-address-box"><div class="crypto-address-label" id="cryptoAddressLabel"></div><div class="crypto-address-row"><div class="crypto-address" id="cryptoAddress"></div><button class="copy-btn" id="copyAddress" type="button">Copiar</button></div></div><div class="crypto-warning" id="cryptoWarning"></div><div class="crypto-pending">Aguardando pagamento…</div></section>
  </div></div></div>`);
  document.body.appendChild(modal);

  const q=s=>modal.querySelector(s); const choice=q('#paymentChoiceView'), methods=q('#cryptoMethodsView'), pay=q('#cryptoPayView'), back=q('#paymentBack');

  function renderNetwork(){
    const data=NETWORKS[selectedNetwork];
    q('#cryptoNetworkBadge').textContent=`USDT · ${selectedNetwork.toUpperCase()}`;
    q('#cryptoAddressLabel').textContent=`Endereço ${data.label}`;
    q('#cryptoAddress').textContent=data.address;
    q('#cryptoWarning').innerHTML=`Envie somente <strong>USDT pela rede ${data.network}</strong>. Enviar outra moeda ou usar outra rede pode causar perda dos fundos.`;
    q('#paymentModalTitle').textContent=`Pagamento ${data.label}`;
  }

  const setView=view=>{
    choice.style.display=view==='choice'?'block':'none';
    methods.style.display=view==='methods'?'block':'none';
    pay.style.display=view==='pay'?'block':'none';
    back.hidden=view==='choice';
    if(view==='choice')q('#paymentModalTitle').textContent='Forma de pagamento';
    if(view==='methods')q('#paymentModalTitle').textContent='Pagar com criptomoeda';
    if(view==='pay')renderNetwork();
  };

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
  modal.querySelectorAll('[data-network]').forEach(button=>button.addEventListener('click',()=>{
    selectedNetwork=button.dataset.network;
    setView('pay');
  }));
  back.addEventListener('click',()=>setView(pay.style.display==='block'?'methods':'choice'));
  q('#copyAddress').addEventListener('click',async()=>{
    const address=NETWORKS[selectedNetwork].address;
    try{await navigator.clipboard.writeText(address);}catch{
      const input=document.createElement('textarea'); input.value=address; input.style.position='fixed'; input.style.opacity='0'; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    const b=q('#copyAddress'); b.textContent='Copiado'; setTimeout(()=>b.textContent='Copiar',1400);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
})();