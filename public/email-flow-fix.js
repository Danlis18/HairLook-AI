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
