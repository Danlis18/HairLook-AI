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

  const purchaseStorageKey = eventID => `meta_purchase_${eventID}`;
  const wasTracked = eventID => {
    try { return localStorage.getItem(purchaseStorageKey(eventID)) === '1'; }
    catch { return false; }
  };
  const rememberTracked = eventID => {
    try { localStorage.setItem(purchaseStorageKey(eventID), '1'); }
    catch { /* Tracking still works when browser storage is unavailable. */ }
  };

  window.metaTrackPurchase = async ({ eventId, orderId, txHash, value, currency = 'USD' }) => {
    await ready;
    const purchaseId = String(orderId || txHash || '').trim();
    const eventID = String(eventId || (txHash ? `crypto:${txHash}` : `purchase:${purchaseId}`)).trim();
    if (!pixelId || !window.fbq || !purchaseId || !eventID || wasTracked(eventID)) return;
    window.fbq('track', 'Purchase', {
      value: Number(value || 0),
      currency: String(currency || 'USD').toUpperCase(),
      content_name: 'PremiumHairstyles AI',
      content_type: 'product',
      order_id: purchaseId
    }, { eventID });
    rememberTracked(eventID);
  };

  fetch('/api/meta/config', { cache:'no-store', credentials:'same-origin' })
    .then(r => r.ok ? r.json() : null)
    .then(data => init(data?.pixelId || ''))
    .catch(() => readyResolve?.());
})();
