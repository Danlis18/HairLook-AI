import { config } from '../config.js';
import { randomToken, tokenHash } from '../lib/crypto.js';
import { repo } from '../lib/repository.js';

export async function createResultsAccessUrl(lead,{downloadPdf=false}={}){
  const raw=randomToken();
  const expiresAt=new Date(Date.now()+Math.max(config.magicLinkTtlMinutes,1440)*60_000).toISOString();
  await repo.createMagicLink({email:lead.email,purpose:'user',leadId:lead.id,tokenHash:tokenHash(raw),expiresAt});
  const query=new URLSearchParams({token:raw});
  if(downloadPdf)query.set('next','pdf');
  return `${config.appUrl}/auth/magic?${query.toString()}`;
}

export async function createResultsDeliveryLinks(lead){
  const [url,pdfUrl]=await Promise.all([
    createResultsAccessUrl(lead),
    createResultsAccessUrl(lead,{downloadPdf:true})
  ]);
  return {url,pdfUrl};
}
