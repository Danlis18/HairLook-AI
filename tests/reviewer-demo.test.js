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
  assert.match(sql,/access_mode in \('customer','reviewer_demo'\)/);
  assert.match(sql,/create table if not exists public\.reviewer_demo_invites/);
  assert.match(sql,/claim_reviewer_demo_invite/);
  assert.match(sql,/claim_generation_job_for_lead/);
  assert.match(sql,/alter table public\.reviewer_demo_invites enable row level security/);
  assert.match(sql,/generation_target_count','10'/);
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
