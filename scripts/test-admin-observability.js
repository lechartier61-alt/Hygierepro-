import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);let fail=0,pass=0;
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function test(name,cond){if(cond){pass++;console.log('✓',name)}else{fail++;console.error('✗',name)}}
const route=read('src/routes/admin.js'),html=read('public/admin.html'),js=read('public/js/admin.js'),css=read('public/css/app.css'),migration=read('db/migrations/020_app_version_648_admin_observability.sql');
for(const endpoint of ['/dashboard','/organizations/:id/detail','/users','/billing-overview','/usage-overview','/system-overview'])test(`API admin ${endpoint}`,route.includes(endpoint));
for(const page of ['admin-dashboard','admin-organizations','admin-users','admin-billing','admin-usage','admin-system','admin-incidents','admin-audit'])test(`Page ${page}`,html.includes(`id="${page}"`));
test('Détails entreprise complets',js.includes('openOrgDetail')&&js.includes('recordTypes')&&js.includes('commerce'));
test('Recherche entreprises',js.includes('renderOrganizations')&&html.includes('id="orgSearch"'));
test('Recherche utilisateurs',js.includes('renderUsers')&&html.includes('id="userSearch"'));
test('Supervision sans secret brut',route.includes('fieldEncryption:!!config.fieldEncryptionKey')&&!route.includes('resend.apiKey:')&&!route.includes('stripe.secretKey:'));
test('CSS admin responsive',css.includes('Administration supervision v6.4.8')&&css.includes('.admin-kpis'));
test('Migration version 6.4.8',migration.includes("SET DEFAULT '6.4.8'"));
console.log(`Admin observabilité : ${pass}/${pass+fail}`);if(fail)process.exit(1);
