// Keep the customer email flow to one entry screen: enter email -> send code -> verify code.
// app.js owns the rest of the consultation state; this small override intentionally reuses it.
proceedFromEmail = async function proceedFromEmailSingleStep(){
  const input=document.querySelector('#leadEmail');
  const consent=document.querySelector('#consent');
  const error=document.querySelector('#emailError');
  const email=input?.value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email||'')){
    if(error)error.textContent=t('invalidEmail');
    return;
  }
  if(!consent?.checked){
    if(error)error.textContent=t('acceptTerms');
    return;
  }
  leadEmail=email;
  if(error)error.textContent='';
  const next=document.querySelector('#flowContinue');
  if(next){next.disabled=true;next.textContent=t('sending');}
  try{
    await submitLead();
  }finally{
    if(next && phase==='email'){next.disabled=false;next.textContent=t('sendCode');}
  }
};

const emailStepObserver=new MutationObserver(()=>{
  const input=document.querySelector('#leadEmail');
  const next=document.querySelector('#flowContinue');
  if(input && next && typeof phase!=='undefined' && phase==='email' && !leadCreated){
    next.textContent=t('sendCode');
  }
});
const flowRoot=document.querySelector('#flowContent');
if(flowRoot)emailStepObserver.observe(flowRoot,{childList:true,subtree:true});

// Global storefront polish for the current PremiumHairstyles AI offer.
(function applyStorefrontOverrides(){
  const OLD='HairLook AI';
  const BRAND='PremiumHairstyles AI';
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
  nodes.forEach(n=>{if(n.nodeValue?.includes(OLD))n.nodeValue=n.nodeValue.split(OLD).join(BRAND);});
  document.title=document.title.replaceAll(OLD,BRAND);
  document.querySelectorAll('[aria-label]').forEach(el=>{const v=el.getAttribute('aria-label');if(v?.includes(OLD))el.setAttribute('aria-label',v.replaceAll(OLD,BRAND));});

  const isUs=document.documentElement.dataset.country==='US';
  const initialOld=isUs?'$53.54':'$24.99';
  const initialCurrent=isUs?'$14.99':'$6.99';
  const saleHtml=`<span class="sale-old">${initialOld}</span> <strong class="sale-current">${initialCurrent}</strong> <span class="sale-badge">72% OFF</span>`;
  const heroPrice=document.querySelector('.hero-trust .trust-item:first-child');
  if(heroPrice)heroPrice.innerHTML='<span class="trust-dot"></span>'+saleHtml+' one-time';
  const stripPrice=document.querySelector('.trust-grid .trust-cell:first-child');
  if(stripPrice)stripPrice.innerHTML='<span class="trust-icon">$</span><span>'+saleHtml+' one-time purchase</span>';

  document.querySelectorAll('.faq details').forEach(d=>{
    const s=d.querySelector('summary');
    if(s?.textContent.includes('What exactly am I buying?')){
      const p=d.querySelector('p');
      if(p)p.innerHTML=`A one-time personalized digital hairstyle visualization service. Regular price <span class="sale-old">${initialOld}</span>; current promotional price <strong class="sale-current">${initialCurrent}</strong> USD. No subscription or automatic renewal. See Product Details for the full description.`;
    }
  });

  const productCol=[...document.querySelectorAll('.footer-col')].find(c=>c.querySelector('strong')?.textContent.trim()==='Product');
  if(productCol){
    const detail=[...productCol.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/product');
    if(detail)detail.textContent='Product Details';
    if(!productCol.querySelector('a[href="/price"]')){
      const price=document.createElement('a');price.href='/price';price.textContent='Price';
      detail?.after(price);
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .sale-old{text-decoration:line-through;opacity:.55;font-weight:600}
    .sale-current{color:#18372d}
    .sale-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#18372d;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;white-space:nowrap}

    /* Keep the hero media at one consistent desktop size. Viewport height must not scale it. */
    @media (min-width:1021px){
      .hero{min-height:760px;padding:38px 0 46px;display:flex;align-items:center;overflow:visible}
      .hero-grid{width:min(calc(100% - 40px),1200px);align-items:center}
      .hero-copy{align-self:center}
      .hero-visual{display:flex;align-items:center;justify-content:center}
      .hero-gallery{width:650px;height:720px;min-height:720px;flex:0 0 650px;margin:0 auto;position:relative}
      .hero-gallery-main{inset:0 88px 0 56px;border-radius:32px}
      .hero-gallery-main .hero-main-video{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#9da5af;border-radius:inherit}
      .hero-gallery-small{width:184px;height:232px}
      .hero-gallery-small.top{right:-14px;top:-4px}
      .hero-gallery-small.bottom{left:-30px;bottom:-4px}
      .hero-note{right:-20px;top:15%;width:178px}
    }

    @media (max-width:1020px){
      .hero-gallery-main .hero-main-video{width:100%;height:100%;display:block;object-fit:cover;object-position:center;border-radius:inherit}
    }

    .hero-gallery-main{position:absolute;overflow:hidden}
    .hero-gallery-main>img{display:none!important}

    /* Quiz recommendation gallery */
    .recommend-stage{width:min(1120px,100%);margin:0 auto;padding:6px 0 18px}
    .recommend-head{text-align:center;margin:0 auto 18px;max-width:760px}
    .recommend-head .quiz-kicker{margin-bottom:7px}
    .recommend-head .quiz-title{margin-bottom:8px}
    .recommend-head .quiz-help{margin:0 auto;max-width:680px}
    .recommend-shell{max-height:min(57vh,610px);overflow:auto;padding:4px 6px 12px;overscroll-behavior:contain;scrollbar-width:thin}
    .recommend-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    .recommend-card{position:relative;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:linear-gradient(145deg,#dce5dc,#eee8de);border:1px solid rgba(24,55,45,.12);box-shadow:0 8px 22px rgba(24,40,32,.08);transition:transform .22s ease,box-shadow .22s ease}
    .recommend-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(24,40,32,.12)}
    .recommend-card img{width:100%;height:100%;object-fit:cover;display:block}
    .recommend-card.is-missing{display:grid;place-items:center;padding:18px;text-align:center;color:#526159;background:linear-gradient(145deg,#e7ede6,#f2eee7)}
    .recommend-card.is-missing::before{content:'Preview image';font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7c8881}
    .recommend-name{position:absolute;left:10px;right:10px;bottom:10px;padding:9px 12px;border-radius:12px;background:rgba(25,28,26,.67);backdrop-filter:blur(8px);color:#fff;font-size:13px;font-weight:800;line-height:1.15;text-align:center}
    .recommend-card.is-missing .recommend-name{position:static;background:#18372d;margin-top:8px}
    .recommend-actions{display:flex;justify-content:center;gap:10px;margin-top:18px}
    .recommend-actions .btn{min-width:210px}
    .recommend-note{text-align:center;color:#78817c;font-size:11px;margin:10px 0 0}
    @media(max-width:820px){.recommend-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.recommend-shell{max-height:60vh}}
    @media(max-width:560px){.recommend-stage{padding-top:0}.recommend-head{margin-bottom:12px}.recommend-head .quiz-title{font-size:34px}.recommend-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.recommend-card{border-radius:14px}.recommend-name{font-size:11px;padding:7px 8px}.recommend-shell{max-height:58vh;padding-inline:2px}.recommend-actions{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(247,243,235,0),#f7f3eb 30%);padding-top:18px;flex-direction:column}.recommend-actions .btn{width:100%;min-width:0}}
  `;
  document.head.appendChild(style);

  // Main hero media: use the uploaded MP4 instead of the large static portrait.
  const heroMain=document.querySelector('.hero-gallery-main');
  if(heroMain && !heroMain.querySelector('.hero-main-video')){
    const fallbackImg=heroMain.querySelector('img');
    const video=document.createElement('video');
    video.className='hero-main-video';
    video.autoplay=true;
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.preload='metadata';
    video.poster=fallbackImg?.getAttribute('src')||'/media/style-portrait-2.jpg';
    video.setAttribute('aria-label','PremiumHairstyles AI hairstyle inspiration video');
    const source=document.createElement('source');
    source.src='/media/Main-Video.mp4';
    source.type='video/mp4';
    video.appendChild(source);
    fallbackImg?.insertAdjacentElement('afterend',video);
    video.play().catch(()=>{});
  }
})();

// -----------------------------------------------------------------------------
// Lean 7-question consultation + gender-specific hairstyle suggestion screen.
// We keep only the answers that materially help choose useful hairstyle directions.
// -----------------------------------------------------------------------------
(function configureLeanQuizAndRecommendations(){
  if(!QUIZ_ENABLED)return;
  const keepKeys=['gender','ageRange','currentLength','desiredLength','texture','styleGoals','maintenanceLevel'];
  const leanQuestions=questions.filter(q=>keepKeys.includes(q.key));
  questions.splice(0,questions.length,...leanQuestions);
  if(step>=questions.length){step=0;saveQuiz();}

  const women=[
    {name:'A-Line Bob',file:'01-a-line-bob.avif',tags:['Shorter','Straight','Wavy','Look fresher','Feel more modern']},
    {name:'Bixie',file:'02-bixie.avif',tags:['Shorter','Straight','Wavy','Something new','Feel more modern']},
    {name:'Bob — Disheveled',file:'03-bob-disheveled.avif',tags:['Shorter','Wavy','Curly','Easy to maintain','Feel more modern']},
    {name:'Bob — With Bangs',file:'04-bob-with-bangs.avif',tags:['Shorter','Straight','Wavy','Frame my face','Look fresher']},
    {name:'Bob — Without Bangs',file:'05-bob-without-bangs.avif',tags:['Shorter','Straight','Wavy','More elegant','Easy to maintain']},
    {name:'Bouncy Curls — Long',file:'06-bouncy-curls-long.avif',tags:['Longer','Curly','Wavy','Add volume','More elegant']},
    {name:'Bouncy Curls — Short',file:'07-bouncy-curls-short.avif',tags:['Shorter','Curly','Wavy','Add volume','Look fresher']},
    {name:'Classic Pixie',file:'08-classic-pixie.avif',tags:['Shorter','Straight','Wavy','Easy to maintain','Something new']},
    {name:'Curly Bob',file:'09-curly-bob.avif',tags:['Shorter','Curly','Coily','Add volume','Feel more modern']},
    {name:'Curly Ponytail',file:'10-curly-ponytail.avif',tags:['About the same','Longer','Curly','Coily','Easy to maintain']},
    {name:'French Twist',file:'11-french-twist.avif',tags:['About the same','Longer','Straight','Wavy','More elegant']},
    {name:'Hollywood Waves',file:'12-hollywood-waves.avif',tags:['About the same','Longer','Wavy','Curly','More elegant']}
  ];

  const men=[
    {name:'Classic Taper',file:'01-classic-taper.avif',tags:['Shorter','Straight','Wavy','Easy to maintain','More elegant']},
    {name:'Textured Crop',file:'02-textured-crop.avif',tags:['Shorter','Straight','Wavy','Easy to maintain','Feel more modern']},
    {name:'Modern Quiff',file:'03-modern-quiff.avif',tags:['About the same','Straight','Wavy','Add volume','Feel more modern']},
    {name:'Crew Cut',file:'04-crew-cut.avif',tags:['Shorter','Straight','Easy to maintain','Look fresher']},
    {name:'French Crop',file:'05-french-crop.avif',tags:['Shorter','Straight','Wavy','Frame my face','Easy to maintain']},
    {name:'Side Part',file:'06-side-part.avif',tags:['About the same','Straight','Wavy','More elegant']},
    {name:'Short Pompadour',file:'07-short-pompadour.avif',tags:['About the same','Straight','Wavy','Add volume','Something new']},
    {name:'Slick Back',file:'08-slick-back.avif',tags:['About the same','Longer','Straight','Wavy','More elegant']},
    {name:'Buzz Cut',file:'09-buzz-cut.avif',tags:['Shorter','Straight','Easy to maintain','Something new']},
    {name:'Curly Crop',file:'10-curly-crop.avif',tags:['Shorter','Curly','Coily','Easy to maintain','Feel more modern']},
    {name:'Medium Flow',file:'11-medium-flow.avif',tags:['Longer','Wavy','Curly','Feel more modern','Something new']},
    {name:'Undercut',file:'12-undercut.avif',tags:['Shorter','About the same','Straight','Wavy','Something new']}
  ];

  function rankedCatalog(){
    const isMan=String(answers.gender||'').toLowerCase()==='man';
    const catalog=isMan?men:women;
    const prefs=[answers.desiredLength,answers.texture,...(Array.isArray(answers.styleGoals)?answers.styleGoals:[]),answers.maintenanceLevel].filter(Boolean);
    return catalog.map((item,index)=>{
      const score=prefs.reduce((sum,p)=>sum+(item.tags.includes(p)?3:0),0)-index*.01;
      return {...item,score};
    }).sort((a,b)=>b.score-a.score);
  }

  function cardHtml(item,isMan){
    const folder=isMan?'men':'women';
    const src=`/media/hairstyles/${folder}/${item.file}`;
    return `<article class="recommend-card"><img src="${src}" alt="${esc(item.name)} hairstyle preview" loading="lazy" onerror="this.closest('.recommend-card').classList.add('is-missing');this.remove()"><div class="recommend-name">${esc(item.name)}</div></article>`;
  }

  showProfileComplete=function showHairstyleRecommendations(){
    phase='recommendations';updateProgress();flowFooter.style.display='none';
    const isMan=String(answers.gender||'').toLowerCase()==='man';
    const genderLabel=isMan?'men':'women';
    const ranked=rankedCatalog();
    answers.recommendedStyles=ranked.slice(0,6).map(x=>x.name);
    saveQuiz();
    flowContent.innerHTML=`<section class="recommend-stage quiz-stage"><div class="recommend-head"><div class="quiz-kicker">Your hairstyle directions</div><h2 class="quiz-title">Styles worth exploring for you.</h2><p class="quiz-help">Based on your 7 answers, these ${genderLabel}'s hairstyle directions are the strongest starting points. Your final paid previews are created from your own uploaded photo.</p></div><div class="recommend-shell"><div class="recommend-grid">${ranked.map(item=>cardHtml(item,isMan)).join('')}</div></div><div class="recommend-actions"><button type="button" class="btn btn-secondary" id="recommendBack">← Back</button><button type="button" class="btn btn-primary" id="recommendContinue">Continue with these ideas →</button></div><p class="recommend-note">The order is personalized from your quiz answers; these example cards are style directions, not your final generated results.</p></section>`;
    $('#recommendBack',flowContent)?.addEventListener('click',()=>{phase='quiz';step=questions.length-1;goToStep(renderQuiz,'back');});
    $('#recommendContinue',flowContent)?.addEventListener('click',()=>goToStep(showUpload));
    track('hairstyle_recommendations_view',{gender:answers.gender||'unknown',top:answers.recommendedStyles});
  };

  const originalGoBack=goBack;
  goBack=function goBackWithRecommendations(){
    if(phase==='recommendations'){phase='quiz';step=questions.length-1;goToStep(renderQuiz,'back');return;}
    originalGoBack();
  };
})();

// Safe one-time localization each time the email step is rendered. No MutationObserver loop.
(function localizeEmailStepSafely(){
  const originalShowEmail=showEmail;
  showEmail=function(){
    originalShowEmail();
    const consent=document.querySelector('#flowContent .consent span');
    if(consent){
      consent.innerHTML=t('consent');
    }
  };
})();
