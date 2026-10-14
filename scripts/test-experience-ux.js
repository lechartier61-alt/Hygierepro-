import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../public/app.html');
const adminHtml=read('../public/admin.html');
const js=read('../public/js/experience.js');
const css=read('../public/css/experience.css');
const sw=read('../public/sw.js');
const clientPages=[...html.matchAll(/<section\b[^>]*\bclass="[^"]*\bpage\b[^"]*"[^>]*\bid="page-([a-z-]+)"/g)].map(x=>x[1]);
const adminPages=[...adminHtml.matchAll(/<section\b[^>]*\bclass="[^"]*\bpage\b[^"]*"[^>]*\bid="admin-([a-z-]+)"/g)].map(x=>x[1]);
// The section attribute order may differ in future versions: derive from both orders.
function sectionIds(source,prefix){return [...new Set([...source.matchAll(/<section\b[^>]*>/g)].filter(([tag])=>/class="[^"]*\bpage\b/.test(tag)).map(([tag])=>tag.match(new RegExp(`\\bid="${prefix}([a-z-]+)"`))?.[1]).filter(Boolean))];}
const clients=sectionIds(html,'page-');
const admins=sectionIds(adminHtml,'admin-');
assert.equal(clients.length,34,`Nombre de pages clients inattendu: ${clients.length}`);
assert.equal(admins.length,10,`Nombre de pages administrateur inattendu: ${admins.length}`);
for(const id of [...clients,...admins]) assert.match(js,new RegExp(`^\\s{2}${id}\\s*:\\s*\\{`,`m`),`Aucun guide UX pour ${id}`);
for(const page of [html,adminHtml]){
 assert.ok(page.includes('experience.css?v=ux-1'),'Style UX absent');
 assert.ok(page.includes('experience.js?v=ux-1'),'Navigation UX absente');
}
assert.ok(sw.includes("'/css/experience.css'")&&sw.includes("'/js/experience.js'"),'PWA ne précharge pas UX');
assert.ok(js.includes("aria-modal=\\\"true\\\"")||js.includes('aria-modal="true"'),'Palette accessible manquante');
assert.ok(js.includes('getClientRects().length>0'),'Vérification visuelle des actions manquante');
assert.ok(js.includes('pathAvailable'),'Navigation filtrée par rôle manquante');
assert.ok(css.includes('prefers-reduced-motion'),'Option réduction des animations manquante');
assert.ok(css.includes(':focus-visible'),'Focus clavier visible manquant');
console.log(`HygieSafe UX : ${clients.length} pages métier, ${admins.length} pages admin, navigation, PWA et accessibilité : OK`);
