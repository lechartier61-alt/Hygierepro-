import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { q, tx } from '../db.js';
import { config } from '../config.js';
import { asyncRoute, HttpError } from '../utils/http.js';
import { requireUser, roles } from '../middleware/auth.js';
import { stripeClient } from '../services/stripe.js';
import { audit } from '../services/audit.js';

const r=Router();
const promoSchema=z.string().trim().regex(/^[A-Za-z0-9_-]{2,30}$/).optional();
function mapStatus(s){return ['trialing','active','past_due','unpaid','canceled','paused'].includes(s)?s:(s==='incomplete'?'unpaid':'past_due');}
async function reservePromo(organizationId,code){
  if(!code)return {promo:null,reservation:null};
  return tx(async c=>{
    const promo=(await c.query(`SELECT * FROM promo_codes WHERE upper(code)=upper($1) AND active=true
      AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>=now()) FOR UPDATE`,[code])).rows[0];
    if(!promo)return {promo:null,reservation:null};
    const reserved=Number((await c.query(`SELECT count(*)::int AS n FROM promo_reservations
      WHERE promo_id=$1 AND completed_at IS NULL AND expires_at>now()`,[promo.id])).rows[0]?.n||0);
    if(promo.max_redemptions!=null && Number(promo.redemptions)+reserved>=Number(promo.max_redemptions))return {promo:null,reservation:null};
    const reservation=(await c.query(`INSERT INTO promo_reservations(promo_id,organization_id,expires_at)
      VALUES($1,$2,now()+interval '35 minutes') RETURNING *`,[promo.id,organizationId])).rows[0];
    return {promo,reservation};
  });
}

async function acquireCheckoutLock(organizationId){
  const {rows}=await q(`INSERT INTO billing_checkout_locks(organization_id,expires_at)
    VALUES($1,now()+interval '35 minutes')
    ON CONFLICT(organization_id) DO UPDATE SET checkout_session_id=NULL,expires_at=EXCLUDED.expires_at,created_at=now()
    WHERE billing_checkout_locks.expires_at<=now()
    RETURNING organization_id`,[organizationId]);
  return !!rows[0];
}

r.get('/status',requireUser,asyncRoute(async(req,res)=>{
  const billingId=req.user.billing_organization_id||req.user.organization_id;
  const org=(await q(`SELECT trial_started_at,trial_ends_at,subscription_status,monthly_amount_cents,current_period_end,promo_code,stripe_customer_id FROM organizations WHERE id=$1`,[billingId])).rows[0];
  const siteCount=Number((await q(`SELECT count(*)::int n FROM organizations WHERE network_id=$1 AND status='active'`,[req.user.network_id||req.user.organization_id])).rows[0]?.n||1);
  res.json({...org,billingOrganizationId:billingId,siteCount,unitAmountCents:org.monthly_amount_cents,stripeConfigured:!!config.stripe.secretKey,trialDaysLeft:Math.max(0,Math.ceil((new Date(org.trial_ends_at)-Date.now())/86400000))});
}));

r.post('/checkout',requireUser,roles('owner'),asyncRoute(async(req,res)=>{
  const stripe=stripeClient();if(!stripe)throw new HttpError(503,'Stripe n’est pas encore configuré sur le serveur.','stripe_not_configured');
  const requestedCode=promoSchema.parse(req.body?.promoCode||undefined);
  const billingId=req.user.billing_organization_id||req.user.organization_id;
  if(req.user.organization_id!==req.user.network_primary_organization_id)throw new HttpError(403,'La facturation du réseau se gère depuis l’établissement principal.','billing_primary_site_required');
  const org=(await q('SELECT * FROM organizations WHERE id=$1',[billingId])).rows[0];
  const siteCount=Math.max(1,Number((await q(`SELECT count(*)::int n FROM organizations WHERE network_id=$1 AND status='active'`,[req.user.network_id||req.user.organization_id])).rows[0]?.n||1));
  if(org.stripe_subscription_id&&['trialing','active','past_due','unpaid','paused'].includes(String(org.subscription_status)))
    throw new HttpError(409,'Un abonnement est déjà associé à cette entreprise. Utilisez le portail de facturation.','subscription_exists');
  let customer=org.stripe_customer_id;
  if(!customer){
    const c=await stripe.customers.create(
      {email:req.user.email,name:org.name,metadata:{organization_id:org.id}},
      {idempotencyKey:`hygiepro-customer-${org.id}`}
    );
    customer=c.id;
    await q('UPDATE organizations SET stripe_customer_id=$1 WHERE id=$2 AND stripe_customer_id IS NULL',[customer,org.id]);
    customer=(await q('SELECT stripe_customer_id FROM organizations WHERE id=$1',[org.id])).rows[0]?.stripe_customer_id||customer;
  }
  if(!await acquireCheckoutLock(org.id))throw new HttpError(409,'Une page de paiement est déjà ouverte pour cette entreprise. Réessayez dans quelques minutes.','checkout_pending');
  let promo=null,reservation=null;
  try{
    ({promo,reservation}=await reservePromo(org.id,requestedCode));
  }catch(err){
    await q('DELETE FROM billing_checkout_locks WHERE organization_id=$1',[org.id]).catch(()=>{});
    throw err;
  }
  if(requestedCode&&!promo){
    await q('DELETE FROM billing_checkout_locks WHERE organization_id=$1',[org.id]);
    throw new HttpError(400,'Ce code promotionnel est invalide, expiré ou a atteint sa limite.','promo_invalid');
  }
  const amount=promo?Math.max(1,Math.round(config.stripe.amountCents*(100-promo.percent_off)/100)):config.stripe.amountCents;
  const metadata={organization_id:org.id,network_id:req.user.network_id||org.id,site_count:String(siteCount),promo_code:promo?.code||'',promo_reservation_id:reservation?.id||'',amount_cents:String(amount)};
  const subscriptionData={metadata};
  const trialEnd=Math.floor(new Date(org.trial_ends_at).getTime()/1000);
  if(trialEnd>Math.floor(Date.now()/1000)+3600)subscriptionData.trial_end=trialEnd;
  const minuteBucket=Math.floor(Date.now()/60000);
  let session;
  try{
    session=await stripe.checkout.sessions.create({
      mode:'subscription',
      customer,
      client_reference_id:org.id,
      line_items:[{quantity:siteCount,price_data:{currency:config.stripe.currency,unit_amount:amount,tax_behavior:config.stripe.taxBehavior,recurring:{interval:'month'},product_data:{name:'HygieSafe — par établissement'}}}],
      automatic_tax:{enabled:config.stripe.automaticTax},
      billing_address_collection:'required',
      tax_id_collection:{enabled:config.stripe.collectTaxId},
      customer_update:{address:'auto',name:'auto'},
      subscription_data:subscriptionData,
      success_url:`${config.appUrl}/app.html#billing-success`,
      cancel_url:`${config.appUrl}/app.html#billing`,
      expires_at:Math.floor(Date.now()/1000)+30*60,
      metadata,
      allow_promotion_codes:false
    },{idempotencyKey:`hygiepro-checkout-${org.id}-${promo?.code||'standard'}-${minuteBucket}`});
    if(reservation)await q('UPDATE promo_reservations SET checkout_session_id=$1 WHERE id=$2',[session.id,reservation.id]);
    await q('UPDATE billing_checkout_locks SET checkout_session_id=$1 WHERE organization_id=$2',[session.id,org.id]);
  }catch(err){
    if(reservation)await q('DELETE FROM promo_reservations WHERE id=$1 AND completed_at IS NULL',[reservation.id]).catch(()=>{});
    await q('DELETE FROM billing_checkout_locks WHERE organization_id=$1',[org.id]).catch(()=>{});
    throw err;
  }

  // Le code promo est seulement réservé ici ; le compteur de consommation n'est confirmé qu'après le webhook Stripe signé.
  await audit(req,'billing.checkout_created','organization',org.id,{amount,promo:promo?.code||null,sessionId:session.id});
  res.json({url:session.url});
}));

r.post('/portal',requireUser,roles('owner'),asyncRoute(async(req,res)=>{
  const stripe=stripeClient();if(!stripe)throw new HttpError(503,'Stripe non configuré.');
  const billingId=req.user.billing_organization_id||req.user.organization_id;
  if(req.user.organization_id!==req.user.network_primary_organization_id)throw new HttpError(403,'La facturation du réseau se gère depuis l’établissement principal.','billing_primary_site_required');
  const org=(await q('SELECT stripe_customer_id FROM organizations WHERE id=$1',[billingId])).rows[0];
  if(!org?.stripe_customer_id)throw new HttpError(400,'Aucun abonnement Stripe n’est encore associé.');
  const s=await stripe.billingPortal.sessions.create({customer:org.stripe_customer_id,return_url:`${config.appUrl}/app.html#billing`});
  res.json({url:s.url});
}));
export default r;

export async function stripeWebhook(req,res){
  const stripe=stripeClient();
  if(!stripe||!config.stripe.webhookSecret)return res.status(503).send('Stripe non configuré');
  let event;
  try{event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],config.stripe.webhookSecret)}
  catch(e){console.error('[stripe-webhook]',e.message);return res.status(400).send('Signature invalide')}

  try{
    const obj=event.data.object;
    let checkoutSubscription=null;
    if(event.type==='checkout.session.completed'&&obj.mode==='subscription'&&obj.subscription){
      checkoutSubscription=await stripe.subscriptions.retrieve(String(obj.subscription));
    }

    const outcome=await tx(async c=>{
      const inserted=await c.query(`INSERT INTO stripe_events(event_id,event_type,object_id) VALUES($1,$2,$3) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,
        [event.id,event.type,String(obj?.id||'')]);
      if(!inserted.rowCount)return {duplicate:true};

      if(event.type==='checkout.session.completed'&&obj.mode==='subscription'){
        const orgId=obj.metadata?.organization_id||obj.client_reference_id;
        if(orgId&&checkoutSubscription){
          const amount=Number(obj.metadata?.amount_cents);
          const code=String(obj.metadata?.promo_code||'').trim()||null;
          await c.query(`UPDATE organizations SET stripe_customer_id=$1,stripe_subscription_id=$2,subscription_status=$3,
            current_period_end=CASE WHEN $4::bigint IS NULL THEN current_period_end ELSE to_timestamp($4) END,
            promo_code=$5,monthly_amount_cents=CASE WHEN $6::int IS NULL THEN monthly_amount_cents ELSE $6::int END
            WHERE id=$7`,
            [String(obj.customer),String(obj.subscription),mapStatus(checkoutSubscription.status),checkoutSubscription.current_period_end||null,code,Number.isInteger(amount)?amount:null,orgId]);
          const reservationId=String(obj.metadata?.promo_reservation_id||'').trim()||null;
          if(code&&reservationId){
            const reservation=(await c.query(`SELECT * FROM promo_reservations WHERE id=$1 AND organization_id=$2 FOR UPDATE`,[reservationId,orgId])).rows[0];
            if(reservation&&!reservation.completed_at){
              const consumed=await c.query(`UPDATE promo_codes SET redemptions=redemptions+1 WHERE id=$1
                AND (max_redemptions IS NULL OR redemptions<max_redemptions) RETURNING id`,[reservation.promo_id]);
              if(consumed.rowCount)await c.query('UPDATE promo_reservations SET completed_at=now() WHERE id=$1',[reservation.id]);
            }
          }
          await c.query('DELETE FROM billing_checkout_locks WHERE organization_id=$1',[orgId]);
        }
      }

      if(event.type==='checkout.session.expired'){
        const orgId=obj.metadata?.organization_id||obj.client_reference_id;
        if(orgId)await c.query('DELETE FROM billing_checkout_locks WHERE organization_id=$1',[orgId]);
      }

      if(event.type.startsWith('customer.subscription.')){
        const orgId=obj.metadata?.organization_id;
        if(orgId)await c.query(`UPDATE organizations SET stripe_subscription_id=$1,subscription_status=$2,
          current_period_end=CASE WHEN $3::bigint IS NULL OR $3::bigint=0 THEN current_period_end ELSE to_timestamp($3) END WHERE id=$4`,
          [obj.id,mapStatus(obj.status),obj.current_period_end||null,orgId]);
      }

      if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'){
        const org=(await c.query(`SELECT id FROM organizations WHERE stripe_customer_id=$1`,[String(obj.customer)])).rows[0];
        if(org){
          const status=event.type==='invoice.paid'?'paid':'failed';
          const minimalRaw={billing_reason:obj.billing_reason||null,attempt_count:obj.attempt_count||0,subscription:String(obj.subscription||''),status:obj.status||null};
          await c.query(`INSERT INTO payments(organization_id,stripe_invoice_id,amount_cents,currency,status,paid_at,raw)
            VALUES($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT(stripe_invoice_id) DO UPDATE SET status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,raw=EXCLUDED.raw`,
            [org.id,obj.id,obj.amount_paid||obj.amount_due||0,obj.currency||'eur',status,status==='paid'?new Date():null,minimalRaw]);
          if(status==='failed')await c.query(`UPDATE organizations SET subscription_status='past_due' WHERE id=$1`,[org.id]);
        }
      }
      return {duplicate:false};
    });
    return res.json({received:true,duplicate:outcome.duplicate});
  }catch(e){
    console.error('[stripe-webhook-handler]',e);
    return res.status(500).send('Erreur webhook');
  }
}
