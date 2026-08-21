import { Router } from 'express';
import { z } from 'zod';
import { q, tx } from '../db.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { requireUser, roles, cookieOpts } from '../middleware/auth.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';
import { passwordSchema } from '../utils/validation.js';
import { deleteStored } from '../services/storage.js';
import { audit } from '../services/audit.js';
import { stripeClient } from '../services/stripe.js';
import { streamOrganizationBackup } from '../services/backup.js';
const r=Router();
r.patch('/profile',requireUser,asyncRoute(async(req,res)=>{const d=z.object({name:z.string().min(2).max(100).optional(),avatarUrl:z.string().max(500).nullable().optional()}).parse(req.body);const {rows}=await q(`UPDATE users SET name=COALESCE($1,name),avatar_url=COALESCE($2,avatar_url) WHERE id=$3 RETURNING id,name,email,role,avatar_url`,[d.name??null,d.avatarUrl??null,req.user.id]);await audit(req,'profile.update','user',req.user.id);res.json(rows[0]);}));

r.patch('/tutorial',requireUser,asyncRoute(async(req,res)=>{
  const d=z.object({version:z.number().int().min(0).max(100)}).parse(req.body);
  const {rows}=await q(`UPDATE users SET ux_tutorial_version=GREATEST(ux_tutorial_version,$1) WHERE id=$2 RETURNING ux_tutorial_version`,[d.version,req.user.id]);
  await audit(req,'profile.tutorial_completed','user',req.user.id,{version:d.version});
  res.json({ok:true,tutorialVersion:rows[0]?.ux_tutorial_version||d.version});
}));
r.post('/change-password',requireUser,asyncRoute(async(req,res)=>{const d=z.object({currentPassword:z.string(),newPassword:passwordSchema}).parse(req.body);const u=(await q('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];if(!(await verifyPassword(u.password_hash,d.currentPassword)))throw new HttpError(401,'Mot de passe actuel incorrect.');const ph=await hashPassword(d.newPassword);await tx(async c=>{await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[ph,req.user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1 AND id<>$2',[req.user.id,req.sessionId]);await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[req.user.id]);});await audit(req,'profile.password_changed','user',req.user.id);res.json({ok:true});}));

r.get('/audit',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{const {rows}=await q(`SELECT a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,COALESCE(u.name,'Système') actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.organization_id=$1 ORDER BY a.created_at DESC LIMIT 300`,[req.user.organization_id]);res.json(rows);}));

r.get('/export',requireUser,roles('owner'),asyncRoute(async(req,res)=>{const [org,users,settings,records,media,payments,auditRows]=await Promise.all([q('SELECT * FROM organizations WHERE id=$1',[req.user.organization_id]),q(`SELECT id,email,name,role,avatar_url,active,last_login_at,created_at FROM users WHERE organization_id=$1`,[req.user.organization_id]),q('SELECT * FROM organization_settings WHERE organization_id=$1',[req.user.organization_id]),q('SELECT * FROM records WHERE organization_id=$1 ORDER BY occurred_at',[req.user.organization_id]),q('SELECT id,kind,public_url,original_name,mime_type,size_bytes,created_at FROM media WHERE organization_id=$1',[req.user.organization_id]),q('SELECT * FROM payments WHERE organization_id=$1',[req.user.organization_id]),q('SELECT action,entity_type,entity_id,metadata,created_at FROM audit_logs WHERE organization_id=$1 ORDER BY created_at',[req.user.organization_id])]);res.set('Content-Disposition','attachment; filename="hygiesafe-donnees.json"').json({exportedAt:new Date().toISOString(),organization:org.rows[0],users:users.rows,settings:settings.rows[0],records:records.rows,media:media.rows,payments:payments.rows,audit:auditRows.rows});}));
r.get('/backup.zip',requireUser,roles('owner'),asyncRoute(async(req,res)=>{await audit(req,'backup.download_requested','organization',req.user.organization_id,{format:'zip',classification:'year/month/day'});await streamOrganizationBackup(res,{organizationId:req.user.organization_id,requestedBy:req.user});}));
r.post('/delete-organization',requireUser,roles('owner'),asyncRoute(async(req,res)=>{const d=z.object({password:z.string(),confirmation:z.literal('SUPPRIMER')}).parse(req.body);const u=(await q('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];if(!(await verifyPassword(u.password_hash,d.password)))throw new HttpError(401,'Mot de passe incorrect.');const org=(await q('SELECT stripe_subscription_id FROM organizations WHERE id=$1',[req.user.organization_id])).rows[0];if(org?.stripe_subscription_id){
  const stripe=stripeClient();
  if(!stripe)throw new HttpError(503,'Impossible de supprimer le compte tant que Stripe est indisponible. Contactez le support.','stripe_required_for_delete');
  try{await stripe.subscriptions.cancel(org.stripe_subscription_id)}catch{throw new HttpError(502,'La résiliation Stripe a échoué. Le compte n’a pas été supprimé afin d’éviter une facturation orpheline.','stripe_cancel_failed')}
}const media=(await q('SELECT storage_key FROM media WHERE organization_id=$1',[req.user.organization_id])).rows;for(const m of media)await deleteStored(m.storage_key);await audit(req,'organization.delete_requested','organization',req.user.organization_id);await q(`DELETE FROM organizations WHERE id=$1`,[req.user.organization_id]);res.clearCookie('hp_session',{...cookieOpts(0),maxAge:0});res.json({ok:true});}));
export default r;
