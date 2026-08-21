-- HygiePro v6.3.0 — durcissement sécurité, e-mail et facturation
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  object_id text,
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed_at DESC);







CREATE TABLE IF NOT EXISTS billing_checkout_locks (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  checkout_session_id text UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_checkout_locks_exp ON billing_checkout_locks(expires_at);

CREATE TABLE IF NOT EXISTS promo_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checkout_session_id text UNIQUE,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promo_reservations_capacity ON promo_reservations(promo_id,expires_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_promo_reservations_org ON promo_reservations(organization_id,created_at DESC);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  rate_key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_reset ON security_rate_limits(reset_at);

CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_exp ON email_verifications(expires_at);

CREATE OR REPLACE FUNCTION hygiepro_safe_date(value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::date;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;





ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_code_hash text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_used_at timestamptz;

-- Cohérence d'identité : l'application compare déjà les e-mails sans tenir compte de la casse.
-- Ces index rendent cette règle atomique au niveau PostgreSQL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower_unique ON admin_users(lower(email));

ALTER TABLE organizations ALTER COLUMN app_version SET DEFAULT '6.3.0';
UPDATE organizations SET app_version='6.3.0' WHERE app_version IN ('6.0.0','6.1.0','6.2.1','6.2.2','6.2.3');
