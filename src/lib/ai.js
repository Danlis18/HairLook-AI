import Replicate from 'replicate';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { config } from '../config.js';
import { signedOriginalUrl } from './storage.js';

let replicate;
function getReplicate(){
  if(replicate)return replicate;
  if(!config.replicateToken)throw new Error('REPLICATE_API_TOKEN is not configured');
  replicate=new Replicate({auth:config.replicateToken});
  return replicate;
}

export async function generateHairEdit({lead,job}){
  if(config.demoMode){
    const candidates=['public/media/style-portrait-1.jpg','public/media/style-portrait-2.jpg','public/media/style-portrait-3.jpg','public/media/style-portrait-4.jpg'];
    const src=candidates[(job.sort_order-1)%candidates.length];
    const base=await fs.readFile(src);
    const buffer=await sharp(base).resize({width:900,height:1200,fit:'cover'}).jpeg({quality:88}).toBuffer();
    return {buffer,provider:'demo',model:'demo-style-preview',costUsd:0,predictionId:`demo-${job.id}`};
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
