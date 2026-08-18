import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localeForCountry,
  localeFromLead,
  normalizeCountry,
  normalizeLocale,
  resolveRequestLocale
} from '../src/lib/locale.js';

function request({query={},cookies={},headers={},ip='127.0.0.1'}={}) {
  const normalized=Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]));
  return {query,cookies,headers:normalized,ip,get:name=>normalized[String(name).toLowerCase()]};
}

test('locale normalization supports the two public languages only',()=>{
  assert.equal(normalizeLocale('pt-PT'),'pt-BR');
  assert.equal(normalizeLocale('Portuguese'),'pt-BR');
  assert.equal(normalizeLocale('en-GB'),'en');
  assert.equal(normalizeLocale('de-DE','en'),'en');
});

test('Brazil and Portugal use Portuguese; every other country uses English',()=>{
  assert.equal(localeForCountry('BR'),'pt-BR');
  assert.equal(localeForCountry('pt'),'pt-BR');
  assert.equal(localeForCountry('US'),'en');
  assert.equal(localeForCountry('UA'),'en');
  assert.equal(normalizeCountry('invalid'),'');
});

test('manual language choice takes priority over geo',async()=>{
  const context=await resolveRequestLocale(request({query:{lang:'en'},headers:{'cf-ipcountry':'BR'}}),{allowLookup:false});
  assert.deepEqual(context,{locale:'en',country:'BR',source:'manual'});
});

test('saved preference takes priority and country headers drive automatic locale',async()=>{
  const preferred=await resolveRequestLocale(request({cookies:{hairlook_locale:'pt-BR'},headers:{'cf-ipcountry':'US'}}),{allowLookup:false});
  assert.equal(preferred.locale,'pt-BR');
  assert.equal(preferred.source,'preference');

  const brazil=await resolveRequestLocale(request({headers:{'x-country-code':'BR'}}),{allowLookup:false});
  assert.deepEqual(brazil,{locale:'pt-BR',country:'BR',source:'header'});
  const rest=await resolveRequestLocale(request({headers:{'x-country-code':'JP'}}),{allowLookup:false});
  assert.deepEqual(rest,{locale:'en',country:'JP',source:'header'});
});

test('cached geo country survives language switching and later requests without a geo header',async()=>{
  const cookies={hairlook_geo_country:'US',hairlook_geo_locale:'en'};
  const manual=await resolveRequestLocale(request({query:{lang:'pt-BR'},cookies}),{allowLookup:false});
  assert.deepEqual(manual,{locale:'pt-BR',country:'US',source:'manual'});
  const preferred=await resolveRequestLocale(request({cookies:{...cookies,hairlook_locale:'en'}}),{allowLookup:false});
  assert.deepEqual(preferred,{locale:'en',country:'US',source:'preference'});
  const automatic=await resolveRequestLocale(request({cookies}),{allowLookup:false});
  assert.deepEqual(automatic,{locale:'en',country:'US',source:'geo_cache'});
});

test('lead locale is persisted inside the compatible quiz_answers JSON',()=>{
  assert.equal(localeFromLead({quiz_answers:{_locale:'pt-BR'}}),'pt-BR');
  assert.equal(localeFromLead({quiz_answers:{_locale:'en'}}),'en');
  assert.equal(localeFromLead({quiz_answers:{}},'en'),'en');
});
