import crypto from 'node:crypto';
function keyFrom(material){
  if(!material)throw new Error('Clé de chiffrement manquante.');
  return crypto.createHash('sha256').update(String(material),'utf8').digest();
}
export function encryptWithKey(value,keyMaterial){
  const key=keyFrom(keyMaterial),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}
export function decryptWithKey(value,keyMaterial){
  const text=String(value||'');
  if(!text.startsWith('enc:v1:'))return text;
  const key=keyFrom(keyMaterial);
  const [,version,ivB64,tagB64,dataB64]=text.split(':');
  if(version!=='v1'||!ivB64||!tagB64||!dataB64)throw new Error('Secret chiffré invalide.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(ivB64,'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64,'base64url')),decipher.final()]).toString('utf8');
}
