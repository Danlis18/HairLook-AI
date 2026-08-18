import { config } from '../config.js';
import { normalizeCountry } from './locale.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const money = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function storefrontPricing({ country='', locale='en' } = {}) {
  const normalizedCountry = normalizeCountry(country);
  const discountPercent = normalizedCountry === 'US' ? Number(config.usDiscountPercent) : 72;
  let current;
  let compareAt;
  let currency;

  if (normalizedCountry === 'US') {
    current = money(config.priceDisplayUsUsd, 14.99);
    compareAt = roundMoney(current / ((100 - discountPercent) / 100));
    currency = 'USD';
  } else if (locale === 'pt-BR') {
    current = money(config.priceDisplayBrl, 36.49);
    compareAt = money(config.compareAtPriceBrl, 129.90);
    currency = 'BRL';
  } else {
    current = money(config.priceDisplayUsdSaved, 6.99);
    compareAt = money(config.compareAtPriceUsd, 24.99);
    currency = 'USD';
  }

  const savings = roundMoney(compareAt - current);
  return {
    country: normalizedCountry,
    current: current.toFixed(2),
    compareAt: compareAt.toFixed(2),
    savings: savings.toFixed(2),
    discountPercent,
    currency,
    prefix: currency === 'BRL' ? 'R$' : '$'
  };
}

export function cryptoPriceForLead(lead) {
  return normalizeCountry(lead?.country) === 'US'
    ? money(config.priceDisplayUsUsd, 14.99)
    : Number(config.cryptoPriceUsdt);
}

export function applyPricingToHtml(html, pricing) {
  if (pricing?.country !== 'US') return html;
  return String(html)
    .replaceAll('$24.99', `$${pricing.compareAt}`)
    .replaceAll('$6.99', `$${pricing.current}`)
    .replaceAll('>6.99<', `>${pricing.current}<`)
    .replaceAll('$18.00', `$${pricing.savings}`)
    .replace(/\$18\b/g, `$${pricing.savings}`);
}
