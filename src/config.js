import 'dotenv/config';

const bool = (v, d=false) => v == null ? d : ['1','true','yes','on'].includes(String(v).toLowerCase());
const int = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  publicSiteUrl: process.env.PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000',
  railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || '',
  allowedOrigins: String(process.env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: bool(process.env.DATABASE_SSL, false),
  sessionCookieSecure: bool(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  sessionTtlHours: int(process.env.SESSION_TTL_HOURS, 12),
  trustedSessionDays: int(process.env.TRUSTED_SESSION_DAYS, 30),
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',
  uploadDir: process.env.UPLOAD_DIR || '',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: process.env.STRIPE_CURRENCY || 'eur',
    amountCents: 999
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || ''
  },
  productLookup: {
    openFoodFacts: bool(process.env.PRODUCT_LOOKUP_OPENFOODFACTS, true),
    upcItemDb: bool(process.env.PRODUCT_LOOKUP_UPCITEMDB, true),
    timeoutMs: int(process.env.PRODUCT_LOOKUP_TIMEOUT_MS, 4500),
    upcItemDbUserKey: process.env.UPCITEMDB_USER_KEY || '',
    upcItemDbKeyType: process.env.UPCITEMDB_KEY_TYPE || '3scale'
  },
  smtp: {
    host: process.env.SMTP_HOST || '', port: int(process.env.SMTP_PORT, 587), secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '', from: process.env.SMTP_FROM || 'HygieSafe <noreply@mail.hygiesafe.com>'
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || '', region: process.env.S3_REGION || 'fr-par', bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || ''
  }
};

export const isProd = config.env === 'production';

function httpsOrigin(value){
  try{return new URL(value).protocol==='https:'}catch{return false}
}
export function validateProductionConfig(){
  if(!isProd) return;
  const errors=[];
  if(!httpsOrigin(config.appUrl)) errors.push('APP_URL doit être une URL HTTPS valide en production.');
  if(!httpsOrigin(config.publicSiteUrl)) errors.push('PUBLIC_SITE_URL doit être une URL HTTPS valide en production.');
  if(!config.sessionCookieSecure) errors.push('SESSION_COOKIE_SECURE doit être true en production.');
  if(config.fieldEncryptionKey && config.fieldEncryptionKey.length<32) errors.push('FIELD_ENCRYPTION_KEY doit contenir au moins 32 caractères.');
  if(config.stripe.secretKey && !config.stripe.webhookSecret) console.warn('[HygieSafe] Stripe incomplet : STRIPE_WEBHOOK_SECRET manquant. La facturation reste désactivée.');
  if(config.stripe.webhookSecret && !config.stripe.secretKey) console.warn('[HygieSafe] Stripe incomplet : STRIPE_SECRET_KEY manquant. La facturation reste désactivée.');
  if(config.resend.apiKey&&!config.resend.from) console.warn('[HygieSafe] Resend incomplet : RESEND_FROM manquant. Les inscriptions seront indisponibles tant que la configuration e-mail n’est pas complète.');
  if(config.resend.from&&!config.resend.apiKey&&!config.smtp.host) console.warn('[HygieSafe] RESEND_FROM est défini sans RESEND_API_KEY. Resend reste désactivé.');
  const s3Ready=!!(config.s3.endpoint&&config.s3.bucket&&config.s3.accessKeyId&&config.s3.secretAccessKey);
  if(!s3Ready&&!config.uploadDir) errors.push('Configurez S3 ou UPLOAD_DIR vers un volume persistant avant la production.');
  if(errors.length) throw new Error(`[HygieSafe] Configuration production invalide: ${errors.join(' ')}`);
}
