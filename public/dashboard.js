const $=q=>document.querySelector(q);
let pollTimer=null;

function trackConfirmedPurchase(purchase,attempts=20){
  if(!purchase)return;
  if(typeof window.metaTrackPurchase==='function'){
    window.metaTrackPurchase(purchase).catch(()=>{});
    return;
  }
  if(attempts>0)setTimeout(()=>trackConfirmedPurchase(purchase,attempts-1),100);
}

function setState({eyebrow,title,message,email='',confirmed=false,error=false}){
  $('#orderEyebrow').textContent=eyebrow;
  $('#orderTitle').textContent=title;
  $('#orderMessage').textContent=message;
  const emailEl=$('#orderEmail');
  if(email){emailEl.textContent=email;emailEl.hidden=false;}else emailEl.hidden=true;
  $('#orderSpinner').style.display=confirmed||error?'none':'block';
  $('#homeButton').hidden=!confirmed;
  $('#orderNote').textContent=confirmed?'Nenhuma ação adicional é necessária. Enviaremos um e-mail quando seus resultados estiverem prontos.':error?'Se o problema continuar, entre em contato com o suporte.':'Não é necessário atualizar esta página.';
  const home=$('#homeButton');if(home)home.textContent='Voltar ao início';
}

async function loadStatus(){
  clearTimeout(pollTimer);
  try{
    const res=await fetch('/api/dashboard',{cache:'no-store'});
    if(res.status===401){
      setState({eyebrow:'Sessão expirada',title:'Não foi possível abrir este pedido.',message:'Entre em contato com o suporte usando o mesmo e-mail informado na consultoria.',error:true});
      return;
    }
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'status_failed');

    const lead=data.lead||{};
    if(lead.paymentStatus==='paid'){
      setState({
        eyebrow:'Pedido confirmado',
        title:'Obrigado. Seu pedido foi confirmado.',
        message:'Seus resultados personalizados estão sendo preparados e serão enviados para o seu e-mail verificado em até 15 minutos.',
        email:lead.email||'',
        confirmed:true
      });
      trackConfirmedPurchase(data.purchase);
      fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionStorage.getItem('hairlook_session_id')||'dashboard',eventName:'dashboard_view',metadata:{state:'manual_pending',locale:'pt-BR',currency:'BRL',provider:'hotmart'}})}).catch(()=>{});
      return;
    }

    if(['checkout_started','waiting','unpaid'].includes(lead.paymentStatus)){
      setState({eyebrow:'Confirmando pagamento',title:'Aguarde um momento.',message:'Estamos confirmando seu pagamento com a Hotmart. Normalmente isso leva apenas alguns segundos.',email:lead.email||''});
      pollTimer=setTimeout(loadStatus,2500);
      return;
    }

    setState({eyebrow:'Status do pagamento',title:'Estamos verificando seu pedido.',message:'Seu pagamento ainda não foi confirmado. Aguarde um momento.',email:lead.email||''});
    pollTimer=setTimeout(loadStatus,3000);
  }catch(error){
    console.error('order_status_failed',error);
    setState({eyebrow:'Verificando pedido',title:'Ainda estamos confirmando seu pedido.',message:'Houve uma falha temporária de conexão. Tentaremos novamente automaticamente.'});
    pollTimer=setTimeout(loadStatus,4000);
  }
}

loadStatus();
