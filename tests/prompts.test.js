import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationJobs } from '../src/services/prompts.js';

test('builds exactly 30 curated hairstyle jobs with stable ordering', () => {
  const lead={age_range:'55–64',texture:'Wavy',current_length:'Medium',desired_length:'About the same',desired_colors:['Gray blending'],style_personality:'Modern & Fresh',maintenance_level:'10–15 minutes',bangs_preference:'Maybe',gray_preference:'Blend softly',style_goals:['Add volume','Feel more modern']};
  const jobs=buildGenerationJobs(lead,30,'model');
  assert.equal(jobs.length,30);
  assert.equal(new Set(jobs.map(j=>j.sort_order)).size,30);
  assert.ok(jobs.every(j=>j.prompt.includes('Preserve the same person and identity')));
  assert.ok(jobs.some(j=>j.category==='Gray-Friendly'));
  assert.ok(jobs.some(j=>j.category==='Easy-Care'));
  assert.ok(jobs.some(j=>j.category==='Bolder Options'));
});
