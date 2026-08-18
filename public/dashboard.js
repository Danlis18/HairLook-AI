const $=q=>document.querySelector(q);
let pollTimer=null;
const locale=document.documentElement.lang.toLowerCase().startsWith('pt')?'pt-BR':'en';
const C={
  en:{noAction:'No additional action is required. We will email you when your results are ready.',support:'If the problem continues, contact support.',noRefresh:'You do not need to refresh this page.',home:'Back to home',expired:'Session expired',cantOpen:'We could not open this order.',expiredMessage:'Contact support using the same email address you entered for the order.',confirmed:'Order confirmed',thanks:'Thank you. Your order is confirmed.',ready:'Your personalized results are being prepared and will be sent to your verified email.',confirming:'Confirming payment',wait:'Please wait a moment.',confirmingMessage:'We are securely confirming your payment. This normally takes only a few seconds.',status:'Payment status',checkingOrder:'We are checking your order.',notYet:'Your payment has not been confirmed yet. Please wait a moment.',checking:'Checking order',still:'We are still confirming your order.',connection:'There was a temporary connection issue. We will try again automatically.'},
  'pt-BR':{noAction:'Nenhuma ação adicional é necessária. Enviaremos um e-mail quando seus resultados estiverem prontos.',support:'Se o problema continuar, entre em contato com o suporte.',noRefresh:'Não é necessário atualizar esta página.',home:'Voltar ao início',expired:'Sessão expirada',cantOpen:'Não foi possível abrir este pedido.',expiredMessage:'Entre em contato com o suporte usando o mesmo e-mail informado no pedido.',confirmed:'Pedido confirmado',thanks:'Obrigado. Seu pedido foi confirmado.',ready:'Seus resultados personalizados estão sendo preparados e serão enviados para o seu e-mail verificado.',confirming:'Confirmando pagamento',wait:'Aguarde um momento.',confirmingMessage:'Estamos confirmando seu pagamento com segurança. Normalmente isso leva apenas alguns segundos.',status:'Status do pagamento',checkingOrder:'Estamos verificando seu pedido.',notYet:'Seu pagamento ainda não foi confirmado. Aguarde um momento.',checking:'Verificando pedido',still:'Ainda estamos confirmando seu pedido.',connection:'Houve uma falha temporária de conexão. Tentaremos novamente automaticamente.'}
}[locale];

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
  $('#orderNote').textContent=confirmed?C.noAction:error?C.support:C.noRefresh;
  const home=$('#homeButton');if(home)home.textContent=C.home;
}

async function loadStatus(){
  clearTimeout(pollTimer);
  try{
    const res=await fetch('/api/dashboard',{cache:'no-store'});
    if(res.status===401){
      setState({eyebrow:C.expired,title:C.cantOpen,message:C.expiredMessage,error:true});
      return;
    }
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'status_failed');

    const lead=data.lead||{};
    if(lead.paymentStatus==='paid'){
      setState({
        eyebrow:C.confirmed,
        title:C.thanks,
        message:C.ready,
        email:lead.email||'',
        confirmed:true
      });
      trackConfirmedPurchase(data.purchase);
      fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionStorage.getItem('hairlook_session_id')||'dashboard',eventName:'dashboard_view',metadata:{state:'manual_pending',locale,provider:'crypto'}})}).catch(()=>{});
      return;
    }

    if(['checkout_started','waiting','unpaid'].includes(lead.paymentStatus)){
      setState({eyebrow:C.confirming,title:C.wait,message:C.confirmingMessage,email:lead.email||''});
      pollTimer=setTimeout(loadStatus,2500);
      return;
    }

    setState({eyebrow:C.status,title:C.checkingOrder,message:C.notYet,email:lead.email||''});
    pollTimer=setTimeout(loadStatus,3000);
  }catch(error){
    console.error('order_status_failed',error);
    setState({eyebrow:C.checking,title:C.still,message:C.connection});
    pollTimer=setTimeout(loadStatus,4000);
  }
}

loadStatus();
