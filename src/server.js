import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { config, assertProductionConfig } from './config.js';
import publicRoutes from './routes/public.js';
import webhookRoutes from './routes/webhooks.js';
import cryptoRoutes from './routes/crypto.js';
import metaRoutes from './routes/meta.js';
import adminRoutes from './routes/admin.js';
import { log } from './lib/log.js';
import { GEO_COUNTRY_COOKIE, GEO_LOCALE_COOKIE, LOCALE_COOKIE, resolveRequestLocale } from './lib/locale.js';
import { applyPricingToHtml, storefrontPricing } from './lib/pricing.js';
import { startWorker } from './services/workerLoop.js';

assertProductionConfig();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", 'https://connect.facebook.net'],
      connectSrc: ["'self'", 'https://www.facebook.com', 'https://connect.facebook.net'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression());
app.use(cookieParser());

// Legacy Paddle webhook is kept only for historical transactions.
app.use('/api/webhooks/paddle', express.raw({ type: 'application/json', limit: '256kb' }));
app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false });
const cryptoLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);
app.use('/api/crypto', cryptoLimiter, cryptoRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);
app.use('/api/verify-email', authLimiter);

app.get('/health', (req, res) => res.json({ ok: true, service: 'hairlook-ai', demoMode: config.demoMode, locale:config.siteLocale, currency:config.siteCurrency, paymentProvider:config.paymentProvider, timestamp: new Date().toISOString() }));
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.get('/auth/magic', (req, res) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) value.forEach(v => params.append(key, String(v)));
    else if (value != null) params.set(key, String(value));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  res.redirect(307, `/api/auth/magic${suffix}`);
});

if (config.demoMode) {
  const safeDemoFile = (dir, key) => {
    const base = path.resolve(root, dir);
    const file = path.resolve(base, key);
    const relative = path.relative(base, file);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? file : null;
  };
  app.get('/demo-storage/original/:key', (req, res) => {
    const key = decodeURIComponent(req.params.key);
    const file = safeDemoFile('data/uploads', key);
    if (!file || !fs.existsSync(file)) return res.status(404).end();
    res.setHeader('Cache-Control', 'private, no-store'); res.sendFile(file);
  });
  app.get('/demo-storage/result/:key', (req, res) => {
    const key = decodeURIComponent(req.params.key);
    const file = safeDemoFile('data/results', key);
    if (!file || !fs.existsSync(file)) return res.status(404).end();
    if (req.query.download === '1') res.download(file); else { res.setHeader('Cache-Control', 'private, no-store'); res.sendFile(file); }
  });
}

app.use(express.static(path.join(root, 'public'), {
  index: false,
  etag: true,
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const normalizePublicBrand = (html) => String(html)
  .replace(/HairLook AI/g, 'PremiumHairstyles AI')
  .replace(/Premium-Hairstyles/g, 'PremiumHairstyles AI')
  .replace(/Premium Hairstyles AI/g, 'PremiumHairstyles AI')
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>PremiumHairstyles AI</title>');

const localeCookieOptions = (maxAge) => ({
  httpOnly:false,
  secure:config.isProduction,
  sameSite:'lax',
  maxAge,
  path:'/'
});

function cleanLocaleQuery(req) {
  const url = new URL(req.originalUrl, config.appUrl);
  url.searchParams.delete('lang');
  return `${url.pathname}${url.search}${url.hash}`;
}

const page = (name, { localize=true } = {}) => async (req, res, next) => {
  const filePath = path.join(root, 'public', name);
  if (!localize) return res.sendFile(filePath);
  let localeContext;
  try {
    localeContext = await resolveRequestLocale(req);
  } catch (error) {
    return next(error);
  }
  if (req.query?.lang) {
    res.cookie(LOCALE_COOKIE, localeContext.locale, localeCookieOptions(365 * 86400_000));
    if (localeContext.country) res.cookie(GEO_COUNTRY_COOKIE, localeContext.country, localeCookieOptions(6 * 60 * 60_000));
    res.clearCookie(GEO_LOCALE_COOKIE, { path:'/' });
    return res.redirect(302, cleanLocaleQuery(req));
  }
  if (localeContext.source !== 'preference') {
    res.cookie(GEO_LOCALE_COOKIE, localeContext.locale, localeCookieOptions(6 * 60 * 60_000));
  }
  if (localeContext.country) {
    res.cookie(GEO_COUNTRY_COOKIE, localeContext.country, localeCookieOptions(6 * 60 * 60_000));
  }
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) return next(error);
    const lang = localeContext.locale === 'pt-BR' ? 'pt-BR' : 'en';
    const country = String(localeContext.country || '').replace(/[^A-Z]/g, '').slice(0, 2);
    let localized = normalizePublicBrand(html)
      .replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}" data-locale="${lang}" data-country="${country}"`);
    const sharedTags = '<link rel="stylesheet" href="/locale-switcher.css"><link rel="stylesheet" href="/ui-polish.css"><link rel="stylesheet" href="/mobile-modal-fix.css"><script src="/meta-pixel.js" defer></script><script src="/locale-switcher.js" defer></script><script src="/brand-normalize.js" defer></script><script src="/delivery-time-15min.js" defer></script><script src="/mobile-camera-upload.js" defer></script>';
    const portugueseTags = lang === 'pt-BR' ? '<script src="/pt-br-runtime.js" defer></script><script src="/pt-br-pages.js" defer></script><script src="/pt-br-final.js" defer></script>' : '';
    const pricingTag = '<script src="/storefront-price.js" defer></script>';
    localized = applyPricingToHtml(localized, storefrontPricing({ country, locale:lang }));
    if (!localized.includes('/locale-switcher.js')) localized = localized.replace('</head>', `${sharedTags}${portugueseTags}${pricingTag}</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(localized);
  });
};

app.get('/', page('index.html'));
app.get('/product', page('product.html'));
app.get('/price', page('price.html'));
app.get('/personal-plan', page('personal-plan.html'));
app.get('/dashboard', page('dashboard.html'));
app.get('/signin', page('signin.html'));
app.get('/demo-checkout', page('demo-checkout.html'));
app.get('/admin', page('admin.html', {localize:false}));
app.get('/privacy', page('privacy.html'));
app.get('/terms', page('terms.html'));
app.get('/refund', page('refund.html'));
app.get('/license', page('license.html'));
app.get('/cookies', page('cookies.html'));
app.get('/contact', page('contact.html'));
app.get('/about', page('about.html'));

app.use(async (req, res, next) => {
  const filePath=path.join(root,'public','404.html');
  let localeContext;
  try { localeContext=await resolveRequestLocale(req); } catch (error) { return next(error); }
  fs.readFile(filePath,'utf8',(error,html)=>{
    if(error)return next(error);
    const lang=localeContext.locale==='pt-BR'?'pt-BR':'en';
    const country=String(localeContext.country||'').replace(/[^A-Z]/g,'').slice(0,2);
    const sharedTags='<link rel="stylesheet" href="/locale-switcher.css"><link rel="stylesheet" href="/ui-polish.css"><link rel="stylesheet" href="/mobile-modal-fix.css"><script src="/meta-pixel.js" defer></script><script src="/locale-switcher.js" defer></script><script src="/brand-normalize.js" defer></script><script src="/delivery-time-15min.js" defer></script><script src="/mobile-camera-upload.js" defer></script>';
    const portugueseTags=lang==='pt-BR'?'<script src="/pt-br-runtime.js" defer></script><script src="/pt-br-final.js" defer></script>':'';
    const pricingTag='<script src="/storefront-price.js" defer></script>';
    const localized=applyPricingToHtml(normalizePublicBrand(html).replace(/<html\s+lang="[^"]*"/i,`<html lang="${lang}" data-locale="${lang}" data-country="${country}"`),storefrontPricing({country,locale:lang})).replace('</head>',`${sharedTags}${portugueseTags}${pricingTag}</head>`);
    res.status(404).type('html').send(localized);
  });
});
app.use((error, req, res, next) => {
  const status = error?.name === 'ZodError' ? 400 : error?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  const publicMessage = status < 500 ? (error.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'invalid_request') : 'server_error';
  log.error('request_error', { method: req.method, path: req.originalUrl, status, error: error.stack || error.message });
  if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/admin/magic')) return res.status(status).json({ error: publicMessage, details: config.isProduction ? undefined : error.message });
  res.status(status).send('Something went wrong. Please try again.');
});

const server = app.listen(config.port, () => log.info('server_started', { port: config.port, appUrl: config.appUrl, demoMode: config.demoMode, locale:config.siteLocale, currency:config.siteCurrency, paymentProvider:config.paymentProvider }));
const controller = new AbortController();
if (config.demoMode) startWorker({ signal: controller.signal }).catch(error => log.error('demo_worker_crash', { error:error.message }));
for (const sig of ['SIGINT','SIGTERM']) process.on(sig, () => { controller.abort(); server.close(() => process.exit(0)); });
