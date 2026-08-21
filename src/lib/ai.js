import Replicate from 'replicate';
import sharp from 'sharp';
import { config } from '../config.js';
import { getOriginalBuffer, signedOriginalUrl } from './storage.js';

let replicate;
function getReplicate(){
  if(replicate)return replicate;
  if(!config.replicateToken)throw new Error('REPLICATE_API_TOKEN is not configured');
  replicate=new Replicate({auth:config.replicateToken});
  return replicate;
}

export async function generateHairEdit({lead,job}){
  if(job.model==='demo-local-v1'){
    const original=await getOriginalBuffer(lead.upload_path);
    const variants=[
      {brightness:1.02,saturation:1.00,hue:0}, {brightness:1.04,saturation:0.92,hue:8},
      {brightness:0.98,saturation:1.08,hue:350}, {brightness:1.06,saturation:0.86,hue:18},
      {brightness:0.96,saturation:1.12,hue:338}, {brightness:1.03,saturation:0.98,hue:28},
      {brightness:1.00,saturation:0.82,hue:0}, {brightness:1.07,saturation:1.04,hue:12},
      {brightness:0.97,saturation:0.94,hue:345}, {brightness:1.01,saturation:1.10,hue:22}
    ];
    const variant=variants[(Number(job.sort_order||1)-1)%variants.length];
    const safe=String(job.style_name||'Style preview').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    const label=Buffer.from(`<svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="1032" width="836" height="132" rx="24" fill="#13251f" fill-opacity="0.88"/><text x="62" y="1081" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="#cfe0d7">DEMO PIPELINE · ${Number(job.sort_order||1)}/10</text><text x="62" y="1129" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">${safe}</text></svg>`);
    const buffer=await sharp(original,{failOn:'error'}).rotate().resize({width:900,height:1200,fit:'cover',position:'attention'}).modulate(variant).composite([{input:label,top:0,left:0}]).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toBuffer();
    return {buffer,provider:'reviewer_demo',model:'demo-local-v1',costUsd:0,predictionId:`reviewer-demo-${job.id}`};
  }
  if(config.aiProvider!=='replicate')throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
  const inputUrl=await signedOriginalUrl(lead.upload_path,900);
  const output=await getReplicate().run(job.model||config.aiPrimaryModel,{input:{
    prompt:job.prompt,
    input_image:inputUrl,
    aspect_ratio:'match_input_image',
    output_format:'jpg',
    safety_tolerance:2,
    prompt_upsampling:false
  }});
  const file = Array.isArray(output) ? output[0] : output;
  if(!file)throw new Error('AI provider returned no file');
  const blob=await file.blob();
  const arrayBuffer=await blob.arrayBuffer();
  const buffer=Buffer.from(arrayBuffer);
  return {buffer,provider:'replicate',model:job.model||config.aiPrimaryModel,costUsd:config.aiEstimatedCostUsd,predictionId:null};
}
