const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const api='/api/admin'; let me=null, searchTimer=null;
function esc(v=''){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function statusClass(v=''){return ['failed','chargeback','refunded','declined'].includes(v)?'bad':['queued','processing','retry','waiting','checkout_started','partial','manual_pending','manual_processing'].includes(v)?'warn':'';}
function fulfillmentLabel(v=''){return {not_started:'Not started',manual_pending:'Awaiting manual fulfillment',manual_processing:'In progress',completed:'Completed',partial:'Completed',failed:'Failed',queued:'Awaiting fulfillment',processing:'In progress'}[v]||v||'—';}
function fmtDate(v){return v?new Date(v).toLocaleString():'—';}
function providerLabel(v=''){return {paddle:'Paddle',demo:'Demo'}[v]||v||'—';}
function yesNo(v){return v?'Yes':'No';}
async function request(url,options={}){const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})},credentials:'same-origin',cache:'no-store'});if(r.status===401)throw Object.assign(new Error('unauthorized'),{status:401});const d=await r.json().catch(()=>null);if(!r.ok)throw Object.assign(new Error(d?.error||'request_failed'),{status:r.status});return d;}
async function requestForm(url,formData){const r=await fetch(url,{method:'POST',body:formData,credentials:'same-origin',cache:'no-store'});if(r.status===401)throw Object.assign(new Error('unauthorized'),{status:401});const d=await r.json().catch(()=>null);if(!r.ok)throw Object.assign(new Error(d?.error||'request_failed'),{status:r.status});return d;}
function renderResultsGrid(results){return results.map(r=>`<div class="admin-result-thumb" style="position:relative"><img src="${r.url}" alt="${esc(r.style_name)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;display:block"><button type="button" class="btn btn-small" data-action="delete-result" data-result-id="${r.id}" title="Remove this result" style="position:absolute;top:4px;right:4px;padding:1px 7px;line-height:1.6;border:1px solid #d8b7b2;background:#fff5f3;color:#863b32">×</button></div>`).join('')||'<span class="muted" style="font-size:11px">No results stored for this customer yet.</span>';}

async function bootstrap(){
 try{const methods=await fetch(`${api}/login-methods`,{cache:'no-store'}).then(r=>r.json());$('#magicLinkFallback').hidden=!methods.magicLink;}catch{}
 try{me=await request(`${api}/me`);$('#adminLogin').hidden=true;$('#adminShell').hidden=false;$('#adminIdentity').textContent=me.email;loadView('overview');}catch{$('#adminLogin').hidden=false;$('#adminShell').hidden=true;}
}

$('#adminPasswordForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=e.currentTarget.querySelector('button'),error=$('#adminPasswordError'),original=btn.textContent;btn.disabled=true;btn.textContent='Signing in…';error.textContent='';
 try{await request(`${api}/auth/login`,{method:'POST',body:JSON.stringify({email:$('#adminPasswordEmail').value.trim(),password:$('#adminPasswordInput').value})});$('#adminPasswordInput').value='';await bootstrap();}
 catch(err){if(err.status===403)error.textContent='Sign-in was blocked because this page is not loading from the configured APP_URL. Check the APP_URL environment variable.';else if(err.status===401)error.textContent='Invalid email or password.';else error.textContent='Could not reach the server. Check your connection and try again.';}
 finally{btn.disabled=false;btn.textContent=original;}
});

$('#adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),error=$('#adminLoginError'),out=$('#adminLoginResult');btn.disabled=true;error.textContent='';out.textContent='';try{const d=await request(`${api}/auth/request-link`,{method:'POST',body:JSON.stringify({email:$('#adminEmail').value.trim()})});out.textContent=d.message;if(d.devMagicLink){const a=document.createElement('a');a.href=d.devMagicLink;a.textContent=' Open demo admin link';a.style.textDecoration='underline';a.style.marginLeft='5px';out.appendChild(a);}}catch{error.textContent='Could not request an admin sign-in link.';}finally{btn.disabled=false;}});

$$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>loadView(btn.dataset.view)));
async function loadView(name){$$('[data-view]').forEach(b=>b.classList.toggle('is-active',b.dataset.view===name));$$('[data-panel]').forEach(p=>p.classList.toggle('is-active',p.dataset.panel===name));$('#adminPageTitle').textContent=name==='analytics'?'Quiz & Funnel':name[0].toUpperCase()+name.slice(1);try{if(name==='overview')await loadOverview();if(name==='customers')await loadCustomers();if(name==='payments')await loadPayments();if(name==='generations')await loadJobs();if(name==='analytics')await loadAnalytics();if(name==='settings')await loadSettings();if(name==='audit')await loadAudit();}catch(e){if(e.status===401)return bootstrap();console.error(e);}}

async function loadOverview(){
 const d=await request(`${api}/overview`),o=d.overview||{},f=d.funnel||{};
 const quizStarts=Number(f.quiz_start||0),quizCompleted=Number(f.quiz_complete||0),uploads=Number(f.upload_complete||0),checkoutStarts=Number(f.checkout_start||0),paid=Number(o.paidCustomers||0),leads=Number(o.leads||0),revenue=Number(o.revenue||0);
 const quizToPaid=quizCompleted?paid/quizCompleted:0,leadToPaid=leads?paid/leads:0;
 $('#overviewStats').innerHTML=[
  ['Revenue',`$${revenue.toFixed(2)}`],
  ['Paid orders',paid],
  ['Customer records',leads],
  ['Quiz starts',quizStarts],
  ['Quiz completed',quizCompleted],
  ['Photos uploaded',uploads],
  ['Checkout starts',checkoutStarts],
  ['Quiz → paid',`${(quizToPaid*100).toFixed(1)}%`],
  ['Lead → paid',`${(leadToPaid*100).toFixed(1)}%`]
 ].map(([l,v])=>`<article class="stat-card"><span>${l}</span><strong>${v}</strong></article>`).join('');
 renderFunnel($('#funnelContent'),f);
}

function renderFunnel(root,d){const order=[['landing_view','Landing'],['quiz_start','Quiz start'],['quiz_complete','Quiz complete'],['upload_complete','Photo uploaded'],['paywall_view','Paywall'],['checkout_start','Checkout'],['payment_success','Payment'],['dashboard_view','Confirmation']];const max=Math.max(1,...order.map(([k])=>d[k]||0));root.innerHTML=`<div style="display:grid;gap:11px">${order.map(([k,l])=>`<div style="display:grid;grid-template-columns:120px 1fr 50px;gap:12px;align-items:center;font-size:11px"><span>${l}</span><div style="height:9px;background:var(--stone);border-radius:10px;overflow:hidden"><div style="height:100%;width:${(d[k]||0)/max*100}%;background:var(--green-3)"></div></div><strong>${d[k]||0}</strong></div>`).join('')}</div>`;}

async function loadCustomers(search=''){
 const d=await request(`${api}/customers?limit=100&search=${encodeURIComponent(search)}`);
 $('#customersBody').innerHTML=d.rows.map(r=>`<tr data-id="${r.id}"><td>${esc(r.email)}</td><td><span class="status ${r.email_verified_at?'':'warn'}">${r.email_verified_at?'Verified':'Not verified'}</span></td><td><span class="status ${r.upload_status==='ready'?'':'warn'}">${esc(r.upload_status||'—')}</span></td><td><span class="status ${statusClass(r.payment_status)}">${esc(r.payment_status)}</span></td><td><span class="status ${statusClass(r.generation_status)}">${esc(fulfillmentLabel(r.generation_status))}</span></td><td>${fmtDate(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="6">No customers found.</td></tr>';
 $$('#customersBody tr[data-id]').forEach(tr=>tr.addEventListener('click',()=>loadCustomerDetail(tr.dataset.id)));
}
$('#customerSearch').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadCustomers(e.target.value.trim()),250);});

async function loadCustomerDetail(id){
 const d=await request(`${api}/customers/${id}`),l=d.lead,results=d.results||[];
 const quizRows=[['Age',l.age_range],['Gender',l.gender],['Current length',l.current_length],['Desired length',l.desired_length],['Texture',l.texture],['Current color',l.current_color],['Wanted colors',(l.desired_colors||[]).join(', ')],['Goals',(l.style_goals||[]).join(', ')],['Style personality',l.style_personality],['Maintenance',l.maintenance_level],['Bangs',l.bangs_preference],['Gray preference',l.gray_preference]];
 $('#customerDetail').innerHTML=`<div class="admin-detail-grid"><article class="detail-card"><h3>Customer & order</h3><div class="detail-list">${[['Email',l.email],['Email verified',l.email_verified_at?fmtDate(l.email_verified_at):'No'],['Photo status',l.upload_status||'—'],['Payment',l.payment_status],['Paid at',fmtDate(l.paid_at)],['Fulfillment',fulfillmentLabel(l.generation_status)]].map(([a,b])=>`<div class="detail-row"><span>${esc(a)}</span><strong>${esc(b||'—')}</strong></div>`).join('')}</div><div class="admin-actions"><button class="btn btn-secondary btn-small" data-action="delete-photo">Delete original</button><button class="btn btn-small" style="border:1px solid #d8b7b2;background:#fff5f3;color:#863b32" data-action="delete-customer">Delete customer</button></div></article><article class="detail-card"><h3>Private original photo</h3><div class="admin-photo" id="adminPhoto"><button class="btn btn-primary btn-small" data-action="reveal-photo">Reveal & download photo</button></div><div class="muted" style="font-size:10px;margin-top:10px">The signed photo link is temporary. Photo reveal and destructive actions are written to the audit log.</div></article><article class="detail-card" style="grid-column:1/-1"><h3>Quiz answers</h3><div class="detail-list">${quizRows.map(([a,b])=>`<div class="detail-row"><span>${esc(a)}</span><strong>${esc(b||'—')}</strong></div>`).join('')}</div></article><article class="detail-card" style="grid-column:1/-1"><h3>Optional stored results</h3><p class="muted" style="font-size:11px;margin-bottom:10px">Current production fulfillment is manual and results are delivered by email within 72 hours. You can optionally store finished images here for the customer record. This does not automatically send the files by email.</p><div id="adminResultsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-bottom:14px">${renderResultsGrid(results)}</div>${l.payment_status!=='paid'?'<p class="muted" style="font-size:11px">This customer has not paid yet — result uploads are locked.</p>':`<form id="uploadResultForm" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="text-input" type="file" id="resultFile" accept="image/png,image/jpeg,image/webp" required style="max-width:220px"><input class="text-input" type="text" id="resultStyleName" placeholder="Style name (optional)" style="max-width:200px"><button class="btn btn-primary btn-small" type="submit">Store result</button></form><div class="form-error" id="uploadResultError"></div>`}</article></div>`;
 const root=$('#customerDetail');
 root.querySelector('[data-action="reveal-photo"]').addEventListener('click',async()=>{try{const p=await request(`${api}/customers/${id}/photo`);$('#adminPhoto').innerHTML=`<img src="${p.url}" alt="Private customer original" style="display:block;width:100%;max-height:520px;object-fit:contain;border-radius:10px"><a class="btn btn-primary btn-small" href="${p.url}" target="_blank" rel="noopener" style="margin-top:10px">Open / download original</a>`;}catch{$('#adminPhoto').textContent='Original photo is unavailable or already deleted.';}});
 root.querySelector('[data-action="delete-photo"]').addEventListener('click',async()=>{if(!confirm('Delete this original photo now?'))return;await request(`${api}/customers/${id}/photo`,{method:'DELETE',body:'{}'});loadCustomerDetail(id);});
 root.querySelector('[data-action="delete-customer"]').addEventListener('click',async()=>{if(!confirm('Permanently delete this customer and remaining private files?'))return;await request(`${api}/customers/${id}`,{method:'DELETE',body:'{}'});$('#customerDetail').innerHTML='';loadCustomers();});
 root.querySelectorAll('[data-action="delete-result"]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Remove this stored result?'))return;await request(`${api}/customers/${id}/results/${btn.dataset.resultId}`,{method:'DELETE',body:'{}'});loadCustomerDetail(id);}));
 const uploadForm=root.querySelector('#uploadResultForm');
 if(uploadForm)uploadForm.addEventListener('submit',async e=>{e.preventDefault();const err=$('#uploadResultError'),btn=e.currentTarget.querySelector('button'),file=$('#resultFile').files[0];err.textContent='';if(!file){err.textContent='Choose a photo first.';return;}btn.disabled=true;try{const fd=new FormData();fd.append('photo',file);const styleName=$('#resultStyleName').value.trim();if(styleName)fd.append('styleName',styleName);await requestForm(`${api}/customers/${id}/results`,fd);loadCustomerDetail(id);}catch{err.textContent='Could not store this result.';btn.disabled=false;}});
}

async function loadPayments(){const d=await request(`${api}/payments?limit=200`);$('#paymentsBody').innerHTML=d.rows.map(r=>`<tr><td>${esc(r.provider_order_id)}</td><td>${esc(providerLabel(r.provider))}</td><td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td><td>${Number(r.amount||0).toFixed(2)} ${esc(r.currency||'')}</td><td>${esc(r.lead_id)}</td><td>${fmtDate(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="6">No payments yet.</td></tr>';}
async function loadJobs(){const d=await request(`${api}/generations?limit=200`);$('#jobsBody').innerHTML=d.rows.map(r=>`<tr><td>${esc(r.style_name)}</td><td>${esc(r.category)}</td><td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td><td>${r.attempts||0}</td><td>${esc(r.lead_id)}</td><td>${esc(r.model||'')}</td></tr>`).join('')||'<tr><td colspan="6">No automation jobs. Manual fulfillment is active.</td></tr>';}
async function loadAnalytics(){const d=await request(`${api}/analytics`);renderFunnel($('#analyticsContent'),d);}
const settingsLabels={price_display_usd:'Display price USD',generation_target_count:'Future result target',support_email:'Support email',checkout_enabled:'Checkout enabled',generation_enabled:'Automatic generation enabled',maintenance_mode:'Maintenance mode',original_retention_hours:'Original retention hours',result_retention_days:'Result retention days'};
async function loadSettings(){const d=await request(`${api}/settings`);$('#settingsGrid').innerHTML=Object.entries(settingsLabels).map(([k,l])=>`<div class="setting-field"><label for="set_${k}">${l}</label><input id="set_${k}" name="${k}" value="${esc(d[k]??'')}"></div>`).join('');}
$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));try{await request(`${api}/settings`,{method:'PUT',body:JSON.stringify(values)});$('#settingsError').textContent='Saved.';}catch{$('#settingsError').textContent='Could not save settings.';}});
async function loadAudit(){const d=await request(`${api}/audit?limit=250`);$('#auditBody').innerHTML=d.map(r=>`<tr><td>${esc(r.admin_email)}</td><td>${esc(r.action)}</td><td>${esc(r.target_type)} ${esc(r.target_id||'')}</td><td>${fmtDate(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No admin actions yet.</td></tr>';}
$('#adminLogout').addEventListener('click',async()=>{await request(`${api}/logout`,{method:'POST',body:'{}'}).catch(()=>{});location.href='/admin';});
bootstrap();
