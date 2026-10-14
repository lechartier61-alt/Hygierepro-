// Jeu de donnees de DEMONSTRATION uniquement : les valeurs NE SONT PAS des mesures realisees.
// Aucune preuve HACCP ne peut etre constituee avec cet historique synthetique.
export const DEMO_START_DATE = '2026-07-19';
export const DEMO_FIXED_END_DATE = '2026-10-14';
export const DEMO_EQUIPMENT = [
  {code:'frigo-1', title:'Réfrigérateur 1 — DÉMO', kind:'fridge', min:0, max:4, location:'Laboratoire'},
  {code:'frigo-2', title:'Réfrigérateur 2 — DÉMO', kind:'fridge', min:0, max:4, location:'Réserve froide'},
  {code:'congelateur-1', title:'Congélateur 1 — DÉMO', kind:'freezer', min:-25, max:-18, location:'Réserve négative'}
];
const LONDON_DATE = /^\d{4}-\d{2}-\d{2}$/;
function asDate(iso) {
  if (!LONDON_DATE.test(iso)) throw new Error('Date YYYY-MM-DD obligatoire');
  const dt = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0,10)!==iso) throw new Error('Date invalide : '+iso);
  return dt;
}
export function demoLocalToday(now=new Date()){
  const values=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function hash(seed){let h=2166136261;for (const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function parisOffset(date){
  const raw=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',timeZoneName:'shortOffset'}).formatToParts(new Date(`${date}T12:00:00Z`)).find(p=>p.type==='timeZoneName')?.value||'GMT+2';
  const match=raw.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if(!match) throw new Error('Impossible de déterminer le fuseau Europe/Paris : '+raw);
  return `${match[1]}${match[2].padStart(2,'0')}:${(match[3]||'00')}`;
}
function temperature(date,slot,equipment){
  const r=(hash(`${date}|${slot}|${equipment.code}`)%10000)/10000;
  const value=equipment.code==='frigo-1'?2.0+1.5*r:equipment.code==='frigo-2'?2.2+1.65*r:-22+2.7*r;
  // Ecarts volontaires pour essayer les alertes (TOUJOURS FICTIFS).
  const scenarios={
    '2026-07-25|PM|frigo-2':5.1,
    '2026-08-16|AM|frigo-1':4.8,
    '2026-09-08|PM|congelateur-1':-16.7,
    '2026-10-05|AM|frigo-2':4.6
  };
  return scenarios[`${date}|${slot}|${equipment.code}`]??Math.round(value*10)/10;
}
export function generateDemoBoulangerie({endDate=DEMO_FIXED_END_DATE}={}) {
  const start=asDate(DEMO_START_DATE),end=asDate(endDate);
  if (end<start) throw new Error('La date de fin precede le debut');
  if ((end-start)>365*86400000) throw new Error('Periode trop longue : maximum 365 jours');
  const rows=[];
  for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)) {
    const date=d.toISOString().slice(0,10);
    for(const slot of ['AM','PM']) {
      const time=slot==='AM'?'08:00':'17:00';
      for(const eq of DEMO_EQUIPMENT) {
        const value=temperature(date,slot,eq);
        const conforme=value>=eq.min&&value<=eq.max;
        rows.push({date,time,slot,equipmentCode:eq.code,equipment: eq.title,value,min:eq.min,max:eq.max,conforme,
          occurredAt:`${date}T${time}:00${parisOffset(date)}`, simulated:true,
          // Prises a heure locale CET/CEST ; le décalage suit les changements d’heure.
          origin:'hygiesafe_demo_generator',note:'SIMULATION — valeur générée pour les tests, sans mesure physique'});
      }
    }
  }
  return rows;
}
