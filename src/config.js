try { process.loadEnvFile?.('.env'); } catch { /* Railway injects env; .env is optional locally. */ }

const bool = (value, fallback = false) => value == null ? fallback : ['1','true','yes','on'].includes(String(value).toLowerCase());
const integer = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const list = (value) => String(value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  port: integer(process.env.PORT, 3000),
  appUrl: (process.env.APP_URL || `http://localhost:${integer(process.env.PORT,3000)}`).replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET || 'demo-only-change-me',
  demoMode: bool(process.env.DEMO_MODE, false),
  trustProxy: integer(process.env.TRUST_PROXY, 1),

  productName: process.env.PRODUCT_NAME || 'HairLook AI',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
  legalBusinessName: process.env.LEGAL_BUSINESS_NAME || 'HairLook AI',
  legalBusinessAddress: process.env.LEGAL_BUSINESS_ADDRESS || '',
  priceDisplayUsd: process.env.PRICE_DISPLAY_USD || '15.00',
  generationTargetCount: integer(process.env.GENERATION_TARGET_COUNT, 30),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  originalBucket: process.env.SUPABASE_ORIGINAL_BUCKET || 'hair-originals',
  resultsBucket: process.env.SUPABASE_RESULTS_BUCKET || 'hair-results',

  payproProductId: process.env.PAYPRO_PRODUCT_ID || '',
  payproPageTemplateId: process.env.PAYPRO_PAGE_TEMPLATE_ID || '',
  payproSecretKey: process.env.PAYPRO_SECRET_KEY || '',
  payproValidationKey: process.env.PAYPRO_VALIDATION_KEY || '',
  payproTestMode: bool(process.env.PAYPRO_TEST_MODE, true),
  payproCurrency: process.env.PAYPRO_CURRENCY || 'USD',
  payproLanguage: process.env.PAYPRO_LANGUAGE || 'EN',

  aiProvider: process.env.AI_PROVIDER || 'replicate',
  replicateToken: process.env.REPLICATE_API_TOKEN || '',
  aiPrimaryModel: process.env.AI_PRIMARY_MODEL || 'black-forest-labs/flux-kontext-pro',
  aiEstimatedCostUsd: Number.isFinite(Number(process.env.AI_ESTIMATED_COST_USD)) ? Number(process.env.AI_ESTIMATED_COST_USD) : null,
  workerConcurrency: integer(process.env.GENERATION_WORKER_CONCURRENCY, 2),
  workerPollMs: integer(process.env.GENERATION_POLL_INTERVAL_MS, 2500),

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: integer(process.env.SMTP_PORT, 587),
  smtpSecure: bool(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'HairLook AI <results@example.com>',

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
  originalRetentionHours: integer(process.env.ORIGINAL_RETENTION_HOURS, 24),
  resultRetentionDays: integer(process.env.RESULT_RETENTION_DAYS, 30),
  signedUrlTtlSeconds: integer(process.env.SIGNED_URL_TTL_SECONDS, 300),
  ipHashSalt: process.env.IP_HASH_SALT || 'demo-salt',

  checkoutEnabled: bool(process.env.CHECKOUT_ENABLED, true),
  generationEnabled: bool(process.env.GENERATION_ENABLED, true),
  maintenanceMode: bool(process.env.MAINTENANCE_MODE, false),
  logLevel: process.env.LOG_LEVEL || 'info'
});

export function assertProductionConfig() {
  if (!config.isProduction || config.demoMode) return;
  // Manual-fulfillment production mode: Supabase + PayPro Global + a human uploading
  // results by hand. SMTP and the Replicate/worker stack are optional add-ons, never
  // required for the site to start or for checkout/admin/dashboard to function.
  const required = [
    ['APP_URL', process.env.APP_URL],
    ['SESSION_SECRET', process.env.SESSION_SECRET],
    ['IP_HASH_SALT', process.env.IP_HASH_SALT],
    ['SUPABASE_URL', config.supabaseUrl],
    ['SUPABASE_SECRET_KEY', config.supabaseSecretKey],
    ['PAYPRO_PRODUCT_ID', config.payproProductId],
    ['PAYPRO_SECRET_KEY', config.payproSecretKey],
    ['PAYPRO_VALIDATION_KEY', config.payproValidationKey],
    ['ADMIN_EMAILS', process.env.ADMIN_EMAILS],
    ['SUPPORT_EMAIL', process.env.SUPPORT_EMAIL],
    ['LEGAL_BUSINESS_NAME', process.env.LEGAL_BUSINESS_NAME],
    ['LEGAL_BUSINESS_ADDRESS', process.env.LEGAL_BUSINESS_ADDRESS]
  ];
  if (config.manualFulfillmentMode) required.push(['ADMIN_PASSWORD', config.adminPassword]);
  // Customer email OTP verification sends a real code by email; without SMTP it cannot
  // work, so fail loudly at boot instead of silently letting customers get stuck.
  if (config.emailVerificationEnabled) required.push(['SMTP_HOST (required because EMAIL_VERIFICATION_ENABLED=true)', config.smtpHost], ['EMAIL_FROM', process.env.EMAIL_FROM]);
  const missing = required.filter(([,v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing required production variables: ${missing.join(', ')}`);
}
