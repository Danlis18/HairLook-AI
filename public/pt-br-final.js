(() => {
  document.documentElement.lang='pt-BR';

  if(!document.querySelector('link[data-ui-polish]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/ui-polish.css';
    link.dataset.uiPolish='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-mobile-modal-fix]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/mobile-modal-fix.css';
    link.dataset.mobileModalFix='true';
    document.head.appendChild(link);
  }

  const SUPPORT_EMAIL='support@mail.premium-hairstyle.com';
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

  const translations=new Map([
    ['Why do I need to verify my email?','Por que preciso verificar meu e-mail?'],
    ['How long will my results take?','Quanto tempo meus resultados levam para ficar prontos?'],
    ['Who processes my payment?','Quem processa meu pagamento?'],
    ['Can I explore gray-friendly options?','Posso explorar opções para cabelos grisalhos?'],
    ['See yourself before making the change.','Veja como você fica antes de mudar o visual.'],
    ['One photo. A guided style consultation. Personalized results delivered to your verified email within 72 hours.','Uma foto. Uma consultoria guiada de estilo. Resultados personalizados enviados ao seu e-mail verificado em até 15 minutos.'],
    ['You decide what you want to explore. We do not pretend to diagnose your face or age.','Você escolhe o que deseja explorar. Não fazemos diagnóstico do seu rosto nem da sua idade.'],
    ['Keep your color, try warm or cool dimension, explore blonde, auburn, silver or gray blending.','Mantenha sua cor, experimente nuances quentes ou frias e explore loiro, acobreado, prateado ou integração dos fios grisalhos.'],
    ['Choose whether you want five-minute styling or a more polished salon-finished look.','Escolha entre um penteado rápido de cinco minutos ou um visual mais elaborado, com acabamento de salão.'],
    ['Questions before you upload.','Dúvidas antes de enviar sua foto.'],
    ['What exactly am I buying?','O que exatamente estou comprando?'],
    ['Will the previews still look like me?','As prévias ainda vão parecer comigo?'],
    ['What happens to my photo?','O que acontece com a minha foto?'],
    ['Frequently asked','Perguntas frequentes'],
    ['Your style profile','Seu perfil de estilo'],
    ['Direction','Direção'],['Modern & fresh','Moderno e atual'],['Maintenance','Manutenção'],['Easy','Fácil'],['Color','Cor'],['Gray-friendly','Favorável aos grisalhos'],['Length','Comprimento'],['Shoulder','Na altura dos ombros'],
    ['More than a preview','Mais do que uma prévia'],
    ['Your preferences matter more than a label.','Suas preferências importam mais do que qualquer rótulo.'],
    ['Your style profile considers the direction you want, how much maintenance feels realistic and how you want your new look to feel. We keep face-shape language as optional style context — not medical analysis.','Seu perfil considera a direção desejada, o nível de manutenção que faz sentido para sua rotina e como você quer se sentir com o novo visual. O formato do rosto é apenas um contexto opcional de estilo, nunca uma análise médica.'],
    ['Oval','Oval'],['Round','Redondo'],['Square','Quadrado'],['Heart','Coração'],['Diamond','Diamante'],
    ['How it works','Como funciona'],['From “maybe” to hairstyle ideas made for you.','Da dúvida a ideias de penteados feitas para você.'],
    ['Tell us about your style.','Conte sobre o seu estilo.'],['A short guided consultation about length, texture, color, lifestyle and the change you want.','Uma consultoria rápida sobre comprimento, textura, cor, rotina e a mudança que você deseja.'],
    ['Upload one clear photo.','Envie uma foto nítida.'],['A front-facing portrait in good light is enough. Your original is kept private and used for your order.','Uma foto de frente e com boa iluminação é suficiente. O original permanece privado e é usado apenas no seu pedido.'],
    ['Enter and verify your email once.','Informe e verifique seu e-mail uma única vez.'],['Enter the address where you want the results delivered. We immediately send a 6-digit verification code; after verification, you continue to the one-time Paddle checkout.','Informe o e-mail onde deseja receber os resultados. Enviamos imediatamente um código de 6 dígitos e, após a verificação, você segue para o checkout único e seguro da Hotmart.'],
    ['Receive your results by email.','Receba seus resultados por e-mail.'],['After payment is confirmed, your personalized hairstyle results are prepared and sent to your verified email within 72 hours.','Após a confirmação do pagamento, seus resultados personalizados são preparados e enviados ao e-mail verificado em até 15 minutos.'],
    ['One good photo is enough','Uma boa foto é suficiente'],['Simple photo guidance. Better previews.','Orientações simples para fotos. Prévias melhores.'],['No studio setup. We only ask for a clear portrait with your face visible and enough light to understand the hairline and current hair.','Não é preciso estúdio. Basta uma foto nítida, com o rosto visível e iluminação suficiente para mostrar a linha do cabelo e o cabelo atual.'],
    ['For the best result','Para o melhor resultado'],['Try to avoid','Evite'],['Face clearly visible','Rosto claramente visível'],['Good natural lighting','Boa iluminação natural'],['Looking toward the camera','Olhando para a câmera'],['Sunglasses or face covered','Óculos escuros ou rosto coberto'],['Strong shadows','Sombras fortes'],['Very blurry or tiny image','Imagem muito desfocada ou pequena']
  ]);

  const translateOnce=()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const raw=n.nodeValue||'';const key=raw.trim();
      if(translations.has(key))n.nodeValue=raw.replace(key,translations.get(key));
      if(n.nodeValue.includes('support@example.com'))n.nodeValue=n.nodeValue.replaceAll('support@example.com',SUPPORT_EMAIL);
      if(n.nodeValue.includes('results@example.com'))n.nodeValue=n.nodeValue.replaceAll('results@example.com',SUPPORT_EMAIL);
      if(n.nodeValue.includes('support@mail.premium-hairstyles.com'))n.nodeValue=n.nodeValue.replaceAll('support@mail.premium-hairstyles.com',SUPPORT_EMAIL);
      if(n.nodeValue.includes('Paddle'))n.nodeValue=n.nodeValue.replaceAll('Paddle','Hotmart');
      if(n.nodeValue.trim()==='USD')n.nodeValue=n.nodeValue.replace('USD','BRL');
      else if(n.nodeValue.includes('$6.99 USD'))n.nodeValue=n.nodeValue.replaceAll('$6.99 USD','R$ 36,49');
      else if(n.nodeValue.includes('$6.99'))n.nodeValue=n.nodeValue.replaceAll('$6.99','R$ 36,49');
      else if(n.nodeValue.includes('$24.99 USD'))n.nodeValue=n.nodeValue.replaceAll('$24.99 USD','R$ 129,90');
      else if(n.nodeValue.includes('$24.99'))n.nodeValue=n.nodeValue.replaceAll('$24.99','R$ 129,90');
    });
    document.querySelectorAll('[aria-label],[alt],[title],[placeholder]').forEach(el=>{
      for(const attr of ['aria-label','alt','title','placeholder']){
        const v=el.getAttribute(attr);if(v&&translations.has(v.trim()))el.setAttribute(attr,translations.get(v.trim()));
      }
    });
  };

  const descriptions={
    '/':'Consultoria privada de penteados com quiz, foto e sugestões personalizadas. Pagamento único e entrega dos resultados no e-mail verificado em até 15 minutos.',
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

  const applyPhotoExamples=()=>{
    document.querySelectorAll('img[src$="/upload-good-1.png"],img[src$="upload-good-1.png"]').forEach(img=>{
      img.src='/media/1.png';
      img.alt='Exemplo de foto nítida para penteados';
    });
    document.querySelectorAll('img[src$="/upload-good-2.png"],img[src$="upload-good-2.png"]').forEach(img=>{
      img.src='/media/2%20(2).png';
      img.alt='Segundo exemplo de foto nítida para penteados';
    });
  };

  const removeHeroTrustExtras=()=>{const items=document.querySelectorAll('.hero-trust .trust-item');[items[1],items[2]].forEach(el=>el?.remove());};
  const applySupportEmail=()=>{
    const supportCol=[...document.querySelectorAll('.footer-col')].find(col=>{const title=col.querySelector('strong')?.textContent.trim().toLowerCase();return title==='support'||title==='suporte';});
    if(supportCol&&!supportCol.querySelector('[data-brand-support-email]')){const link=document.createElement('a');link.href=`mailto:${SUPPORT_EMAIL}`;link.textContent=SUPPORT_EMAIL;link.dataset.brandSupportEmail='true';supportCol.appendChild(link);}
    document.querySelectorAll('a[href^="mailto:"]').forEach(link=>{if(/support@example\.com|results@example\.com|support@mail\.premium-hairstyles\.com/i.test(link.getAttribute('href')||'')){link.href=`mailto:${SUPPORT_EMAIL}`;link.textContent=SUPPORT_EMAIL;}});
  };

  translateOnce();applyPrice();applyPhotoExamples();removeHeroTrustExtras();applySupportEmail();
  setTimeout(()=>{translateOnce();applyPhotoExamples();},250);setTimeout(()=>{translateOnce();applyPhotoExamples();},900);

  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{applyPrice();applyPhotoExamples();removeHeroTrustExtras();applySupportEmail();}));
  observer.observe(document.body,{childList:true,subtree:true});

  if(location.pathname==='/'&&!document.querySelector('script[data-quiz-ui-fix]')){const script=document.createElement('script');script.src='/quiz-ui-fix.js';script.dataset.quizUiFix='true';document.head.appendChild(script);}
  if(location.pathname==='/'&&!document.querySelector('script[data-multi-select-polish]')){const script=document.createElement('script');script.src='/multi-select-polish.js';script.dataset.multiSelectPolish='true';document.head.appendChild(script);}
  if(location.pathname==='/'&&!document.querySelector('script[data-mobile-camera-upload]')){const script=document.createElement('script');script.src='/mobile-camera-upload.js';script.dataset.mobileCameraUpload='true';document.head.appendChild(script);}
})();