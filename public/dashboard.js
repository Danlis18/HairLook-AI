const $=q=>document.querySelector(q);
let pollTimer=null;

function setState({eyebrow,title,message,email='',confirmed=false,error=false}){
  $('#orderEyebrow').textContent=eyebrow;
  $('#orderTitle').textContent=title;
  $('#orderMessage').textContent=message;
  const emailEl=$('#orderEmail');
  if(email){emailEl.textContent=email;emailEl.hidden=false;}else emailEl.hidden=true;
  $('#orderSpinner').style.display=confirmed||error?'none':'block';
  $('#homeButton').hidden=!confirmed;
  $('#orderNote').textContent=confirmed?'No further action is needed. We’ll email you when your results are ready.':error?'If this continues, contact support.':'You do not need to refresh this page.';
}

async function loadStatus(){
  clearTimeout(pollTimer);
  try{
    const res=await fetch('/api/dashboard',{cache:'no-store'});
    if(res.status===401){
      setState({eyebrow:'Session expired',title:'We could not open this order.',message:'Please contact support using the same email address you used for your consultation.',error:true});
      return;
    }
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'status_failed');

    const lead=data.lead||{};
    if(lead.paymentStatus==='paid'){
      setState({
        eyebrow:'Order confirmed',
        title:'Thank you. Your order is confirmed.',
        message:'Your personalized hairstyle results are now being prepared and will be sent to your verified email within 72 hours.',
        email:lead.email||'',
        confirmed:true
      });
      fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionStorage.getItem('hairlook_session_id')||'dashboard',eventName:'dashboard_view',metadata:{state:'manual_pending'}})}).catch(()=>{});
      return;
    }

    if(['checkout_started','waiting','unpaid'].includes(lead.paymentStatus)){
      setState({eyebrow:'Confirming payment',title:'Please wait a moment.',message:'We’re securely confirming your payment. This usually takes only a few seconds.',email:lead.email||''});
      pollTimer=setTimeout(loadStatus,2500);
      return;
    }

    setState({eyebrow:'Payment status',title:'We’re checking your order.',message:'Your payment has not been confirmed yet. Please wait a moment.',email:lead.email||''});
    pollTimer=setTimeout(loadStatus,3000);
  }catch(error){
    console.error('order_status_failed',error);
    setState({eyebrow:'Checking order',title:'We’re still confirming your order.',message:'There was a temporary connection issue. We’ll try again automatically.'});
    pollTimer=setTimeout(loadStatus,4000);
  }
}

loadStatus();
