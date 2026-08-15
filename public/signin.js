const form=document.querySelector('#signinForm');
const request=document.querySelector('#signinRequest');
const sent=document.querySelector('#signinSent');
const sentCopy=document.querySelector('#signinSentCopy');
const result=document.querySelector('#signinResult');
const error=document.querySelector('#signinError');
const sendAgain=document.querySelector('#sendAgainBtn');
const params=new URLSearchParams(location.search);

if(params.get('error')) error.textContent='Esse link de acesso expirou ou já foi usado. Solicite um novo abaixo.';

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
  sentCopy.innerHTML=`Enviamos um link seguro e de uso único para <strong>${escapeHtml(email)}</strong>. Abra a mensagem da <strong>PremiumHairstyles AI</strong> e clique em <strong>Abrir meu pedido privado</strong>. O link faz seu login automaticamente e pode ser usado apenas uma vez.`;
  result.textContent='';
  if(data?.devMagicLink){
    const a=document.createElement('a');
    a.href=data.devMagicLink;
    a.textContent='Abrir link de acesso de demonstração';
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
  btn.textContent='Enviando…';
  try{
    const r=await fetch('/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const data=await r.json();
    if(!r.ok)throw new Error();
    showSent(email,data);
    form.reset();
  }catch{
    error.textContent='Não foi possível enviar o link de acesso. Tente novamente.';
  }finally{
    btn.disabled=false;
    btn.textContent='Enviar link seguro de acesso →';
  }
});
