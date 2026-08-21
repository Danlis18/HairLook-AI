import { config } from './config.js';
import { repo } from './lib/repository.js';
import { tokenHash } from './lib/crypto.js';

export async function leadSession(req,res,next){
  try{const raw=req.cookies?.hair_lead_session;if(!raw)return res.status(401).json({error:'sign_in_required'});const lead=await repo.getLeadBySession(tokenHash(raw));if(!lead)return res.status(401).json({error:'session_expired'});req.lead=lead;next();}catch(e){next(e);}
}
export async function optionalLeadSession(req,res,next){
  try{const raw=req.cookies?.hair_lead_session;if(raw)req.lead=await repo.getLeadBySession(tokenHash(raw));next();}catch(e){next(e);}
}
export async function adminSession(req,res,next){
  try{const raw=req.cookies?.hair_admin_session;if(!raw)return res.status(401).json({error:'admin_sign_in_required'});const admin=await repo.getAdminBySession(tokenHash(raw));if(!admin)return res.status(401).json({error:'admin_session_expired'});req.admin=admin;next();}catch(e){next(e);}
}
export async function optionalReviewerAccess(req,res,next){
  try{
    // A reviewer cookie can outlive the one reviewer page. Never let that
    // cookie turn a later, ordinary storefront upload into a reviewer order.
    let reviewerRequested=req.query?.reviewer==='1';
    if(!reviewerRequested&&req.get('referer')){
      try{reviewerRequested=new URL(req.get('referer')).searchParams.get('reviewer')==='1';}catch{}
    }
    if(!reviewerRequested)return next();
    const raw=req.cookies?.hair_reviewer_access;
    if(raw){
      const invite=await repo.getReviewerInvite(tokenHash(raw));
      if(invite&&!invite.revoked_at&&new Date(invite.expires_at).getTime()>Date.now())req.reviewerInvite=invite;
    }
    next();
  }catch(e){next(e);}
}
export async function reviewerAccess(req,res,next){
  try{
    const raw=req.cookies?.hair_reviewer_access;
    if(!raw)return res.status(403).json({error:'reviewer_access_required'});
    const invite=await repo.getReviewerInvite(tokenHash(raw));
    const active=invite&&!invite.revoked_at&&new Date(invite.expires_at).getTime()>Date.now();
    if(!active||!req.lead||invite.lead_id!==req.lead.id||req.lead.access_mode!=='reviewer_demo')return res.status(403).json({error:'reviewer_access_expired'});
    req.reviewerInvite=invite;
    next();
  }catch(e){next(e);}
}
export function sameOrigin(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const origin=req.get('origin');
  if(!origin)return next();
  try{if(new URL(origin).origin!==new URL(config.appUrl).origin)return res.status(403).json({error:'origin_not_allowed'});}catch{return res.status(403).json({error:'origin_not_allowed'});}
  next();
}
export function noStore(req,res,next){res.set('Cache-Control','no-store');next();}
