import fs from 'node:fs';
let pass=0,fail=0;
const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const middleware=fs.readFileSync(new URL('../src/middleware/auth.js',import.meta.url),'utf8');
const authPages=fs.readFileSync(new URL('../public/js/auth-pages.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function t(name,ok){if(ok){pass++;console.log('✓',name)}else{fail++;console.error('✗',name)}}
for(const route of [
  "req.path==='/auth/login'",
  "req.path==='/auth/register'",
  "req.path==='/auth/forgot-password'",
  "req.path==='/auth/reset-password'",
  "req.path==='/auth/email-verification/verify'",
  "req.path==='/admin/auth/login'"
])t(`bypass CSRF public ${route}`,server.includes(route));
t('invitation accept keeps token bypass',server.includes("/^\\/auth\\/invite\\/[^/]+\\/accept$/.test(req.path)"));
t('private authenticated writes still require CSRF',server.includes('if(req.user||req.admin)return requireCsrf(req,res,next)'));
t('CSRF middleware still rejects missing/wrong token',middleware.includes("new HttpError(403,'Session de sécurité expirée. Rechargez la page.','csrf')"));
t('forgot form remains a public POST without CSRF dependency',authPages.includes("post('/api/auth/forgot-password',{email:f.get('email')})"));
t('login form remains explicit credential authentication',authPages.includes("post('/api/auth/login',{email:f.get('email'),password:f.get('password'),remember:f.has('remember')})"));
t('PWA cache remains >= v6.8.1',/hygiesafe-v6\.8\.[1-9][0-9]*-shell/.test(sw));
console.log(`\n${pass}/${pass+fail} contrôles v6.8.1 réussis`);
if(fail)process.exit(1);
