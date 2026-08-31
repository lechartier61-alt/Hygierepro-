import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const files={
  version:read('src/version.js'),pkg:read('package.json'),server:read('src/server.js'),route:read('src/routes/pilotage.js'),svc:read('src/services/pilotage.js'),net:read('src/services/network.js'),auth:read('src/routes/auth.js'),middleware:read('src/middleware/auth.js'),billing:read('src/routes/billing.js'),account:read('src/routes/account.js'),admin:read('src/routes/admin.js'),work:read('src/routes/workdays.js'),equip:read('src/routes/equipment.js'),records:read('src/routes/records.js'),backup:read('src/services/backup.js'),html:read('public/app.html'),app:read('public/js/app.js'),css:read('public/css/app.css'),sw:read('public/sw.js'),mig:read('db/migrations/034_pilotage_intelligent_v680.sql')
};
let pass=0,fail=0; const t=(name,cond)=>{if(cond){pass++;console.log('✓',name)}else{fail++;console.error('✗',name)}};
const has=(f,...parts)=>parts.every(x=>files[f].includes(x));

// Version et branchement
[
 ['Version applicative branche 6.8.x',/APP_VERSION='6\.8\.\d+'/.test(files.version)],
 ['Package branche 6.8.x',/^6\.8\.\d+$/.test(JSON.parse(files.pkg).version)],
 ['Test v6.8.0 déclaré',JSON.parse(files.pkg).scripts['test:v680']==='node scripts/test-v680-pilotage-intelligent.js'],
 ['Migration 034 présente',has('mig','HygieSafe v6.8.0','app_version=\'6.8.0\'')],
 ['Cache PWA branche 6.8.x',/hygiesafe-v6\.8\.\d+-shell/.test(files.sw)],
 ['CSS/JS app cache-bustés branche 6.8.x',/\/css\/app\.css\?v=6\.8\.\d+/.test(files.html)&&/\/js\/app\.js\?v=6\.8\.\d+/.test(files.html)],
 ['Route pilotage montée',has('server',"app.use('/api/pilotage'","pilotageRoutes")],
 ['Ingestion capteur montée séparément',has('server',"/api/pilotage/sensors/ingest",'sensorIngestRouter')]
].forEach(x=>t(...x));

// Schéma / migration
[
 ['Réseaux',has('mig','CREATE TABLE IF NOT EXISTS organization_networks')],
 ['Organisation liée au réseau',has('mig','ADD COLUMN IF NOT EXISTS network_id')],
 ['Session site actif',has('mig','ADD COLUMN IF NOT EXISTS active_organization_id')],
 ['Adhésions établissement',has('mig','CREATE TABLE IF NOT EXISTS organization_memberships')],
 ['Rôle membership contraint',has('mig',"role IN ('owner','manager','employee')")],
 ['Membership unique site/utilisateur',has('mig','UNIQUE(organization_id,user_id)')],
 ['Actions correctives',has('mig','CREATE TABLE IF NOT EXISTS corrective_actions')],
 ['Action critique non dupliquée par source',has('mig','idx_corrective_source_open_unique')],
 ['Recettes',has('mig','CREATE TABLE IF NOT EXISTS recipes')],
 ['Ingrédients recette',has('mig','CREATE TABLE IF NOT EXISTS recipe_ingredients')],
 ['Lots de production',has('mig','CREATE TABLE IF NOT EXISTS production_batches')],
 ['Lots ingrédients production',has('mig','CREATE TABLE IF NOT EXISTS production_batch_inputs')],
 ['Règles DLC secondaires',has('mig','CREATE TABLE IF NOT EXISTS secondary_shelf_life_rules')],
 ['Étiquettes produits',has('mig','CREATE TABLE IF NOT EXISTS product_labels')],
 ['Capteurs',has('mig','CREATE TABLE IF NOT EXISTS sensors')],
 ['Mesures capteurs',has('mig','CREATE TABLE IF NOT EXISTS sensor_readings')],
 ['Idempotence mesures capteur',has('mig','UNIQUE(sensor_id,idempotency_key)')],
 ['Notifications utilisateur',has('mig','CREATE TABLE IF NOT EXISTS user_notifications')],
 ['Déduplication notifications',has('mig','idx_user_notifications_dedupe')],
 ['Triggers updated_at',has('mig','trg_network_touch','trg_corrective_touch','trg_sensor_touch')]
].forEach(x=>t(...x));

// Score et centre À traiter
[
 ['Overview protégé',has('route',"r.get('/overview',requireUser")],
 ['Score multi-composants',has('svc','temperatures:','traceability:','operations:','equipment:','quality:')],
 ['Score non initialisé sans données',has('svc',"scoreStatus:score==null?'uninitialized'")],
 ['Score borné 0-100',has('svc','const clamp=n=>Math.max(0,Math.min(100')],
 ['Score exclut l’équipement pour employé',has('svc','employeeId?Promise.resolve({rows:[{total:0,issues:0,maintenance_due:0,temp_equipment:0}]})')],
 ['Score exclut les capteurs pour employé',has('svc','employeeId?Promise.resolve({rows:[{total:0,alert:0,offline:0}]})')],
 ['Non-conformités prioritaires',has('svc',"non-conformité","'critical','quality'")],
 ['Pannes prioritaires',has('svc',"équipement","'critical','equipment'")],
 ['Blocages équipe prioritaires',has('svc',"blocage","'critical','team'")],
 ['Capteurs prioritaires',has('svc',"capteur","'critical','sensor'")],
 ['DLC dépassées prioritaires',has('svc',"produit","'critical','traceability'")],
 ['Maintenances proches',has('svc','maintenance_due')],
 ['Disclaimer HACCP',has('svc','ne constitue ni une certification ni une garantie de conformité HACCP')],
 ['Page À traiter',has('html','id="page-actions"','<h1>À traiter</h1>')],
 ['Badge compteur À traiter',has('html','id="actionsNavCount"')],
 ['Filtres actions',has('html','data-action-filter="open"','data-action-filter="resolved"')]
].forEach(x=>t(...x));

// Actions correctives
[
 ['Liste actions isolée organisation',has('route','FROM corrective_actions a','a.organization_id=$1')],
 ['Employé voit actions assignées ou communes',has('route','a.assigned_to=$2 OR a.assigned_to IS NULL')],
 ['Création réservée manager/gérant',has('route',"r.post('/actions',requireUser,roles('owner','manager')")],
 ['Assignation vérifie membership',has('route','organization_memberships WHERE organization_id=$1 AND user_id=$2 AND active=true')],
 ['Démarrage action',has('route',"'/actions/:id/start'")],
 ['Résolution documentée obligatoire',has('route','resolution:safeText(2,3000)')],
 ['Critique non masquable',has('route',"severity<>'critical'",'Une priorité critique doit être résolue')],
 ['Notification à l’assignation',has('route',"type:'corrective_action'",'dedupeKey:`action:${row.id}`')]
].forEach(x=>t(...x));

// Recettes / production / rappel
[
 ['API recettes',has('route',"r.get('/recipes'","r.post('/recipes'")],
 ['Détail recette avec ingrédients',has('route',"r.get('/recipes/:id'",'recipe.ingredients=')],
 ['Édition recette',has('route',"r.patch('/recipes/:id'")],
 ['Ingrédient source vérifié organisation',has('route','Un ingrédient ne correspond pas à cet établissement')],
 ['API production',has('route',"r.get('/production'","r.post('/production'")],
 ['Production employé heure serveur',has('route',"req.user.role==='employee'?null:(d.producedAt||null)")],
 ['Recette production vérifiée organisation',has('route','Recette invalide.')],
 ['Lots ingrédients vérifiés organisation',has('route','Un lot ingrédient appartient à un autre établissement')],
 ['Code lot HygieSafe automatique',has('route','`HS-${new Date().toISOString()')],
 ['Statuts lot production',has('route',"['active','consumed','withdrawn','discarded']")],
 ['Recherche rappel lot',has('route',"r.get('/recall'",'supplier_lot')],
 ['Rappel retourne productions + sources',has('route','productionUses:inputs.rows','sourceRecords:records.rows')],
 ['Page Production',has('html','id="page-production"','Production & lots')],
 ['Page Recettes',has('html','id="page-recipes"','Référentiel production')]
].forEach(x=>t(...x));

// DLC / étiquettes
[
 ['API règles DLC',has('route',"r.get('/shelf-life'","r.post('/shelf-life'")],
 ['Édition règle DLC',has('route',"r.patch('/shelf-life/:id'")],
 ['Déclencheurs DLC',has('route',"['opening','preparation','thawing','production']")],
 ['Durée DLC bornée',has('route','durationHours:z.coerce.number().int().min(1).max(8760)')],
 ['API étiquettes',has('route',"r.get('/labels'","r.post('/labels'")],
 ['Étiquette employé heure serveur',has('route',"const prepared=req.user.role==='employee'?new Date()")],
 ['Source étiquette isolée organisation',has('route','Preuve source invalide.')],
 ['Production étiquette isolée organisation',has('route','Production invalide.')],
 ['PDF étiquette',has('route',"r.get('/labels/:id.pdf'",'À utiliser avant')],
 ['Page DLC/étiquettes',has('html','id="page-labels"','DLC secondaire')]
].forEach(x=>t(...x));

// Capteurs
[
 ['Capteurs réservés manager/gérant',has('route',"r.get('/sensors',requireUser,roles('owner','manager')")],
 ['Création capteur',has('route',"r.post('/sensors'",'tokenHash(token)')],
 ['Clé capteur affichée une seule fois',has('route','...row,token,ingestUrl')],
 ['Édition capteur',has('route',"r.patch('/sensors/:id'")],
 ['Rotation clé réservée gérant',has('route',"r.post('/sensors/:id/rotate-token',requireUser,roles('owner')")],
 ['Historique capteur',has('route',"r.get('/sensors/:id/readings'")],
 ['Équipement capteur vérifié organisation/type',has('route',"type='equipment'",'Équipement invalide.')],
 ['Ingestion clé Bearer ou header dédié',has('route',"authorization","x-hygiesafe-sensor-key")],
 ['Clé capteur hachée',has('route','WHERE token_hash=$1',["tokenHash(rawToken)"])],
 ['Horodatage capteur borné',has('route','Date.now()+5*60*1000','Date.now()-7*86400000')],
 ['Mesure idempotente',has('route',"e.code==='23505'&&d.idempotencyKey")],
 ['Statut capteur online/alert',has('route',"conforme?'online':'alert'")],
 ['Température capteur crée un relevé',has('route',"type='temperature'", "source:'sensor'")],
 ['Hors seuil crée/maintient non-conformité',has('route',"type='nonconformity'",'Capteur hors seuil')],
 ['Hors seuil crée action corrective',has('route',"'sensor'", "'critical','temperature'")],
 ['Retour normal résout anomalie',has('route',"Retour automatique dans la plage normale")],
 ['Alerte capteur notifie managers',has('route',"type:'sensor_alert'",'notifyManagers')],
 ['Page Capteurs',has('html','id="page-sensors"','Mesures automatiques')]
].forEach(x=>t(...x));

// Notifications
[
 ['Création notification dédupliquée',has('svc','ON CONFLICT DO NOTHING RETURNING *')],
 ['Managers déterminés via memberships',has('svc','JOIN organization_memberships m','m.role IN (\'owner\',\'manager\')')],
 ['API notifications isolée site/utilisateur',has('route',"r.get('/notifications'",'organization_id=$1','user_id=$2 OR user_id IS NULL')],
 ['Tout marquer lu',has('route',"'/notifications/read-all'")],
 ['Marquer une notification lue',has('route',"'/notifications/:id/read'")],
 ['Notification navigateur via SW',has('app','showSystemNotification','reg.showNotification')],
 ['Demande permission navigateur',has('app','Notification.requestPermission()')]
].forEach(x=>t(...x));

// Multisite
[
 ['Réseau créé pour chaque organisation existante',has('mig','INSERT INTO organization_networks','UPDATE organizations SET network_id=id')],
 ['Memberships rétrocompatibles',has('mig','INSERT INTO organization_memberships','SELECT organization_id,id,role,active FROM users')],
 ['Session choisit membership actif',has('middleware','JOIN LATERAL','m.active=true','o.status=\'active\'')],
 ['Rôle actif vient de membership',has('middleware','JOIN organization_memberships am','am.role')],
 ['Facturation vient du site de billing',has('middleware','billing_organization_id','JOIN organizations bo')],
 ['Changement site stocké en session',has('route',"UPDATE sessions SET active_organization_id=$1")],
 ['Changement site vérifie réseau + membership',has('route','o.network_id=$3','m.active=true')],
 ['Création site uniquement principal',has('route','Créez les établissements depuis le site principal du réseau')],
 ['Création site réplique état de facturation',has('route','trial_started_at,trial_ends_at,subscription_status,monthly_amount_cents')],
 ['Création site donne owner au créateur',has('route',"ensureMembership(c,{organizationId:org.id,userId:req.user.id,role:'owner'")],
 ['Suspension site vide sessions actives',has('route','UPDATE sessions SET active_organization_id=NULL WHERE active_organization_id=$1')],
 ['Accès réseau vérifie appartenance réseau',has('route','Cet utilisateur ne fait pas partie du réseau')],
 ['Dernier gérant protégé',has('route','Impossible de retirer ou rétrograder le dernier Gérant')],
 ['Retrait accès ne désactive pas compte global',!files.route.includes('UPDATE users SET active=false')],
 ['Retrait accès vide session du site',has('route','UPDATE sessions SET active_organization_id=NULL WHERE user_id=$1 AND active_organization_id=$2')],
 ['Facturation quantité = sites actifs',has('net',"WHERE network_id=$1 AND status='active'",'subscriptionItems.update')],
 ['Checkout quantité multisite',has('billing','line_items:[{quantity:siteCount','network_id:req.user.network_id')],
 ['Facturation gérée depuis principal',has('billing','billing_primary_site_required')],
 ['Écran réseau limite données non-owner',has('route','const isPrimaryOwner','m.user_id=$2 AND m.active=true')],
 ['Page Réseau',has('html','id="page-network"','Organisation multisite')]
].forEach(x=>t(...x));

// Corrections multisite finales
[
 ['Horaires retour isolé établissement',has('auth','WHERE user_id=$1 AND organization_id=$2 ORDER BY weekday')],
 ['Workday valide rôle par membership',has('work','JOIN organization_memberships','m.active=true')],
 ['Employé Workday doit être employee sur le site',has('work',"employee.role!=='employee'")],
 ['Admin stats org via memberships',has('admin','organization_memberships m WHERE m.organization_id=o.id')],
 ['Admin owner org via membership',has('admin',"m.role='owner'")],
 ['Admin détail utilisateurs via memberships',has('admin','FROM organization_memberships m JOIN users u')],
 ['Admin démo crée réseau',has('admin','ensureOrganizationNetwork(c,org.id')],
 ['Admin démo crée membership',has('admin','ensureMembership(c,{organizationId:org.id')],
 ['Suppression compte bloque multisite',has('account','network_delete_blocked')],
 ['Suppression compte casse cycle réseau proprement',has('account','UPDATE organizations SET network_id=NULL','DELETE FROM organization_networks')],
 ['Suppression admin bloque réseau multisite',has('admin','networkSites>1','network_delete_blocked')],
 ['Suppression admin casse cycle réseau proprement',has('admin','UPDATE organizations SET network_id=NULL','DELETE FROM organization_networks')]
].forEach(x=>t(...x));

// Sauvegarde / rapports / UI
[
 ['Backup actions correctives',has('backup','actions-correctives.json')],
 ['Backup recettes',has('backup','recettes.json','ingredients-recettes.json')],
 ['Backup productions',has('backup','lots-production.json','lots-ingredients-production.json')],
 ['Backup DLC secondaires',has('backup','regles-dlc-secondaires.json','etiquettes-dlc.json')],
 ['Backup capteurs sans secret',has('backup','capteurs-sans-secrets.json')&&!files.backup.includes('token_hash FROM sensors')],
 ['Backup mesures capteurs',has('backup','mesures-capteurs.json')],
 ['Backup notifications',has('backup','notifications.json')],
 ['Backup memberships',has('backup','acces-etablissement.json')],
 ['Backup réseau',has('backup','reseau-etablissements.json')],
 ['Rapport pilotage PDF',has('route',"r.get('/report.pdf'",'HygieSafe — Rapport de pilotage')],
 ['Rapport rappelle responsabilité exploitant',has('route','responsabilité de l’exploitant')],
 ['Analyses 30 jours',has('route',"r.get('/analytics'",'production_batches','equipment_events')],
 ['Page Analyses',has('html','id="page-analytics"','<h1>Analyses</h1>')],
 ['Tutoriel v4',has('app','TUTORIAL_VERSION=4','Tutoriel Gérant · v4','Tutoriel Responsable · v4','Tutoriel Employé · v4')],
 ['Tutoriel présente Score',has('app','Commencez par le HygieSafe Score')],
 ['Tutoriel présente À traiter',has('app','Centre À traiter')],
 ['Tutoriel présente productions/lots',has('app','Tracez vos productions et vos lots')],
 ['Tutoriel présente DLC secondaires',has('app','Automatisez les DLC secondaires')],
 ['Tutoriel présente multisite',has('app','Pilotez plusieurs sites')],
 ['Styles pilotage dédiés',has('css','HygieSafe v6.8.0 · Pilotage intelligent')]
].forEach(x=>t(...x));

console.log(`HygieSafe v6.8.0 — Pilotage intelligent : ${pass}/${pass+fail}`);
if(fail)process.exit(1);
