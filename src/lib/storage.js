import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { getSupabase } from './supabase.js';

const ensure = async p => fs.mkdir(p,{recursive:true});

export async function putOriginal(leadId, buffer, contentType='image/jpeg') {
  const key=`${leadId}/original.jpg`;
  if(config.demoMode){const dir=path.resolve('data/uploads',leadId);await ensure(dir);await fs.writeFile(path.join(dir,'original.jpg'),buffer);return key;}
  const {error}=await getSupabase().storage.from(config.originalBucket).upload(key,buffer,{contentType,upsert:true,cacheControl:'3600'});if(error)throw error;return key;
}

export async function putResult(leadId, resultId, buffer, contentType='image/jpeg') {
  const key=`${leadId}/${resultId}.jpg`;
  if(config.demoMode){const dir=path.resolve('data/results',leadId);await ensure(dir);await fs.writeFile(path.join(dir,`${resultId}.jpg`),buffer);return key;}
  const {error}=await getSupabase().storage.from(config.resultsBucket).upload(key,buffer,{contentType,upsert:true,cacheControl:'3600'});if(error)throw error;return key;
}

export async function signedOriginalUrl(key, expires=config.signedUrlTtlSeconds) {
  if(config.demoMode)return `${config.appUrl}/demo-storage/original/${encodeURIComponent(key)}`;
  const {data,error}=await getSupabase().storage.from(config.originalBucket).createSignedUrl(key,expires);if(error)throw error;return data.signedUrl;
}

export async function signedResultUrl(key, expires=config.signedUrlTtlSeconds, download=false) {
  if(config.demoMode)return `${config.appUrl}/demo-storage/result/${encodeURIComponent(key)}${download?'?download=1':''}`;
  const {data,error}=await getSupabase().storage.from(config.resultsBucket).createSignedUrl(key,expires,download?{download:true}:undefined);if(error)throw error;return data.signedUrl;
}

export async function deleteOriginal(key) {
  if(!key)return;
  if(config.demoMode){await fs.rm(path.resolve('data/uploads',key),{force:true});return;}
  const {error}=await getSupabase().storage.from(config.originalBucket).remove([key]);if(error)throw error;
}

export async function deleteResult(key) {
  if(!key)return;
  if(config.demoMode){await fs.rm(path.resolve('data/results',key),{force:true});return;}
  const {error}=await getSupabase().storage.from(config.resultsBucket).remove([key]);if(error)throw error;
}
