import { Router } from 'express';
import { z } from 'zod';
import { q } from '../db.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { requireUser, roles } from '../middleware/auth.js';
import { audit } from '../services/audit.js';
const r=Router();
const types=['temperature','reception','inventory','traceability','nonconformity','equipment','task','timeclock','document','oil','pest','allergen','cleaning','stock_article','stock_operation','opened_product','supplier_lot'];
const typeSchema=z.enum(types);
const bodySchema=z.object({title:z.string().max(180).optional(),status:z.string().max(40).optional(),occurredAt:z.string().datetime().optional(),payload:z.record(z.string(),z.any()).default({})});
const limitSchema=z.coerce.number().int().min(1).max(500).catch(100);
const uuidSchema=z.string().uuid();
const EMPLOYEE_EDIT_WINDOW_MS=15*60*1000;
const EMPLOYEE_SELF_EDITABLE_TYPES=new Set(['temperature','reception','inventory','traceability','nonconformity','oil','pest','allergen','cleaning','stock_operation','opened_product','supplier_lot']);
function canCreate(req,type){if(req.user.role==='employee'&&['equipment','task','document','stock_article'].includes(type))return false;return true;}
function canEditRecord(req,record){
  if(['owner','manager'].includes(req.user.role))return true;
  if(req.user.role!=='employee'||!EMPLOYEE_SELF_EDITABLE_TYPES.has(record.type))return false;
  if(record.created_by!==req.user.id)return false;
  return Date.now()-new Date(record.created_at).getTime()<=EMPLOYEE_EDIT_WINDOW_MS;
}
function revisionSnapshot(record){return {type:record.type,title:record.title,status:record.status,occurredAt:record.occurred_at,payload:record.payload};}

r.get('/',requireUser,asyncRoute(async(req,res)=>{const type=req.query.type?typeSchema.parse(req.query.type):null;const limit=limitSchema.parse(req.query.limit);const params=[req.user.organization_id];let sql=`SELECT r.*,u.name created_by_name FROM records r LEFT JOIN users u ON u.id=r.created_by WHERE r.organization_id=$1`;if(req.user.role==='employee'){params.push(req.user.id);sql+=` AND (r.type<>'timeclock' OR r.created_by=$${params.length})`;}if(type){params.push(type);sql+=` AND r.type=$${params.length}`;}if(req.query.status){params.push(String(req.query.status));sql+=` AND r.status=$${params.length}`;}sql+=` ORDER BY r.occurred_at DESC LIMIT ${limit}`;const {rows}=await q(sql,params);res.json(rows);}));
r.get('/today',requireUser,asyncRoute(async(req,res)=>{const {rows}=await q(`SELECT * FROM records WHERE organization_id=$1 AND occurred_at>=date_trunc('day',now()) AND ($2::boolean=false OR type<>'timeclock' OR created_by=$3) ORDER BY occurred_at DESC`,[req.user.organization_id,req.user.role==='employee',req.user.id]);res.json(rows);}));
const weekdayNumber={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
function localClock(timeZone='Europe/Paris'){
  const parts={};for(const x of new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()))if(x.type!=='literal')parts[x.type]=x.value;
  return {date:`${parts.year}-${parts.month}-${parts.day}`,weekday:weekdayNumber[parts.weekday]||1,minutes:Number(parts.hour)*60+Number(parts.minute),time:`${parts.hour}:${parts.minute}`};
}
function hm(v){return String(v||'').slice(0,5)}
function timeMinutes(v){const [h,m]=hm(v).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:0}
async function employeeTemperaturePlan(user){
  const orgId=user.organization_id;const timezone=(await q(`SELECT timezone FROM organizations WHERE id=$1`,[orgId])).rows[0]?.timezone||'Europe/Paris';const local=localClock(timezone);
  const schedules=(await q(`SELECT weekday,to_char(start_time,'HH24:MI') start_time,to_char(end_time,'HH24:MI') end_time FROM employee_schedules WHERE organization_id=$1 AND user_id=$2 AND active=true ORDER BY weekday`,[orgId,user.id])).rows;
  const schedule=schedules.find(s=>Number(s.weekday)===local.weekday);
  if(!schedule)return {actions:[],status:{configured:schedules.length>0,workday:false,timezone,localDate:local.date,localTime:local.time,due:0,overdue:0,next:null}};
  const equipment=(await q(`SELECT id,title,payload FROM records WHERE organization_id=$1 AND type='equipment' AND status='active' ORDER BY title`,[orgId])).rows;
  const temps=(await q(`SELECT payload,occurred_at FROM records WHERE organization_id=$1 AND type='temperature' AND created_by=$2 AND payload->>'scheduleDate'=$3`,[orgId,user.id,local.date])).rows;
  const slots=[{slot:'start',label:'Arrivée',time:hm(schedule.start_time)},{slot:'end',label:'Départ',time:hm(schedule.end_time)}];const actions=[];
  for(const slot of slots){const dueAt=timeMinutes(slot.time);if(local.minutes<dueAt)continue;for(const eq of equipment){const done=temps.some(x=>x.payload?.equipmentId===eq.id&&x.payload?.scheduleSlot===slot.slot&&x.payload?.scheduleDate===local.date&&x.payload?.scheduleUserId===user.id);if(done)continue;actions.push({kind:'temperature',id:eq.id,title:eq.title,detail:`${slot.label} · prévu ${slot.time}${local.minutes>dueAt+30?' · en retard':''}`,payload:eq.payload,slot:slot.slot,slotLabel:slot.label,scheduledAt:slot.time,scheduleDate:local.date,overdue:local.minutes>dueAt+30});}}
  const next=slots.find(s=>local.minutes<timeMinutes(s.time));
  return {actions,status:{configured:true,workday:true,timezone,localDate:local.date,localTime:local.time,startTime:hm(schedule.start_time),endTime:hm(schedule.end_time),due:actions.length,overdue:actions.filter(a=>a.overdue).length,next:next?{slot:next.slot,label:next.label,time:next.time}:null}};
}
async function todayActions(user){
  const orgId=user.organization_id;
  let temperatureActions=[];
  if(user.role==='employee')temperatureActions=(await employeeTemperaturePlan(user)).actions;
  else{
    const settings=(await q(`SELECT controls FROM organization_settings WHERE organization_id=$1`,[orgId])).rows[0]?.controls||{};const freq=Math.max(1,Number(settings.temperaturePerDay||2));
    const equipment=(await q(`SELECT id,title,payload FROM records WHERE organization_id=$1 AND type='equipment' AND status='active' ORDER BY title`,[orgId])).rows;
    const temps=(await q(`SELECT payload,occurred_at FROM records WHERE organization_id=$1 AND type='temperature' AND occurred_at>=date_trunc('day',now())`,[orgId])).rows;
    for(const eq of equipment){const n=temps.filter(x=>x.payload?.equipmentId===eq.id).length;for(let i=n;i<freq;i++)temperatureActions.push({kind:'temperature',id:eq.id,title:eq.title,detail:`Relevé ${i+1}/${freq}`,payload:eq.payload});}
  }
  const tasks=(await q(`SELECT id,title,payload FROM records WHERE organization_id=$1 AND type='task' AND status='active' ORDER BY title`,[orgId])).rows;
  const done=(await q(`SELECT payload FROM records WHERE organization_id=$1 AND type='cleaning' AND occurred_at>=date_trunc('day',now())`,[orgId])).rows;
  const actions=[...temperatureActions];for(const task of tasks)if(!done.some(x=>x.payload?.taskId===task.id))actions.push({kind:'task',id:task.id,title:task.title,detail:task.payload?.detail||task.payload?.kind||'Contrôle quotidien',payload:task.payload});
  return actions;
}
r.get('/today-actions',requireUser,asyncRoute(async(req,res)=>{res.json(await todayActions(req.user));}));
r.get('/temperature-alert',requireUser,asyncRoute(async(req,res)=>{if(req.user.role!=='employee')return res.json({configured:false,workday:false,due:0,overdue:0,next:null});const plan=await employeeTemperaturePlan(req.user);res.json({...plan.status,actions:plan.actions.map(a=>({equipmentId:a.id,title:a.title,slot:a.slot,slotLabel:a.slotLabel,scheduledAt:a.scheduledAt,scheduleDate:a.scheduleDate,overdue:a.overdue}))});}));
r.post('/today-actions/task/:id/complete',requireUser,asyncRoute(async(req,res)=>{const id=uuidSchema.parse(req.params.id);const task=(await q(`SELECT * FROM records WHERE id=$1 AND organization_id=$2 AND type='task' AND status='active'`,[id,req.user.organization_id])).rows[0];if(!task)throw new HttpError(404,'Tâche introuvable.');const exists=(await q(`SELECT 1 FROM records WHERE organization_id=$1 AND type='cleaning' AND occurred_at>=date_trunc('day',now()) AND payload->>'taskId'=$2`,[req.user.organization_id,task.id])).rowCount;if(!exists)await q(`INSERT INTO records(organization_id,type,title,status,payload,created_by) VALUES($1,'cleaning',$2,'done',$3,$4)`,[req.user.organization_id,task.title,{taskId:task.id,template:task.payload},req.user.id]);await audit(req,'control.completed','task',task.id);res.json({ok:true});}));
r.get('/dashboard',requireUser,asyncRoute(async(req,res)=>{const org=req.user.organization_id;const actions=await todayActions(req.user);const [nc,exp,temps]=await Promise.all([
 q(`SELECT count(*)::int n FROM records WHERE organization_id=$1 AND type='nonconformity' AND status NOT IN ('closed','resolved','done')`,[org]),
 q(`SELECT count(*)::int n FROM records WHERE organization_id=$1 AND type IN ('opened_product','traceability') AND COALESCE(hygiepro_safe_date(payload->>'expiry'),hygiepro_safe_date(payload->>'dlc')) BETWEEN current_date AND current_date+2`,[org]).catch(()=>({rows:[{n:0}]})),
 q(`SELECT count(*)::int n FROM records WHERE organization_id=$1 AND type='temperature' AND occurred_at>=date_trunc('day',now())`,[org])]);res.json({pending:actions.length,nonconformities:nc.rows[0].n,expiring:exp.rows[0].n,temperaturesToday:temps.rows[0].n,tasks:actions.filter(a=>a.kind==='task').length});}));
r.post('/',requireUser,asyncRoute(async(req,res)=>{const type=typeSchema.parse(req.body.type);if(!canCreate(req,type))throw new HttpError(403,'Action réservée au gérant ou responsable.');const d=bodySchema.parse(req.body);let payload=d.payload;
  if(type==='temperature'&&req.user.role==='employee'){
    const equipmentId=uuidSchema.parse(payload?.equipmentId);const slot=z.enum(['start','end']).parse(payload?.scheduleSlot);const plan=await employeeTemperaturePlan(req.user);const action=plan.actions.find(a=>a.id===equipmentId&&a.slot===slot);
    if(!action)throw new HttpError(403,'Ce relevé de température n’est pas encore disponible ou a déjà été effectué.','temperature_not_due');
    payload={...payload,equipmentId,scheduleUserId:req.user.id,scheduleDate:action.scheduleDate,scheduleSlot:slot,scheduledAt:action.scheduledAt};
    const duplicate=(await q(`SELECT 1 FROM records WHERE organization_id=$1 AND type='temperature' AND created_by=$2 AND payload->>'equipmentId'=$3 AND payload->>'scheduleDate'=$4 AND payload->>'scheduleSlot'=$5 LIMIT 1`,[req.user.organization_id,req.user.id,equipmentId,action.scheduleDate,slot])).rowCount;
    if(duplicate)throw new HttpError(409,'Ce relevé a déjà été enregistré.','temperature_already_done');
  }
  const {rows}=await q(`INSERT INTO records(organization_id,type,title,status,occurred_at,payload,created_by,updated_by) VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,now()),$6,$7,$7) RETURNING *`,[req.user.organization_id,type,d.title||null,d.status||'active',d.occurredAt||null,payload,req.user.id]);await audit(req,'record.create',type,rows[0].id);res.status(201).json(rows[0]);}));
r.patch('/:id',requireUser,asyncRoute(async(req,res)=>{const id=uuidSchema.parse(req.params.id);const d=bodySchema.partial().parse(req.body);const current=(await q(`SELECT * FROM records WHERE id=$1 AND organization_id=$2`,[id,req.user.organization_id])).rows[0];if(!current)throw new HttpError(404,'Enregistrement introuvable.');if(!canEditRecord(req,current)){if(req.user.role==='employee'&&current.created_by===req.user.id)throw new HttpError(403,'Le délai de correction de 15 minutes est dépassé. Demandez à un responsable de corriger cette saisie.','employee_edit_window_closed');throw new HttpError(403,'Vous ne pouvez modifier que vos propres saisies récentes.','record_edit_forbidden');}const before=revisionSnapshot(current);const {rows}=await q(`UPDATE records SET title=COALESCE($1,title),status=COALESCE($2,status),occurred_at=COALESCE($3::timestamptz,occurred_at),payload=COALESCE($4,payload),updated_by=$5 WHERE id=$6 AND organization_id=$7 RETURNING *`,[d.title??null,d.status??null,d.occurredAt??null,d.payload??null,req.user.id,id,req.user.organization_id]);await audit(req,'record.update',current.type,current.id,{before,after:revisionSnapshot(rows[0]),editorRole:req.user.role});res.json(rows[0]);}));
r.delete('/:id',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{const id=uuidSchema.parse(req.params.id);const {rows}=await q(`DELETE FROM records WHERE id=$1 AND organization_id=$2 RETURNING id,type`,[id,req.user.organization_id]);if(!rows[0])throw new HttpError(404,'Enregistrement introuvable.');await audit(req,'record.delete',rows[0].type,rows[0].id);res.json({ok:true});}));

r.post('/timeclock/toggle',requireUser,asyncRoute(async(req,res)=>{const latest=(await q(`SELECT payload FROM records WHERE organization_id=$1 AND type='timeclock' AND created_by=$2 ORDER BY occurred_at DESC LIMIT 1`,[req.user.organization_id,req.user.id])).rows[0];const direction=latest?.payload?.direction==='in'?'out':'in';const {rows}=await q(`INSERT INTO records(organization_id,type,title,status,payload,created_by) VALUES($1,'timeclock',$2,'active',$3,$4) RETURNING *`,[req.user.organization_id,direction==='in'?'Arrivée':'Départ',{direction},req.user.id]);await audit(req,'timeclock.'+direction,'timeclock',rows[0].id);res.status(201).json(rows[0]);}));
export default r;
