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
  if (phase === 'quiz') {
    const pct = Math.round((step / questions.length) * 100);
    progressLabel.textContent = `Step ${step + 1} of ${questions.length}`; progressPercent.textContent = `${pct}%`; progressBar.style.width = `${pct}%`;
  } else { progressLabel.textContent = 'Style profile complete'; progressPercent.textContent = '100%'; progressBar.style.width = '100%'; }
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
  phase='quiz'; renderQuiz(); track('quiz_start', { resumeStep:step+1 });
}
function closeFlow() { flow.classList.remove('is-open'); flow.setAttribute('aria-hidden','true'); document.body.classList.remove('flow-open'); saveQuiz(); }
$$('[data-start-quiz]').forEach(btn => btn.addEventListener('click', () => { track('hero_cta', { label:btn.textContent.trim() }); openFlow(); }));
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
  if(phase==='upload'){ phase='quiz'; step=questions.length-1; goToStep(renderQuiz,'back'); return; }
  if(step>0){ step--; saveQuiz(); goToStep(renderQuiz,'back'); }
}
nextBtn?.addEventListener('click',()=>{ if(phase==='quiz')advance(); else if(phase==='upload')goToStep(showEmail); else if(phase==='email'){ leadCreated?changeEmail():proceedFromEmail(); } });
backBtn?.addEventListener('click',goBack);

function showProfileComplete(){
  phase='transition'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="analysis-box quiz-stage"><div class="analysis-orb" aria-hidden="true"></div><div class="quiz-kicker">Profile complete</div><h2 class="quiz-title">Your style direction is ready.</h2><div class="analysis-list"><div class="analysis-item is-done"><b>✓</b>Preferences complete</div><div class="analysis-item is-done"><b>✓</b>Style direction selected</div><div class="analysis-item is-done"><b>✓</b>Color profile ready</div></div><p class="quiz-help">One last step: upload a clear photo so we can create your personalized previews.</p></section>`;
  setTimeout(()=>goToStep(showUpload),1100);
}
function showUpload(){
  phase='upload'; updateProgress(); flowFooter.style.display='flex'; backBtn.style.visibility='visible'; nextBtn.hidden=false; nextBtn.textContent='Use this photo →'; nextBtn.disabled=!photoFile;
  flowContent.innerHTML=`<section class="upload-layout quiz-stage"><div class="upload-copy"><div class="eyebrow">One last step</div><h2>Upload one clear photo.</h2><p>Use a portrait where your face and current hair are visible. We re-encode the image before private storage and use it only for the hairstyle workflow described in our Privacy Policy.</p><div class="micro-list"><div><b>✓</b>Face clearly visible</div><div><b>✓</b>Good natural lighting</div><div><b>✓</b>Looking toward the camera</div></div><button type="button" class="photo-tips-link" id="openPhotoTips">See good and bad photo examples</button></div><div><div class="dropzone ${photoFile?'has-image':''}" id="dropzone"><input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choose a portrait photo"><div class="drop-prompt"><div class="drop-icon">${icons.upload}</div><strong>Drag a photo here</strong><span>or choose from your device · up to ${Number(config.maxUploadMb||12)} MB</span></div><div class="drop-preview"><img id="photoPreview" alt="Your selected portrait"><div class="preview-actions"><button type="button" id="removePhoto">Choose another</button></div></div></div><div class="form-error" id="photoError" role="alert"></div></div></section>`;
  if(photoFile) setPreview(photoFile);
  const input=$('#photoInput',flowContent), zone=$('#dropzone',flowContent);
  input.addEventListener('change',()=>handlePhoto(input.files?.[0]));
  ['dragenter','dragover'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.add('is-drag');}));
  ['dragleave','drop'].forEach(n=>zone.addEventListener(n,e=>{e.preventDefault();zone.classList.remove('is-drag');}));
  zone.addEventListener('drop',e=>handlePhoto(e.dataTransfer?.files?.[0]));
  $('#removePhoto',flowContent)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();photoFile=null;showUpload();});
  $('#openPhotoTips',flowContent)?.addEventListener('click',openTips);
  track('upload_start');
}
async function handlePhoto(file){
  if(!file)return;
  const error=$('#photoError',flowContent); error.textContent='';
  if(file.size > Number(config.maxUploadMb||12)*1024*1024){error.textContent=`Please choose a photo under ${config.maxUploadMb||12} MB.`;return;}
  if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)){error.textContent='Please use JPG, PNG, WEBP, HEIC or HEIF.';return;}
  try {
    const objectUrl=URL.createObjectURL(file); const img=new Image();
    const dims=await new Promise((resolve,reject)=>{img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=reject;img.src=objectUrl;});
    URL.revokeObjectURL(objectUrl);
    if(dims[0]<400||dims[1]<400){error.textContent='This image is too small. Please choose at least 400 × 400 px.';return;}
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
  phase='email'; updateProgress(); flowFooter.style.display='flex'; backBtn.style.visibility='visible'; nextBtn.hidden=false; nextBtn.textContent=leadCreated?'Send new code →':'Continue →'; nextBtn.disabled=false;
  flowContent.innerHTML=`<section class="email-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">Private delivery</div><h2>${leadCreated?'Update your email':'Where should we send your results?'}</h2><p>${leadCreated?'We will send a new verification code to this address.':'We use your email for secure access to this hairstyle collection and order-related messages.'}</p><label class="field-label" for="leadEmail">Email address</label><input class="text-input" id="leadEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" maxlength="254" value="${esc(leadEmail)}"><div class="typo-hint" id="typoHint"></div>${leadCreated?'':`<label class="consent"><input id="consent" type="checkbox" ${leadEmail?'checked':''}><span>Concordo com os <a href="/terms" target="_blank">Termos</a> e a <a href="/privacy" target="_blank">Política de Privacidade</a>. Entendo que minha foto será processada de forma privada e armazenada temporariamente para criar os resultados dos penteados.</span></label>`}<div class="form-error" id="emailError" role="alert"></div></section>`;
  const input=$('#leadEmail',flowContent);
  input.addEventListener('input',()=>{ $('#typoHint',flowContent).textContent=typoHint(input.value); });
  track('email_step_view');
}
function proceedFromEmail(){
  const email=$('#leadEmail',flowContent)?.value.trim().toLowerCase(); const consent=$('#consent',flowContent)?.checked; const error=$('#emailError',flowContent);
  if(!/^\S+@\S+\.\S+$/.test(email||'')){error.textContent='Please enter a valid email address.';return;}
  if(!consent){error.textContent='Please review and accept the Terms and Privacy Policy to continue.';return;}
  leadEmail=email; error.textContent=''; goToStep(showEmailConfirm);
}
async function changeEmail(){
  const btn=nextBtn; const email=$('#leadEmail',flowContent)?.value.trim().toLowerCase(); const error=$('#emailError',flowContent);
  if(!/^\S+@\S+\.\S+$/.test(email||'')){error.textContent='Please enter a valid email address.';return;}
  error.textContent=''; btn.disabled=true;
  try{
    const res=await fetch('/api/verify-email/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){error.textContent='Could not update that email. Please try again.';btn.disabled=false;return;}
    leadEmail=email; otpDevCode=body.devCode||''; goToStep(showOtpVerification);
  }catch{ error.textContent='Could not reach the server.'; btn.disabled=false; }
}
function showEmailConfirm(){
  phase='confirmEmail'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="email-card confirm-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">Confirm your email</div><h2>Please confirm your email</h2><p>We deliver your results and order updates to this address.</p><div class="confirm-email-display">${esc(leadEmail)}</div><div class="confirm-actions"><button type="button" class="btn btn-secondary btn-wide" id="editEmailBtn">Edit</button><button type="button" class="btn btn-primary btn-wide" id="confirmEmailBtn">Confirm email →</button></div><div class="form-error" id="confirmError" role="alert"></div></section>`;
  $('#editEmailBtn',flowContent).addEventListener('click',()=>goToStep(showEmail));
  $('#confirmEmailBtn',flowContent).addEventListener('click',()=>submitLead());
  track('email_confirm_view');
}
async function submitLead(){
  const confirmBtn=$('#confirmEmailBtn',flowContent), editBtn=$('#editEmailBtn',flowContent), error=$('#confirmError',flowContent);
  if(confirmBtn){confirmBtn.disabled=true;confirmBtn.textContent='Preparing…';}
  if(editBtn)editBtn.disabled=true;
  if(error)error.textContent='';
  const data=new FormData(); data.append('photo',photoFile); data.append('email',leadEmail); data.append('consent','true'); data.append('quiz',JSON.stringify(answers)); data.append('utm',JSON.stringify(utm)); data.append('landingUrl',location.href.slice(0,1000)); data.append('sessionId',sessionId);
  try{
    const res=await fetch('/api/leads',{method:'POST',body:data}); const body=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(body.error||'upload_failed');
    sessionStorage.setItem('hairlook_lead_id',body.leadId); track('email_submit',{leadCreated:true});
    leadCreated=true; pendingNext=body.next||'/personal-plan';
    if(body.emailVerificationRequired){ otpDevCode=body.devCode||''; goToStep(showOtpVerification); }
    else location.href=pendingNext;
  }catch(e){
    if(confirmBtn){confirmBtn.disabled=false;confirmBtn.textContent='Confirm email →';}
    if(editBtn)editBtn.disabled=false;
    if(error)error.textContent=e.message==='image_too_small'?'Please choose a larger image.':e.message==='unsupported_image'?'That image format is not supported by this server.':'We could not securely upload that photo. Please try another image.';
  }
}

function showOtpVerification(){
  phase='otp'; updateProgress(); flowFooter.style.display='none';
  flowContent.innerHTML=`<section class="email-card otp-card quiz-stage"><div class="eyebrow" style="justify-content:center;display:flex">Check your email</div><h2>Enter your verification code</h2><p>We sent a 6-digit code to <strong>${esc(leadEmail)}</strong>.</p><input class="text-input otp-input" id="otpCode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="000000">${otpDevCode?`<div class="typo-hint">Demo code: ${esc(otpDevCode)}</div>`:''}<div class="form-error" id="otpError" role="alert"></div><button type="button" class="btn btn-primary btn-wide" id="verifyOtpBtn">Verify →</button><div class="otp-actions"><button type="button" class="link-btn" id="resendOtpBtn">Resend code</button><button type="button" class="link-btn" id="changeEmailOtpBtn">Change email</button></div></section>`;
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
  if(!/^\d{6}$/.test(code)){error.textContent='Enter the 6-digit code from your email.';return;}
  btn.disabled=true; btn.textContent='Verifying…';
  try{
    const res=await fetch('/api/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){
      error.textContent=body.error==='max_attempts_exceeded'?'Too many attempts. Please request a new code.':'That code is incorrect or has expired.';
      btn.disabled=false; btn.textContent='Verify →';
      return;
    }
    track('email_verified');
    location.href=pendingNext;
  }catch{
    error.textContent='Could not reach the server. Please try again.';
    btn.disabled=false; btn.textContent='Verify →';
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
      if(body.error==='resend_cooldown'){error.textContent=`Please wait ${body.retryAfterSeconds||60}s before requesting another code.`;resendCooldownUntil=Date.now()+(body.retryAfterSeconds||60)*1000;}
      else error.textContent='Could not resend the code right now.';
    } else {
      otpDevCode=body.devCode||''; resendCooldownUntil=Date.now()+60_000;
      showOtpVerification();
      $('#otpError',flowContent).textContent='A new code has been sent.';
    }
  }catch{ error.textContent='Could not reach the server.'; }
  finally{ setTimeout(()=>{ const b=$('#resendOtpBtn',flowContent); if(b)b.disabled=false; },1000); }
}

const tipsModal=$('#photoTipsModal');
function openTips(){tipsModal?.classList.add('is-open');tipsModal?.setAttribute('aria-hidden','false');}
function closeTips(){tipsModal?.classList.remove('is-open');tipsModal?.setAttribute('aria-hidden','true');}
$('#tipsClose')?.addEventListener('click',closeTips);tipsModal?.addEventListener('click',e=>{if(e.target===tipsModal)closeTips();});
addEventListener('keydown',e=>{if(e.key==='Escape'){ if(tipsModal?.classList.contains('is-open'))closeTips(); else if(flow?.classList.contains('is-open'))closeFlow(); }});
