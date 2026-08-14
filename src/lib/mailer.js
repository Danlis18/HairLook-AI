import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { log } from './log.js';

let transporter;

function getTransporter(){
  if(transporter)return transporter;
  if(!config.smtpHost)return null;
  transporter=nodemailer.createTransport({
    host:config.smtpHost,
    port:config.smtpPort,
    secure:config.smtpSecure,
    auth:config.smtpUser?{user:config.smtpUser,pass:config.smtpPass}:undefined,
    connectionTimeout:10_000,
    greetingTimeout:10_000,
    socketTimeout:15_000
  });
  return transporter;
}

async function sendMailSafe({to,subject,text,html,reason}){
  const t=getTransporter();
  if(!t){
    log.info('email_skipped_smtp_not_configured',{to,reason});
    return {skipped:true};
  }
  try{
    const info=await t.sendMail({from:config.emailFrom,to,subject,text,html});
    log.info('email_sent',{to,reason,messageId:info?.messageId||null});
    return {sent:true};
  }catch(error){
    log.error('email_send_failed',{
      to,
      reason,
      code:error?.code||null,
      command:error?.command||null,
      responseCode:error?.responseCode||null,
      message:error?.message||'SMTP send failed'
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
  const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17231d"><h2 style="font-family:Georgia,serif">Confirm your email</h2><p>Enter this code to confirm your email address:</p><p style="font-size:34px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</p><p style="font-size:13px;color:#68716b">This code expires in ${config.emailVerificationTtlMinutes} minutes. If you did not request this, you can ignore this email.</p></div>`;
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
