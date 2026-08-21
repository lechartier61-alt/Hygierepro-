import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { config, isProd } from '../config.js';
import { HttpError } from '../utils/http.js';
import { q } from '../db.js';

export const helmetMiddleware=helmet({
  contentSecurityPolicy:{directives:{
    defaultSrc:["'self'"],
    imgSrc:["'self'","data:","blob:","https:"],
    mediaSrc:["'self'","blob:","https:"],
    scriptSrc:["'self'"],
    styleSrc:["'self'","'unsafe-inline'"],
    connectSrc:["'self'"],
    fontSrc:["'self'","data:"],
    objectSrc:["'none'"],
    baseUri:["'self'"],
    formAction:["'self'"],
    frameAncestors:["'none'"]
  }},
  referrerPolicy:{policy:'strict-origin-when-cross-origin'},
  strictTransportSecurity:isProd?{maxAge:31536000,includeSubDomains:true}:false
});

export function extraSecurityHeaders(req,res,next){
  res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=(), payment=(self)');
  if(req.path.startsWith('/api/')) res.setHeader('Cache-Control','no-store');
  next();
}

const AUTH_WINDOW_MINUTES=15;
const AUTH_LIMIT=12;
export async function authLimiter(req,res,next){
  try{
    const endpoint=String(req.originalUrl||req.baseUrl||req.path||'/').split('?')[0];
    const raw=`${req.ip||req.socket?.remoteAddress||'unknown'}|${req.method}|${endpoint}`;
    const rateKey=crypto.createHash('sha256').update(raw).digest('hex');
    const {rows}=await q(`
      INSERT INTO security_rate_limits(rate_key,hits,reset_at)
      VALUES($1,1,now()+($2::text||' minutes')::interval)
      ON CONFLICT(rate_key) DO UPDATE SET
        hits=CASE WHEN security_rate_limits.reset_at<=now() THEN 1 ELSE security_rate_limits.hits+1 END,
        reset_at=CASE WHEN security_rate_limits.reset_at<=now() THEN now()+($2::text||' minutes')::interval ELSE security_rate_limits.reset_at END
      RETURNING hits,reset_at`,[rateKey,AUTH_WINDOW_MINUTES]);
    const item=rows[0];
    const remaining=Math.max(0,AUTH_LIMIT-Number(item.hits||0));
    res.setHeader('RateLimit-Limit',String(AUTH_LIMIT));
    res.setHeader('RateLimit-Remaining',String(remaining));
    res.setHeader('RateLimit-Reset',String(Math.max(1,Math.ceil((new Date(item.reset_at).getTime()-Date.now())/1000))));
    if(Number(item.hits)>AUTH_LIMIT){
      return res.status(429).json({error:'Trop de tentatives. Réessayez plus tard.',code:'rate_limited'});
    }
    res.once('finish',()=>{
      if(res.statusCode<400) q('DELETE FROM security_rate_limits WHERE rate_key=$1',[rateKey]).catch(()=>{});
    });
    next();
  }catch(err){
    next(err);
  }
}
export const apiLimiter=rateLimit({windowMs:60*1000,limit:300,standardHeaders:'draft-8',legacyHeaders:false});

function normalizeOrigin(value){
  if(!value) return null;
  const candidate=/^https?:\/\//i.test(value)?value:`https://${value}`;
  try{return new URL(candidate).origin}catch{return null}
}
function configuredOrigins(){
  return new Set([
    normalizeOrigin(config.appUrl),
    normalizeOrigin(config.publicSiteUrl),
    normalizeOrigin(config.railwayPublicDomain),
    ...(config.allowedOrigins||[]).map(normalizeOrigin)
  ].filter(Boolean));
}
export function sameOrigin(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  let rawOrigin=req.get('origin');
  if(!rawOrigin){
    const fetchSite=String(req.get('sec-fetch-site')||'').toLowerCase();
    if(fetchSite&& !['same-origin','none'].includes(fetchSite))return next(new HttpError(403,'Origine non autorisée','origin_forbidden'));
    const referer=req.get('referer');
    if(referer)rawOrigin=referer;
    else return next(); // clients non-navigateurs : l'authentification et le CSRF restent appliqués.
  }
  const origin=normalizeOrigin(rawOrigin);
  if(!origin) return next(new HttpError(403,'Origine non autorisée','origin_forbidden'));

  const allowed=configuredOrigins();
  // Une requête réellement same-origin doit rester autorisée même derrière un domaine
  // personnalisé Railway. Le navigateur fixe Origin et Host ; un site tiers conserve
  // son propre Origin et sera donc refusé. Les origines explicites restent utiles
  // pour les alias (www / domaine nu) et les accès directs Railway.
  const requestOrigin=normalizeOrigin(`${req.protocol}://${req.get('host')}`);
  if(requestOrigin && origin===requestOrigin) return next();
  if(!isProd && requestOrigin) allowed.add(requestOrigin);

  if(!allowed.has(origin)){
    console.warn('[security] origine refusée',{origin,configured:[...allowed]});
    return next(new HttpError(403,'Origine non autorisée','origin_forbidden'));
  }
  next();
}
