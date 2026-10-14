import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../public/js/app.js'),html=read('../public/app.html'),css=read('../public/css/app.css'),route=read('../src/routes/scanner.js'),version=read('../src/version.js'),pkg=JSON.parse(read('../package.json'));
let pass=0,fail=0;function t(n,v){if(v){pass++;console.log('✓',n)}else{fail++;console.error('✗',n)}}
[
 ['version 6.8.4',version.includes("APP_VERSION='6.8.4'")&&pkg.version==='6.8.4'],
 ['caméra DLC reste directe',app.includes("if(page==='scanner')setTimeout(()=>startScan('dlc',true),90)")&&app.includes("$('#autoScanCamera').onclick=()=>startScan('dlc',true)")],
 ['consigne cadrage DLC et lot',app.includes('Cadrez uniquement la zone où l’on voit la DLC et le numéro de lot')&&html.includes('Cadrez la zone DLC + numéro de lot')],
 ['état conserve maximum deux preuves',app.includes('scanDlcEvidenceFiles:[]')&&app.includes('scanDlcEvidencePreviews:[]')],
 ['bouton deuxième photo',app.includes('id="dlcAddEvidence"')&&app.includes('chooseAdditionalDlcEvidence')],
 ['limite UI à deux photos',app.includes("Deux photos maximum pour une DLC")&&app.includes(".slice(0,2)")],
 ['analyse OCR deuxième photo',app.includes('analyzeAdditionalDlcEvidence')&&app.includes("fd.append('mode','dlc')")],
 ['fusion DLC lot entre deux photos',app.includes('mergeDlcOcr')&&app.includes("strongerField(primary,secondary,'date')")&&app.includes("strongerField(primary,secondary,'lot')")],
 ['aperçus preuve photo',app.includes('dlcEvidenceHtml')&&css.includes('.dlc-evidence-grid')&&css.includes('.dlc-add-evidence')],
 ['envoi des deux preuves',app.includes('uploadDlcEvidencePhotos')&&app.includes('mediaIds,detectedProductName')],
 ['au moins une preuve requise serveur',route.includes("'dlc_evidence_required'")&&route.includes('if(!evidenceIds.length)')],
 ['deux preuves maximum serveur',route.includes("'dlc_evidence_limit'")&&route.includes('evidenceIds.length>2')],
 ['schéma mediaIds max2',route.includes('mediaIds:z.array(z.string().uuid()).min(1).max(2).optional()')],
 ['preuves appartiennent à organisation',route.includes("organization_id=$1 AND id=ANY($2::uuid[])")&&route.includes("kind='scan_traceability'")],
 ['record conserve tableau de preuves',route.includes('scanMediaIds:evidenceIds')&&route.includes('evidencePhotoCount:evidenceIds.length')],
 ['preuve ciblée DLC lot',route.includes("evidenceScope:'dlc_lot_zone'")&&route.includes("source:'scanner_dlc_v684'")],
 ['lot reste vérifié',app.includes("Aucun numéro de lot n’est renseigné. Continuer quand même ?")],
 ['produit obligatoire conservé',route.includes("'dlc_product_required'")&&app.includes("Choisissez ou créez le produit." )],
 ['création produit conservée',app.includes('openCreateDlcProduct')&&app.includes("'/api/scanner/dlc/products'" )],
 ['mémoire produit conservée',route.includes('rememberAlias')&&route.includes('rememberProduct')],
 ['texte réussite indique nombre photos',app.includes("photo${mediaIds.length>1?'s':''} de preuve")],
 ['PWA v6.8.3 conservée',app.includes('pwaSettingsCardHtml')&&fs.existsSync(new URL('../public/js/pwa-install.js',import.meta.url))]
].forEach(([n,v])=>t(n,v));
console.log(`\n${pass}/${pass+fail} contrôles v6.8.4 preuve DLC réussis`);if(fail)process.exit(1);
