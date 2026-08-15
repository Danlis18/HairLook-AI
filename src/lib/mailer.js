import { config } from '../config.js';
import { log } from './log.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

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

function emailShell({preheader,title,lead,content,ctaLabel='',ctaUrl=''}){
  const brand=escapeHtml(config.productName);
  const support=escapeHtml(config.supportEmail);
  const safeTitle=escapeHtml(title);
  const safeLead=escapeHtml(lead);
  const avatarUrl=`${config.appUrl}/media/hairlook-email-avatar.svg`;
  const cta=ctaLabel&&ctaUrl?`<tr><td style="padding:8px 24px 28px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#18372d;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 22px;border-radius:999px">${escapeHtml(ctaLabel)}</a></td></tr>`:'';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f1ea"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1ea"><tr><td align="center" style="padding:22px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fcfaf6;border:1px solid #e5ded3;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(24,40,32,.08)"><tr><td style="padding:20px 24px 18px;border-bottom:1px solid #e8e1d6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="50" valign="middle"><img src="${escapeHtml(avatarUrl)}" alt="${brand}" width="46" height="46" style="display:block;width:46px;height:46px;border-radius:50%;object-fit:cover"></td><td valign="middle" style="padding-left:12px"><div style="font-family:Arial,sans-serif;font-size:17px;font-weight:800;color:#18211d;line-height:1.05;white-space:nowrap;letter-spacing:-.2px">${brand}</div><div style="font-family:Arial,sans-serif;font-size:10px;color:#7b847f;margin-top:4px;white-space:nowrap">Consultoria personalizada de penteados</div></td></tr></table></td></tr><tr><td style="padding:26px 24px 10px"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:#54705f;margin-bottom:12px">Mensagem segura do cliente</div><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.06;font-weight:400;letter-spacing:-.7px;color:#18211d;margin:0 0 12px">${safeTitle}</h1><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#667069;margin:0">${safeLead}</p></td></tr>${content}${cta}<tr><td style="padding:18px 24px 24px;border-top:1px solid #e8e1d6;font-family:Arial,sans-serif;font-size:11px;line-height:1.55;color:#7a837e"><strong style="color:#435149">${brand}</strong><br>Dúvidas? Entre em contato: <a href="mailto:${support}" style="color:#355b49">${support}</a>.<br><span style="color:#9a9f9c">Mensagem transacional relacionada à sua consultoria ou pedido privado na ${brand}.</span></td></tr></table></td></tr></table></body></html>`;
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

export async function sendMagicLink({to,url,admin=false}){
  const subject=admin?`${config.productName} — acesso administrativo`:`Seu link seguro de acesso — ${config.productName}`;
  const text=admin
    ? `Acesse a área administrativa da ${config.productName}: ${url}\n\nEste link expira em ${config.magicLinkTtlMinutes} minutos e pode ser usado apenas uma vez.`
    : `Abra seu pedido privado na ${config.productName}: ${url}\n\nEste link seguro expira em ${config.magicLinkTtlMinutes} minutos, faz o login automaticamente e pode ser usado apenas uma vez. Se você não solicitou este acesso, ignore esta mensagem.`;
  const html=emailShell({
    preheader:admin?`Acesso administrativo — ${config.productName}`:`Seu acesso seguro à ${config.productName}`,
    title:admin?'Acesso administrativo':'Abra seu pedido privado',
    lead:admin
      ? `Use o botão abaixo para entrar com segurança na área administrativa da ${config.productName}.`
      : `Seu acesso seguro à ${config.productName} está pronto. Use o botão abaixo para entrar automaticamente — sem senha e sem precisar digitar o e-mail novamente.`,
    content:`<tr><td style="padding:10px 24px 20px"><div style="background:#f3efe6;border:1px solid #e4dccf;border-radius:18px;padding:16px 18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#536159"><strong style="color:#26342e">Por que recebi este e-mail?</strong><br>${admin?'Foi solicitado um acesso administrativo seguro.':`Você solicitou um link seguro para acessar seu pedido privado na ${escapeHtml(config.productName)}.`} O link expira em ${config.magicLinkTtlMinutes} minutos e funciona apenas uma vez. Se não foi você, ignore esta mensagem.</div></td></tr>`,
    ctaLabel:admin?'Entrar no painel':'Abrir meu pedido privado',
    ctaUrl:url
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'magic_link'});
  return result.skipped?{devUrl:url}:{};
}

export async function sendVerificationCode({to,code}){
  const subject=`${code} — seu código de verificação da ${config.productName}`;
  const text=`Seu código de verificação da ${config.productName} é ${code}. Ele expira em ${config.emailVerificationTtlMinutes} minutos. Se você não solicitou este código, ignore esta mensagem.`;
  const html=emailShell({
    preheader:`${code} é seu código de verificação da ${config.productName}`,
    title:'Confirme seu e-mail',
    lead:`Digite este código de 6 dígitos na tela de verificação da ${config.productName} para continuar com segurança para o seu pedido.`,
    content:`<tr><td style="padding:10px 24px 28px"><div style="background:#18372d;border-radius:18px;padding:20px 16px;text-align:center"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#cbd9d1;margin-bottom:9px">Código de verificação</div><div style="font-family:Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:7px;color:#ffffff">${escapeHtml(code)}</div></div><p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.55;color:#7a837e;margin:12px 2px 0">Este código expira em ${config.emailVerificationTtlMinutes} minutos. Nunca compartilhe este código com o suporte ou com outras pessoas.</p></td></tr>`
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'verification_code'});
  return result.skipped?{devCode:code}:{};
}

export async function sendResultsReady({to}){
  if(config.manualFulfillmentMode){
    log.info('results_email_skipped_manual_fulfillment',{to});
    return {skipped:true};
  }
  const subject=`Seus resultados da ${config.productName} estão prontos`;
  const text=`Sua coleção personalizada de penteados está pronta. Acesse sua área privada: ${config.appUrl}/dashboard`;
  const html=emailShell({
    preheader:'Sua coleção personalizada de penteados está pronta',
    title:'Seus resultados estão prontos',
    lead:`Sua coleção privada de penteados na ${config.productName} está pronta para visualizar.`,
    content:'',
    ctaLabel:'Abrir meus resultados privados',
    ctaUrl:`${config.appUrl}/dashboard`
  });
  return sendMailSafe({to,subject,text,html,reason:'results_ready'});
}
