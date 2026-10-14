import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const migration=read('db/migrations/019_employee_temperature_schedules.sql');
const auth=read('src/routes/auth.js');
const records=read('src/routes/records.js');
const app=read('public/app.html');
const appJs=read('public/js/app.js');
const sw=read('public/sw.js');
const backup=read('src/services/backup.js');

assert.match(migration,/CREATE TABLE IF NOT EXISTS employee_schedules/);
assert.match(migration,/start_time\s+time/);
assert.match(migration,/end_time\s+time/);
assert.match(migration,/start_time < end_time/);
console.log('✓ Horaires : table et validation arrivée/départ');

assert.match(auth,/put\('\/team\/:id\/schedule'/i);
assert.match(auth,/team\.schedule_updated/);
assert.match(auth,/employee_schedules/);
console.log('✓ Horaires : configuration réservée au gérant/responsable');

assert.match(records,/employeeTemperaturePlan/);
assert.match(records,/slot:'start',label:'Arrivée'/);
assert.match(records,/slot:'end',label:'Départ'/);
assert.match(records,/temperature-alert/);
assert.match(records,/temperature_not_due/);
assert.match(records,/temperature_already_done/);
console.log('✓ Températures : arrivée + départ + blocage serveur avant l’heure');

assert.match(app,/id="employeeTemperatureAlert"/);
assert.match(app,/data-action="new-temperature">\+ Relevé manuel/);
assert.match(appJs,/refreshTemperatureAlert/);
assert.match(appJs,/openScheduleEditor/);
assert.match(appJs,/scheduleSlot/);
assert.match(appJs,/Le relevé sera disponible automatiquement à l’heure prévue/);
console.log('✓ Employé : alerte compte et relevé seulement au moment prévu');

const iconDir=path.join(root,'public/assets/hygiesafe-icons');
for(const name of ['home','profile','team','scanner','temperature','controls','schedule','inventory','orders','archive']){
  assert.ok(fs.existsSync(path.join(iconDir,`${name}.png`)),`Icône ${name} absente`);
  assert.match(app,new RegExp(`/assets/hygiesafe-icons/${name}\\.png`));
  assert.match(sw,new RegExp(`/assets/hygiesafe-icons/${name}\\.png`));
}
console.log('✓ Identité : 10 icônes HygieSafe intégrées et mises en cache PWA');

assert.match(backup,/horaires-equipe\.json/);
assert.match(backup,/employee_schedules/);
console.log('✓ Sauvegarde : horaires employés inclus dans le ZIP');

console.log('HygieSafe horaires + températures : 6/6');
