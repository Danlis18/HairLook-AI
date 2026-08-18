const form=document.querySelector('#signinForm');
const request=document.querySelector('#signinRequest');
const sent=document.querySelector('#signinSent');
const sentCopy=document.querySelector('#signinSentCopy');
const result=document.querySelector('#signinResult');
const error=document.querySelector('#signinError');
const sendAgain=document.querySelector('#sendAgainBtn');
const params=new URLSearchParams(location.search);
const locale=document.documentElement.lang.toLowerCase().startsWith('pt')?'pt-BR':'en';
const C={
  en:{secure:'▢ Secure & private',kicker:'Private customer access',title:'Access your private order.',intro:'Enter the email used for your order. We will send a secure, time-limited access link to that address.',email:'Email address',send:'Send secure access link →',privacy:'For privacy, we never reveal whether an email is connected to an account.',sentKicker:'Check your email',sentTitle:'Your secure link is ready.',sent:email=>`We sent a secure, one-time link to <strong>${escapeHtml(email)}</strong>. Open the <strong>PremiumHairstyles AI</strong> email and click <strong>Open my private order</strong>.`,again:'Send another link',back:'← Back to PremiumHairstyles AI',expired:'That access link expired or has already been used. Request a new one below.',sending:'Sending…',failed:'We could not send the access link. Please try again.',demo:'Open demo access link'},
  'pt-BR':{secure:'▢ Seguro e privado',kicker:'Acesso privado do cliente',title:'Acesse seu pedido privado.',intro:'Digite o e-mail usado no pedido. Enviaremos um link de acesso seguro e com validade limitada para esse endereço.',email:'Endereço de e-mail',send:'Enviar link seguro de acesso →',privacy:'Por privacidade, nunca informamos se um e-mail está vinculado a uma conta.',sentKicker:'Verifique seu e-mail',sentTitle:'Seu link seguro está pronto.',sent:email=>`Enviamos um link seguro e de uso único para <strong>${escapeHtml(email)}</strong>. Abra a mensagem da <strong>PremiumHairstyles AI</strong> e clique em <strong>Abrir meu pedido privado</strong>.`,again:'Enviar outro link',back:'← Voltar para PremiumHairstyles AI',expired:'Esse link de acesso expirou ou já foi usado. Solicite um novo abaixo.',sending:'Enviando…',failed:'Não foi possível enviar o link de acesso. Tente novamente.',demo:'Abrir link de acesso de demonstração'}
}[locale];

function setText(selector,value){const node=document.querySelector(selector);if(node)node.textContent=value;}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));}
function applyCopy(){
  setText('#authSecure',C.secure);setText('#signinKicker',C.kicker);setText('#signinTitle',C.title);setText('#signinIntro',C.intro);setText('#signinEmailLabel',C.email);setText('#signinForm button',C.send);setText('#signinPrivacy',C.privacy);setText('#sentKicker',C.sentKicker);setText('#sentTitle',C.sentTitle);setText('#sendAgainBtn',C.again);setText('#authBack',C.back);
  document.title=locale==='pt-BR'?'Acesso privado — PremiumHairstyles AI':'Private Access — PremiumHairstyles AI';
}
applyCopy();
if(params.get('error'))error.textContent=C.expired;

function showRequest(){sent.hidden=true;request.hidden=false;result.textContent='';error.textContent='';form.querySelector('input')?.focus();}
function showSent(email,data){
  request.hidden=true;sent.hidden=false;sentCopy.innerHTML=C.sent(email);result.textContent='';
  if(data?.devMagicLink){const a=document.createElement('a');a.href=data.devMagicLink;a.textContent=C.demo;a.style.textDecoration='underline';result.appendChild(a);}
}

sendAgain?.addEventListener('click',showRequest);
form.addEventListener('submit',async event=>{
  event.preventDefault();error.textContent='';result.textContent='';const btn=form.querySelector('button'),email=form.email.value.trim();btn.disabled=true;btn.textContent=C.sending;
  try{
    const response=await fetch('/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,locale})});
    const data=await response.json();if(!response.ok)throw new Error();showSent(email,data);form.reset();
  }catch{error.textContent=C.failed;}
  finally{btn.disabled=false;btn.textContent=C.send;}
});
