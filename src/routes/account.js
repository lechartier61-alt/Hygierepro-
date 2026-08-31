import { Router } from 'express';
import { z } from 'zod';
import { q, tx } from '../db.js';
import { asyncRoute, HttpError, ipOf } from '../utils/http.js';
import { requireUser, roles, cookieOpts } from '../middleware/auth.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';
import { passwordSchema } from '../utils/validation.js';
import { deleteStored } from '../services/storage.js';
import { audit } from '../services/audit.js';
import { stripeClient } from '../services/stripe.js';
import { streamOrganizationBackup } from '../services/backup.js';
import { LEGAL_VERSIONS, saveLegalAcceptances } from '../legal.js';
const r=Router();
r.patch('/profile',requireUser,asyncRoute(async(req,res)=>{const d=z.object({name:z.string().min(2).max(100).optional(),avatarUrl:z.string().max(500).nullable().optional()}).parse(req.body);const {rows}=await q(`UPDATE users SET name=COALESCE($1,name),avatar_url=COALESCE($2,avatar_url) WHERE id=$3 RETURNING id,name,email,role,avatar_url`,[d.name??null,d.avatarUrl??null,req.user.id]);await audit(req,'profile.update','user',req.user.id);res.json(rows[0]);}));


const uiPreferencesSchema=z.object({
  conciseMode:z.boolean().optional(),
  showAdvancedMenu:z.boolean().optional(),
  startPage:z.enum(['auto','today','myday','controls','scanner']).optional(),
  reduceMotion:z.boolean().optional(),
  largeText:z.boolean().optional()
}).strict();

r.patch('/preferences',requireUser,asyncRoute(async(req,res)=>{
  const d=uiPreferencesSchema.parse(req.body||{});
  const {rows}=await q(`UPDATE users SET ui_preferences=COALESCE(ui_preferences,'{}'::jsonb) || $1::jsonb WHERE id=$2 RETURNING ui_preferences`,[JSON.stringify(d),req.user.id]);
  await audit(req,'profile.preferences_updated','user',req.user.id,{keys:Object.keys(d)});
  res.json({ok:true,preferences:rows[0]?.ui_preferences||{}});
}));

r.post('/tutorial/reset',requireUser,asyncRoute(async(req,res)=>{
  await q(`UPDATE users SET ux_tutorial_version=0 WHERE id=$1`,[req.user.id]);
  await audit(req,'profile.tutorial_reset','user',req.user.id,{nextLogin:true});
  res.json({ok:true,tutorialVersion:0});
}));

r.patch('/tutorial',requireUser,asyncRoute(async(req,res)=>{
  const d=z.object({version:z.number().int().min(0).max(100)}).parse(req.body);
  const {rows}=await q(`UPDATE users SET ux_tutorial_version=GREATEST(ux_tutorial_version,$1) WHERE id=$2 RETURNING ux_tutorial_version`,[d.version,req.user.id]);
  await audit(req,'profile.tutorial_completed','user',req.user.id,{version:d.version});
  res.json({ok:true,tutorialVersion:rows[0]?.ux_tutorial_version||d.version});
}));

r.post('/legal-acceptance',requireUser,roles('owner'),asyncRoute(async(req,res)=>{
  z.object({cgvAccepted:z.literal(true),cguAccepted:z.literal(true),dpaAccepted:z.literal(true),privacyAcknowledged:z.literal(true)}).parse(req.body);
  await tx(async c=>{
    await saveLegalAcceptances(c,{organizationId:req.user.organization_id,userId:req.user.id,ip:ipOf(req)||null,userAgent:req.get('user-agent')||''});
    await c.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata,ip) VALUES($1,$2,'legal.accepted','user',$3,$4,$5)`,[req.user.organization_id,req.user.id,req.user.id,{versions:LEGAL_VERSIONS},ipOf(req)||null]);
  });
  res.json({ok:true,versions:LEGAL_VERSIONS});
}));

r.post('/change-password',requireUser,asyncRoute(async(req,res)=>{const d=z.object({currentPassword:z.string(),newPassword:passwordSchema}).parse(req.body);const u=(await q('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];if(!(await verifyPassword(u.password_hash,d.currentPassword)))throw new HttpError(401,'Mot de passe actuel incorrect.');const ph=await hashPassword(d.newPassword);await tx(async c=>{await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[ph,req.user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1 AND id<>$2',[req.user.id,req.sessionId]);await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[req.user.id]);});await audit(req,'profile.password_changed','user',req.user.id);res.json({ok:true});}));

r.get('/audit',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{const {rows}=await q(`SELECT a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,COALESCE(u.name,'Système') actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.organization_id=$1 ORDER BY a.created_at DESC LIMIT 300`,[req.user.organization_id]);res.json(rows);}));

r.get('/export',requireUser,roles('owner'),asyncRoute(async(req,res)=>{const [org,users,settings,records,media,payments,auditRows]=await Promise.all([q('SELECT * FROM organizations WHERE id=$1',[req.user.organization_id]),q(`SELECT u.id,u.email,u.name,m.role,u.avatar_url,(u.active AND m.active) active,u.last_login_at,u.created_at FROM organization_memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1`,[req.user.organization_id]),q('SELECT * FROM organization_settings WHERE organization_id=$1',[req.user.organization_id]),q('SELECT * FROM records WHERE organization_id=$1 ORDER BY occurred_at',[req.user.organization_id]),q('SELECT id,kind,public_url,original_name,mime_type,size_bytes,created_at FROM media WHERE organization_id=$1',[req.user.organization_id]),q('SELECT * FROM payments WHERE organization_id=$1',[req.user.organization_id]),q('SELECT action,entity_type,entity_id,metadata,created_at FROM audit_logs WHERE organization_id=$1 ORDER BY created_at',[req.user.organization_id])]);res.set('Content-Disposition','attachment; filename="hygiesafe-donnees.json"').json({exportedAt:new Date().toISOString(),organization:org.rows[0],users:users.rows,settings:settings.rows[0],records:records.rows,media:media.rows,payments:payments.rows,audit:auditRows.rows});}));
r.get('/backup.zip',requireUser,roles('owner'),asyncRoute(async(req,res)=>{await audit(req,'backup.download_requested','organization',req.user.organization_id,{format:'zip',classification:'year/month/day'});await streamOrganizationBackup(res,{organizationId:req.user.organization_id,requestedBy:req.user});}));
r.post('/delete-organization',requireUser,roles('owner'),asyncRoute(async(req,res)=>{const d=z.object({password:z.string(),confirmation:z.literal('SUPPRIMER')}).parse(req.body);const siteCount=Number((await q(`SELECT count(*)::int n FROM organizations WHERE network_id=$1 AND status<>'deleted'`,[req.user.network_id||req.user.organization_id])).rows[0]?.n||1);if(siteCount>1)throw new HttpError(409,'Ce compte appartient à un réseau multisite. Archivez ou retirez d’abord les établissements secondaires depuis Réseau.','network_delete_blocked');if(req.user.organization_id!==req.user.network_primary_organization_id)throw new HttpError(409,'La suppression définitive se fait depuis l’établissement principal.','primary_site_required');const dBilling=req.user.billing_organization_id||req.user.organization_id;const u=(await q('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];if(!(await verifyPassword(u.password_hash,d.password)))throw new HttpError(401,'Mot de passe incorrect.');const org=(await q('SELECT stripe_subscription_id FROM organizations WHERE id=$1',[dBilling])).rows[0];if(org?.stripe_subscription_id){
  const stripe=stripeClient();
  if(!stripe)throw new HttpError(503,'Impossible de supprimer le compte tant que Stripe est indisponible. Contactez le support.','stripe_required_for_delete');
  try{await stripe.subscriptions.cancel(org.stripe_subscription_id)}catch{throw new HttpError(502,'La résiliation Stripe a échoué. Le compte n’a pas été supprimé afin d’éviter une facturation orpheline.','stripe_cancel_failed')}
}const media=(await q('SELECT storage_key FROM media WHERE organization_id=$1',[req.user.organization_id])).rows;for(const m of media)await deleteStored(m.storage_key);await audit(req,'organization.delete_requested','organization',req.user.organization_id);await tx(async c=>{const net=(await c.query('SELECT network_id FROM organizations WHERE id=$1 FOR UPDATE',[req.user.organization_id])).rows[0]?.network_id;if(net){await c.query('UPDATE organizations SET network_id=NULL WHERE id=$1',[req.user.organization_id]);await c.query('DELETE FROM organization_networks WHERE id=$1',[net]);}await c.query('DELETE FROM organizations WHERE id=$1',[req.user.organization_id]);});res.clearCookie('hp_session',{...cookieOpts(0),maxAge:0});res.json({ok:true});}));
export default r;
