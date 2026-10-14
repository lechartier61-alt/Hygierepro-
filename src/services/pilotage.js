import { q } from '../db.js';

const clamp=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));

export async function createNotification({organizationId,userId=null,severity='info',type,title,message='',link=null,dedupeKey=null}){
  try{
    const {rows}=await q(`INSERT INTO user_notifications(organization_id,user_id,severity,notification_type,title,message,link,dedupe_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT DO NOTHING RETURNING *`,[organizationId,userId,severity,type,title,message,link,dedupeKey]);
    return rows[0]||null;
  }catch(e){console.warn('[pilotage notification]',e?.message||e);return null}
}

export async function notifyManagers(organizationId,payload){
  const {rows}=await q(`SELECT DISTINCT u.id FROM users u
    JOIN organization_memberships m ON m.user_id=u.id AND m.organization_id=$1 AND m.active=true
    WHERE u.active=true AND m.role IN ('owner','manager')`,[organizationId]).catch(()=>({rows:[]}));
  if(!rows.length){
    const fallback=(await q(`SELECT id FROM users WHERE organization_id=$1 AND active=true AND role IN ('owner','manager')`,[organizationId]).catch(()=>({rows:[]}))).rows;
    rows.push(...fallback);
  }
  for(const user of rows)await createNotification({...payload,organizationId,userId:user.id,dedupeKey:payload.dedupeKey?`${payload.dedupeKey}:${user.id}`:null});
}

export async function computePilotageOverview(organizationId,{employeeId=null}={}){
  const params=employeeId?[organizationId,employeeId]:[organizationId];
  const employeeFilter=employeeId?' AND created_by=$2':'';
  const [nc,tempStats,traceStats,equipmentStats,workdayStats,actions,corrective,production,sensors]=await Promise.all([
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE status NOT IN ('closed','resolved','done','voided'))::int open
      FROM records WHERE organization_id=$1 AND type='nonconformity'${employeeFilter}`,params),
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE occurred_at>=date_trunc('day',now()))::int today,
      count(*) FILTER (WHERE occurred_at>=date_trunc('day',now()) AND lower(COALESCE(payload->>'conforme','true')) IN ('false','0','no','non'))::int bad
      FROM records WHERE organization_id=$1 AND type='temperature'${employeeFilter}`,params).catch(()=>({rows:[{total:0,today:0,bad:0}]})),
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE COALESCE(hygiepro_safe_date(payload->>'expiry'),hygiepro_safe_date(payload->>'dlc')) < current_date)::int expired,
      count(*) FILTER (WHERE COALESCE(hygiepro_safe_date(payload->>'expiry'),hygiepro_safe_date(payload->>'dlc')) BETWEEN current_date AND current_date+2)::int soon
      FROM records WHERE organization_id=$1 AND type IN ('opened_product','traceability','supplier_lot')${employeeFilter}`,params).catch(()=>({rows:[{total:0,expired:0,soon:0}]})),
    employeeId?Promise.resolve({rows:[{total:0,issues:0,maintenance_due:0,temp_equipment:0}]}):q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE status='active' AND COALESCE(payload->>'condition','operational') IN ('maintenance','out_of_service'))::int issues,
      count(*) FILTER (WHERE status='active' AND hygiepro_safe_date(payload->>'nextMaintenanceDate') IS NOT NULL AND hygiepro_safe_date(payload->>'nextMaintenanceDate')<=current_date+7)::int maintenance_due,
      count(*) FILTER (WHERE status='active' AND (payload->>'min' IS NOT NULL OR payload->>'max' IS NOT NULL))::int temp_equipment
      FROM records WHERE organization_id=$1 AND type='equipment'`,[organizationId]).catch(()=>({rows:[{total:0,issues:0,maintenance_due:0,temp_equipment:0}]})),
    q(`SELECT count(*)::int plans,
      COALESCE(sum((SELECT count(*) FROM workday_steps s WHERE s.plan_id=p.id)),0)::int steps,
      COALESCE(sum((SELECT count(*) FROM workday_steps s WHERE s.plan_id=p.id AND s.status='done')),0)::int done,
      COALESCE(sum((SELECT count(*) FROM workday_steps s WHERE s.plan_id=p.id AND s.blocked_at IS NOT NULL AND s.status<>'done')),0)::int blocked
      FROM workday_plans p WHERE p.organization_id=$1 AND p.work_date=current_date${employeeId?' AND p.employee_id=$2':''}`,params).catch(()=>({rows:[{plans:0,steps:0,done:0,blocked:0}]})),
    q(`SELECT count(*)::int open,
      count(*) FILTER (WHERE severity='critical')::int critical
      FROM corrective_actions WHERE organization_id=$1 AND status IN ('open','in_progress')${employeeId?' AND (assigned_to=$2 OR assigned_to IS NULL)':''}`,params).catch(()=>({rows:[{open:0,critical:0}]})),
    q(`SELECT count(*)::int total,
      count(*) FILTER (WHERE status IN ('open','in_progress'))::int open,
      count(*) FILTER (WHERE severity='critical' AND status IN ('open','in_progress'))::int critical
      FROM corrective_actions WHERE organization_id=$1${employeeId?' AND (assigned_to=$2 OR assigned_to IS NULL)':''}`,params).catch(()=>({rows:[{total:0,open:0,critical:0}]})),
    q(`SELECT count(*)::int today,COALESCE(sum(produced_quantity),0)::numeric produced FROM production_batches WHERE organization_id=$1 AND produced_at>=date_trunc('day',now())`,[organizationId]).catch(()=>({rows:[{today:0,produced:0}]})),
    employeeId?Promise.resolve({rows:[{total:0,alert:0,offline:0}]}):q(`SELECT count(*)::int total,count(*) FILTER (WHERE status='alert')::int alert,count(*) FILTER (WHERE status='offline' OR (last_seen_at IS NOT NULL AND last_seen_at<now()-interval '2 hours'))::int offline FROM sensors WHERE organization_id=$1 AND active=true`,[organizationId]).catch(()=>({rows:[{total:0,alert:0,offline:0}]}))
  ]);
  const n=nc.rows[0]||{},t=tempStats.rows[0]||{},tr=traceStats.rows[0]||{},eq=equipmentStats.rows[0]||{},wd=workdayStats.rows[0]||{},ca=corrective.rows[0]||{},pr=production.rows[0]||{},se=sensors.rows[0]||{};
  const components={
    temperatures:Number(t.total)>0||Number(eq.temp_equipment)>0?clamp(Number(t.today)>0?100-Number(t.bad)*25:45):null,
    traceability:Number(tr.total)>0?clamp(100-Number(tr.expired)*30-Number(tr.soon)*5):null,
    operations:Number(wd.steps)>0?clamp((Number(wd.done)/Math.max(1,Number(wd.steps)))*100-Number(wd.blocked)*15):null,
    equipment:Number(eq.total)>0?clamp(100-Number(eq.issues)*25-Number(eq.maintenance_due)*8-Number(se.alert)*20-Number(se.offline)*8):null,
    quality:Number(n.total)>0||Number(ca.total)>0?clamp(100-Number(n.open)*20-Number(ca.critical)*15):null
  };
  const usable=Object.values(components).filter(v=>v!=null);const score=usable.length?Math.round(usable.reduce((a,b)=>a+b,0)/usable.length):null;
  const priorities=[];
  const add=(severity,category,title,detail,page,sourceType,sourceId=null)=>priorities.push({severity,category,title,detail,page,sourceType,sourceId});
  if(Number(n.open))add('critical','quality',`${n.open} non-conformité${Number(n.open)>1?'s':''} ouverte${Number(n.open)>1?'s':''}`,'Sécurisez la situation et documentez l’action corrective.','nonconformity','record');
  if(Number(eq.issues))add('critical','equipment',`${eq.issues} équipement${Number(eq.issues)>1?'s':''} indisponible${Number(eq.issues)>1?'s':''}`,'Panne ou maintenance à traiter.','equipment','equipment');
  if(Number(wd.blocked))add('critical','team',`${wd.blocked} blocage${Number(wd.blocked)>1?'s':''} équipe`,'Un membre de l’équipe a signalé un problème.','workdays','workday');
  if(Number(se.alert))add('critical','sensor',`${se.alert} capteur${Number(se.alert)>1?'s':''} en alerte`,'Une mesure automatique est hors seuil.','sensors','sensor');
  if(Number(tr.expired))add('critical','traceability',`${tr.expired} produit${Number(tr.expired)>1?'s':''} dépassé${Number(tr.expired)>1?'s':''}`,'Retirez ou vérifiez immédiatement ces produits.','traceability','record');
  if(Number(tr.soon))add('warning','traceability',`${tr.soon} DLC/DDM proche${Number(tr.soon)>1?'s':''}`,'Échéance dans les 48 heures.','traceability','record');
  if(Number(eq.maintenance_due))add('warning','equipment',`${eq.maintenance_due} maintenance${Number(eq.maintenance_due)>1?'s':''} proche${Number(eq.maintenance_due)>1?'s':''}`,'Planifiez l’intervention avant l’échéance.','equipment','equipment');
  if(Number(se.offline))add('warning','sensor',`${se.offline} capteur${Number(se.offline)>1?'s':''} hors ligne`,'Vérifiez la connexion ou l’alimentation.','sensors','sensor');
  if(Number(ca.open))add(Number(ca.critical)?'critical':'warning','corrective',`${ca.open} action${Number(ca.open)>1?'s':''} corrective${Number(ca.open)>1?'s':''}`,'Actions guidées encore ouvertes.','actions','manual');
  return {score,scoreStatus:score==null?'uninitialized':score>=90?'excellent':score>=75?'good':score>=55?'warning':'critical',components,disclaimer:'Indicateur opérationnel interne — ne constitue ni une certification ni une garantie de conformité HACCP.',priorities,metrics:{nonconformitiesOpen:Number(n.open||0),temperaturesToday:Number(t.today||0),temperatureBad:Number(t.bad||0),expiring:Number(tr.soon||0),expired:Number(tr.expired||0),equipmentIssues:Number(eq.issues||0),maintenanceDue:Number(eq.maintenance_due||0),workdayBlocked:Number(wd.blocked||0),correctiveOpen:Number(ca.open||0),sensorAlerts:Number(se.alert||0),sensorOffline:Number(se.offline||0),productionBatchesToday:Number(pr.today||0),producedToday:Number(pr.produced||0)}};
}
