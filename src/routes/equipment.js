import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { q, tx } from '../db.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { requireUser, roles } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
import { notifyManagers } from '../services/pilotage.js';
import { config } from '../config.js';

const r=Router();
const uuid=z.string().uuid();
const dateString=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();
const kind=z.enum(['fridge','freezer','cold_room_positive','cold_room_negative','display_fridge','fryer','oven','dishwasher','mixer','slicer','vacuum_packer','ice_machine','other']);
const condition=z.enum(['operational','maintenance','out_of_service']);
const equipmentSchema=z.object({
  title:z.string().trim().min(1).max(180),kind:kind.default('other'),condition:condition.default('operational'),
  location:z.string().trim().max(160).nullable().optional(),brand:z.string().trim().max(120).nullable().optional(),model:z.string().trim().max(120).nullable().optional(),serialNumber:z.string().trim().max(160).nullable().optional(),
  min:z.coerce.number().min(-100).max(300).nullable().optional(),max:z.coerce.number().min(-100).max(300).nullable().optional(),
  critical:z.boolean().default(false),purchaseDate:dateString,warrantyUntil:dateString,
  maintenanceFrequencyDays:z.coerce.number().int().min(0).max(3650).default(0),nextMaintenanceDate:dateString,
  notes:z.string().trim().max(3000).nullable().optional(),photoMediaId:z.string().uuid().nullable().optional()
}).superRefine((d,ctx)=>{if(d.min!=null&&d.max!=null&&d.min>d.max)ctx.addIssue({code:'custom',path:['max'],message:'Le seuil maximum doit être supérieur au minimum.'});});
const eventSchema=z.object({
  eventType:z.enum(['maintenance','breakdown','repair','inspection','cleaning','note']),
  title:z.string().trim().max(180).nullable().optional(),description:z.string().trim().max(4000).nullable().optional(),
  severity:z.enum(['info','warning','critical']).default('info'),technician:z.string().trim().max(180).nullable().optional(),
  costEuros:z.coerce.number().min(0).max(1000000).nullable().optional(),dueAt:dateString,performedAt:z.string().datetime().optional(),mediaId:z.string().uuid().nullable().optional(),createNonconformity:z.boolean().default(false)
});

async function equipmentForOrg(id,org){return (await q(`SELECT * FROM records WHERE id=$1 AND organization_id=$2 AND type='equipment'`,[id,org])).rows[0]}
async function assertMedia(mediaId,org){if(!mediaId)return;const ok=(await q(`SELECT 1 FROM media WHERE id=$1 AND organization_id=$2`,[mediaId,org])).rowCount;if(!ok)throw new HttpError(400,'Le fichier joint est introuvable.','equipment_media_invalid')}
function nextMaintenanceDate(from,days){if(!days)return null;const d=new Date(from||Date.now());d.setUTCDate(d.getUTCDate()+Number(days));return d.toISOString().slice(0,10)}

r.get('/',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const includeArchived=String(req.query.includeArchived||'')==='1';
  const {rows}=await q(`
    SELECT e.*,u.name created_by_name,
      lt.value last_temperature_value,lt.occurred_at last_temperature_at,
      COALESCE(ev.open_events,0)::int open_events,COALESCE(ev.event_count,0)::int event_count,
      ev.last_event_at
    FROM records e
    LEFT JOIN users u ON u.id=e.created_by
    LEFT JOIN LATERAL (
      SELECT t.payload->>'value' value,t.occurred_at
      FROM records t
      WHERE t.organization_id=e.organization_id AND t.type='temperature' AND t.payload->>'equipmentId'=e.id::text
      ORDER BY t.occurred_at DESC LIMIT 1
    ) lt ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int event_count,
             count(*) FILTER (WHERE ee.status IN ('open','pending'))::int open_events,
             max(ee.performed_at) last_event_at
      FROM equipment_events ee WHERE ee.organization_id=e.organization_id AND ee.equipment_id=e.id
    ) ev ON true
    WHERE e.organization_id=$1 AND e.type='equipment' ${includeArchived?'':"AND e.status<>'inactive'"}
    ORDER BY CASE WHEN COALESCE(e.payload->>'condition','operational')='out_of_service' THEN 0 WHEN COALESCE(e.payload->>'condition','operational')='maintenance' THEN 1 ELSE 2 END,e.title`,[req.user.organization_id]);
  res.json(rows);
}));

r.get('/:id',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id;const equipment=await equipmentForOrg(id,org);if(!equipment)throw new HttpError(404,'Équipement introuvable.');
  const [temps,events]=await Promise.all([
    q(`SELECT id,title,status,occurred_at,payload,created_by FROM records WHERE organization_id=$1 AND type='temperature' AND payload->>'equipmentId'=$2 ORDER BY occurred_at DESC LIMIT 60`,[org,id]),
    q(`SELECT ee.*,u.name created_by_name,ru.name resolved_by_name FROM equipment_events ee LEFT JOIN users u ON u.id=ee.created_by LEFT JOIN users ru ON ru.id=ee.resolved_by WHERE ee.organization_id=$1 AND ee.equipment_id=$2 ORDER BY ee.performed_at DESC,ee.created_at DESC LIMIT 100`,[org,id])
  ]);res.json({equipment,temperatures:temps.rows,events:events.rows});
}));

r.post('/',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const d=equipmentSchema.parse(req.body);await assertMedia(d.photoMediaId,req.user.organization_id);
  const payload={kind:d.kind,condition:d.condition,location:d.location||null,brand:d.brand||null,model:d.model||null,serialNumber:d.serialNumber||null,min:d.min??null,max:d.max??null,critical:!!d.critical,purchaseDate:d.purchaseDate||null,warrantyUntil:d.warrantyUntil||null,maintenanceFrequencyDays:d.maintenanceFrequencyDays||0,nextMaintenanceDate:d.nextMaintenanceDate||null,notes:d.notes||null,photoMediaId:d.photoMediaId||null};
  const {rows}=await q(`INSERT INTO records(organization_id,type,title,status,payload,created_by,updated_by) VALUES($1,'equipment',$2,'active',$3,$4,$4) RETURNING *`,[req.user.organization_id,d.title,payload,req.user.id]);
  await audit(req,'equipment.create','equipment',rows[0].id,{kind:d.kind,condition:d.condition});res.status(201).json(rows[0]);
}));

r.patch('/:id',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id,current=await equipmentForOrg(id,org);if(!current)throw new HttpError(404,'Équipement introuvable.');
  const base={title:current.title,...current.payload};const d=equipmentSchema.parse({...base,...req.body});await assertMedia(d.photoMediaId,org);
  const payload={...current.payload,kind:d.kind,condition:d.condition,location:d.location||null,brand:d.brand||null,model:d.model||null,serialNumber:d.serialNumber||null,min:d.min??null,max:d.max??null,critical:!!d.critical,purchaseDate:d.purchaseDate||null,warrantyUntil:d.warrantyUntil||null,maintenanceFrequencyDays:d.maintenanceFrequencyDays||0,nextMaintenanceDate:d.nextMaintenanceDate||null,notes:d.notes||null,photoMediaId:d.photoMediaId||null};
  const {rows}=await q(`UPDATE records SET title=$1,payload=$2,updated_by=$3,updated_at=now() WHERE id=$4 AND organization_id=$5 RETURNING *`,[d.title,payload,req.user.id,id,org]);
  await audit(req,'equipment.update','equipment',id,{condition:d.condition});res.json(rows[0]);
}));

r.post('/:id/archive',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id,current=await equipmentForOrg(id,org);if(!current)throw new HttpError(404,'Équipement introuvable.');
  const {rows}=await q(`UPDATE records SET status='inactive',payload=payload||jsonb_build_object('archivedAt',now()::text),updated_by=$1,updated_at=now() WHERE id=$2 AND organization_id=$3 RETURNING *`,[req.user.id,id,org]);
  await audit(req,'equipment.archive','equipment',id);res.json(rows[0]);
}));

r.post('/:id/restore',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id,current=await equipmentForOrg(id,org);if(!current)throw new HttpError(404,'Équipement introuvable.');
  const {rows}=await q(`UPDATE records SET status='active',payload=(payload-'archivedAt')||jsonb_build_object('condition','operational'),updated_by=$1,updated_at=now() WHERE id=$2 AND organization_id=$3 RETURNING *`,[req.user.id,id,org]);
  await audit(req,'equipment.restore','equipment',id);res.json(rows[0]);
}));

r.post('/:id/events',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id,equipment=await equipmentForOrg(id,org);if(!equipment)throw new HttpError(404,'Équipement introuvable.');const d=eventSchema.parse(req.body);await assertMedia(d.mediaId,org);
  const result=await tx(async c=>{
    let eventStatus=d.eventType==='breakdown'?'open':d.dueAt&&!d.performedAt?'pending':'done';
    const performedAt=d.performedAt||new Date().toISOString();
    const event=(await c.query(`INSERT INTO equipment_events(organization_id,equipment_id,event_type,status,severity,title,description,technician,cost_cents,due_at,performed_at,media_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[org,id,d.eventType,eventStatus,d.severity,d.title||null,d.description||null,d.technician||null,d.costEuros==null?null:Math.round(Number(d.costEuros)*100),d.dueAt||null,performedAt,d.mediaId||null,req.user.id])).rows[0];
    if(d.eventType==='breakdown')await c.query(`UPDATE records SET payload=payload||jsonb_build_object('condition','out_of_service','lastBreakdownAt',$1::text),updated_by=$2,updated_at=now() WHERE id=$3 AND organization_id=$4`,[performedAt,req.user.id,id,org]);
    if(d.eventType==='maintenance'&&eventStatus==='done'){
      const freq=Number(equipment.payload?.maintenanceFrequencyDays||0),next=nextMaintenanceDate(performedAt,freq);
      await c.query(`UPDATE records SET payload=payload||jsonb_build_object('lastMaintenanceAt',$1::text,'nextMaintenanceDate',$2::text,'condition',CASE WHEN COALESCE(payload->>'condition','operational')='maintenance' THEN 'operational' ELSE COALESCE(payload->>'condition','operational') END),updated_by=$3,updated_at=now() WHERE id=$4 AND organization_id=$5`,[performedAt,next,req.user.id,id,org]);
    }
    if(d.eventType==='maintenance'&&eventStatus==='pending'&&d.dueAt)await c.query(`UPDATE records SET payload=payload||jsonb_build_object('nextMaintenanceDate',$1::text),updated_by=$2,updated_at=now() WHERE id=$3 AND organization_id=$4`,[d.dueAt,req.user.id,id,org]);
    if(d.eventType==='repair'){
      await c.query(`UPDATE equipment_events SET status='done',resolved_at=now(),resolved_by=$1 WHERE organization_id=$2 AND equipment_id=$3 AND event_type='breakdown' AND status='open'`,[req.user.id,org,id]);
      await c.query(`UPDATE records SET payload=payload||jsonb_build_object('condition','operational','lastRepairAt',$1::text),updated_by=$2,updated_at=now() WHERE id=$3 AND organization_id=$4`,[performedAt,req.user.id,id,org]);
    }
    if(d.createNonconformity&&d.eventType==='breakdown')await c.query(`INSERT INTO records(organization_id,type,title,status,payload,created_by,updated_by) VALUES($1,'nonconformity',$2,'open',$3,$4,$4)`,[org,`Panne équipement — ${equipment.title}`,{detail:d.description||d.title||'Panne matériel',source:'equipment',equipmentId:id,severity:d.severity},req.user.id]);
    return event;
  });
  await audit(req,'equipment.event.create','equipment',id,{eventType:d.eventType,severity:d.severity});if(d.eventType==='breakdown')await notifyManagers(org,{severity:d.severity==='info'?'warning':d.severity,type:'equipment_breakdown',title:`Panne — ${equipment.title}`,message:d.description||d.title||'Intervention requise',link:'equipment',dedupeKey:`equipment-breakdown:${id}`});res.status(201).json(result);
}));

r.post('/:id/events/:eventId/complete',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),eventId=uuid.parse(req.params.eventId),org=req.user.organization_id,equipment=await equipmentForOrg(id,org);if(!equipment)throw new HttpError(404,'Équipement introuvable.');
  const row=await tx(async c=>{const event=(await c.query(`UPDATE equipment_events SET status='done',performed_at=now(),resolved_at=now(),resolved_by=$1 WHERE id=$2 AND equipment_id=$3 AND organization_id=$4 RETURNING *`,[req.user.id,eventId,id,org])).rows[0];if(!event)throw new HttpError(404,'Événement introuvable.');if(event.event_type==='maintenance'){const freq=Number(equipment.payload?.maintenanceFrequencyDays||0),next=nextMaintenanceDate(new Date().toISOString(),freq);await c.query(`UPDATE records SET payload=payload||jsonb_build_object('lastMaintenanceAt',now()::text,'nextMaintenanceDate',$1::text,'condition',CASE WHEN COALESCE(payload->>'condition','operational')='maintenance' THEN 'operational' ELSE COALESCE(payload->>'condition','operational') END),updated_by=$2,updated_at=now() WHERE id=$3 AND organization_id=$4`,[next,req.user.id,id,org]);}return event;});await audit(req,'equipment.event.complete','equipment_event',eventId,{equipmentId:id});res.json(row);
}));

r.get('/:id/report.pdf',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),org=req.user.organization_id,equipment=await equipmentForOrg(id,org);if(!equipment)throw new HttpError(404,'Équipement introuvable.');
  const [events,temps,organization]=await Promise.all([
    q(`SELECT ee.*,u.name created_by_name FROM equipment_events ee LEFT JOIN users u ON u.id=ee.created_by WHERE ee.organization_id=$1 AND ee.equipment_id=$2 ORDER BY ee.performed_at DESC LIMIT 40`,[org,id]),
    q(`SELECT occurred_at,payload FROM records WHERE organization_id=$1 AND type='temperature' AND payload->>'equipmentId'=$2 ORDER BY occurred_at DESC LIMIT 20`,[org,id]),
    q(`SELECT name,address,postal_code,city FROM organizations WHERE id=$1`,[org])
  ]);
  const p=equipment.payload||{},doc=new PDFDocument({size:'A4',margin:44});res.set('Content-Type','application/pdf');res.set('Content-Disposition',`inline; filename="fiche-equipement-${String(equipment.title||id).replace(/[^A-Za-z0-9_-]+/g,'-').slice(0,70)}.pdf"`);res.set('Cache-Control','private, no-store');doc.pipe(res);
  doc.fontSize(18).text('HygieSafe — Fiche équipement',{continued:false});doc.moveDown(.25).fontSize(9).fillColor('#66736c').text(`${organization.rows[0]?.name||''} · Généré le ${new Date().toLocaleString('fr-FR')}`);doc.fillColor('#111');doc.moveDown();doc.fontSize(15).text(equipment.title||'Équipement');doc.fontSize(9).fillColor('#4f5f56').text([p.kind,p.location,p.brand,p.model,p.serialNumber].filter(Boolean).join(' · ')||'Identification à compléter');doc.fillColor('#111').moveDown(.7);
  const info=[['État',p.condition||'operational'],['Seuils',p.min!=null||p.max!=null?`${p.min??'—'} à ${p.max??'—'} °C`:'Non concernés'],['Prochaine maintenance',p.nextMaintenanceDate||'Non planifiée'],['Garantie',p.warrantyUntil||'Non renseignée'],['Équipement critique',p.critical?'Oui':'Non']];for(const [k,v] of info){doc.fontSize(8).fillColor('#6f7d75').text(k.toUpperCase());doc.fontSize(10).fillColor('#111').text(String(v));doc.moveDown(.25)}
  if(p.notes){doc.moveDown(.4).fontSize(11).text('Notes');doc.fontSize(9).fillColor('#4f5f56').text(String(p.notes));doc.fillColor('#111')}
  doc.moveDown().fontSize(12).text('Dernières températures');doc.moveDown(.3);if(!temps.rows.length)doc.fontSize(9).fillColor('#6f7d75').text('Aucun relevé enregistré.');else for(const t of temps.rows.slice(0,10)){doc.fontSize(9).fillColor('#111').text(`${new Date(t.occurred_at).toLocaleString('fr-FR')}  ·  ${t.payload?.value??'—'} °C`)}doc.fillColor('#111');
  doc.moveDown().fontSize(12).text('Historique technique');doc.moveDown(.3);if(!events.rows.length)doc.fontSize(9).fillColor('#6f7d75').text('Aucune intervention enregistrée.');else for(const ev of events.rows){if(doc.y>735)doc.addPage();doc.fontSize(9).fillColor('#111').text(`${new Date(ev.performed_at).toLocaleDateString('fr-FR')} · ${ev.event_type} · ${ev.status}`);if(ev.description)doc.fontSize(8).fillColor('#59675f').text(String(ev.description).slice(0,700));doc.moveDown(.25)}
  doc.end();
}));

r.get('/:id/qr.png',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),equipment=await equipmentForOrg(id,req.user.organization_id);if(!equipment)throw new HttpError(404,'Équipement introuvable.');
  const url=`${String(config.appUrl).replace(/\/$/,'')}/app.html?equipment=${encodeURIComponent(id)}#equipment`;
  const png=await QRCode.toBuffer(url,{type:'png',width:560,margin:2,errorCorrectionLevel:'M'});res.set('Content-Type','image/png');res.set('Cache-Control','private, no-store');res.send(png);
}));

export default r;
