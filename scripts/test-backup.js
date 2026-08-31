import assert from 'node:assert/strict';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { ZipArchive } from 'archiver';
import { backupDateParts,safeBackupName,isoFileStamp } from '../src/utils/backup-path.js';
import { csvCell } from '../src/utils/csv.js';

const d=backupDateParts('2026-08-17T18:22:00Z');
assert.equal(d.path,'annees/2026/08-aout/17');
assert.equal(safeBackupName('../../Facture fournisseur été.pdf'),'Facture-fournisseur-ete.pdf');
assert.match(isoFileStamp('2026-08-17T18:22:00Z'),/^2026-08-17T18-22-00-/);
console.log('✓ Sauvegarde : classement année/mois/jour');
assert.equal(csvCell('=HYPERLINK("x")'), "\"'=HYPERLINK(\"\"x\"\")\"");
console.log('✓ Sauvegarde : noms de fichiers neutralisés');
console.log('✓ Sauvegarde : cellules CSV dangereuses neutralisées');

// Test d'intégration minimal : vérifie réellement l'API Archiver utilisée en production.
const output=new PassThrough();
const chunks=[];
output.on('data',chunk=>chunks.push(chunk));
const ended=once(output,'end');
const archive=new ZipArchive({zlib:{level:1}});
archive.pipe(output);
archive.append('HygieSafe backup test\n',{name:'test.txt'});
await archive.finalize();
await ended;
const zip=Buffer.concat(chunks);
assert.ok(zip.length>20,'Le ZIP de test doit contenir des données');
assert.equal(zip.subarray(0,2).toString('ascii'),'PK','Signature ZIP invalide');
console.log('✓ Sauvegarde : création ZIP Archiver v8 réelle');
console.log('HygieSafe backup tests: 4/4');
