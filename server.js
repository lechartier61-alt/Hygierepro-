'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PROMOS_FILE = path.join(DATA_DIR, 'promos.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const ADMIN_EMAIL = 'admin@lgy.fr';
const ADMIN_PASSWORD = 'Admin123';
let ADMIN_PASSWORD_HASH = '';
let TOKEN_SECRET = process.env.TOKEN_SECRET || '';
const GENERATED_SECRET_FILE = path.join(DATA_DIR, '.token-secret');
const GENERATED_ADMIN_FILE = path.join(DATA_DIR, '.admin-bootstrap.json');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const CONFIGURED_ALLOWED_HOSTS = String(process.env.ALLOWED_HOSTS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
const RAILWAY_PUBLIC_HOST = String(process.env.RAILWAY_PUBLIC_DOMAIN || '').trim().toLowerCase();
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, 'localhost', '127.0.0.1', 'lgy.fr', 'www.lgy.fr', RAILWAY_PUBLIC_HOST, ...CONFIGURED_ALLOWED_HOSTS].filter(Boolean));
const ORDER_STATUSES = new Set(['Commande reçue','Commande acceptée','En préparation','Prête au retrait','En livraison','Livrée / récupérée','Annulée']);
const PAYMENT_STATUSES = new Set(['À régler','Payé','Remboursé','Échec']);
const MUTATING_METHODS = new Set(['POST','PUT','PATCH','DELETE']);
const rateBuckets = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
for (const file of [PRODUCTS_FILE, ORDERS_FILE, PROMOS_FILE, SETTINGS_FILE, CUSTOMERS_FILE]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, file === SETTINGS_FILE ? '{}\n' : '[]\n', { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16);
  const keyLength = 64;
  const hash = crypto.scryptSync(String(password), salt, keyLength, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}$${keyLength}`;
}

function loadOrCreateSecret() {
  const configured = String(TOKEN_SECRET || '').trim();
  if (configured.length >= 32 && !/change|remplace/i.test(configured)) return configured;
  try {
    const stored = fs.readFileSync(GENERATED_SECRET_FILE, 'utf8').trim();
    if (stored.length >= 32) return stored;
  } catch {}
  const generated = crypto.randomBytes(48).toString('base64url');
  fs.writeFileSync(GENERATED_SECRET_FILE, `${generated}\n`, { mode: 0o600 });
  return generated;
}

function loadOrCreateAdminHash() {
  return createPasswordHash(ADMIN_PASSWORD);
}

function initializeSecurityConfiguration() {
  TOKEN_SECRET = loadOrCreateSecret();
  ADMIN_PASSWORD_HASH = loadOrCreateAdminHash();
  if (IS_PROD && !process.env.TOKEN_SECRET) {
    console.warn('TOKEN_SECRET absent : une clé locale sécurisée a été générée. Configurez TOKEN_SECRET dans Railway pour conserver les sessions entre redéploiements.');
  }
}
initializeSecurityConfiguration();

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { console.error(`Lecture impossible: ${path.basename(file)}`, error.message); return fallback; }
}
function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function audit(req, action, details = {}) {
  const event = { at: new Date().toISOString(), action, ip: clientIp(req), userAgent: String(req.headers['user-agent'] || '').slice(0,200), ...details };
  try { fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(event)}\n`, { mode: 0o600 }); } catch {}
}
function securityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'");
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}
function json(res, status, value, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(value));
}
function parseBody(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let settled = false;
    req.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        settled = true;
        reject(Object.assign(new Error('Payload trop volumineux.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('JSON invalide.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function clientIp(req) {
  if (TRUST_PROXY) return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  return req.socket.remoteAddress || 'unknown';
}
function rateLimit(req, res, name, max, windowMs) {
  const now = Date.now();
  const key = `${name}:${clientIp(req)}`;
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  if (bucket.count > max) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    json(res, 429, { error: 'Trop de tentatives. Réessayez plus tard.' });
    return false;
  }
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
}, 10 * 60 * 1000).unref();

function b64url(input) { return Buffer.from(input).toString('base64url'); }
function signSession(payload) {
  const data = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', TOKEN_SECRET || 'development-only-secret').update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET || 'development-only-secret').update(data).digest();
  let supplied;
  try { supplied = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.role === 'admin' && payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0,index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}
function getAdminSession(req) { return verifySession(parseCookies(req).lgy_admin_session); }
function requireAdmin(req, res, csrf = false) {
  const session = getAdminSession(req);
  if (!session) { json(res, 401, { error: 'Session expirée ou non autorisée.' }); return null; }
  if (csrf && !constantTimeEqual(req.headers['x-csrf-token'], session.csrf)) {
    json(res, 403, { error: 'Protection CSRF : requête refusée.' });
    return null;
  }
  return session;
}
function sessionCookie(value, maxAge = 8 * 60 * 60) {
  return `lgy_admin_session=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${IS_PROD ? '; Secure' : ''}`;
}
function clearSessionCookie() { return `lgy_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PROD ? '; Secure' : ''}`; }
function verifyCustomerSession(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest();
  let supplied; try { supplied = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try { const payload=JSON.parse(Buffer.from(data,'base64url').toString('utf8')); return payload.role==='customer'&&payload.exp>Date.now()?payload:null; } catch { return null; }
}
function getCustomerSession(req){ return verifyCustomerSession(parseCookies(req).lgy_customer_session); }
function customerCookie(value,maxAge=30*24*60*60){ return `lgy_customer_session=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${IS_PROD?'; Secure':''}`; }
function clearCustomerCookie(){ return `lgy_customer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PROD?'; Secure':''}`; }
function requireCustomer(req,res,csrf=false){ const session=getCustomerSession(req); if(!session){json(res,401,{error:'Connectez-vous à votre compte.'});return null;} if(csrf&&!constantTimeEqual(req.headers['x-csrf-token'],session.csrf)){json(res,403,{error:'Protection CSRF : requête refusée.'});return null;} return session; }
function verifyStoredPassword(password, encoded){ const parsed=normalizeHash(encoded); if(!parsed)return false; const[,saltB64,hashB64,keyLenRaw]=parsed; const expected=Buffer.from(hashB64,'base64url'); const actual=crypto.scryptSync(String(password||''),Buffer.from(saltB64,'base64url'),Number(keyLenRaw)||64,{N:16384,r:8,p:1}); return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected); }
function publicCustomer(c,orders=[]){ const own=orders.filter(o=>o.customerId===c.id||String(o.customer?.email||'').toLowerCase()===c.email); const valid=own.filter(o=>o.status!=='Annulée'); return {id:c.id,name:c.name,email:c.email,phone:c.phone||'',addresses:Array.isArray(c.addresses)?c.addresses:[],createdAt:c.createdAt,ordersCount:own.length,totalSpent:Math.round(valid.reduce((n,o)=>n+Number(o.total||0),0)*100)/100,loyaltyPoints:valid.reduce((n,o)=>n+Number(o.loyaltyPoints||0),0)}; }

function normalizeHash(value) {
  const parts = String(value || '').split('$');
  return parts.length === 4 && parts[0] === 'scrypt' ? parts : null;
}
function verifyPassword(password) {
  const parsed = normalizeHash(ADMIN_PASSWORD_HASH);
  if (parsed) {
    const [, saltB64, hashB64, keyLenRaw] = parsed;
    const keyLen = Number(keyLenRaw) || 64;
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = crypto.scryptSync(String(password || ''), Buffer.from(saltB64, 'base64url'), keyLen, { N: 16384, r: 8, p: 1 });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  return ADMIN_PASSWORD && ADMIN_PASSWORD.length >= 12 && constantTimeEqual(password, ADMIN_PASSWORD);
}
function constantTimeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a || '')).digest();
  const right = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(left, right);
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim()) && String(value).length <= 120; }
function cleanText(value, max) { return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0,max); }
function cleanMultiline(value,max){return String(value||'').replace(/\r/g,'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,' ').trim().slice(0,max);}
function safeId(value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }
function validMoney(value, min = 0, max = 100000) { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max; }
function validateProduct(p) {
  return p && cleanText(p.name,101).length > 0 && cleanText(p.name,101).length <= 100 && validMoney(p.price, 0.5, 10000) && cleanText(p.category,61).length <= 60;
}
function sanitizeProduct(body, previous = {}) {
  const sizes = Array.isArray(body.sizes) ? body.sizes.slice(0,20).map(s => ({ label: cleanText(s.label,40) || 'Standard', extra: validMoney(s.extra,0,10000) ? Number(s.extra) : 0 })) : (previous.sizes || [{label:'Standard',extra:0}]);
  return {
    ...previous,
    name: cleanText(body.name,100), category: cleanText(body.category,60), description: cleanText(body.description,500), allergens: cleanText(body.allergens,500),
    unit: cleanText(body.unit,80), price: Number(body.price),
    image: /^\/(assets|uploads)\/[a-zA-Z0-9._/-]+$/.test(String(body.image || '')) ? String(body.image) : '/assets/logo-lgy.webp',
    sizes, available: body.available !== false, visible: body.visible !== false, featured: body.featured === true
  };
}
function getProductCategories(){
  const categories=Array.isArray(getSettings().productCategories)?getSettings().productCategories:[];
  return categories.map(x=>cleanText(x,40)).filter(Boolean);
}
function isAllowedProductCategory(value){
  const category=cleanText(value,40).toLowerCase();
  return getProductCategories().some(x=>x.toLowerCase()===category);
}
function computeOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 50) throw Object.assign(new Error('Panier invalide.'), { status: 400 });
  const products = readJson(PRODUCTS_FILE, []);
  return rawItems.map(item => {
    const product = products.find(p => p.id === item.productId && p.available);
    if (!product) throw Object.assign(new Error('Un produit du panier n’est plus disponible.'), { status: 409 });
    const size = (product.sizes || []).find(s => s.label === item.size) || { label: 'Standard', extra: 0 };
    const qty = Math.min(20, Math.max(1, Math.trunc(Number(item.qty) || 1)));
    const unitPrice = Math.round((Number(product.price) + Number(size.extra || 0)) * 100) / 100;
    return { productId: product.id, name: cleanText(product.name,100), image: product.image, size: cleanText(size.label,40), qty, message: cleanText(item.message,60), unitPrice };
  });
}
function normalizePromoCode(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0,30); }
function promoDiscount(promo, subtotal) {
  if (!promo || promo.active === false) return 0;
  const now = Date.now();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return 0;
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return 0;
  if (Number(promo.minOrder || 0) > subtotal) return 0;
  if (Number(promo.maxUses || 0) > 0 && Number(promo.uses || 0) >= Number(promo.maxUses)) return 0;
  let discount = promo.type === 'fixed' ? Number(promo.value || 0) : subtotal * Number(promo.value || 0) / 100;
  if (Number(promo.maxDiscount || 0) > 0) discount = Math.min(discount, Number(promo.maxDiscount));
  return Math.max(0, Math.min(subtotal, Math.round(discount * 100) / 100));
}
function customerSummary(orders) {
  const map = new Map();
  for (const order of orders) {
    const email = String(order.customer?.email || '').trim().toLowerCase();
    const key = email || String(order.customer?.phone || '').trim() || order.id;
    if (!map.has(key)) map.set(key, { id: key, name: order.customer?.name || '', email: order.customer?.email || '', phone: order.customer?.phone || '', ordersCount: 0, totalSpent: 0, lastOrderAt: order.createdAt });
    const c = map.get(key); c.ordersCount += 1;
    if (order.status !== 'Annulée') c.totalSpent += Number(order.total || 0);
    if (new Date(order.createdAt) > new Date(c.lastOrderAt)) c.lastOrderAt = order.createdAt;
  }
  return [...map.values()].sort((a,b) => new Date(b.lastOrderAt)-new Date(a.lastOrderAt));
}

const DEFAULT_SETTINGS = {
  shopName: 'LGY Boulangerie Pâtisserie',
  heroTitle: 'Le goût de l’artisanat',
  heroAccent: 'circuit court & produits locaux',
  heroImage: '', heroImageVisible: false,
  heroOverlay: 48, heroPosition: 'center', heroTextTheme: 'dark',
  homeServicesVisible: false, homeAboutVisible: false,
  legalNotice: '', termsText: '', privacyText: '', cookiesText: '',
  analyticsEnabled: true, analyticsMeasurementId: '', analyticsRetentionMonths: 2, analyticsConsentDays: 180,
  analyticsProvider: 'Google Analytics 4',
  businessLegalForm: '', businessCapital: '', rneNumber: '', rcsNumber: '',
  publicationDirector: '', hostingName: 'Railway', hostingAddress: '', hostingPhone: '',
  mediatorName: '', mediatorAddress: '', mediatorWebsite: '',
  allergenNotice: 'Les allergènes sont indiqués sur les fiches produits lorsqu’ils sont renseignés. Pour toute allergie ou intolérance, contactez la boulangerie avant de commander.',
  deliveryTerms: '', refundTerms: '',
  heroText: 'Des brioches et produits secs artisanaux préparés avec soin au Horps.',
  phone: '02 36 02 70 94', email: 'contact@lgy.fr', address: 'Le Horps, 53640',
  legalName: 'LGY Boulangerie Pâtisserie', siret: '', vatNumber: '', invoiceFooter: 'Merci pour votre confiance.',
  thankYouTitle: 'Merci pour votre confiance',
  thankYouText: 'Nous vous remercions chaleureusement pour votre achat dans notre boulangerie. Nous sommes heureux de vous faire découvrir notre célèbre brioche Madeleine, faite maison avec des produits fermiers de Mayenne.',
  thankYouSignatureLabel: 'Signature de la boulangerie',
  productCategories: ['Viennoiseries'],
  currency: 'EUR', minimumLeadDays: 1, minimumOrder: 0,
  pickupEnabled: true, deliveryEnabled: true, deliveryFee: 5, freeDeliveryFrom: 60,
  deliveryPostalCodes: ['53640'],
  slots: ['09:00 – 11:00','11:00 – 13:00','15:00 – 17:00','17:00 – 19:00'],
  closedWeekdays: [0], maxOrdersPerSlot: 12,
  announcement: 'Livraison offerte dès 60 €', loyaltyEnabled: true, pointsPerEuro: 1
};
function getSettings(){ return {...DEFAULT_SETTINGS, ...readJson(SETTINGS_FILE,{})}; }
function sanitizeSettings(body){
  const prev=getSettings();
  return {
    ...prev,
    shopName: cleanText(body.shopName ?? prev.shopName,100), heroTitle: cleanText(body.heroTitle ?? prev.heroTitle,140), heroAccent: cleanText(body.heroAccent ?? prev.heroAccent,140), heroText: cleanText(body.heroText ?? prev.heroText,400),
    heroImage: /^\/(assets|uploads)\/[a-zA-Z0-9._/-]+$/.test(String(body.heroImage||prev.heroImage||'')) ? String(body.heroImage||prev.heroImage) : (prev.heroImage||''),
    heroImageVisible: body.heroImageVisible === true,
    heroOverlay: Math.max(0,Math.min(85,Number(body.heroOverlay ?? prev.heroOverlay ?? 48))),
    heroPosition: ['left','center','right'].includes(String(body.heroPosition)) ? String(body.heroPosition) : (prev.heroPosition||'center'),
    heroTextTheme: ['dark','light'].includes(String(body.heroTextTheme)) ? String(body.heroTextTheme) : (prev.heroTextTheme||'dark'),
    homeServicesVisible: body.homeServicesVisible === true, homeAboutVisible: body.homeAboutVisible === true,
    legalNotice: cleanMultiline(body.legalNotice ?? prev.legalNotice,8000), termsText: cleanMultiline(body.termsText ?? prev.termsText,12000), privacyText: cleanMultiline(body.privacyText ?? prev.privacyText,12000), cookiesText: cleanMultiline(body.cookiesText ?? prev.cookiesText,8000),
    analyticsEnabled: body.analyticsEnabled === true,
    analyticsMeasurementId: /^G-[A-Z0-9]+$/i.test(String(body.analyticsMeasurementId||'')) ? String(body.analyticsMeasurementId).toUpperCase() : '',
    analyticsRetentionMonths: [2,14].includes(Number(body.analyticsRetentionMonths)) ? Number(body.analyticsRetentionMonths) : 2,
    analyticsConsentDays: Math.max(30,Math.min(395,Number(body.analyticsConsentDays||180))),
    analyticsProvider: 'Google Analytics 4',
    businessLegalForm: cleanText(body.businessLegalForm ?? prev.businessLegalForm,80), businessCapital: cleanText(body.businessCapital ?? prev.businessCapital,80),
    rneNumber: cleanText(body.rneNumber ?? prev.rneNumber,80), rcsNumber: cleanText(body.rcsNumber ?? prev.rcsNumber,80),
    publicationDirector: cleanText(body.publicationDirector ?? prev.publicationDirector,120),
    hostingName: cleanText(body.hostingName ?? prev.hostingName,120), hostingAddress: cleanText(body.hostingAddress ?? prev.hostingAddress,240), hostingPhone: cleanText(body.hostingPhone ?? prev.hostingPhone,50),
    mediatorName: cleanText(body.mediatorName ?? prev.mediatorName,160), mediatorAddress: cleanText(body.mediatorAddress ?? prev.mediatorAddress,240), mediatorWebsite: cleanText(body.mediatorWebsite ?? prev.mediatorWebsite,240),
    allergenNotice: cleanMultiline(body.allergenNotice ?? prev.allergenNotice,3000), deliveryTerms: cleanMultiline(body.deliveryTerms ?? prev.deliveryTerms,5000), refundTerms: cleanMultiline(body.refundTerms ?? prev.refundTerms,5000),
    phone: cleanText(body.phone ?? prev.phone,40), email: validEmail(body.email ?? prev.email) ? String(body.email).trim().toLowerCase() : prev.email, address: cleanText(body.address ?? prev.address,180),
    legalName: cleanText(body.legalName ?? prev.legalName,120), siret: cleanText(body.siret ?? prev.siret,30), vatNumber: cleanText(body.vatNumber ?? prev.vatNumber,40), invoiceFooter: cleanText(body.invoiceFooter ?? prev.invoiceFooter,300),
    thankYouTitle: cleanText(body.thankYouTitle ?? prev.thankYouTitle,140), thankYouText: cleanText(body.thankYouText ?? prev.thankYouText,1200), thankYouSignatureLabel: cleanText(body.thankYouSignatureLabel ?? prev.thankYouSignatureLabel,120),
    productCategories: Array.isArray(body.productCategories) ? [...new Map(body.productCategories.map(x=>cleanText(x,40)).filter(x=>x&&x.toLowerCase()!=='tous').slice(0,30).map(x=>[x.toLowerCase(),x])).values()] : prev.productCategories,
    minimumLeadDays: Math.max(0,Math.min(30,Math.trunc(Number(body.minimumLeadDays ?? prev.minimumLeadDays)))), minimumOrder: Math.max(0,Math.min(10000,Number(body.minimumOrder ?? prev.minimumOrder))),
    pickupEnabled: body.pickupEnabled !== false, deliveryEnabled: body.deliveryEnabled !== false, deliveryFee: Math.max(0,Math.min(500,Number(body.deliveryFee ?? prev.deliveryFee))), freeDeliveryFrom: Math.max(0,Math.min(10000,Number(body.freeDeliveryFrom ?? prev.freeDeliveryFrom))),
    deliveryPostalCodes: Array.isArray(body.deliveryPostalCodes)?body.deliveryPostalCodes.map(x=>cleanText(x,12)).filter(Boolean).slice(0,100):prev.deliveryPostalCodes,
    slots: Array.isArray(body.slots)?body.slots.map(x=>cleanText(x,50)).filter(Boolean).slice(0,20):prev.slots, closedWeekdays:Array.isArray(body.closedWeekdays)?body.closedWeekdays.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6):prev.closedWeekdays,
    maxOrdersPerSlot: Math.max(1,Math.min(500,Math.trunc(Number(body.maxOrdersPerSlot ?? prev.maxOrdersPerSlot)))), announcement: cleanText(body.announcement ?? prev.announcement,160), loyaltyEnabled: body.loyaltyEnabled !== false, pointsPerEuro: Math.max(0,Math.min(100,Number(body.pointsPerEuro ?? prev.pointsPerEuro)))
  };
}
function parisDateString(offsetDays=0){ const d=new Date(Date.now()+offsetDays*86400000); return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'}[ext] || 'application/octet-stream');
}
function pageMeta(pathname){
  const map={'/':['LGY.fr — Boulangerie Pâtisserie au Horps','Brioches et produits secs artisanaux, circuit court et produits locaux au Horps.'],'/boutique':['Notre boutique — LGY.fr','Brioches et produits secs artisanaux, avec mise en avant du circuit court et des produits locaux.'],'/commande':['Commander — LGY.fr','Finalisez votre commande LGY en retrait ou en livraison.'],'/suivi':['Suivi de commande — LGY.fr','Suivez l’avancement de votre commande LGY.'],'/compte':['Mon compte — LGY.fr','Retrouvez vos commandes et vos informations client LGY.'],'/mentions-legales':['Mentions légales — LGY.fr','Mentions légales de LGY.fr.'],'/cgv':['Conditions générales de vente — LGY.fr','Conditions générales de vente de LGY.fr.'],'/confidentialite':['Politique de confidentialité — LGY.fr','Politique de confidentialité de LGY.fr.'],'/cookies':['Cookies — LGY.fr','Informations sur les cookies de LGY.fr.']};
  return map[pathname]||[pathname.startsWith('/produit/')?'Produit — LGY.fr':'LGY.fr — Boulangerie Pâtisserie','LGY Boulangerie Pâtisserie au Horps.'];
}
function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  let file = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!file.startsWith(`${PUBLIC_DIR}${path.sep}`) && file !== path.join(PUBLIC_DIR,'index.html')) return false;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
  if(file.endsWith('index.html')){
    const [title,description]=pageMeta(pathname);
    const html=fs.readFileSync(file,'utf8').replace(/<title>.*?<\/title>/,`<title>${title}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/,`<meta name="description" content="${description}" />`);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Vary':'Accept-Encoding'});res.end(html);return true;
  }
  res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'public, max-age=3600', 'Vary': 'Accept-Encoding' });
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res); return true;
}
function requestHost(req) {
  const forwarded = TRUST_PROXY ? String(req.headers['x-forwarded-host'] || '').split(',')[0].trim() : '';
  return (forwarded || String(req.headers.host || '')).trim().toLowerCase();
}
function hostnameOnly(value) {
  try { return new URL(`http://${value}`).hostname.toLowerCase(); }
  catch { return String(value || '').split(':')[0].trim().toLowerCase(); }
}
function isAllowedHost(host) {
  if (!host) return false;
  const hostname = hostnameOnly(host);
  if (ALLOWED_HOSTS.has(host) || ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith('.up.railway.app')) return true;
  for (const rule of ALLOWED_HOSTS) {
    if (rule.startsWith('*.') && hostname.endsWith(rule.slice(1))) return true;
  }
  return false;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host.toLowerCase() === requestHost(req); } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  securityHeaders(req, res);

  // Railway effectue le healthcheck avec un nom d'hôte interne qui ne doit pas
  // être soumis au filtrage des domaines publics. Répondre avant le contrôle Host.
  const rawPathname = String(req.url || '/').split('?')[0];
  if (rawPathname === '/api/health' && ['GET', 'HEAD'].includes(req.method)) {
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end();
    }
    return json(res, 200, { ok: true, name: 'LGY.fr', status: 'healthy' });
  }

  const host = requestHost(req);
  if (IS_PROD && !isAllowedHost(host)) {
    audit(req, 'blocked_host', { host });
    return json(res, 400, { error: 'Hôte non autorisé.' });
  }
  if (MUTATING_METHODS.has(req.method) && !sameOrigin(req)) return json(res, 403, { error: 'Origine non autorisée.' });
  const url = new URL(req.url, `http://${host || 'localhost'}`);
  const pathname = url.pathname;
  try {

    if (pathname === '/api/account/register' && req.method === 'POST') {
      if(!rateLimit(req,res,'customer-register',8,60*60*1000))return;
      const body=await parseBody(req,16*1024), email=String(body.email||'').trim().toLowerCase(), name=cleanText(body.name,80), phone=cleanText(body.phone,30), password=String(body.password||'');
      if(!name||!validEmail(email)||password.length<10||password.length>200||body.privacyAccepted!==true)return json(res,400,{error:'Nom, e-mail, mot de passe de 10 caractères minimum et acceptation de la confidentialité requis.'});
      const customers=readJson(CUSTOMERS_FILE,[]); if(customers.some(c=>c.email===email))return json(res,409,{error:'Un compte existe déjà avec cet e-mail.'});
      const customer={id:crypto.randomUUID(),name,email,phone,passwordHash:createPasswordHash(password),addresses:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),active:true}; customers.push(customer);writeJson(CUSTOMERS_FILE,customers);
      const csrf=crypto.randomBytes(24).toString('base64url'),token=signSession({role:'customer',customerId:customer.id,csrf,exp:Date.now()+30*24*60*60*1000}); audit(req,'customer.registered',{customerId:customer.id});
      return json(res,201,{authenticated:true,csrf,customer:publicCustomer(customer,[])},{'Set-Cookie':customerCookie(token)});
    }
    if (pathname === '/api/account/login' && req.method === 'POST') {
      if(!rateLimit(req,res,'customer-login',10,15*60*1000))return;
      const body=await parseBody(req,8*1024),email=String(body.email||'').trim().toLowerCase(),customers=readJson(CUSTOMERS_FILE,[]),customer=customers.find(c=>c.email===email&&c.active!==false);
      if(!customer||!verifyStoredPassword(body.password,customer.passwordHash)){audit(req,'customer.login.failed',{email:cleanText(email,120)});return json(res,401,{error:'E-mail ou mot de passe incorrect.'});}
      const csrf=crypto.randomBytes(24).toString('base64url'),token=signSession({role:'customer',customerId:customer.id,csrf,exp:Date.now()+30*24*60*60*1000}); audit(req,'customer.login.success',{customerId:customer.id});
      return json(res,200,{authenticated:true,csrf,customer:publicCustomer(customer,readJson(ORDERS_FILE,[]))},{'Set-Cookie':customerCookie(token)});
    }
    if (pathname === '/api/account/session' && req.method === 'GET') { const session=requireCustomer(req,res);if(!session)return;const customer=readJson(CUSTOMERS_FILE,[]).find(c=>c.id===session.customerId&&c.active!==false);if(!customer)return json(res,401,{error:'Compte introuvable.'},{'Set-Cookie':clearCustomerCookie()});return json(res,200,{authenticated:true,csrf:session.csrf,customer:publicCustomer(customer,readJson(ORDERS_FILE,[]))}); }
    if (pathname === '/api/account/logout' && req.method === 'POST') { const session=requireCustomer(req,res,true);if(!session)return;audit(req,'customer.logout',{customerId:session.customerId});return json(res,200,{ok:true},{'Set-Cookie':clearCustomerCookie()}); }
    if (pathname === '/api/account/profile' && req.method === 'PUT') { const session=requireCustomer(req,res,true);if(!session)return;const body=await parseBody(req,16*1024),customers=readJson(CUSTOMERS_FILE,[]),i=customers.findIndex(c=>c.id===session.customerId);if(i<0)return json(res,404,{error:'Compte introuvable.'});const email=String(body.email||customers[i].email).trim().toLowerCase();if(!validEmail(email)||customers.some((c,j)=>j!==i&&c.email===email))return json(res,400,{error:'Adresse e-mail invalide ou déjà utilisée.'});customers[i]={...customers[i],name:cleanText(body.name,80)||customers[i].name,email,phone:cleanText(body.phone,30),updatedAt:new Date().toISOString()};writeJson(CUSTOMERS_FILE,customers);return json(res,200,{customer:publicCustomer(customers[i],readJson(ORDERS_FILE,[]))}); }
    if (pathname === '/api/account/password' && req.method === 'PUT') { const session=requireCustomer(req,res,true);if(!session)return;const body=await parseBody(req,8*1024),customers=readJson(CUSTOMERS_FILE,[]),i=customers.findIndex(c=>c.id===session.customerId);if(i<0)return json(res,404,{error:'Compte introuvable.'});if(!verifyStoredPassword(body.currentPassword,customers[i].passwordHash)||String(body.newPassword||'').length<10)return json(res,400,{error:'Mot de passe actuel incorrect ou nouveau mot de passe trop court.'});customers[i].passwordHash=createPasswordHash(body.newPassword);customers[i].updatedAt=new Date().toISOString();writeJson(CUSTOMERS_FILE,customers);audit(req,'customer.password.changed',{customerId:session.customerId});return json(res,200,{ok:true}); }
    if (pathname === '/api/account/addresses' && req.method === 'POST') { const session=requireCustomer(req,res,true);if(!session)return;const body=await parseBody(req,16*1024),customers=readJson(CUSTOMERS_FILE,[]),i=customers.findIndex(c=>c.id===session.customerId);if(i<0)return json(res,404,{error:'Compte introuvable.'});const address={id:crypto.randomUUID(),label:cleanText(body.label,40)||'Adresse',address:cleanText(body.address,160),postalCode:cleanText(body.postalCode,12),city:cleanText(body.city,80)};if(!address.address||!address.postalCode||!address.city)return json(res,400,{error:'Adresse incomplète.'});customers[i].addresses=[...(customers[i].addresses||[]),address].slice(-10);customers[i].updatedAt=new Date().toISOString();writeJson(CUSTOMERS_FILE,customers);return json(res,201,address); }
    if (/^\/api\/account\/addresses\/[^/]+$/.test(pathname) && req.method === 'DELETE') { const session=requireCustomer(req,res,true);if(!session)return;const id=decodeURIComponent(pathname.split('/').pop()),customers=readJson(CUSTOMERS_FILE,[]),i=customers.findIndex(c=>c.id===session.customerId);if(i<0)return json(res,404,{error:'Compte introuvable.'});customers[i].addresses=(customers[i].addresses||[]).filter(a=>a.id!==id);writeJson(CUSTOMERS_FILE,customers);return json(res,200,{ok:true}); }
    if (pathname === '/api/account/orders' && req.method === 'GET') { const session=requireCustomer(req,res);if(!session)return;const customer=readJson(CUSTOMERS_FILE,[]).find(c=>c.id===session.customerId);if(!customer)return json(res,404,{error:'Compte introuvable.'});const orders=readJson(ORDERS_FILE,[]).filter(o=>o.customerId===customer.id||String(o.customer?.email||'').toLowerCase()===customer.email).map(o=>({id:o.id,status:o.status,paymentStatus:o.paymentStatus,createdAt:o.createdAt,fulfillment:o.fulfillment,total:o.total,items:o.items}));return json(res,200,orders); }
    if (pathname === '/api/products' && req.method === 'GET') return json(res, 200, readJson(PRODUCTS_FILE, []).filter(p => p.visible !== false));
    if (pathname === '/api/settings' && req.method === 'GET') return json(res, 200, getSettings());
    if (pathname === '/api/promos/validate' && req.method === 'POST') {
      if (!rateLimit(req, res, 'promo-check', 30, 10 * 60 * 1000)) return;
      const body = await parseBody(req, 16 * 1024);
      const code = normalizePromoCode(body.code);
      const subtotal = Math.max(0, Math.min(100000, Number(body.subtotal || 0)));
      const promo = readJson(PROMOS_FILE, []).find(p => normalizePromoCode(p.code) === code);
      const discount = promoDiscount(promo, subtotal);
      if (!promo || discount <= 0) return json(res, 404, { error: 'Code promo invalide, expiré ou non applicable.' });
      return json(res, 200, { code: promo.code, label: promo.label || promo.code, discount });
    }
    if (pathname === '/api/orders' && req.method === 'POST') {
      if (!rateLimit(req, res, 'order-create', 10, 60 * 60 * 1000)) return;
      const body = await parseBody(req, 64 * 1024);
      if (!cleanText(body.customer?.name,80) || !validEmail(body.customer?.email) || !cleanText(body.customer?.phone,30)) return json(res, 400, { error: 'Coordonnées client invalides.' });
      const settings=getSettings();
      const method = body.fulfillment?.method === 'Livraison à domicile' ? 'Livraison à domicile' : 'Retrait en boutique';
      if(method==='Livraison à domicile'&&!settings.deliveryEnabled)return json(res,400,{error:'La livraison est actuellement désactivée.'});
      if(method==='Retrait en boutique'&&!settings.pickupEnabled)return json(res,400,{error:'Le retrait est actuellement désactivé.'});
      const requestedDate = String(body.fulfillment?.date || '');
      const minDate=parisDateString(settings.minimumLeadDays);
      const orderDate = new Date(`${requestedDate}T12:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !Number.isFinite(orderDate.getTime()) || requestedDate < minDate || settings.closedWeekdays.includes(orderDate.getDay())) return json(res, 400, { error: 'Date indisponible.' });
      const slot=cleanText(body.fulfillment?.slot,50);
      if(!settings.slots.includes(slot))return json(res,400,{error:'Créneau invalide.'});
      const existing=readJson(ORDERS_FILE,[]).filter(o=>o.status!=='Annulée'&&o.fulfillment?.date===requestedDate&&o.fulfillment?.slot===slot).length;
      if(existing>=settings.maxOrdersPerSlot)return json(res,409,{error:'Ce créneau est complet.'});
      if (method === 'Livraison à domicile' && !cleanText(body.fulfillment?.address,160)) return json(res, 400, { error: 'Adresse de livraison obligatoire.' });
      if(method==='Livraison à domicile'&&settings.deliveryPostalCodes.length&&!settings.deliveryPostalCodes.includes(cleanText(body.fulfillment?.postalCode,12)))return json(res,400,{error:'Cette zone de livraison n’est pas desservie.'});
      const items = computeOrderItems(body.items);
      const subtotal = Math.round(items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * 100) / 100;
      const promos = readJson(PROMOS_FILE, []);
      const promoCode = normalizePromoCode(body.promoCode);
      const promo = promoCode ? promos.find(p => normalizePromoCode(p.code) === promoCode) : null;
      const discount = promoDiscount(promo, subtotal);
      if (promoCode && (!promo || discount <= 0)) return json(res, 400, { error: 'Le code promo n’est plus valide.' });
      if(subtotal < Number(settings.minimumOrder||0)) return json(res,400,{error:`Commande minimum : ${settings.minimumOrder} €.`});
      const deliveryFee = method==='Livraison à domicile' && subtotal-discount < Number(settings.freeDeliveryFrom||0) ? Number(settings.deliveryFee||0) : 0;
      const total = Math.max(0, Math.round((subtotal - discount + deliveryFee) * 100) / 100);
      const orders = readJson(ORDERS_FILE, []);
      const idempotencyKey=cleanText(req.headers['idempotency-key']||body.idempotencyKey,100);
      if(idempotencyKey){const prior=orders.find(o=>o.idempotencyKey===idempotencyKey);if(prior)return json(res,200,{id:prior.id,status:prior.status,total:prior.total,createdAt:prior.createdAt});}
      const customerSession=getCustomerSession(req); const account=customerSession?readJson(CUSTOMERS_FILE,[]).find(c=>c.id===customerSession.customerId&&c.active!==false):null;
      const order = {
        id: `LGY-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        status: 'Commande reçue', createdAt: new Date().toISOString(), customerId: account?.id || '',
        customer: { name: account?.name || cleanText(body.customer.name,80), email: account?.email || String(body.customer.email).trim().toLowerCase(), phone: account?.phone || cleanText(body.customer.phone,30) },
        fulfillment: { method, date: requestedDate, slot, address: cleanText(body.fulfillment?.address,160), postalCode: cleanText(body.fulfillment?.postalCode,12), city: cleanText(body.fulfillment?.city,80) },
        note: cleanText(body.note,500), items, subtotal, promoCode: promo ? promo.code : '', discount, deliveryFee, total, paymentStatus: 'À régler', idempotencyKey, trackingToken: crypto.randomBytes(18).toString('base64url'), loyaltyPoints: settings.loyaltyEnabled ? Math.floor(total*settings.pointsPerEuro) : 0
      };
      let accountCreated=false;
      if(body.createAccount?.enabled===true&&!account){
        const password=String(body.createAccount?.password||''),privacyAccepted=body.createAccount?.privacyAccepted===true,customers=readJson(CUSTOMERS_FILE,[]),email=String(order.customer.email||'').toLowerCase();
        if(password.length>=10&&privacyAccepted&&!customers.some(c=>c.email===email)){
          const customer={id:crypto.randomUUID(),name:order.customer.name,email,phone:order.customer.phone,passwordHash:createPasswordHash(password),addresses:[],active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
          if(method==='Livraison à domicile'&&order.fulfillment.address)customer.addresses.push({id:crypto.randomUUID(),label:'Adresse de commande',address:order.fulfillment.address,postalCode:order.fulfillment.postalCode,city:order.fulfillment.city});
          customers.push(customer);writeJson(CUSTOMERS_FILE,customers);order.customerId=customer.id;accountCreated=true;audit(req,'customer.created.after-order',{customerId:customer.id,orderId:order.id});
        }
      }
      orders.unshift(order); writeJson(ORDERS_FILE, orders);
      if (promo && discount > 0) { promo.uses = Number(promo.uses || 0) + 1; writeJson(PROMOS_FILE, promos); }
      audit(req, 'order.created', { orderId: order.id, total: order.total });
      return json(res, 201, { id: order.id, status: order.status, total: order.total, createdAt: order.createdAt, trackingToken:order.trackingToken, accountCreated });
    }
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      if (!rateLimit(req, res, 'admin-login', 10, 15 * 60 * 1000)) return;
      const body = await parseBody(req, 8 * 1024);
      const emailOk = constantTimeEqual(String(body.email || '').trim().toLowerCase(), ADMIN_EMAIL);
      const passOk = verifyPassword(body.password);
      if (!emailOk || !passOk) { audit(req, 'admin.login.failed', { email: cleanText(body.email,120) }); return json(res, 401, { error: 'Identifiants incorrects.' }); }
      const csrf = crypto.randomBytes(24).toString('base64url');
      const token = signSession({ role: 'admin', csrf, exp: Date.now() + 8 * 60 * 60 * 1000 });
      audit(req, 'admin.login.success', { email: ADMIN_EMAIL });
      return json(res, 200, { authenticated: true, csrf }, { 'Set-Cookie': sessionCookie(token) });
    }
    if (pathname === '/api/admin/session' && req.method === 'GET') {
      const session = requireAdmin(req, res); if (!session) return;
      return json(res, 200, { authenticated: true, csrf: session.csrf });
    }
    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const session = requireAdmin(req, res, true); if (!session) return;
      audit(req, 'admin.logout');
      return json(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    }
    if (pathname === '/api/orders/track' && req.method === 'POST') { const body=await parseBody(req,8*1024); const order=readJson(ORDERS_FILE,[]).find(o=>o.id===cleanText(body.id,60)&&o.trackingToken===cleanText(body.token,100)); if(!order)return json(res,404,{error:'Commande introuvable.'}); return json(res,200,{id:order.id,status:order.status,paymentStatus:order.paymentStatus,createdAt:order.createdAt,fulfillment:order.fulfillment,total:order.total,items:order.items}); }
    if (pathname === '/api/admin/orders' && req.method === 'GET') { if (!requireAdmin(req,res)) return; return json(res, 200, readJson(ORDERS_FILE, [])); }
    if (pathname === '/api/admin/orders/test' && req.method === 'POST') {
      if (!requireAdmin(req,res,true)) return;
      const orders=readJson(ORDERS_FILE,[]), products=readJson(PRODUCTS_FILE,[]).filter(p=>p.available);
      const product=products[0]||{id:'test-produit',name:'Produit de test',price:20,sizes:[{label:'Standard',extra:0}]};
      const size=(product.sizes||[{label:'Standard',extra:0}])[0], qty=1, unitPrice=Number(product.price||20)+Number(size.extra||0);
      const now=new Date(), order={
        id:`LGY-TEST-${now.getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        trackingToken:crypto.randomBytes(24).toString('base64url'),
        idempotencyKey:`admin-test-${crypto.randomUUID()}`,
        customer:{name:'Client Test LGY',email:'test-client@lgy.fr',phone:'06 00 00 00 00'},
        fulfillment:{method:'Livraison à domicile',address:'1 rue de la Boulangerie',postalCode:'53640',city:'Le Horps',date:parisDateString(1),slot:(getSettings().slots||['09:00 - 11:00'])[0]},
        items:[{productId:product.id,name:product.name,size:size.label,qty,unitPrice,lineTotal:unitPrice,message:'Commande de test - ne pas préparer'}],
        subtotal:unitPrice,discount:0,promoCode:'',deliveryFee:0,total:unitPrice,
        status:'Commande reçue',paymentStatus:'À régler',note:'Commande de test créée depuis le tableau de bord administrateur.',testOrder:true,
        loyaltyPoints:0,createdAt:now.toISOString()
      };
      orders.unshift(order); writeJson(ORDERS_FILE,orders); audit(req,'order.test.created',{orderId:order.id}); return json(res,201,order);
    }
    if (pathname === '/api/admin/backup' && req.method === 'GET') {
      if (!requireAdmin(req,res)) return;
      return json(res,200,{
        exportedAt:new Date().toISOString(),version:'LGY.fr V6.6',
        settings:getSettings(),products:readJson(PRODUCTS_FILE,[]),orders:readJson(ORDERS_FILE,[]),
        customers:readJson(CUSTOMERS_FILE,[]),promos:readJson(PROMOS_FILE,[]),
        audit:fs.existsSync(AUDIT_FILE)?fs.readFileSync(AUDIT_FILE,'utf8'):''
      });
    }
    if (pathname === '/api/admin/dashboard' && req.method === 'GET') {
      if (!requireAdmin(req,res)) return;
      const orders = readJson(ORDERS_FILE, []), valid = orders.filter(o => o.status !== 'Annulée'), paid = valid.filter(o => o.paymentStatus === 'Payé');
      const revenue = valid.reduce((n,o)=>n+Number(o.total||0),0), paidRevenue = paid.reduce((n,o)=>n+Number(o.total||0),0);
      const pendingRevenue = valid.filter(o=>o.paymentStatus==='À régler').reduce((n,o)=>n+Number(o.total||0),0), today = new Date().toISOString().slice(0,10);
      return json(res, 200, { ordersCount: orders.length, todayOrders: orders.filter(o=>String(o.createdAt||'').slice(0,10)===today).length, revenue, paidRevenue, pendingRevenue, averageBasket: valid.length ? revenue/valid.length : 0, customersCount: customerSummary(orders).length, byStatus:[...ORDER_STATUSES].map(status=>({status,count:orders.filter(o=>o.status===status).length})), recent:orders.slice(0,5) });
    }
    if (pathname === '/api/admin/upload-image' && req.method === 'POST') {
      if(!requireAdmin(req,res,true))return;
      const body=await parseBody(req,6*1024*1024),match=String(body.dataUrl||'').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if(!match)return json(res,400,{error:'Image invalide. Formats acceptés : PNG, JPEG ou WebP.'});
      const ext=match[1]==='jpeg'?'jpg':match[1],buffer=Buffer.from(match[2],'base64');
      if(buffer.length<100||buffer.length>5*1024*1024)return json(res,400,{error:'L’image doit peser moins de 5 Mo.'});
      const fileName=`product-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`,target=path.join(UPLOADS_DIR,fileName);
      fs.writeFileSync(target,buffer,{mode:0o644}); audit(req,'product.image.uploaded',{fileName,size:buffer.length});
      return json(res,201,{image:`/uploads/${fileName}`});
    }
    if (pathname === '/api/admin/hero-image' && req.method === 'POST') {
      if(!requireAdmin(req,res,true))return;
      const body=await parseBody(req,6*1024*1024),match=String(body.dataUrl||'').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if(!match)return json(res,400,{error:'Image invalide. Formats acceptés : PNG, JPEG ou WebP.'});
      const ext=match[1]==='jpeg'?'jpg':match[1],buffer=Buffer.from(match[2],'base64');
      if(buffer.length<100||buffer.length>5*1024*1024)return json(res,400,{error:'L’image doit peser moins de 5 Mo.'});
      const fileName=`hero-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`,target=path.join(UPLOADS_DIR,fileName);
      fs.writeFileSync(target,buffer,{mode:0o644});
      const settings=getSettings(),old=settings.heroImage;
      settings.heroImage=`/uploads/${fileName}`; settings.heroImageVisible=true; writeJson(SETTINGS_FILE,settings);
      if(/^\/uploads\//.test(old||'')){const oldPath=path.join(PUBLIC_DIR,old);try{if(fs.existsSync(oldPath))fs.unlinkSync(oldPath)}catch{}}
      audit(req,'settings.hero-image.updated',{fileName,size:buffer.length});
      return json(res,201,{heroImage:settings.heroImage});
    }
    if (pathname === '/api/admin/hero-image' && req.method === 'DELETE') {
      if(!requireAdmin(req,res,true))return;
      const settings=getSettings(),old=settings.heroImage;
      if(/^\/uploads\//.test(old||'')){const oldPath=path.join(PUBLIC_DIR,old);try{if(fs.existsSync(oldPath))fs.unlinkSync(oldPath)}catch{}}
      settings.heroImage=''; settings.heroImageVisible=false; writeJson(SETTINGS_FILE,settings);
      audit(req,'settings.hero-image.deleted'); return json(res,200,{ok:true});
    }
    if (pathname === '/api/admin/settings' && req.method === 'GET') { if (!requireAdmin(req,res)) return; return json(res,200,getSettings()); }
    if (pathname === '/api/admin/settings' && req.method === 'PUT') { if(!requireAdmin(req,res,true))return; const body=await parseBody(req,32*1024); const settings=sanitizeSettings(body); writeJson(SETTINGS_FILE,settings); audit(req,'settings.updated'); return json(res,200,settings); }
    if (pathname === '/api/admin/customers' && req.method === 'GET') {
      if (!requireAdmin(req,res)) return;
      const orders=readJson(ORDERS_FILE,[]);
      const registered=readJson(CUSTOMERS_FILE,[]);
      const byEmail=new Map(customerSummary(orders).map(c=>[String(c.email||'').toLowerCase(),c]));
      const customers=registered.map(c=>{
        const summary=byEmail.get(String(c.email||'').toLowerCase())||{};
        return {id:c.id,name:c.name,email:c.email,phone:c.phone||'',active:c.active!==false,registered:true,createdAt:c.createdAt,addressesCount:(c.addresses||[]).length,ordersCount:summary.ordersCount||0,totalSpent:summary.totalSpent||0,lastOrderAt:summary.lastOrderAt||null};
      });
      for(const summary of byEmail.values()) if(!customers.some(c=>c.email===summary.email)) customers.push({...summary,id:'guest:'+summary.email,active:true,registered:false,createdAt:null,addressesCount:0});
      customers.sort((a,b)=>String(b.lastOrderAt||b.createdAt||'').localeCompare(String(a.lastOrderAt||a.createdAt||'')));
      return json(res,200,customers);
    }
    if (/^\/api\/admin\/customers\/[^/]+$/.test(pathname) && req.method === 'PATCH') {
      if(!requireAdmin(req,res,true))return;
      const id=decodeURIComponent(pathname.split('/').pop()),body=await parseBody(req,8*1024),customers=readJson(CUSTOMERS_FILE,[]),index=customers.findIndex(c=>c.id===id);
      if(index<0)return json(res,404,{error:'Compte client introuvable.'});
      customers[index].active=body.active!==false;
      customers[index].updatedAt=new Date().toISOString();
      writeJson(CUSTOMERS_FILE,customers);
      audit(req,'customer.admin.status',{customerId:id,active:customers[index].active});
      return json(res,200,{id,active:customers[index].active});
    }
    if (pathname === '/api/admin/promos' && req.method === 'GET') { if (!requireAdmin(req,res)) return; return json(res, 200, readJson(PROMOS_FILE, [])); }
    if (pathname === '/api/admin/promos' && req.method === 'POST') {
      if (!requireAdmin(req,res,true)) return;
      const body = await parseBody(req, 16*1024), promos = readJson(PROMOS_FILE, []), code = normalizePromoCode(body.code);
      if (!code || !['percent','fixed'].includes(body.type) || !validMoney(body.value,0.01,10000) || (body.type === 'percent' && Number(body.value) > 100)) return json(res,400,{error:'Code promo invalide.'});
      if (promos.some(p=>normalizePromoCode(p.code)===code)) return json(res,409,{error:'Ce code existe déjà.'});
      const promo={id:crypto.randomUUID(),code,label:cleanText(body.label,80),type:body.type,value:Number(body.value),minOrder:Math.max(0,Number(body.minOrder||0)),maxDiscount:Math.max(0,Number(body.maxDiscount||0)),maxUses:Math.max(0,Math.trunc(Number(body.maxUses||0))),uses:0,startsAt:body.startsAt||'',endsAt:body.endsAt||'',active:body.active!==false,createdAt:new Date().toISOString()};
      promos.unshift(promo); writeJson(PROMOS_FILE,promos); audit(req,'promo.created',{promoId:promo.id,code:promo.code}); return json(res,201,promo);
    }
    if (/^\/api\/admin\/promos\/[^/]+$/.test(pathname) && ['PUT','DELETE'].includes(req.method)) {
      if (!requireAdmin(req,res,true)) return;
      const id=decodeURIComponent(pathname.split('/').pop()), promos=readJson(PROMOS_FILE,[]), index=promos.findIndex(p=>p.id===id);
      if(index<0)return json(res,404,{error:'Code promo introuvable.'});
      if(req.method==='DELETE'){const [removed]=promos.splice(index,1);writeJson(PROMOS_FILE,promos);audit(req,'promo.deleted',{promoId:id});return json(res,200,removed);}
      const body=await parseBody(req,16*1024); const allowed={};
      if (body.active != null) allowed.active = Boolean(body.active);
      if (body.label != null) allowed.label = cleanText(body.label,80);
      if (body.endsAt != null) allowed.endsAt = String(body.endsAt).slice(0,40);
      promos[index]={...promos[index],...allowed,id}; writeJson(PROMOS_FILE,promos); audit(req,'promo.updated',{promoId:id}); return json(res,200,promos[index]);
    }
    if (/^\/api\/admin\/orders\/[^/]+$/.test(pathname) && req.method === 'PATCH') {
      if (!requireAdmin(req,res,true)) return;
      const id=decodeURIComponent(pathname.split('/').pop()), body=await parseBody(req,8*1024), orders=readJson(ORDERS_FILE,[]), index=orders.findIndex(o=>o.id===id);
      if(index<0)return json(res,404,{error:'Commande introuvable.'});
      const nextStatus=body.status==null?orders[index].status:String(body.status), nextPayment=body.paymentStatus==null?orders[index].paymentStatus:String(body.paymentStatus);
      if(!ORDER_STATUSES.has(nextStatus)||!PAYMENT_STATUSES.has(nextPayment))return json(res,400,{error:'Statut invalide.'});
      orders[index].status=nextStatus; orders[index].paymentStatus=nextPayment; writeJson(ORDERS_FILE,orders); audit(req,'order.updated',{orderId:id,status:nextStatus,paymentStatus:nextPayment}); return json(res,200,orders[index]);
    }
    if (pathname === '/api/admin/categories' && req.method === 'GET') {
      if(!requireAdmin(req,res))return;
      return json(res,200,{categories:getProductCategories()});
    }
    if (pathname === '/api/admin/categories' && req.method === 'POST') {
      if(!requireAdmin(req,res,true))return;
      const body=await parseBody(req,8*1024),name=cleanText(body.name,40);
      if(!name||name.toLowerCase()==='tous')return json(res,400,{error:'Nom de catégorie invalide.'});
      const settings=getSettings(),categories=Array.isArray(settings.productCategories)?settings.productCategories:[];
      if(categories.some(x=>String(x).toLowerCase()===name.toLowerCase()))return json(res,409,{error:'Cette catégorie existe déjà.'});
      if(categories.length>=30)return json(res,400,{error:'Maximum 30 catégories.'});
      settings.productCategories=[...categories,name]; writeJson(SETTINGS_FILE,settings); audit(req,'category.created',{name});
      return json(res,201,{categories:settings.productCategories});
    }
    if (/^\/api\/admin\/categories\/[^/]+$/.test(pathname) && req.method === 'DELETE') {
      if(!requireAdmin(req,res,true))return;
      const name=cleanText(decodeURIComponent(pathname.split('/').pop()),40),settings=getSettings(),categories=Array.isArray(settings.productCategories)?settings.productCategories:[];
      const actual=categories.find(x=>String(x).toLowerCase()===name.toLowerCase());
      if(!actual)return json(res,404,{error:'Catégorie introuvable.'});
      if(categories.length<=1)return json(res,409,{error:'Conservez au moins une catégorie dans la boutique.'});
      const products=readJson(PRODUCTS_FILE,[]);
      if(products.some(p=>String(p.category||'').toLowerCase()===String(actual).toLowerCase()))return json(res,409,{error:'Cette catégorie contient encore des articles. Déplacez-les avant de la supprimer.'});
      settings.productCategories=categories.filter(x=>String(x).toLowerCase()!==String(actual).toLowerCase()); writeJson(SETTINGS_FILE,settings); audit(req,'category.deleted',{name:actual});
      return json(res,200,{categories:settings.productCategories});
    }
    if (pathname === '/api/admin/products' && req.method === 'GET') { if(!requireAdmin(req,res))return; return json(res,200,readJson(PRODUCTS_FILE,[])); }
    if (pathname === '/api/admin/products' && req.method === 'POST') {
      if (!requireAdmin(req,res,true)) return;
      const body=await parseBody(req,32*1024); if(!validateProduct(body))return json(res,400,{error:'Produit invalide.'}); if(!isAllowedProductCategory(body.category))return json(res,400,{error:'Choisissez une catégorie créée dans l’administration.'});
      const products=readJson(PRODUCTS_FILE,[]), id=safeId(body.id||body.name); if(!id||products.some(p=>p.id===id))return json(res,409,{error:'Cet identifiant existe déjà.'});
      const product={id,...sanitizeProduct(body)}; products.push(product); writeJson(PRODUCTS_FILE,products); audit(req,'product.created',{productId:id}); return json(res,201,product);
    }
    if (/^\/api\/admin\/products\/[^/]+$/.test(pathname) && ['PUT','DELETE'].includes(req.method)) {
      if (!requireAdmin(req,res,true)) return;
      const id=decodeURIComponent(pathname.split('/').pop()), products=readJson(PRODUCTS_FILE,[]), index=products.findIndex(p=>p.id===id); if(index<0)return json(res,404,{error:'Produit introuvable.'});
      if(req.method==='DELETE'){const [removed]=products.splice(index,1);writeJson(PRODUCTS_FILE,products);audit(req,'product.deleted',{productId:id});return json(res,200,removed);}
      const body=await parseBody(req,32*1024); const candidate={...products[index],...body}; if(!validateProduct(candidate))return json(res,400,{error:'Produit invalide.'}); if(!isAllowedProductCategory(candidate.category))return json(res,400,{error:'Choisissez une catégorie créée dans l’administration.'});
      products[index]={id,...sanitizeProduct({...products[index],...body},products[index])}; writeJson(PRODUCTS_FILE,products); audit(req,'product.updated',{productId:id}); return json(res,200,products[index]);
    }
    if (pathname.startsWith('/api/')) return json(res,404,{error:'Route introuvable.'});
    if (pathname === '/contact') {
      res.writeHead(301,{Location:'/', 'Cache-Control':'no-cache'});
      return res.end();
    }

    if (!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Méthode non autorisée.'},{Allow:'GET, HEAD'});
    if (!serveStatic(req,res,pathname)) return json(res,404,{error:'Page introuvable.'});
  } catch (error) {
    if (!res.headersSent) json(res,error.status||500,{error:error.status&&error.status<500?error.message:'Erreur interne du serveur.'});
    if (!error.status || error.status >= 500) console.error(error);
  }
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;
server.listen(PORT,'0.0.0.0',()=>{
  console.log(`LGY.fr disponible sur http://localhost:${PORT} (${NODE_ENV})`);
  if (!process.env.TOKEN_SECRET) console.warn('⚠ Configurez TOKEN_SECRET dans Railway pour conserver les sessions entre redéploiements.');
});
