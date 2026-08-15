try { process.loadEnvFile?.('.env'); } catch { /* Railway injects env; .env is optional locally. */ }

const bool = (value, fallback = false) => value == null ? fallback : ['1','true','yes','on'].includes(String(value).toLowerCase());
const integer = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const list = (value) => String(value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
const activeLocale = process.env.SITE_LOCALE || 'pt-BR';
const isBrazilStorefront = activeLocale.toLowerCase() === 'pt-br';
const usdPrice = process.env.PRICE_DISPLAY_USD || '6.99';
const brlPrice = process.env.PRICE_DISPLAY_BRL || '36.49';
const usdPaddlePrice = process.env.PADDLE_PRICE_ID || '';
const brlPaddlePrice = process.env.PADDLE_PRICE_ID_BR || '';

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  port: integer(process.env.PORT, 3000),
  appUrl: (process.env.APP_URL || `http://localhost:${integer(process.env.PORT,3000)}`).replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET || 'demo-only-change-me',
  demoMode: bool(process.env.DEMO_MODE, false),
  trustProxy: integer(process.env.TRUST_PROXY, 1),

  // Active storefront is Brazil/pt-BR. The previous English/USD version is
  // preserved on the `english-usd-snapshot` branch for future language routing.
  siteLocale: activeLocale,
  siteCurrency: isBrazilStorefront ? 'BRL' : 'USD',
  productName: process.env.PRODUCT_NAME || 'PremiumHairstyles AI',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
  supportPhone: process.env.SUPPORT_PHONE || '',
  legalBusinessName: process.env.LEGAL_BUSINESS_NAME || 'PremiumHairstyles AI',
  legalBusinessAddress: process.env.LEGAL_BUSINESS_ADDRESS || '',
  // `priceDisplayUsd` remains for backward compatibility with existing routes.
  // On the active pt-BR storefront it intentionally contains the BRL amount.
  priceDisplayUsd: isBrazilStorefront ? brlPrice : usdPrice,
  priceDisplayBrl: brlPrice,
  priceDisplayUsdSaved: usdPrice,
  compareAtPriceUsd: process.env.COMPARE_AT_PRICE_USD || '24.99',
  compareAtPriceBrl: process.env.COMPARE_AT_PRICE_BRL || '129.90',
  generationTargetCount: integer(process.env.GENERATION_TARGET_COUNT, 30),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  originalBucket: process.env.SUPABASE_ORIGINAL_BUCKET || 'hair-originals',
  resultsBucket: process.env.SUPABASE_RESULTS_BUCKET || 'hair-results',

  paymentProvider: process.env.PAYMENT_PROVIDER || 'paddle',
  paddleEnvironment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
  paddleApiKey: process.env.PADDLE_API_KEY || '',
  paddleClientToken: process.env.PADDLE_CLIENT_TOKEN || '',
  // Existing routes read paddlePriceId. For pt-BR it resolves only to the
  // dedicated BRL Paddle price; we never silently fall back to a USD price.
  paddlePriceId: isBrazilStorefront ? brlPaddlePrice : usdPaddlePrice,
  paddlePriceIdUsd: usdPaddlePrice,
  paddlePriceIdBr: brlPaddlePrice,
  paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',

  aiProvider: process.env.AI_PROVIDER || 'replicate',
  replicateToken: process.env.REPLICATE_API_TOKEN || '',
  aiPrimaryModel: process.env.AI_PRIMARY_MODEL || 'black-forest-labs/flux-kontext-pro',
  aiEstimatedCostUsd: Number.isFinite(Number(process.env.AI_ESTIMATED_COST_USD)) ? Number(process.env.AI_ESTIMATED_COST_USD) : null,
  workerConcurrency: integer(process.env.GENERATION_WORKER_CONCURRENCY, 2),
  workerPollMs: integer(process.env.GENERATION_POLL_INTERVAL_MS, 2500),

  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'PremiumHairstyles AI <results@example.com>',

  adminEmails: list(process.env.ADMIN_EMAILS),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  manualFulfillmentMode: bool(process.env.MANUAL_FULFILLMENT_MODE, true),
  magicLinkTtlMinutes: integer(process.env.MAGIC_LINK_TTL_MINUTES, 20),

  emailVerificationEnabled: bool(process.env.EMAIL_VERIFICATION_ENABLED, true),
  emailVerificationTtlMinutes: integer(process.env.EMAIL_VERIFICATION_TTL_MINUTES, 10),
  emailVerificationResendSeconds: integer(process.env.EMAIL_VERIFICATION_RESEND_SECONDS, 60),
  emailVerificationMaxAttempts: integer(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS, 5),
  sessionTtlDays: integer(process.env.SESSION_TTL_DAYS, 30),
  adminSessionTtlHours: integer(process.env.ADMIN_SESSION_TTL_HOURS, 12),

  maxUploadMb: integer(process.env.MAX_UPLOAD_MB, 12),
  originalRetentionHours: integer(process.env.ORIGINAL_RETENTION_HOURS, 720),
  resultRetentionDays: integer(process.env.RESULT_RETENTION_DAYS, 30),
  signedUrlTtlSeconds: integer(process.env.SIGNED_URL_TTL_SECONDS, 300),
  ipHashSalt: process.env.IP_HASH_SALT || 'demo-salt',

  checkoutEnabled: bool(process.env.CHECKOUT_ENABLED, true),
  generationEnabled: bool(process.env.GENERATION_ENABLED, false),
  maintenanceMode: bool(process.env.MAINTENANCE_MODE, false),
  logLevel: process.env.LOG_LEVEL || 'info'
});

export function assertProductionConfig() {
  if (!config.isProduction || config.demoMode) return;
  const required = [
    ['APP_URL', process.env.APP_URL],
    ['SESSION_SECRET', process.env.SESSION_SECRET],
    ['IP_HASH_SALT', process.env.IP_HASH_SALT],
    ['SUPABASE_URL', config.supabaseUrl],
    ['SUPABASE_SECRET_KEY', config.supabaseSecretKey],
    ['PADDLE_CLIENT_TOKEN', config.paddleClientToken],
    ['PADDLE_WEBHOOK_SECRET', config.paddleWebhookSecret],
    ['ADMIN_EMAILS', process.env.ADMIN_EMAILS],
    ['SUPPORT_EMAIL', process.env.SUPPORT_EMAIL],
    ['LEGAL_BUSINESS_NAME', process.env.LEGAL_BUSINESS_NAME],
    ['LEGAL_BUSINESS_ADDRESS', process.env.LEGAL_BUSINESS_ADDRESS]
  ];
  // Missing BRL price must not take the whole application down. Checkout will
  // stay disabled until PADDLE_PRICE_ID_BR is supplied in Railway.
  if (!isBrazilStorefront) required.push(['PADDLE_PRICE_ID', config.paddlePriceId]);
  if (config.paymentProvider !== 'paddle') required.push(['PAYMENT_PROVIDER must be paddle', config.paymentProvider === 'paddle' ? 'ok' : '']);
  if (!['sandbox','production'].includes(config.paddleEnvironment)) required.push(['PADDLE_ENVIRONMENT must be sandbox or production', '']);
  if (config.manualFulfillmentMode) required.push(['ADMIN_PASSWORD', config.adminPassword]);
  if (config.emailVerificationEnabled) {
    required.push(
      ['RESEND_API_KEY (required because EMAIL_VERIFICATION_ENABLED=true)', config.resendApiKey],
      ['EMAIL_FROM', process.env.EMAIL_FROM]
    );
  }
  const missing = required.filter(([,v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing required production variables: ${missing.join(', ')}`);
}
