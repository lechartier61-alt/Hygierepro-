import { q } from '../db.js';
import { ipOf } from '../utils/http.js';
export async function audit(req, action, entityType=null, entityId=null, metadata={}){
  try{
    await q(`INSERT INTO audit_logs(organization_id,actor_user_id,actor_admin_id,action,entity_type,entity_id,metadata,ip)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [req.user?.organization_id||null, req.user?.id||null, req.admin?.id||null, action, entityType, entityId?String(entityId):null, metadata, ipOf(req)||null]);
  }catch(e){ console.error('[audit]',e.message); }
}
