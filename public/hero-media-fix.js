(() => {
  const gallery = document.querySelector('.hero-gallery');
  const main = document.querySelector('.hero-gallery-main');
  const video = main?.querySelector('.hero-main-video');
  if (!gallery || !main || !video) return;

  // Remove decorative side cards and the note so the hero video stands on its own.
  gallery.querySelectorAll('.hero-gallery-small, .hero-note').forEach(el => el.remove());

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
    }
    .hero-gallery-small,
    .hero-note {
      display: none !important;
    }
    .gallery-badge {
      left: 16px !important;
      bottom: 16px !important;
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
      .hero-gallery-main .hero-main-video {
        object-fit: contain !important;
        height: auto !important;
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

  // Match the container to the video's real intrinsic ratio. This prevents
  // cropping and also prevents letterbox/pillarbox gaps on every viewport.
  const syncRatio = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    const ratio = `${video.videoWidth} / ${video.videoHeight}`;
    gallery.style.aspectRatio = ratio;
    main.style.aspectRatio = ratio;
  };

  if (video.readyState >= 1) syncRatio();
  else video.addEventListener('loadedmetadata', syncRatio, { once: true });

  // Replace the generic stock portraits with the new premium images uploaded to /public/media.
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

  // Add the sixth image so the inspiration strip feels richer and uses the full uploaded set.
  const scroller = document.querySelector('.gallery-scroller');
  if (scroller && !scroller.querySelector('[data-premium-extra]')) {
    const extra = document.createElement('article');
    extra.className = 'style-card';
    extra.dataset.premiumExtra = 'true';
    extra.innerHTML = `<img src="${premiumImages[5]}" alt="${labels[5][0]} hairstyle inspiration" loading="lazy"><div class="style-meta"><strong>${labels[5][0]}</strong><span>${labels[5][1]}</span></div>`;
    scroller.appendChild(extra);
  }

  // Also replace the old generic consultation portrait further down the page.
  const consultation = document.querySelector('.consultation-photo');
  if (consultation) {
    consultation.src = premiumImages[5];
    consultation.alt = 'Premium hairstyle consultation inspiration portrait';
    consultation.style.objectPosition = 'center';
  }
})();
