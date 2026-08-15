const form=document.querySelector('#signinForm');
const request=document.querySelector('#signinRequest');
const sent=document.querySelector('#signinSent');
const sentCopy=document.querySelector('#signinSentCopy');
const result=document.querySelector('#signinResult');
const error=document.querySelector('#signinError');
const sendAgain=document.querySelector('#sendAgainBtn');
const params=new URLSearchParams(location.search);

if(params.get('error')) error.textContent='That sign-in link is expired or has already been used. Request a new one below.';

function showRequest(){
  sent.hidden=true;
  request.hidden=false;
  result.textContent='';
  error.textContent='';
  form.querySelector('input')?.focus();
}

function showSent(email,data){
  request.hidden=true;
  sent.hidden=false;
  sentCopy.innerHTML=`We sent a secure one-time link to <strong>${escapeHtml(email)}</strong>. Open the message from <strong>HairLook AI</strong> and click <strong>Open my private order</strong>. The link signs you in automatically and can only be used once.`;
  result.textContent='';
  if(data?.devMagicLink){
    const a=document.createElement('a');
    a.href=data.devMagicLink;
    a.textContent='Open demo sign-in link';
    a.style.textDecoration='underline';
    result.appendChild(a);
  }
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

sendAgain?.addEventListener('click',showRequest);

form.addEventListener('submit',async e=>{
  e.preventDefault();
  error.textContent='';
  result.textContent='';
  const btn=form.querySelector('button');
  const email=form.email.value.trim();
  btn.disabled=true;
  btn.textContent='Sending…';
  try{
    const r=await fetch('/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const data=await r.json();
    if(!r.ok)throw new Error();
    showSent(email,data);
    form.reset();
  }catch{
    error.textContent='Could not send the sign-in link. Please try again.';
  }finally{
    btn.disabled=false;
    btn.textContent='Send secure sign-in link →';
  }
});
