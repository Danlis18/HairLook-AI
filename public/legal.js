fetch('/api/config',{cache:'no-store'}).then(r=>r.json()).then(c=>{
  document.querySelectorAll('[data-support-email]').forEach(el=>{el.textContent=c.supportEmail;if(el.tagName==='A')el.href=`mailto:${c.supportEmail}`;});
  document.querySelectorAll('[data-support-href]').forEach(el=>{if(el.tagName==='A')el.href=`mailto:${c.supportEmail}`;});
  document.querySelectorAll('[data-business]').forEach(el=>el.textContent=c.legalBusinessName||c.productName);
  document.querySelectorAll('[data-address]').forEach(el=>el.textContent=c.legalBusinessAddress||'Business address available from customer support.');
  document.querySelectorAll('[data-original-hours]').forEach(el=>el.textContent=c.originalRetentionHours);
  document.querySelectorAll('[data-result-days]').forEach(el=>el.textContent=c.resultRetentionDays);
  document.querySelectorAll('[data-price]').forEach(el=>el.textContent=Number(c.priceDisplayUsd).toFixed(2));
  document.querySelectorAll('[data-support-phone]').forEach(el=>el.textContent=c.supportPhone||'');
  document.querySelectorAll('[data-phone-row]').forEach(el=>{el.hidden=!c.supportPhone;});
}).catch(()=>{});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
