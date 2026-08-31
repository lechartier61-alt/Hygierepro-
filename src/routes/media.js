import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { q } from '../db.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { requireUser } from '../middleware/auth.js';
import fs from 'node:fs';
import { storeBuffer, deleteStored, signedReadUrl, localPath, usingS3 } from '../services/storage.js';
import { recognize } from '../services/ocr.js';
import { audit } from '../services/audit.js';
import { validateFileBuffer } from '../utils/file-signature.js';

const r=Router();
const ALLOWED=['image/jpeg','image/png','image/webp','application/pdf'];
const IMAGE_ALLOWED=['image/jpeg','image/png','image/webp'];
const kindSchema=z.enum(['document','scan_reception','scan_traceability','photo','invoice','supplier']);
const upload=multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:10*1024*1024,files:1},
  fileFilter:(req,file,cb)=>cb(ALLOWED.includes(file.mimetype)?null:new HttpError(415,'Format de fichier non autorisé.','unsupported_media_type'),ALLOWED.includes(file.mimetype))
});

r.post('/upload',requireUser,upload.single('file'),asyncRoute(async(req,res)=>{
  if(!req.file)throw new HttpError(400,'Fichier manquant.');
  let actual;try{actual=validateFileBuffer(req.file.buffer,ALLOWED)}catch{throw new HttpError(415,'Le contenu réel du fichier n’est pas autorisé. Utilisez JPG, PNG, WebP ou PDF.','invalid_file_signature')}
  const kind=kindSchema.parse(req.body.kind||'document');
  const stored=await storeBuffer(req.file.buffer,{organizationId:req.user.organization_id,mimeType:actual.mime,kind});
  const {rows}=await q(`INSERT INTO media(organization_id,uploaded_by,kind,storage_key,public_url,original_name,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.organization_id,req.user.id,kind,stored.key,stored.url,String(req.file.originalname||'document').slice(0,240),actual.mime,req.file.size]);
  await audit(req,'media.upload','media',rows[0].id,{kind,mime:actual.mime,size:req.file.size});
  res.status(201).json(rows[0]);
}));

r.post('/scan',requireUser,upload.single('file'),asyncRoute(async(req,res)=>{
  if(!req.file)throw new HttpError(400,'Envoyez une photo de l’étiquette ou de la facture.');
  try{validateFileBuffer(req.file.buffer,IMAGE_ALLOWED)}catch{throw new HttpError(415,'Le scanner accepte uniquement JPG, PNG ou WebP.','invalid_scan_file')}
  const mode=z.enum(['auto','dlc','invoice']).parse(req.body.mode||'auto');
  const ocr=await recognize(req.file.buffer,{mode});
  res.json({ocr,requiresValidation:true,message:'Vérifiez toujours les informations détectées avant enregistrement.'});
}));

r.get('/:id/file',requireUser,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const row=(await q(`SELECT * FROM media WHERE id=$1 AND organization_id=$2`,[id,req.user.organization_id])).rows[0];
  if(!row)throw new HttpError(404,'Fichier introuvable.');
  if(req.user.role==='employee'&&row.uploaded_by!==req.user.id){const allowed=(await q(`SELECT 1 FROM workday_steps s JOIN workday_plans p ON p.id=s.plan_id WHERE s.organization_id=$1 AND p.employee_id=$2 AND (s.reference_media_id=$3 OR s.proof_media_id=$3 OR s.block_media_id=$3) LIMIT 1`,[req.user.organization_id,req.user.id,id])).rowCount;if(!allowed)throw new HttpError(403,'Ce fichier ne fait pas partie de vos preuves ou de votre journée.','media_forbidden');}
  res.set('Cache-Control','private, no-store');
  if(usingS3()){const url=await signedReadUrl(row.storage_key);return res.redirect(302,url);}
  res.type(row.mime_type||'application/octet-stream');
  res.set('Content-Disposition',`inline; filename="${String(row.original_name||'document').replace(/["\r\n]/g,'')}"`);
  const stream=fs.createReadStream(localPath(row.storage_key));
  stream.on('error',()=>{if(!res.headersSent)res.status(404).end();else res.destroy();});
  stream.pipe(res);
}));

r.delete('/:id',requireUser,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const media=(await q(`SELECT * FROM media WHERE id=$1 AND organization_id=$2`,[id,req.user.organization_id])).rows[0];
  if(!media)throw new HttpError(404,'Fichier introuvable.');
  const refs=await q(`SELECT (SELECT count(*) FROM scan_session_items WHERE media_id=$1)+(SELECT count(*) FROM workday_steps WHERE reference_media_id=$1 OR proof_media_id=$1 OR block_media_id=$1)+(SELECT count(*) FROM equipment_events WHERE organization_id=$2 AND media_id=$1)+(SELECT count(*) FROM records WHERE organization_id=$2 AND (payload->>'mediaId'=$1::text OR payload->>'scanMediaId'=$1::text OR payload::text LIKE '%' || $1::text || '%')) AS n`,[id,req.user.organization_id]);
  if(Number(refs.rows[0]?.n||0)>0)throw new HttpError(409,'Cette photo est déjà liée à une preuve métier et ne peut plus être supprimée.','media_evidence_locked');
  if(req.user.role==='employee'){const own=media.uploaded_by===req.user.id,young=Date.now()-new Date(media.created_at).getTime()<=10*60*1000;if(!own||!young)throw new HttpError(403,'Cette photo n’est plus modifiable.','media_locked');}
  const {rows}=await q(`DELETE FROM media WHERE id=$1 AND organization_id=$2 RETURNING *`,[id,req.user.organization_id]);
  await deleteStored(rows[0].storage_key);await audit(req,'media.delete','media',rows[0].id,{uploadedBy:media.uploaded_by});res.json({ok:true});
}));
export default r;
