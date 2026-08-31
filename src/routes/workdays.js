import { Router } from 'express';
import { z } from 'zod';
import { q, tx } from '../db.js';
import { requireUser, roles } from '../middleware/auth.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { audit } from '../services/audit.js';
import { notifyManagers } from '../services/pilotage.js';

const r=Router();
const uuid=z.string().uuid();
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const categories=['start_day','production','temperature','cleaning','traceability','scanner','reception','instruction','break','other'];
const stepSchema=z.object({
  id:z.string().uuid().optional().nullable(),
  title:z.string().trim().min(1).max(180),
  instructions:z.string().trim().max(4000).optional().nullable(),
  category:z.enum(categories).default('production'),
  targetQuantity:z.coerce.number().positive().max(100000).optional().nullable(),
  targetUnit:z.string().trim().max(40).optional().nullable(),
  plannedMinutes:z.coerce.number().int().min(1).max(720).default(15),
  referenceMediaId:z.string().uuid().optional().nullable(),
  proofRequired:z.boolean().default(false)
});
const basePlanFields={
  employeeId:z.string().uuid(),workDate:dateSchema,title:z.string().trim().min(1).max(180).default('Journée de travail'),
  plannedStartTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  managerNote:z.string().trim().max(4000).optional().nullable()
};
const planSchema=z.object({...basePlanFields,steps:z.array(stepSchema).min(1).max(100)});
const updatePlanSchema=z.object({...basePlanFields,steps:z.array(stepSchema).max(100)});
const completeSchema=z.object({
  proofMediaId:z.string().uuid().optional().nullable(),note:z.string().trim().max(2000).optional().nullable(),
  linkedRecordId:z.string().uuid().optional().nullable(),actualQuantity:z.coerce.number().min(0).max(100000).optional().nullable()
});
const blockSchema=z.object({
  reason:z.enum(['missing_material','equipment_failure','nonconforming_product','manager_needed','safety','other']),
  note:z.string().trim().max(2000).optional().nullable(),mediaId:z.string().uuid().optional().nullable()
});

function timing(step,now=Date.now()){
  if(step.status==='done'){
    const elapsed=step.started_at&&step.completed_at?Math.max(0,Math.round((new Date(step.completed_at)-new Date(step.started_at))/60000)):null;
    const planned=Math.max(1,Number(step.planned_minutes||1));const overrun=elapsed==null?0:Math.max(0,elapsed-planned);
    return {state:'done',completionState:elapsed==null?'green':elapsed>planned?'red':elapsed>planned*.75?'orange':'green',progressPercent:100,elapsedMinutes:elapsed,remainingMinutes:0,overrunMinutes:overrun};
  }
  if(step.status!=='active'||!step.started_at)return {state:'pending',progressPercent:0,elapsedMinutes:0,remainingMinutes:Number(step.planned_minutes||0)};
  const planned=Math.max(1,Number(step.planned_minutes||1));const elapsed=Math.max(0,(now-new Date(step.started_at).getTime())/60000);const ratio=elapsed/planned;
  return {state:ratio<.75?'green':ratio<=1?'orange':'red',progressPercent:Math.min(100,Math.round(ratio*100)),elapsedMinutes:Math.floor(elapsed),remainingMinutes:Math.max(0,Math.ceil(planned-elapsed)),overrunMinutes:ratio>1?Math.floor(elapsed-planned):0};
}
function planAllowed(req,plan){return req.user.role!=='employee'||plan.employee_id===req.user.id}
async function getPlan(org,id){const plan=(await q(`SELECT p.*,u.name employee_name,u.email employee_email,c.name created_by_name FROM workday_plans p JOIN users u ON u.id=p.employee_id LEFT JOIN users c ON c.id=p.created_by WHERE p.id=$1 AND p.organization_id=$2`,[id,org])).rows[0];if(!plan)throw new HttpError(404,'Journée introuvable.','workday_not_found');return plan}
async function organizationToday(org){return (await q(`SELECT to_char((now() AT TIME ZONE COALESCE(timezone,'Europe/Paris'))::date,'YYYY-MM-DD') AS today FROM organizations WHERE id=$1`,[org])).rows[0]?.today}
async function fullPlan(req,id){
  const plan=await getPlan(req.user.organization_id,id);if(!planAllowed(req,plan))throw new HttpError(403,'Cette journée ne vous est pas attribuée.','forbidden');
  const [stepsResult,eventsResult]=await Promise.all([
    q(`SELECT s.*,rm.original_name reference_name,pm.original_name proof_name,bm.original_name block_media_name,cb.name completed_by_name,bb.name blocked_by_name,lr.type linked_record_type,lr.title linked_record_title,lr.occurred_at linked_record_at FROM workday_steps s LEFT JOIN media rm ON rm.id=s.reference_media_id LEFT JOIN media pm ON pm.id=s.proof_media_id LEFT JOIN media bm ON bm.id=s.block_media_id LEFT JOIN users cb ON cb.id=s.completed_by LEFT JOIN users bb ON bb.id=s.blocked_by LEFT JOIN records lr ON lr.id=s.linked_record_id WHERE s.plan_id=$1 AND s.organization_id=$2 ORDER BY s.sort_order`,[id,req.user.organization_id]),
    q(`SELECT e.id,e.step_id,e.event_type,e.payload,e.created_at,u.name actor_name FROM workday_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.plan_id=$1 AND e.organization_id=$2 ORDER BY e.created_at`,[id,req.user.organization_id])
  ]);
  const steps=stepsResult.rows,done=steps.filter(s=>s.status==='done').length;
  return {...plan,steps:steps.map(s=>({...s,timing:timing(s)})),events:eventsResult.rows,progress:{done,total:steps.length,percent:steps.length?Math.round(done/steps.length*100):0},activeStep:steps.find(s=>s.status==='active')?.id||null};
}
async function validateMedia(org,id,{uploadedBy=null,notBefore=null}={}){if(!id)return null;const row=(await q(`SELECT id,uploaded_by,created_at FROM media WHERE id=$1 AND organization_id=$2`,[id,org])).rows[0];if(!row||uploadedBy&&row.uploaded_by!==uploadedBy||notBefore&&new Date(row.created_at)<new Date(notBefore))throw new HttpError(400,'Photo introuvable, trop ancienne ou non autorisée.','invalid_media');return id}
async function validateEmployee(org,id){const employee=(await q(`SELECT u.id,u.name,m.role,m.active FROM users u JOIN organization_memberships m ON m.user_id=u.id AND m.organization_id=$2 WHERE u.id=$1 AND u.active=true AND m.active=true`,[id,org])).rows[0];if(!employee||employee.role!=='employee')throw new HttpError(400,'Sélectionnez un compte Employé actif sur cet établissement.','invalid_employee');return employee}
async function insertSteps(c,{org,planId,steps,startOrder=1}){for(let i=0;i<steps.length;i++){const s=steps[i];await c.query(`INSERT INTO workday_steps(organization_id,plan_id,sort_order,title,instructions,category,target_quantity,target_unit,planned_minutes,reference_media_id,proof_required) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[org,planId,startOrder+i,s.title,s.instructions||null,s.category,s.targetQuantity??null,s.targetUnit||null,s.plannedMinutes,s.referenceMediaId||null,s.proofRequired])}}

r.get('/today',requireUser,asyncRoute(async(req,res)=>{const row=(await q(`SELECT id FROM workday_plans WHERE organization_id=$1 AND employee_id=$2 AND work_date=(now() AT TIME ZONE COALESCE((SELECT timezone FROM organizations WHERE id=$1),'Europe/Paris'))::date AND status<>'cancelled' ORDER BY created_at DESC LIMIT 1`,[req.user.organization_id,req.user.id])).rows[0];res.json(row?await fullPlan(req,row.id):null)}));
r.get('/',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{const date=req.query.date?dateSchema.parse(String(req.query.date)):null;const employeeId=req.query.employeeId?uuid.parse(String(req.query.employeeId)):null;const params=[req.user.organization_id];let where='p.organization_id=$1';if(date){params.push(date);where+=` AND p.work_date=$${params.length}::date`}if(employeeId){params.push(employeeId);where+=` AND p.employee_id=$${params.length}`}const rows=(await q(`SELECT p.*,u.name employee_name,(SELECT count(*)::int FROM workday_steps s WHERE s.plan_id=p.id) step_count,(SELECT count(*)::int FROM workday_steps s WHERE s.plan_id=p.id AND s.status='done') done_count,(SELECT count(*)::int FROM workday_steps s WHERE s.plan_id=p.id AND s.blocked_at IS NOT NULL) blocked_count,(SELECT count(*)::int FROM workday_steps s WHERE s.plan_id=p.id AND ((s.status='active' AND s.started_at + (s.planned_minutes * interval '1 minute') < now()) OR (s.status='done' AND s.completed_at > s.started_at + (s.planned_minutes * interval '1 minute')))) late_count FROM workday_plans p JOIN users u ON u.id=p.employee_id WHERE ${where} ORDER BY p.work_date DESC,u.name`,params)).rows;res.json(rows)}));
r.get('/:id',requireUser,asyncRoute(async(req,res)=>res.json(await fullPlan(req,uuid.parse(req.params.id)))));

r.post('/',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const d=planSchema.parse(req.body),org=req.user.organization_id;await validateEmployee(org,d.employeeId);for(const s of d.steps)if(s.referenceMediaId)await validateMedia(org,s.referenceMediaId);
  const id=await tx(async c=>{const existing=(await c.query(`SELECT id,status FROM workday_plans WHERE organization_id=$1 AND employee_id=$2 AND work_date=$3`,[org,d.employeeId,d.workDate])).rows[0];if(existing)throw new HttpError(409,'Une journée existe déjà pour cet employé à cette date. Ouvrez-la pour la modifier.','workday_exists');const p=(await c.query(`INSERT INTO workday_plans(organization_id,employee_id,work_date,title,status,planned_start_time,manager_note,created_by) VALUES($1,$2,$3,$4,'ready',$5::time,$6,$7) RETURNING id`,[org,d.employeeId,d.workDate,d.title,d.plannedStartTime||null,d.managerNote||null,req.user.id])).rows[0];await insertSteps(c,{org,planId:p.id,steps:d.steps});await c.query(`INSERT INTO workday_events(organization_id,plan_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,'plan_created',$4)`,[org,p.id,req.user.id,{steps:d.steps.length}]);return p.id});
  await audit(req,'workday.create','workday',id,{employeeId:d.employeeId,workDate:d.workDate,steps:d.steps.length});res.status(201).json(await fullPlan(req,id));
}));

r.put('/:id',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{
  const id=uuid.parse(req.params.id),d=updatePlanSchema.parse(req.body),org=req.user.organization_id,plan=await getPlan(org,id);
  if(['completed','cancelled'].includes(plan.status))throw new HttpError(409,'Une journée terminée ou annulée ne peut plus être modifiée.','workday_locked');
  await validateEmployee(org,d.employeeId);for(const s of d.steps)if(s.referenceMediaId)await validateMedia(org,s.referenceMediaId);
  if(plan.status==='in_progress'&&(d.employeeId!==plan.employee_id||d.workDate!==String(plan.work_date).slice(0,10)))throw new HttpError(409,'L’employé et la date sont verrouillés une fois la journée démarrée.','workday_identity_locked');
  await tx(async c=>{
    const before={employeeId:plan.employee_id,workDate:String(plan.work_date).slice(0,10),title:plan.title,plannedStartTime:plan.planned_start_time,managerNote:plan.manager_note,status:plan.status};
    await c.query(`UPDATE workday_plans SET employee_id=$1,work_date=$2,title=$3,planned_start_time=$4::time,manager_note=$5 WHERE id=$6 AND organization_id=$7`,[d.employeeId,d.workDate,d.title,d.plannedStartTime||null,d.managerNote||null,id,org]);
    let lockedSteps=0;
    if(plan.status==='ready'){
      await c.query(`DELETE FROM workday_steps WHERE plan_id=$1 AND organization_id=$2`,[id,org]);
      if(!d.steps.length)throw new HttpError(400,'Gardez au moins une étape.','workday_steps_required');
      await insertSteps(c,{org,planId:id,steps:d.steps,startOrder:1});
    }else{
      const locked=(await c.query(`SELECT id,sort_order,status,title FROM workday_steps WHERE plan_id=$1 AND organization_id=$2 AND status<>'pending' ORDER BY sort_order`,[id,org])).rows;lockedSteps=locked.length;
      await c.query(`DELETE FROM workday_steps WHERE plan_id=$1 AND organization_id=$2 AND status='pending'`,[id,org]);
      const base=locked.reduce((m,s)=>Math.max(m,Number(s.sort_order||0)),0)+1;
      await insertSteps(c,{org,planId:id,steps:d.steps,startOrder:base});
    }
    await c.query(`INSERT INTO workday_events(organization_id,plan_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,'plan_updated',$4)`,[org,id,req.user.id,{before,editableSteps:d.steps.length,lockedSteps}]);
  });
  await audit(req,'workday.update','workday',id,{status:plan.status,steps:d.steps.length});res.json(await fullPlan(req,id));
}));

r.post('/:id/start',requireUser,asyncRoute(async(req,res)=>{const id=uuid.parse(req.params.id),plan=await getPlan(req.user.organization_id,id);const today=await organizationToday(req.user.organization_id);if(String(plan.work_date).slice(0,10)!==today)throw new HttpError(409,`Cette journée est prévue le ${String(plan.work_date).slice(0,10)}. Elle ne peut être démarrée que le jour prévu.`,'workday_wrong_date');if(!planAllowed(req,plan))throw new HttpError(403,'Cette journée ne vous est pas attribuée.');if(plan.status==='completed')throw new HttpError(409,'Cette journée est déjà terminée.');if(plan.status==='cancelled')throw new HttpError(409,'Cette journée a été annulée.');if(plan.status==='in_progress')return res.json(await fullPlan(req,id));await tx(async c=>{const first=(await c.query(`SELECT id FROM workday_steps WHERE plan_id=$1 ORDER BY sort_order LIMIT 1`,[id])).rows[0];if(!first)throw new HttpError(400,'Ajoutez au moins une étape.');await c.query(`UPDATE workday_plans SET status='in_progress',started_at=COALESCE(started_at,now()) WHERE id=$1`,[id]);await c.query(`UPDATE workday_steps SET status='active',started_at=COALESCE(started_at,now()) WHERE id=$1 AND status='pending'`,[first.id]);await c.query(`INSERT INTO workday_events(organization_id,plan_id,actor_user_id,event_type) VALUES($1,$2,$3,'day_started')`,[req.user.organization_id,id,req.user.id])});await audit(req,'workday.start','workday',id);res.json(await fullPlan(req,id))}));

r.post('/:planId/steps/:stepId/block',requireUser,asyncRoute(async(req,res)=>{
  const planId=uuid.parse(req.params.planId),stepId=uuid.parse(req.params.stepId),d=blockSchema.parse(req.body||{}),org=req.user.organization_id,plan=await getPlan(org,planId);
  if(!planAllowed(req,plan))throw new HttpError(403,'Cette journée ne vous est pas attribuée.');if(plan.status!=='in_progress')throw new HttpError(409,'La journée doit être commencée.');
  const step=(await q(`SELECT * FROM workday_steps WHERE id=$1 AND plan_id=$2 AND organization_id=$3`,[stepId,planId,org])).rows[0];if(!step||step.status!=='active')throw new HttpError(409,'Seule l’étape en cours peut être signalée comme bloquée.','step_not_active');
  if(d.mediaId)await validateMedia(org,d.mediaId,{uploadedBy:req.user.role==='employee'?req.user.id:null,notBefore:req.user.role==='employee'?step.started_at:null});
  await tx(async c=>{await c.query(`UPDATE workday_steps SET blocked_at=now(),block_reason=$1,block_note=$2,block_media_id=$3,blocked_by=$4 WHERE id=$5`,[d.reason,d.note||null,d.mediaId||null,req.user.id,stepId]);await c.query(`INSERT INTO workday_events(organization_id,plan_id,step_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,$4,'step_blocked',$5)`,[org,planId,stepId,req.user.id,{reason:d.reason,note:d.note||null,mediaId:d.mediaId||null}])});
  await audit(req,'workday.step.blocked','workday_step',stepId,{planId,reason:d.reason});await notifyManagers(org,{severity:'critical',type:'employee_blocked',title:`${req.user.name} est bloqué`,message:d.note||`Motif : ${d.reason}`,link:'workdays',dedupeKey:`workday-block:${stepId}`});res.json(await fullPlan(req,planId));
}));

r.post('/:planId/steps/:stepId/complete',requireUser,asyncRoute(async(req,res)=>{
  const planId=uuid.parse(req.params.planId),stepId=uuid.parse(req.params.stepId),d=completeSchema.parse(req.body||{}),org=req.user.organization_id;const plan=await getPlan(org,planId);
  if(!planAllowed(req,plan))throw new HttpError(403,'Cette journée ne vous est pas attribuée.');if(plan.status!=='in_progress')throw new HttpError(409,'La journée doit être commencée.');
  const step=(await q(`SELECT * FROM workday_steps WHERE id=$1 AND plan_id=$2 AND organization_id=$3`,[stepId,planId,org])).rows[0];if(!step)throw new HttpError(404,'Étape introuvable.');if(step.status==='done')return res.json(await fullPlan(req,planId));if(step.status!=='active')throw new HttpError(409,'Terminez d’abord l’étape en cours.','step_not_active');
  if(step.proof_required&&!d.proofMediaId)throw new HttpError(400,'Une photo de preuve est obligatoire pour cette étape.','proof_required');
  if(step.target_quantity!=null&&d.actualQuantity==null)throw new HttpError(400,'Indiquez la quantité réellement réalisée avant de terminer cette étape.','actual_quantity_required');
  if(d.proofMediaId)await validateMedia(org,d.proofMediaId,{uploadedBy:req.user.role==='employee'?req.user.id:null,notBefore:req.user.role==='employee'?step.started_at:null});
  const expected=({temperature:'temperature',cleaning:'cleaning',traceability:'traceability',reception:'reception'})[step.category];
  if(d.linkedRecordId){
    const linked=(await q(`SELECT id,type,created_by,created_at,status FROM records WHERE id=$1 AND organization_id=$2`,[d.linkedRecordId,org])).rows[0];
    const already=(await q(`SELECT 1 FROM workday_steps WHERE linked_record_id=$1 AND id<>$2 LIMIT 1`,[d.linkedRecordId,stepId])).rowCount;
    if(!linked||linked.status==='voided'||(expected&&linked.type!==expected)||linked.created_by!==plan.employee_id||new Date(linked.created_at)<new Date(step.started_at)||already)throw new HttpError(400,'Ce contrôle HACCP ne peut pas servir de preuve pour cette étape.','invalid_record');
  }else if(expected){
    const recent=(await q(`SELECT r.id FROM records r WHERE r.organization_id=$1 AND r.created_by=$2 AND r.type=$3 AND r.status<>'voided' AND r.created_at>=COALESCE($4::timestamptz,now()-interval '4 hours') AND NOT EXISTS(SELECT 1 FROM workday_steps s WHERE s.linked_record_id=r.id) ORDER BY r.created_at DESC LIMIT 1`,[org,plan.employee_id,expected,step.started_at||null])).rows[0];if(recent)d.linkedRecordId=recent.id;
  }
  await tx(async c=>{await c.query(`UPDATE workday_steps SET status='done',completed_at=now(),completed_by=$1,completion_note=$2,proof_media_id=$3,linked_record_id=$4,actual_quantity=$5 WHERE id=$6`,[req.user.id,d.note||null,d.proofMediaId||null,d.linkedRecordId||null,d.actualQuantity??null,stepId]);const next=(await c.query(`SELECT id FROM workday_steps WHERE plan_id=$1 AND status='pending' ORDER BY sort_order LIMIT 1`,[planId])).rows[0];if(next)await c.query(`UPDATE workday_steps SET status='active',started_at=now() WHERE id=$1`,[next.id]);else await c.query(`UPDATE workday_plans SET status='completed',completed_at=now() WHERE id=$1`,[planId]);await c.query(`INSERT INTO workday_events(organization_id,plan_id,step_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,$4,'step_completed',$5)`,[org,planId,stepId,req.user.id,{proofMediaId:d.proofMediaId||null,note:d.note||null,actualQuantity:d.actualQuantity??null,linkedRecordId:d.linkedRecordId||null}])});
  await audit(req,'workday.step.complete','workday_step',stepId,{planId,actualQuantity:d.actualQuantity??null});res.json(await fullPlan(req,planId));
}));

r.post('/:id/cancel',requireUser,roles('owner','manager'),asyncRoute(async(req,res)=>{const id=uuid.parse(req.params.id),plan=await getPlan(req.user.organization_id,id);if(plan.status==='completed')throw new HttpError(409,'Une journée terminée ne peut pas être annulée.');await q(`UPDATE workday_plans SET status='cancelled',completed_at=now() WHERE id=$1`,[id]);await q(`INSERT INTO workday_events(organization_id,plan_id,actor_user_id,event_type) VALUES($1,$2,$3,'plan_cancelled')`,[req.user.organization_id,id,req.user.id]);await audit(req,'workday.cancel','workday',id);res.json({ok:true})}));

export default r;
