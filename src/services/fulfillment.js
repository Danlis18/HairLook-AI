import { config } from '../config.js';
import { repo } from '../lib/repository.js';
import { log } from '../lib/log.js';
import { buildGenerationJobs } from './prompts.js';
import { processReviewerDemoLead } from './workerLoop.js';

export const RESULT_TARGET_COUNT=10;

export async function queueReviewerDemo(lead) {
  const jobs=buildGenerationJobs(lead,RESULT_TARGET_COUNT,'demo-local-v1');
  const created=await repo.enqueueJobsIfEmpty(lead.id,jobs);
  if(created)await repo.updateLead(lead.id,{generation_status:'queued'});
  return {created,count:jobs.length};
}

export function startReviewerDemoProcessing(leadId) {
  setImmediate(()=>processReviewerDemoLead(leadId).catch(error=>log.error('reviewer_demo_processing_failed',{leadId,error:error.message})));
}

export async function queueRealPaidGeneration(lead) {
  const settings=await repo.getSettings();
  const enabled=String(settings.generation_enabled??config.generationEnabled)!=='false';
  if(!enabled||config.manualFulfillmentMode)return {created:false,reason:'automatic_generation_disabled'};
  if(config.aiProvider==='replicate'&&!config.replicateToken)return {created:false,reason:'ai_provider_not_configured'};
  const jobs=buildGenerationJobs(lead,RESULT_TARGET_COUNT,config.aiPrimaryModel);
  const created=await repo.enqueueJobsIfEmpty(lead.id,jobs);
  if(created)await repo.updateLead(lead.id,{generation_status:'queued'});
  return {created,count:jobs.length};
}
