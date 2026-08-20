import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { randomToken, tokenHash, safeEqual } from '../lib/crypto.js';
import { sendMagicLink, sendResultsReady } from '../lib/mailer.js';
import { localeFromLead } from '../lib/locale.js';
import { signedOriginalUrl, signedResultUrl, putResult, deleteOriginal, deleteResult } from '../lib/storage.js';
import { adminSession, sameOrigin, noStore } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 } });
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const uuidSchema = z.string().uuid();

function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: config.adminSessionTtlHours * 3600_000,
    path: '/'
  };
}

async function startAdminSession(res, email) {
  const sessionRaw = randomToken();
  const expiresAt = new Date(Date.now() + config.adminSessionTtlHours * 3600_000).toISOString();
  await repo.createAdminSession(email, tokenHash(sessionRaw), expiresAt);
  res.cookie('hair_admin_session', sessionRaw, adminCookieOptions());
}

async function resultsAccessUrl(lead) {
  const raw=randomToken();
  const expiresAt=new Date(Date.now()+Math.max(config.magicLinkTtlMinutes,1440)*60_000).toISOString();
  await repo.createMagicLink({email:lead.email,purpose:'user',leadId:lead.id,tokenHash:tokenHash(raw),expiresAt});
  return `${config.appUrl}/auth/magic?token=${encodeURIComponent(raw)}`;
}

function csvCell(value) {
  if (value == null) return '';
  const raw = Array.isArray(value) ? value.join(' | ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

// Public: lets the /admin login page know which login methods are usable without
// requiring an authenticated session or leaking any secret values.
router.get('/login-methods', (req, res) => {
  res.json({ passwordLogin: !!config.adminPassword, magicLink: config.demoMode || !!config.resendApiKey });
});

router.post('/auth/login', sameOrigin, async (req, res, next) => {
  try {
    const invalid = () => res.status(401).json({ error: 'invalid_credentials' });
    const emailParse = emailSchema.safeParse(req.body?.email);
    const password = String(req.body?.password ?? '');
    if (!config.adminPassword) return invalid();
    const email = emailParse.success ? emailParse.data : '';
    // Always run both checks (no short-circuit) so response timing doesn't reveal which one failed.
    const emailOk = !!email && config.adminEmails.includes(email);
    const passwordOk = safeEqual(password, config.adminPassword);
    if (!emailOk || !passwordOk) return invalid();
    await startAdminSession(res, email);
    await repo.audit({ adminEmail: email, action: 'admin_login', targetType: 'admin', metadata: { method: 'password' } });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/auth/request-link', sameOrigin, async (req, res, next) => {
  try {
    const email = emailSchema.parse(req.body.email);
    const generic = { ok: true, message: 'If this email is authorized, a sign-in link has been sent.' };
    if (!config.adminEmails.includes(email)) return res.json(generic);
    const raw = randomToken();
    const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60_000).toISOString();
    await repo.createMagicLink({ email, purpose: 'admin', tokenHash: tokenHash(raw), expiresAt });
    const url = `${config.appUrl}/admin/magic?token=${encodeURIComponent(raw)}`;
    const sent = await sendMagicLink({ to: email, url, admin: true });
    res.json(config.demoMode ? { ...generic, devMagicLink: sent.devUrl } : generic);
  } catch (error) { next(error); }
});

router.get('/magic', async (req, res, next) => {
  try {
    const raw = z.string().min(20).max(200).parse(req.query.token);
    const link = await repo.consumeMagicLink(tokenHash(raw));
    if (!link || link.purpose !== 'admin' || !config.adminEmails.includes(String(link.email).toLowerCase())) return res.redirect('/admin?error=expired');
    await startAdminSession(res, link.email);
    res.redirect('/admin');
  } catch (error) { next(error); }
});

router.get('/me', noStore, adminSession, (req, res) => res.json({ authenticated: true, email: req.admin.email }));

router.post('/logout', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const raw = req.cookies?.hair_admin_session;
    if (raw) await repo.deleteAdminSession(tokenHash(raw));
    res.clearCookie('hair_admin_session', { path: '/' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/overview', noStore, adminSession, async (req, res, next) => {
  try {
    const [overview, funnel] = await Promise.all([repo.overview(), repo.analyticsSummary()]);
    res.json({ overview, funnel });
  } catch (error) { next(error); }
});

router.get('/customers', noStore, adminSession, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const search = String(req.query.search || '').slice(0, 120);
    res.json(await repo.listLeads({ limit, offset, search }));
  } catch (error) { next(error); }
});

router.get('/customers/:id', noStore, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const detail = await repo.getCustomerDetail(id);
    if (!detail) return res.status(404).json({ error: 'not_found' });
    const safeResults = [];
    for (const result of detail.results || []) {
      if (!result.deleted_at) safeResults.push({ ...result, url: await signedResultUrl(result.storage_path) });
    }
    res.json({ ...detail, results: safeResults });
  } catch (error) { next(error); }
});

router.get('/customers/:id/photo', noStore, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead || !lead.upload_path || lead.original_deleted_at) return res.status(404).json({ error: 'photo_not_available' });
    await repo.audit({ adminEmail: req.admin.email, action: 'photo_reveal', targetType: 'customer', targetId: id });
    res.json({ url: await signedOriginalUrl(lead.upload_path, 120) });
  } catch (error) { next(error); }
});

router.delete('/customers/:id/photo', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead) return res.status(404).json({ error: 'not_found' });
    if (lead.upload_path && !lead.original_deleted_at) await deleteOriginal(lead.upload_path);
    await repo.updateLead(id, { original_deleted_at: new Date().toISOString() });
    await repo.audit({ adminEmail: req.admin.email, action: 'photo_delete', targetType: 'customer', targetId: id });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/customers/:id/retry', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const count = await repo.retryFailedJobs(id);
    if (count) await repo.updateLead(id, { generation_status: 'manual_pending' });
    await repo.audit({ adminEmail: req.admin.email, action: 'generation_retry', targetType: 'customer', targetId: id, metadata: { count } });
    res.json({ ok: true, count });
  } catch (error) { next(error); }
});

router.post('/customers/:id/send-results', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead) return res.status(404).json({ error: 'not_found' });
    await sendResultsReady({to:lead.email,locale:localeFromLead(lead),url:await resultsAccessUrl(lead),force:lead.access_mode==='reviewer_demo',demo:lead.access_mode==='reviewer_demo'});
    await repo.audit({ adminEmail: req.admin.email, action: 'results_email_send', targetType: 'customer', targetId: id });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/customers/:id/results', sameOrigin, adminSession, upload.single('photo'), async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead) return res.status(404).json({ error: 'not_found' });
    if (lead.payment_status !== 'paid') return res.status(409).json({ error: 'not_paid' });
    if (!req.file) return res.status(400).json({ error: 'photo_required' });
    let meta; try { meta = await sharp(req.file.buffer, { failOn: 'error' }).metadata(); } catch { return res.status(400).json({ error: 'invalid_image' }); }
    if (!['jpeg','png','webp','heif'].includes(meta.format)) return res.status(400).json({ error: 'unsupported_image' });
    const buffer = await sharp(req.file.buffer, { failOn: 'error' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
    const existing = await repo.listResults(id);
    const sortOrder = existing.length ? Math.max(...existing.map(r => r.sort_order || 0)) + 1 : 1;
    const category = String(req.body.category || 'Recommended').slice(0, 60);
    const styleName = String(req.body.styleName || `Manual result ${sortOrder}`).slice(0, 80);
    const resultId = randomUUID();
    const storagePath = await putResult(id, resultId, buffer, 'image/jpeg');
    await repo.addResult({ id: resultId, lead_id: id, job_id: null, category, style_name: styleName, sort_order: sortOrder, storage_path: storagePath, provider: 'manual', model: null, provider_prediction_id: null, cost_usd: 0, metadata: { uploadedBy: req.admin.email } });
    if (!['manual_processing','completed'].includes(lead.generation_status)) await repo.updateLead(id, { generation_status: 'manual_processing' });
    await repo.audit({ adminEmail: req.admin.email, action: 'result_upload', targetType: 'customer', targetId: id, metadata: { resultId, category, styleName } });
    res.status(201).json({ ok: true, result: { id: resultId, category, style_name: styleName, sort_order: sortOrder, url: await signedResultUrl(storagePath) } });
  } catch (error) { next(error); }
});

router.delete('/customers/:id/results/:resultId', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const resultId = uuidSchema.parse(req.params.resultId);
    const result = await repo.getResult(resultId);
    if (!result || result.lead_id !== id || result.deleted_at) return res.status(404).json({ error: 'not_found' });
    await deleteResult(result.storage_path).catch(() => {});
    await repo.markResultDeleted(resultId);
    await repo.audit({ adminEmail: req.admin.email, action: 'result_delete', targetType: 'customer', targetId: id, metadata: { resultId } });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/customers/:id/complete', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead) return res.status(404).json({ error: 'not_found' });
    const count = await repo.countResults(id);
    if (!count) return res.status(400).json({ error: 'no_results' });
    const updated = await repo.updateLead(id, { generation_status: 'completed' });
    if (!updated?.results_notified_at) {
      await sendResultsReady({to:lead.email,locale:localeFromLead(lead),url:await resultsAccessUrl(lead),force:lead.access_mode==='reviewer_demo',demo:lead.access_mode==='reviewer_demo'}).catch(() => {});
      await repo.updateLead(id, { results_notified_at: new Date().toISOString() });
    }
    await repo.audit({ adminEmail: req.admin.email, action: 'fulfillment_complete', targetType: 'customer', targetId: id, metadata: { count } });
    res.json({ ok: true, count });
  } catch (error) { next(error); }
});

router.delete('/customers/:id', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const detail = await repo.getCustomerDetail(id);
    if (!detail) return res.status(404).json({ error: 'not_found' });
    if (detail.lead.upload_path && !detail.lead.original_deleted_at) await deleteOriginal(detail.lead.upload_path).catch(() => {});
    for (const result of detail.results || []) if (result.storage_path && !result.deleted_at) await deleteResult(result.storage_path).catch(() => {});
    await repo.audit({ adminEmail: req.admin.email, action: 'customer_delete', targetType: 'customer', targetId: id, metadata: { emailHashOnly: true } });
    await repo.deleteLead(id);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/payments', noStore, adminSession, async (req, res, next) => {
  try { res.json(await repo.listPayments({ limit: Math.min(Number(req.query.limit || 100), 200), offset: Math.max(Number(req.query.offset || 0), 0) })); }
  catch (error) { next(error); }
});

router.get('/generations', noStore, adminSession, async (req, res, next) => {
  try { res.json(await repo.listJobs({ limit: Math.min(Number(req.query.limit || 100), 200), offset: Math.max(Number(req.query.offset || 0), 0), status: String(req.query.status || '') })); }
  catch (error) { next(error); }
});

router.get('/reviewer-invites', noStore, adminSession, async (req,res,next) => { try {
  res.json({rows:await repo.listReviewerInvites(Math.min(Number(req.query.limit||100),200))});
} catch (error) { next(error); } });

router.post('/reviewer-invites', sameOrigin, adminSession, async (req,res,next) => { try {
  const input=z.object({reviewerEmail:z.union([emailSchema,z.literal('')]).optional(),locale:z.enum(['en','pt-BR']).default('en'),ttlHours:z.coerce.number().int().min(1).max(168).default(config.reviewerInviteTtlHours)}).parse(req.body||{});
  const raw=randomToken();
  const expiresAt=new Date(Date.now()+input.ttlHours*3600_000).toISOString();
  const invite=await repo.createReviewerInvite({tokenHash:tokenHash(raw),reviewerEmail:input.reviewerEmail||null,locale:input.locale,createdBy:req.admin.email,expiresAt});
  const url=`${config.appUrl}/api/reviewer/accept?token=${encodeURIComponent(raw)}`;
  await repo.audit({adminEmail:req.admin.email,action:'reviewer_invite_create',targetType:'reviewer_invite',targetId:invite.id,metadata:{reviewerEmail:invite.reviewer_email||null,locale:invite.locale,expiresAt}});
  res.status(201).json({invite:{id:invite.id,reviewerEmail:invite.reviewer_email,locale:invite.locale,expiresAt:invite.expires_at,url}});
} catch (error) { next(error); } });

router.delete('/reviewer-invites/:id', sameOrigin, adminSession, async (req,res,next) => { try {
  const id=uuidSchema.parse(req.params.id);
  const invite=await repo.revokeReviewerInvite(id);
  if(!invite)return res.status(404).json({error:'not_found'});
  await repo.audit({adminEmail:req.admin.email,action:'reviewer_invite_revoke',targetType:'reviewer_invite',targetId:id});
  res.json({ok:true});
} catch (error) { next(error); } });

router.get('/analytics', noStore, adminSession, async (req, res, next) => {
  try { res.json(await repo.analyticsSummary()); }
  catch (error) { next(error); }
});

router.get('/settings', noStore, adminSession, async (req, res, next) => {
  try { res.json(await repo.getSettings()); }
  catch (error) { next(error); }
});

router.put('/settings', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const allowed = new Set(['price_display_usd','generation_target_count','support_email','checkout_enabled','generation_enabled','maintenance_mode','original_retention_hours','result_retention_days']);
    const entries = {};
    for (const [key, value] of Object.entries(req.body || {})) if (allowed.has(key)) entries[key] = String(value).slice(0, 200);
    if(entries.generation_target_count){const n=Number(entries.generation_target_count);if(!Number.isInteger(n)||n<1||n>30)return res.status(400).json({error:'invalid_generation_target'});entries.generation_target_count=String(n);}
    if(entries.original_retention_hours){const n=Number(entries.original_retention_hours);if(!Number.isInteger(n)||n<1||n>24*90)return res.status(400).json({error:'invalid_original_retention'});entries.original_retention_hours=String(n);}
    if(entries.result_retention_days){const n=Number(entries.result_retention_days);if(!Number.isInteger(n)||n<1||n>365)return res.status(400).json({error:'invalid_result_retention'});entries.result_retention_days=String(n);}
    if(entries.price_display_usd){const n=Number(entries.price_display_usd);if(!Number.isFinite(n)||n<=0||n>10000)return res.status(400).json({error:'invalid_display_price'});entries.price_display_usd=n.toFixed(2);}
    if(entries.support_email)entries.support_email=emailSchema.parse(entries.support_email);
    for(const key of ['checkout_enabled','generation_enabled','maintenance_mode'])if(key in entries&&!['true','false'].includes(entries[key]))return res.status(400).json({error:`invalid_${key}`});
    const settings = await repo.setSettings(entries);
    await repo.audit({ adminEmail: req.admin.email, action: 'settings_change', targetType: 'settings', metadata: { keys: Object.keys(entries) } });
    res.json(settings);
  } catch (error) { next(error); }
});

router.get('/audit', noStore, adminSession, async (req, res, next) => {
  try { res.json(await repo.listAudit(Math.min(Number(req.query.limit || 100), 250))); }
  catch (error) { next(error); }
});

function csvAmount(row) {
  if (row.payment_amount == null) return '';
  return `${row.payment_amount}${row.payment_currency ? ` ${row.payment_currency}` : ''}`;
}

function csvUtm(row) {
  const utm = {};
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) if (row[key]) utm[key.replace('utm_','')] = row[key];
  return utm;
}

router.get('/export/customers.csv', adminSession, async (req, res, next) => {
  try {
    const header = ['Email','Age','Gender','Quiz','Payment','Amount','Order ID','Fulfillment Status','Date','UTM'];
    const lines = [header.join(',')];
    let offset=0;
    let exported=0;
    const batchSize=500;
    while(true){
      const {rows,total}=await repo.listLeads({limit:batchSize,offset});
      if(!rows.length)break;
      for(const row of rows){
        lines.push([
          csvCell(row.email),
          csvCell(row.age_range),
          csvCell(row.gender),
          csvCell(row.quiz_answers),
          csvCell(row.payment_status),
          csvCell(csvAmount(row)),
          csvCell(row.payment_order_id),
          csvCell(row.generation_status),
          csvCell(row.created_at),
          csvCell(csvUtm(row))
        ].join(','));
      }
      exported+=rows.length;
      offset+=rows.length;
      if(offset>=total||rows.length<batchSize)break;
    }
    await repo.audit({ adminEmail: req.admin.email, action: 'csv_export', targetType: 'customers', metadata: { rows: exported } });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hairlook-customers-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(`\uFEFF${lines.join('\r\n')}`);
  } catch (error) { next(error); }
});

export default router;
