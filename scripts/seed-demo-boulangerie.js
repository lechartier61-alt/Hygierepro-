// Creation d'un compte ISOLE pour tester HygieSafe (pas de relevés réels).
// NECESSITE une base PostgreSQL migrée ; NE S'EXECUTE PAS automatiquement au déploiement.
import crypto from 'node:crypto';
import {generateDemoBoulangerie,DEMO_EQUIPMENT,DEMO_START_DATE,DEMO_FIXED_END_DATE} from './lib/demo-boulangerie-data.js';
import { pool,tx } from '../src/db.js';
import { hashPassword } from '../src/utils/crypto.js';
import {ensureOrganizationNetwork,ensureMembership} from '../src/services/network.js';
const CONFIRM='JE_COMPRENDS_DONNEES_SIMULEES';
const email=(process.env.DEMO_BOULANGERIE_EMAIL||'test-boulangerie@hygiesafe.test').toLowerCase();
const endDate=process.env.DEMO_END_DATE||DEMO_FIXED_END_DATE;
const password=process.env.DEMO_BOULANGERIE_PASSWORD||`Demo-${crypto.randomBytes(21).toString('base64url')}!`;
if(process.env.DEMO_SEED_CONFIRM!==CONFIRM){console.error(`Abandon. Définir DEMO_SEED_CONFIRM=${CONFIRM} pour confirmer qu'il s'agit de données générées pour les tests.`);process.exit(2)}
if(process.env.NODE_ENV==='production'&&process.env.ALLOW_DEMO_IN_PRODUCTION!=='JE_CONFIRME_LE_COMPTE_DEMO_ISOLE'){
 console.error('Abandon en production. Ce compte ne doit pas constituer un faux historique HACCP. Utilisez une base de test de preference.');process.exit(2);
}
if(password.length<14 || !/^.+@.+\..+$/.test(email)){console.error('Mot de passe >= 14 caracteres et email valide requis.');process.exit(2)}
const rows=generateDemoBoulangerie({endDate});
const start=DEMO_START_DATE;
const nDays=new Set(rows.map(r=>r.date)).size;
try {
  const hashed=await hashPassword(password);
  const data=await tx(async c=>{
    const slug='boulangerie-test-hygiesafe-simulation';
    if((await c.query('SELECT 1 FROM organizations WHERE slug=$1',[slug])).rowCount)throw new Error('La boulangerie de demo existe deja : aucune donnee ne sera ecrasee.');
    if((await c.query('SELECT 1 FROM users WHERE lower(email)=lower($1)',[email])).rowCount)throw new Error('Adresse email deja utilisee : choisir DEMO_BOULANGERIE_EMAIL.');
    const org=(await c.query(`INSERT INTO organizations(name,slug,business_type,status,timezone,onboarding_completed,onboarding_step,trial_ends_at,subscription_status)
     VALUES($1,$2,'boulangerie','active','Europe/Paris',true,5,now()+interval '90 days','trialing') RETURNING id,name`,['[DÉMO] Boulangerie',slug])).rows[0];
    const user=(await c.query(`INSERT INTO users(organization_id,email,password_hash,name,role,email_verified) VALUES($1,$2,$3,$4,'owner',true) RETURNING id,email,name`,[org.id,email,hashed,'Gérant démonstration'])).rows[0];
    await ensureOrganizationNetwork(c,org.id,{name:org.name,createdBy:user.id});
    await ensureMembership(c,{organizationId:org.id,userId:user.id,role:'owner',createdBy:user.id});
    await c.query(`INSERT INTO organization_settings(organization_id,equipment,controls,preferences)
      VALUES($1,$2::jsonb,$3::jsonb,$4::jsonb)`,[org.id,JSON.stringify({fridges:2,freezers:1}),JSON.stringify({temperaturePerDay:2,cleaning:false,dlc:false,handwash:false,oil:false,closingTime:'18:00'}),JSON.stringify({demoMode:true,demoSource:'simulation',demoStart:start,demoEnd:endDate,warning:'Aucune température n’a été mesurée.'})]);
    const eqIds=new Map();
    for(const eq of DEMO_EQUIPMENT){
      const record=(await c.query(`INSERT INTO records(organization_id,type,title,status,payload,created_by,updated_by) VALUES($1,'equipment',$2,'active',$3::jsonb,$4,$4) RETURNING id`,[org.id,eq.title,JSON.stringify({kind:eq.kind,condition:'operational',location:eq.location,min:eq.min,max:eq.max,critical:false,notes:'Équipement de démonstration pour les essais.',simulated:true,demoMode:true}),user.id])).rows[0];
      eqIds.set(eq.code,record.id);
    }
    // INSERT par paquets pour limiter le temps de creation et garder la transaction atomique.
    const batchSize=100;
    for(let i=0;i<rows.length;i+=batchSize){
      const part=rows.slice(i,i+batchSize),params=[];
      const values=part.map((r,index)=>{
        const offset=index*7;
        params.push(org.id,r.equipment,r.conforme?'done':'late',r.occurredAt,JSON.stringify({equipmentId:eqIds.get(r.equipmentCode),value:r.value,unit:' °C',min:r.min,max:r.max,conforme:r.conforme,simulated:true,demoMode:true,source:'SIMULATION NON MESURÉE',note:r.note,scheduleDate:r.date,scheduleSlot:r.slot}),user.id,user.id);
        return `($${offset+1},'temperature',$${offset+2},$${offset+3},$${offset+4}::timestamptz,$${offset+5}::jsonb,$${offset+6},$${offset+7})`;
      }).join(',');
      await c.query(`INSERT INTO records(organization_id,type,title,status,occurred_at,payload,created_by,updated_by) VALUES ${values}`,params);
    }
    await c.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1,$2,'demo.boulangerie_seeded','organization',$3,$4::jsonb)`,[org.id,user.id,String(org.id),JSON.stringify({simulated:true,count:rows.length,periodStart:start,periodEnd:endDate,equipment:DEMO_EQUIPMENT.map(x=>x.code)})]);
    return {org,user};
  });
  console.log('COMPTE DE DEMONSTRATION CREE (DONNEES GENEREES SANS MESURE PHYSIQUE)');
  console.log('Etablissement :',data.org.name,'| ID :',data.org.id);
  console.log('Dates :',start,'au',endDate,'| jours :',nDays,'| releves simules :',rows.length);
  console.log('Email :',email);
  console.log('Mot de passe (AFFICHE UNE SEULE FOIS) :',password);
  console.log('URL : /login.html');
} catch(e) {console.error('Echec :',e.message);process.exitCode=1}
finally {await pool.end()}
