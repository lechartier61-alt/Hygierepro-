import { Router } from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { z } from 'zod';
import os from 'node:os';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { q, tx } from '../db.js';
import { config } from '../config.js';
import { APP_VERSION } from '../version.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { randomToken, tokenHash, verifyPassword, encryptSecret, decryptSecret, passwordNeedsRehash, hashPassword } from '../utils/crypto.js';
import { cookieOpts, requireAdmin } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { storeFile, deleteStored } from '../services/storage.js';
import { stripeClient } from '../services/stripe.js';
import { ensureOrganizationNetwork, ensureMembership } from '../services/network.js';
import { validateFileBuffer } from '../utils/file-signature.js';

const r=Router();
const ADMIN_MEDIA=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
const upload=multer({
  storage:multer.diskStorage({
    destination:os.tmpdir(),
    filename:(req,file,cb)=>cb(null,`hygiesafe-${Date.now()}-${crypto.randomBytes(10).toString('hex')}.upload`)
  }),
  limits:{fileSize:60*1024*1024,files:1},
  fileFilter:(req,file,cb)=>cb(ADMIN_MEDIA.includes(file.mimetype)?null:new HttpError(415,'Format non autorisé. Utilisez JPG, PNG, WebP, MP4 ou WebM.','unsupported_media_type'),ADMIN_MEDIA.includes(file.mimetype))
});
function require2fa(req,res,next){return req.admin?.totp_enabled?next():next(new HttpError(428,'Activez d’abord la double authentification.','admin_2fa_required'));}
async function makeSession(res,adminId){
  const token=randomToken(),csrf=randomToken(24),ttl=8*3600000;
  await q(`INSERT INTO admin_sessions(admin_user_id,token_hash,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')`,[adminId,tokenHash(token),csrf]);
  res.cookie('hp_admin',token,cookieOpts(ttl));return csrf;
}
async function readHead(filePath,bytes=64){
  const fh=await fs.open(filePath,'r');try{const b=Buffer.alloc(bytes);const {bytesRead}=await fh.read(b,0,bytes,0);return b.subarray(0,bytesRead)}finally{await fh.close()}
}

r.get('/auth/status',asyncRoute(async(req,res)=>{
  const row=(await q(`SELECT count(*)::int total, count(*) FILTER (WHERE active)::int active FROM admin_users`)).rows[0];
  res.json({initialized:Number(row?.total||0)>0,active:Number(row?.active||0)>0,twoFactorReady:!!config.fieldEncryptionKey});
}));

r.post('/auth/login',asyncRoute(async(req,res)=>{
  const d=z.object({email:z.string().email(),password:z.string().min(1).max(200),code:z.string().regex(/^\d{6,8}$/).optional()}).parse(req.body);
  const a=(await q(`SELECT * FROM admin_users WHERE lower(email)=lower($1) AND active=true`,[d.email.trim().toLowerCase()])).rows[0];
  let ok=false;try{ok=!!a&&await verifyPassword(a.password_hash,d.password)}catch{}
  if(!a||!ok)throw new HttpError(401,'Identifiants administrateur incorrects.');
  if(passwordNeedsRehash(a.password_hash))await q('UPDATE admin_users SET password_hash=$1 WHERE id=$2',[await hashPassword(d.password),a.id]);
  if(a.totp_enabled){
    if(!d.code)throw new HttpError(401,'Code 2FA requis.','totp_required');
    let secret;try{secret=decryptSecret(a.totp_secret)}catch{throw new HttpError(503,'La clé de chiffrement 2FA du serveur est indisponible.','totp_key_missing')}
    if(!authenticator.check(d.code,secret))throw new HttpError(401,'Code 2FA incorrect.','totp_invalid');
    const codeHash=tokenHash(d.code);
    if(a.totp_last_code_hash===codeHash&&a.totp_last_used_at&&Date.now()-new Date(a.totp_last_used_at).getTime()<120000)
      throw new HttpError(401,'Ce code 2FA a déjà été utilisé. Attendez le prochain code.','totp_replay');
    await q('UPDATE admin_users SET totp_last_code_hash=$1,totp_last_used_at=now() WHERE id=$2',[codeHash,a.id]);
    if(!String(a.totp_secret||'').startsWith('enc:v1:')&&config.fieldEncryptionKey){
      await q('UPDATE admin_users SET totp_secret=$1 WHERE id=$2',[encryptSecret(secret),a.id]);
    }
  }
  await q('UPDATE admin_users SET last_login_at=now() WHERE id=$1',[a.id]);
  const csrf=await makeSession(res,a.id);req.admin=a;await audit(req,'admin.login','admin',a.id);
  res.json({ok:true,csrf,needs2faSetup:!a.totp_enabled});
}));
r.post('/auth/logout',requireAdmin,asyncRoute(async(req,res)=>{await q('DELETE FROM admin_sessions WHERE id=$1',[req.adminSessionId]);res.clearCookie('hp_admin',{...cookieOpts(0),maxAge:0});res.json({ok:true});}));
r.get('/me',requireAdmin,asyncRoute(async(req,res)=>res.json({admin:{id:req.admin.id,email:req.admin.email,name:req.admin.name,totpEnabled:req.admin.totp_enabled,lastLoginAt:req.admin.last_login_at},csrf:req.adminCsrfToken})));

r.post('/2fa/setup',requireAdmin,asyncRoute(async(req,res)=>{
  if(req.admin.totp_enabled)throw new HttpError(400,'La double authentification est déjà active.');
  if(!config.fieldEncryptionKey)throw new HttpError(503,'Ajoutez FIELD_ENCRYPTION_KEY dans Railway avant d’activer la 2FA.','field_encryption_key_missing');
  const secret=authenticator.generateSecret();
  await q('UPDATE admin_users SET totp_secret=$1 WHERE id=$2',[encryptSecret(secret),req.admin.id]);
  const uri=authenticator.keyuri(req.admin.email,'HygieSafe Admin',secret);
  res.json({secret,qr:await QRCode.toDataURL(uri)});
}));
r.post('/2fa/enable',requireAdmin,asyncRoute(async(req,res)=>{
  const code=z.string().regex(/^\d{6,8}$/).parse(req.body.code);
  const a=(await q('SELECT totp_secret FROM admin_users WHERE id=$1',[req.admin.id])).rows[0];
  let secret='';try{secret=decryptSecret(a?.totp_secret)}catch{throw new HttpError(503,'Clé de chiffrement 2FA indisponible.','totp_key_missing')}
  if(!secret||!authenticator.check(code,secret))throw new HttpError(400,'Code de vérification incorrect.');
  await q('UPDATE admin_users SET totp_enabled=true,totp_last_code_hash=$1,totp_last_used_at=now() WHERE id=$2',[tokenHash(code),req.admin.id]);
  await audit(req,'admin.2fa_enabled','admin',req.admin.id);res.json({ok:true});
}));

// Vue globale : uniquement des agrégats et des informations opérationnelles. Aucun secret n'est exposé.
r.get('/dashboard',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const [orgs,users,sessions,payments,storage,records,commerce,recent,versions,incidents,security]=await Promise.all([
    q(`SELECT
      count(*)::int total,
      count(*) FILTER (WHERE status='active')::int active,
      count(*) FILTER (WHERE status='suspended')::int suspended,
      count(*) FILTER (WHERE subscription_status='trialing' AND trial_ends_at>now())::int trials,
      count(*) FILTER (WHERE subscription_status='active')::int paid,
      count(*) FILTER (WHERE subscription_status='past_due')::int past_due,
      count(*) FILTER (WHERE subscription_status IN ('unpaid','canceled','paused'))::int billing_attention,
      count(*) FILTER (WHERE NOT onboarding_completed)::int onboarding_incomplete,
      count(*) FILTER (WHERE created_at>=date_trunc('day',now()))::int created_today,
      count(*) FILTER (WHERE created_at>=now()-interval '7 days')::int created_7d,
      count(*) FILTER (WHERE created_at>=now()-interval '30 days')::int created_30d,
      count(*) FILTER (WHERE last_activity_at<now()-interval '14 days')::int inactive_14d,
      COALESCE(sum(monthly_amount_cents) FILTER (WHERE subscription_status='active' AND status='active'),0)::bigint mrr
      FROM organizations WHERE status<>'deleted'`),
    q(`SELECT
      (SELECT count(*) FROM users)::int total,
      (SELECT count(*) FROM users WHERE active)::int active,
      (SELECT count(*) FROM users WHERE email_verified)::int verified,
      (SELECT count(*) FROM users WHERE NOT email_verified)::int unverified,
      (SELECT count(DISTINCT user_id) FROM organization_memberships WHERE active AND role='owner')::int owners,
      (SELECT count(DISTINCT user_id) FROM organization_memberships WHERE active AND role='manager')::int managers,
      (SELECT count(DISTINCT user_id) FROM organization_memberships WHERE active AND role='employee')::int employees,
      (SELECT count(*) FROM users WHERE last_login_at>=now()-interval '24 hours')::int logged_24h,
      (SELECT count(*) FROM users WHERE created_at>=now()-interval '7 days')::int created_7d`),
    q(`SELECT count(*) FILTER (WHERE expires_at>now())::int active_sessions,
      count(*) FILTER (WHERE expires_at>now() AND last_seen_at>=now()-interval '15 minutes')::int online_15m,
      count(DISTINCT user_id) FILTER (WHERE expires_at>now() AND last_seen_at>=now()-interval '15 minutes')::int online_users
      FROM sessions`),
    q(`SELECT COALESCE(sum(amount_cents) FILTER (WHERE status='paid'),0)::bigint revenue,
      COALESCE(sum(amount_cents) FILTER (WHERE status='paid' AND paid_at>=date_trunc('month',now())),0)::bigint revenue_month,
      COALESCE(sum(amount_cents) FILTER (WHERE status='paid' AND paid_at>=now()-interval '7 days'),0)::bigint revenue_7d,
      COALESCE(sum(amount_cents) FILTER (WHERE status='paid' AND paid_at>=now()-interval '30 days'),0)::bigint revenue_30d,
      count(*) FILTER (WHERE status='paid')::int paid_count,
      count(*) FILTER (WHERE status<>'paid')::int non_paid_count
      FROM payments`),
    q(`SELECT COALESCE(sum(size_bytes),0)::bigint bytes,count(*)::int files,count(*) FILTER (WHERE mime_type LIKE 'image/%')::int images FROM media`),
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE occurred_at>=date_trunc('day',now()))::int today,
      count(*) FILTER (WHERE occurred_at>=now()-interval '7 days')::int last_7d,
      count(*) FILTER (WHERE occurred_at>=now()-interval '30 days')::int last_30d,
      count(*) FILTER (WHERE type='temperature')::int temperatures,
      count(*) FILTER (WHERE type='reception')::int receptions,
      count(*) FILTER (WHERE type='traceability')::int traceability,
      count(*) FILTER (WHERE type='nonconformity')::int nonconformities
      FROM records`),
    q(`SELECT
      (SELECT count(*) FROM suppliers WHERE active)::int suppliers,
      (SELECT count(*) FROM supplier_products WHERE active)::int supplier_products,
      (SELECT count(*) FROM purchase_orders)::int purchase_orders,
      (SELECT count(*) FROM purchase_orders WHERE submitted_at>=now()-interval '30 days')::int orders_30d,
      (SELECT count(*) FROM supplier_invoice_imports)::int invoices,
      (SELECT count(*) FROM supplier_invoice_imports WHERE created_at>=now()-interval '30 days')::int invoices_30d`),
    q(`SELECT o.id,o.name,o.city,o.created_at,o.last_activity_at,o.subscription_status,o.status,o.trial_ends_at,o.onboarding_completed,o.app_version,
      (SELECT count(*) FROM organization_memberships m WHERE m.organization_id=o.id)::int users,
      (SELECT count(*) FROM records r WHERE r.organization_id=o.id AND r.occurred_at>=now()-interval '7 days')::int activity_7d,
      (SELECT COALESCE(sum(size_bytes),0) FROM media m WHERE m.organization_id=o.id)::bigint storage_bytes
      FROM organizations o WHERE o.status<>'deleted' ORDER BY o.last_activity_at DESC NULLS LAST LIMIT 15`),
    q(`SELECT app_version,count(*)::int organizations FROM organizations WHERE status<>'deleted' GROUP BY app_version ORDER BY organizations DESC,app_version DESC`),
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE resolved_at IS NULL)::int open,
      count(*) FILTER (WHERE resolved_at IS NULL AND severity IN ('error','critical'))::int open_errors,
      count(*) FILTER (WHERE created_at>=now()-interval '24 hours')::int last_24h FROM system_incidents`),
    q(`SELECT
      (SELECT count(*) FROM email_verifications WHERE used_at IS NULL AND expires_at>now())::int pending_email_verifications,
      (SELECT count(*) FROM password_resets WHERE used_at IS NULL AND expires_at>now())::int active_password_resets,
      (SELECT count(*) FROM security_rate_limits WHERE reset_at>now() AND hits>0)::int active_rate_limits,
      (SELECT count(*) FROM stripe_events WHERE processed_at>=now()-interval '24 hours')::int stripe_events_24h`)
  ]);
  res.json({
    organizations:orgs.rows[0],users:users.rows[0],sessions:sessions.rows[0],payments:payments.rows[0],
    storage:{bytes:Number(storage.rows[0].bytes),files:storage.rows[0].files,images:storage.rows[0].images},
    records:records.rows[0],commerce:commerce.rows[0],recent:recent.rows,versions:versions.rows,
    incidents:incidents.rows[0],security:security.rows[0]
  });
}));

r.get('/organizations',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const {rows}=await q(`SELECT o.*,
    u.email owner_email,u.name owner_name,u.last_login_at owner_last_login_at,
    (SELECT count(*) FROM organization_memberships m WHERE m.organization_id=o.id)::int users_count,
    (SELECT count(*) FROM organization_memberships m JOIN users x ON x.id=m.user_id WHERE m.organization_id=o.id AND m.active AND x.active)::int active_users_count,
    (SELECT count(*) FROM organization_memberships m JOIN users x ON x.id=m.user_id WHERE m.organization_id=o.id AND x.email_verified)::int verified_users_count,
    (SELECT count(*) FROM records r WHERE r.organization_id=o.id)::int records_count,
    (SELECT count(*) FROM records r WHERE r.organization_id=o.id AND r.occurred_at>=now()-interval '7 days')::int records_7d,
    (SELECT max(r.occurred_at) FROM records r WHERE r.organization_id=o.id) last_record_at,
    (SELECT COALESCE(sum(size_bytes),0) FROM media m WHERE m.organization_id=o.id)::bigint storage_bytes,
    (SELECT count(*) FROM suppliers s WHERE s.organization_id=o.id AND s.active)::int suppliers_count,
    (SELECT count(*) FROM purchase_orders p WHERE p.organization_id=o.id)::int orders_count,
    (SELECT count(*) FROM supplier_invoice_imports i WHERE i.organization_id=o.id)::int invoices_count,
    (SELECT COALESCE(sum(amount_cents),0) FROM payments p WHERE p.organization_id=o.id AND p.status='paid')::bigint revenue_cents
    FROM organizations o
    LEFT JOIN LATERAL (SELECT x.email,x.name,x.last_login_at FROM organization_memberships m JOIN users x ON x.id=m.user_id WHERE m.organization_id=o.id AND m.active AND m.role='owner' ORDER BY m.created_at LIMIT 1) u ON true
    WHERE o.status<>'deleted' ORDER BY o.created_at DESC`);
  res.json(rows);
}));

r.get('/organizations/:id/detail',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const org=(await q(`SELECT o.*,(SELECT COALESCE(sum(size_bytes),0) FROM media WHERE organization_id=o.id)::bigint storage_bytes,
    (SELECT count(*) FROM media WHERE organization_id=o.id)::int media_count
    FROM organizations o WHERE o.id=$1 AND o.status<>'deleted'`,[id])).rows[0];
  if(!org)throw new HttpError(404,'Entreprise introuvable.');
  const [users,recordTypes,recentRecords,payments,commerce,audits,schedules]=await Promise.all([
    q(`SELECT u.id,u.name,u.email,m.role,(u.active AND m.active) active,u.email_verified,u.last_login_at,u.created_at,
      COALESCE(s.active_sessions,0)::int active_sessions,s.last_seen_at
      FROM organization_memberships m JOIN users u ON u.id=m.user_id LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE expires_at>now()) active_sessions,max(last_seen_at) last_seen_at
        FROM sessions WHERE user_id=u.id
      ) s ON true WHERE m.organization_id=$1 ORDER BY m.role,u.name`,[id]),
    q(`SELECT type,count(*)::int count,max(occurred_at) last_at FROM records WHERE organization_id=$1 GROUP BY type ORDER BY count DESC,type`,[id]),
    q(`SELECT id,type,title,status,occurred_at,created_at FROM records WHERE organization_id=$1 ORDER BY occurred_at DESC LIMIT 15`,[id]),
    q(`SELECT id,amount_cents,currency,status,paid_at,created_at,stripe_invoice_id FROM payments WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 25`,[id]),
    q(`SELECT
      (SELECT count(*) FROM suppliers WHERE organization_id=$1 AND active)::int suppliers,
      (SELECT count(*) FROM supplier_products WHERE organization_id=$1 AND active)::int supplier_products,
      (SELECT count(*) FROM purchase_orders WHERE organization_id=$1)::int orders,
      (SELECT count(*) FROM purchase_orders WHERE organization_id=$1 AND submitted_at>=now()-interval '30 days')::int orders_30d,
      (SELECT COALESCE(sum(total_estimated_cents),0) FROM purchase_orders WHERE organization_id=$1)::bigint order_value_cents,
      (SELECT count(*) FROM supplier_invoice_imports WHERE organization_id=$1)::int invoices,
      (SELECT COALESCE(sum(total_ttc_cents),0) FROM supplier_invoice_imports WHERE organization_id=$1)::bigint invoice_total_cents`,[id]),
    q(`SELECT a.action,a.entity_type,a.entity_id,a.created_at,COALESCE(ad.email,u.email,'Système') actor
      FROM audit_logs a LEFT JOIN admin_users ad ON ad.id=a.actor_admin_id LEFT JOIN users u ON u.id=a.actor_user_id
      WHERE a.organization_id=$1 ORDER BY a.created_at DESC LIMIT 25`,[id]),
    q(`SELECT count(*)::int configured_rows,count(DISTINCT user_id)::int scheduled_users FROM employee_schedules WHERE organization_id=$1 AND active`,[id])
  ]);
  res.json({organization:org,users:users.rows,recordTypes:recordTypes.rows,recentRecords:recentRecords.rows,payments:payments.rows,commerce:commerce.rows[0],audits:audits.rows,schedules:schedules.rows[0]});
}));

r.get('/users',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const {rows}=await q(`SELECT u.id,u.name,u.email,m.role,(u.active AND m.active) active,u.email_verified,u.last_login_at,u.created_at,
    o.id organization_id,o.name organization_name,o.status organization_status,o.subscription_status,
    COALESCE(s.active_sessions,0)::int active_sessions,s.last_seen_at,
    (SELECT count(*) FROM records r WHERE r.created_by=u.id AND r.organization_id=o.id)::int records_created
    FROM organization_memberships m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id AND o.status<>'deleted'
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE expires_at>now()) active_sessions,max(last_seen_at) last_seen_at
      FROM sessions WHERE user_id=u.id
    ) s ON true
    ORDER BY COALESCE(s.last_seen_at,u.last_login_at,u.created_at) DESC NULLS LAST,o.name LIMIT 2000`);
  res.json(rows);
}));

r.get('/billing-overview',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const [summary,statuses,payments,trend]=await Promise.all([
    q(`SELECT count(*) FILTER (WHERE subscription_status='active' AND status='active')::int paid_orgs,
      count(*) FILTER (WHERE subscription_status='trialing' AND trial_ends_at>now())::int trials,
      count(*) FILTER (WHERE subscription_status='past_due')::int past_due,
      count(*) FILTER (WHERE subscription_status IN ('unpaid','paused','canceled'))::int attention,
      COALESCE(sum(monthly_amount_cents) FILTER (WHERE subscription_status='active' AND status='active'),0)::bigint mrr,
      COALESCE(sum(monthly_amount_cents) FILTER (WHERE subscription_status='active' AND status='active'),0)::bigint arr_base
      FROM organizations WHERE status<>'deleted'`),
    q(`SELECT subscription_status,count(*)::int count FROM organizations WHERE status<>'deleted' GROUP BY subscription_status ORDER BY count DESC`),
    q(`SELECT p.id,p.amount_cents,p.currency,p.status,p.paid_at,p.created_at,p.stripe_invoice_id,o.id organization_id,o.name organization_name
      FROM payments p JOIN organizations o ON o.id=p.organization_id ORDER BY p.created_at DESC LIMIT 150`),
    q(`SELECT date_trunc('day',COALESCE(paid_at,created_at))::date day,
      COALESCE(sum(amount_cents) FILTER (WHERE status='paid'),0)::bigint revenue,
      count(*) FILTER (WHERE status='paid')::int payments
      FROM payments WHERE created_at>=now()-interval '30 days' GROUP BY 1 ORDER BY 1`)
  ]);
  const s=summary.rows[0];
  res.json({standardAmountCents:config.stripe.amountCents,summary:{...s,arr:Number(s.arr_base||0)*12},statuses:statuses.rows,payments:payments.rows,trend:trend.rows});
}));

r.get('/usage-overview',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const [types,topOrgs,daily,modules]=await Promise.all([
    q(`SELECT type,count(*)::int count,count(*) FILTER (WHERE occurred_at>=now()-interval '30 days')::int last_30d,max(occurred_at) last_at FROM records GROUP BY type ORDER BY count DESC,type`),
    q(`SELECT o.id,o.name,count(r.id)::int records_30d,max(r.occurred_at) last_record_at
      FROM organizations o LEFT JOIN records r ON r.organization_id=o.id AND r.occurred_at>=now()-interval '30 days'
      WHERE o.status<>'deleted' GROUP BY o.id,o.name ORDER BY records_30d DESC,last_record_at DESC NULLS LAST LIMIT 20`),
    q(`SELECT date_trunc('day',occurred_at)::date day,count(*)::int records,count(DISTINCT organization_id)::int organizations FROM records WHERE occurred_at>=now()-interval '30 days' GROUP BY 1 ORDER BY 1`),
    q(`SELECT
      (SELECT count(*) FROM suppliers)::int suppliers,
      (SELECT count(*) FROM supplier_products)::int supplier_products,
      (SELECT count(*) FROM purchase_orders)::int purchase_orders,
      (SELECT count(*) FROM supplier_invoice_imports)::int invoice_imports,
      (SELECT count(*) FROM media)::int media_files,
      (SELECT count(*) FROM employee_schedules WHERE active)::int active_schedules`)
  ]);
  res.json({types:types.rows,topOrganizations:topOrgs.rows,daily:daily.rows,modules:modules.rows[0]});
}));

r.get('/system-overview',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const [db,sessions,adminSessions,security,incidents,admins]=await Promise.all([
    q(`SELECT now() server_time,pg_database_size(current_database())::bigint database_bytes,current_database() database_name`),
    q(`SELECT count(*) FILTER (WHERE expires_at>now())::int active,count(*) FILTER (WHERE expires_at>now() AND last_seen_at>=now()-interval '15 minutes')::int online_15m,max(last_seen_at) last_seen_at FROM sessions`),
    q(`SELECT count(*) FILTER (WHERE expires_at>now())::int active,max(last_seen_at) last_seen_at FROM admin_sessions`),
    q(`SELECT
      (SELECT count(*) FROM users WHERE NOT email_verified)::int unverified_users,
      (SELECT count(*) FROM email_verifications WHERE used_at IS NULL AND expires_at>now())::int pending_verifications,
      (SELECT count(*) FROM password_resets WHERE used_at IS NULL AND expires_at>now())::int active_resets,
      (SELECT count(*) FROM security_rate_limits WHERE reset_at>now() AND hits>0)::int active_rate_limits,
      (SELECT count(*) FROM billing_checkout_locks WHERE expires_at>now())::int billing_locks,
      (SELECT count(*) FROM promo_reservations WHERE completed_at IS NULL AND expires_at>now())::int promo_reservations`),
    q(`SELECT count(*) FILTER (WHERE resolved_at IS NULL)::int open,count(*) FILTER (WHERE created_at>=now()-interval '24 hours')::int last_24h,max(created_at) last_incident_at FROM system_incidents`),
    q(`SELECT id,email,name,active,totp_enabled,last_login_at,created_at FROM admin_users ORDER BY created_at`)
  ]);
  const mem=process.memoryUsage();
  const s3Ready=!!(config.s3.endpoint&&config.s3.bucket&&config.s3.accessKeyId&&config.s3.secretAccessKey);
  const emailProvider=(config.resend.apiKey&&config.resend.from)?'Resend':(config.smtp.host?'SMTP':'Non configuré');
  res.json({
    runtime:{version:APP_VERSION,node:process.version,environment:config.env,uptimeSeconds:Math.floor(process.uptime()),rssBytes:mem.rss,heapUsedBytes:mem.heapUsed,platform:process.platform,arch:process.arch},
    network:{appUrl:config.appUrl,publicSiteUrl:config.publicSiteUrl,allowedOrigins:config.allowedOrigins,secureCookies:config.sessionCookieSecure},
    database:{...db.rows[0],database_bytes:Number(db.rows[0].database_bytes)},
    storage:{driver:s3Ready?'S3':'Volume persistant',configured:s3Ready||!!config.uploadDir},
    integrations:{email:emailProvider,resend:!!(config.resend.apiKey&&config.resend.from),stripe:!!(config.stripe.secretKey&&config.stripe.webhookSecret),fieldEncryption:!!config.fieldEncryptionKey},
    sessions:sessions.rows[0],adminSessions:adminSessions.rows[0],security:security.rows[0],incidents:incidents.rows[0],admins:admins.rows
  });
}));

r.post('/demo-account',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const d=z.object({organizationName:z.string().trim().min(2).max(120).optional(),name:z.string().trim().min(2).max(100).optional(),email:z.string().trim().email().max(160).optional()}).parse(req.body||{});
  const suffix=crypto.randomBytes(4).toString('hex');
  const organizationName=d.organizationName||`Restaurant Démo HygieSafe ${suffix.slice(0,4).toUpperCase()}`;
  const name=d.name||'Gérant Test';
  const email=(d.email||`client-test-${suffix}@hygiesafe.test`).toLowerCase();
  const password=`HpTest-${crypto.randomBytes(12).toString('base64url')}!9`;
  const passwordHash=await hashPassword(password);
  const result=await tx(async c=>{
    if((await c.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email])).rowCount)throw new HttpError(409,'Cette adresse e-mail possède déjà un compte.','email_exists');
    let slug=`demo-${suffix}`;while((await c.query('SELECT 1 FROM organizations WHERE slug=$1',[slug])).rowCount)slug=`demo-${crypto.randomBytes(5).toString('hex')}`;
    const org=(await c.query(`INSERT INTO organizations(name,slug,business_type,trial_started_at,trial_ends_at,subscription_status,monthly_amount_cents,app_version)
      VALUES($1,$2,'restaurant',now(),now()+interval '30 days','trialing',$3,$4) RETURNING id,name,slug,trial_ends_at`,[organizationName,slug,config.stripe.amountCents,APP_VERSION])).rows[0];
    const user=(await c.query(`INSERT INTO users(organization_id,email,password_hash,name,role,email_verified) VALUES($1,$2,$3,$4,'owner',true) RETURNING id,email,name,role`,[org.id,email,passwordHash,name])).rows[0];
    await ensureOrganizationNetwork(c,org.id,{name:org.name,createdBy:user.id});
    await ensureMembership(c,{organizationId:org.id,userId:user.id,role:'owner',createdBy:user.id});
    await c.query('INSERT INTO organization_settings(organization_id) VALUES($1)',[org.id]);return {org,user};
  });
  await audit(req,'admin.demo_account_created','organization',result.org.id,{email,trialEndsAt:result.org.trial_ends_at});
  res.setHeader('Cache-Control','no-store, private');
  res.status(201).json({ok:true,organization:{id:result.org.id,name:result.org.name,trialEndsAt:result.org.trial_ends_at},credentials:{email,password},loginUrl:`${config.appUrl}/login.html`,warning:'Le mot de passe est affiché une seule fois. Conservez-le maintenant.'});
}));

r.patch('/organizations/:id',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const d=z.object({status:z.enum(['active','suspended']).optional(),subscriptionStatus:z.enum(['trialing','active','past_due','unpaid','canceled','paused']).optional(),trialEndsAt:z.string().datetime().optional()}).parse(req.body);
  const {rows}=await q(`UPDATE organizations SET status=COALESCE($1,status),subscription_status=COALESCE($2,subscription_status),trial_ends_at=COALESCE($3::timestamptz,trial_ends_at) WHERE id=$4 RETURNING *`,[d.status??null,d.subscriptionStatus??null,d.trialEndsAt??null,id]);
  if(!rows[0])throw new HttpError(404,'Entreprise introuvable.');await audit(req,'admin.organization_update','organization',id,d);res.json(rows[0]);
}));
r.delete('/organizations/:id',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const d=z.object({confirmation:z.literal('SUPPRIMER'),adminPassword:z.string().min(1).max(200)}).parse(req.body);
  if(!(await verifyPassword(req.admin.password_hash,d.adminPassword)))throw new HttpError(401,'Mot de passe administrateur incorrect.');
  const org=(await q('SELECT stripe_subscription_id,network_id FROM organizations WHERE id=$1',[id])).rows[0];
  if(!org)throw new HttpError(404,'Entreprise introuvable.');
  const networkSites=Number((await q(`SELECT count(*)::int n FROM organizations WHERE network_id=$1 AND status<>'deleted'`,[org.network_id||id])).rows[0]?.n||1);
  if(networkSites>1)throw new HttpError(409,'Cette entreprise appartient à un réseau multisite. Archivez ou retirez d’abord les établissements secondaires depuis la gestion Réseau.','network_delete_blocked');
  if(org.stripe_subscription_id){const stripe=stripeClient();if(!stripe)throw new HttpError(503,'Stripe est indisponible : suppression bloquée pour éviter une facturation orpheline.','stripe_required_for_delete');try{await stripe.subscriptions.cancel(org.stripe_subscription_id)}catch{throw new HttpError(502,'La résiliation Stripe a échoué. L’entreprise n’a pas été supprimée.','stripe_cancel_failed')}}
  const media=(await q('SELECT storage_key FROM media WHERE organization_id=$1',[id])).rows;for(const m of media)await deleteStored(m.storage_key);
  await audit(req,'admin.organization_delete','organization',id);
  await tx(async c=>{const net=(await c.query('SELECT network_id FROM organizations WHERE id=$1 FOR UPDATE',[id])).rows[0]?.network_id;if(net){await c.query('UPDATE organizations SET network_id=NULL WHERE id=$1',[id]);await c.query('DELETE FROM organization_networks WHERE id=$1',[net]);}await c.query('DELETE FROM organizations WHERE id=$1',[id]);});res.json({ok:true});
}));

r.get('/promos',requireAdmin,require2fa,asyncRoute(async(req,res)=>{res.json((await q('SELECT * FROM promo_codes ORDER BY created_at DESC')).rows);}));
r.post('/promos',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const d=z.object({code:z.string().trim().regex(/^[A-Za-z0-9_-]{2,30}$/),percentOff:z.number().int().min(1).max(90),maxRedemptions:z.number().int().positive().nullable().optional(),endsAt:z.string().datetime().nullable().optional()}).parse(req.body);
  const {rows}=await q(`INSERT INTO promo_codes(code,percent_off,max_redemptions,ends_at) VALUES(upper($1),$2,$3,$4) RETURNING *`,[d.code,d.percentOff,d.maxRedemptions??null,d.endsAt??null]);
  await audit(req,'admin.promo_create','promo',rows[0].id,{code:rows[0].code});res.status(201).json(rows[0]);
}));
r.patch('/promos/:id',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);const d=z.object({active:z.boolean().optional(),endsAt:z.string().datetime().nullable().optional()}).parse(req.body);
  const {rows}=await q(`UPDATE promo_codes SET active=COALESCE($1,active),ends_at=COALESCE($2::timestamptz,ends_at) WHERE id=$3 RETURNING *`,[d.active??null,d.endsAt??null,id]);
  if(!rows[0])throw new HttpError(404,'Code promo introuvable.');res.json(rows[0]);
}));

r.get('/audit',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const {rows}=await q(`SELECT a.*,COALESCE(ad.email,u.email,'Système') actor,o.name organization_name
    FROM audit_logs a LEFT JOIN admin_users ad ON ad.id=a.actor_admin_id LEFT JOIN users u ON u.id=a.actor_user_id LEFT JOIN organizations o ON o.id=a.organization_id
    ORDER BY a.created_at DESC LIMIT 750`);res.json(rows);
}));
r.get('/incidents',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  res.json((await q(`SELECT i.*,o.name organization_name FROM system_incidents i LEFT JOIN organizations o ON o.id=i.organization_id ORDER BY (i.resolved_at IS NULL) DESC,i.created_at DESC LIMIT 500`)).rows);
}));
r.patch('/incidents/:id',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const id=z.coerce.number().int().positive().parse(req.params.id);const d=z.object({resolved:z.boolean()}).parse(req.body);
  const {rows}=await q(`UPDATE system_incidents SET resolved_at=CASE WHEN $1 THEN now() ELSE NULL END WHERE id=$2 RETURNING *`,[d.resolved,id]);
  if(!rows[0])throw new HttpError(404,'Incident introuvable.');res.json(rows[0]);
}));
r.get('/site-settings',requireAdmin,require2fa,asyncRoute(async(req,res)=>res.json((await q('SELECT * FROM site_settings WHERE id=1')).rows[0])));
r.patch('/site-settings',requireAdmin,require2fa,asyncRoute(async(req,res)=>{
  const d=z.object({heroTitle:z.string().min(2).max(160).optional(),heroSubtitle:z.string().max(260).optional(),heroVideoUrl:z.string().url().max(1000).nullable().optional(),heroFallbackUrl:z.string().url().max(1000).nullable().optional(),supportEmail:z.string().email().nullable().optional(),legal:z.record(z.string(),z.string().max(1000)).optional()}).parse(req.body);
  const {rows}=await q(`UPDATE site_settings SET hero_title=COALESCE($1,hero_title),hero_subtitle=COALESCE($2,hero_subtitle),hero_video_url=COALESCE($3,hero_video_url),hero_fallback_url=COALESCE($4,hero_fallback_url),support_email=COALESCE($5,support_email),legal=COALESCE($6,legal),updated_at=now() WHERE id=1 RETURNING *`,[d.heroTitle??null,d.heroSubtitle??null,d.heroVideoUrl??null,d.heroFallbackUrl??null,d.supportEmail??null,d.legal??null]);
  await audit(req,'admin.site_settings','site','1');res.json(rows[0]);
}));
r.post('/site-media',requireAdmin,require2fa,upload.single('file'),asyncRoute(async(req,res)=>{
  if(!req.file)throw new HttpError(400,'Fichier manquant.');
  try{
    const head=await readHead(req.file.path);let actual;try{actual=validateFileBuffer(head,ADMIN_MEDIA)}catch{throw new HttpError(415,'Le contenu réel du fichier n’est pas autorisé.','invalid_file_signature')}
    const kind=actual.mime.startsWith('video/')?'hero-video':'hero-image';const stored=await storeFile(req.file.path,{organizationId:'public',mimeType:actual.mime,kind});
    if(kind==='hero-video')await q('UPDATE site_settings SET hero_video_url=$1 WHERE id=1',[stored.url]);else await q('UPDATE site_settings SET hero_fallback_url=$1 WHERE id=1',[stored.url]);
    await audit(req,'admin.site_media','site','1',{kind,mime:actual.mime,size:req.file.size});res.status(201).json({url:stored.url,kind});
  } finally {await fs.rm(req.file.path,{force:true}).catch(()=>{});}
}));
export default r;
