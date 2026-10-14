import { q } from '../db.js';

export async function ensureOrganizationNetwork(client,organizationId,{name=null,createdBy=null}={}){
  const db=client||{query:q};
  const org=(await db.query('SELECT id,name,network_id FROM organizations WHERE id=$1',[organizationId])).rows[0];
  if(!org)return null;
  if(org.network_id)return org.network_id;
  await db.query(`INSERT INTO organization_networks(id,name,primary_organization_id,billing_organization_id,created_by)
    VALUES($1,$2,$1,$1,$3) ON CONFLICT(id) DO NOTHING`,[org.id,name||org.name,createdBy]);
  await db.query('UPDATE organizations SET network_id=$1 WHERE id=$1',[org.id]);
  return org.id;
}

export async function ensureMembership(client,{organizationId,userId,role,createdBy=null,active=true}){
  const db=client||{query:q};
  return (await db.query(`INSERT INTO organization_memberships(organization_id,user_id,role,active,created_by)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(organization_id,user_id) DO UPDATE SET role=EXCLUDED.role,active=EXCLUDED.active,updated_at=now()
    RETURNING *`,[organizationId,userId,role,active,createdBy])).rows[0];
}

export async function networkSiteCount(networkId){
  const {rows}=await q(`SELECT count(*)::int n FROM organizations WHERE network_id=$1 AND status='active'`,[networkId]);
  return Number(rows[0]?.n||0);
}

export async function syncNetworkSubscriptionQuantity(networkId){
  try{
    const {stripeClient}=await import('./stripe.js');
    const stripe=stripeClient();if(!stripe)return {synced:false,reason:'stripe_not_configured'};
    const network=(await q(`SELECT n.billing_organization_id,o.stripe_subscription_id FROM organization_networks n JOIN organizations o ON o.id=n.billing_organization_id WHERE n.id=$1`,[networkId])).rows[0];
    if(!network?.stripe_subscription_id)return {synced:false,reason:'no_subscription'};
    const sub=await stripe.subscriptions.retrieve(network.stripe_subscription_id);
    const item=sub.items?.data?.[0];if(!item)return {synced:false,reason:'no_subscription_item'};
    const quantity=await networkSiteCount(networkId);
    if(Number(item.quantity||1)!==quantity)await stripe.subscriptionItems.update(item.id,{quantity,proration_behavior:'create_prorations'});
    return {synced:true,quantity};
  }catch(e){console.warn('[network billing sync]',e?.message||e);return {synced:false,reason:'sync_failed'}}
}
