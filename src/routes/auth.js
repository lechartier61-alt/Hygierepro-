import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { q, tx } from '../db.js';
import { config } from '../config.js';
import { hashPassword, verifyPassword, randomToken, tokenHash, passwordNeedsRehash } from '../utils/crypto.js';
import { passwordSchema } from '../utils/validation.js';
import { slugify } from '../utils/slug.js';
import { asyncRoute, HttpError, ipOf } from '../utils/http.js';
import { cookieOpts, requireUser, roles, requireSubscription } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { sendMail, emailProviderConfigured } from '../services/mailer.js';
import { verificationEmail, passwordResetEmail, invitationEmail } from '../services/email-templates.js';
import { legalAcceptanceState, saveLegalAcceptances } from '../legal.js';
import { ensureOrganizationNetwork, ensureMembership } from '../services/network.js';

const r=Router();
const registerSchema=z.object({
  organizationName:z.string().trim().min(2).max(120),
  businessType:z.enum(['restaurant','snack','boulangerie','pizzeria','autre']).default('restaurant'),
  name:z.string().trim().min(2).max(100),
  email:z.string().trim().email().max(160),
  password:passwordSchema,
  cgvAccepted:z.literal(true),
  cguAccepted:z.literal(true),
  dpaAccepted:z.literal(true),
  privacyAcknowledged:z.literal(true)
});
const loginSchema=z.object({email:z.string().trim().email().max(160),password:z.string().min(1).max(200),remember:z.boolean().optional()});
const workDaySchema=z.object({weekday:z.number().int().min(1).max(7),active:z.boolean().default(true),startTime:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),endTime:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional()}).superRefine((d,ctx)=>{if(d.active&&(!d.startTime||!d.endTime||d.startTime>=d.endTime))ctx.addIssue({code:'custom',message:'L’heure de fin doit être après l’heure de début.'})});
const scheduleSchema=z.object({days:z.array(workDaySchema).max(7)});
async function uniqueSlug(client,name){let base=slugify(name)||'etablissement',candidate=base,i=1;while((await client.query('SELECT 1 FROM organizations WHERE slug=$1',[candidate])).rowCount){candidate=`${base}-${++i}`;}return candidate;}
async function createSession(res,userId,{remember=false,userAgent='',ip=null,activeOrganizationId=null}={}){
  const token=randomToken(),csrf=randomToken(24); const ttl=remember?config.trustedSessionDays*86400000:config.sessionTtlHours*3600000;
  if(!activeOrganizationId){
    const preferred=(await q(`SELECT m.organization_id FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id JOIN users u ON u.id=m.user_id
      WHERE m.user_id=$1 AND m.active=true AND o.status='active' ORDER BY CASE WHEN m.organization_id=u.organization_id THEN 0 ELSE 1 END,o.created_at LIMIT 1`,[userId])).rows[0];
    activeOrganizationId=preferred?.organization_id||null;
  }
  await q(`INSERT INTO sessions(user_id,token_hash,csrf_token,user_agent,ip,active_organization_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+($7||' milliseconds')::interval)`,[userId,tokenHash(token),csrf,String(userAgent).slice(0,500),ip,activeOrganizationId,String(ttl)]);
  res.cookie('hp_session',token,cookieOpts(ttl)); return csrf;
}
async function issueVerification(user,{force=false}={}){
  if(!emailProviderConfigured()&&config.env==='production') throw new HttpError(503,'Le service e-mail doit être configuré avant de créer de nouveaux comptes.','email_required');
  if(!force){
    const recent=(await q(`SELECT 1 FROM email_verifications WHERE user_id=$1 AND used_at IS NULL AND created_at>now()-interval '60 seconds'`,[user.id])).rowCount;
    if(recent) throw new HttpError(429,'Un e-mail vient déjà d’être envoyé. Attendez une minute.','verification_throttled');
  }
  const token=randomToken();
  await tx(async c=>{
    await c.query(`UPDATE email_verifications SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`,[user.id]);
    await c.query(`INSERT INTO email_verifications(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '24 hours')`,[user.id,tokenHash(token)]);
  });
  const url=`${config.appUrl}/verify-email.html?token=${encodeURIComponent(token)}`;
  await sendMail({to:user.email,...verificationEmail({name:user.name,url})});
  return token;
}

r.post('/register',asyncRoute(async(req,res)=>{
  if(!emailProviderConfigured()&&config.env==='production')throw new HttpError(503,'Les inscriptions sont temporairement indisponibles : le service e-mail n’est pas configuré.','email_required');
  const data=registerSchema.parse(req.body); const email=data.email.toLowerCase();
  const out=await tx(async c=>{
    if((await c.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email])).rowCount) throw new HttpError(409,'Cette adresse e-mail possède déjà un compte.','email_exists');
    const slug=await uniqueSlug(c,data.organizationName); const ph=await hashPassword(data.password);
    const org=(await c.query(`INSERT INTO organizations(name,slug,business_type,trial_started_at,trial_ends_at,subscription_status,monthly_amount_cents) VALUES($1,$2,$3,now(),now()+interval '14 days','trialing',$4) RETURNING *`,[data.organizationName,slug,data.businessType,config.stripe.amountCents])).rows[0];
    const user=(await c.query(`INSERT INTO users(organization_id,email,password_hash,name,role,email_verified) VALUES($1,$2,$3,$4,'owner',false) RETURNING id,organization_id,email,name,role,email_verified`,[org.id,email,ph,data.name])).rows[0];
    await ensureOrganizationNetwork(c,org.id,{name:org.name,createdBy:user.id});
    await ensureMembership(c,{organizationId:org.id,userId:user.id,role:'owner',createdBy:user.id});
    await c.query(`INSERT INTO organization_settings(organization_id) VALUES($1)`,[org.id]);
    await saveLegalAcceptances(c,{organizationId:org.id,userId:user.id,ip:ipOf(req)||null,userAgent:req.get('user-agent')||''});
    await c.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata,ip) VALUES($1,$2,'organization.created','organization',$3,$4,$5)`,[org.id,user.id,String(org.id),{trialEndsAt:org.trial_ends_at},ipOf(req)||null]);
    return {org,user};
  });
  const csrf=await createSession(res,out.user.id,{remember:true,userAgent:req.get('user-agent')||'',ip:ipOf(req)||null});
  let emailSent=true,verificationToken=null;try{verificationToken=await issueVerification(out.user,{force:true})}catch(e){emailSent=false;console.error('[email-verification]',e.message)}
  res.status(201).json({user:out.user,organization:{id:out.org.id,name:out.org.name,trialEndsAt:out.org.trial_ends_at,onboardingCompleted:false},csrf,emailSent,next:'/verify-email.html',...(config.env==='test'&&verificationToken?{verificationToken}:{})});
}));

r.post('/login',asyncRoute(async(req,res)=>{
  const data=loginSchema.parse(req.body);
  const {rows}=await q(`SELECT u.* FROM users u WHERE lower(u.email)=lower($1) AND EXISTS (SELECT 1 FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id AND m.active=true AND o.status='active')`,[data.email.toLowerCase()]);
  const u=rows[0];let passwordOk=false;
  if(u?.password_hash){try{passwordOk=await verifyPassword(u.password_hash,data.password)}catch(e){console.warn('[auth] hash invalide',u.id)}}
  else {try{await hashPassword(data.password)}catch{}} // rapproche le coût des réponses pour limiter l'énumération temporelle.
  if(!u||!u.active||!passwordOk) throw new HttpError(401,'E-mail ou mot de passe incorrect.','bad_credentials');
  if(passwordNeedsRehash(u.password_hash))await q('UPDATE users SET password_hash=$1 WHERE id=$2',[await hashPassword(data.password),u.id]);
  await q(`UPDATE users SET last_login_at=now() WHERE id=$1`,[u.id]);
  const csrf=await createSession(res,u.id,{remember:!!data.remember,userAgent:req.get('user-agent')||'',ip:ipOf(req)||null});
  req.user=u;await audit(req,'auth.login','user',u.id);
  res.json({ok:true,csrf,emailVerified:!!u.email_verified,next:u.email_verified?'/app.html':'/verify-email.html'});
}));

r.post('/logout',requireUser,asyncRoute(async(req,res)=>{await q('DELETE FROM sessions WHERE id=$1',[req.sessionId]);res.clearCookie('hp_session',{...cookieOpts(0),maxAge:0});await audit(req,'auth.logout','user',req.user.id);res.json({ok:true});}));

r.get('/me',requireUser,asyncRoute(async(req,res)=>{
  const {rows}=await q(`SELECT o.id,o.name,o.slug,o.business_type,o.timezone,o.onboarding_completed,o.onboarding_step,o.trial_started_at,o.trial_ends_at,o.subscription_status,o.monthly_amount_cents,o.current_period_end,o.status,o.network_id FROM organizations o WHERE o.id=$1`,[req.user.organization_id]);
  const legal=req.user.role==='owner'?await legalAcceptanceState({query:q},req.user.id):{complete:true,missing:[],versions:{}};
  res.json({user:{id:req.user.id,name:req.user.name,email:req.user.email,emailVerified:!!req.user.email_verified,role:req.user.role,avatarUrl:req.user.avatar_url,tutorialVersion:Number(req.user.ux_tutorial_version||0),preferences:req.user.ui_preferences||{},legalAcceptanceComplete:legal.complete,legalMissing:legal.missing},organization:{...rows[0],networkPrimaryOrganizationId:req.user.network_primary_organization_id,billingOrganizationId:req.user.billing_organization_id},network:{id:req.user.network_id,primaryOrganizationId:req.user.network_primary_organization_id,billingOrganizationId:req.user.billing_organization_id},legalVersions:legal.versions,csrf:req.csrfToken});
}));

r.get('/email-verification/status',requireUser,asyncRoute(async(req,res)=>res.json({verified:!!req.user.email_verified,email:req.user.email})));
r.post('/email-verification/resend',requireUser,asyncRoute(async(req,res)=>{
  if(req.user.email_verified)return res.json({ok:true,verified:true});
  await issueVerification({id:req.user.id,email:req.user.email,name:req.user.name});
  res.json({ok:true,message:'E-mail de vérification renvoyé.'});
}));
r.post('/email-verification/verify',asyncRoute(async(req,res)=>{
  const token=z.string().min(20).max(500).parse(req.body?.token);const h=tokenHash(token);
  const user=await tx(async c=>{
    const row=(await c.query(`SELECT ev.id,ev.user_id,u.email_verified FROM email_verifications ev JOIN users u ON u.id=ev.user_id WHERE ev.token_hash=$1 AND ev.used_at IS NULL AND ev.expires_at>now() FOR UPDATE`,[h])).rows[0];
    if(!row)throw new HttpError(400,'Lien de vérification invalide ou expiré.','verification_invalid');
    await c.query('UPDATE users SET email_verified=true WHERE id=$1',[row.user_id]);
    await c.query('UPDATE email_verifications SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[row.user_id]);
    return row.user_id;
  });
  if(req.user?.id===user)await audit(req,'auth.email_verified','user',user);
  res.json({ok:true,next:'/app.html#onboarding'});
}));

r.get('/invite/:token',asyncRoute(async(req,res)=>{
  const token=z.string().min(20).max(500).parse(req.params.token);
  const {rows}=await q(`SELECT i.id,i.email,i.name,i.role,i.expires_at,i.accepted_at,o.name organization_name FROM invites i JOIN organizations o ON o.id=i.organization_id WHERE i.token_hash=$1`,[tokenHash(token)]);
  if(!rows[0]||rows[0].accepted_at||new Date(rows[0].expires_at)<new Date())throw new HttpError(404,'Invitation invalide ou expirée.','invite_invalid');res.json(rows[0]);
}));
r.post('/invite/:token/accept',asyncRoute(async(req,res)=>{
  const data=z.object({password:passwordSchema,name:z.string().trim().min(2).max(100).optional()}).parse(req.body);const h=tokenHash(z.string().min(20).max(500).parse(req.params.token));
  const user=await tx(async c=>{
    const inv=(await c.query(`SELECT * FROM invites WHERE token_hash=$1 FOR UPDATE`,[h])).rows[0];
    if(!inv||inv.accepted_at||new Date(inv.expires_at)<new Date())throw new HttpError(404,'Invitation invalide ou expirée.','invite_invalid');
    if((await c.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[inv.email])).rowCount)throw new HttpError(409,'Un compte existe déjà avec cet e-mail.','email_exists');
    const ph=await hashPassword(data.password);
    const u=(await c.query(`INSERT INTO users(organization_id,email,password_hash,name,role,email_verified) VALUES($1,$2,$3,$4,$5,true) RETURNING id,organization_id,email,name,role,email_verified`,[inv.organization_id,inv.email,ph,data.name||inv.name,inv.role])).rows[0];
    await ensureMembership(c,{organizationId:inv.organization_id,userId:u.id,role:inv.role,createdBy:inv.created_by||null});
    await c.query('UPDATE invites SET accepted_at=now() WHERE id=$1',[inv.id]);return u;
  });
  const csrf=await createSession(res,user.id,{remember:true,userAgent:req.get('user-agent')||'',ip:ipOf(req)||null});res.status(201).json({ok:true,user,csrf,next:'/app.html'});
}));

async function forgotEmailAllowed(email){
  const rateKey=tokenHash(`forgot-email|${email}`);
  const {rows}=await q(`INSERT INTO security_rate_limits(rate_key,hits,reset_at) VALUES($1,1,now()+interval '15 minutes')
    ON CONFLICT(rate_key) DO UPDATE SET hits=CASE WHEN security_rate_limits.reset_at<=now() THEN 1 ELSE security_rate_limits.hits+1 END,
      reset_at=CASE WHEN security_rate_limits.reset_at<=now() THEN now()+interval '15 minutes' ELSE security_rate_limits.reset_at END
    RETURNING hits`,[rateKey]);
  return Number(rows[0]?.hits||0)<=3;
}

r.post('/forgot-password',asyncRoute(async(req,res)=>{
  const email=z.string().trim().email().max(160).parse(req.body.email).toLowerCase();
  if(!await forgotEmailAllowed(email))return res.json({ok:true,message:'Si ce compte existe, un e-mail a été envoyé.'});
  const {rows}=await q('SELECT id,name FROM users WHERE lower(email)=lower($1) AND active=true',[email]);
  if(rows[0]){
    const token=randomToken();
    await tx(async c=>{
      await c.query(`UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`,[rows[0].id]);
      await c.query(`INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')`,[rows[0].id,tokenHash(token)]);
    });
    const url=`${config.appUrl}/reset.html?token=${encodeURIComponent(token)}`;
    await sendMail({to:email,...passwordResetEmail({name:rows[0].name,url})});
  }
  res.json({ok:true,message:'Si ce compte existe, un e-mail a été envoyé.'});
}));
r.post('/reset-password',asyncRoute(async(req,res)=>{
  const data=z.object({token:z.string().min(20).max(500),password:passwordSchema}).parse(req.body);const h=tokenHash(data.token);
  await tx(async c=>{
    const row=(await c.query(`SELECT * FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`,[h])).rows[0];
    if(!row)throw new HttpError(400,'Lien invalide ou expiré.','reset_invalid');
    const ph=await hashPassword(data.password);
    await c.query('UPDATE users SET password_hash=$1,email_verified=true WHERE id=$2',[ph,row.user_id]);
    await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[row.user_id]);
    await c.query('DELETE FROM sessions WHERE user_id=$1',[row.user_id]);
    await c.query('UPDATE email_verifications SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[row.user_id]);
  });res.json({ok:true});
}));

r.get('/team',requireUser,requireSubscription,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const {rows}=await q(`SELECT u.id,u.name,u.email,m.role,u.avatar_url,u.last_login_at,m.active,u.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('weekday',s.weekday,'active',s.active,'startTime',to_char(s.start_time,'HH24:MI'),'endTime',to_char(s.end_time,'HH24:MI')) ORDER BY s.weekday) FROM employee_schedules s WHERE s.user_id=u.id AND s.organization_id=$1),'[]'::jsonb) schedule
    FROM organization_memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.role,u.name`,[req.user.organization_id]);
  res.json(rows);
}));
r.put('/team/:id/schedule',requireUser,requireSubscription,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);const data=scheduleSchema.parse(req.body);
  const target=(await q(`SELECT u.id,u.name,m.role FROM users u JOIN organization_memberships m ON m.user_id=u.id AND m.organization_id=$2 WHERE u.id=$1 AND u.active=true AND m.active=true`,[id,req.user.organization_id])).rows[0];
  if(!target)throw new HttpError(404,'Utilisateur introuvable.');
  if(target.role!=='employee')throw new HttpError(403,'Les horaires de température sont configurés uniquement pour les comptes employés.','schedule_forbidden');
  const unique=new Map();for(const d of data.days)unique.set(d.weekday,d);
  await tx(async c=>{
    await c.query(`DELETE FROM employee_schedules WHERE organization_id=$1 AND user_id=$2`,[req.user.organization_id,id]);
    for(const d of unique.values())if(d.active)await c.query(`INSERT INTO employee_schedules(organization_id,user_id,weekday,active,start_time,end_time,created_by) VALUES($1,$2,$3,true,$4::time,$5::time,$6)`,[req.user.organization_id,id,d.weekday,d.startTime,d.endTime,req.user.id]);
  });
  const schedule=(await q(`SELECT weekday,active,to_char(start_time,'HH24:MI') "startTime",to_char(end_time,'HH24:MI') "endTime" FROM employee_schedules WHERE user_id=$1 AND organization_id=$2 ORDER BY weekday`,[id,req.user.organization_id])).rows;
  await audit(req,'team.schedule_updated','user',id,{days:schedule});res.json({ok:true,userId:id,schedule});
}));
r.post('/team/invite',requireUser,requireSubscription,roles('owner'),asyncRoute(async(req,res)=>{
  const data=z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(160),role:z.enum(['manager','employee'])}).parse(req.body);
  const email=data.email.toLowerCase();const token=randomToken();
  await tx(async c=>{
    if((await c.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email])).rowCount)throw new HttpError(409,'Cette adresse possède déjà un compte.','email_exists');
    await c.query(`UPDATE invites SET accepted_at=now() WHERE organization_id=$1 AND lower(email)=lower($2) AND accepted_at IS NULL`,[req.user.organization_id,email]);
    await c.query(`INSERT INTO invites(organization_id,email,name,role,token_hash,created_by) VALUES($1,$2,$3,$4,$5,$6)`,[req.user.organization_id,email,data.name,data.role,tokenHash(token),req.user.id]);
  });
  const url=`${config.appUrl}/invite.html?token=${encodeURIComponent(token)}`;
  await sendMail({to:email,...invitationEmail({name:data.name,inviterName:req.user.name,organizationName:req.user.organization_name||'votre établissement',role:data.role,url})});
  await audit(req,'team.invite','invite',email,{role:data.role});res.status(201).json({ok:true,inviteUrl:url,qr:await QRCode.toDataURL(url)});
}));
r.patch('/team/:id',requireUser,requireSubscription,roles('owner'),asyncRoute(async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  const data=z.object({name:z.string().trim().min(2).max(100).optional(),role:z.enum(['manager','employee']).optional(),active:z.boolean().optional()}).parse(req.body);
  if(id===req.user.id)throw new HttpError(400,'Modifiez votre profil depuis Mon profil.');
  const current=(await q(`SELECT m.*,u.name,u.email FROM organization_memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.organization_id=$2`,[id,req.user.organization_id])).rows[0];
  if(!current||current.role==='owner')throw new HttpError(404,'Utilisateur introuvable.');
  await tx(async c=>{
    if(data.name)await c.query('UPDATE users SET name=$1 WHERE id=$2',[data.name,id]);
    await c.query(`UPDATE organization_memberships SET role=COALESCE($1,role),active=COALESCE($2,active),updated_at=now() WHERE user_id=$3 AND organization_id=$4`,[data.role??null,data.active??null,id,req.user.organization_id]);
    // v6.8.0: role/activation are scoped to the establishment through memberships.
    // Never disable the global user account when removing access from one site.
  });
  const row=(await q(`SELECT u.id,u.name,u.email,m.role,m.active FROM organization_memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.organization_id=$2`,[id,req.user.organization_id])).rows[0];
  await audit(req,'team.update','user',id,data);res.json(row);
}));

export default r;
