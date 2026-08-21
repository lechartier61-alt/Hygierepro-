import express from 'express';
import path from 'node:path';
import compression from 'compression';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { config, validateProductionConfig } from './config.js';
import { q, pool } from './db.js';
import { APP_VERSION } from './version.js';
import { helmetMiddleware, authLimiter, apiLimiter, sameOrigin, extraSecurityHeaders } from './middleware/security.js';
import { loadUser, loadAdmin, requireCsrf, requireSubscription, requireVerified } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import recordsRoutes from './routes/records.js';
import mediaRoutes from './routes/media.js';
import reportRoutes from './routes/reports.js';
import billingRoutes, { stripeWebhook } from './routes/billing.js';
import accountRoutes from './routes/account.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import supplierRoutes from './routes/suppliers.js';
import scannerRoutes from './routes/scanner.js';
import { localUploadDir, ensureStorageReady, usingS3 } from './services/storage.js';
import { runRetentionCleanup } from './services/retention.js';
import { HttpError } from './utils/http.js';
import { bootstrapFirstAdmin } from './services/admin-bootstrap.js';

validateProductionConfig();
const app=express();const __dirname=path.dirname(fileURLToPath(import.meta.url));const publicDir=path.resolve(__dirname,'../public');
app.set('trust proxy',1);
app.disable('x-powered-by');
app.use((req,res,next)=>{req.requestId=String(req.get('x-request-id')||crypto.randomUUID()).slice(0,100);res.setHeader('X-Request-ID',req.requestId);next();});

// Stripe exige le corps brut pour vérifier cryptographiquement la signature.
app.post('/api/billing/webhook',express.raw({type:'application/json',limit:'2mb'}),stripeWebhook);

app.use(helmetMiddleware,extraSecurityHeaders,compression());
app.use(express.json({limit:'2mb'}));app.use(express.urlencoded({extended:false,limit:'1mb'}));
app.use('/api',apiLimiter,sameOrigin,loadUser,loadAdmin,(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const tokenAuthorized=
    req.path==='/auth/reset-password' ||
    req.path==='/auth/email-verification/verify' ||
    /^\/auth\/invite\/[^/]+\/accept$/.test(req.path);
  if(tokenAuthorized)return next();
  if(req.user||req.admin)return requireCsrf(req,res,next);
  next();
});

app.use('/api/public',publicRoutes);
for(const pathName of ['/api/auth/login','/api/auth/register','/api/auth/forgot-password','/api/auth/reset-password','/api/auth/email-verification/resend','/api/admin/auth/login'])app.use(pathName,authLimiter);

app.use('/api/auth',authRoutes);
app.use('/api/onboarding',requireVerified,requireSubscription,onboardingRoutes);
app.use('/api/records',requireVerified,requireSubscription,recordsRoutes);
app.use('/api/suppliers',requireVerified,requireSubscription,supplierRoutes);
app.use('/api/media',requireVerified,requireSubscription,mediaRoutes);
app.use('/api/scanner',requireVerified,requireSubscription,scannerRoutes);
app.use('/api/reports',requireVerified,requireSubscription,reportRoutes);
app.use('/api/billing',requireVerified,billingRoutes);
app.use('/api/account',accountRoutes);
app.use('/api/admin',adminRoutes);

app.get('/health/live',(req,res)=>res.status(200).json({ok:true,service:'HygieSafe',version:APP_VERSION}));
app.get('/health',async(req,res)=>{
  try{
    await q('SELECT 1');
    const email=(config.resend.apiKey&&config.resend.from)?'resend':(config.smtp.host?'smtp':'none');
    const stripe=!!(config.stripe.secretKey&&config.stripe.webhookSecret);
    res.json({ok:true,service:'HygieSafe',version:APP_VERSION,storage:usingS3()?'s3':'volume',integrations:{email,stripe}})
  }catch(e){
    console.error('[health] database unavailable',e?.message||e);
    res.status(503).json({ok:false,error:'database',version:APP_VERSION});
  }
});

app.use('/public-media',express.static(path.join(localUploadDir,'public'),{
  fallthrough:false,maxAge:'1h',immutable:false,
  setHeaders:res=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; img-src 'self'; media-src 'self'")}
}));
app.use((req,res,next)=>{
  if(['/login.html','/register.html','/forgot.html','/reset.html','/invite.html','/verify-email.html','/admin.html','/app.html'].includes(req.path))res.setHeader('Cache-Control','no-store');
  next();
});
app.use(express.static(publicDir,{extensions:['html'],maxAge:config.env==='production'?'5m':0}));

app.use((err,req,res,next)=>{
  const requestId=req.requestId||'unknown';
  const expectedClientError=err instanceof HttpError && Number(err.status||500)<500;
  if(expectedClientError)console.warn(`[${requestId}] ${err.status} ${err.code||'client_error'}: ${err.message}`);
  else console.error(`[${requestId}]`,err);
  if(res.headersSent)return next(err);

  if(err?.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Fichier trop volumineux.',code:'file_too_large',requestId});
  if(err?.code==='LIMIT_UNEXPECTED_FILE')return res.status(400).json({error:'Champ fichier invalide.',code:'invalid_upload',requestId});
  if(err instanceof ZodError)return res.status(400).json({error:'Informations invalides.',code:'validation',details:err.issues,requestId});
  if(err?.code==='22P02')return res.status(400).json({error:'Identifiant ou valeur invalide.',code:'invalid_value',requestId});
  if(err?.code==='23505')return res.status(409).json({error:'Cette valeur existe déjà.',code:'conflict',requestId});

  const status=err instanceof HttpError?err.status:500;
  if(status>=500){
    const stackHash=crypto.createHash('sha256').update(String(err.stack||err.message||'internal')).digest('hex').slice(0,24);
    const incidentMessage=err instanceof HttpError?String(err.message).slice(0,240):`Erreur interne ${err?.code||err?.name||'server'}`;
    q(`INSERT INTO system_incidents(organization_id,route,method,message,stack_hash) VALUES($1,$2,$3,$4,$5)`,
      [req.user?.organization_id||null,String(req.originalUrl||'').slice(0,500),req.method,incidentMessage,stackHash]).catch(()=>{});
  }
  res.status(status).json({error:status===500?'Une erreur interne est survenue.':err.message,code:err.code||'server_error',requestId});
});

await ensureStorageReady();
await bootstrapFirstAdmin();
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`[HygieSafe] v${APP_VERSION} écoute sur 0.0.0.0:${config.port}`));
runRetentionCleanup();const cleanupTimer=setInterval(runRetentionCleanup,6*60*60*1000);cleanupTimer.unref();

let shuttingDown=false;
async function shutdown(signal){
  if(shuttingDown)return;shuttingDown=true;console.log(`[HygieSafe] arrêt ${signal}`);
  clearInterval(cleanupTimer);
  server.close(async()=>{await pool.end().catch(()=>{});process.exit(0)});
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
