import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationJobs } from '../src/services/prompts.js';

test('builds exactly 10 varied hairstyle jobs with stable ordering', () => {
  const lead={age_range:'55–64',texture:'Wavy',current_length:'Medium',desired_length:'About the same',desired_colors:['Gray blending'],style_personality:'Modern & Fresh',maintenance_level:'10–15 minutes',bangs_preference:'Maybe',gray_preference:'Blend softly',style_goals:['Add volume','Feel more modern']};
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
