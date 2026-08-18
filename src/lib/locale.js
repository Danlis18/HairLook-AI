import net from 'node:net';

export const DEFAULT_LOCALE = 'en';
export const PORTUGUESE_LOCALE = 'pt-BR';
export const LOCALE_COOKIE = 'hairlook_locale';
export const GEO_LOCALE_COOKIE = 'hairlook_geo_locale';

const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT']);
const COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-country-code',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'x-appengine-country'
];
const geoCache = new Map();
const GEO_CACHE_MS = 6 * 60 * 60_000;

export function normalizeLocale(value, fallback = '') {
  const locale = String(value || '').trim().toLowerCase();
  if (locale === 'pt' || locale === 'pt-br' || locale === 'pt-pt' || locale === 'portuguese') return PORTUGUESE_LOCALE;
  if (locale === 'en' || locale === 'en-us' || locale === 'en-gb' || locale === 'english') return DEFAULT_LOCALE;
  return fallback;
}

export function normalizeCountry(value) {
  const country = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : '';
}

export function localeForCountry(country) {
  return PORTUGUESE_COUNTRIES.has(normalizeCountry(country)) ? PORTUGUESE_LOCALE : DEFAULT_LOCALE;
}

export function localeFromLead(lead, fallback = DEFAULT_LOCALE) {
  const answers = lead?.quiz_answers;
  return normalizeLocale(answers?._locale || answers?.locale, fallback);
}

function countryFromHeaders(req) {
  for (const name of COUNTRY_HEADERS) {
    const country = normalizeCountry(req.get?.(name) || req.headers?.[name]);
    if (country && country !== 'XX') return country;
  }
  return '';
}

function clientIp(req) {
  const forwarded = String(req.get?.('x-forwarded-for') || '').split(',')[0].trim();
  const raw = forwarded || req.ip || req.socket?.remoteAddress || '';
  return String(raw).replace(/^::ffff:/, '').split('%')[0];
}

function isPublicIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip === '::1' || ip === '0.0.0.0') return false;
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168));
  }
  const value = ip.toLowerCase();
  return !(value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb'));
}

async function lookupCountry(ip) {
  if (!isPublicIp(ip)) return '';
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.country;
  const endpoint = String(process.env.GEOIP_COUNTRY_ENDPOINT || 'https://api.country.is').replace(/\/$/, '');
  try {
    const response = await fetch(`${endpoint}/${encodeURIComponent(ip)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(1200)
    });
    const body = response.ok ? await response.json() : null;
    const country = normalizeCountry(body?.country);
    geoCache.set(ip, { country, expiresAt: Date.now() + GEO_CACHE_MS });
    return country;
  } catch {
    geoCache.set(ip, { country: '', expiresAt: Date.now() + 10 * 60_000 });
    return '';
  }
}

export async function resolveRequestLocale(req, { allowLookup = true } = {}) {
  const queryLocale = normalizeLocale(req.query?.lang);
  if (queryLocale) return { locale: queryLocale, country: countryFromHeaders(req), source: 'manual' };

  const preferredLocale = normalizeLocale(req.cookies?.[LOCALE_COOKIE]);
  if (preferredLocale) return { locale: preferredLocale, country: countryFromHeaders(req), source: 'preference' };

  const cachedGeoLocale = normalizeLocale(req.cookies?.[GEO_LOCALE_COOKIE]);
  const headerCountry = countryFromHeaders(req);
  if (headerCountry) return { locale: localeForCountry(headerCountry), country: headerCountry, source: 'header' };
  if (cachedGeoLocale) return { locale: cachedGeoLocale, country: '', source: 'geo_cache' };

  const country = allowLookup ? await lookupCountry(clientIp(req)) : '';
  return { locale: localeForCountry(country), country, source: country ? 'geoip' : 'fallback' };
}

export function localeFromBody(value, fallback = DEFAULT_LOCALE) {
  return normalizeLocale(value, fallback);
}
