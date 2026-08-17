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
import hotmartRoutes from './routes/hotmart.js';
import adminRoutes from './routes/admin.js';
import { log } from './lib/log.js';
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
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
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

// Legacy Paddle webhook stays available only for old transactions.
app.use('/api/webhooks/paddle', express.raw({ type: 'application/json', limit: '256kb' }));
app.use('/api/webhooks', webhookRoutes);

// Active payment flow: Hotmart.
app.use('/api/hotmart', express.json({ limit:'256kb' }), hotmartRoutes);
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);
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
  .replace(/Paddle/g, 'Hotmart')
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>PremiumHairstyles AI</title>');

const page = (name, { localize=true } = {}) => (req, res, next) => {
  const filePath = path.join(root, 'public', name);
  if (!localize || config.siteLocale.toLowerCase() !== 'pt-br') return res.sendFile(filePath);
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) return next(error);
    let localized = normalizePublicBrand(html.replace(/<html\s+lang="en"/i, '<html lang="pt-BR"'));
    const tags = '<script src="/pt-br-runtime.js" defer></script><script src="/pt-br-pages.js" defer></script><script src="/pt-br-final.js" defer></script><script src="/brand-normalize.js" defer></script><script src="/delivery-time-15min.js" defer></script>';
    if (!localized.includes('/pt-br-runtime.js')) localized = localized.replace('</head>', `${tags}</head>`);
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

app.use((req, res, next) => {
  if (config.siteLocale.toLowerCase() !== 'pt-br') return res.status(404).sendFile(path.join(root, 'public', '404.html'));
  const filePath=path.join(root,'public','404.html');
  fs.readFile(filePath,'utf8',(error,html)=>{
    if(error)return next(error);
    const tags='<script src="/pt-br-runtime.js" defer></script><script src="/pt-br-final.js" defer></script><script src="/brand-normalize.js" defer></script><script src="/delivery-time-15min.js" defer></script>';
    const localized=normalizePublicBrand(html.replace(/<html\s+lang="en"/i,'<html lang="pt-BR"')).replace('</head>',`${tags}</head>`);
    res.status(404).type('html').send(localized);
  });
});
app.use((error, req, res, next) => {
  const status = error?.name === 'ZodError' ? 400 : error?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  const publicMessage = status < 500 ? (error.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'invalid_request') : 'server_error';
  log.error('request_error', { method: req.method, path: req.originalUrl, status, error: error.stack || error.message });
  if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/admin/magic')) return res.status(status).json({ error: publicMessage, details: config.isProduction ? undefined : error.message });
  res.status(status).send(config.siteLocale.toLowerCase()==='pt-br'?'Algo deu errado. Tente novamente.':'Something went wrong. Please try again.');
});

const server = app.listen(config.port, () => log.info('server_started', { port: config.port, appUrl: config.appUrl, demoMode: config.demoMode, locale:config.siteLocale, currency:config.siteCurrency, paymentProvider:config.paymentProvider }));
const controller = new AbortController();
if (config.demoMode) startWorker({ signal: controller.signal }).catch(error => log.error('demo_worker_crash', { error:error.message }));
for (const sig of ['SIGINT','SIGTERM']) process.on(sig, () => { controller.abort(); server.close(() => process.exit(0)); });
