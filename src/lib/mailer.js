import { config } from '../config.js';
import { log } from './log.js';
import { normalizeLocale } from './locale.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

const EMAIL_COPY = {
  en: {
    tagline:'Personalized hairstyle service', secureLabel:'Secure customer message', questions:'Questions? Contact us:', transaction:'Transactional message related to your private consultation or order with',
    verificationSubject:code=>`${code} — your ${config.productName} verification code`, verificationPreheader:code=>`${code} is your ${config.productName} verification code`, verificationTitle:'Confirm your email', verificationLead:`Enter this 6-digit code on the ${config.productName} verification screen to continue securely to your order.`, verificationLabel:'Verification code', verificationExpiry:`This code expires in ${config.emailVerificationTtlMinutes} minutes. Never share it with support or anyone else.`, verificationText:code=>`Your ${config.productName} verification code is ${code}. It expires in ${config.emailVerificationTtlMinutes} minutes. If you did not request this code, ignore this email.`,
    magicSubject:`Your secure access link — ${config.productName}`, magicPreheader:`Secure access to ${config.productName}`, magicTitle:'Open your private order', magicLead:`Your secure ${config.productName} access is ready. Use the button below to sign in automatically — no password or repeated email entry required.`, why:'Why did I receive this email?', magicWhy:`You requested a secure link to access your private order with ${config.productName}.`, magicExpiry:`The link expires in ${config.magicLinkTtlMinutes} minutes and works only once. If this was not you, ignore this email.`, magicCta:'Open my private order', magicText:url=>`Open your private ${config.productName} order: ${url}\n\nThis secure link expires in ${config.magicLinkTtlMinutes} minutes, signs you in automatically, and can be used only once. If you did not request it, ignore this email.`,
    resultsSubject:`Your ${config.productName} results are ready`, resultsPreheader:'Your personalized hairstyle collection is ready', resultsTitle:'Your results are ready', resultsLead:`Your private hairstyle collection from ${config.productName} is ready to view.`, resultsText:`Your personalized hairstyle collection is ready. Open your private area: ${config.appUrl}/dashboard`, resultsCta:'Open my private results'
  },
  'pt-BR': {
    tagline:'Consultoria personalizada de penteados', secureLabel:'Mensagem segura do cliente', questions:'Dúvidas? Entre em contato:', transaction:'Mensagem transacional relacionada à sua consultoria ou pedido privado na',
    verificationSubject:code=>`${code} — seu código de verificação da ${config.productName}`, verificationPreheader:code=>`${code} é seu código de verificação da ${config.productName}`, verificationTitle:'Confirme seu e-mail', verificationLead:`Digite este código de 6 dígitos na tela de verificação da ${config.productName} para continuar com segurança para o seu pedido.`, verificationLabel:'Código de verificação', verificationExpiry:`Este código expira em ${config.emailVerificationTtlMinutes} minutos. Nunca compartilhe este código com o suporte ou com outras pessoas.`, verificationText:code=>`Seu código de verificação da ${config.productName} é ${code}. Ele expira em ${config.emailVerificationTtlMinutes} minutos. Se você não solicitou este código, ignore esta mensagem.`,
    magicSubject:`Seu link seguro de acesso — ${config.productName}`, magicPreheader:`Seu acesso seguro à ${config.productName}`, magicTitle:'Abra seu pedido privado', magicLead:`Seu acesso seguro à ${config.productName} está pronto. Use o botão abaixo para entrar automaticamente — sem senha e sem precisar digitar o e-mail novamente.`, why:'Por que recebi este e-mail?', magicWhy:`Você solicitou um link seguro para acessar seu pedido privado na ${config.productName}.`, magicExpiry:`O link expira em ${config.magicLinkTtlMinutes} minutos e funciona apenas uma vez. Se não foi você, ignore esta mensagem.`, magicCta:'Abrir meu pedido privado', magicText:url=>`Abra seu pedido privado na ${config.productName}: ${url}\n\nEste link seguro expira em ${config.magicLinkTtlMinutes} minutos, faz o login automaticamente e pode ser usado apenas uma vez. Se você não solicitou este acesso, ignore esta mensagem.`,
    resultsSubject:`Seus resultados da ${config.productName} estão prontos`, resultsPreheader:'Sua coleção personalizada de penteados está pronta', resultsTitle:'Seus resultados estão prontos', resultsLead:`Sua coleção privada de penteados na ${config.productName} está pronta para visualizar.`, resultsText:`Sua coleção personalizada de penteados está pronta. Acesse sua área privada: ${config.appUrl}/dashboard`, resultsCta:'Abrir meus resultados privados'
  }
};

function emailCopy(locale) {
  const normalized = normalizeLocale(locale, 'en');
  return { locale:normalized, copy:EMAIL_COPY[normalized] || EMAIL_COPY.en };
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function normalizedFrom(){
  const raw=String(config.emailFrom||'').trim().replace(/^EMAIL_FROM\s*=\s*/i,'');
  const bracket=raw.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
  const plain=raw.match(/([^\s<>]+@[^\s<>]+)/);
  const address=(bracket?.[1]||plain?.[1]||'').trim();
  return address?`${config.productName} <${address}>`:raw;
}

function emailShell({locale='en',preheader,title,lead,content,ctaLabel='',ctaUrl=''}){
  const {locale:normalized,copy}=emailCopy(locale);
  const brand=escapeHtml(config.productName);
  const support=escapeHtml(config.supportEmail);
  const safeTitle=escapeHtml(title);
  const safeLead=escapeHtml(lead);
  const avatarUrl=`${config.appUrl}/media/hairlook-email-avatar.svg`;
  const cta=ctaLabel&&ctaUrl?`<tr><td style="padding:8px 24px 28px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#18372d;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 22px;border-radius:999px">${escapeHtml(ctaLabel)}</a></td></tr>`:'';
  return `<!doctype html><html lang="${normalized}"><body style="margin:0;padding:0;background:#f4f1ea"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1ea"><tr><td align="center" style="padding:22px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fcfaf6;border:1px solid #e5ded3;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(24,40,32,.08)"><tr><td style="padding:20px 24px 18px;border-bottom:1px solid #e8e1d6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="50" valign="middle"><img src="${escapeHtml(avatarUrl)}" alt="${brand}" width="46" height="46" style="display:block;width:46px;height:46px;border-radius:50%;object-fit:cover"></td><td valign="middle" style="padding-left:12px"><div style="font-family:Arial,sans-serif;font-size:17px;font-weight:800;color:#18211d;line-height:1.05;white-space:nowrap;letter-spacing:-.2px">${brand}</div><div style="font-family:Arial,sans-serif;font-size:10px;color:#7b847f;margin-top:4px;white-space:nowrap">${escapeHtml(copy.tagline)}</div></td></tr></table></td></tr><tr><td style="padding:26px 24px 10px"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:#54705f;margin-bottom:12px">${escapeHtml(copy.secureLabel)}</div><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.06;font-weight:400;letter-spacing:-.7px;color:#18211d;margin:0 0 12px">${safeTitle}</h1><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#667069;margin:0">${safeLead}</p></td></tr>${content}${cta}<tr><td style="padding:18px 24px 24px;border-top:1px solid #e8e1d6;font-family:Arial,sans-serif;font-size:11px;line-height:1.55;color:#7a837e"><strong style="color:#435149">${brand}</strong><br>${escapeHtml(copy.questions)} <a href="mailto:${support}" style="color:#355b49">${support}</a>.<br><span style="color:#9a9f9c">${escapeHtml(copy.transaction)} ${brand}.</span></td></tr></table></td></tr></table></body></html>`;
}

async function sendMailSafe({to,subject,text,html,reason}){
  if(!config.resendApiKey){
    log.info('email_skipped_resend_not_configured',{to,reason});
    return {skipped:true};
  }
  try{
    const response=await fetch(RESEND_API_URL,{
      method:'POST',
      headers:{'Authorization':`Bearer ${config.resendApiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:normalizedFrom(),to:[to],subject,text,html,reply_to:config.supportEmail}),
      signal:AbortSignal.timeout(15_000)
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok){
      log.error('email_send_failed',{to,reason,provider:'resend',status:response.status,providerError:body?.name||body?.error||null,providerMessage:body?.message||null});
      const wrapped=new Error('email_send_failed'); wrapped.status=502; wrapped.code='EMAIL_SEND_FAILED'; throw wrapped;
    }
    log.info('email_sent',{to,reason,provider:'resend',messageId:body?.id||null});
    return {sent:true,id:body?.id||null};
  }catch(error){
    if(error?.code==='EMAIL_SEND_FAILED')throw error;
    log.error('email_send_failed',{to,reason,provider:'resend',code:error?.code||error?.name||null,message:error?.message||'Resend API request failed'});
    const wrapped=new Error('email_send_failed'); wrapped.status=502; wrapped.code='EMAIL_SEND_FAILED'; throw wrapped;
  }
}

export async function sendMagicLink({to,url,admin=false,locale=admin?'pt-BR':'en'}){
  const {copy}=emailCopy(locale);
  const subject=admin?`${config.productName} — acesso administrativo`:copy.magicSubject;
  const text=admin
    ? `Acesse a área administrativa da ${config.productName}: ${url}\n\nEste link expira em ${config.magicLinkTtlMinutes} minutos e pode ser usado apenas uma vez.`
    : copy.magicText(url);
  const html=emailShell({
    locale,
    preheader:admin?`Acesso administrativo — ${config.productName}`:copy.magicPreheader,
    title:admin?'Acesso administrativo':copy.magicTitle,
    lead:admin
      ? `Use o botão abaixo para entrar com segurança na área administrativa da ${config.productName}.`
      : copy.magicLead,
    content:`<tr><td style="padding:10px 24px 20px"><div style="background:#f3efe6;border:1px solid #e4dccf;border-radius:18px;padding:16px 18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#536159"><strong style="color:#26342e">${escapeHtml(admin?'Por que recebi este e-mail?':copy.why)}</strong><br>${admin?'Foi solicitado um acesso administrativo seguro.':escapeHtml(copy.magicWhy)} ${escapeHtml(admin?`O link expira em ${config.magicLinkTtlMinutes} minutos e funciona apenas uma vez.`:copy.magicExpiry)}</div></td></tr>`,
    ctaLabel:admin?'Entrar no painel':copy.magicCta,
    ctaUrl:url
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'magic_link'});
  return result.skipped?{devUrl:url}:{};
}

export async function sendVerificationCode({to,code,locale='en'}){
  const {copy}=emailCopy(locale);
  const subject=copy.verificationSubject(code);
  const text=copy.verificationText(code);
  const html=emailShell({
    locale,
    preheader:copy.verificationPreheader(code),
    title:copy.verificationTitle,
    lead:copy.verificationLead,
    content:`<tr><td style="padding:10px 24px 28px"><div style="background:#18372d;border-radius:18px;padding:20px 16px;text-align:center"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#cbd9d1;margin-bottom:9px">${escapeHtml(copy.verificationLabel)}</div><div style="font-family:Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:7px;color:#ffffff">${escapeHtml(code)}</div></div><p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.55;color:#7a837e;margin:12px 2px 0">${escapeHtml(copy.verificationExpiry)}</p></td></tr>`
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'verification_code'});
  return result.skipped?{devCode:code}:{};
}

export async function sendResultsReady({to,locale='en',url=`${config.appUrl}/signin?next=dashboard`,pdfUrl='',force=false,demo=false,reviewerAi=false}){
  if(config.manualFulfillmentMode&&!force){
    log.info('results_email_skipped_manual_fulfillment',{to});
    return {skipped:true};
  }
  const {copy}=emailCopy(locale);
  const subject=demo?`[DEMO] ${copy.resultsSubject}`:copy.resultsSubject;
  const resultText=locale==='pt-BR'?`Sua coleção personalizada de penteados está pronta. Acesse com segurança: ${url}`:`Your personalized hairstyle collection is ready. Open it securely: ${url}`;
  const demoText=reviewerAi
    ? (locale==='pt-BR'?'Demonstração sem cobrança: suas 10 prévias reais de penteados foram geradas por IA usando a foto enviada.':'No-charge demo: your 10 real hairstyle previews were generated by AI from the photo you uploaded.')
    : (locale==='pt-BR'?'Nota de demonstração: estas prévias validam o fluxo de entrega; o modelo externo de IA ainda não está conectado.':'Demo note: these previews validate the delivery pipeline; the external AI model is not connected yet.');
  const pdfLabel=locale==='pt-BR'?'Baixar a coleção completa em PDF':'Download the complete PDF collection';
  const pdfText=pdfUrl?(locale==='pt-BR'?`Baixe seu relatório em PDF: ${pdfUrl}`:`Download your PDF report: ${pdfUrl}`):'';
  const text=`${demo?`${resultText}\n\n${demoText}`:resultText}${pdfText?`\n\n${pdfText}`:''}`;
  const pdfContent=pdfUrl?`<tr><td style="padding:4px 24px 22px"><div style="background:#edf3ee;border:1px solid #d4e1d7;border-radius:16px;padding:16px 18px"><div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.55;color:#536159;margin-bottom:12px">${escapeHtml(locale==='pt-BR'?'Também preparamos um relatório organizado com todos os cortes, pronto para salvar ou mostrar ao cabeleireiro.':'We also prepared an organized report with every haircut, ready to save or show to your professional stylist.')}</div><a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#ffffff;color:#18372d;border:1px solid #b9cbbf;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px">${escapeHtml(pdfLabel)}</a></div></td></tr>`:'';
  const html=emailShell({
    locale,
    preheader:copy.resultsPreheader,
    title:copy.resultsTitle,
    lead:demo?`${copy.resultsLead} ${reviewerAi?(locale==='pt-BR'?'As 10 imagens foram geradas pela IA usando sua foto real.':'All 10 images were generated by AI from your real uploaded photo.'):(locale==='pt-BR'?'Estas prévias demonstram o fluxo; o modelo externo de IA ainda não está conectado.':'These previews demonstrate the workflow; the external AI model is not connected yet.')}`:copy.resultsLead,
    content:`${demo?`<tr><td style="padding:8px 24px 20px"><div style="background:#fff4d8;border:1px solid #ead9a5;border-radius:14px;padding:12px 14px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b5722">${escapeHtml(reviewerAi?(locale==='pt-BR'?'Demonstração protegida: nenhuma cobrança foi realizada e as imagens foram geradas por IA.':'Protected demo: no charge was made and the images were generated by AI.'):(locale==='pt-BR'?'Modo de demonstração: nenhuma cobrança foi realizada e as imagens são prévias locais da automação.':'Demo mode: no charge was made and the images are local automation previews.'))}</div></td></tr>`:''}${pdfContent}`,
    ctaLabel:copy.resultsCta,
    ctaUrl:url
  });
  return sendMailSafe({to,subject,text,html,reason:'results_ready'});
}
