import crypto from 'node:crypto';
import { config } from '../config.js';

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const md5 = (value) => crypto.createHash('md5').update(String(value)).digest('hex');
export const hmacSha256 = (key, value) => crypto.createHmac('sha256', String(key)).update(String(value)).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const tokenHash = (token) => sha256(token);
export const safeEqual = (a, b) => {
  const aa = Buffer.from(sha256(String(a ?? '')), 'hex');
  const bb = Buffer.from(sha256(String(b ?? '')), 'hex');
  return crypto.timingSafeEqual(aa, bb);
};
export const hashIp = (ip) => sha256(`${config.ipHashSalt}:${ip || ''}`);
export const eventFingerprint = (parts) => sha256(parts.map(v => v ?? '').join('|'));
