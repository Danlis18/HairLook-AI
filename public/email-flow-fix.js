// Keep the customer email flow to one entry screen: enter email -> send code -> verify code.
// app.js owns the rest of the consultation state; this small override intentionally reuses it.
proceedFromEmail = async function proceedFromEmailSingleStep(){
  const input=document.querySelector('#leadEmail');
  const consent=document.querySelector('#consent');
  const error=document.querySelector('#emailError');
  const email=input?.value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email||'')){
    if(error)error.textContent='Please enter a valid email address.';
    return;
  }
  if(!consent?.checked){
    if(error)error.textContent='Please review and accept the Terms and Privacy Policy to continue.';
    return;
  }
  leadEmail=email;
  if(error)error.textContent='';
  const next=document.querySelector('#flowContinue');
  if(next){next.disabled=true;next.textContent='Sending verification code…';}
  await submitLead();
  if(next && phase==='email'){next.disabled=false;next.textContent='Send verification code →';}
};

const emailStepObserver=new MutationObserver(()=>{
  const input=document.querySelector('#leadEmail');
  const next=document.querySelector('#flowContinue');
  if(input && next && typeof phase!=='undefined' && phase==='email' && !leadCreated){
    next.textContent='Send verification code →';
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

  const saleHtml='<span class="sale-old">$24.99</span> <strong class="sale-current">$6.99</strong> <span class="sale-badge">72% OFF</span>';
  const heroPrice=document.querySelector('.hero-trust .trust-item:first-child');
  if(heroPrice)heroPrice.innerHTML='<span class="trust-dot"></span>'+saleHtml+' one-time';
  const stripPrice=document.querySelector('.trust-grid .trust-cell:first-child');
  if(stripPrice)stripPrice.innerHTML='<span class="trust-icon">$</span><span>'+saleHtml+' one-time purchase</span>';

  document.querySelectorAll('.faq details').forEach(d=>{
    const s=d.querySelector('summary');
    if(s?.textContent.includes('What exactly am I buying?')){
      const p=d.querySelector('p');
      if(p)p.innerHTML='A one-time personalized digital hairstyle visualization service. Regular price <span class="sale-old">$24.99</span>; current promotional price <strong>$6.99 USD</strong>. No subscription or automatic renewal. See Product Details for the full description.';
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
  style.textContent='.sale-old{text-decoration:line-through;opacity:.55;font-weight:600}.sale-current{color:#18372d}.sale-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#18372d;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;white-space:nowrap}.hero-gallery-main{position:relative;overflow:hidden}.hero-gallery-main .hero-main-video{width:100%;height:100%;display:block;object-fit:cover;object-position:center;border-radius:inherit}.hero-gallery-main>img{display:none!important}';
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
