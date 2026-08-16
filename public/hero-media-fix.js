(() => {
  const gallery = document.querySelector('.hero-gallery');
  const main = document.querySelector('.hero-gallery-main');
  if (!gallery || !main) return;

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
    video.setAttribute('aria-label', 'PremiumHairstyles AI hairstyle preview video');
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
  const labels = [
    ['Soft Layers', 'Natural · polished'],
    ['Modern Texture', 'Fresh · dimensional'],
    ['Elegant Shape', 'Refined · wearable'],
    ['Soft Movement', 'Light · effortless'],
    ['Statement Style', 'Bold · premium'],
    ['Color & Finish', 'Glossy · dimensional']
  ];

  const cards = [...document.querySelectorAll('.gallery-scroller .style-card')];
  cards.slice(0, 4).forEach((card, i) => {
    const img = card.querySelector('img');
    if (img) {
      img.src = premiumImages[i];
      img.alt = `${labels[i][0]} hairstyle inspiration`;
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
    colorCard.innerHTML = `<img src="${premiumImages[4]}" alt="${labels[4][0]} hairstyle inspiration" loading="lazy"><div class="style-meta"><strong>${labels[4][0]}</strong><span>${labels[4][1]}</span></div>`;
  }
  const scroller = document.querySelector('.gallery-scroller');
  if (scroller && !scroller.querySelector('[data-premium-extra]')) {
    const extra = document.createElement('article');
    extra.className = 'style-card';
    extra.dataset.premiumExtra = 'true';
    extra.innerHTML = `<img src="${premiumImages[5]}" alt="${labels[5][0]} hairstyle inspiration" loading="lazy"><div class="style-meta"><strong>${labels[5][0]}</strong><span>${labels[5][1]}</span></div>`;
    scroller.appendChild(extra);
  }

  const consultation = document.querySelector('.consultation-photo');
  if (consultation) {
    consultation.src = premiumImages[5];
    consultation.alt = 'Premium hairstyle consultation inspiration portrait';
    consultation.style.objectPosition = 'center';
  }

  const faceVisual = document.querySelector('.face-shape-visual');
  if (faceVisual) {
    faceVisual.classList.add('face-photo-visual');
    faceVisual.innerHTML = `<img class="face-profile-photo" src="${premiumImages[2]}" alt="Premium hairstyle portrait example" loading="lazy">`;
  }

  const goodTipImages = document.querySelectorAll('.tip-panel:not(.bad) .tip-img img');
  if (goodTipImages[0]) {
    goodTipImages[0].src = premiumImages[2];
    goodTipImages[0].alt = 'Exemplo de retrato frontal nítido';
    goodTipImages[0].style.objectPosition = 'center 35%';
  }
  if (goodTipImages[1]) {
    goodTipImages[1].src = premiumImages[4];
    goodTipImages[1].alt = 'Segundo exemplo de retrato frontal nítido';
    goodTipImages[1].style.objectPosition = 'center 35%';
  }

  const goodPanel = document.querySelector('.tip-panel:not(.bad)');
  if (goodPanel) {
    const heading = goodPanel.querySelector('h3');
    if (heading) heading.textContent = 'Para o melhor resultado';
    const lines = goodPanel.querySelectorAll('.tip-lines span');
    const copy = ['✓ Rosto claramente visível', '✓ Boa iluminação natural', '✓ Olhando para a câmera'];
    lines.forEach((line, i) => { if (copy[i]) line.textContent = copy[i]; });
  }

  const badPanel = document.querySelector('.tip-panel.bad');
  if (badPanel) {
    const heading = badPanel.querySelector('h3');
    if (heading) heading.textContent = 'Evite';
    const lines = badPanel.querySelectorAll('.tip-lines span');
    const copy = ['× Óculos escuros ou rosto coberto', '× Sombras fortes', '× Imagem muito desfocada ou pequena'];
    lines.forEach((line, i) => { if (copy[i]) line.textContent = copy[i]; });
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
