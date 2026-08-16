const OFFICIAL_SUPPORT_EMAIL='support@premium-hairstyle.com';

fetch('/api/config',{cache:'no-store'}).then(r=>r.json()).then(c=>{
  document.querySelectorAll('[data-support-email]').forEach(el=>{el.textContent=OFFICIAL_SUPPORT_EMAIL;if(el.tagName==='A')el.href=`mailto:${OFFICIAL_SUPPORT_EMAIL}`;});
  document.querySelectorAll('[data-support-href]').forEach(el=>{if(el.tagName==='A')el.href=`mailto:${OFFICIAL_SUPPORT_EMAIL}`;});
  document.querySelectorAll('[data-business]').forEach(el=>el.textContent=c.legalBusinessName||c.productName);
  document.querySelectorAll('[data-address]').forEach(el=>el.textContent=c.legalBusinessAddress||'Business address available from customer support.');
  document.querySelectorAll('[data-original-hours]').forEach(el=>el.textContent=c.originalRetentionHours);
  document.querySelectorAll('[data-result-days]').forEach(el=>el.textContent=c.resultRetentionDays);
  document.querySelectorAll('[data-price]').forEach(el=>el.textContent=Number(c.priceDisplayUsd).toFixed(2));
  document.querySelectorAll('[data-support-phone]').forEach(el=>el.textContent=c.supportPhone||'');
  document.querySelectorAll('[data-phone-row]').forEach(el=>{el.hidden=!c.supportPhone;});
}).catch(()=>{
  document.querySelectorAll('[data-support-email]').forEach(el=>{el.textContent=OFFICIAL_SUPPORT_EMAIL;if(el.tagName==='A')el.href=`mailto:${OFFICIAL_SUPPORT_EMAIL}`;});
  document.querySelectorAll('[data-support-href]').forEach(el=>{if(el.tagName==='A')el.href=`mailto:${OFFICIAL_SUPPORT_EMAIL}`;});
});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

(function normalizeBrand(){
  const OLD='HairLook AI', BRAND='PremiumHairstyles AI';
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];
  while(walk.nextNode())nodes.push(walk.currentNode);
  nodes.forEach(n=>{if(n.nodeValue?.includes(OLD))n.nodeValue=n.nodeValue.split(OLD).join(BRAND);});
  document.title=document.title.replaceAll(OLD,BRAND);
  document.querySelectorAll('meta[content]').forEach(el=>{const v=el.getAttribute('content');if(v?.includes(OLD))el.setAttribute('content',v.replaceAll(OLD,BRAND));});
})();
