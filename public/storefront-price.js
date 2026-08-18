(() => {
  const locale = document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';

  const numberText = (value, currency) => Number(value).toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
  const moneyText = (value, currency) => new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style:'currency',
    currency,
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }).format(Number(value));
  const setText = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.textContent = value; });

  function applyPrice(cfg) {
    const currency = cfg.siteCurrency === 'BRL' ? 'BRL' : 'USD';
    const current = Number(cfg.priceDisplayUsd);
    const compareAt = Number(cfg.compareAtPrice);
    const savings = Number(cfg.priceSavings);
    const discount = Number(cfg.discountPercent || 72);
    if (![current, compareAt, savings].every(Number.isFinite)) return;

    const currentMoney = moneyText(current, currency);
    const compareMoney = moneyText(compareAt, currency);
    const savingMoney = moneyText(savings, currency);
    setText('[data-price]', numberText(current, currency));
    setText('.price-prefix', currency === 'BRL' ? 'R$ ' : '$');
    setText('.price-currency', currency);
    setText('.product-price small', currency);
    setText('.sale-old,.price-old,.product-price .old', compareMoney);
    setText('.old-price', `${compareMoney} ${currency}`);
    setText('.sale-current,.product-price .current,.current-price', currentMoney);
    setText('.sale-pill,.sale-badge', `${discount}% OFF`);
    setText('.checkout-sale-badge,.sale-callout', locale === 'pt-BR'
      ? `${discount}% OFF · ECONOMIZE ${savingMoney}`
      : `${discount}% OFF · SAVE ${savingMoney}`);
    document.querySelectorAll('.sale-current-line .price').forEach(node => { node.textContent = currentMoney; });
    window.storefrontPricing = cfg;
  }

  fetch('/api/config', { cache:'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`config_${response.status}`)))
    .then(applyPrice)
    .catch(() => {});
})();
