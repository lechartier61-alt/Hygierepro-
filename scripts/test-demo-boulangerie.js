import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateDemoBoulangerie,DEMO_EQUIPMENT,DEMO_START_DATE,DEMO_FIXED_END_DATE} from './lib/demo-boulangerie-data.js';
const rows=generateDemoBoulangerie({endDate:DEMO_FIXED_END_DATE});
const days=Math.round((new Date(DEMO_FIXED_END_DATE+'T12:00:00Z')-new Date(DEMO_START_DATE+'T12:00:00Z'))/86400000)+1;
assert.equal(days,88);
assert.equal(DEMO_EQUIPMENT.length,3);
assert.equal(rows.length,528);
assert.equal(rows.filter(x=>!x.conforme).length,4);
assert.deepEqual(new Set(rows.map(x=>x.equipmentCode)),new Set(DEMO_EQUIPMENT.map(x=>x.code)));
assert.equal(rows.filter(x=>x.date===DEMO_START_DATE).length,6);
assert.equal(rows.filter(x=>x.date===DEMO_FIXED_END_DATE).length,6);
for(const row of rows){assert.equal(row.simulated,true);assert.equal(row.origin,'hygiesafe_demo_generator');assert.ok(row.note.includes('SIMULATION'));assert.ok(['08:00','17:00'].includes(row.time));assert.ok(Number.isFinite(row.value));assert.equal(row.conforme,row.value>=row.min&&row.value<=row.max)}
const root=new URL('../',import.meta.url);
const app=fs.readFileSync(new URL('../public/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/app.html',import.meta.url),'utf8');
assert.ok(app.includes('demoDataBanner'));
assert.ok(html.includes('MODE DÉMONSTRATION'));
console.log(`OK : 3 equipements, ${days} jours, ${rows.length} releves fictifs, 4 alertes de simulation, bandeau UI.`);
