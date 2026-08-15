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
    .hero-gallery {
      position: relative !important;
      width: min(100%, 560px) !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 auto !important;
      flex: 0 1 auto !important;
    }
    .hero-gallery-main {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      border-radius: 30px !important;
      overflow: hidden !important;
      background: transparent !important;
      box-shadow: var(--shadow) !important;
    }
    .hero-gallery-main .hero-main-video {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      object-fit: contain !important;
      object-position: center !important;
      background: transparent !important;
      border-radius: inherit !important;
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
      transition: filter .4s ease, opacity .4s ease;
    }
    .hero-gallery-main .hero-main-video.is-buffering {
      filter: blur(14px) saturate(.9) brightness(.96) !important;
      opacity: .9 !important;
    }
    .hero-gallery-main .hero-main-video.is-error {
      filter: none !important;
      opacity: 1 !important;
    }
    .hero-gallery-small,
    .hero-note {
      display: none !important;
    }
    .gallery-badge {
      left: 16px !important;
      bottom: 16px !important;
      z-index: 2 !important;
    }
    .gallery-scroller .style-card img,
    .consultation-photo {
      object-fit: cover;
      object-position: center;
    }
    @media (min-width: 1021px) {
      .hero {
        min-height: 760px !important;
        padding: 38px 0 46px !important;
        overflow: visible !important;
      }
      .hero-visual {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }
    @media (max-width: 1020px) {
      .hero-gallery {
        width: min(100%, 520px) !important;
      }
    }
    @media (max-width: 620px) {
      .hero-gallery {
        width: 100% !important;
      }
      .hero-gallery-main {
        border-radius: 24px !important;
      }
    }
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
      if (!video.paused && video.readyState < 3 && !video.error) {
        video.classList.add('is-buffering');
      }
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
    '/media/1%20(2).jpg',
    '/media/1%20(4).webp',
    '/media/1.png',
    '/media/2%20(2).png',
    '/media/3.jpg',
    '/media/4%20(2).png'
  ];

  const cards = [...document.querySelectorAll('.gallery-scroller .style-card')];
  const labels = [
    ['Soft Layers', 'Natural · polished'],
    ['Modern Texture', 'Fresh · dimensional'],
    ['Elegant Shape', 'Refined · wearable'],
    ['Soft Movement', 'Light · effortless'],
    ['Statement Style', 'Bold · premium'],
    ['Color & Finish', 'Glossy · dimensional']
  ];

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

  // Use the newly supplied Video-009.mp4 in the "See the experience" section.
  // Keep the existing play-button behavior, but remove the old poster so the
  // previous stock frame never flashes before playback.
  const demoVideo = document.querySelector('#demoVideo');
  if (demoVideo) {
    demoVideo.removeAttribute('poster');
    demoVideo.preload = 'metadata';
    demoVideo.playsInline = true;
    const demoSource = demoVideo.querySelector('source');
    if (demoSource) {
      demoSource.dataset.src = '/media/Video-009.mp4';
      demoSource.src = '/media/Video-009.mp4';
    } else {
      const source = document.createElement('source');
      source.src = '/media/Video-009.mp4';
      source.dataset.src = '/media/Video-009.mp4';
      source.type = 'video/mp4';
      demoVideo.appendChild(source);
    }
    demoVideo.load();
  }
})();
