const { detectFileType, validateFileBuffer }=await import('../src/utils/file-signature.js');
const { encryptWithKey, decryptWithKey }=await import('../src/utils/secret-box.js');
const { csvCell }=await import('../src/utils/csv.js');

let fail=0;
function ok(name,condition){if(condition)console.log('✓',name);else{fail++;console.error('✗',name)}}
const jpg=Buffer.from([0xff,0xd8,0xff,0xe0,0x00]);
const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
const pdf=Buffer.from('%PDF-1.7\n');
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
ok('détection JPEG',detectFileType(jpg)?.mime==='image/jpeg');
ok('détection PNG',detectFileType(png)?.mime==='image/png');
ok('détection PDF',detectFileType(pdf)?.mime==='application/pdf');
ok('SVG actif refusé',detectFileType(svg)===null);
try{validateFileBuffer(svg,['image/jpeg']);ok('signature invalide rejetée',false)}catch{ok('signature invalide rejetée',true)}
const key='test-only-key-that-is-long-and-random-enough-2026',secret='JBSWY3DPEHPK3PXP',enc=encryptWithKey(secret,key);
ok('secret 2FA chiffré',enc.startsWith('enc:v1:')&&!enc.includes(secret));
ok('secret 2FA déchiffré',decryptWithKey(enc,key)===secret);
try{decryptWithKey(enc,'wrong-key');ok('mauvaise clé refusée',false)}catch{ok('mauvaise clé refusée',true)}
ok('formule CSV neutralisée',csvCell('=HYPERLINK("https://evil.test")').startsWith("\"'="));
ok('valeur CSV standard conservée',csvCell('Produit')==='\"Produit\"');
if(fail)process.exit(1);console.log('SECURITY TESTS OK');
