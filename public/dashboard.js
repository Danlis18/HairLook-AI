const $=(q,r=document)=>r.querySelector(q); const sessionId=sessionStorage.getItem('hairlook_session_id')||'dashboard';
let lastCount=-1,pollTimer=null,activeResult=null;
const categoryOrder=['Recommended','Modern Layers','Easy-Care','Color Directions','Gray-Friendly','Bolder Options'];
const why={
'Recommended':'A balanced direction selected to match your stated length, texture, color and style priorities.',
'Modern Layers':'Adds movement and a fresher silhouette while keeping the result wearable and salon-friendly.',
'Easy-Care':'Designed around lower daily styling effort while preserving a polished overall shape.',
'Color Directions':'A believable salon color direction based on the colors you said you want to explore.',
'Gray-Friendly':'Keeps or blends gray intentionally rather than treating it as something that must be hidden.',
'Bolder Options':'A more noticeable change for comparison, while keeping the same person and overall realism.'};
function chip(v){return v?`<span class="profile-chip">${String(v).replace(/[<>&]/g,'')}</span>`:''}
async function load(){
 const res=await fetch('/api/dashboard',{cache:'no-store'});if(res.status===401){location.href='/signin';return;}const data=await res.json();
 if(!res.ok)return;
 if(data.lead.paymentStatus!=='paid')return showPaymentGate(data.lead.paymentStatus);
 $('#paymentGate').hidden=true;$('#dashboardContent').hidden=false;render(data);
 if(!['completed','partial','failed'].includes(data.lead.generationStatus))pollTimer=setTimeout(load,3500);
}
function showPaymentGate(status){
 clearTimeout(pollTimer);$('#dashboardContent').hidden=true;const gate=$('#paymentGate');gate.hidden=false;
 const waiting=['checkout_started','waiting'].includes(status);
 gate.innerHTML=`<div class="auth-card" style="margin:50px auto"><div class="logo"><span class="logo-mark"></span><span class="logo-name">HairLook AI</span></div><h1>${waiting?'Verifying your payment…':'Your collection is still locked.'}</h1><p>${waiting?'We only unlock generation after PayPro Global confirms the payment to our server. This page will recheck automatically.':'Complete the one-time secure checkout to start your private collection.'}</p><a class="btn btn-primary btn-wide" href="/personal-plan">${waiting?'Back to purchase page':'Continue to checkout'}</a></div>`;
 if(waiting)pollTimer=setTimeout(load,3000);
}
function render(data){
 const results=data.results||[];
 const p=data.lead.profile||{};$('#profileStrip').innerHTML=[p.ageRange,p.currentLength&&`${p.currentLength} now`,p.desiredLength&&`${p.desiredLength} desired`,p.texture,p.currentColor,p.grayPreference].map(chip).join('');
 $('#preparingNotice').hidden=!!results.length;
 $('#progressCard').hidden=!results.length;
 $('#resultSections').hidden=!results.length;
 if(results.length){
  $('#progressText').textContent=`${results.length} result${results.length===1?'':'s'} ready`;
  const grouped=Object.groupBy?Object.groupBy(results,r=>r.category):results.reduce((a,r)=>((a[r.category]??=[]).push(r),a),{});
  const categories=[...categoryOrder.filter(c=>grouped[c]?.length),...Object.keys(grouped).filter(c=>!categoryOrder.includes(c))];
  const sectionRoot=$('#resultSections');sectionRoot.innerHTML='';
  for(const category of categories){const rows=grouped[category]||[];
   const section=document.createElement('section');section.className='result-section';section.innerHTML=`<div class="result-section-head"><h2>${escapeHtml(category)}</h2><span class="result-count">${rows.length} ready</span></div><div class="result-grid"></div>`;const grid=$('.result-grid',section);
   rows.forEach(r=>{const card=document.createElement('button');card.type='button';card.className='result-card';card.innerHTML=`<img src="${r.url}" alt="${escapeHtml(r.style_name)}" loading="lazy"><span class="result-card-label"><strong>${escapeHtml(r.style_name)}</strong>${escapeHtml(category)}</span>`;card.addEventListener('click',()=>openResult(r));grid.appendChild(card);});
   sectionRoot.appendChild(section);
  }
 }
 if(results.length!==lastCount){lastCount=results.length;fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,eventName:'dashboard_view',metadata:{resultCount:results.length}})}).catch(()=>{});}
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function openResult(r){activeResult=r;$('#modalImage').src=r.url;$('#modalCategory').textContent=r.category;$('#modalTitle').textContent=r.style_name;$('#modalWhy').innerHTML=`<strong>Why this may work</strong><p>${why[r.category]||why.Recommended}</p><p><strong>Important:</strong> This is a visualization, not a guarantee of an identical real-world salon outcome.</p>`;$('#modalDownload').href=`/api/results/${r.id}/download`;$('#resultModal').classList.add('is-open');$('#resultModal').setAttribute('aria-hidden','false');}
function closeModal(){$('#resultModal').classList.remove('is-open');$('#resultModal').setAttribute('aria-hidden','true');activeResult=null;}
$('#modalClose').addEventListener('click',closeModal);$('#modalDone').addEventListener('click',closeModal);$('#resultModal').addEventListener('click',e=>{if(e.target===$('#resultModal'))closeModal();});
$('#logoutBtn').addEventListener('click',async()=>{await fetch('/api/logout',{method:'POST'});location.href='/';});
$('#deleteAccount').addEventListener('click',async()=>{if(!confirm('Permanently delete your HairLook AI data and private result files? This cannot be undone.'))return;const r=await fetch('/api/account',{method:'DELETE'});if(r.ok)location.href='/';else alert('Could not delete the data right now. Please contact support.');});
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
load().catch(()=>setTimeout(load,3000));
