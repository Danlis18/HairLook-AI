const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const media = {
  hero: '/media/style-portrait-1.jpg',
  consultation: '/media/style-portrait-4.jpg',
  good1: '/media/upload-good-1.png',
  good2: '/media/upload-good-2.png'
};
const icons = {
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.4"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>'
};

const QUIZ_ENABLED = false;
const activeLocale = document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
const copy = {
  en: {
    step:(current,total)=>`Step ${current} of ${total}`,
    uploadProgress:'Upload your photo', emailProgress:'Confirm your email', otpProgress:'Verify your email', completeProgress:'Ready for payment',
    uploadEyebrow:'Start with one photo', uploadTitle:'Upload one clear photo.', uploadBody:'Use a portrait where your face and current hair are visible. We re-encode the image before private storage and use it only for your hairstyle order as described in our Privacy Policy.',
    faceVisible:'Face clearly visible', goodLight:'Good natural lighting', camera:'Looking toward the camera', examples:'See good and bad photo examples', drag:'Drag a photo here', chooseDevice:'or choose from your device', chooseAnother:'Choose another', usePhoto:'Use this photo →', genderTitle:'Who is this hairstyle collection for?', woman:'Woman', man:'Man', genderRequired:'Choose Woman or Man to continue.',
    privateDelivery:'Private delivery', updateEmail:'Update your email', whereSend:'Where should we send your results?', newCodeBody:'We will send a new verification code to this address.', emailBody:'We use your email for secure access to this hairstyle order and order-related messages.', emailAddress:'Email address', sendCode:'Send verification code →', continue:'Continue →',
    consent:'I agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>. I understand that my photo will be processed privately and stored temporarily to prepare my hairstyle results.',
    invalidEmail:'Please enter a valid email address.', acceptTerms:'Please review and accept the Terms and Privacy Policy to continue.', updateFailed:'Could not update that email. Please try again.', serverFailed:'Could not reach the server.',
    confirmEmail:'Confirm your email', confirmTitle:'Please confirm your email', confirmBody:'We deliver your results and order updates to this address.', edit:'Edit', confirmButton:'Confirm email →', preparing:'Preparing…',
    checkEmail:'Check your email', otpTitle:'Enter your verification code', otpBody:'We sent a 6-digit code to', verify:'Verify →', verifying:'Verifying…', resend:'Resend code', changeEmail:'Change email', invalidCode:'Enter the 6-digit code from your email.', attempts:'Too many attempts. Please request a new code.', wrongCode:'That code is incorrect or has expired.', waitResend:s=>`Please wait ${s}s before requesting another code.`, resendFailed:'Could not resend the code right now.', resent:'A new code has been sent.',
    underMb:mb=>`Please choose a photo under ${mb} MB.`, format:'Please use JPG, PNG, WEBP, HEIC or HEIF.', tooSmall:'This image is too small. Please choose at least 400 × 400 px.', uploadFailed:'We could not securely upload that photo. Please try another image.', unsupported:'That image format is not supported by this server.', larger:'Please choose a larger image.', sending:'Sending verification code…'
  },
  'pt-BR': {
    step:(current,total)=>`Etapa ${current} de ${total}`,
    uploadProgress:'Envie sua foto', emailProgress:'Confirme seu e-mail', otpProgress:'Verifique seu e-mail', completeProgress:'Pronto para o pagamento',
    uploadEyebrow:'Comece com uma foto', uploadTitle:'Envie uma foto nítida.', uploadBody:'Use um retrato em que seu rosto e seu cabelo atual estejam visíveis. Reprocessamos a imagem antes do armazenamento privado e a usamos apenas no seu pedido, conforme descrito na Política de Privacidade.',
    faceVisible:'Rosto claramente visível', goodLight:'Boa iluminação natural', camera:'Olhando para a câmera', examples:'Ver exemplos de fotos boas e ruins', drag:'Arraste uma foto aqui', chooseDevice:'ou escolha no seu dispositivo', chooseAnother:'Escolher outra', usePhoto:'Usar esta foto →', genderTitle:'Para quem é esta coleção de cortes?', woman:'Mulher', man:'Homem', genderRequired:'Escolha Mulher ou Homem para continuar.',
    privateDelivery:'Entrega privada', updateEmail:'Atualize seu e-mail', whereSend:'Para onde devemos enviar seus resultados?', newCodeBody:'Enviaremos um novo código de verificação para este endereço.', emailBody:'Usamos seu e-mail para o acesso seguro ao pedido e para mensagens relacionadas à compra.', emailAddress:'Endereço de e-mail', sendCode:'Enviar código de verificação →', continue:'Continuar →',
    consent:'Concordo com os <a href="/terms" target="_blank">Termos</a> e a <a href="/privacy" target="_blank">Política de Privacidade</a>. Entendo que minha foto será processada de forma privada e armazenada temporariamente para preparar meus resultados.',
    invalidEmail:'Digite um endereço de e-mail válido.', acceptTerms:'Revise e aceite os Termos e a Política de Privacidade para continuar.', updateFailed:'Não foi possível atualizar o e-mail. Tente novamente.', serverFailed:'Não foi possível conectar ao servidor.',
    confirmEmail:'Confirme seu e-mail', confirmTitle:'Confirme seu endereço de e-mail', confirmBody:'Enviamos seus resultados e atualizações do pedido para este endereço.', edit:'Editar', confirmButton:'Confirmar e-mail →', preparing:'Preparando…',
    checkEmail:'Verifique seu e-mail', otpTitle:'Digite o código de verificação', otpBody:'Enviamos um código de 6 dígitos para', verify:'Verificar →', verifying:'Verificando…', resend:'Reenviar código', changeEmail:'Alterar e-mail', invalidCode:'Digite o código de 6 dígitos enviado por e-mail.', attempts:'Muitas tentativas. Solicite um novo código.', wrongCode:'O código está incorreto ou expirou.', waitResend:s=>`Aguarde ${s}s antes de solicitar outro código.`, resendFailed:'Não foi possível reenviar o código agora.', resent:'Um novo código foi enviado.',
    underMb:mb=>`Escolha uma foto com menos de ${mb} MB.`, format:'Use JPG, PNG, WEBP, HEIC ou HEIF.', tooSmall:'Esta imagem é muito pequena. Escolha uma foto de pelo menos 400 × 400 px.', uploadFailed:'Não foi possível enviar a foto com segurança. Tente outra imagem.', unsupported:'Este formato de imagem não é compatível com o servidor.', larger:'Escolha uma imagem maior.', sending:'Enviando código de verificação…'
  }
};
const t = (key, ...args) => {
  const value = (copy[activeLocale] || copy.en)[key] ?? copy.en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
};

const sessionId = (() => {
  let id = sessionStorage.getItem('hairlook_session_id');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('hairlook_session_id', id); }
  return id;
})();

const utm = (() => {
  const params = new URLSearchParams(location.search);
  const saved = JSON.parse(sessionStorage.getItem('hairlook_utm') || '{}');
  const data = { ...saved };
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) if (params.get(key)) data[key] = params.get(key).slice(0,160);
  if (params.get('source')) data.source = params.get('source').slice(0,160);
  sessionStorage.setItem('hairlook_utm', JSON.stringify(data));
  return data;
})();

function track(eventName, metadata={}) {
  fetch('/api/analytics', {
    method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
    body: JSON.stringify({ sessionId, eventName, metadata })
  }).catch(() => {});
}
track('landing_view', { path: location.pathname, ...utm });

$('[data-year]') && ($('[data-year]').textContent = new Date().getFullYear());

const header = $('#siteHeader');
const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 18);
onScroll(); addEventListener('scroll', onScroll, { passive:true });
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
}), { threshold:.12, rootMargin:'0px 0px -35px 0px' });
$$('.reveal').forEach(el => revealObserver.observe(el));

const range = $('#comparisonRange'), after = $('#comparisonAfter'), divider = $('#comparisonDivider'), handle = $('#comparisonHandle');
function setComparison(value) {
  const n = Math.max(0, Math.min(100, Number(value)));
  if (range) range.value = n;
  if (after) after.style.clipPath = `inset(0 0 0 ${n}%)`;
  if (divider) divider.style.left = `${n}%`;
  if (handle) handle.style.left = `${n}%`;
}
range?.addEventListener('input', e => setComparison(e.target.value));
$$('[data-compare]').forEach(btn => btn.addEventListener('click', () => setComparison(btn.dataset.compare)));

const demoVideo = $('#demoVideo'), videoPlay = $('#videoPlay');
let videoLoaded = false;
function loadVideo() {
  if (!demoVideo || videoLoaded) return;
  $$('source[data-src]', demoVideo).forEach(s => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
  demoVideo.load(); videoLoaded = true;
}
if (demoVideo) {
  const videoObserver = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { loadVideo(); videoObserver.disconnect(); } }, { rootMargin:'250px' });
  videoObserver.observe(demoVideo);
}
videoPlay?.addEventListener('click', async () => { loadVideo(); demoVideo.muted = false; await demoVideo.play().catch(() => {}); videoPlay.classList.add('is-hidden'); });
demoVideo?.addEventListener('pause', () => videoPlay?.classList.remove('is-hidden'));
demoVideo?.addEventListener('play', () => videoPlay?.classList.add('is-hidden'));

const questions = [
  { key:'gender', title:'Who are we creating this look for?', help:'This helps us phrase your consultation naturally. It never changes the price.', options:[['Woman','Woman','woman'],['Man','Man','man'],['Prefer not to say','Prefer not to say','neutral']] },
  { key:'ageRange', title:'What is your age range?', help:'We use this only as style context — never for pricing or eligibility.', options:[['Under 35','Under 35','<35'],['35–44','35–44','35'],['45–54','45–54','45'],['55–64','55–64','55'],['65+','65+','65+']] },
  { key:'currentLength', title:'How long is your hair right now?', help:'Choose the closest match. It gives the edit a more believable starting point.', options:[['Very short','Very short','1'],['Short','Short','2'],['Medium','Medium','3'],['Long','Long','4'],['Very long','Very long','5']] },
  { key:'desiredLength', title:'What length would you love to explore?', help:'There is no commitment — you are choosing directions to preview.', options:[['Shorter','Shorter','↘'],['About the same','About the same','≈'],['Longer','Longer','↗'],['Not sure','Not sure — show me what suits me','?']] },
  { key:'texture', title:'How would you describe your natural hair texture?', help:'Pick the texture that is closest on a typical day.', options:[['Straight','Straight','—'],['Wavy','Wavy','∿'],['Curly','Curly','C'],['Coily','Coily','∞']] },
  { key:'currentColor', type:'swatch', title:'What is your current hair color?', help:'Choose the closest overall color.', options:[['Black','Black','#211e1b'],['Dark brown','Dark brown','#443126'],['Brown','Brown','#6c4a34'],['Light brown','Light brown','#967257'],['Blonde','Blonde','#c8ae7f'],['Red / Auburn','Red / Auburn','#8a4a35'],['Gray / Silver','Gray / Silver','#aaa9a6'],['Other','Other','linear-gradient(135deg,#5d4b7a,#ad765a,#d8c7a0)']] },
  { key:'desiredColors', type:'swatch', multi:true, title:'Would you like to explore a new color?', help:'Choose one or several. We will keep the result believable and salon-realistic.', options:[['Keep current','Keep my current color','#6b5142'],['Natural brunette','Natural brunette','#5a3f2f'],['Warm brunette','Warm brunette','#79523b'],['Blonde','Blonde','#d2ba8c'],['Gray blending','Gray blending','linear-gradient(135deg,#8b8178,#d2d0ca)'],['Silver','Silver','#c3c4c2'],['Copper','Copper','#a85a39'],['Auburn','Auburn','#7f3d2e'],['Something different','Something different','linear-gradient(135deg,#56715e,#9c6a5d,#b9a671)']] },
  { key:'styleGoals', multi:true, title:'What would you most like your new hairstyle to do for you?', help:'Choose up to four priorities. These are used to shape the collection.', options:[['Add volume','Add volume','+'],['Look fresher','Look fresher','✦'],['Feel more modern','Feel more modern','↗'],['Easy to maintain','Be easier to maintain','5′'],['Frame my face','Frame my face','◯'],['Something new','Try something completely new','!'],['Blend gray','Blend gray naturally','≈'],['More elegant','Look more elegant','◇']], max:4 },
  { key:'stylePersonality', visual:true, title:'Which style feels most like you?', help:'Choose the direction you would most happily wear in real life.', options:[['Classic & Elegant','Polished, timeless',media.hero],['Modern & Fresh','Current, flattering, sophisticated',media.consultation],['Soft & Natural','Easy, relaxed, effortless','/media/style-portrait-3.jpg'],['Bold & Confident','A statement change','/media/style-portrait-2.jpg']] },
  { key:'maintenanceLevel', title:'How much time do you like to spend styling your hair?', help:'A beautiful recommendation is only useful if it fits your routine.', options:[['5 minutes or less','5 minutes or less','5′'],['10–15 minutes','10–15 minutes','15′'],["I don't mind styling","I don't mind styling",'✓'],['Salon-finished look','Salon-finished look','✦']] },
  { key:'bangsPreference', title:'Would you consider bangs?', help:'You can keep this open if you would rather compare options.', options:[['Yes','Yes','✓'],['Maybe','Maybe','?'],['No','No','×'],['Show me','Show me what suits me','✦']] },
  { key:'grayPreference', title:'Would you like us to include gray-friendly options?', help:'This is optional and designed to make the color collection more useful for you.', options:[['Keep natural gray','Keep my natural gray','G'],['Blend softly','Blend gray softly','≈'],['Cover gray','Cover gray','●'],['Several options','Show me several options','✦'],['Not relevant','Not relevant to me','—']] }
];
const genderIcons = {
  woman:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="15" r="7"/><path d="M13 40c0-8 4.5-14 11-14s11 6 11 14"/></svg>',
  man:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="14" r="7"/><path d="M12 40v-6a12 12 0 0 1 24 0v6"/></svg>',
  neutral:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="9"/><path d="M24 33v8M18 41h12"/></svg>'
};

const flow = $('#flowShell'), flowContent = $('#flowContent'), flowFooter = $('#flowFooter'), backBtn = $('#flowBack'), nextBtn = $('#flowContinue');
const progressBar = $('#flowProgressBar'), progressLabel = $('#flowStepLabel'), progressPercent = $('#flowPercent');
let step = Number(sessionStorage.getItem('hairlook_quiz_step') || 0);
if (!Number.isFinite(step) || step < 0 || step >= questions.length) step = 0;
let answers = JSON.parse(sessionStorage.getItem('hairlook_quiz_answers') || '{}');
let phase = 'quiz';
let photoFile = null;
let config = { maxUploadMb:12, originalRetentionHours:24 };
fetch('/api/config').then(r=>r.json()).then(v=>config=v).catch(()=>{});

function saveQuiz() {
  sessionStorage.setItem('hairlook_quiz_answers', JSON.stringify(answers));
  sessionStorage.setItem('hairlook_quiz_step', String(step));
}
function updateProgress() {
  if (QUIZ_ENABLED && phase === 'quiz') {
    const pct = Math.round((step / questions.length) * 100);
    progressLabel.textContent = t('step', step + 1, questions.length); progressPercent.textContent = `${pct}%`; progressBar.style.width = `${pct}%`;
    return;
  }
  const stages = {
    upload:[1,25,'uploadProgress'], email:[2,50,'emailProgress'], confirmEmail:[2,50,'emailProgress'], otp:[3,75,'otpProgress']
  };
  const [current,pct,label] = stages[phase] || [4,100,'completeProgress'];
  progressLabel.textContent = `${t('step', current, 4)} · ${t(label)}`; progressPercent.textContent = `${pct}%`; progressBar.style.width = `${pct}%`;
}
function goToStep(renderFn, direction='forward') {
  const leaveClass = direction==='back' ? 'leaving-back' : 'leaving-fwd';
  const enterClass = direction==='back' ? 'entering-back' : 'entering-fwd';
  flowContent.classList.add(leaveClass);
  setTimeout(() => {
    renderFn();
    flowContent.classList.remove(leaveClass);
    flowContent.classList.add(enterClass);
    requestAnimationFrame(() => requestAnimationFrame(() => flowContent.classList.remove(enterClass)));
  }, 150);
}
function openFlow() {
  flow.classList.add('is-open'); flow.setAttribute('aria-hidden','false'); document.body.classList.add('flow-open');
  if (QUIZ_ENABLED) {
    phase='quiz'; renderQuiz(); track('quiz_start', { resumeStep:step+1 });
  } else {
    phase='upload'; showUpload(); track('photo_flow_start');
  }
}
function closeFlow() { flow.classList.remove('is-open'); flow.setAttribute('aria-hidden','true'); document.body.classList.remove('flow-open'); saveQuiz(); }
$$('[data-start-upload],[data-start-quiz]').forEach(btn => btn.addEventListener('click', () => { track('hero_cta', { label:btn.textContent.trim(), destination:'photo_upload' }); openFlow(); }));
$('#flowClose')?.addEventListener('click', closeFlow);

function selected(q, value) { const a=answers[q.key]; return q.multi ? Array.isArray(a)&&a.includes(value) : a===value; }
function optionCard(q, opt) {
  const [value,label,visual] = opt; const is = selected(q,value);
  if (q.visual) return `<button type="button" class="choice-card visual-choice ${is?'is-selected':''}" data-value="${esc(value)}"><span class="visual-img"><img src="${esc(visual)}" alt="" loading="lazy"></span><span class="visual-body"><strong>${esc(value)}</strong><small>${esc(label)}</small></span></button>`;
  if (q.key==='gender') return `<button type="button" class="choice-card gender-choice ${is?'is-selected':''}" data-value="${esc(value)}"><span class="choice-icon">${genderIcons[visual]||''}</span><strong>${esc(label)}</strong></button>`;
  if (q.key==='ageRange') return `<button type="button" class="choice-card age-choice ${is?'is-selected':''}" data-value="${esc(value)}"><span class="choice-icon">${esc(visual)}</span><strong>${esc(label)}</strong></button>`;
  return `<button type="button" class="choice-card ${is?'is-selected':''}" data-value="${esc(value)}"><span class="choice-icon">${esc(visual)}</span><strong>${esc(label)}</strong></button>`;
}
function renderSwatches(q) {
  return `<div class="swatch-grid">${q.options.map(([value,label,color])=>`<button type="button" class="swatch ${selected(q,value)?'is-selected':''}" data-value="${esc(value)}"><span class="swatch-ball" style="background:${esc(color)}"></span><label>${esc(label)}</label></button>`).join('')}</div>`;
}
function renderQuiz() {
  phase='quiz'; flowFooter.style.display='flex'; updateProgress();
  const q=questions[step];
  const count=q.options.length; const gridClass = count<=2?'two':count<=3?'three':count===5?'five':'';
  flowContent.innerHTML = `<section class="quiz-stage"><div class="quiz-kicker">Personal style consultation</div><h2 class="quiz-title">${esc(q.title)}</h2><p class="quiz-help">${esc(q.help)}</p>${q.type==='swatch'?renderSwatches(q):`<div class="choice-grid ${gridClass}">${q.options.map(o=>optionCard(q,o)).join('')}</div>`}</section>`;
  backBtn.style.visibility = step===0?'hidden':'visible';
  nextBtn.hidden = !q.multi;
  nextBtn.textContent = step===questions.length-1?'Complete profile →':'Continue →';
  nextBtn.disabled = !hasAnswer(q);
  $$('[data-value]',flowContent).forEach(card=>card.addEventListener('click',()=>selectOption(q,card.dataset.value)));
  track('quiz_step', { step:step+1, key:q.key });
}
function hasAnswer(q) { const v=answers[q.key]; return q.multi ? Array.isArray(v)&&v.length>0 : Boolean(v); }
function selectOption(q,value) {
  if (q.multi) {
    const arr=Array.isArray(answers[q.key])?[...answers[q.key]]:[];
    const idx=arr.indexOf(value);
    if(idx>=0) arr.splice(idx,1); else { if(q.max && arr.length>=q.max) arr.shift(); arr.push(value); }
    answers[q.key]=arr;
    saveQuiz(); renderQuiz();
  } else {
    answers[q.key]=value;
    saveQuiz(); renderQuiz();
    setTimeout(()=>advance(),220);
  }
}
function advance() {
  const q=questions[step]; if(!hasAnswer(q)) return;
  if(step<questions.length-1){ step++; saveQuiz(); goToStep(renderQuiz); }
  else { track('quiz_complete'); goToStep(showProfileComplete); }
}
function goBack(){
  if(phase==='otp'){ goToStep(showEmail,'back'); return; }
  if(phase==='confirmEmail'){ goToStep(showEmail,'back'); return; }
  if(phase==='email'){ goToStep(showUpload,'back'); return; }
  if(phase==='upload'){ if(!QUIZ_ENABLED){closeFlow();return;} phase='quiz'; step=questions.length-1; goToStep(renderQuiz,'back'); return; }
  if(step>0){ step--; saveQuiz(); goToStep(renderQuiz,'back'); }
}
nextBtn?.addEventListener('click',()=>{ if(phase==='quiz')advance(); else if(phase==='upload'){ if(!photoFile||!['Woman','Man'].includes(answers.gender)){ const error=$('#photoError',flowContent); if(error)error.textContent=t('genderRequired'); return; } goToStep(showEmail); } else if(phase==='email'){ leadCreated?changeEmail():proceedFromEmail(); } });
backBtn?.addEventListener('click',goBack);

function showProfileComplete(){
  phase='transition'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="analysis-box quiz-stage"><div class="analysis-orb" aria-hidden="true"></div><div class="quiz-kicker">Profile complete</div><h2 class="quiz-title">Your style direction is ready.</h2><div class="analysis-list"><div class="analysis-item is-done"><b>✓</b>Preferences complete</div><div class="analysis-item is-done"><b>✓</b>Style direction selected</div><div class="analysis-item is-done"><b>✓</b>Color profile ready</div></div><p class="quiz-help">One last step: upload a clear photo so we can create your personalized previews.</p></section>`;
  setTimeout(()=>goToStep(showUpload),1100);
}
function showUpload(){
  phase='upload'; updateProgress(); flowFooter.style.display='flex'; backBtn.style.visibility=QUIZ_ENABLED?'visible':'hidden'; nextBtn.hidden=false; nextBtn.textContent=t('usePhoto'); nextBtn.disabled=!photoFile||!['Woman','Man'].includes(answers.gender);
  const genderOption=(value,label,icon)=>`<button type="button" class="upload-gender-option ${answers.gender===value?'is-selected':''}" data-upload-gender="${value}" aria-pressed="${answers.gender===value}"><span>${genderIcons[icon]}</span><strong>${label}</strong></button>`;
  flowContent.innerHTML=`<section class="upload-layout quiz-stage"><div class="upload-copy"><div class="eyebrow">${t('uploadEyebrow')}</div><h2>${t('uploadTitle')}</h2><p>${t('uploadBody')}</p><div class="micro-list"><div><b>✓</b>${t('faceVisible')}</div><div><b>✓</b>${t('goodLight')}</div><div><b>✓</b>${t('camera')}</div></div><button type="button" class="photo-tips-link" id="openPhotoTips">${t('examples')}</button></div><div><fieldset class="upload-gender"><legend>${t('genderTitle')}</legend><div class="upload-gender-grid">${genderOption('Woman',t('woman'),'woman')}${genderOption('Man',t('man'),'man')}</div></fieldset><div class="dropzone ${photoFile?'has-image':''}" id="dropzone"><input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="${t('uploadTitle')}"><div class="drop-prompt"><div class="drop-icon">${icons.upload}</div><strong>${t('drag')}</strong><span>${t('chooseDevice')} · ${Number(config.maxUploadMb||12)} MB</span></div><div class="drop-preview"><img id="photoPreview" alt=""><div class="preview-actions"><button type="button" id="removePhoto">${t('chooseAnother')}</button></div></div></div><div class="form-error" id="photoError" role="alert"></div></div></section>`;
  if(photoFile) setPreview(photoFile);
  const input=$('#photoInput',flowContent), zone=$('#dropzone',flowContent);
  input.addEventListener('change',()=>handlePhoto(input.files?.[0]));
  ['dragenter','dragover'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.add('is-drag');}));
  ['dragleave','drop'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.remove('is-drag');}));
  zone.addEventListener('drop',e=>handlePhoto(e.dataTransfer?.files?.[0]));
  $$('[data-upload-gender]',flowContent).forEach(button=>button.addEventListener('click',()=>{ answers.gender=button.dataset.uploadGender; saveQuiz(); showUpload(); track('gender_selected',{gender:answers.gender}); }));
  $('#removePhoto',flowContent)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();photoFile=null;showUpload();});
  $('#openPhotoTips',flowContent)?.addEventListener('click',openTips);
  track('upload_start');
}
async function handlePhoto(file){
  if(!file)return;
  const error=$('#photoError',flowContent); error.textContent='';
  if(file.size > Number(config.maxUploadMb||12)*1024*1024){error.textContent=t('underMb',config.maxUploadMb||12);return;}
  if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)){error.textContent=t('format');return;}
  try {
    const objectUrl=URL.createObjectURL(file); const img=new Image();
    const dims=await new Promise((resolve,reject)=>{img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=reject;img.src=objectUrl;});
    URL.revokeObjectURL(objectUrl);
    if(dims[0]<400||dims[1]<400){error.textContent=t('tooSmall');return;}
  } catch { }
  photoFile=file; showUpload(); nextBtn.disabled=false;
}
function setPreview(file){const img=$('#photoPreview',flowContent); if(!img)return; const url=URL.createObjectURL(file); img.onload=()=>URL.revokeObjectURL(url); img.src=url;}

let leadEmail = '';
let leadCreated = false;
let pendingNext = '/personal-plan';
let otpDevCode = '';
let resendCooldownUntil = 0;
const typoMap = { 'gmail.con':'gmail.com','gmail.co':'gmail.com','gmial.com':'gmail.com','gmal.com':'gmail.com','gnail.com':'gmail.com','yaho.com':'yahoo.com','yahou.com':'yahoo.com','hotmial.com':'hotmail.com','hotmai.com':'hotmail.com','outlok.com':'outlook.com','outloo.com':'outlook.com' };
function typoHint(value){
  const v=String(value||'').trim().toLowerCase();
  const at=v.lastIndexOf('@'); if(at<0)return '';
  const domain=v.slice(at+1);
  return typoMap[domain]?`Did you mean ${v.slice(0,at+1)}${typoMap[domain]}?`:'';
}
function showEmail(){
  if(!photoFile && !leadCreated)return;
  phase='email'; updateProgress(); flowFooter.style.display='flex'; backBtn.style.visibility='visible'; nextBtn.hidden=false; nextBtn.textContent=leadCreated?t('sendCode'):t('continue'); nextBtn.disabled=false;
  flowContent.innerHTML=`<section class="email-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">${t('privateDelivery')}</div><h2>${leadCreated?t('updateEmail'):t('whereSend')}</h2><p>${leadCreated?t('newCodeBody'):t('emailBody')}</p><label class="field-label" for="leadEmail">${t('emailAddress')}</label><input class="text-input" id="leadEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" maxlength="254" value="${esc(leadEmail)}"><div class="typo-hint" id="typoHint"></div>${leadCreated?'':`<label class="consent"><input id="consent" type="checkbox" ${leadEmail?'checked':''}><span>${t('consent')}</span></label>`}<div class="form-error" id="emailError" role="alert"></div></section>`;
  const input=$('#leadEmail',flowContent);
  input.addEventListener('input',()=>{ $('#typoHint',flowContent).textContent=typoHint(input.value); });
  track('email_step_view');
}
function proceedFromEmail(){
  const email=$('#leadEmail',flowContent)?.value.trim().toLowerCase(); const consent=$('#consent',flowContent)?.checked; const error=$('#emailError',flowContent);
  if(!/^\S+@\S+\.\S+$/.test(email||'')){error.textContent=t('invalidEmail');return;}
  if(!consent){error.textContent=t('acceptTerms');return;}
  leadEmail=email; error.textContent=''; goToStep(showEmailConfirm);
}
async function changeEmail(){
  const btn=nextBtn; const email=$('#leadEmail',flowContent)?.value.trim().toLowerCase(); const error=$('#emailError',flowContent);
  if(!/^\S+@\S+\.\S+$/.test(email||'')){error.textContent=t('invalidEmail');return;}
  error.textContent=''; btn.disabled=true;
  try{
    const res=await fetch('/api/verify-email/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){error.textContent=t('updateFailed');btn.disabled=false;return;}
    leadEmail=email; otpDevCode=body.devCode||''; goToStep(showOtpVerification);
  }catch{ error.textContent=t('serverFailed'); btn.disabled=false; }
}
function showEmailConfirm(){
  phase='confirmEmail'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="email-card confirm-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">${t('confirmEmail')}</div><h2>${t('confirmTitle')}</h2><p>${t('confirmBody')}</p><div class="confirm-email-display">${esc(leadEmail)}</div><div class="confirm-actions"><button type="button" class="btn btn-secondary btn-wide" id="editEmailBtn">${t('edit')}</button><button type="button" class="btn btn-primary btn-wide" id="confirmEmailBtn">${t('confirmButton')}</button></div><div class="form-error" id="confirmError" role="alert"></div></section>`;
  $('#editEmailBtn',flowContent).addEventListener('click',()=>goToStep(showEmail));
  $('#confirmEmailBtn',flowContent).addEventListener('click',()=>submitLead());
  track('email_confirm_view');
}
async function submitLead(){
  const confirmBtn=$('#confirmEmailBtn',flowContent), editBtn=$('#editEmailBtn',flowContent), error=$('#confirmError',flowContent)||$('#emailError',flowContent);
  if(confirmBtn){confirmBtn.disabled=true;confirmBtn.textContent=t('preparing');}
  if(editBtn)editBtn.disabled=true;
  if(error)error.textContent='';
  const submissionAnswers={...answers,_locale:activeLocale,_quizEnabled:QUIZ_ENABLED};
  const data=new FormData(); data.append('photo',photoFile); data.append('email',leadEmail); data.append('consent','true'); data.append('quiz',JSON.stringify(submissionAnswers)); data.append('locale',activeLocale); data.append('country',document.documentElement.dataset.country||''); data.append('utm',JSON.stringify(utm)); data.append('landingUrl',location.href.slice(0,1000)); data.append('sessionId',sessionId);
  try{
    const res=await fetch('/api/leads',{method:'POST',body:data}); const body=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(body.error||'upload_failed');
    sessionStorage.setItem('hairlook_lead_id',body.leadId); track('email_submit',{leadCreated:true});
    leadCreated=true; pendingNext=body.next||'/personal-plan';
    if(body.emailVerificationRequired){ otpDevCode=body.devCode||''; goToStep(showOtpVerification); }
    else location.href=pendingNext;
  }catch(e){
    if(confirmBtn){confirmBtn.disabled=false;confirmBtn.textContent=t('confirmButton');}
    if(editBtn)editBtn.disabled=false;
    if(phase==='email'){nextBtn.disabled=false;nextBtn.textContent=t('sendCode');}
    if(error)error.textContent=e.message==='image_too_small'?t('larger'):e.message==='unsupported_image'?t('unsupported'):t('uploadFailed');
  }
}

function showOtpVerification(){
  phase='otp'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="email-card otp-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">${t('checkEmail')}</div><h2>${t('otpTitle')}</h2><p>${t('otpBody')} <strong>${esc(leadEmail)}</strong>.</p><input class="text-input otp-input" id="otpCode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000">${otpDevCode?`<div class="typo-hint">Demo code: ${esc(otpDevCode)}</div>`:''}<div class="form-error" id="otpError" role="alert"></div><button type="button" class="btn btn-primary btn-wide" id="verifyOtpBtn">${t('verify')}</button><div class="otp-actions"><button type="button" class="link-btn" id="resendOtpBtn">${t('resend')}</button><button type="button" class="link-btn" id="changeEmailOtpBtn">${t('changeEmail')}</button></div></section>`;
  const input=$('#otpCode',flowContent);
  input.addEventListener('input',()=>{ input.value=input.value.replace(/\D/g,'').slice(0,6); });
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); verifyOtp(); } });
  input.focus();
  $('#verifyOtpBtn',flowContent).addEventListener('click',verifyOtp);
  $('#resendOtpBtn',flowContent).addEventListener('click',resendOtp);
  $('#changeEmailOtpBtn',flowContent).addEventListener('click',()=>goToStep(showEmail,'back'));
  track('otp_view');
}
async function verifyOtp(){
  const input=$('#otpCode',flowContent), btn=$('#verifyOtpBtn',flowContent), error=$('#otpError',flowContent);
  const code=input.value.trim();
  error.textContent='';
  if(!/^\d{6}$/.test(code)){error.textContent=t('invalidCode');return;}
  btn.disabled=true; btn.textContent=t('verifying');
  try{
    const res=await fetch('/api/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){
      error.textContent=body.error==='max_attempts_exceeded'?t('attempts'):t('wrongCode');
      btn.disabled=false; btn.textContent=t('verify');
      return;
    }
    track('email_verified');
    await window.metaTrackLead?.({ eventId:body.metaLeadEventId });
    location.href=pendingNext;
  }catch{
    error.textContent=t('serverFailed');
    btn.disabled=false; btn.textContent=t('verify');
  }
}
async function resendOtp(){
  const btn=$('#resendOtpBtn',flowContent), error=$('#otpError',flowContent);
  if(Date.now()<resendCooldownUntil)return;
  btn.disabled=true;
  try{
    const res=await fetch('/api/verify-email/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){
      if(body.error==='resend_cooldown'){error.textContent=t('waitResend',body.retryAfterSeconds||60);resendCooldownUntil=Date.now()+(body.retryAfterSeconds||60)*1000;}
      else error.textContent=t('resendFailed');
    } else {
      otpDevCode=body.devCode||''; resendCooldownUntil=Date.now()+60_000;
      showOtpVerification();
      $('#otpError',flowContent).textContent=t('resent');
    }
  }catch{ error.textContent=t('serverFailed'); }
  finally{ setTimeout(()=>{ const b=$('#resendOtpBtn',flowContent); if(b)b.disabled=false; },1000); }
}

const tipsModal=$('#photoTipsModal');
function openTips(){tipsModal?.classList.add('is-open');tipsModal?.setAttribute('aria-hidden','false');}
function closeTips(){tipsModal?.classList.remove('is-open');tipsModal?.setAttribute('aria-hidden','true');}
$('#tipsClose')?.addEventListener('click',closeTips);tipsModal?.addEventListener('click',e=>{if(e.target===tipsModal)closeTips();});
addEventListener('keydown',e=>{if(e.key==='Escape'){ if(tipsModal?.classList.contains('is-open'))closeTips(); else if(flow?.classList.contains('is-open'))closeFlow(); }});
