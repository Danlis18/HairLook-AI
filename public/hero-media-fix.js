(() => {
  const gallery = document.querySelector('.hero-gallery');
  const main = document.querySelector('.hero-gallery-main');
  if (!gallery || !main) return;

  const locale = document.documentElement.dataset.locale === 'pt-BR' ? 'pt-BR' : 'en';
  const copy = {
    en: {
      heroVideo: 'PremiumHairstyles AI hairstyle preview video',
      inspirationPrefix: 'Hairstyle inspiration',
      labels: [
        ['Soft Layers', 'Natural · elegant'],
        ['Modern Texture', 'Light · dimensional'],
        ['Elegant Shape', 'Refined · versatile'],
        ['Soft Movement', 'Light · natural'],
        ['Statement Style', 'Bold · premium'],
        ['Color & Finish', 'Shine · dimension']
      ],
      disclosure: 'Style inspiration is illustrative. Your paid hairstyle previews are prepared from your uploaded photo and selected preferences.',
      consultationAlt: 'Portrait inspiration for a hairstyle consultation',
      faceAlt: 'Portrait example for hairstyle inspiration',
      goodAlt: ['Example of a clear front-facing portrait', 'Second example of a clear front-facing portrait'],
      goodTitle: 'For the best result',
      goodLines: ['✓ Face clearly visible', '✓ Good natural lighting', '✓ Looking toward the camera'],
      badTitle: 'Try to avoid',
      badLines: ['× Sunglasses or face covered', '× Strong shadows', '× Very blurry or tiny image'],
      faqEyebrow: 'Frequently asked',
      faqTitle: 'Questions before you upload.',
      faq: [
        ['What exactly am I buying?', 'A personalized digital hairstyle visualization service offered as a one-time purchase. There is no subscription or automatic renewal. See Product Details for the complete description.'],
        ['Will the previews still look like me?', 'Your hairstyle previews are prepared from your own photo and style preferences. They show possible hairstyle directions and do not guarantee an identical salon result.'],
        ['What happens to my photo?', 'Your photo is stored privately for the time needed to prepare your order. Access is server-controlled, and authorized operators can reach private originals only through temporary protected links.'],
        ['Why do I need to verify my email?', 'Your results are delivered to the email connected to your order. You enter it once and immediately receive a 6-digit code to confirm it before payment.'],
        ['How long will my results take?', 'After payment is confirmed, your personalized results are prepared and sent to your verified email within 15 minutes.'],
        ['How is payment confirmed?', 'Available secure payment methods are shown before you pay. Your order is accepted only after server-side payment confirmation.'],
        ['Can the collection include gray-friendly ideas?', 'Yes. Your collection can explore natural gray, softer blending, gray coverage or several color directions.']
      ]
    },
    'pt-BR': {
      heroVideo: 'Vídeo de prévia de penteados da PremiumHairstyles AI',
      inspirationPrefix: 'Inspiração de penteado',
      labels: [
        ['Camadas suaves', 'Natural · elegante'],
        ['Textura moderna', 'Leve · dimensional'],
        ['Formato elegante', 'Refinado · versátil'],
        ['Movimento suave', 'Leve · natural'],
        ['Estilo marcante', 'Ousado · premium'],
        ['Cor e acabamento', 'Brilho · dimensão']
      ],
      disclosure: 'As inspirações de estilo são ilustrativas. Suas prévias pagas de penteados são preparadas a partir da foto enviada e das preferências selecionadas.',
      consultationAlt: 'Retrato de inspiração para consultoria de penteados',
      faceAlt: 'Exemplo de retrato para inspiração de penteado',
      goodAlt: ['Exemplo de retrato frontal nítido', 'Segundo exemplo de retrato frontal nítido'],
      goodTitle: 'Para o melhor resultado',
      goodLines: ['✓ Rosto claramente visível', '✓ Boa iluminação natural', '✓ Olhando para a câmera'],
      badTitle: 'Evite',
      badLines: ['× Óculos escuros ou rosto coberto', '× Sombras fortes', '× Imagem muito desfocada ou pequena'],
      faqEyebrow: 'Dúvidas frequentes',
      faqTitle: 'Dúvidas antes de enviar sua foto.',
      faq: [
        ['O que exatamente estou comprando?', 'Um serviço digital personalizado de visualização de penteados, oferecido como compra única. Não há assinatura nem renovação automática. Consulte a página de Detalhes do Produto para ver a descrição completa.'],
        ['As prévias ainda vão parecer comigo?', 'As prévias de penteados são preparadas a partir da sua própria foto e das suas preferências de estilo. Elas mostram possíveis direções de penteado e não garantem um resultado idêntico ao de um salão.'],
        ['O que acontece com a minha foto?', 'Sua foto é armazenada de forma privada pelo tempo necessário para preparar o seu pedido. O acesso é controlado pelo servidor e operadores autorizados acessam os originais privados apenas por links temporários e protegidos.'],
        ['Por que preciso verificar meu e-mail?', 'Seus resultados são enviados ao e-mail vinculado ao pedido. Você informa o endereço uma única vez e recebe imediatamente um código de 6 dígitos para confirmá-lo antes do pagamento.'],
        ['Quanto tempo meus resultados levam para ficar prontos?', 'Após a confirmação do pagamento, seus resultados personalizados são preparados e enviados ao seu e-mail verificado em até 15 minutos.'],
        ['Como o pagamento é confirmado?', 'As formas de pagamento seguras disponíveis são exibidas antes do pagamento. O pedido só é aceito após a confirmação do pagamento pelo servidor.'],
        ['A coleção pode incluir ideias para cabelos grisalhos?', 'Sim. Sua coleção pode explorar grisalhos naturais, transição suave, cobertura dos fios grisalhos ou diferentes opções de cor.']
      ]
    }
  }[locale];

  let video = main.querySelector('.hero-main-video');
  if (!video) {
    const legacyImage = main.querySelector('img');
    video = document.createElement('video');
    video.className = 'hero-main-video';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', copy.heroVideo);
    const source = document.createElement('source');
    source.src = '/media/Main-Video.mp4';
    source.type = 'video/mp4';
    video.appendChild(source);
    if (legacyImage) legacyImage.replaceWith(video);
    else main.prepend(video);
  }

  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', copy.heroVideo);
  gallery.querySelectorAll('.hero-gallery-small, .hero-note').forEach((el) => el.remove());

  const style = document.createElement('style');
  style.textContent = `
    .hero-gallery{position:relative!important;width:min(100%,560px)!important;height:auto!important;min-height:0!important;margin:0 auto!important;flex:0 1 auto!important}
    .hero-gallery-main{position:relative!important;inset:auto!important;width:100%!important;height:auto!important;min-height:0!important;border-radius:30px!important;overflow:hidden!important;background:transparent!important;box-shadow:var(--shadow)!important}
    .hero-gallery-main .hero-main-video{display:block!important;width:100%!important;height:auto!important;max-width:100%!important;object-fit:contain!important;object-position:center!important;background:transparent!important;border-radius:inherit!important;opacity:1!important;filter:none!important;transform:none!important;transition:filter .4s ease,opacity .4s ease}
    .hero-gallery-main .hero-main-video.is-buffering{filter:blur(14px) saturate(.9) brightness(.96)!important;opacity:.9!important}
    .hero-gallery-main .hero-main-video.is-error{filter:none!important;opacity:1!important}
    .hero-gallery-small,.hero-note,.hero-gallery-main .gallery-badge{display:none!important}
    .gallery-scroller .style-card img,.consultation-photo{object-fit:cover;object-position:center}
    .face-shape-visual.face-photo-visual{position:relative!important;display:block!important;padding:0!important;overflow:hidden!important;background:#dfe8e1!important;aspect-ratio:1/1!important}
    .face-photo-visual .face-profile-photo{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center 38%!important}
    .face-photo-visual::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 68%,rgba(19,37,31,.08));pointer-events:none}
    @media(min-width:1021px){.hero{min-height:760px!important;padding:38px 0 46px!important;overflow:visible!important}.hero-visual{display:flex!important;align-items:center!important;justify-content:center!important}}
    @media(max-width:1020px){.hero-gallery{width:min(100%,520px)!important}}
    @media(max-width:620px){.hero-gallery{width:100%!important}.hero-gallery-main{border-radius:24px!important}}
  `;
  document.head.appendChild(style);

  const syncRatio = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    const ratio = `${video.videoWidth} / ${video.videoHeight}`;
    gallery.style.aspectRatio = ratio;
    main.style.aspectRatio = ratio;
  };
  let bufferingTimer = null;
  const clearBuffering = () => {
    if (bufferingTimer) clearTimeout(bufferingTimer);
    bufferingTimer = null;
    video.classList.remove('is-buffering');
  };
  const markReady = () => {
    syncRatio();
    clearBuffering();
    video.classList.remove('is-error');
  };
  const scheduleBuffering = () => {
    clearBuffering();
    bufferingTimer = setTimeout(() => {
      if (!video.paused && video.readyState < 3 && !video.error) video.classList.add('is-buffering');
    }, 450);
  };
  video.addEventListener('loadedmetadata', syncRatio);
  video.addEventListener('loadeddata', markReady);
  video.addEventListener('canplay', markReady);
  video.addEventListener('playing', markReady);
  video.addEventListener('waiting', scheduleBuffering);
  video.addEventListener('stalled', scheduleBuffering);
  video.addEventListener('error', () => {
    clearBuffering();
    video.classList.add('is-error');
    console.error('Hero video failed to load:', video.currentSrc || '/media/Main-Video.mp4');
  });
  if (video.readyState >= 2) markReady();
  else if (video.readyState >= 1) syncRatio();
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});

  const premiumImages = [
    '/media/1-6-3.webp',
    '/media/1-15-3.webp',
    '/media/1-43.webp',
    '/media/2-43.webp',
    '/media/9fc417c1f9cd2ed0700b802bb61440fa.webp',
    '/media/12-42.webp'
  ];
  const labels = copy.labels;

  const cards = [...document.querySelectorAll('.gallery-scroller .style-card')];
  cards.slice(0, 4).forEach((card, i) => {
    const img = card.querySelector('img');
    if (img) {
      img.src = premiumImages[i];
      img.alt = `${copy.inspirationPrefix}: ${labels[i][0]}`;
      img.style.objectPosition = 'center';
    }
    const strong = card.querySelector('.style-meta strong');
    const span = card.querySelector('.style-meta span');
    if (strong) strong.textContent = labels[i][0];
    if (span) span.textContent = labels[i][1];
  });

  const colorCard = document.querySelector('.gallery-scroller .color-direction-card');
  if (colorCard) {
    colorCard.className = 'style-card';
    colorCard.innerHTML = `<img src="${premiumImages[4]}" alt="${copy.inspirationPrefix}: ${labels[4][0]}" loading="lazy"><div class="style-meta"><strong>${labels[4][0]}</strong><span>${labels[4][1]}</span></div>`;
  }
  const scroller = document.querySelector('.gallery-scroller');
  if (scroller && !scroller.querySelector('[data-premium-extra]')) {
    const extra = document.createElement('article');
    extra.className = 'style-card';
    extra.dataset.premiumExtra = 'true';
    extra.innerHTML = `<img src="${premiumImages[5]}" alt="${copy.inspirationPrefix}: ${labels[5][0]}" loading="lazy"><div class="style-meta"><strong>${labels[5][0]}</strong><span>${labels[5][1]}</span></div>`;
    scroller.appendChild(extra);
  }

  const disclosure = document.querySelector('.gallery-disclosure');
  if (disclosure) disclosure.textContent = copy.disclosure;

  const consultation = document.querySelector('.consultation-photo');
  if (consultation) {
    consultation.src = premiumImages[5];
    consultation.alt = copy.consultationAlt;
    consultation.style.objectPosition = 'center';
  }

  const faceVisual = document.querySelector('.face-shape-visual');
  if (faceVisual) {
    faceVisual.classList.add('face-photo-visual');
    faceVisual.innerHTML = `<img class="face-profile-photo" src="${premiumImages[2]}" alt="${copy.faceAlt}" loading="lazy">`;
  }

  const goodTipImages = document.querySelectorAll('.tip-panel:not(.bad) .tip-img img');
  if (goodTipImages[0]) {
    goodTipImages[0].src = premiumImages[2];
    goodTipImages[0].alt = copy.goodAlt[0];
    goodTipImages[0].style.objectPosition = 'center 35%';
  }
  if (goodTipImages[1]) {
    goodTipImages[1].src = premiumImages[4];
    goodTipImages[1].alt = copy.goodAlt[1];
    goodTipImages[1].style.objectPosition = 'center 28%';
  }

  const goodTipPanel = document.querySelector('.tip-panel:not(.bad)');
  if (goodTipPanel) {
    const title = goodTipPanel.querySelector('h3');
    if (title) title.textContent = copy.goodTitle;
    const lines = goodTipPanel.querySelectorAll('.tip-lines span');
    const texts = copy.goodLines;
    lines.forEach((el, i) => { if (texts[i]) el.textContent = texts[i]; });
  }

  const badTipPanel = document.querySelector('.tip-panel.bad');
  if (badTipPanel) {
    const title = badTipPanel.querySelector('h3');
    if (title) title.textContent = copy.badTitle;
    const lines = badTipPanel.querySelectorAll('.tip-lines span');
    const texts = copy.badLines;
    lines.forEach((el, i) => { if (texts[i]) el.textContent = texts[i]; });
  }

  const modalGoodImages = document.querySelectorAll('#photoTipsModal .tip-panel:not(.bad) .tip-img img');
  if (modalGoodImages[0]) {
    modalGoodImages[0].src = premiumImages[2];
    modalGoodImages[0].alt = copy.goodAlt[0];
    modalGoodImages[0].style.objectPosition = 'center 35%';
  }
  if (modalGoodImages[1]) {
    modalGoodImages[1].src = premiumImages[4];
    modalGoodImages[1].alt = copy.goodAlt[1];
    modalGoodImages[1].style.objectPosition = 'center 28%';
  }
  const homepageBadImages = [...document.querySelectorAll('.photo-tips-grid .tip-panel.bad .tip-img img')];
  const modalBadImages = [...document.querySelectorAll('#photoTipsModal .tip-panel.bad .tip-img img')];
  modalBadImages.forEach((img, i) => {
    if (homepageBadImages[i]) {
      img.src = homepageBadImages[i].src;
      img.alt = homepageBadImages[i].alt;
      img.style.objectPosition = homepageBadImages[i].style.objectPosition || 'center';
    }
  });

  const faq = document.querySelector('#faq');
  if (faq) {
    const eyebrow = faq.querySelector('.eyebrow');
    const title = faq.querySelector('.section-title');
    if (eyebrow) eyebrow.textContent = copy.faqEyebrow;
    if (title) title.textContent = copy.faqTitle;

    const faqCopy = copy.faq;

    faq.querySelectorAll('details').forEach((details, i) => {
      const item = faqCopy[i];
      if (!item) return;
      const summary = details.querySelector('summary');
      const paragraph = details.querySelector('p');
      if (summary) summary.textContent = item[0];
      if (paragraph) paragraph.textContent = item[1];
    });
  }

  const demoVideo = document.querySelector('#demoVideo');
  if (demoVideo) {
    demoVideo.removeAttribute('poster');
    demoVideo.preload = 'metadata';
    demoVideo.playsInline = true;
    let demoSource = demoVideo.querySelector('source');
    if (!demoSource) {
      demoSource = document.createElement('source');
      demoSource.type = 'video/mp4';
      demoVideo.appendChild(demoSource);
    }
    demoSource.dataset.src = '/media/Video-009.mp4';
    demoSource.src = '/media/Video-009.mp4';
    demoVideo.load();
  }
})();
