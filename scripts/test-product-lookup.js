import assert from 'node:assert/strict';
process.env.DATABASE_URL ||= 'postgresql://user:pass@127.0.0.1:5432/hygiesafe_test';
const { normalizeBarcode, mapOpenFoodFactsProduct, mapUpcItemDbItem } = await import('../src/services/product-lookup.js');

let pass=0;
function ok(name,fn){try{fn();pass++;console.log('OK',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}}

ok('normalise EAN avec espaces',()=>assert.equal(normalizeBarcode('3 017624 012345'),'3017624012345'));
ok('refuse code trop court',()=>assert.equal(normalizeBarcode('12345'),null));
ok('refuse code trop long',()=>assert.equal(normalizeBarcode('123456789012345'),null));
ok('map Open Food Facts',()=>{
  const p=mapOpenFoodFactsProduct('3017624010701',{product:{code:'3017624010701',product_name:'Pâte à tartiner',brands:'Exemple',categories:'Produits sucrés',quantity:'400 g',image_front_url:'https://images.example.test/front.jpg',allergens:'Lait, fruits à coque',ingredients_text:'Sucre, noisettes',completeness:.83}});
  assert.equal(p.name,'Pâte à tartiner');assert.equal(p.brand,'Exemple');assert.equal(p.quantityLabel,'400 g');assert.equal(p.source,'open_food_facts');assert.equal(p.sourceLicense,'ODbL');assert.ok(p.sourceUrl.includes('3017624010701'));assert.equal(p.allergens,'Lait, fruits à coque');
});
ok('rejette fiche OFF sans nom',()=>assert.equal(mapOpenFoodFactsProduct('3017624010701',{product:{code:'3017624010701'}}),null));
ok('map UPCitemdb',()=>{
  const p=mapUpcItemDbItem('4002293401102',{ean:'4002293401102',title:'Produit test',brand:'Marque test',category:'Food',size:'1 kg',images:['https://example.test/p.jpg']});
  assert.equal(p.name,'Produit test');assert.equal(p.brand,'Marque test');assert.equal(p.source,'upcitemdb');assert.equal(p.quantityLabel,'1 kg');
});
ok('refuse image non HTTPS',()=>{
  const p=mapUpcItemDbItem('4002293401102',{ean:'4002293401102',title:'Produit test',images:['http://example.test/p.jpg']});assert.equal(p.imageUrl,null);
});

const fs=await import('node:fs');
const route=fs.readFileSync(new URL('../src/routes/scanner.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../db/migrations/027_product_lookup_catalog.sql',import.meta.url),'utf8');
ok('route catalogue mémorisé',()=>assert.ok(route.includes("r.get('/products'")));
ok('route recherche produit',()=>assert.ok(route.includes("r.get('/products/:code'")));
ok('route mémoire produit',()=>assert.ok(route.includes("r.post('/products/:code/remember'")));
ok('UI recherche automatique',()=>assert.ok(ui.includes('lookupScannedProduct')));
ok('UI catalogue produits reconnus',()=>assert.ok(ui.includes('openRecognizedProducts')));
ok('UI attribution source',()=>assert.ok(ui.includes('sourceAttribution')));
ok('cache externe migration',()=>assert.ok(migration.includes('external_product_cache')));
ok('mémoire établissement migration',()=>assert.ok(migration.includes('organization_product_memory')));

const service=fs.readFileSync(new URL('../src/services/product-lookup.js',import.meta.url),'utf8');
ok('OFF consulté sans cache persistant',()=>assert.ok(!service.includes("source:'open_food_facts',product:off.product,attempts});return") || service.includes("if(off.found)return")));
ok('mémoire externe minimale',()=>assert.ok(service.includes("source=external?'manual_confirmation'")&&service.includes('brand=external?null')));
console.log(`Base Produits Internet v6.5.7 : ${pass}/17`);
if(process.exitCode)process.exit(process.exitCode);
