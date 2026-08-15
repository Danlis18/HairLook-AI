(() => {
  document.documentElement.lang='pt-BR';
  const current=36.49, compare=129.90, saving=compare-current;
  const brl=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
  const titles={
    '/':'PremiumHairstyles AI — Encontre seu próximo penteado',
    '/product':'Detalhes do Produto — PremiumHairstyles AI',
    '/price':'Preço — PremiumHairstyles AI',
    '/personal-plan':'Seu Plano Personalizado — PremiumHairstyles AI',
    '/signin':'Acesso Privado — PremiumHairstyles AI',
    '/dashboard':'Seu Pedido — PremiumHairstyles AI',
    '/terms':'Termos de Serviço — PremiumHairstyles AI',
    '/privacy':'Política de Privacidade — PremiumHairstyles AI',
    '/refund':'Política de Reembolso — PremiumHairstyles AI',
    '/license':'Licença e Uso Aceitável — PremiumHairstyles AI',
    '/cookies':'Cookies e Armazenamento — PremiumHairstyles AI',
    '/contact':'Suporte ao Cliente — PremiumHairstyles AI',
    '/about':'Sobre — PremiumHairstyles AI'
  };
  if(titles[location.pathname])document.title=titles[location.pathname];
  const descriptions={
    '/':'Consultoria privada de penteados com quiz, foto e sugestões personalizadas. Pagamento único e entrega dos resultados no e-mail verificado em até 72 horas.',
    '/product':'Detalhes da Coleção Personalizada de Penteados da PremiumHairstyles AI, incluindo preço, entrega, privacidade, limitações e suporte.',
    '/price':'Preço da PremiumHairstyles AI no Brasil: oferta promocional de R$ 36,49 em pagamento único, sem assinatura.'
  };
  const meta=document.querySelector('meta[name="description"]');if(meta&&descriptions[location.pathname])meta.content=descriptions[location.pathname];

  const applyPrice=()=>{
    document.querySelectorAll('[data-price]').forEach(el=>el.textContent='36,49');
    document.querySelectorAll('.price-currency').forEach(el=>el.textContent='BRL');
    document.querySelectorAll('.price-old,.product-price .old,.old-price').forEach(el=>el.textContent=brl(compare));
    document.querySelectorAll('.checkout-sale-badge,.sale-callout').forEach(el=>el.textContent=`Economize ${brl(saving)} · 72% OFF`);
    document.querySelectorAll('.sale-current').forEach(el=>el.textContent=brl(current));
    document.querySelectorAll('.product-price .current,.current-price').forEach(el=>el.textContent=brl(current));
    document.querySelectorAll('.sale-current-line .price').forEach(el=>el.innerHTML='R$ <span data-price>36,49</span>');
  };

  const setupHeroDecor=()=>{
    const gallery=document.querySelector('.hero-gallery');
    if(!gallery||gallery.dataset.brDecor==='1')return;
    gallery.dataset.brDecor='1';

    gallery.querySelectorAll('.hero-gallery-small.top,.hero-gallery-small.bottom').forEach(el=>el.remove());

    const layer=document.createElement('div');
    layer.className='br-hero-decor';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=`
      <span class="br-ripple br-ripple-a"></span>
      <span class="br-ripple br-ripple-b"></span>
      <span class="br-drop br-drop-a"></span>
      <span class="br-drop br-drop-b"></span>
      <span class="br-spark br-spark-a">✦</span>
      <span class="br-spark br-spark-b">✧</span>`;
    gallery.appendChild(layer);

    if(!document.getElementById('br-hero-decor-style')){
      const style=document.createElement('style');
      style.id='br-hero-decor-style';
      style.textContent=`
        .hero-gallery{overflow:visible!important}
        .br-hero-decor{position:absolute;inset:-28px;pointer-events:none;z-index:0;overflow:visible}
        .hero-gallery-main,.hero-note{position:relative;z-index:2}
        .br-ripple{position:absolute;border:1px solid rgba(70,107,88,.20);border-radius:50%;filter:blur(.1px);animation:brRipple 5.8s ease-in-out infinite}
        .br-ripple::after{content:'';position:absolute;inset:13%;border:1px solid rgba(176,142,88,.15);border-radius:inherit}
        .br-ripple-a{width:84px;height:84px;left:-22px;top:18%;animation-delay:-1.4s}
        .br-ripple-b{width:64px;height:64px;right:-12px;bottom:13%;animation-delay:-3.1s}
        .br-drop{position:absolute;width:17px;height:23px;border-radius:55% 45% 62% 38% / 62% 43% 57% 38%;background:linear-gradient(145deg,rgba(220,229,220,.72),rgba(255,255,255,.20));border:1px solid rgba(70,107,88,.12);box-shadow:inset 0 1px 2px rgba(255,255,255,.8);animation:brFloat 4.7s ease-in-out infinite}
        .br-drop-a{left:3%;bottom:5%;transform:rotate(24deg);animation-delay:-.8s}
        .br-drop-b{right:7%;top:7%;width:12px;height:17px;transform:rotate(-18deg);animation-delay:-2.2s}
        .br-spark{position:absolute;color:rgba(176,142,88,.45);font-size:18px;line-height:1;animation:brSpark 4.2s ease-in-out infinite}
        .br-spark-a{left:5%;top:9%;animation-delay:-1.1s}
        .br-spark-b{right:2%;bottom:29%;font-size:14px;animation-delay:-2.7s}
        @keyframes brRipple{0%,100%{transform:scale(.92);opacity:.35}50%{transform:scale(1.12);opacity:.72}}
        @keyframes brFloat{0%,100%{translate:0 0;opacity:.48}50%{translate:0 -10px;opacity:.8}}
        @keyframes brSpark{0%,100%{transform:scale(.88) rotate(0deg);opacity:.32}50%{transform:scale(1.08) rotate(10deg);opacity:.68}}
        @media (max-width:760px){
          .br-hero-decor{inset:-12px}
          .br-ripple-a{left:-5px;top:12%;width:58px;height:58px}
          .br-ripple-b{right:0;bottom:8%;width:46px;height:46px}
          .br-drop-a{left:1%;bottom:2%}
          .br-drop-b{right:4%;top:3%}
          .br-spark-a{left:3%;top:5%}
          .br-spark-b{right:1%;bottom:21%}
        }
        @media (prefers-reduced-motion:reduce){.br-ripple,.br-drop,.br-spark{animation:none!important}}
      `;
      document.head.appendChild(style);
    }
  };

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const t=n.nodeValue||'';
    if(t.trim()==='USD')n.nodeValue=t.replace('USD','BRL');
    else if(t.includes('$6.99 USD'))n.nodeValue=t.replaceAll('$6.99 USD','R$ 36,49');
    else if(t.includes('$6.99'))n.nodeValue=t.replaceAll('$6.99','R$ 36,49');
    else if(t.includes('$24.99 USD'))n.nodeValue=t.replaceAll('$24.99 USD','R$ 129,90');
    else if(t.includes('$24.99'))n.nodeValue=t.replaceAll('$24.99','R$ 129,90');
  });
  applyPrice();
  setupHeroDecor();
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{applyPrice();setupHeroDecor();}));
  observer.observe(document.body,{childList:true,subtree:true});
})();
