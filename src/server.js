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

// PayPro IPN commonly posts application/x-www-form-urlencoded.
app.use('/api/webhooks', express.urlencoded({ extended: false, limit: '256kb' }), webhookRoutes);
app.use(express.json({ limit: '256kb' }));

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);
app.use('/api/verify-email', authLimiter);

app.get('/health', (req, res) => res.json({ ok: true, service: 'hairlook-ai', demoMode: config.demoMode, timestamp: new Date().toISOString() }));
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

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

// Revalidate HTML/JS/CSS on every request so a fresh Railway deployment cannot keep
// serving an hour-old interface from the browser cache. Media files remain cacheable.
app.use(express.static(path.join(root, 'public'), {
  etag: true,
  maxAge: '1d',
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const page = name => (req, res) => res.sendFile(path.join(root, 'public', name));
app.get('/', page('index.html'));
app.get('/personal-plan', page('personal-plan.html'));
app.get('/dashboard', page('dashboard.html'));
app.get('/signin', page('signin.html'));
app.get('/demo-checkout', page('demo-checkout.html'));
app.get('/admin', page('admin.html'));
app.get('/privacy', page('privacy.html'));
app.get('/terms', page('terms.html'));
app.get('/refund', page('refund.html'));
app.get('/contact', page('contact.html'));
app.get('/about', page('about.html'));

app.use((req, res) => res.status(404).sendFile(path.join(root, 'public', '404.html')));
app.use((error, req, res, next) => {
  const status = error?.name === 'ZodError' ? 400 : error?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  const publicMessage = status < 500 ? (error.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'invalid_request') : 'server_error';
  log.error('request_error', { method: req.method, path: req.originalUrl, status, error: error.stack || error.message });
  if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/admin/magic')) return res.status(status).json({ error: publicMessage, details: config.isProduction ? undefined : error.message });
  res.status(status).send('Something went wrong. Please try again.');
});

const server = app.listen(config.port, () => log.info('server_started', { port: config.port, appUrl: config.appUrl, demoMode: config.demoMode }));
const controller = new AbortController();
if (config.demoMode) startWorker({ signal: controller.signal }).catch(error => log.error('demo_worker_crash', { error: error.message }));
for (const sig of ['SIGINT','SIGTERM']) process.on(sig, () => { controller.abort(); server.close(() => process.exit(0)); });
