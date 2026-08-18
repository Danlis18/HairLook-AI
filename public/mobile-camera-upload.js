(() => {
  const locale = document.documentElement.dataset.locale === 'pt-BR' ? 'pt-BR' : 'en';
  const copy = {
    en: {
      cameraAria: 'Take a photo now',
      camera: 'Take photo now',
      or: 'or',
      gallery: 'Choose from gallery'
    },
    'pt-BR': {
      cameraAria: 'Tirar uma foto agora',
      camera: 'Tirar foto agora',
      or: 'ou',
      gallery: 'Escolher da galeria'
    }
  }[locale];
  const isMobileLike = () => window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

  const cameraIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 8h3l1.6-2.2h6.8L17 8h3v10H4z"/>
      <circle cx="12" cy="13" r="3.2"/>
    </svg>`;

  function installCameraOption() {
    if (!isMobileLike()) return;
    const zone = document.querySelector('#dropzone');
    if (!zone || document.querySelector('#cameraInput')) return;

    const host = zone.parentElement;
    if (!host) return;

    const actions = document.createElement('div');
    actions.className = 'mobile-photo-actions';
    actions.innerHTML = `
      <input id="cameraInput" class="mobile-camera-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" capture="user" aria-label="${copy.cameraAria}">
      <label class="mobile-camera-button" for="cameraInput">${cameraIcon}<span>${copy.camera}</span></label>
      <span class="mobile-photo-or">${copy.or}</span>
      <button type="button" class="mobile-gallery-button">${copy.gallery}</button>`;

    host.insertBefore(actions, zone);

    const cameraInput = actions.querySelector('#cameraInput');
    const galleryButton = actions.querySelector('.mobile-gallery-button');
    const galleryInput = document.querySelector('#photoInput');

    cameraInput?.addEventListener('change', () => {
      const file = cameraInput.files?.[0];
      if (!file) return;
      if (typeof handlePhoto === 'function') handlePhoto(file);
    });

    galleryButton?.addEventListener('click', () => galleryInput?.click());
  }

  const style = document.createElement('style');
  style.textContent = `
    .mobile-photo-actions{display:none;}
    @media (max-width:820px), (pointer:coarse){
      .mobile-photo-actions{
        display:grid;
        grid-template-columns:1fr auto 1fr;
        align-items:center;
        gap:10px;
        margin:0 0 12px;
      }
      .mobile-camera-input{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      .mobile-camera-button,.mobile-gallery-button{
        min-height:48px;
        border-radius:15px;
        border:1px solid rgba(24,55,45,.16);
        background:#fcfaf6;
        color:#18372d;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        padding:0 12px;
        font:700 13px/1.2 'Manrope',system-ui,sans-serif;
        cursor:pointer;
        box-shadow:0 8px 24px rgba(24,40,32,.06);
      }
      .mobile-camera-button{
        background:#18372d;
        color:#fff;
        border-color:#18372d;
      }
      .mobile-camera-button svg{width:20px;height:20px;flex:0 0 20px;}
      .mobile-photo-or{font-size:12px;color:#7a827d;text-align:center;}
    }
    @media (max-width:430px){
      .mobile-photo-actions{grid-template-columns:1fr 1fr;gap:8px;}
      .mobile-photo-or{display:none;}
      .mobile-camera-button,.mobile-gallery-button{font-size:12px;padding:0 9px;}
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(installCameraOption);
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('resize', installCameraOption, { passive:true });
  installCameraOption();
})();
