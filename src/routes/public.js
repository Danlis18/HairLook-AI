import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { putOriginal, signedResultUrl, deleteOriginal, deleteResult } from '../lib/storage.js';
import { randomToken, tokenHash, hashIp, randomOtpCode, sha256, safeEqual } from '../lib/crypto.js';
import { signLeadForCheckout } from '../lib/paddle.js';
import { sendMagicLink, sendVerificationCode } from '../lib/mailer.js';
import { leadSession, optionalLeadSession, sameOrigin, noStore } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 } });
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const quizSchema = z.object({
  gender: z.string().max(40), ageRange: z.string().max(30), currentLength: z.string().max(40), desiredLength: z.string().max(60),
  texture: z.string().max(40), currentColor: z.string().max(40), desiredColors: z.array(z.string().max(40)).max(8), styleGoals: z.array(z.string().max(60)).max(8),
  stylePersonality: z.string().max(50), maintenanceLevel: z.string().max(50), bangsPreference: z.string().max(50), grayPreference: z.string().max(60)
});

function parseJsonField(value, fallback = {}) {
  if (value == null || value === '') return fallback;
  try { return JSON.parse(value); } catch { const error = new Error('Invalid JSON field'); error.name = 'ZodError'; throw error; }
}
function cookieOptions(days = config.sessionTtlDays) { return { httpOnly:true, secure:config.isProduction, sameSite:'lax', maxAge:days * 86400_000, path:'/' }; }
async function createLeadSession(res, leadId) {
  const raw = randomToken();
  const expires = new Date(Date.now() + config.sessionTtlDays * 86400_000).toISOString();
  await repo.createLeadSession(leadId, tokenHash(raw), expires);
  res.cookie('hair_lead_session', raw, cookieOptions());
}
async function issueEmailChallenge(lead) {
  const code = randomOtpCode();
  const expiresAt = new Date(Date.now() + config.emailVerificationTtlMinutes * 60_000).toISOString();
  await repo.createEmailChallenge({ leadId:lead.id, email:lead.email, codeHash:sha256(code), expiresAt, maxAttempts:config.emailVerificationMaxAttempts });
  const sent = await sendVerificationCode({ to:lead.email, code });
  return sent.devCode;
}
function clientConfig(settings = {}) {
  return {
    productName: config.productName,
    supportEmail: settings.support_email || config.supportEmail,
    supportPhone: config.supportPhone,
    priceDisplayUsd: config.priceDisplayUsd,
    generationTargetCount: Number(settings.generation_target_count || config.generationTargetCount),
    checkoutEnabled: String(settings.checkout_enabled ?? config.checkoutEnabled) !== 'false',
    demoMode: config.demoMode,
    maxUploadMb: config.maxUploadMb,
    legalBusinessName: config.legalBusinessName,
    legalBusinessAddress: config.legalBusinessAddress,
    originalRetentionHours: Number(settings.original_retention_hours || config.originalRetentionHours),
    resultRetentionDays: Number(settings.result_retention_days || config.resultRetentionDays)
  };
}

router.get('/config', async (req,res,next) => { try { res.json(clientConfig(await repo.getSettings())); } catch (e) { next(e); } });
router.post('/analytics', sameOrigin, async (req,res,next) => { try {
  const body = z.object({ sessionId:z.string().max(120), leadId:z.string().uuid().optional().nullable(), eventName:z.string().regex(/^[a-z0-9_]{2,80}$/), metadata:z.record(z.string(),z.any()).optional() }).parse(req.body);
  await repo.insertAnalytics({ session_id:body.sessionId, lead_id:body.leadId || null, event_name:body.eventName, metadata:body.metadata || {} });
  res.status(202).json({ ok:true });
} catch (e) { next(e); } });

router.post('/leads', sameOrigin, upload.single('photo'), async (req,res,next) => { try {
  const runtimeSettings = await repo.getSettings();
  if (String(runtimeSettings.maintenance_mode ?? config.maintenanceMode) === 'true') return res.status(503).json({ error:'maintenance' });
  if (!req.file) return res.status(400).json({ error:'photo_required' });
  const email = emailSchema.parse(req.body.email);
  if (String(req.body.consent) !== 'true') return res.status(400).json({ error:'consent_required' });
  const quiz = quizSchema.parse(parseJsonField(req.body.quiz, {}));
  const utm = z.record(z.string(),z.any()).parse(parseJsonField(req.body.utm, {}));
  let meta;
  try { meta = await sharp(req.file.buffer, { failOn:'error' }).metadata(); } catch { return res.status(400).json({ error:'invalid_image' }); }
  if (!['jpeg','png','webp','heif'].includes(meta.format)) return res.status(400).json({ error:'unsupported_image' });
  if ((meta.width || 0) < 400 || (meta.height || 0) < 400) return res.status(400).json({ error:'image_too_small' });
  const cleaned = await sharp(req.file.buffer, { failOn:'error' }).rotate().resize({ width:2400, height:2400, fit:'inside', withoutEnlargement:true }).jpeg({ quality:90, chromaSubsampling:'4:4:4' }).toBuffer();
  const lead = await repo.createLead({
    email, gender:quiz.gender, age_range:quiz.ageRange, current_length:quiz.currentLength, desired_length:quiz.desiredLength, texture:quiz.texture, current_color:quiz.currentColor,
    desired_colors:quiz.desiredColors, style_goals:quiz.styleGoals, style_personality:quiz.stylePersonality, maintenance_level:quiz.maintenanceLevel, bangs_preference:quiz.bangsPreference, gray_preference:quiz.grayPreference,
    quiz_answers:quiz, upload_status:'processing', payment_status:'unpaid', payment_provider:'paddle', generation_status:'not_started', source:utm.source || utm.utm_source || null,
    utm_source:utm.utm_source || null, utm_medium:utm.utm_medium || null, utm_campaign:utm.utm_campaign || null, utm_content:utm.utm_content || null, utm_term:utm.utm_term || null,
    landing_url:req.body.landingUrl || null, ip_hash:hashIp(req.ip), country:null, consent_at:new Date().toISOString()
  });
  try {
    const key = await putOriginal(lead.id, cleaned, 'image/jpeg');
    await repo.updateLead(lead.id, { upload_path:key, upload_status:'ready' });
  } catch (e) {
    await repo.updateLead(lead.id, { upload_status:'failed' });
    throw e;
  }
  await createLeadSession(res, lead.id);
  await repo.insertAnalytics({ session_id:req.body.sessionId || 'unknown', lead_id:lead.id, event_name:'upload_complete', metadata:{ format:meta.format, width:meta.width, height:meta.height } });
  if (config.emailVerificationEnabled) {
    const devCode = await issueEmailChallenge(lead);
    return res.status(201).json({ leadId:lead.id, next:'/personal-plan', emailVerificationRequired:true, ...(config.demoMode ? { devCode } : {}) });
  }
  res.status(201).json({ leadId:lead.id, next:'/personal-plan', emailVerificationRequired:false });
} catch (e) { next(e); } });

router.post('/verify-email', sameOrigin, leadSession, async (req,res,next) => { try {
  if (!config.emailVerificationEnabled) return res.status(404).json({ error:'not_found' });
  if (req.lead.email_verified_at) return res.json({ ok:true, alreadyVerified:true });
  const code = z.string().trim().regex(/^\d{6}$/).parse(req.body.code);
  const challenge = await repo.getLatestEmailChallenge(req.lead.id);
  const generic = { error:'invalid_or_expired_code' };
  if (!challenge || challenge.used_at) return res.status(400).json(generic);
  if (new Date(challenge.expires_at).getTime() <= Date.now()) return res.status(400).json(generic);
  if (challenge.attempts >= challenge.max_attempts) return res.status(429).json({ error:'max_attempts_exceeded' });
  const match = safeEqual(sha256(code), challenge.code_hash);
  if (!match) {
    await repo.touchEmailChallenge(challenge.id, { attempts:challenge.attempts + 1 });
    return res.status(400).json(generic);
  }
  const verifiedAt = new Date().toISOString();
  await repo.touchEmailChallenge(challenge.id, { used_at:verifiedAt });
  await repo.updateLead(req.lead.id, { email_verified_at:verifiedAt });
  await repo.insertAnalytics({ session_id:'server', lead_id:req.lead.id, event_name:'email_verified', metadata:{} }).catch(() => {});
  res.json({ ok:true });
} catch (e) { next(e); } });

router.post('/verify-email/resend', sameOrigin, leadSession, async (req,res,next) => { try {
  if (!config.emailVerificationEnabled) return res.status(404).json({ error:'not_found' });
  if (req.lead.email_verified_at) return res.json({ ok:true, alreadyVerified:true });
  const last = await repo.getLatestEmailChallenge(req.lead.id);
  if (last) {
    const elapsedSeconds = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsedSeconds < config.emailVerificationResendSeconds) return res.status(429).json({ error:'resend_cooldown', retryAfterSeconds:Math.ceil(config.emailVerificationResendSeconds - elapsedSeconds) });
  }
  const devCode = await issueEmailChallenge(req.lead);
  res.json({ ok:true, ...(config.demoMode ? { devCode } : {}) });
} catch (e) { next(e); } });

router.post('/verify-email/change', sameOrigin, leadSession, async (req,res,next) => { try {
  if (!config.emailVerificationEnabled) return res.status(404).json({ error:'not_found' });
  if (req.lead.payment_status === 'paid') return res.status(409).json({ error:'email_locked_after_payment' });
  const email = emailSchema.parse(req.body.email);
  if (email === String(req.lead.email || '').toLowerCase() && !req.lead.email_verified_at) {
    const last = await repo.getLatestEmailChallenge(req.lead.id);
    if (last) {
      const elapsedSeconds = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (elapsedSeconds < config.emailVerificationResendSeconds) return res.status(429).json({ error:'resend_cooldown', retryAfterSeconds:Math.ceil(config.emailVerificationResendSeconds - elapsedSeconds) });
    }
  }
  const updated = await repo.updateLead(req.lead.id, { email, email_verified_at:null });
  const devCode = await issueEmailChallenge(updated);
  await repo.insertAnalytics({ session_id:'server', lead_id:req.lead.id, event_name:'email_changed', metadata:{} }).catch(() => {});
  res.json({ ok:true, ...(config.demoMode ? { devCode } : {}) });
} catch (e) { next(e); } });

router.get('/me', noStore, optionalLeadSession, async (req,res,next) => { try {
  if (!req.lead) return res.json({ authenticated:false });
  const count = await repo.countResults(req.lead.id);
  res.json({ authenticated:true, lead:{ id:req.lead.id, email:req.lead.email, paymentStatus:req.lead.payment_status, generationStatus:req.lead.generation_status, resultCount:count } });
} catch (e) { next(e); } });

router.post('/checkout', sameOrigin, leadSession, async (req,res,next) => { try {
  const settings = await repo.getSettings();
  if (String(settings.checkout_enabled ?? config.checkoutEnabled) === 'false') return res.status(503).json({ error:'checkout_disabled' });
  if (config.emailVerificationEnabled && !req.lead.email_verified_at) return res.status(403).json({ error:'email_verification_required' });
  if (req.lead.upload_status !== 'ready') return res.status(409).json({ error:'upload_not_ready' });
  if (req.lead.payment_status === 'paid') return res.json({ checkoutUrl:'/dashboard', alreadyPaid:true });
  if (req.body?.acceptedPurchaseTerms !== true) return res.status(400).json({ error:'purchase_terms_required' });
  if (!config.demoMode && (!config.paddleClientToken || !config.paddlePriceId || !config.paddleWebhookSecret)) return res.status(503).json({ error:'checkout_not_configured' });

  await repo.updateLead(req.lead.id, { payment_status:'checkout_started', payment_provider:'paddle' });
  await repo.insertAnalytics({ session_id:req.body?.sessionId || 'unknown', lead_id:req.lead.id, event_name:'purchase_terms_accepted', metadata:{ product:'personalized_hairstyle_collection', price:config.priceDisplayUsd, provider:'paddle' } });
  await repo.insertAnalytics({ session_id:req.body?.sessionId || 'unknown', lead_id:req.lead.id, event_name:'checkout_start', metadata:{ provider:'paddle' } });
  if (config.demoMode) return res.json({ demo:true, checkoutUrl:`/demo-checkout?lead=${encodeURIComponent(req.lead.id)}` });

  res.json({
    clientToken: config.paddleClientToken,
    environment: config.paddleEnvironment,
    priceId: config.paddlePriceId,
    customerEmail: req.lead.email,
    customData: { lead_id:req.lead.id, lead_sig:signLeadForCheckout(req.lead.id) }
  });
} catch (e) { next(e); } });

router.post('/demo/pay', sameOrigin, leadSession, async (req,res,next) => { try {
  if (!config.demoMode) return res.status(404).end();
  const price = Number(config.priceDisplayUsd);
  await repo.updateLead(req.lead.id, { payment_status:'paid', payment_order_id:`DEMO-${Date.now()}`, payment_amount:price, payment_currency:'USD', paid_at:new Date().toISOString(), generation_status:'manual_pending' });
  await repo.upsertPayment({ lead_id:req.lead.id, provider:'demo', provider_order_id:`DEMO-${req.lead.id}`, status:'paid', amount:price, currency:'USD', paid_at:new Date().toISOString(), raw_payload:{ demo:true } });
  await repo.insertAnalytics({ session_id:req.body?.sessionId || 'demo', lead_id:req.lead.id, event_name:'payment_success', metadata:{ provider:'demo' } });
  res.json({ ok:true, redirect:'/dashboard' });
} catch (e) { next(e); } });

router.get('/dashboard', noStore, leadSession, async (req,res,next) => { try {
  const results = await repo.listResults(req.lead.id);
  const safe = [];
  for (const r of results) if (!r.deleted_at) safe.push({ ...r, url:await signedResultUrl(r.storage_path) });
  const settings = await repo.getSettings();
  const targetCount = Math.min(30, Math.max(1, Number(settings.generation_target_count || config.generationTargetCount)));
  const isPaid = req.lead.payment_status === 'paid';
  const orderId = String(req.lead.payment_order_id || '').trim();
  const isCrypto = String(req.lead.payment_provider || '').startsWith('crypto_');
  const purchase = isPaid && orderId ? {
    eventId:isCrypto ? `crypto:${orderId}` : `purchase:${orderId}`,
    orderId,
    value:isCrypto ? Number(config.cryptoPriceUsdt) : Number(req.lead.payment_amount || config.priceDisplayUsd),
    currency:isCrypto ? 'USD' : String(req.lead.payment_currency || config.siteCurrency || 'USD').toUpperCase()
  } : null;
  res.json({ lead:{ id:req.lead.id, email:req.lead.email, paymentStatus:req.lead.payment_status, generationStatus:req.lead.generation_status, profile:{ ageRange:req.lead.age_range, currentLength:req.lead.current_length, desiredLength:req.lead.desired_length, texture:req.lead.texture, currentColor:req.lead.current_color, desiredColors:req.lead.desired_colors, styleGoals:req.lead.style_goals, grayPreference:req.lead.gray_preference } }, purchase, targetCount, results:safe });
} catch (e) { next(e); } });

router.get('/results/:id/download', leadSession, async (req,res,next) => { try {
  const result = await repo.getResult(req.params.id);
  if (!result || result.lead_id !== req.lead.id || result.deleted_at) return res.status(404).end();
  await repo.insertAnalytics({ session_id:'server', lead_id:req.lead.id, event_name:'download_result', metadata:{ resultId:result.id } });
  res.redirect(await signedResultUrl(result.storage_path, 120, true));
} catch (e) { next(e); } });

router.post('/auth/request-link', sameOrigin, async (req,res,next) => { try {
  const email = emailSchema.parse(req.body.email);
  const lead = await repo.getLeadByEmail(email);
  const generic = { ok:true, message:'If a matching account exists, a sign-in link has been sent.' };
  if (!lead) return res.json(generic);
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60_000).toISOString();
  await repo.createMagicLink({ email, purpose:'user', leadId:lead.id, tokenHash:tokenHash(raw), expiresAt });
  const url = `${config.appUrl}/auth/magic?token=${encodeURIComponent(raw)}`;
  const sent = await sendMagicLink({ to:email, url });
  res.json(config.demoMode ? { ...generic, devMagicLink:sent.devUrl } : generic);
} catch (e) { next(e); } });

router.get('/auth/magic', async (req,res,next) => { try {
  const raw = z.string().min(20).max(200).parse(req.query.token);
  const link = await repo.consumeMagicLink(tokenHash(raw));
  if (!link || link.purpose !== 'user') return res.redirect('/signin?error=expired');
  await createLeadSession(res, link.lead_id);
  res.redirect('/dashboard');
} catch (e) { next(e); } });

router.delete('/account', sameOrigin, leadSession, async (req,res,next) => { try {
  const detail = await repo.getCustomerDetail(req.lead.id);
  if (detail?.lead?.upload_path && !detail.lead.original_deleted_at) await deleteOriginal(detail.lead.upload_path).catch(() => {});
  for (const result of detail?.results || []) if (result.storage_path && !result.deleted_at) await deleteResult(result.storage_path).catch(() => {});
  await repo.deleteLead(req.lead.id);
  res.clearCookie('hair_lead_session', { path:'/' });
  res.json({ ok:true });
} catch (e) { next(e); } });

router.post('/logout', sameOrigin, optionalLeadSession, async (req,res,next) => { try {
  const raw = req.cookies?.hair_lead_session;
  if (raw) await repo.deleteLeadSession(tokenHash(raw));
  res.clearCookie('hair_lead_session', { path:'/' });
  res.json({ ok:true });
} catch (e) { next(e); } });

export default router;
