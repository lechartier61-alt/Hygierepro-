import { q } from '../db.js';

export async function runRetentionCleanup(){
  try{
    await q(`DELETE FROM records r USING organization_settings s
      WHERE r.organization_id=s.organization_id AND r.type='timeclock'
      AND r.occurred_at < now() - make_interval(years => GREATEST(1,LEAST(10,CASE WHEN COALESCE(s.retention->>'timeclockYears','') ~ '^[0-9]+$' THEN (s.retention->>'timeclockYears')::int ELSE 5 END)))`);

    await q(`DELETE FROM audit_logs a USING organization_settings s
      WHERE a.organization_id=s.organization_id
      AND a.created_at < now() - make_interval(months => GREATEST(1,LEAST(60,CASE WHEN COALESCE(s.retention->>'auditMonths','') ~ '^[0-9]+$' THEN (s.retention->>'auditMonths')::int ELSE 12 END)))`);

    await q(`DELETE FROM sessions WHERE expires_at<now()`);
    await q(`DELETE FROM admin_sessions WHERE expires_at<now()`);
    await q(`DELETE FROM password_resets WHERE expires_at<now() OR used_at IS NOT NULL`);
    await q(`DELETE FROM email_verifications WHERE expires_at<now() OR (used_at IS NOT NULL AND used_at<now()-interval '7 days')`);
    await q(`DELETE FROM invites WHERE (expires_at<now() AND accepted_at IS NULL) OR (accepted_at IS NOT NULL AND accepted_at<now()-interval '30 days')`);
    await q(`DELETE FROM stripe_events WHERE processed_at<now()-interval '180 days'`);
    await q(`DELETE FROM promo_reservations WHERE completed_at IS NULL AND expires_at<now()-interval '48 hours'`);
    await q(`DELETE FROM promo_reservations WHERE completed_at<now()-interval '180 days'`);
    await q(`DELETE FROM security_rate_limits WHERE reset_at<now()`);
    await q(`DELETE FROM billing_checkout_locks WHERE expires_at<now()-interval '48 hours'`);
    await q(`DELETE FROM system_incidents WHERE resolved_at IS NOT NULL AND resolved_at<now()-interval '180 days'`);
    await q(`DELETE FROM external_product_cache WHERE expires_at<now()-interval '30 days'`);
  }catch(e){console.error('[retention]',e.message)}
}
