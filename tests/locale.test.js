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

test('lead locale is persisted inside the compatible quiz_answers JSON',()=>{
  assert.equal(localeFromLead({quiz_answers:{_locale:'pt-BR'}}),'pt-BR');
  assert.equal(localeFromLead({quiz_answers:{_locale:'en'}}),'en');
  assert.equal(localeFromLead({quiz_answers:{}},'en'),'en');
});
