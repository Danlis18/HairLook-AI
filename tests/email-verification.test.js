import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.DEMO_MODE = 'true';
const { randomOtpCode, safeEqual, sha256 } = await import('../src/lib/crypto.js');
const { repo } = await import('../src/lib/repository.js');

test('randomOtpCode always produces a 6-digit zero-padded numeric string', () => {
  for (let i = 0; i < 200; i++) {
    const code = randomOtpCode();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
  }
});

test('safeEqual matches identical OTP codes and rejects different ones', () => {
  assert.equal(safeEqual(sha256('123456'), sha256('123456')), true);
  assert.equal(safeEqual(sha256('123456'), sha256('654321')), false);
  assert.equal(safeEqual(sha256('000000'), sha256('0')), false);
});

test('email verification challenge lifecycle in the demo repository', async () => {
  const lead = await repo.createLead({ email: 'otp-repo-test@example.com', payment_status: 'unpaid', generation_status: 'not_started' });
  try {
    const code = '482913';
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const challenge = await repo.createEmailChallenge({ leadId: lead.id, email: lead.email, codeHash: sha256(code), expiresAt, maxAttempts: 5 });
    assert.equal(challenge.attempts, 0);
    assert.equal(challenge.used_at, null);

    const latest = await repo.getLatestEmailChallenge(lead.id);
    assert.equal(latest.id, challenge.id);
    assert.equal(safeEqual(sha256(code), latest.code_hash), true);
    assert.equal(safeEqual(sha256('000000'), latest.code_hash), false);

    const bumped = await repo.touchEmailChallenge(challenge.id, { attempts: latest.attempts + 1 });
    assert.equal(bumped.attempts, 1);

    await repo.touchEmailChallenge(challenge.id, { used_at: new Date().toISOString() });
    const used = await repo.getLatestEmailChallenge(lead.id);
    assert.ok(used.used_at);

    const verifiedLead = await repo.updateLead(lead.id, { email_verified_at: new Date().toISOString() });
    assert.ok(verifiedLead.email_verified_at);
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('expired challenge is detected by expiry comparison', async () => {
  const lead = await repo.createLead({ email: 'otp-expiry-test@example.com', payment_status: 'unpaid', generation_status: 'not_started' });
  try {
    const pastExpiry = new Date(Date.now() - 60_000).toISOString();
    await repo.createEmailChallenge({ leadId: lead.id, email: lead.email, codeHash: sha256('111111'), expiresAt: pastExpiry, maxAttempts: 5 });
    const latest = await repo.getLatestEmailChallenge(lead.id);
    assert.ok(new Date(latest.expires_at).getTime() <= Date.now());
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('max_attempts is respected once attempts reach the configured limit', async () => {
  const lead = await repo.createLead({ email: 'otp-attempts-test@example.com', payment_status: 'unpaid', generation_status: 'not_started' });
  try {
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const challenge = await repo.createEmailChallenge({ leadId: lead.id, email: lead.email, codeHash: sha256('777777'), expiresAt, maxAttempts: 5 });
    let current = challenge;
    for (let i = 0; i < 5; i++) current = await repo.touchEmailChallenge(challenge.id, { attempts: current.attempts + 1 });
    assert.equal(current.attempts, 5);
    assert.ok(current.attempts >= current.max_attempts);
  } finally {
    await repo.deleteLead(lead.id);
  }
});

test('deleteLead also removes its email verification challenges (demo mode)', async () => {
  const lead = await repo.createLead({ email: 'otp-cleanup-test@example.com', payment_status: 'unpaid', generation_status: 'not_started' });
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await repo.createEmailChallenge({ leadId: lead.id, email: lead.email, codeHash: sha256('321321'), expiresAt, maxAttempts: 5 });
  await repo.deleteLead(lead.id);
  const afterDelete = await repo.getLatestEmailChallenge(lead.id);
  assert.equal(afterDelete, null);
});

test('migration adds email_verified_at column and a challenges table with RLS', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/002_email_verification.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter table public\.hair_leads add column if not exists email_verified_at/);
  assert.match(sql, /create table if not exists public\.email_verification_challenges/);
  assert.match(sql, /references public\.hair_leads\(id\) on delete cascade/);
  assert.match(sql, /alter table public\.email_verification_challenges enable row level security/);
});
