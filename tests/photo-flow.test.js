import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('homepage CTA opens photo upload directly and keeps the quiz disabled',()=>{
  const html=read('public/index.html');
  const app=read('public/app.js');
  assert.match(html,/data-start-upload/);
  assert.doesNotMatch(html,/data-start-quiz/);
  assert.match(html,/primary-upload-cta/);
  assert.match(app,/const QUIZ_ENABLED = false/);
  assert.match(app,/phase='upload'; showUpload\(\); track\('photo_flow_start'\)/);
});

test('lead creation accepts the photo-first flow and persists locale metadata',()=>{
  const route=read('src/routes/public.js');
  assert.match(route,/default\('Not provided'\)/);
  assert.match(route,/_locale:locale/);
  assert.match(route,/_quizEnabled:rawQuiz\?\._quizEnabled === true/);
  assert.match(route,/sendVerificationCode\(\{ to:lead\.email, code, locale \}\)/);
});

test('public pages include geo-aware locale switching and bilingual funnel copy',()=>{
  const server=read('src/server.js');
  const mailer=read('src/lib/mailer.js');
  const checkout=read('public/crypto-checkout.js');
  assert.match(server,/resolveRequestLocale/);
  assert.match(server,/locale-switcher\.js/);
  assert.match(server,/storefront-price\.js/);
  assert.match(mailer,/verificationSubject/);
  assert.match(mailer,/Confirme seu e-mail/);
  assert.match(mailer,/Confirm your email/);
  assert.match(checkout,/Choose how you want to pay/);
  assert.match(checkout,/Escolha como deseja pagar/);
});

test('English and Portuguese share the same visual polish and mobile upload behavior',()=>{
  const server=read('src/server.js');
  const hero=read('public/hero-media-fix.js');
  const camera=read('public/mobile-camera-upload.js');
  const ptRuntime=read('public/pt-br-runtime.js');
  const ptFinal=read('public/pt-br-final.js');
  assert.match(server,/sharedTags[^\n]+ui-polish\.css/);
  assert.match(server,/sharedTags[^\n]+mobile-modal-fix\.css/);
  assert.match(server,/sharedTags[^\n]+mobile-camera-upload\.js/);
  assert.match(hero,/documentElement\.dataset\.locale === 'pt-BR'/);
  assert.match(hero,/Soft Layers/);
  assert.match(hero,/Camadas suaves/);
  assert.match(camera,/Take photo now/);
  assert.match(camera,/Tirar foto agora/);
  assert.match(ptRuntime,/Customer Support','Suporte ao cliente/);
  assert.match(ptRuntime,/License & Acceptable Use','Licença e uso aceitável/);
  assert.doesNotMatch(ptFinal,/data-ui-polish|data-mobile-modal-fix|data-mobile-camera-upload|removeHeroTrustExtras/);
});
