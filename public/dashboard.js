const $=q=>document.querySelector(q);
let pollTimer=null;
let dashboardTracked=false;
const locale=document.documentElement.lang.toLowerCase().startsWith('pt')?'pt-BR':'en';
const C={
  en:{noAction:'No additional action is required. We will email you when your results are ready.',support:'If the problem continues, contact support.',noRefresh:'You do not need to refresh this page.',home:'Back to home',expired:'Session expired',cantOpen:'We could not open this order.',expiredMessage:'Contact support using the same email address you entered for the order.',confirmed:'Order confirmed',thanks:'Thank you. Your order is confirmed.',ready:'Your personalized results are being prepared and will be sent to your verified email.',confirming:'Confirming payment',wait:'Please wait a moment.',confirmingMessage:'We are securely confirming your payment. This normally takes only a few seconds.',status:'Payment status',checkingOrder:'We are checking your order.',notYet:'Your payment has not been confirmed yet. Please wait a moment.',checking:'Checking order',still:'We are still confirming your order.',connection:'There was a temporary connection issue. We will try again automatically.',demo:'Reviewer demo · no charge',demoWorking:n=>`Generating preview ${n} of 10`,demoWorkingMessage:'This local preview run validates upload, queue, storage and email delivery without the external AI API.',aiWorkingMessage:'AI is creating 10 personalized haircut previews from your uploaded photo. You can safely close this page.',demoReady:'All 10 demo previews are ready',aiReady:'Your 10 AI haircut previews are ready',demoReadyMessage:'The complete no-charge reviewer workflow finished successfully. Secure result and PDF links were sent to your verified email.',aiReadyMessage:'All 10 structurally different AI haircut previews are complete. Secure result and PDF links were sent to your verified email.',demoNote:'Demo previews are clearly labeled and are not final AI hairstyle edits.',aiNote:'These AI previews change the haircut while preserving the original identity and hair color. No payment was charged.',partial:'Some previews need attention',partialMessage:'The completed previews are available below. Please contact support so the remaining images can be retried.',download:'Download',downloadPdf:'Download complete PDF',pdfHint:'All available haircut previews in one organized report.'},
  'pt-BR':{noAction:'Nenhuma ação adicional é necessária. Enviaremos um e-mail quando seus resultados estiverem prontos.',support:'Se o problema continuar, entre em contato com o suporte.',noRefresh:'Não é necessário atualizar esta página.',home:'Voltar ao início',expired:'Sessão expirada',cantOpen:'Não foi possível abrir este pedido.',expiredMessage:'Entre em contato com o suporte usando o mesmo e-mail informado no pedido.',confirmed:'Pedido confirmado',thanks:'Obrigado. Seu pedido foi confirmado.',ready:'Seus resultados personalizados estão sendo preparados e serão enviados para o seu e-mail verificado.',confirming:'Confirmando pagamento',wait:'Aguarde um momento.',confirmingMessage:'Estamos confirmando seu pagamento com segurança. Normalmente isso leva apenas alguns segundos.',status:'Status do pagamento',checkingOrder:'Estamos verificando seu pedido.',notYet:'Seu pagamento ainda não foi confirmado. Aguarde um momento.',checking:'Verificando pedido',still:'Ainda estamos confirmando seu pedido.',connection:'Houve uma falha temporária de conexão. Tentaremos novamente automaticamente.',demo:'Demo para revisão · sem cobrança',demoWorking:n=>`Gerando prévia ${n} de 10`,demoWorkingMessage:'Esta execução local valida envio, fila, armazenamento e entrega por e-mail sem a API externa de IA.',aiWorkingMessage:'A IA está criando 10 prévias personalizadas de cortes usando a foto enviada. Você pode fechar esta página com segurança.',demoReady:'As 10 prévias de demonstração estão prontas',aiReady:'Suas 10 prévias de cortes com IA estão prontas',demoReadyMessage:'O fluxo completo e sem cobrança foi concluído. Links seguros para os resultados e o PDF foram enviados ao e-mail verificado.',aiReadyMessage:'As 10 prévias de cortes estruturalmente diferentes foram concluídas. Links seguros para os resultados e o PDF foram enviados ao e-mail verificado.',demoNote:'As prévias estão identificadas como demo e não são edições finais de penteado por IA.',aiNote:'Estas prévias alteram o corte, preservando a identidade e a cor original do cabelo. Nenhum pagamento foi cobrado.',partial:'Algumas prévias precisam de atenção',partialMessage:'As prévias concluídas estão disponíveis abaixo. Entre em contato com o suporte para repetir as imagens restantes.',download:'Baixar',downloadPdf:'Baixar PDF completo',pdfHint:'Todas as prévias disponíveis em um único relatório organizado.'}
}[locale];

const PT_STYLE_NAMES={
  'Classic Textured Pixie':'Pixie Clássico Texturizado','Soft Bixie Cut':'Corte Bixie Suave','Chin-Length French Bob':'Bob Francês na Altura do Queixo','Sleek Angled Bob':'Bob Angulado Elegante','Blunt Collarbone Lob':'Lob Reto na Altura da Clavícula','Shoulder-Length Shag':'Shag na Altura dos Ombros','Curly Layered Midi':'Midi Cacheado em Camadas','Long Butterfly Layers':'Camadas Borboleta Longas','Long U-Shaped Layers':'Camadas Longas em Formato U','Modern Soft Wolf Cut':'Wolf Cut Moderno e Suave'
};
const resultName=result=>locale==='pt-BR'?(PT_STYLE_NAMES[result.style_name]||result.style_name||'Prévia'):(result.style_name||'Preview');
const safeText=value=>String(value||'').replace(/[&<>\"]/g,'');

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

function renderResults(results=[],reviewerAiEnabled=false,pdfReady=false){
  const root=$('#orderResults');
  if(!results.length){root.hidden=true;root.innerHTML='';return;}
  root.hidden=false;
  const pdf=pdfReady?`<div style="margin:0 0 18px;padding:14px 16px;border:1px solid #d4e1d7;border-radius:16px;background:#edf3ee;text-align:center"><a class="btn btn-primary" href="/api/results/collection.pdf" style="display:inline-flex">${C.downloadPdf}</a><p class="muted" style="font-size:10px;margin:8px 0 0">${C.pdfHint}</p></div>`:'';
  root.innerHTML=`<p class="muted" style="font-size:11px;text-align:center;margin:0 0 12px">${reviewerAiEnabled?C.aiNote:C.demoNote}</p>${pdf}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px">${results.map(r=>`<article style="background:#f7f3eb;border:1px solid rgba(24,55,45,.1);border-radius:14px;padding:7px"><img src="${r.url}" alt="${safeText(resultName(r))}" style="display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px"><strong style="display:block;font-size:10px;margin:7px 2px 5px">${safeText(resultName(r))}</strong><a href="/api/results/${encodeURIComponent(r.id)}/download" style="font-size:10px;color:#24513e">${C.download}</a></article>`).join('')}</div>`;
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
      const reviewerDemo=lead.accessMode==='reviewer_demo';
      if(reviewerDemo){
        const results=data.results||[],reviewerAiEnabled=data.reviewerAiEnabled===true,terminal=['completed','partial','failed'].includes(lead.generationStatus),complete=terminal&&results.length>=data.targetCount,partial=terminal&&!complete;
        renderResults(results,reviewerAiEnabled,terminal);
        setState({eyebrow:C.demo,title:partial?C.partial:complete?(reviewerAiEnabled?C.aiReady:C.demoReady):C.demoWorking(Math.min(data.targetCount,results.length+1)),message:partial?C.partialMessage:complete?(reviewerAiEnabled?C.aiReadyMessage:C.demoReadyMessage):(reviewerAiEnabled?C.aiWorkingMessage:C.demoWorkingMessage),email:lead.email||'',confirmed:complete||partial});
        $('#orderNote').textContent=partial?C.support:complete?(reviewerAiEnabled?C.aiNote:C.demoNote):C.noRefresh;
        if(!dashboardTracked){dashboardTracked=true;fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionStorage.getItem('hairlook_session_id')||'dashboard',eventName:'reviewer_dashboard_view',metadata:{state:'reviewer_demo',locale,provider:'reviewer_demo'}})}).catch(()=>{});}
        if(!terminal)pollTimer=setTimeout(loadStatus,1500);
        return;
      }
      setState({
        eyebrow:C.confirmed,
        title:C.thanks,
        message:C.ready,
        email:lead.email||'',
        confirmed:true
      });
      trackConfirmedPurchase(data.purchase);
      if(!dashboardTracked){dashboardTracked=true;fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionStorage.getItem('hairlook_session_id')||'dashboard',eventName:'dashboard_view',metadata:{state:'manual_pending',locale,provider:'crypto'}})}).catch(()=>{});}
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
