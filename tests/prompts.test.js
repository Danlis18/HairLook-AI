import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationJobs } from '../src/services/prompts.js';

test('builds exactly 10 varied hairstyle jobs with stable ordering', () => {
  const lead={gender:'Woman',age_range:'55–64',texture:'Wavy',current_length:'Medium',desired_length:'About the same',desired_colors:['Gray blending'],style_personality:'Modern & Fresh',maintenance_level:'10–15 minutes',bangs_preference:'Maybe',gray_preference:'Blend softly',style_goals:['Add volume','Feel more modern']};
  const jobs=buildGenerationJobs(lead,10,'model');
  assert.equal(jobs.length,10);
  assert.equal(new Set(jobs.map(j=>j.sort_order)).size,10);
  assert.equal(new Set(jobs.map(j=>j.style_name)).size,10);
  assert.ok(jobs.every(j=>j.prompt.includes('LOCK THE PERSON AND PHOTO')));
  assert.ok(jobs.every(j=>j.prompt.includes('LOCK THE ORIGINAL HAIR COLOR')));
  assert.ok(jobs.every(j=>j.prompt.includes('do not change lip shape or lip color')));
  assert.ok(jobs.some(j=>j.style_name.includes('Pixie')));
  assert.ok(jobs.some(j=>j.style_name.includes('Bob')));
  assert.ok(jobs.some(j=>j.style_name.includes('Butterfly')));
  assert.ok(jobs.some(j=>j.style_name.includes('Wolf')));
  assert.ok(jobs.every(j=>!['Color Directions','Gray-Friendly'].includes(j.category)));
  assert.ok(jobs.every(j=>!j.prompt.includes('Gray blending')));
});

test('builds ten structurally male haircut jobs and locks facial hair', () => {
  const jobs=buildGenerationJobs({gender:'Man',texture:'Curly'},10,'model');
  assert.equal(jobs.length,10);
  assert.equal(new Set(jobs.map(job=>job.style_name)).size,10);
  assert.ok(jobs.every(job=>job.prompt.includes('haircut of the man')));
  assert.ok(jobs.every(job=>job.prompt.includes('LOCK FACIAL HAIR')));
  assert.ok(jobs.some(job=>job.style_name==='Clean Buzz Cut'));
  assert.ok(jobs.some(job=>job.style_name==='Low Taper Fade'));
  assert.ok(jobs.some(job=>job.style_name==='Medium Bro Flow'));
  assert.ok(jobs.every(job=>!job.style_name.includes('Pixie')));
});
