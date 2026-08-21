import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getSupabase } from './supabase.js';

const DEMO_DB = path.resolve('data/demo-db.json');
const now = () => new Date().toISOString();
const defaultState = () => ({
  hair_leads: [], lead_sessions: [], admin_sessions: [], magic_links: [], payments: [], payment_events: [],
  generation_jobs: [], generation_results: [], analytics_events: [], admin_audit_logs: [], email_verification_challenges: [], reviewer_demo_invites: [],
  site_settings: [
    { key:'price_display_usd', value: config.priceDisplayUsd, type:'string', updated_at:now() },
    { key:'generation_target_count', value:String(config.generationTargetCount), type:'number', updated_at:now() },
    { key:'support_email', value:config.supportEmail, type:'string', updated_at:now() },
    { key:'checkout_enabled', value:String(config.checkoutEnabled), type:'boolean', updated_at:now() },
    { key:'generation_enabled', value:String(config.generationEnabled), type:'boolean', updated_at:now() },
    { key:'maintenance_mode', value:String(config.maintenanceMode), type:'boolean', updated_at:now() },
    { key:'original_retention_hours', value:String(config.originalRetentionHours), type:'number', updated_at:now() },
    { key:'result_retention_days', value:String(config.resultRetentionDays), type:'number', updated_at:now() }
  ]
});

function loadDemo() {
  if (!fs.existsSync(DEMO_DB)) {
    fs.mkdirSync(path.dirname(DEMO_DB), { recursive:true });
    fs.writeFileSync(DEMO_DB, JSON.stringify(defaultState(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DEMO_DB, 'utf8'));
}
function saveDemo(state) {
  const temp = `${DEMO_DB}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, DEMO_DB);
}
function normalizeRow(row) { return row ? structuredClone(row) : null; }

export const repo = {
  async createLead(payload) {
    const row = { id: randomUUID(), ...payload, created_at: now(), updated_at: now() };
    if (config.demoMode) { const s=loadDemo(); s.hair_leads.push(row); saveDemo(s); return normalizeRow(row); }
    const { data, error } = await getSupabase().from('hair_leads').insert(payload).select('*').single();
    if (error) throw error; return data;
  },

  async updateLead(id, patch) {
    patch.updated_at = now();
    if (config.demoMode) { const s=loadDemo(); const i=s.hair_leads.findIndex(x=>x.id===id); if(i<0) return null; s.hair_leads[i]={...s.hair_leads[i],...patch}; saveDemo(s); return normalizeRow(s.hair_leads[i]); }
    const { data, error } = await getSupabase().from('hair_leads').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw error; return data;
  },

  async getLead(id) {
    if (config.demoMode) return normalizeRow(loadDemo().hair_leads.find(x=>x.id===id));
    const { data, error } = await getSupabase().from('hair_leads').select('*').eq('id',id).maybeSingle(); if(error) throw error; return data;
  },

  async getLeadByEmail(email) {
    const e=String(email).toLowerCase();
    if (config.demoMode) return normalizeRow(loadDemo().hair_leads.filter(x=>x.email?.toLowerCase()===e).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]);
    const { data, error } = await getSupabase().from('hair_leads').select('*').ilike('email',e).order('created_at',{ascending:false}).limit(1).maybeSingle(); if(error) throw error; return data;
  },

  async createLeadSession(leadId, tokenHash, expiresAt) {
    const row={ id:randomUUID(), lead_id:leadId, token_hash:tokenHash, expires_at:expiresAt, created_at:now(), last_seen_at:now() };
    if(config.demoMode){const s=loadDemo();s.lead_sessions.push(row);saveDemo(s);return row;}
    const {data,error}=await getSupabase().from('lead_sessions').insert({lead_id:leadId,token_hash:tokenHash,expires_at:expiresAt}).select('*').single(); if(error) throw error; return data;
  },

  async getLeadBySession(tokenHash) {
    if(config.demoMode){const s=loadDemo();const sess=s.lead_sessions.find(x=>x.token_hash===tokenHash && x.expires_at>now());return sess?normalizeRow(s.hair_leads.find(x=>x.id===sess.lead_id)):null;}
    const {data:session,error}=await getSupabase().from('lead_sessions').select('lead_id,expires_at').eq('token_hash',tokenHash).gt('expires_at',now()).maybeSingle(); if(error) throw error; if(!session)return null; return this.getLead(session.lead_id);
  },

  async deleteLeadSession(tokenHash) {
    if(config.demoMode){const s=loadDemo();s.lead_sessions=s.lead_sessions.filter(x=>x.token_hash!==tokenHash);saveDemo(s);return;}
    const {error}=await getSupabase().from('lead_sessions').delete().eq('token_hash',tokenHash); if(error) throw error;
  },

  async createAdminSession(email, tokenHash, expiresAt) {
    const row={id:randomUUID(),email:email.toLowerCase(),token_hash:tokenHash,expires_at:expiresAt,created_at:now(),last_seen_at:now()};
    if(config.demoMode){const s=loadDemo();s.admin_sessions.push(row);saveDemo(s);return row;}
    const {data,error}=await getSupabase().from('admin_sessions').insert({email:row.email,token_hash:tokenHash,expires_at:expiresAt}).select('*').single(); if(error)throw error;return data;
  },

  async getAdminBySession(tokenHash) {
    if(config.demoMode){const sess=loadDemo().admin_sessions.find(x=>x.token_hash===tokenHash&&x.expires_at>now());return sess?{email:sess.email}:null;}
    const {data,error}=await getSupabase().from('admin_sessions').select('email').eq('token_hash',tokenHash).gt('expires_at',now()).maybeSingle(); if(error)throw error;return data;
  },

  async deleteAdminSession(tokenHash) {
    if(config.demoMode){const s=loadDemo();s.admin_sessions=s.admin_sessions.filter(x=>x.token_hash!==tokenHash);saveDemo(s);return;}
    const {error}=await getSupabase().from('admin_sessions').delete().eq('token_hash',tokenHash);if(error)throw error;
  },

  async createReviewerInvite({ tokenHash, reviewerEmail=null, locale='en', createdBy, expiresAt }) {
    const row={id:randomUUID(),token_hash:tokenHash,reviewer_email:reviewerEmail?.toLowerCase()||null,locale,created_by:createdBy.toLowerCase(),expires_at:expiresAt,lead_id:null,used_at:null,revoked_at:null,created_at:now()};
    if(config.demoMode){const s=loadDemo();s.reviewer_demo_invites=s.reviewer_demo_invites||[];s.reviewer_demo_invites.push(row);saveDemo(s);return normalizeRow(row);}
    const {data,error}=await getSupabase().from('reviewer_demo_invites').insert({token_hash:row.token_hash,reviewer_email:row.reviewer_email,locale:row.locale,created_by:row.created_by,expires_at:row.expires_at}).select('*').single();if(error)throw error;return data;
  },

  async getReviewerInvite(tokenHash) {
    if(config.demoMode){const row=(loadDemo().reviewer_demo_invites||[]).find(x=>x.token_hash===tokenHash);return normalizeRow(row);}
    const {data,error}=await getSupabase().from('reviewer_demo_invites').select('*').eq('token_hash',tokenHash).maybeSingle();if(error)throw error;return data;
  },

  async claimReviewerInvite(tokenHash, leadId, email) {
    if(config.demoMode){const s=loadDemo();s.reviewer_demo_invites=s.reviewer_demo_invites||[];const row=s.reviewer_demo_invites.find(x=>x.token_hash===tokenHash&&!x.revoked_at&&!x.used_at&&!x.lead_id&&x.expires_at>now()&&(!x.reviewer_email||x.reviewer_email===String(email).toLowerCase()));if(!row)return null;row.lead_id=leadId;row.used_at=now();saveDemo(s);return normalizeRow(row);}
    const {data,error}=await getSupabase().rpc('claim_reviewer_demo_invite',{p_token_hash:tokenHash,p_lead_id:leadId,p_email:String(email).toLowerCase()});if(error)throw error;return Array.isArray(data)?data[0]||null:data;
  },

  async listReviewerInvites(limit=100) {
    if(config.demoMode)return (loadDemo().reviewer_demo_invites||[]).slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,limit).map(normalizeRow);
    const {data,error}=await getSupabase().from('reviewer_demo_invites').select('id,reviewer_email,locale,created_by,expires_at,lead_id,used_at,revoked_at,created_at').order('created_at',{ascending:false}).limit(limit);if(error)throw error;return data||[];
  },

  async revokeReviewerInvite(id) {
    const revokedAt=now();
    if(config.demoMode){const s=loadDemo();const row=(s.reviewer_demo_invites||[]).find(x=>x.id===id);if(!row)return null;row.revoked_at=revokedAt;saveDemo(s);return normalizeRow(row);}
    const {data,error}=await getSupabase().from('reviewer_demo_invites').update({revoked_at:revokedAt}).eq('id',id).select('*').maybeSingle();if(error)throw error;return data;
  },

  async createMagicLink({ email, purpose, leadId=null, tokenHash, expiresAt }) {
    const row={id:randomUUID(),email:email.toLowerCase(),purpose,lead_id:leadId,token_hash:tokenHash,expires_at:expiresAt,used_at:null,created_at:now()};
    if(config.demoMode){const s=loadDemo();s.magic_links.push(row);saveDemo(s);return row;}
    const {data,error}=await getSupabase().from('magic_links').insert({email:row.email,purpose,lead_id:leadId,token_hash:tokenHash,expires_at:expiresAt}).select('*').single();if(error)throw error;return data;
  },

  async consumeMagicLink(tokenHash) {
    if(config.demoMode){const s=loadDemo();const i=s.magic_links.findIndex(x=>x.token_hash===tokenHash&&!x.used_at&&x.expires_at>now());if(i<0)return null;s.magic_links[i].used_at=now();const r=normalizeRow(s.magic_links[i]);saveDemo(s);return r;}
    const {data,error}=await getSupabase().rpc('consume_magic_link',{p_token_hash:tokenHash});if(error)throw error;return Array.isArray(data)?data[0]||null:data;
  },

  async createEmailChallenge({ leadId, email, codeHash, expiresAt, maxAttempts }) {
    const row = { id: randomUUID(), lead_id: leadId, email: email.toLowerCase(), code_hash: codeHash, attempts: 0, max_attempts: maxAttempts, expires_at: expiresAt, used_at: null, created_at: now() };
    if (config.demoMode) { const s = loadDemo(); s.email_verification_challenges = s.email_verification_challenges || []; s.email_verification_challenges.push(row); saveDemo(s); return row; }
    const { data, error } = await getSupabase().from('email_verification_challenges').insert({ lead_id: leadId, email: row.email, code_hash: codeHash, max_attempts: maxAttempts, expires_at: expiresAt }).select('*').single();
    if (error) throw error; return data;
  },

  async getLatestEmailChallenge(leadId) {
    if (config.demoMode) { const s = loadDemo(); const rows = (s.email_verification_challenges || []).filter(x => x.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at)); return rows[0] ? normalizeRow(rows[0]) : null; }
    const { data, error } = await getSupabase().from('email_verification_challenges').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error; return data;
  },

  async touchEmailChallenge(id, patch) {
    if (config.demoMode) { const s = loadDemo(); s.email_verification_challenges = s.email_verification_challenges || []; const row = s.email_verification_challenges.find(x => x.id === id); if (row) Object.assign(row, patch); saveDemo(s); return row ? normalizeRow(row) : null; }
    const { data, error } = await getSupabase().from('email_verification_challenges').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw error; return data;
  },

  async insertAnalytics(event) {
    const row={id:randomUUID(),created_at:now(),...event};
    if(config.demoMode){const s=loadDemo();s.analytics_events.push(row);saveDemo(s);return row;}
    const {error}=await getSupabase().from('analytics_events').insert(event); if(error)throw error; return row;
  },

  async insertPaymentEventIfNew(event) {
    const row={id:randomUUID(),created_at:now(),...event};
    if(config.demoMode){const s=loadDemo();if(s.payment_events.some(x=>x.provider===event.provider&&x.provider_event_id===event.provider_event_id)) return {inserted:false};s.payment_events.push(row);saveDemo(s);return {inserted:true,row};}
    const {data,error}=await getSupabase().from('payment_events').insert(event).select('*').maybeSingle();
    if(error){ if(error.code==='23505') return {inserted:false}; throw error; } return {inserted:true,row:data};
  },

  async upsertPayment(payment) {
    if(config.demoMode){const s=loadDemo();const i=s.payments.findIndex(x=>x.provider===payment.provider&&x.provider_order_id===payment.provider_order_id);const row={id:i>=0?s.payments[i].id:randomUUID(),created_at:i>=0?s.payments[i].created_at:now(),updated_at:now(),...payment};if(i>=0)s.payments[i]=row;else s.payments.push(row);saveDemo(s);return row;}
    const {data,error}=await getSupabase().from('payments').upsert({...payment,updated_at:now()},{onConflict:'provider,provider_order_id'}).select('*').single();if(error)throw error;return data;
  },

  async getPaymentByOrderId(provider, orderId) {
    if(config.demoMode){const s=loadDemo();return normalizeRow(s.payments.find(x=>x.provider===provider&&x.provider_order_id===orderId));}
    const {data,error}=await getSupabase().from('payments').select('*').eq('provider',provider).eq('provider_order_id',orderId).maybeSingle();if(error)throw error;return data;
  },

  async enqueueJobsIfEmpty(leadId, jobs) {
    if(config.demoMode){const s=loadDemo();if(s.generation_jobs.some(x=>x.lead_id===leadId))return false;for(const j of jobs)s.generation_jobs.push({id:randomUUID(),lead_id:leadId,status:'queued',attempts:0,created_at:now(),updated_at:now(),...j});saveDemo(s);return true;}
    const {count,error:e1}=await getSupabase().from('generation_jobs').select('id',{count:'exact',head:true}).eq('lead_id',leadId); if(e1)throw e1;
    if((count||0)>0)return false;
    const {error}=await getSupabase().from('generation_jobs').insert(jobs.map(j=>({lead_id:leadId,status:'queued',...j}))); if(error){if(error.code==='23505')return false;throw error;}return true;
  },

  async claimJob(workerId) {
    if(config.demoMode){const s=loadDemo();const job=s.generation_jobs.filter(x=>x.status==='queued' || (x.status==='retry' && (!x.run_after || x.run_after<=now()))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.created_at.localeCompare(b.created_at))[0];if(!job)return null;job.status='processing';job.worker_id=workerId;job.started_at=now();job.updated_at=now();job.attempts=(job.attempts||0)+1;saveDemo(s);return normalizeRow(job);}
    const {data,error}=await getSupabase().rpc('claim_generation_job',{p_worker_id:workerId});if(error)throw error;return Array.isArray(data)?data[0]||null:data;
  },

  async claimJobForLead(workerId, leadId) {
    if(config.demoMode){const s=loadDemo();const job=s.generation_jobs.filter(x=>x.lead_id===leadId&&(x.status==='queued'||(x.status==='retry'&&(!x.run_after||x.run_after<=now())))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.created_at.localeCompare(b.created_at))[0];if(!job)return null;job.status='processing';job.worker_id=workerId;job.started_at=now();job.updated_at=now();job.attempts=(job.attempts||0)+1;saveDemo(s);return normalizeRow(job);}
    const {data,error}=await getSupabase().rpc('claim_generation_job_for_lead',{p_worker_id:workerId,p_lead_id:leadId});if(error)throw error;return Array.isArray(data)?data[0]||null:data;
  },

  async claimReviewerJob(workerId) {
    if(config.demoMode){
      const s=loadDemo();
      const reviewerIds=new Set(s.hair_leads.filter(x=>x.access_mode==='reviewer_demo'&&x.payment_status==='paid').map(x=>x.id));
      const job=s.generation_jobs.filter(x=>reviewerIds.has(x.lead_id)&&(x.status==='queued'||(x.status==='retry'&&(!x.run_after||x.run_after<=now())))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.created_at.localeCompare(b.created_at))[0];
      if(!job)return null;
      job.status='processing';job.worker_id=workerId;job.started_at=now();job.updated_at=now();job.attempts=(job.attempts||0)+1;saveDemo(s);return normalizeRow(job);
    }
    const {data,error}=await getSupabase().rpc('claim_reviewer_generation_job',{p_worker_id:workerId});if(error)throw error;return Array.isArray(data)?data[0]||null:data;
  },

  async recoverStaleReviewerJobs(cutoffIso) {
    if(config.demoMode){
      const s=loadDemo();const reviewerIds=new Set(s.hair_leads.filter(x=>x.access_mode==='reviewer_demo').map(x=>x.id));let count=0;
      for(const job of s.generation_jobs){if(reviewerIds.has(job.lead_id)&&job.status==='processing'&&job.started_at&&job.started_at<cutoffIso){job.status='retry';job.worker_id=null;job.error='Recovered after interrupted reviewer processing';job.run_after=now();job.updated_at=now();count++;}}
      if(count)saveDemo(s);return count;
    }
    const {data,error}=await getSupabase().rpc('recover_stale_reviewer_generation_jobs',{p_stale_before:cutoffIso});if(error)throw error;return Number(data||0);
  },

  async updateJob(id, patch) {
    patch.updated_at=now();
    if(config.demoMode){const s=loadDemo();const i=s.generation_jobs.findIndex(x=>x.id===id);if(i<0)return null;s.generation_jobs[i]={...s.generation_jobs[i],...patch};saveDemo(s);return normalizeRow(s.generation_jobs[i]);}
    const {data,error}=await getSupabase().from('generation_jobs').update(patch).eq('id',id).select('*').maybeSingle();if(error)throw error;return data;
  },

  async addResult(result) {
    const row={id:result.id||randomUUID(),created_at:now(),...result};
    if(config.demoMode){const s=loadDemo();s.generation_results.push(row);saveDemo(s);return row;}
    const {data,error}=await getSupabase().from('generation_results').insert(row).select('*').single();if(error){if(error.code==='23505')return this.getResult(row.id);throw error;}return data;
  },

  async listResults(leadId) {
    if(config.demoMode)return loadDemo().generation_results.filter(x=>x.lead_id===leadId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const {data,error}=await getSupabase().from('generation_results').select('*').eq('lead_id',leadId).order('sort_order');if(error)throw error;return data||[];
  },

  async getResult(id) {
    if(config.demoMode)return normalizeRow(loadDemo().generation_results.find(x=>x.id===id));
    const {data,error}=await getSupabase().from('generation_results').select('*').eq('id',id).maybeSingle();if(error)throw error;return data;
  },

  async countResults(leadId) {
    if(config.demoMode) return loadDemo().generation_results.filter(x=>x.lead_id===leadId && !x.deleted_at).length;
    const {count,error}=await getSupabase().from('generation_results').select('id',{count:'exact',head:true}).eq('lead_id',leadId).is('deleted_at',null);if(error)throw error;return count||0;
  },

  async resultCounts(leadIds=[]) {
    const ids=[...new Set((leadIds||[]).filter(Boolean))];
    if(!ids.length)return {};
    if(config.demoMode){const out=Object.fromEntries(ids.map(id=>[id,0]));for(const r of loadDemo().generation_results){if(!r.deleted_at && Object.hasOwn(out,r.lead_id))out[r.lead_id]++;}return out;}
    const {data,error}=await getSupabase().rpc('hairlook_result_counts',{p_lead_ids:ids});if(error)throw error;return Object.fromEntries((data||[]).map(x=>[x.lead_id,Number(x.result_count||0)]));
  },

  async getSettings() {
    if(config.demoMode)return Object.fromEntries(loadDemo().site_settings.map(x=>[x.key,x.value]));
    const {data,error}=await getSupabase().from('site_settings').select('key,value');if(error)throw error;return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  },

  async setSettings(entries) {
    if(config.demoMode){const s=loadDemo();for(const [key,value] of Object.entries(entries)){const i=s.site_settings.findIndex(x=>x.key===key);const row={key,value:String(value),type:typeof value,updated_at:now()};if(i>=0)s.site_settings[i]={...s.site_settings[i],...row};else s.site_settings.push(row);}saveDemo(s);return this.getSettings();}
    const rows=Object.entries(entries).map(([key,value])=>({key,value:String(value),type:typeof value,updated_at:now()}));const {error}=await getSupabase().from('site_settings').upsert(rows,{onConflict:'key'});if(error)throw error;return this.getSettings();
  },

  async listLeads({limit=100,offset=0,search=''}={}) {
    if(config.demoMode){let a=loadDemo().hair_leads.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at));if(search){const needle=String(search).toLowerCase();a=a.filter(x=>x.email?.toLowerCase().includes(needle)||x.id.includes(needle));}return {rows:a.slice(offset,offset+limit),total:a.length};}
    const clean=String(search||'').replace(/[%_,()]/g,'').trim();
    let q=getSupabase().from('hair_leads').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+limit-1);
    if(clean){
      const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);
      q=isUuid?q.or(`email.ilike.%${clean}%,id.eq.${clean}`):q.ilike('email',`%${clean}%`);
    }
    const {data,error,count}=await q;if(error)throw error;return {rows:data||[],total:count||0};
  },

  async listPayments({limit=100,offset=0}={}) {
    if(config.demoMode){const a=loadDemo().payments.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at));return {rows:a.slice(offset,offset+limit),total:a.length};}
    const {data,error,count}=await getSupabase().from('payments').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+limit-1);if(error)throw error;return {rows:data||[],total:count||0};
  },

  async listJobs({limit=100,offset=0,status=''}={}) {
    if(config.demoMode){let a=loadDemo().generation_jobs.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at));if(status)a=a.filter(x=>x.status===status);return {rows:a.slice(offset,offset+limit),total:a.length};}
    let q=getSupabase().from('generation_jobs').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+limit-1);if(status)q=q.eq('status',status);const {data,error,count}=await q;if(error)throw error;return {rows:data||[],total:count||0};
  },

  async getJobStats(leadId) {
    const statuses=['queued','processing','retry','completed','failed'];
    if(config.demoMode){const rows=loadDemo().generation_jobs.filter(x=>x.lead_id===leadId);return Object.fromEntries(statuses.map(status=>[status,rows.filter(x=>x.status===status).length]));}
    const out={};
    for(const status of statuses){const {count,error}=await getSupabase().from('generation_jobs').select('id',{count:'exact',head:true}).eq('lead_id',leadId).eq('status',status);if(error)throw error;out[status]=count||0;}
    return out;
  },

  async getCustomerDetail(id) {
    const lead=await this.getLead(id); if(!lead)return null;
    if(config.demoMode){const s=loadDemo();return {lead,payments:s.payments.filter(x=>x.lead_id===id),jobs:s.generation_jobs.filter(x=>x.lead_id===id),results:s.generation_results.filter(x=>x.lead_id===id)};}
    const sb=getSupabase();const [payments,jobs,results]=await Promise.all([
      sb.from('payments').select('*').eq('lead_id',id).order('created_at',{ascending:false}),
      sb.from('generation_jobs').select('*').eq('lead_id',id).order('sort_order'),
      sb.from('generation_results').select('*').eq('lead_id',id).order('sort_order')
    ]);for(const r of [payments,jobs,results])if(r.error)throw r.error;return {lead,payments:payments.data||[],jobs:jobs.data||[],results:results.data||[]};
  },

  async overview() {
    if(config.demoMode){const s=loadDemo();const customers=s.hair_leads.filter(x=>x.access_mode!=='reviewer_demo'),customerIds=new Set(customers.map(x=>x.id));const paid=customers.filter(x=>x.payment_status==='paid');const revenue=s.payments.filter(x=>x.status==='paid'&&customerIds.has(x.lead_id)).reduce((sum,x)=>sum+Number(x.amount||0),0);const customerJobs=s.generation_jobs.filter(x=>customerIds.has(x.lead_id)),completed=customerJobs.filter(x=>x.status==='completed').length,terminal=customerJobs.filter(x=>['completed','failed'].includes(x.status)).length;const customerResults=s.generation_results.filter(x=>customerIds.has(x.lead_id)&&!x.deleted_at),totalAiCost=customerResults.reduce((sum,x)=>sum+Number(x.cost_usd||0),0);return {revenue,paidCustomers:paid.length,leads:customers.length,leadToPaid:customers.length?paid.length/customers.length:0,generationSuccess:terminal?completed/terminal:0,resultCount:customerResults.length,avgAiCostPerOrder:paid.length?totalAiCost/paid.length:0};}
    const {data,error}=await getSupabase().rpc('hairlook_admin_overview');if(error)throw error;return data||{revenue:0,paidCustomers:0,leads:0,leadToPaid:0,generationSuccess:0,resultCount:0,avgAiCostPerOrder:0};
  },

  async analyticsSummary() {
    const names=['landing_view','quiz_start','quiz_complete','upload_complete','paywall_view','checkout_start','payment_success','dashboard_view','download_result'];
    if(config.demoMode){const s=loadDemo();const counts={};for(const n of names)counts[n]=s.analytics_events.filter(x=>x.event_name===n).length;return counts;}
    const out={};for(const name of names){const {count,error}=await getSupabase().from('analytics_events').select('id',{count:'exact',head:true}).eq('event_name',name);if(error)throw error;out[name]=count||0;}return out;
  },

  async audit({adminEmail,action,targetType,targetId=null,metadata={}}) {
    const row={id:randomUUID(),admin_email:adminEmail,action,target_type:targetType,target_id:targetId,metadata,created_at:now()};
    if(config.demoMode){const s=loadDemo();s.admin_audit_logs.push(row);saveDemo(s);return row;}
    const {error}=await getSupabase().from('admin_audit_logs').insert({admin_email:adminEmail,action,target_type:targetType,target_id:targetId,metadata});if(error)throw error;return row;
  },

  async listAudit(limit=100) {
    if(config.demoMode)return loadDemo().admin_audit_logs.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,limit);
    const {data,error}=await getSupabase().from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(limit);if(error)throw error;return data||[];
  },

  async retryFailedJobs(leadId) {
    if(config.demoMode){const s=loadDemo();let c=0;for(const j of s.generation_jobs){if(j.lead_id===leadId&&j.status==='failed'){j.status='queued';j.error=null;j.run_after=null;j.updated_at=now();c++;}}saveDemo(s);return c;}
    const {data,error}=await getSupabase().from('generation_jobs').update({status:'queued',error:null,run_after:null,updated_at:now()}).eq('lead_id',leadId).eq('status','failed').select('id');if(error)throw error;return data?.length||0;
  },

  async deleteLead(id) {
    if(config.demoMode){const s=loadDemo();for(const k of ['hair_leads','lead_sessions','payments','generation_jobs','generation_results','email_verification_challenges'])s[k]=(s[k]||[]).filter(x=>(x.lead_id||x.id)!==id);s.magic_links=s.magic_links.filter(x=>x.lead_id!==id);for(const invite of s.reviewer_demo_invites||[])if(invite.lead_id===id)invite.lead_id=null;saveDemo(s);return;}
    const {error}=await getSupabase().from('hair_leads').delete().eq('id',id);if(error)throw error;
  },

  async expiredOriginalLeads(cutoffIso, limit=100) {
    if(config.demoMode)return loadDemo().hair_leads.filter(x=>x.upload_path&&!x.original_deleted_at&&x.created_at<cutoffIso&&(x.payment_status!=='paid'||['completed','partial','failed'].includes(x.generation_status))).slice(0,limit);
    const {data,error}=await getSupabase().from('hair_leads').select('id,upload_path').not('upload_path','is',null).is('original_deleted_at',null).lt('created_at',cutoffIso).or('payment_status.neq.paid,generation_status.in.(completed,partial,failed)').limit(limit);if(error)throw error;return data||[];
  },

  async expiredResults(cutoffIso, limit=200) {
    if(config.demoMode)return loadDemo().generation_results.filter(x=>x.storage_path&&!x.deleted_at&&x.created_at<cutoffIso).slice(0,limit);
    const {data,error}=await getSupabase().from('generation_results').select('id,lead_id,storage_path').is('deleted_at',null).lt('created_at',cutoffIso).limit(limit);if(error)throw error;return data||[];
  },

  async markResultDeleted(id) {
    if(config.demoMode){const s=loadDemo();const r=s.generation_results.find(x=>x.id===id);if(r)r.deleted_at=now();saveDemo(s);return;}
    const {error}=await getSupabase().from('generation_results').update({deleted_at:now()}).eq('id',id);if(error)throw error;
  }
};
