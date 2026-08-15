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
  const cta=ctaLabel&&ctaUrl?`<tr><td style="padding:8px 34px 32px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#18372d;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:15px 24px;border-radius:999px">${escapeHtml(ctaLabel)}</a></td></tr>`:'';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ea"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1ea"><tr><td align="center" style="padding:34px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fcfaf6;border:1px solid #e5ded3;border-radius:26px;overflow:hidden;box-shadow:0 20px 60px rgba(24,40,32,.08)"><tr><td style="padding:26px 34px 22px;border-bottom:1px solid #e8e1d6"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="50"><img src="${escapeHtml(avatarUrl)}" alt="HairLook AI" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:50%"></td><td style="padding-left:12px"><div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#18211d;line-height:1.1">${brand}</div><div style="font-family:Arial,sans-serif;font-size:11px;color:#7b847f;margin-top:4px">Private hairstyle consultation</div></td></tr></table></td></tr><tr><td style="padding:34px 34px 12px"><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#54705f;margin-bottom:14px">Secure customer message</div><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.05;font-weight:400;letter-spacing:-1px;color:#18211d;margin:0 0 14px">${safeTitle}</h1><p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#667069;margin:0">${safeLead}</p></td></tr>${content}${cta}<tr><td style="padding:22px 34px 30px;border-top:1px solid #e8e1d6;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#7a837e"><strong style="color:#435149">${brand}</strong><br>Questions? Contact <a href="mailto:${support}" style="color:#355b49">${support}</a>.<br><span style="color:#9a9f9c">Transactional message related to your HairLook AI consultation or private order.</span></td></tr></table></td></tr></table></body></html>`;
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
  const subject=admin?`${config.productName} admin sign-in`:`Your secure ${config.productName} sign-in link`;
  const text=`Open your secure ${config.productName} access link: ${url}\n\nThis one-time link expires in ${config.magicLinkTtlMinutes} minutes. It signs you in automatically and can only be used once. If you did not request it, you can ignore this email.`;
  const html=emailShell({
    preheader:`Your secure ${config.productName} access link`,
    title:admin?'Admin sign-in':'Open your private order',
    lead:`Your secure HairLook AI access is ready. Use the button below to sign in automatically — no password or second email entry is required.`,
    content:`<tr><td style="padding:10px 34px 22px"><div style="background:#f3efe6;border:1px solid #e4dccf;border-radius:18px;padding:18px 20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#536159"><strong style="color:#26342e">Why did I receive this?</strong><br>You requested a secure sign-in link for your HairLook AI private order. The link expires in ${config.magicLinkTtlMinutes} minutes and works once. If this wasn't you, simply ignore this message.</div></td></tr>`,
    ctaLabel:admin?'Sign in to admin':'Open my private order',
    ctaUrl:url
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'magic_link'});
  return result.skipped?{devUrl:url}:{};
}

export async function sendVerificationCode({to,code}){
  const subject=`${code} — your ${config.productName} verification code`;
  const text=`Your ${config.productName} verification code is ${code}. It expires in ${config.emailVerificationTtlMinutes} minutes. If you did not request this, you can ignore this email.`;
  const html=emailShell({
    preheader:`${code} is your ${config.productName} verification code`,
    title:'Confirm your email',
    lead:'Enter this 6-digit code on the HairLook AI verification screen to continue securely to your order.',
    content:`<tr><td style="padding:12px 34px 32px"><div style="background:#18372d;border-radius:20px;padding:24px 20px;text-align:center"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cbd9d1;margin-bottom:10px">Verification code</div><div style="font-family:Arial,sans-serif;font-size:38px;font-weight:800;letter-spacing:9px;color:#ffffff">${escapeHtml(code)}</div></div><p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#7a837e;margin:14px 2px 0">This code expires in ${config.emailVerificationTtlMinutes} minutes. Never share it with support or anyone else.</p></td></tr>`
  });
  const result=await sendMailSafe({to,subject,text,html,reason:'verification_code'});
  return result.skipped?{devCode:code}:{};
}

export async function sendResultsReady({to}){
  if(config.manualFulfillmentMode){
    log.info('results_email_skipped_manual_fulfillment',{to});
    return {skipped:true};
  }
  const subject=`Your ${config.productName} hairstyle collection is ready`;
  const text=`Your personalized hairstyle collection is ready. Open your private account: ${config.appUrl}/dashboard`;
  const html=emailShell({
    preheader:'Your personalized hairstyle collection is ready',
    title:'Your hairstyle results are ready',
    lead:'Your private HairLook AI hairstyle collection is ready to view.',
    content:'',
    ctaLabel:'Open my private results',
    ctaUrl:`${config.appUrl}/dashboard`
  });
  return sendMailSafe({to,subject,text,html,reason:'results_ready'});
}
