import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { generateHairEdit } from '../lib/ai.js';
import { putResult, deleteOriginal, deleteResult } from '../lib/storage.js';
import { sendResultsReady } from '../lib/mailer.js';
import { log } from '../lib/log.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function processOneJob(workerId) {
  const job = await repo.claimJob(workerId);
  if (!job) return false;
  try {
    const lead = await repo.getLead(job.lead_id);
    if (!lead) throw new Error('Lead no longer exists');
    if (lead.payment_status !== 'paid') throw new Error('Generation blocked: payment is not paid');
    if (!lead.upload_path || lead.original_deleted_at) throw new Error('Original photo is unavailable');

    await repo.updateLead(lead.id, { generation_status: 'processing' });
    const generated = await generateHairEdit({ lead, job });
    const resultId = randomUUID();
    const storagePath = await putResult(lead.id, resultId, generated.buffer, 'image/jpeg');
    await repo.addResult({
      id: resultId,
      lead_id: lead.id,
      job_id: job.id,
      category: job.category,
      style_name: job.style_name,
      sort_order: job.sort_order,
      storage_path: storagePath,
      provider: generated.provider,
      model: generated.model,
      provider_prediction_id: generated.predictionId,
      cost_usd: generated.costUsd,
      metadata: { promptVersion: 1 }
    });
    await repo.updateJob(job.id, { status: 'completed', completed_at: new Date().toISOString(), error: null });

    const [resultCount, stats] = await Promise.all([repo.countResults(lead.id), repo.getJobStats(lead.id)]);
    const finished = stats.queued === 0 && stats.processing === 0 && stats.retry === 0;
    const status = finished ? (stats.failed > 0 ? 'partial' : 'completed') : 'processing';
    const updated = await repo.updateLead(lead.id, { generation_status: status });
    if (finished && !updated?.results_notified_at) {
      await sendResultsReady({ to: lead.email }).catch(error => log.warn('results_email_failed', { leadId: lead.id, error: error.message }));
      await repo.updateLead(lead.id, { results_notified_at: new Date().toISOString() });
    }
    log.info('generation_completed', { leadId: lead.id, jobId: job.id, resultCount, status });
  } catch (error) {
    const attempts = Number(job.attempts || 1);
    if (attempts < 3) {
      const delayMs = attempts * 30_000;
      await repo.updateJob(job.id, { status: 'retry', error: String(error.message || error).slice(0, 2000), run_after: new Date(Date.now() + delayMs).toISOString() });
    } else {
      await repo.updateJob(job.id, { status: 'failed', error: String(error.message || error).slice(0, 2000), completed_at: new Date().toISOString() });
      const stats = await repo.getJobStats(job.lead_id);
      if (stats.queued === 0 && stats.processing === 0 && stats.retry === 0) await repo.updateLead(job.lead_id, { generation_status: stats.completed > 0 ? 'partial' : 'failed' });
    }
    log.error('generation_failed', { jobId: job.id, leadId: job.lead_id, attempts, error: error.message });
  }
  return true;
}

export async function cleanupExpiredData() {
  const settings=await repo.getSettings();const originalHours=Math.max(1,Number(settings.original_retention_hours||config.originalRetentionHours));const resultDays=Math.max(1,Number(settings.result_retention_days||config.resultRetentionDays));
  const originalCutoff = new Date(Date.now() - originalHours * 3600_000).toISOString();
  const resultCutoff = new Date(Date.now() - resultDays * 86400_000).toISOString();
  const originals = await repo.expiredOriginalLeads(originalCutoff, 100);
  for (const lead of originals) {
    try {
      await deleteOriginal(lead.upload_path);
      await repo.updateLead(lead.id, { original_deleted_at: new Date().toISOString() });
    } catch (error) { log.warn('cleanup_original_failed', { leadId: lead.id, error: error.message }); }
  }
  const results = await repo.expiredResults(resultCutoff, 200);
  for (const result of results) {
    try {
      await deleteResult(result.storage_path);
      await repo.markResultDeleted(result.id);
    } catch (error) { log.warn('cleanup_result_failed', { resultId: result.id, error: error.message }); }
  }
}

export async function startWorker({ signal, once = false } = {}) {
  const workerId = `worker-${process.pid}-${randomUUID().slice(0,8)}`;
  let lastCleanup = 0;let settingsCheckedAt=0;let generationAllowed=config.generationEnabled;
  log.info('worker_started', { workerId, concurrency: config.workerConcurrency, demoMode: config.demoMode });
  while (!signal?.aborted) {
    if(Date.now()-settingsCheckedAt>15000){const settings=await repo.getSettings();generationAllowed=String(settings.generation_enabled??config.generationEnabled)!=='false';settingsCheckedAt=Date.now();}
    if (!generationAllowed) { await sleep(config.workerPollMs); continue; }
    let didWork = false;
    const results = await Promise.all(Array.from({ length: Math.max(1, config.workerConcurrency) }, () => processOneJob(workerId)));
    didWork = results.some(Boolean);
    if (Date.now() - lastCleanup > 3600_000) {
      await cleanupExpiredData().catch(error => log.warn('cleanup_failed', { error: error.message }));
      lastCleanup = Date.now();
    }
    if (once) return didWork;
    if (!didWork) await sleep(config.workerPollMs);
  }
}
