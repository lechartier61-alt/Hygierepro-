import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const app=read('public/js/app.js'),html=read('public/app.html'),auth=read('src/routes/auth.js'),account=read('src/routes/account.js'),records=read('src/routes/records.js'),work=read('src/routes/workdays.js'),sup=read('src/routes/suppliers.js'),equipment=read('src/routes/equipment.js'),billing=read('src/routes/billing.js'),reports=read('src/routes/reports.js'),admin=read('src/routes/admin.js'),middleware=read('src/middleware/auth.js'),media=read('src/routes/media.js');
let pass=0,fail=0;const t=(n,c)=>{console.log(`${c?'✓':'✗'} ${n}`);c?pass++:fail++};
// Commun
t('Session utilisateur séparée de l’admin',middleware.includes('hp_session')&&middleware.includes('hp_admin'));
t('CSRF utilisateur/admin séparés',middleware.includes('req.admin?req.adminCsrfToken:req.csrfToken'));
t('Isolation organisation sur les relevés',records.includes('r.organization_id=$1')&&records.includes('req.user.organization_id'));
t('Isolation organisation sur les journées',work.includes('p.organization_id=$1')&&work.includes('req.user.organization_id'));
t('Isolation organisation sur les fournisseurs',sup.includes('organization_id=$1')&&sup.includes('req.user.organization_id'));
t('Rôles frontend différenciés',app.includes("role==='owner'?'Gérant':role==='manager'?'Responsable':'Employé'"));
// Gérant
t('Gérant : invitation équipe réservée owner',auth.includes("'/team/invite',requireUser,requireSubscription,roles('owner')"));
t('Gérant : abonnement réservé owner',billing.includes("'/checkout',requireUser,roles('owner')")&&billing.includes("'/portal',requireUser,roles('owner')"));
t('Gérant : sauvegarde complète réservée owner',account.includes("'/backup.zip',requireUser,roles('owner')"));
t('Gérant : suppression organisation protégée par mot de passe',account.includes("'/delete-organization',requireUser,roles('owner')")&&account.includes('verifyPassword'));
t('Gérant : gestion fournisseurs sensible owner',sup.includes("r.post('/',requireUser,roles('owner')")&&sup.includes("r.patch('/:id',requireUser,roles('owner')"));
t('Gérant : écran établissement / abonnement owner',html.includes('data-page="subscription"')&&html.includes('data-page="establishment"'));
// Responsable
t('Responsable : voit équipe',auth.includes("'/team',requireUser,requireSubscription,roles('owner','manager')"));
t('Responsable : planifie horaires',auth.includes("'/team/:id/schedule',requireUser,requireSubscription,roles('owner','manager')"));
t('Responsable : crée/modifie journées',work.includes("r.post('/',requireUser,roles('owner','manager')")&&work.includes("r.put('/:id',requireUser,roles('owner','manager')"));
t('Responsable : module équipements complet',equipment.includes("r.get('/',requireUser,roles('owner','manager')")&&equipment.includes("r.post('/',requireUser,roles('owner','manager')"));
t('Responsable : rapports autorisés',reports.includes("roles('owner','manager')"));
t('Responsable : journal autorisé',account.includes("'/audit',requireUser,roles('owner','manager')"));
t('Responsable : ne peut pas inviter des comptes',!auth.includes("'/team/invite',requireUser,requireSubscription,roles('owner','manager')"));
t('Responsable : ne peut pas soumettre commande fournisseur',sup.includes("/:id/orders/submit',requireUser,roles('owner')"));
// Employé
t('Employé : historique limité à ses saisies',records.includes("if(req.user.role==='employee')")&&records.includes('r.created_by=$'));
t('Employé : heure terrain imposée par serveur',records.includes("req.user.role==='employee'?null")&&records.includes('serverTimestamp'));
t('Employé : journée limitée à son compte',work.includes("plan.employee_id===req.user.id"));
t('Employé : liste de toutes les journées interdite',work.includes("r.get('/',requireUser,roles('owner','manager')"));
t('Employé : création de journée interdite',work.includes("r.post('/',requireUser,roles('owner','manager')"));
t('Employé : équipement inaccessible',equipment.includes("roles('owner','manager')"));
t('Employé : données fournisseur sensibles masquées',sup.includes("if(req.user.role==='employee')return res.json(data.map"));
t('Employé : prix/références fournisseur masqués',sup.includes('unit_price_cents,supplier_reference,minimum_order_cents'));
t('Employé : facturation inaccessible',billing.includes("roles('owner')"));
t('Employé : preuve média liée non supprimable',media.includes('media_evidence_locked'));
t('Employé : navigation mobile limitée',html.includes('employee-only')&&read('public/css/app.css').includes('.mobile-nav [data-page="traceability"]{display:none!important}'));
// Admin HygieSafe
t('Admin : données métier protégées par 2FA',admin.includes("r.get('/dashboard',requireAdmin,require2fa")&&admin.includes("r.get('/organizations',requireAdmin,require2fa"));
t('Admin : login séparé',admin.includes("r.post('/auth/login'")&&middleware.includes('loadAdmin'));
t('Admin : suppression organisation exige confirmation',admin.includes("confirmation:z.literal('SUPPRIMER')"));
t('Admin : suppression exige mot de passe',admin.includes('adminPassword')&&admin.includes('verifyPassword(req.admin.password_hash'));
t('Admin : Stripe annulé avant suppression si abonnement',admin.includes('stripe.subscriptions.cancel')&&admin.includes('stripe_required_for_delete'));
t('Admin : compte démo mot de passe aléatoire',admin.includes('crypto.randomBytes(12)')&&admin.includes('Le mot de passe est affiché une seule fois'));
t('Admin : opérations auditées',admin.includes("admin.organization_delete")&&admin.includes("admin.demo_account_created"));
console.log(`HygieSafe v6.7.5 — Comptes & rôles : ${pass}/${pass+fail}`);if(fail)process.exit(1);
