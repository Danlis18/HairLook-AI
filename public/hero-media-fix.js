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
})();
