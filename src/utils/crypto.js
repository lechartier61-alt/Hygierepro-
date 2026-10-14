import crypto from 'node:crypto';
import argon2 from 'argon2';
import { config } from '../config.js';
import { encryptWithKey, decryptWithKey } from './secret-box.js';

export const randomToken = (bytes=32) => crypto.randomBytes(bytes).toString('base64url');
export const tokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
export const hashPassword = (password) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
export const verifyPassword = (hash, password) => argon2.verify(hash, password);
export const passwordNeedsRehash = (hash) => {
  try{return argon2.needsRehash(hash,{type:argon2.argon2id,memoryCost:19456,timeCost:3,parallelism:1})}catch{return false}
};
export const safeEqual = (a,b) => {
  const aa=Buffer.from(String(a)); const bb=Buffer.from(String(b));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
};

export function encryptSecret(value){
  if(!config.fieldEncryptionKey)throw new Error('FIELD_ENCRYPTION_KEY manquante : chiffrement des secrets indisponible.');
  return encryptWithKey(value,config.fieldEncryptionKey);
}
export function decryptSecret(value){
  if(!value)return '';
  if(!String(value).startsWith('enc:v1:'))return String(value);
  if(!config.fieldEncryptionKey)throw new Error('FIELD_ENCRYPTION_KEY manquante : impossible de déchiffrer le secret 2FA.');
  return decryptWithKey(value,config.fieldEncryptionKey);
}
