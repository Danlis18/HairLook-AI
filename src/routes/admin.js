import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { randomToken, tokenHash } from '../lib/crypto.js';
import { sendMagicLink, sendResultsReady } from '../lib/mailer.js';
import { signedOriginalUrl, signedResultUrl, deleteOriginal, deleteResult } from '../lib/storage.js';
import { adminSession, sameOrigin, noStore } from '../middleware.js';

const router = Router();
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const uuidSchema = z.string().uuid();

function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.adminSessionTtlHours * 3600_000,
    path: '/'
  };
}

function csvCell(value) {
  if (value == null) return '';
  const raw = Array.isArray(value) ? value.join(' | ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

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
    const sessionRaw = randomToken();
    const expiresAt = new Date(Date.now() + config.adminSessionTtlHours * 3600_000).toISOString();
    await repo.createAdminSession(link.email, tokenHash(sessionRaw), expiresAt);
    res.cookie('hair_admin_session', sessionRaw, adminCookieOptions());
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
    if (count) await repo.updateLead(id, { generation_status: 'queued' });
    await repo.audit({ adminEmail: req.admin.email, action: 'generation_retry', targetType: 'customer', targetId: id, metadata: { count } });
    res.json({ ok: true, count });
  } catch (error) { next(error); }
});

router.post('/customers/:id/send-results', sameOrigin, adminSession, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const lead = await repo.getLead(id);
    if (!lead) return res.status(404).json({ error: 'not_found' });
    await sendResultsReady({ to: lead.email });
    await repo.audit({ adminEmail: req.admin.email, action: 'results_email_send', targetType: 'customer', targetId: id });
    res.json({ ok: true });
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

router.get('/export/customers.csv', adminSession, async (req, res, next) => {
  try {
    const header = ['customer_id','email','age_range','gender','current_length','desired_length','texture','current_color','desired_colors','style_goals','gray_preference','payment_status','payment_amount','payment_currency','paid_at','generation_status','result_count','utm_source','utm_medium','utm_campaign','utm_content','created_at'];
    const lines = [header.join(',')];
    let offset=0;
    let exported=0;
    const batchSize=500;
    while(true){
      const {rows,total}=await repo.listLeads({limit:batchSize,offset});
      if(!rows.length)break;
      const counts=await repo.resultCounts(rows.map(row=>row.id));
      for(const row of rows)lines.push(header.map(key=>csvCell(key==='customer_id'?row.id:key==='result_count'?(counts[row.id]||0):row[key])).join(','));
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
