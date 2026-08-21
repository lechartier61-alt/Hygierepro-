import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
let fail=0, pass=0;
function test(name,cond){if(cond){pass++;console.log('✓',name)}else{fail++;console.error('✗',name)}}
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const home=read('public/index.html');
const login=read('public/login.html');
const register=read('public/register.html');
const app=read('public/app.html');
const appJs=read('public/js/app.js');
const publicJs=read('public/js/public.js');
const css=read('public/css/app.css')+read('public/css/main.css');
const publicFiles=[];
for(const name of fs.readdirSync(path.join(root,'public'),{recursive:true})){
  const p=path.join(root,'public',String(name));
  if(fs.existsSync(p)&&fs.statSync(p).isFile()&&!/\.(png|jpg|jpeg|webp|ico)$/i.test(p))publicFiles.push(p);
}
const visibleBrand=publicFiles.map(p=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}}).join('\n');

test('Accueil : marque HygieSafe',home.includes('HygieSafe'));
test('Accueil : aucune ancienne marque HygiePro',!visibleBrand.includes('HygiePro'));
test('Accueil : CTA essai gratuit',home.includes('Essayer gratuitement'));
test('Accueil : connexion + inscription',home.includes('/login.html')&&home.includes('/register.html'));
test('Logo accueil : comportement non connecté / connecté',publicJs.includes("return r.ok?'/app.html':null")&&publicJs.includes('window.scrollTo'));
test('Inscription : parcours en 2 étapes',register.includes('regStep1')&&register.includes('regStep2')&&register.includes('regNext'));
test('Inscription : champs établissement, activité, nom, e-mail, mot de passe',['regOrganization','regBusinessType','regName','regEmail','regPassword'].every(x=>register.includes(x)));
test('Connexion : e-mail + mot de passe + mémoriser appareil',login.includes('loginEmail')&&login.includes('loginPassword')&&login.includes('remember'));
test('Application : tableau de bord Aujourd’hui',app.includes('page-today')&&app.includes('todayKpis')&&app.includes('priorityList'));
test('Application mobile : navigation essentielle en 5 onglets',(app.match(/<nav class="mobile-nav">[\s\S]*?<\/nav>/)||[''])[0].match(/data-page=/g)?.length===5);
test('Scanner : DLC, facture, code-barres',['data-scan="dlc"','data-scan="invoice"','data-scan="barcode"'].every(x=>app.includes(x)));
test('Commandes : facture → tableau réservée gérant',app.includes('id="scanSupplierInvoiceBtn"')&&app.includes('owner-only'));
test('Commandes : employé peut prévenir le gérant',app.includes('id="markNeedsReady"')&&app.includes('owner-hidden'));
test('Commandes : quantités partagées et sauvegarde',app.includes('id="saveSupplierNeeds"')&&appJs.includes('/api/suppliers/needs/mark-ready'));
test('Sauvegarde complète ZIP accessible au gérant',app.includes('/api/account/backup.zip')&&appJs.includes('Sauvegarde complète de l’établissement'));
test('Rôles : gérant / manager / employé différenciés',appJs.includes("function isOwner()")&&appJs.includes("function isManager()")&&appJs.includes("owner-only"));
test('Mobile : responsive dédié',css.includes('@media(max-width:720px)')&&css.includes('.mobile-nav'));
test('PWA : manifest HygieSafe',JSON.parse(read('public/manifest.webmanifest')).name==='HygieSafe');
test('Logo : nouveau wordmark HygieSafe présent',fs.existsSync(path.join(root,'public/assets/logo-hygiesafe.png')));

test('Prise en main : bouton Aide toujours accessible',app.includes('id="helpBtn"')&&app.includes('page-help'));
test('Prise en main : accueil adapté au rôle',app.includes('id="roleWelcome"')&&appJs.includes('quickByRole'));
test('Tutoriels : Gérant / Responsable / Employé',["owner:{title:'Tutoriel Gérant'","manager:{title:'Tutoriel Responsable'","employee:{title:'Tutoriel Employé'"].every(x=>appJs.includes(x)));
test('Tutoriels : suivi serveur par utilisateur',appJs.includes('/api/account/tutorial')&&appJs.includes('tutorialVersion'));
test('Mobile : textes d’aide conservés',css.includes('.page-head p{display:block!important'));
console.log(`Parcours utilisateur statique : ${pass}/${pass+fail}`);
if(fail)process.exit(1);
