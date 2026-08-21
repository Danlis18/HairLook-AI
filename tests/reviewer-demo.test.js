import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {buildGenerationJobs} from '../src/services/prompts.js';

process.env.DEMO_MODE='true';

test('reviewer invite is email-bound, one-use and revocable',async()=>{
  const [{repo},{tokenHash}]=await Promise.all([import('../src/lib/repository.js'),import('../src/lib/crypto.js')]);
  const raw=`reviewer-${randomUUID()}-${randomUUID()}`;
  const email=`reviewer-${randomUUID()}@example.com`;
  const invite=await repo.createReviewerInvite({tokenHash:tokenHash(raw),reviewerEmail:email,locale:'pt-BR',createdBy:'owner@example.com',expiresAt:new Date(Date.now()+3600_000).toISOString()});
  const lead=await repo.createLead({email,access_mode:'reviewer_demo',payment_status:'unpaid',generation_status:'not_started'});
  const other=await repo.createLead({email:`other-${randomUUID()}@example.com`,access_mode:'reviewer_demo',payment_status:'unpaid',generation_status:'not_started'});
  try{
    assert.equal(await repo.claimReviewerInvite(tokenHash(raw),other.id,other.email),null);
    const claimed=await repo.claimReviewerInvite(tokenHash(raw),lead.id,email);
    assert.equal(claimed.lead_id,lead.id);
    assert.equal(await repo.claimReviewerInvite(tokenHash(raw),other.id,email),null);
    const jobs=buildGenerationJobs(lead,10,'demo-local-v1');
    assert.equal(jobs.length,10);
    assert.ok(jobs.every(job=>job.model==='demo-local-v1'));
    assert.equal(await repo.enqueueJobsIfEmpty(lead.id,jobs),true);
    assert.equal(await repo.enqueueJobsIfEmpty(lead.id,jobs),false);
    const revoked=await repo.revokeReviewerInvite(invite.id);
    assert.ok(revoked.revoked_at);
  } finally {
    await repo.deleteLead(other.id);
    await repo.deleteLead(lead.id);
  }
});

test('reviewer migration isolates free orders and uses lead-scoped job claims',()=>{
  const sql=fs.readFileSync(new URL('../supabase/migrations/005_reviewer_demo.sql',import.meta.url),'utf8');
  const inlineSql=fs.readFileSync(new URL('../supabase/migrations/006_inline_reviewer_ai.sql',import.meta.url),'utf8');
  assert.match(sql,/access_mode in \('customer','reviewer_demo'\)/);
  assert.match(sql,/create table if not exists public\.reviewer_demo_invites/);
  assert.match(sql,/claim_reviewer_demo_invite/);
  assert.match(sql,/claim_generation_job_for_lead/);
  assert.match(sql,/alter table public\.reviewer_demo_invites enable row level security/);
  assert.match(sql,/generation_target_count','10'/);
  assert.match(inlineSql,/claim_reviewer_generation_job/);
  assert.match(inlineSql,/recover_stale_reviewer_generation_jobs/);
  assert.match(inlineSql,/l\.access_mode = 'reviewer_demo'/);
  assert.match(inlineSql,/l\.payment_status = 'paid'/);
});

test('reviewer checkout is bilingual, no-charge and excluded from Purchase tracking',()=>{
  const publicRoute=fs.readFileSync(new URL('../src/routes/public.js',import.meta.url),'utf8');
  const checkout=fs.readFileSync(new URL('../public/crypto-checkout.js',import.meta.url),'utf8');
  const dashboard=fs.readFileSync(new URL('../public/dashboard.js',import.meta.url),'utf8');
  assert.match(publicRoute,/provider:'reviewer_demo'/);
  assert.match(publicRoute,/payment_amount:0/);
  assert.match(publicRoute,/access_mode!=='reviewer_demo'/);
  assert.match(checkout,/Free reviewer demo/);
  assert.match(checkout,/Demo gratuita para revisão/);
  assert.match(dashboard,/All 10 demo previews are ready/);
  assert.match(dashboard,/As 10 prévias de demonstração estão prontas/);
});

test('a stale reviewer cookie cannot hijack a normal storefront upload',()=>{
  const middleware=fs.readFileSync(new URL('../src/middleware.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(middleware,/reviewerRequested=req\.query\?\.reviewer==='1'/);
  assert.match(middleware,/searchParams\.get\('reviewer'\)==='1'/);
  assert.match(middleware,/if\(!reviewerRequested\)return next\(\)/);
  assert.match(app,/const reviewerQuery/);
});

test('real reviewer AI runs in the web service without enabling customer generation',()=>{
  const config=fs.readFileSync(new URL('../src/config.js',import.meta.url),'utf8');
  const fulfillment=fs.readFileSync(new URL('../src/services/fulfillment.js',import.meta.url),'utf8');
  const worker=fs.readFileSync(new URL('../src/services/workerLoop.js',import.meta.url),'utf8');
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  const dashboard=fs.readFileSync(new URL('../public/dashboard.js',import.meta.url),'utf8');
  const mailer=fs.readFileSync(new URL('../src/lib/mailer.js',import.meta.url),'utf8');
  const publicRoute=fs.readFileSync(new URL('../src/routes/public.js',import.meta.url),'utf8');
  const privacy=fs.readFileSync(new URL('../public/privacy.html',import.meta.url),'utf8');
  const portuguesePages=fs.readFileSync(new URL('../public/pt-br-pages.js',import.meta.url),'utf8');
  assert.match(config,/REVIEWER_AI_ENABLED/);
  assert.match(config,/REPLICATE_API_TOKEN \(required because REVIEWER_AI_ENABLED=true\)/);
  assert.match(fulfillment,/config\.reviewerAiEnabled\?config\.aiPrimaryModel:'demo-local-v1'/);
  assert.match(worker,/repo\.claimReviewerJob/);
  assert.match(server,/startInlineReviewerWorker/);
  assert.match(dashboard,/10 AI haircut previews/);
  assert.match(dashboard,/results\/collection\.pdf/);
  assert.match(mailer,/Download the complete PDF collection/);
  assert.match(publicRoute,/reviewer_ai_not_configured/);
  assert.match(publicRoute,/buildResultsPdf/);
  assert.match(privacy,/currently Replicate/);
  assert.match(portuguesePages,/atualmente a Replicate/);
  assert.doesNotMatch(fulfillment,/manualFulfillmentMode.*queueReviewerDemo/);
});
