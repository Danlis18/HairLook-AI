import { config } from '../config.js';
import { log } from './log.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendMailSafe({to,subject,text,html,reason}){
  if(!config.resendApiKey){
    log.info('email_skipped_resend_not_configured',{to,reason});
    return {skipped:true};
  }

  try{
    const response=await fetch(RESEND_API_URL,{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${config.resendApiKey}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        from:config.emailFrom,
        to:[to],
        subject,
        text,
        html
      }),
      signal:AbortSignal.timeout(15_000)
    });

    const body=await response.json().catch(()=>({}));
    if(!response.ok){
      log.error('email_send_failed',{
        to,
        reason,
        provider:'resend',
        status:response.status,
        providerError:body?.name||body?.error||null,
        providerMessage:body?.message||null
      });
      const wrapped=new Error('email_send_failed');
      wrapped.status=502;
      wrapped.code='EMAIL_SEND_FAILED';
      throw wrapped;
    }

    log.info('email_sent',{to,reason,provider:'resend',messageId:body?.id||null});
    return {sent:true,id:body?.id||null};
  }catch(error){
    if(error?.code==='EMAIL_SEND_FAILED')throw error;
    log.error('email_send_failed',{
      to,
      reason,
      provider:'resend',
      code:error?.code||error?.name||null,
      message:error?.message||'Resend API request failed'
    });
    const wrapped=new Error('email_send_failed');
    wrapped.status=502;
    wrapped.code='EMAIL_SEND_FAILED';
    throw wrapped;
  }
}

export async function sendMagicLink({to,url,admin=false}){
  const subject=admin?`${config.productName} admin sign-in`:`Your ${config.productName} sign-in link`;
  const text=`Use this secure one-time link to sign in:\n\n${url}\n\nThis link expires in ${config.magicLinkTtlMinutes} minutes.`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17231d"><h2 style="font-family:Georgia,serif">${admin?'Admin sign-in':'Your private results'}</h2><p>This one-time link expires in ${config.magicLinkTtlMinutes} minutes.</p><p><a href="${url}" style="display:inline-block;background:#18372d;color:white;text-decoration:none;padding:14px 20px;border-radius:999px">Sign in securely</a></p><p style="font-size:13px;color:#68716b">If you did not request this, you can ignore this email.</p></div>`;
  const result=await sendMailSafe({to,subject,text,html,reason:'magic_link'});
  return result.skipped?{devUrl:url}:{};
}

export async function sendVerificationCode({to,code}){
  const subject=`Your ${config.productName} verification code`;
  const text=`Your ${config.productName} verification code is ${code}. It expires in ${config.emailVerificationTtlMinutes} minutes. If you did not request this, you can ignore this email.`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17231d"><div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#5d6b64;margin-bottom:14px">${config.productName}</div><h2 style="font-family:Georgia,serif;font-size:30px;font-weight:500;margin:0 0 12px">Confirm your email</h2><p style="font-size:16px;line-height:1.55">Enter this code to confirm your email address:</p><div style="font-size:36px;font-weight:700;letter-spacing:8px;margin:24px 0;padding:18px 22px;border-radius:14px;background:#f5f1e9;color:#173d32;text-align:center">${code}</div><p style="font-size:13px;color:#68716b;line-height:1.5">This code expires in ${config.emailVerificationTtlMinutes} minutes. If you did not request this, you can ignore this email.</p></div>`;
  const result=await sendMailSafe({to,subject,text,html,reason:'verification_code'});
  return result.skipped?{devCode:code}:{};
}

export async function sendResultsReady({to}){
  if(config.manualFulfillmentMode){
    log.info('results_email_skipped_manual_fulfillment',{to});
    return {skipped:true};
  }
  const subject=`Your ${config.productName} collection is ready`;
  const text=`Your personalized hairstyle collection is ready. Sign in at ${config.appUrl}/dashboard`;
  const html=`<p>Your personalized hairstyle collection is ready.</p><p><a href="${config.appUrl}/dashboard">Open your private dashboard</a></p>`;
  return sendMailSafe({to,subject,text,html,reason:'results_ready'});
}
