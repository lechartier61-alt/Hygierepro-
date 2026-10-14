import { q } from '../db.js';
import { config } from '../config.js';
import { APP_VERSION } from '../version.js';
import { tokenHash } from '../utils/crypto.js';
import { HttpError } from '../utils/http.js';

function parseCookies(req){
  const raw=req.headers.cookie||''; const out={};
  raw.split(';').forEach(p=>{const i=p.indexOf('=');if(i>0){try{out[decodeURIComponent(p.slice(0,i).trim())]=decodeURIComponent(p.slice(i+1).trim())}catch{}}});
  return out;
}
export const cookieOpts=(maxAgeMs)=>({httpOnly:true,secure:config.sessionCookieSecure,sameSite:'strict',path:'/',maxAge:maxAgeMs,priority:'high'});

export async function loadUser(req,res,next){
  try{
    const token=parseCookies(req).hp_session;if(!token)return next();
    const {rows}=await q(`SELECT s.id session_id,s.csrf_token,s.expires_at,s.last_seen_at,s.active_organization_id,
      u.id,u.email,u.name,u.avatar_url,u.active,u.email_verified,u.last_login_at,u.created_at,u.updated_at,u.ux_tutorial_version,u.ui_preferences,
      u.organization_id home_organization_id,ao.id organization_id,ao.name organization_name,ao.status organization_status,
      am.role,ao.onboarding_completed,ao.onboarding_step,
      COALESCE(net.id,ao.id) network_id,COALESCE(net.primary_organization_id,ao.id) network_primary_organization_id,
      COALESCE(net.billing_organization_id,ao.id) billing_organization_id,
      bo.trial_ends_at,bo.subscription_status,bo.monthly_amount_cents,bo.current_period_end
      FROM sessions s JOIN users u ON u.id=s.user_id
      JOIN LATERAL (
        SELECT o.*,m.role membership_role
        FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
        WHERE m.user_id=u.id AND m.active=true AND o.status='active'
        ORDER BY CASE WHEN o.id=s.active_organization_id THEN 0 WHEN o.id=u.organization_id THEN 1 ELSE 2 END,o.created_at
        LIMIT 1
      ) ao ON true
      JOIN organization_memberships am ON am.organization_id=ao.id AND am.user_id=u.id AND am.active=true
      LEFT JOIN organization_networks net ON net.id=ao.network_id
      JOIN organizations bo ON bo.id=COALESCE(net.billing_organization_id,ao.id)
      WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[tokenHash(token)]);
    if(!rows[0])return next();
    req.user=rows[0];req.sessionId=rows[0].session_id;req.csrfToken=rows[0].csrf_token;
    if(req.user.active_organization_id!==req.user.organization_id)q('UPDATE sessions SET active_organization_id=$1 WHERE id=$2',[req.user.organization_id,req.sessionId]).catch(()=>{});
    if(Date.now()-new Date(rows[0].last_seen_at).getTime()>5*60*1000){
      await Promise.all([
        q(`UPDATE sessions SET last_seen_at=now() WHERE id=$1`,[req.sessionId]).catch(()=>{}),
        q(`UPDATE organizations SET last_activity_at=now(),app_version=$1 WHERE id=$2`,[APP_VERSION,req.user.organization_id]).catch(()=>{})
      ]);
    }
    next();
  }catch(e){next(e)}
}
export async function loadAdmin(req,res,next){
  try{
    const token=parseCookies(req).hp_admin;if(!token)return next();
    const {rows}=await q(`SELECT s.id session_id,s.csrf_token,s.last_seen_at,a.* FROM admin_sessions s JOIN admin_users a ON a.id=s.admin_user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.active=true`,[tokenHash(token)]);
    if(rows[0]){
      req.admin=rows[0];req.adminSessionId=rows[0].session_id;req.adminCsrfToken=rows[0].csrf_token;
      if(Date.now()-new Date(rows[0].last_seen_at).getTime()>5*60*1000)q('UPDATE admin_sessions SET last_seen_at=now() WHERE id=$1',[req.adminSessionId]).catch(()=>{});
    }
    next();
  }catch(e){next(e)}
}
export const requireUser=(req,res,next)=>req.user?next():next(new HttpError(401,'Connexion requise','auth_required'));
export const requireAdmin=(req,res,next)=>req.admin?next():next(new HttpError(401,'Administration : connexion requise','admin_auth_required'));
export const requireVerified=(req,res,next)=>req.user?.email_verified?next():next(new HttpError(403,'Vérifiez votre adresse e-mail avant de continuer.','email_verification_required'));
export const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user?.role)?next():next(new HttpError(403,'Action non autorisée','forbidden'));
export function requireCsrf(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const supplied=req.get('x-csrf-token');
  const expected=req.admin?req.adminCsrfToken:req.csrfToken;
  if(!expected||supplied!==expected)return next(new HttpError(403,'Session de sécurité expirée. Rechargez la page.','csrf'));
  next();
}
export function requireSubscription(req,res,next){
  if(!req.user)return next();
  const path=req.path;
  if(['/me','/logout'].includes(path)||path.startsWith('/billing')||path.startsWith('/account')||path.startsWith('/email-verification'))return next();
  if(req.user.organization_status!=='active')return next(new HttpError(403,'Établissement désactivé.','organization_suspended'));
  const trialOk=new Date(req.user.trial_ends_at)>new Date();
  const paid=['active','trialing'].includes(req.user.subscription_status)&&(req.user.subscription_status==='active'||trialOk);
  if(!paid)return next(new HttpError(402,'Votre essai ou abonnement est arrivé à échéance.','subscription_required'));
  next();
}
