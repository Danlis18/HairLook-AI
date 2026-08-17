(() => {
  let pixelId = '';
  let initialized = false;
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });

  function init(id) {
    if (!id || initialized) { readyResolve?.(); return; }
    initialized = true;
    pixelId = String(id);

    if (!window.fbq) {
      const fbq = window.fbq = function() {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const first = document.getElementsByTagName('script')[0];
      first?.parentNode?.insertBefore(script, first);
    }

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    readyResolve?.();
  }

  window.metaTrackPurchase = async ({ txHash, value }) => {
    await ready;
    if (!pixelId || !window.fbq || !txHash) return;
    const eventID = `crypto:${txHash}`;
    const storageKey = `meta_purchase_${eventID}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
    window.fbq('track', 'Purchase', {
      value: Number(value || 0),
      currency: 'USD',
      content_name: 'PremiumHairstyles AI',
      content_type: 'product'
    }, { eventID });
  };

  fetch('/api/meta/config', { cache:'no-store', credentials:'same-origin' })
    .then(r => r.ok ? r.json() : null)
    .then(data => init(data?.pixelId || ''))
    .catch(() => readyResolve?.());
})();
