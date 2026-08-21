import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const auth=fs.readFileSync(path.join(root,'src/routes/auth.js'),'utf8');
let fail=0;
function ok(m){console.log('✓',m)}function bad(m){fail++;console.error('✗',m)}
if(!auth.includes("VALUES($1,$2,'organization.created','organization',$3,$4,$5)"))bad('audit inscription: placeholders distincts');else ok('audit inscription: placeholders distincts UUID/text');
if(!auth.includes("[org.id,user.id,String(org.id),{trialEndsAt:org.trial_ends_at},ipOf(req)||null]"))bad('entity_id converti en texte');else ok('entity_id converti explicitement en texte');
if(auth.includes("VALUES($1,$2,'organization.created','organization',$1,$3,$4)"))bad('ancienne requête ambiguë encore présente');else ok('ancienne requête PostgreSQL 42P08 supprimée');
if(fail)process.exit(1);console.log('Inscription SQL: régression 42P08 couverte.');
