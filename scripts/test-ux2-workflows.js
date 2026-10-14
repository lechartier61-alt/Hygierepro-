import fs from 'node:fs';
import assert from 'node:assert/strict';
const file=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const client=file('../public/app.html'),admin=file('../public/admin.html');
const js=file('../public/js/workflows.js'),css=file('../public/css/workflows.css');
const sw=file('../public/sw.js'),appJs=file('../public/js/app.js');
function getPages(html,prefix){
  return [...new Set([...html.matchAll(/<section\b[^>]*>/g)]
    .filter(([s])=>/class="[^"]*\bpage\b/.test(s))
    .map(([s])=>s.match(new RegExp(`\\bid="${prefix}([a-z-]+)"`))?.[1]).filter(Boolean))];
}
const clients=getPages(client,'page-');const admins=getPages(admin,'admin-');
assert.equal(clients.length,34);
assert.equal(admins.length,10);
const flowNames=new Set([...js.matchAll(/^  ([a-z]+):\[\[/gm)].map(m=>m[1]));
assert.ok(clients.every(id=>flowNames.has(id)),`Client non couvert: ${clients.filter(id=>!flowNames.has(id))}`);
assert.ok(admins.every(id=>flowNames.has(id)),`Admin non couvert: ${admins.filter(id=>!flowNames.has(id))}`);
for (const html of [client,admin]) {
  assert.ok(html.includes('/css/workflows.css?v=ux-2'));
  assert.ok(html.includes('/js/workflows.js?v=ux-2'));
}
assert.ok(sw.includes('hygiesafe-v6.8.4-shell-ux2'));
assert.ok(sw.includes("'/css/workflows.css'") && sw.includes("'/js/workflows.js'"));
for (const word of ['Réceptionner une livraison','Faire un contrôle','Scanner une DLC','Signaler un problème','Voir les autres actions','Non enregistré','closeGuard','aria-modal','permittedAction','focusable','lastSubmit'])
  assert.ok(js.includes(word),`${word} absent`);
assert.match(js,/\/\/ No|Aucun appel API/);
assert.ok(!js.includes('fetch(')&&!js.includes('localStorage.setItem('),'Les parcours UX2 ne doivent pas créer de données, contourner l’API ni sauvegarder des brouillons');
assert.match(appJs,/function attachTemperatureThresholdHint\(/);
assert.match(appJs,/attachTemperatureThresholdHint\(eq\)/);
assert.match(appJs,/t==='number'\?'step="any" inputmode="decimal"/);
assert.ok(appJs.includes('prefill[n]??'), 'Conserver les valeurs préremplies égales à 0');
assert.ok(css.includes('max-width:720px'));
assert.ok(css.includes('focus-visible'));
console.log(`HygieSafe UX2 : ${clients.length} pages métier + ${admins.length} pages admin, raccourcis, formulaires, seuils et PWA : contrôles statiques OK`);
