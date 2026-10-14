import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseGs1 } from '../src/utils/gs1.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);let pass=0,fail=0;
const test=(name,fn)=>{try{fn();pass++;console.log('✓',name)}catch(e){fail++;console.error('✗',name,e.message)}};

test('GS1 parenthèses : GTIN + DLC + lot',()=>{const r=parseGs1('(01)03760123456789(17)260831(10)LOTABC42');assert.equal(r.isGs1,true);assert.equal(r.gtin,'03760123456789');assert.equal(r.expiryDate,'2026-08-31');assert.equal(r.lot,'LOTABC42');assert.equal(r.dateType,'dlc')});
test('GS1 DDM + production',()=>{const r=parseGs1('(01)03499150003240(15)270930(11)260801(10)B7788');assert.equal(r.expiryDate,'2027-09-30');assert.equal(r.productionDate,'2026-08-01');assert.equal(r.dateType,'ddm')});
test('GS1 poids 3103',()=>{const r=parseGs1('(01)03760123456789(3103)001250');assert.equal(r.weightKg,1.25)});
test('GS1 compact DataMatrix',()=>{const r=parseGs1('01037601234567891726083110LOTABC\u001d');assert.equal(r.gtin,'03760123456789');assert.equal(r.expiryDate,'2026-08-31');assert.equal(r.lot,'LOTABC')});
test('Code ordinaire non GS1',()=>{assert.equal(parseGs1('3760123456789').isGs1,false)});
const app=fs.readFileSync(path.join(root,'public/js/app.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/app.html'),'utf8'),css=fs.readFileSync(path.join(root,'public/css/app.css'),'utf8'),route=fs.readFileSync(path.join(root,'src/routes/scanner.js'),'utf8'),migration=fs.readFileSync(path.join(root,'db/migrations/026_scanner_pro_sessions.sql'),'utf8'),backup=fs.readFileSync(path.join(root,'src/services/backup.js'),'utf8');
test('UI : scan en série',()=>assert.ok(html.includes('startSeriesScan')&&app.includes("startScanSession('series')")));
test('UI : réception intelligente',()=>assert.ok(html.includes('startReceptionScan')&&app.includes("startScanSession('reception')")));
test('UI : DataMatrix/GS1',()=>assert.ok(app.includes("'data_matrix'")&&app.includes('GS1 / DataMatrix')));
test('UI : session persistante et reprise',()=>assert.ok(app.includes('/api/scanner/sessions/active')&&app.includes('refreshScanSession')));
test('UI : suppression avant validation',()=>assert.ok(app.includes('data-remove-scan-item')&&route.includes("r.delete('/sessions/:sessionId/items/:itemId'")));
test('UI : session annulable',()=>assert.ok(app.includes('cancelScanSession')&&route.includes("r.post('/sessions/:id/cancel'")));
test('Serveur : doublons',()=>assert.ok(route.includes('duplicateInfo')&&route.includes("anomalies.push('duplicate')")));
test('Serveur : écarts commande/réception/facture',()=>assert.ok(route.includes('short_received')&&route.includes('billed_more_than_received')&&route.includes('over_received')));
test('Serveur : anomalie DLC dépassée',()=>assert.ok(route.includes("anomalies.push('expired')")));
test('Base : sessions et items scanner',()=>assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS scan_sessions')&&migration.includes('CREATE TABLE IF NOT EXISTS scan_session_items')));
test('Sauvegarde : sessions scanner incluses',()=>assert.ok(backup.includes('sessions-scanner.json')&&backup.includes('lignes-scanner.json')));
test('CSS : session scanner mobile',()=>assert.ok(css.includes('.scan-session-panel')&&css.includes('.scan-batch-item')));
console.log(`Scanner Pro v6.6.0 : ${pass}/${pass+fail}`);if(fail)process.exit(1);
