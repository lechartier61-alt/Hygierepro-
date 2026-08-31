import fs from 'node:fs';
let pass=0,fail=0;const route=fs.readFileSync(new URL('../src/routes/scanner.js',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../public/app.html',import.meta.url),'utf8'),migration=fs.readFileSync(new URL('../db/migrations/035_scanner_dlc_product_link_v682.sql',import.meta.url),'utf8'),version=fs.readFileSync(new URL('../src/version.js',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),backup=fs.readFileSync(new URL('../src/services/backup.js',import.meta.url),'utf8');
function t(n,v){if(v){pass++;console.log('✓',n)}else{fail++;console.error('✗',n)}}
[
 ['version 6.8.2',version.includes("APP_VERSION='6.8.2'")],
 ['cache PWA 6.8.2',sw.includes('hygiesafe-v6.8.2-shell')],
 ['migration aliases produits',migration.includes('CREATE TABLE IF NOT EXISTS product_scan_aliases')],
 ['DLC exige un stockArticleId UUID',route.includes('stockArticleId:z.string().uuid()')],
 ['API résolution produit',route.includes("r.post('/dlc/resolve'")],
 ['API raccourcis produits',route.includes("r.get('/dlc/products'")],
 ['création produit depuis scanner',route.includes("r.post('/dlc/products'")&&route.includes("source:'scanner_dlc'" )],
 ['enregistrement DLC lié au produit',route.includes("r.post('/dlc'")&&route.includes("stockArticleId:d.stockArticleId")],
 ['serveur vérifie produit établissement',route.includes("Choisissez ou créez un produit avant d’enregistrer la DLC")],
 ['apprentissage alias OCR',route.includes('rememberAlias')&&route.includes("source:'scanner_dlc'" )],
 ['apprentissage code-barres',route.includes('rememberProduct')],
 ['anti doublon immédiat',route.includes("interval '2 minutes'")&&route.includes('dlc_duplicate_recent')],
 ['clic Scanner ouvre caméra DLC',app.includes("function navigate(page){go(page);if(page==='scanner')setTimeout(()=>startScan('dlc',true),90)" )],
 ['bouton caméra dédié DLC',app.includes("$('#autoScanCamera').onclick=()=>startScan('dlc',true)")],
 ['photo nette analysée automatiquement',app.includes("state.scanMode==='dlc'&&Number(state.scanQuality?.score||0)>=55")],
 ['sélection produit obligatoire UI',app.includes('Une DLC doit toujours être liée à un produit HygieSafe.')],
 ['raccourcis produits existants',app.includes('dlc-product-shortcuts')&&app.includes('Choisir dans mes produits')],
 ['création produit sans quitter scanner',app.includes('Créer et continuer')&&app.includes('/api/scanner/dlc/products')],
 ['écran simplifié DLC',html.includes('<h1>Scanner une DLC</h1>')&&html.includes('1 clic = caméra')],
 ['facture reste en option avancée',html.includes('Autres usages du scanner')&&html.includes('Facture')],
 ['mode série et réception conservés',html.includes('Mode série')&&html.includes('Réception')],
 ['enregistrement preuve photo',app.includes("uploadCurrentScanEvidence('scan_traceability')")],
 ['succès propose scan suivant',app.includes('Scanner la DLC suivante')],
 ['apprentissage scanner inclus sauvegarde',backup.includes('productScanAliases')&&backup.includes('liaisons-scanner-produits.json')],
].forEach(([n,v])=>t(n,v));
console.log(`\n${pass}/${pass+fail} contrôles v6.8.2 scanner DLC réussis`);if(fail)process.exit(1);
