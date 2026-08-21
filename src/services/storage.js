import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
export const localUploadDir=path.resolve(config.uploadDir||path.resolve(__dirname,'../../uploads'));
let s3=null;
function getS3(){
  if(!config.s3.endpoint||!config.s3.bucket||!config.s3.accessKeyId||!config.s3.secretAccessKey)return null;
  if(!s3)s3=new S3Client({endpoint:config.s3.endpoint,region:config.s3.region,forcePathStyle:true,credentials:{accessKeyId:config.s3.accessKeyId,secretAccessKey:config.s3.secretAccessKey}});
  return s3;
}
export function usingS3(){return !!getS3()}
function safeSegment(v,fallback='document'){
  const out=String(v||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
  return out||fallback;
}
function extensionForMime(mime){
  return ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf','video/mp4':'.mp4','video/webm':'.webm'})[mime]||'.bin';
}
function buildKey({organizationId='public',kind='document',mimeType='application/octet-stream'}={}){
  const org=safeSegment(organizationId,'public');
  const category=safeSegment(kind,'document');
  return `${org}/${category}/${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extensionForMime(mimeType)}`;
}
function safeLocalPath(key){
  const rel=String(key||'').replace(/\\/g,'/');
  if(rel.startsWith('/')||rel.includes('..')) throw new Error('Clé de stockage invalide.');
  const dest=path.resolve(localUploadDir,rel);
  if(dest!==localUploadDir&&!dest.startsWith(localUploadDir+path.sep)) throw new Error('Clé de stockage hors périmètre.');
  return dest;
}
export async function storeBuffer(buffer,{organizationId='public',mimeType='application/octet-stream',kind='document'}={}){
  const key=buildKey({organizationId,kind,mimeType});const client=getS3();
  if(client){
    await client.send(new PutObjectCommand({Bucket:config.s3.bucket,Key:key,Body:buffer,ContentType:mimeType,CacheControl:organizationId==='public'?'public, max-age=3600':'private, no-store'}));
    const publicAsset=organizationId==='public'&&config.s3.publicBaseUrl?`${config.s3.publicBaseUrl.replace(/\/$/,'')}/${key}`:null;
    return {key,url:publicAsset,driver:'s3'};
  }
  const dest=safeLocalPath(key);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,buffer,{mode:0o600});
  return {key,url:organizationId==='public'?`/public-media/${key.replace(/^public\//,'')}`:null,driver:'local'};
}
export async function storeFile(sourcePath,{organizationId='public',mimeType='application/octet-stream',kind='document'}={}){
  const key=buildKey({organizationId,kind,mimeType});const client=getS3();
  if(client){
    await client.send(new PutObjectCommand({Bucket:config.s3.bucket,Key:key,Body:fsSync.createReadStream(sourcePath),ContentType:mimeType,CacheControl:organizationId==='public'?'public, max-age=3600':'private, no-store'}));
    const publicAsset=organizationId==='public'&&config.s3.publicBaseUrl?`${config.s3.publicBaseUrl.replace(/\/$/,'')}/${key}`:null;
    return {key,url:publicAsset,driver:'s3'};
  }
  const dest=safeLocalPath(key);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(sourcePath,dest);await fs.chmod(dest,0o600).catch(()=>{});
  return {key,url:organizationId==='public'?`/public-media/${key.replace(/^public\//,'')}`:null,driver:'local'};
}
export async function deleteStored(key){
  if(!key)return;
  const client=getS3();if(client)return client.send(new DeleteObjectCommand({Bucket:config.s3.bucket,Key:key}));
  await fs.rm(safeLocalPath(key),{force:true});
}
export async function signedReadUrl(key){
  const client=getS3();if(!client)return null;
  return getSignedUrl(client,new GetObjectCommand({Bucket:config.s3.bucket,Key:key,ResponseCacheControl:'private, no-store'}),{expiresIn:300});
}
export async function storedReadStream(key){
  const client=getS3();
  if(client){const out=await client.send(new GetObjectCommand({Bucket:config.s3.bucket,Key:key}));if(!out.Body)throw new Error('Objet de stockage vide.');return out.Body;}
  const p=safeLocalPath(key);await fs.access(p);return fsSync.createReadStream(p);
}
export function localPath(key){return safeLocalPath(key)}


export async function ensureStorageReady(){
  if(getS3())return {driver:'s3'};
  await fs.mkdir(localUploadDir,{recursive:true});
  const probe=path.join(localUploadDir,`.hygiepro-write-${process.pid}-${Date.now()}`);
  await fs.writeFile(probe,'ok',{mode:0o600});
  await fs.rm(probe,{force:true});
  return {driver:'volume'};
}
